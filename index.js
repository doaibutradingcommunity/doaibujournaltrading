/**
 * ==============================================================================
 * functions/index.js
 * Doa Ibu Trading Journal — Firebase Cloud Functions (v2) Endpoint untuk MT4 / MT5
 * ==============================================================================
 * Cocok untuk pengguna yang memilih Firebase Cloud Functions (membutuhkan paket Blaze).
 * Jika menggunakan hosting Netlify gratis, gunakan `netlify/functions/sync-trade.js`.
 * ==============================================================================
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

function deriveDayFields(entries) {
  let pl = 0, trades = 0, wins = 0, be = 0, fees = 0;
  const pairs = [], tags = [];

  entries.forEach(e => {
    pl += Number(e.pl || 0);
    trades += Number(e.trades || 1);
    wins += Number(e.wins || 0);
    be += Number(e.be || 0);
    if (e.fees) fees += Number(e.fees);
    if (e.pair) pairs.push(e.pair);
    if (Array.isArray(e.tags)) tags.push(...e.tags);
  });

  return {
    pl: Math.round(pl * 100) / 100,
    trades,
    wins,
    be,
    fees: Math.round(fees * 100) / 100,
    pair: Array.from(new Set(pairs)).join(', '),
    tags: Array.from(new Set(tags)),
    needsReflection: entries.some(e => e.needsReflection === true)
  };
}

exports.syncTrade = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({ status: 'online', service: 'Firebase Cloud Functions MT Sync' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { token, terminal, accountNumber, broker, trades } = req.body || {};

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      res.status(401).json({ error: 'Token Sync diperlukan.' });
      return;
    }

    if (!Array.isArray(trades) || trades.length === 0) {
      res.status(200).json({ message: 'Tidak ada data trade.', synced: 0 });
      return;
    }

    const accountsQuery = await db.collectionGroup('accounts')
      .where('syncToken', '==', token.trim())
      .limit(1)
      .get();

    if (accountsQuery.empty) {
      res.status(403).json({ error: 'Token Sync tidak valid.' });
      return;
    }

    const accountDoc = accountsQuery.docs[0];
    const accountId = accountDoc.id;
    const pathSegments = accountDoc.ref.path.split('/');
    const uidIndex = pathSegments.indexOf('users');
    const uid = (uidIndex >= 0 && pathSegments[uidIndex + 1]) ? pathSegments[uidIndex + 1] : null;

    if (!uid) {
      res.status(500).json({ error: 'Gagal mendeteksi pemilik akun.' });
      return;
    }

    const termSource = (terminal || 'mt4').toLowerCase();
    const tradesByDate = {};

    trades.forEach(t => {
      const ts = t.closeTime ? (t.closeTime * 1000) : (t.openTime ? t.openTime * 1000 : Date.now());
      const d = new Date(ts);
      const pad = n => (n < 10 ? '0' : '') + n;
      const dateKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      if (!tradesByDate[dateKey]) tradesByDate[dateKey] = [];
      tradesByDate[dateKey].push({ trade: t, timeMs: ts });
    });

    let totalSynced = 0;
    let totalDuplicates = 0;
    const nowIso = new Date().toISOString();

    for (const [dateStr, tradeItems] of Object.entries(tradesByDate)) {
      const journalRef = db.collection('users').doc(uid).collection('journals').doc(dateStr);

      await db.runTransaction(async tx => {
        const docSnap = await tx.get(journalRef);
        const dayData = docSnap.exists ? docSnap.data() : null;
        const exEntries = (dayData && Array.isArray(dayData.entries)) ? dayData.entries : [];

        const existingExtIds = new Set();
        exEntries.forEach(e => {
          if (e.externalId) existingExtIds.add(String(e.externalId).trim());
        });

        const newEntriesToAdd = [];

        tradeItems.forEach(({ trade, timeMs }) => {
          const ticketStr = String(trade.ticket || trade.positionId || Date.now());
          const extId = `${termSource}_${ticketStr}`;

          if (existingExtIds.has(extId)) {
            totalDuplicates++;
            return;
          }

          existingExtIds.add(extId);

          const profit = Number(trade.profit || 0);
          const comm = Number(trade.commission || 0);
          const swap = Number(trade.swap || 0);
          const netPl = Math.round((profit + comm + swap) * 100) / 100;
          const fees = Math.round(Math.abs(comm + swap) * 100) / 100;
          const side = String(trade.type || 'BUY').toUpperCase().includes('SELL') ? 'Short' : 'Long';

          newEntriesToAdd.push({
            eid: 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            date: dateStr,
            pair: String(trade.symbol || 'UNKNOWN').toUpperCase(),
            bias: side,
            lot: Number(trade.lots || 1),
            pl: netPl,
            fees: fees,
            trades: 1,
            wins: netPl > 0 ? 1 : 0,
            be: netPl === 0 ? 1 : 0,
            accountId,
            source: termSource,
            externalId: extId,
            syncedAt: nowIso,
            needsReflection: true,
            createdMs: timeMs,
            updatedMs: Date.now(),
            tags: [terminal ? terminal.toUpperCase() : 'MT'],
            notes: trade.comment ? `Tiket: #${ticketStr} | ${trade.comment}` : `Tiket: #${ticketStr}`,
            charts: [],
            emotions: [],
            rating: null,
            riskPct: null,
            rMultiple: null
          });

          totalSynced++;
        });

        if (newEntriesToAdd.length === 0) return;

        const combinedEntries = exEntries.concat(newEntriesToAdd);
        const derived = deriveDayFields(combinedEntries);

        const patch = {
          ...derived,
          date: dateStr,
          entries: combinedEntries,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (!docSnap.exists) {
          patch.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }

        tx.set(journalRef, patch, { merge: true });
      });
    }

    await accountDoc.ref.update({
      lastSyncedAt: nowIso,
      status: 'connected'
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: `Sinkronisasi berhasil. ${totalSynced} trade disimpan, ${totalDuplicates} duplikat diabaikan.`,
      synced: totalSynced,
      duplicates: totalDuplicates
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});
