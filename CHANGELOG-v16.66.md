# v16.66 — Ambient Adaptive UI + Glass yang lebih matang

Lapisan tampilan saja, dimuat paling akhir. Tidak ada perubahan markup, data, atau logika aplikasi.

## A. Ambient Adaptive UI
Latar dan aksen mengikuti fungsi halaman. Bukan latar yang terus bergerak: berpindah halaman = satu crossfade 0,6 dtk pada cahaya latar, lalu diam.

| Konteks | Halaman | Bahasa visual |
|---|---|---|
| `glow` | Beranda, Journal, Trading Wrapped, Galeri, Tentang | cahaya emas lembut di kiri-atas, hero memegang aksen emas |
| `calm` | form journal (modal), Diary, Pengaturan | netral: tanpa cahaya emas, hiasan aksen jadi abu; tirai modal sedikit lebih gelap agar fokus |
| `analytic` | Kalender, Statistik, Review Bulanan, Strategy, AI Coach | kontras lebih kuat: garis tepi lebih tegas, teks sekunder lebih terang (gelap) / lebih gelap (terang), vinyet lebih dalam, cahaya dingin tipis |
| `auth` | Landing & login | tidak disentuh (tetap minimal dan eksklusif) |

Konteks dipasang sebagai `body[data-amb]` oleh `ambient-glass.js` (dari event `viewchange`, class `body.authed`, dan modal `#form-section` yang bisa dibuka dari halaman mana pun).

## B. Kaca: hanya di navigasi, header, dan elemen mengambang
Tiga tingkat blur yang konsisten (sebelumnya 3–36px berbeda-beda di banyak file):

- **bar** (header, dock): 20px (HP 18px)
- **float** (menu, sheet, modal, toast, filter, popover): 28px (HP 22px)
- **scrim** (tirai di belakang modal): 6px (sebelumnya sampai 18px, yang berat di HP)

Semua tepi kaca memakai garis tepi transparan + pantulan cahaya tipis di sisi atas (`--amb-rim`). Opasitas tetap mengikuti slider "Transparansi kaca" (`--lg`).

## C. Surface solid untuk angka dan data
KPI, hero, grafik, kalender, statistik, dan semua `.glass` di dalam konten halaman kini padat (tanpa blur) dengan garis tepi halus. Sheet modal tidak ikut (tetap kaca). Hiasan kilau/garis emas pada kartu data dimatikan; hero tetap memegang satu aksen ambient.

## D. Fallback
Reduce Transparency, `html.mo-lite` (HP hemat), `html[data-ui-effects="low"]` dan browser tanpa `backdrop-filter`: semua kaca menjadi padat; transisi latar dimatikan di mode hemat dan `prefers-reduced-motion`.

## File
Baru: `ambient-glass.css`, `ambient-glass.js`, `CHANGELOG-v16.66.md`.
Diubah: `index.html` (satu `<link>` dan satu `<script>` di bagian paling akhir), `sw.js` (cache `v16-66-0-ambient-glass`, dua file baru masuk shell).

## Membatalkan
Hapus `<link href="ambient-glass.css">` dan `<script src="ambient-glass.js">` dari `index.html`. Tampilan kembali persis v16.65.

## Catatan
- Nama token bayangan `--amb-drop` dipisah dari properti angka `--amb-lift` (kilau latar) agar tidak bentrok.
- Memakai `@property` untuk crossfade; di browser lama yang belum mendukung, konteks berganti seketika (tanpa transisi), tampilan tetap benar.
