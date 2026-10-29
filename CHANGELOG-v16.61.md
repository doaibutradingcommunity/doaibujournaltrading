# v16.61 — Journal Detail Cinematic

Panel detail trade (drawer di desktop, bottom sheet di HP) disusun seperti laporan evaluasi profesional.

- **Ringkasan hasil di atas:** P/L besar di header (memadat otomatis saat di-scroll), lalu baris metrik: Hasil R, Risk, Evaluasi (bintang), Biaya. Metrik yang datanya tidak ada tidak ditampilkan.
- **Screenshot setup sebagai fokus visual:** foto besar 16:10 dengan latar buram ala sinema, penghitung "1 / 3", strip thumbnail untuk berpindah chart, ketuk untuk zoom (memakai viewer zoom yang sudah ada). Gambar gagal dimuat disembunyikan, bukan ikon rusak. Tanpa screenshot: placeholder ringkas.
- **Tiga bagian bernomor, bisa dibuka-tutup:** 01 Alasan Entry (setup, sesi, Market Outlook, strategi), 02 Emosi, 03 Evaluasi (ringkasan otomatis + catatan & lesson learned). Bagian pertama terbuka; yang tertutup menampilkan cuplikan satu baris. Bagian tanpa isi tidak muncul. Pilihan buka-tutup diingat saat berpindah trade dengan ‹ ›.
- Aksesibel: `aria-expanded`, bagian tertutup `inert`, fokus keyboard, Enter/Spasi pada foto membuka zoom, mengikuti prefers-reduced-motion. Mode gelap & terang. Teks id/en/ms/es.
- Aman: bila modul gagal, tampilan detail lama dipakai otomatis. Logika data, edit, hapus, dan navigasi tidak berubah.
- File baru: `journal-cinematic.js`, `journal-cinematic.css`. Diubah: `index.html` (renderJournalDetail, tag script/css), `journal-ux.js` (satu kelas pada panel), `sw.js` (cache v16-61-0-cinematic).
