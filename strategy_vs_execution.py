#!/usr/bin/env python3
"""Strategy vs Execution — versi offline dari panel di Strategy Playbook.

Pakai:  python3 scripts/strategy_vs_execution.py journal-export-YYYYMMDD.json [--days 90] [--json]
Input : file JSON dari tombol "Ekspor JSON" di Strategy Playbook.
Definisi identik dengan strategy-execution.js (lihat komentar di file itu).
"""
import argparse, json, sys, datetime

MIN_DAYS, MIN_TRADES, DEF_TARGET = 5, 10, 80


def isnum(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and v == v and abs(v) != float('inf')


def entries(j):
    log = j.get('strategyLog')
    if isinstance(log, list) and log:
        return [e for e in log if e and e.get('id')]
    if j.get('strategyId'):
        return [{'id': j['strategyId'], 'name': j.get('strategyName') or '', 'checked': 0, 'total': 0, 'reqMissed': 0, 'items': []}]
    return []


def grp():
    return {'days': 0, 'trades': 0, 'sumR': 0.0, 'wins': 0}


def finish(g):
    g['avgR'] = g['sumR'] / g['days'] if g['days'] else None
    g['expR'] = g['sumR'] / g['trades'] if g['trades'] else None
    g['wr'] = g['wins'] / g['days'] if g['days'] else None
    g['okDays'] = g['days'] >= MIN_DAYS
    g['okTrades'] = g['trades'] >= MIN_TRADES
    return g


def compute(journals, strategies, since=None):
    tgt = {s['id']: s['targetComp'] if isnum(s.get('targetComp')) else DEF_TARGET for s in strategies}
    nm = {s['id']: s.get('name', '') for s in strategies}
    out = {'total': 0, 'eligible': 0, 'trades': 0, 'excl': {'noStrategy': 0, 'mixed': 0, 'noChecklist': 0, 'noR': 0},
           'adh': grp(), 'br': grp(), 'quad': {k: {'d': 0, 'r': 0.0} for k in ('adhWin', 'adhLoss', 'brWin', 'brLoss')}}
    rules, per = {}, {}
    for j in journals:
        d = str(j.get('date') or j.get('id') or '')
        if since and d < since:
            continue
        out['total'] += 1
        ent = entries(j)
        if not ent:
            out['excl']['noStrategy'] += 1; continue
        if len({e['id'] for e in ent}) > 1:
            out['excl']['mixed'] += 1; continue
        wd = [e for e in ent if (e.get('total') or 0) > 0]
        if not wd:
            out['excl']['noChecklist'] += 1; continue
        if not isnum(j.get('rMultiple')):
            out['excl']['noR'] += 1; continue
        sid = ent[0]['id']
        n = j['trades'] if isnum(j.get('trades')) and j['trades'] > 0 else 1
        r = j['rMultiple']
        comp = sum(e['checked'] / e['total'] for e in wd) / len(wd)

        def ok(e):
            items = e.get('items') or []
            req = [it for it in items if it and it.get('required')]
            if req:
                return all(it.get('checked') for it in req)
            if not items:
                return not ((e.get('reqMissed') or 0) > 0)
            return e['checked'] / e['total'] * 100 >= tgt.get(sid, DEF_TARGET)
        patuh = all(ok(e) for e in wd)
        win = r > 0
        g = out['adh'] if patuh else out['br']
        g['days'] += 1; g['trades'] += n; g['sumR'] += r; g['wins'] += 1 if win else 0
        q = out['quad'][('adh' if patuh else 'br') + ('Win' if win else 'Loss')]
        q['d'] += 1; q['r'] += r
        out['eligible'] += 1; out['trades'] += n
        p = per.setdefault(sid, {'name': nm.get(sid) or ent[0].get('name', ''), 'adh': grp(), 'br': grp(), 'compSum': 0.0})
        pg = p['adh'] if patuh else p['br']
        pg['days'] += 1; pg['trades'] += n; pg['sumR'] += r; pg['wins'] += 1 if win else 0
        p['compSum'] += comp
        for e in wd:
            for it in e.get('items') or []:
                if not it or not it.get('id') or not it.get('required'):
                    continue
                x = rules.setdefault(sid + '|' + it['id'], {'text': it.get('text', ''), 'seen': 0, 'missed': 0})
                x['seen'] += 1
                if not it.get('checked'):
                    x['missed'] += 1
    finish(out['adh']); finish(out['br'])
    out['adhRate'] = out['adh']['days'] / out['eligible'] if out['eligible'] else None
    out['sumR'] = out['adh']['sumR'] + out['br']['sumR']
    out['expR'] = out['sumR'] / out['trades'] if out['trades'] else None
    a, b = out['adh'], out['br']
    out['gapDay'] = a['avgR'] - b['avgR'] if a['okDays'] and b['okDays'] else None
    out['gapTrade'] = a['expR'] - b['expR'] if a['okTrades'] and b['okTrades'] else None
    loss = out['quad']['adhLoss']['r'] + out['quad']['brLoss']['r']
    out['avoidableShare'] = out['quad']['brLoss']['r'] / loss if out['quad']['brLoss']['r'] < 0 and loss < 0 else None
    out['rules'] = sorted([x for x in rules.values() if x['missed'] > 0 and x['seen'] >= 3],
                          key=lambda x: (-(x['missed'] / x['seen']), -x['missed']))[:5]
    out['per'] = []
    for p in per.values():
        finish(p['adh']); finish(p['br'])
        days = p['adh']['days'] + p['br']['days']
        out['per'].append({'name': p['name'], 'days': days, 'adhRate': p['adh']['days'] / days,
                           'sumR': p['adh']['sumR'] + p['br']['sumR']})
    out['per'].sort(key=lambda x: -x['days'])
    out['enough'] = out['eligible'] >= MIN_DAYS
    return out


def sg(v):
    v = round(v + 0.0, 2)
    return ('+' if v > 0 else '') + ('%g' % v)


def pc(v):
    return '–' if v is None else '%d%%' % round(v * 100)


def report(c):
    L = ['# Strategy vs Execution', '']
    L.append('Sampel layak: **%d dari %d journal** (%d trade).' % (c['eligible'], c['total'], c['trades']))
    ex = c['excl']
    if sum(ex.values()):
        L.append('Tidak dihitung: %d tanpa strategy, %d campuran strategy, %d tanpa checklist, %d tanpa R.' % (ex['noStrategy'], ex['mixed'], ex['noChecklist'], ex['noR']))
    if not c['enough']:
        L += ['', 'Data belum cukup: butuh minimal %d journal dengan strategy, checklist, dan R terisi.' % MIN_DAYS]
        return '\n'.join(L)
    L += ['', '## Ringkasan', '- Hari patuh (semua rule wajib tercentang): %s' % pc(c['adhRate']),
          '- Total R: %sR · expectancy per trade: %s' % (sg(c['sumR']), (sg(c['expR']) + 'R') if c['trades'] >= MIN_TRADES else 'data belum cukup'),
          '', '## Patuh vs melanggar', '| Kelompok | Hari | Trade | Rata-rata R/hari | Hari menang |', '|---|---|---|---|---|']
    for lab, g in (('Patuh', c['adh']), ('Melanggar', c['br'])):
        L.append('| %s | %d | %d | %s | %s |' % (lab, g['days'], g['trades'], (sg(g['avgR']) + 'R') if g['okDays'] else 'data belum cukup', pc(g['wr']) if g['okDays'] else '–'))
    Q = c['quad']
    L += ['', '## Keputusan x hasil', '| | Menang (R>0) | Tidak menang (R≤0) |', '|---|---|---|',
          '| **Patuh** | %d hari · %sR | %d hari · %sR |' % (Q['adhWin']['d'], sg(Q['adhWin']['r']), Q['adhLoss']['d'], sg(Q['adhLoss']['r'])),
          '| **Melanggar** | %d hari · %sR | %d hari · %sR |' % (Q['brWin']['d'], sg(Q['brWin']['r']), Q['brLoss']['d'], sg(Q['brLoss']['r'])), '',
          '## Cara membaca']
    if Q['adhWin']['d']: L.append('- %d hari menang saat patuh (%sR): hasil dari proses yang benar.' % (Q['adhWin']['d'], sg(Q['adhWin']['r'])))
    if Q['adhLoss']['d']: L.append('- %d hari rugi saat patuh (%sR): bagian dari varians strategi. Jangan ubah aturan hanya karena ini.' % (Q['adhLoss']['d'], sg(Q['adhLoss']['r'])))
    if Q['brWin']['d']: L.append('- %d hari menang saat melanggar rule (+%gR): hasil bagus, keputusan tidak. Jangan dijadikan contoh.' % (Q['brWin']['d'], round(Q['brWin']['r'], 2)))
    if Q['brLoss']['d']:
        sh = ', %d%% dari seluruh kerugian R' % round(c['avoidableShare'] * 100) if c['avoidableShare'] is not None else ''
        L.append('- %d hari rugi saat melanggar rule (%sR)%s: ini yang bisa dihindari.' % (Q['brLoss']['d'], sg(Q['brLoss']['r']), sh))
    if c['gapDay'] is not None:
        L.append('- Selisih rata-rata R/hari: patuh %s %gR dibanding melanggar (asosiasi, belum tentu sebab).' % ('lebih tinggi' if c['gapDay'] >= 0 else 'lebih rendah', abs(round(c['gapDay'], 2))))
    L += ['', '## Rule wajib yang paling sering terlewat']
    L += ['- %s: %d/%d (%d%%)' % (x['text'], x['missed'], x['seen'], round(x['missed'] / x['seen'] * 100)) for x in c['rules']] or ['- Belum ada (minimal 3 kali dicek).']
    if len(c['per']) > 1:
        L += ['', '## Per strategy']
        L += ['- %s: %d hari · %s patuh · %sR' % (p['name'], p['days'], pc(p['adhRate']), sg(p['sumR'])) for p in c['per']]
    L += ['', '_Statistik deskriptif atas journalmu sendiri, bukan sinyal trading dan bukan bukti sebab-akibat._']
    return '\n'.join(L)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('file'); ap.add_argument('--days', type=int, default=None, help='hanya N hari terakhir')
    ap.add_argument('--json', action='store_true', help='keluarkan angka mentah sebagai JSON')
    a = ap.parse_args()
    with open(a.file, encoding='utf-8') as f:
        data = json.load(f)
    since = (datetime.date.today() - datetime.timedelta(days=a.days)).isoformat() if a.days else None
    c = compute(data.get('journals', []), data.get('strategies', []), since)
    print(json.dumps(c, indent=2, ensure_ascii=False) if a.json else report(c))


if __name__ == '__main__':
    sys.exit(main())
