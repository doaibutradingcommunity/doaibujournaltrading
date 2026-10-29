#!/usr/bin/env python3
"""v16.89 · Kontras terburuk tiap tingkat kaca (metode sama dengan glass_contrast.py).

Nilai harus sama dengan token --gt1-* / --gt2-* di glass-tiers.css:
  alpha = lantai + lg * rentang, brightness = --gtN-bright.
Latar di belakang kaca dimodelkan sebagai abu-abu rata B (0 hitam … 1 putih), sesudah blur.
Level 3 (padat, alpha ≥ .97) tidak dihitung: latar tidak tembus.
"""
def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def L(rgb):
    r, g, b = rgb
    return .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b)
def cr(a, b):
    la, lb = L(a), L(b)
    if la < lb: la, lb = lb, la
    return (la + .05) / (lb + .05)
def mix(fg, bg, a): return tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3))

# nama, warna kaca, (teks utama, alpha), (teks sekunder/label, alpha), brightness, alpha(lg), rentang B realistis
TIERS = [
    ('L1 Clear  gelap',  (22, 23, 26),    ((255, 255, 255), .94), ((255, 255, 255), .78), .56,  lambda g: .44 + g * .18, (.25, 1.0)),
    ('L2 Soft   gelap',  (22, 23, 26),    ((255, 255, 255), .94), ((235, 235, 245), .62), .76,  lambda g: .66 + g * .20, (.25, 1.0)),
    ('L1 Clear  terang', (255, 254, 250), ((0, 0, 0), .90),       ((0, 0, 0), .72),       1.04, lambda g: .56 + g * .20, (.25, 1.0)),
    ('L2 Soft   terang', (255, 254, 250), ((0, 0, 0), .90),       ((0, 0, 0), .62),       1.04, lambda g: .74 + g * .14, (.25, 1.0)),
]
STEPS = (0, .25, .5, .75, 1.0)

def worst(glass, tp, ts, bright, afn, lo, hi):
    wp = ws = 99.0
    for lg in (0, .55, 1):
        a = afn(lg)
        for B in STEPS:
            if not (lo <= B <= hi): continue
            bd = min(1, B * bright) * 255
            comp = mix(glass, (bd, bd, bd), a)
            wp = min(wp, cr(mix(tp[0], comp, tp[1]), comp))
            ws = min(ws, cr(mix(ts[0], comp, ts[1]), comp))
    return wp, ws

if __name__ == '__main__':
    print('Kontras terburuk (latar B = .25 … 1.0, lg = 0 / .55 / 1)')
    for name, glass, tp, ts, br, afn, (lo, hi) in TIERS:
        p, s = worst(glass, tp, ts, br, afn, lo, hi)
        pe, se = worst(glass, tp, ts, br, afn, 0, 1)
        print(f'{name:18s} utama {p:5.1f}  sekunder {s:5.1f}   | termasuk B=0: utama {pe:5.1f} sekunder {se:5.1f}')
