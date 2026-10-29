# v16.75 — Dynamic Glass Navigation

Dock bawah (HP) kini terasa melayang di atas konten. Lapisan tampilan saja: tidak ada markup baru, tidak ada JS baru, logika navigasi tidak diubah.

## Yang berubah
- **Kapsul kaca tipis** di belakang item aktif: gradasi kaca, tepi dalam 1px, pantulan cahaya di tepi atas, bayang hangat tipis. Memakai `.npv-ind` yang sudah meluncur, jadi gerakan antar-tab tetap sama. Pada dock memadat (gulir turun) kapsul ikut memendek.
- **Ikon dan label aktif lebih jelas, bukan hanya ganti warna:** ikon terisi tint champagne, stroke lebih tebal, terangkat 1px dan sedikit membesar dengan glow lembut; label aktif memakai warna teks utama (kontras tinggi) sementara label tidak aktif tetap redup.
- **Bar melayang:** bayangan ambient tiga lapis (dekat, menengah, jauh), cincin pemisah 1px di luar tepi, garis cahaya di tepi atas, dan sheen kaca statis.
- **Safe area bawah tetap dipakai:** `viewport-fit=cover` + `env(safe-area-inset-bottom)` pada posisi dock, padding konten, FAB, dan toast tidak diubah. Sisi kiri/kanan tetap menghormati notch saat landscape.

## v16.75.1 — Tab tablet / desktop disamakan
Tab navigasi di layar >640px (pil `.glass-pill.nav-wrap`) memakai bahasa visual yang sama dengan dock HP:
- bar melayang: kaca + blur 24px, bayangan ambient berlapis, cincin pemisah, garis cahaya atas; bayangan makin dalam saat halaman digulir (`sl-scrolled`);
- tab aktif = kapsul kaca tipis (token `--gn-cap-*` yang sama), label kontras tinggi, ikon emas sedikit membesar dan naik; garis emas kecil di bawah diganti pantulan cahaya di tepi atas kapsul;
- tab tidak aktif berbobot 500 dan lebih redup.
Aturan lama `--soft-tab-*` di `index.html` memakai `!important`, jadi hanya latar, bayangan, warna, dan text-shadow tab aktif yang memakai `!important` di sini.
Fallback: `html.mo-lite` dan `prefers-reduced-transparency` → latar padat tanpa blur; `prefers-contrast: more` dan `forced-colors` ditangani. Cache SW: `v16-75-1-glass-nav`.

## Hormat pada perangkat dan preferensi
- Tema terang dan gelap punya token sendiri.
- `prefers-reduced-transparency`: sheen tidak dipasang, latar padat dari lapisan lama tetap menang.
- `html.mo-lite`: tidak ada blur baru (kapsul hanya gradasi statis).
- `prefers-contrast: more`: cincin pemisah dan kapsul lebih tegas.
- `forced-colors`: kapsul menjadi garis `Highlight`.
- `prefers-reduced-motion`: tanpa transisi baru.

## File
Baru: `glass-nav.css`, `CHANGELOG-v16.75.md`.
Diubah: `index.html` (satu `<link>` setelah `optical-glass.css`), `sw.js` (cache `v16-75-0-glass-nav`, file baru masuk shell).

## Membatalkan
Hapus `<link href="glass-nav.css">`. Tampilan kembali persis v16.74.

## Catatan
Diuji di Chromium headless (390×780) dengan tumpukan CSS asli: tema gelap, terang, dan dock memadat. Belum diuji di Safari/Android fisik. Tab tablet/desktop diuji di Chromium 1180px dengan CSS asli (gelap dan terang); halaman uji tanpa JS, sehingga tab sekunder yang biasanya disembunyikan tampil.
