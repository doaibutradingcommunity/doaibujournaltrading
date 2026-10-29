/**
 * ==============================================================================
 * netlify/functions/sync-trade.js
 * Doa Ibu Trading Journal — Serverless Webhook Endpoint untuk MT4 / MT5
 * ==============================================================================
 * Menerima payload transaksi dari EA MQL4/MQL5, memvalidasi Token Sync,
 * mendeteksi duplikasi tiket, dan menyimpan data ke Firestore secara aman.
 * ==============================================================================
 */

const admin = require('firebase-admin');

// Inisialisasi Firebase Admin SDK jika belum diinisialisasi
function getFirebaseApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  let serviceAccount = null;

  // Coba ambil credentials dari environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.warn('Gagal parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
    }
  }

  if (serviceAccount) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  // Fallback: Default application credentials atau inisialisasi minimal
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  return admin.initializeApp(projectId ? { projectId } : {});
}

// Helper kalkulasi derive level-hari (mengikuti aturan JEntries di aplikasi)
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

  const uniquePairs = Array.from(new Set(pairs));
  const uniqueTags = Array.from(new Set(tags));

  return {
    pl: Math.round(pl * 100) / 100,
    trades: trades,
    wins: wins,
    be: be,
    fees: Math.round(fees * 100) / 100,
    pair: uniquePairs.join(', '),
    tags: uniqueTags,
    needsReflection: entries.some(e => e.needsReflection === true)
  };
}

exports.handler = async function (event, context) {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Content-Type': 'application/json'
  };

  // Tangani preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Health-check GET
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'online',
        service: 'Doa Ibu Journal MT4/MT5 Sync Endpoint',
        version: '17.03'
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Gunakan POST.' })
    };
  }

  try {
    const app = getFirebaseApp();
    const db = admin.firestore(app);

    // Parse Body
    let payload = {};
    try {
      payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseErr) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Format JSON tidak valid.', details: parseErr.message })
      };
    }

    const { token, terminal, accountNumber, broker, trades } = payload;

    // Validasi token sync
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token Sync diperlukan. Masukkan Token Sync dari Halaman Akun Doa Ibu.' })
      };
    }

    if (!Array.isArray(trades) || trades.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Tidak ada transaksi untuk disinkronkan.', synced: 0 })
      };
    }

    // Cari akun yang memiliki syncToken ini menggunakan collectionGroup
    const accountsQuery = await db.collectionGroup('accounts')
      .where('syncToken', '==', token.trim())
      .limit(1)
      .get();

    if (accountsQuery.empty) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Token Sync tidak valid atau akun telah dihapus.' })
      };
    }

    const accountDoc = accountsQuery.docs[0];
    const accountData = accountDoc.data();
    const accountId = accountDoc.id;

    // Ekstrak UID pemilik akun dari path dokumen: users/{uid}/accounts/{accountId}
    const pathSegments = accountDoc.ref.path.split('/');
    const uidIndex = pathSegments.indexOf('users');
    const uid = (uidIndex >= 0 && pathSegments[uidIndex + 1]) ? pathSegments[uidIndex + 1] : null;

    if (!uid) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Gagal mengidentifikasi pengguna dari akun.' })
      };
    }

    // Kelompokkan trade berdasarkan tanggal (YYYY-MM-DD)
    const termSource = (terminal || 'mt4').toLowerCase();
    const tradesByDate = {};

    trades.forEach(t => {
      // Waktu penutupan (closeTime) atau waktu pembukaan (openTime)
      const ts = t.closeTime ? (t.closeTime * 1000) : (t.openTime ? t.openTime * 1000 : Date.now());
      const d = new Date(ts);
      const pad = n => (n < 10 ? '0' : '') + n;
      const dateKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      if (!tradesByDate[dateKey]) {
        tradesByDate[dateKey] = [];
      }
      tradesByDate[dateKey].push({ trade: t, timeMs: ts });
    });

    let totalSynced = 0;
    let totalDuplicates = 0;
    const nowIso = new Date().toISOString();

    // Tulis ke Firestore per tanggal dokumen
    for (const [dateStr, tradeItems] of Object.entries(tradesByDate)) {
      const journalRef = db.collection('users').doc(uid).collection('journals').doc(dateStr);

      await db.runTransaction(async tx => {
        const docSnap = await tx.get(journalRef);
        const dayData = docSnap.exists ? docSnap.data() : null;
        const exEntries = (dayData && Array.isArray(dayData.entries)) ? dayData.entries : [];

        // Himpun semua externalId yang sudah ada untuk pencegahan duplikat tiket
        const existingExtIds = new Set();
        exEntries.forEach(e => {
          if (e.externalId) existingExtIds.add(String(e.externalId).trim());
        });

        const newEntriesToAdd = [];

        tradeItems.forEach(({ trade, timeMs }) => {
          const ticketStr = String(trade.ticket || trade.positionId || Date.now());
          const extId = `${termSource}_${ticketStr}`;

          // Cek duplikasi
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

          const entry = {
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
            accountId: accountId,
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
          };

          newEntriesToAdd.push(entry);
          totalSynced++;
        });

        if (newEntriesToAdd.length === 0) {
          return;
        }

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

    // Update timestamp lastSyncedAt pada dokumen akun
    await accountDoc.ref.update({
      lastSyncedAt: nowIso,
      status: 'connected',
      meta: {
        lastTerminal: terminal || 'MT',
        lastAccountNum: accountNumber || null,
        lastBroker: broker || null
      }
    }).catch(() => {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Sinkronisasi berhasil. ${totalSynced} trade baru disimpan, ${totalDuplicates} duplikat diabaikan.`,
        synced: totalSynced,
        duplicates: totalDuplicates,
        accountId: accountId,
        syncedAt: nowIso
      })
    };

  } catch (error) {
    console.error('[sync-trade ERROR]:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Terjadi kesalahan internal pada endpoint sinkronisasi.',
        details: error.message
      })
    };
  }
};
