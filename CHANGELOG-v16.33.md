# Doa Ibu Journal Trading — v16.33

## Beranda: halaman awal sebelum masuk ke jurnal

- Tab baru **Beranda** (tab pertama, dan slot pertama di dock mobile). Setelah login aplikasi membuka Beranda, bukan langsung dashboard; logout juga kembali ke Beranda.
- **Sambutan personal** berdasarkan jam (pagi/siang/sore/malam) dan nama profil, plus status hari ini.
- **Langkah berikutnya** (satu tombol utama yang berubah sesuai kondisi): jurnal pertama → Pre-Market (sebelum 17.00) → checklist pra-trade → tulis journal → evaluasi bila journal hari ini sudah ada. Tombol **Masuk ke Jurnal** selalu tersedia.
- **Ringkasan bulan ini**: P/L, win rate, jumlah journal (dari data journal yang sudah dimuat).
- **Akses cepat**: Journal Baru (membuka form yang sama dengan tombol +), Galeri Chart (menampilkan jumlah chart), Evaluasi (membuka Rekap Evaluasi).
- **Sesi terakhir**: pair, hasil, arah, sesi, R, emosi, catatan, dan pintasan membuka journal tersebut.
- **Aturan & tujuan**: fokus bulan ini (dari Review Bulanan), progres checklist pra-trade hari ini, batas risiko, dan strategi terakhir dipakai.
- Kartu Rekap Evaluasi yang sudah ada ikut tampil di Beranda bila datanya tersedia.
- Tampilan kaca (liquid glass) mengikuti tema gelap/terang, responsif, menghormati `prefers-reduced-motion` dan `prefers-reduced-transparency`. Teks tersedia dalam Indonesia dan Inggris (Melayu mengikuti Indonesia, Spanyol mengikuti Inggris, seperti Strategy Playbook).
- Dock mobile: urutan menjadi Beranda · Dashboard · Kalender · Statistik · Menu. **Diary & Review dipindah ke sheet Menu.**
- Tidak ada koleksi Firestore baru, tidak ada penulisan data, tidak mengubah Firebase Auth, skema data, atau perilaku Dashboard. Service worker naik ke `v16-33-home`.

## Verifikasi

- `tests/v33-home-test.js` (45 pemeriksaan, jalan dengan `node`): urutan prioritas langkah berikutnya, statistik bulan, sesi terakhir, aturan, escape HTML, aksi klik, struktur tab/dock.
- Seluruh inline JavaScript pada `index.html` lolos `node --check`.
- `tests/premium-test.js`: pemilih tab Kalender di dock mobile tidak lagi bergantung pada urutan (`data-npv="calendar"`).
- Belum dijalankan: tes browser (Playwright) dan pemeriksaan visual. Jalankan tes browser yang ada sebelum deploy.
