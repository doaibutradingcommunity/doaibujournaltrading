#!/usr/bin/env python3
"""v16.81 · Penjaga Contextual Ambient Lighting.

Aturan: cahaya latar TIDAK boleh berubah warna/kekuatan menurut profit atau loss.
Skrip ini memindai berkas ambient dan gagal (exit 1) bila menemukan:
  1. token P/L di CSS/JS (pnl, profit, loss, win/lose, positive/negative, green/red, success/danger, ...)
  2. literal warna hijau/merah (hex, rgb(), nama) di berkas ambient BARU (contextual-ambient.*)
  3. pembacaan data (journal, V16Stats, Firestore, allJournals) di contextual-ambient.js

Jalankan dari folder aplikasi:  python3 scripts/ambient_guard.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STRICT = ['contextual-ambient.css', 'contextual-ambient.js']          # tidak boleh memuat warna sama sekali
WATCH = STRICT + ['ambient-glass.css', 'ambient-glass.js', 'signature.css', 'signature.js',
                  'depth-parallax.css', 'depth-parallax.js', 'signature-glass.css', 'native-tabbar.css',
                  'native-sheet.css', 'native-sheet.js', 'glass-tiers.css']

PL_TOKENS = re.compile(
    r'(pnl|p/l|profit|\bloss(?:es)?\b|\bwin(?:ner|s|rate)?\b|\blos(?:e|ing)\b|positive|negative|'
    r'--green|--red|--success|--danger|--pos\b|--neg\b|text-(?:green|red)|\bgreen\b|\bred\b)', re.I)
DATA_TOKENS = re.compile(r'(allJournals|V16Stats|firebase|firestore|journals-loaded|localStorage|getDoc|onSnapshot)', re.I)
HEX = re.compile(r'#[0-9a-fA-F]{3,8}\b')
RGB = re.compile(r'\brgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)')


def strip_comments(text: str, path: str) -> str:
    """Komentar boleh menyebut aturan (mis. 'profit atau loss'); yang diperiksa hanya kode."""
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    text = re.sub(r'@supports\s*\([^{]*\)\s*(?=\{)', '@supports (feature-test)', text)   # deteksi fitur bukan warna terpakai
    if path.endswith('.js'):
        text = re.sub(r'(?m)(^|[^:\\])//.*$', r'\1', text)
    return text


def hue_is_red_or_green(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 40:                      # hampir netral
        return False
    if mx == r:
        h = (60 * ((g - b) / (mx - mn))) % 360
    elif mx == g:
        h = 60 * (2 + (b - r) / (mx - mn))
    else:
        h = 60 * (4 + (r - g) / (mx - mn))
    return h < 15 or h > 345 or 75 <= h <= 165          # merah murni / hijau


def main() -> int:
    bad = []
    for name in WATCH:
        f = ROOT / name
        if not f.exists():
            bad.append(f'{name}: berkas tidak ada')
            continue
        code = strip_comments(f.read_text(encoding='utf-8'), name)
        for ln, line in enumerate(code.splitlines(), 1):
            m = PL_TOKENS.search(line)
            if m:
                bad.append(f'{name}: token P/L "{m.group(0)}" (baris kode ~{ln}): {line.strip()[:90]}')
            if name.endswith('.js') and name in STRICT and DATA_TOKENS.search(line):
                bad.append(f'{name}: membaca data/penyimpanan (baris kode ~{ln}): {line.strip()[:90]}')
        if name in STRICT:
            if HEX.search(code):
                bad.append(f'{name}: berisi literal hex (berkas ini tidak boleh memuat warna)')
            for m in RGB.finditer(code):
                bad.append(f'{name}: berisi rgb() literal {m.group(0)}…')
        else:
            for m in RGB.finditer(code):
                r, g, b = map(int, m.groups())
                if hue_is_red_or_green(r, g, b):
                    bad.append(f'{name}: warna merah/hijau rgb({r},{g},{b})')

    if bad:
        print('GAGAL — ambient tidak boleh terikat profit/loss:')
        for b in bad:
            print('  -', b)
        return 1
    print(f'OK — {len(WATCH)} berkas ambient bebas dari token P/L, warna merah/hijau, dan pembacaan data.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
