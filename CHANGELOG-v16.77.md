# v16.77 — Multi-Layer Glass Depth

Tiga tingkat material dengan hierarki elevasi yang jelas. Lapisan tampilan saja; data, statistik, dan logika tidak diubah.

## Pembagian tugas antar-file
| Tingkat | Isi, alpha, blur, fallback | Elevasi & sorot |
|---|---|---|
| 0. Latar ambient (`#vibe-ambient`, `body::before`) | tidak diubah (orb blur 70px) | 0 |
| 1. Panel utama | `smart-glass.css` (DATA .92–.98, hero padat penuh) | **e1** kartu/tile/KPI · **e2** hero, ekuitas, kalender, statistik + permukaan satu langkah lebih terang |
| 2. Nav (dock, header, tab) | `smart-glass.css` | `glass-nav.css`, tidak disentuh |
| 2. Sheet & modal | `smart-glass.css` | **e3**, jatuh jauh, sorot sheet |
| 2. Menu, popover, tip | `smart-glass.css` | **e-pop**, tanpa lapisan jauh |
| 2. Aksi: FAB, toast | — | **e4**; FAB punya sorot tepi, kilap kubah, bayangan dalam, cahaya emas |

`glass-depth.css` sengaja **tidak** menyentuh alpha, blur, brightness, atau fallback (milik v16.76), maupun bayangan nav (milik v16.75).

## Yang berubah
- Hero dan panel utama kini lebih tinggi dari kartu biasa (sebelumnya semua panel berbayangan identik karena satu token `--amb-solid-drop`). Tema gelap: permukaan hero `#1B1C20` (analytic `#1E2025`); tema terang: putih murni di atas kartu krem.
- **Modal ber-kelas `.glass`** (form jurnal dan sejenisnya) sebelumnya berbayangan paling lemah (3 lapis, `0 14px 34px`) karena `body .glass { box-shadow … !important }` di `index.html` mengunci token. Kini memakai sorot sheet + e3 (3→10/11 lapis). Alpha dan blur tidak berubah.
- Menu & tip kecil memakai e-pop (bayangan sejauh 100px pada elemen kecil tampak seperti kabut).
- Toast dan snackbar undo memakai e4.
- **FAB "Journal Baru"**: bayangan dan sorot sendiri (lima lapis + `::before` kilap kubah dengan `z-index:-1`, sehingga ikon dan label tidak pucat). `!important` diperlukan karena `editorial.css` mengunci `box-shadow`.
- HP: lapisan jatuh jauh pada e2/e3 dibuang agar gulir tetap ringan.
- `forced-colors`: kilap FAB dimatikan.

## Dikecualikan dengan sengaja
`.jd-panel` (detail trade, berisi P/L) tetap padat. Hover/press FAB tidak diubah. Pulse FAB sudah dimatikan sejak v16.72.

## File
Baru: `glass-depth.css`, `CHANGELOG-v16.77.md`.
Diubah: `index.html` (satu `<link>` setelah `smart-glass.css`), `sw.js` (cache `v16-77-0-glass-depth`, file baru masuk shell).

## Membatalkan
Hapus `<link href="glass-depth.css">`. Tampilan kembali persis v16.76.

## Catatan pengujian
Diuji di Chromium headless pada `index.html` asli (Tailwind dibuat lokal dari konfigurasi aplikasi, Firebase di-stub), dengan konten Beranda contoh. Nilai terhitung dibandingkan sebelum/sesudah untuk header, tab, dock, hero, tile, kartu, sheet, toast, FAB, dan modal terbuka (desktop gelap/terang, mobile gelap): alpha dan blur identik dengan v16.76. Dilihat langsung: desktop gelap/terang, mobile tergulir, sheet menu, toast, FAB diperbesar.
Belum diuji: Safari/Android fisik, aplikasi penuh dengan data nyata, halaman selain Beranda (statistik, kalender), `mo-lite` dan `prefers-reduced-transparency` (tidak ada aturan baru di sana; kaca tetap diatur v16.76), konteks `analytic` secara visual. Font di screenshot uji adalah fallback karena lingkungan offline.
