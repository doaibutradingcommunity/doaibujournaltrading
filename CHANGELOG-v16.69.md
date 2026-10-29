# v16.69 — Living Components

Lapisan tampilan di atas v16.68. Komponen kecil yang merespons tindakan pengguna; tidak ada animasi dekoratif yang berjalan terus. Data, statistik, dan `switchView` tidak diubah. Semua gaya dikunci ke `html.lc-on`.

## A. Angka berubah dengan transisi
- Angka pada kartu statistik (`.tnum`, `[data-money]`, `.v5-kpi .v`, `.stx-big`) menghitung dari nilai lama ke nilai baru dalam ~420 ms (easeOutCubic), dengan format yang sama (mata uang, pemisah ribuan/desimal, tanda +/−, %).
- Hanya jalan bila nilai berubah dan elemen terlihat. Ganti mata uang, mode sembunyikan saldo, atau teks non-angka = diganti langsung.
- Kartu yang dirender ulang tetap dibandingkan dengan nilai sebelumnya (kunci: id atau label kartu).
- Teks akhir selalu persis sama dengan yang ditulis aplikasi.

## B. Indikator filter
- Tombol "Filter & Sort" mendapat lencana jumlah filter aktif, `aria-expanded`, dan status terbuka.
- Kolom filter yang terisi diberi garis emas tipis. Lencana "pop" saat jumlah berubah.

## C. Grafik
- P/L kumulatif (Chart.js): garis bidik putus-putus + sorotan titik saat disentuh atau di-hover. Geser horizontal membaca grafik, geser vertikal tetap menggulir halaman (`touch-action: pan-y`). Detail hilang sendiri 1,8 dtk setelah jari diangkat.
- Grafik SVG di Dashboard sudah punya pembacaan sentuh sendiri; tidak diubah.

## D. Tombol dan toggle
- Chip/segmen: transisi warna/cincin, tekan = mengecil sedikit, pilihan baru aktif dengan pop singkat (280 ms).
- Switch: kenop melebar saat ditekan dan memantul ke posisi baru; fokus keyboard terlihat.

## E. Panel
- Panel Filter, strip filter aktif, dan `<details>` memakai satu gerak masuk yang sama (fade + turun 6 px, `--mo-base`).

## File
Baru: `living.css`, `living.js`, `CHANGELOG-v16.69.md`.
Diubah: `index.html` (satu `<link>`, satu `<script>`), `sw.js` (cache `v16-69-0-living`).

## Membatalkan
Hapus `<link href="living.css">` dan `<script src="living.js">`.

## Hormat pada preferensi
`prefers-reduced-motion` dan `html.mo-lite` (perangkat hemat): angka berganti langsung, tanpa pop/panel animasi.
