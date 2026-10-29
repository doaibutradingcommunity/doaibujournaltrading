# v16.50 — Liquid Glass berlapis
**Kaca hanya untuk yang penting.** Hanya tampilan; tidak ada perubahan data, statistik, atau navigasi.

| Lapisan | Elemen | Perlakuan |
|---|---|---|
| Latar | halaman | kolam cahaya statis: emas kiri-atas, teal tipis kanan-bawah, vinyet tepi |
| Panel utama | hero Beranda, Equity/Performa utama, kalender, hero Statistik | tembus + blur, rim specular bergradien, kilau sudut lembut, cahaya emas dari bawah, bayangan berlapis |
| Panel sekunder | stat-card, KPI, tile, kartu `.v5-card` | matte, tanpa blur, tanpa kilau/rim, hairline tipis |
| Mengambang | header, dock, filter | kaca bawaan + rim/tepi gelap yang sama dengan panel utama |
| Modal | form, profil, pengingat | kaca padat (alpha tinggi) agar form terbaca |

- Mengikuti slider Transparansi kaca (`--lg`), Reduce Transparency, mode terang, `html.mo-lite` (panel utama jadi padat tanpa blur), dan forced-colors.
- Tanpa animasi terus-menerus, tanpa transform pada teks/angka. HP: radius blur dikurangi.
- File baru: `liquid-depth.css` (dimuat terakhir). `index.html`: satu baris tautan. `sw.js`: cache `v16-50-0-liquid-depth`.
- Untuk membatalkan: hapus tautan `liquid-depth.css` dari `index.html`.
- Belum diuji di perangkat fisik atau dengan data/Firebase asli; hanya dirender pada mock dengan CSS proyek.
