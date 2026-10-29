# v16.80 — Depth Parallax

Melengkapi konsep **Depth-Aware Glass**. Elevasi tiga tingkat (nav di depan, panel utama di tengah, ambient di belakang) sudah ada sejak v16.77 (`glass-depth.css`); yang belum ada adalah isyarat gerak. Versi ini menambah paralaks yang sangat ringan pada lapisan ambient saja. Lapisan tampilan; data, statistik, dan logika navigasi tidak diubah.

## Tiga lapisan, tiga kecepatan
| Lapisan | Elemen | Gerak saat gulir |
|---|---|---|
| Depan | dock, header, tab (fixed) | tidak bergerak |
| Tengah | panel utama | gulir normal (1×) |
| Belakang | lampu ambient `#sg-light` (`.a` `.b` `.c`) | 0,05× gulir, maks 36px (desktop) / 24px (HP), maks 10% tinggi layar |

Gerak dilunakkan dengan `tanh`, jadi mendekati batas tanpa berhenti mendadak. Tiap lampu punya faktor kedalaman sendiri (`.a` 1×, `.b` 0,6×, `.c` 1,5×) sehingga cahaya terasa berlapis.

## Cara kerja
- `depth-parallax.js` hanya mengisi `--dp-y` (px) pada `#sg-light` lewat satu `requestAnimationFrame` per gulir (listener pasif, langkah 0,5px).
- `depth-parallax.css` memakai properti `translate`, terpisah dari `transform`, jadi animasi `sg-a/b/c` dan pergeseran per-halaman (`--sg-x/--sg-y`) tidak bertabrakan. Wadah `#sg-light` tidak digeser, sehingga tidak ada tepi yang terbuka.
- Tanpa filter blur dan tanpa pengukuran layout; hanya compositor.

## Fallback (semuanya statis, persis v16.79)
`prefers-reduced-motion`, `html.mo-lite`, `data-ui-effects="low"`, `forced-colors`, browser tanpa properti `translate`, atau skrip gagal dimuat.

## File
Baru: `depth-parallax.css`, `depth-parallax.js`, `CHANGELOG-v16.80.md`.
Diubah: `index.html` (satu `<link>` setelah `morph-nav.css`, satu `<script>` setelah `morph-nav.js`), `sw.js` (cache `v16-80-0-depth-parallax`, dua file baru masuk shell).

## Membatalkan
Hapus `<link href="depth-parallax.css">` dan `<script src="depth-parallax.js">`. Tampilan kembali persis v16.79.

## Catatan pengujian
Diuji di Chromium headless pada halaman uji kecil (memuat `signature.css` asli + file baru), bukan aplikasi penuh. Terverifikasi: translate 0 di posisi atas; −5/−18/−35,5px pada gulir 100/400/2000px (lampu `.a`), rasio antar-lampu 0,6× / 1× / 1,5×; batas HP 24px; `reduced-motion`, `mo-lite`, dan `data-ui-effects="low"` menghasilkan `translate: none`.
Belum diuji: aplikasi penuh dengan login, Safari/Android fisik, tema terang secara visual (lampu `.c` memang disembunyikan di tema terang), halaman `calm`.
Catatan: lapisan ambient hanya tampil setelah login dan saat `html.sg-on` aktif; di halaman login paralaks tidak terlihat.
