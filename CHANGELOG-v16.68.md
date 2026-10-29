# v16.68 — Navigasi yang lebih tenang

Lapisan tampilan di atas dock adaptif (v16.63/v16.65) dan header adaptif (v16.41). Dock, sheet Menu, dan logika `switchView` tidak diganti. Semua gaya dikunci ke `body.cn-on`.

## A. Judul halaman aktif
- **HP:** header menjadi bilah judul: avatar, judul halaman, nama profil kecil di bawahnya, lonceng, dan Pengaturan. Ketuk judul = kembali ke atas.
- **Desktop/tablet:** teks "Trading Journal" di bawah "DOA IBU" diganti judul halaman aktif.
- Judul memakai label tab asli, jadi mengikuti 4 bahasa. Menjadi satu-satunya `h1`; `document.title` ikut berubah (kembali ke judul awal saat logout); perpindahan halaman diumumkan lewat region `aria-live`.
- Tombol profil diberi `aria-label` (nama + "Edit profil"), dock diberi `aria-label`.

## B. Header HP lebih tenang
- Transparan di puncak halaman; kaca dan garis tipis muncul setelah digulir (`body.cn-scrolled`).
- Perbaikan tema terang: aturan `body.light` lama membuat kotak datar di belakang header HP.
- Judul ganda di konten ("Statistik", "Pengaturan") disembunyikan di HP.

## C. Dock
- Indikator aktif: pil lembut di belakang ikon (menggantikan garis emas dan cahaya radial v16.63). Posisi sudah diukur sejajar dengan ikon, dock penuh maupun memadat.
- Tekan tab = ikon mengecil sedikit, tanpa memudarkan seluruh tab.

## D. Pindah halaman
- Scroll langsung ke atas (sebelumnya dua `scrollTo` halus berebut dan halaman baru terlihat terseret naik).
- Satu transisi: fade + naik 6px, 190 ms (HP hemat: fade 120 ms; reduce-motion: tanpa animasi).
- Slide horizontal 320 ms dari `premium.js` dibatalkan; animasi CSS lama untuk kontainer halaman dinetralkan.
- Memanggil ulang halaman yang sama (mis. setelah simpan) tidak mereset scroll.

## E. Menu
- Grup "Lainnya" (di dalam tab "Lainnya") diganti **"Akun & info"** (ID/EN/MS/ES). Berlaku juga di popover desktop.
- Tombol Pengaturan di header menandai halamannya saat terbuka.

## File
Baru: `calm-nav.css`, `calm-nav.js`, `CHANGELOG-v16.68.md`.
Diubah: `index.html` (satu `<link>`, satu `<script>`, 4 string nama grup), `sw.js` (cache `v16-68-0-calm-nav`, file baru masuk shell).

## Membatalkan
Hapus `<link href="calm-nav.css">` dan `<script src="calm-nav.js">`. Tampilan kembali seperti v16.67 (kecuali nama grup "Akun & info", yang ada di `index.html`).

## Catatan
- Halaman Review Bulanan masih merender judul dalam konten berbahasa Inggris ("Monthly Review"); tidak diubah di versi ini.
- Diuji di Chromium headless (Firebase di-stub); belum diuji di Safari/Android fisik.
