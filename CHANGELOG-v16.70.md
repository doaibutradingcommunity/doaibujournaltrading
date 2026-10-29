# v16.70 — Signature Ambient Experience

Identitas visual DOA IBU: cahaya emas yang sangat halus dan berubah perlahan, tiga lapis kedalaman, header yang menyatu dengan halaman, dan satu bahasa gerak. **Ambient hanya aksen**: cahaya selalu di belakang (z-index −1), semua angka dan data tetap di permukaan padat dari v16.66. Lapisan tampilan saja, dikunci ke `html.sg-on`; data, statistik, dan `switchView` tidak diubah. Landing dan login tidak disentuh.

## A. Cahaya signature
- Tiga "lampu" emas besar bergeser dan bernapas sangat pelan (siklus 89 / 131 / 107 detik, saling tidak habis dibagi sehingga pola tidak terasa berulang). Hanya `transform` + `opacity` (compositor); tanpa `filter: blur`.
- Menggantikan dua bola blur 60vmax lama (`#vibe-ambient`, `filter: blur(70px)`, berat di HP). Cahaya statis v16.66 di tepi atas tetap ada.
- **Nada bergeser sepanjang hari** (dawn / day / dusk / night, cek tiap 10 menit): champagne di pagi, emas netral siang, amber sore, tembaga malam. Pergantian 12 detik, bukan loncat.
- **Ikut konteks halaman v16.66:** Beranda/Journal/Wrapped/Galeri penuh, Kalender/Statistik/Strategy/Coach ±28%, Diary/Pengaturan/form ±12%. Berganti dengan crossfade 0,6 dtk.
- **Tiap halaman punya titik cahayanya**: pindah halaman = cahaya bergeser pelan (±7vw/vh, 1,8 dtk).
- Tema terang: lebih hangat dan lebih tipis, satu lampu saja.

## B. Kedalaman tiga lapis
Latar (cahaya) → panel padat (terangkat) → sumur konten (cekung).
- Panel utama (hero Beranda, ekuitas, kalender, statistik): garis emas setipis rambut di tepi atas dan cahaya yang tumpah halus ke latar di bawahnya. Tetap permukaan padat. Netral di halaman calm.
- Blok di dalam panel (mis. "Fokus bulan ini") menjadi sumur cekung dengan bayangan dalam, bukan sekadar kotak lebih terang. Kelas bantu `.sg-well` tersedia untuk blok lain.

## C. Header
- Di puncak halaman: semi-transparan, menyatu dengan latar. Saat digulir 0–140 px: kaca makin pekat, garis tepi dan garis emas tipis di bawahnya muncul bertahap (progres 0→1, bukan sakelar). Desktop dan HP.
- Tema terang dan Reduce Transparency ditangani (solid).

## D. Pindah halaman
Diaudit dengan menjalankan semua halaman: semuanya kini satu gerak (fade + naik 6 px, 190–200 ms) dan judul header berganti 200 ms. Perbaikan: **Beranda** dulu memakai gerak sendiri (tiap blok naik 14 px selama 550 ms dengan jeda berurutan); kini sama dengan halaman lain. HP hemat: fade saja.

## Hormat pada perangkat dan preferensi
- `prefers-reduced-motion`: cahaya statis, tanpa transisi (diuji: tidak ada animasi `sg-*` berjalan).
- `html.mo-lite` (HP hemat) dan `data-ui-effects="low"`: lampu statis, satu lampu, tanpa transisi.
- Cahaya dijeda saat menggulir (`html.mo-scrolling`). `forced-colors`: cahaya dimatikan.
- Browser tanpa `@property` / `color-mix()`: warna tetap emas netral, perpindahan nada seketika; tampilan tetap benar.

## File
Baru: `signature.css`, `signature.js`, `CHANGELOG-v16.70.md`.
Diubah: `index.html` (satu `<link>`, satu `<script>`, setelah `living.*`), `sw.js` (cache `v16-70-0-signature`, dua file baru masuk shell).

## Membatalkan
Hapus `<link href="signature.css">` dan `<script src="signature.js">`. Tampilan kembali persis v16.69 (diuji: melepas `html.sg-on` mengembalikan `#vibe-ambient`).

## Catatan
- Diuji di Chromium headless (Firebase di-stub, Tailwind lokal) pada 1280px dan 390px, tema gelap dan terang. Belum diuji di Safari atau Android fisik, dan belum diukur FPS/baterai di perangkat nyata.
- Animasi dekoratif lama yang masih berjalan terus dan tidak diubah di versi ini: denyut tombol tambah (`vibePulse`, 4,2 dtk) dan kilau tombol emas (`vibeSheen`). Bisa diredam di versi berikutnya bila ingin ambient benar-benar satu-satunya gerak latar.
