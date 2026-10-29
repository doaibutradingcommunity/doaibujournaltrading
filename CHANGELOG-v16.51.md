# v16.51 — Trade Journal 360°
**Detail tiap transaksi menjadi halaman analisis lengkap.** Tidak mengubah statistik, form input lama, atau navigasi.

| Bagian | Isi |
|---|---|
| 1 Overview | instrumen, arah, entry, exit, SL, TP, ukuran, P/L, waktu buka/tutup; otomatis menghitung R/R rencana, R aktual, gerak harga, durasi; peringatan bila SL/TP di sisi salah |
| 2 Timeline | langkah keputusan per fase (Sebelum entry, Entry, Manajemen, Penutupan) berurut waktu; node Entry/Exit terisi otomatis dari Overview |
| 3 Sebelum vs Sesudah | screenshot rencana vs aktual berdampingan (unggah baru atau pilih dari chart journal), harga rencana, tabel selisih Entry/SL/Target/R·R |
| 4 Aturan | tiap rule: Dipatuhi / Dilanggar / Tidak relevan (+ alasan bila dilanggar), skor kepatuhan, rule wajib yang dilanggar |
| 5 Review | kesalahan utama (pilihan + teks), pelajaran, tindakan berikutnya + status selesai |
| 6 Riwayat | setiap simpan mencatat apa yang berubah (nilai lama → baru), per trade atau semua |

- **Cara membuka:** panel detail journal punya kartu "Trade Journal 360°" di bagian atas. Juga `Trade360.open(id)`.
- **Penghitungan:** R/R rencana = jarak TP ÷ jarak SL dari entry rencana (jika kosong memakai entry/SL/TP aktual). R aktual = (exit − entry) ÷ jarak SL, searah posisi.
- **Rule awal** diambil dari checklist strategy yang tercatat di journal itu (centang = Dipatuhi, tidak dicentang = Belum dinilai, bukan otomatis Dilanggar), atau checklist pra-trade bila tidak ada strategy.
- **Kelengkapan** (n/5) menghitung Overview, Timeline, Before/After (2 gambar), Aturan (semua dinilai), dan Review.

**Data**
- Satu dokumen journal = satu hari, jadi tiap trade disimpan sebagai rekaman di array `t360` pada dokumen itu; riwayat di `t360Hist` (maks 120 entri), cap waktu `t360UpdatedAt`. Semua opsional; journal lama tetap berfungsi. Maks 12 trade/hari.
- Jalur simpan lama memakai `update`/`set merge`, sehingga `t360` tidak ikut tertimpa saat journal diedit, digabung, atau diimpor.
- Simpan memakai transaksi Firestore. Bila data berubah dari tab/perangkat lain sejak dibuka, muncul konfirmasi sebelum menimpa.
- Tidak perlu mengubah Firestore Rules selama rules sudah mencakup dokumen `journals`.

**Keterbatasan yang perlu diketahui**
- Waktu pada riwayat memakai jam perangkat, bukan jam server.
- Riwayat hanya mencatat perubahan yang disimpan lewat halaman 360°, bukan edit lewat form journal lama.
- Unggah screenshot memakai jalur imgbb yang sama dengan form journal.
- Belum diuji dengan Firebase/data asli maupun perangkat fisik; hanya diuji di Chromium dengan mock Firestore (alur isi, simpan, ubah, riwayat, tutup, Escape).

**Teknis**
- File baru: `trade-360.js`, `trade-360.css`. `index.html`: dua baris tautan (CSS setelah `liquid-depth.css`, JS setelah `motion-system.js`). `sw.js`: cache `v16-51-0-trade-360`.
- Untuk membatalkan: hapus dua tautan itu dari `index.html`. Data `t360` yang sudah tersimpan tetap aman di Firestore.
