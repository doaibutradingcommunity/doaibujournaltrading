# v16.90 — Review (Before/After + Evaluasi) pindah ke form "+"

Pengguna cukup mengisi di satu tempat: tombol "+" mengambang. Form itu kini punya tiga tab: **Pre-Market | Journal Trade | Review**. Logika dan lokasi data tidak berubah.

## Yang berubah
| Sebelumnya | Sekarang |
|---|---|
| Before vs After: isi "After" di halaman Diary & Review | Tab **Review** di form "+" (bagian AFTER) |
| Review harian/mingguan/bulanan: isi di halaman Diary & Review | Tab **Review** di form "+" (bagian EVALUASI, pilih Harian / Mingguan / Bulanan) |
| Halaman Diary & Review berisi kolom isian | Halaman itu kini **baca saja** + tombol "Isi / edit di form +" yang membuka tab Review di tanggal/periode yang sama |

Tab Review menampilkan ringkasan BEFORE (Pre-Market tanggal itu) di atas, lengkap dengan penanda "Sesuai / Meleset dari analisis" yang ikut berubah saat bias aktual dipilih.

## Yang tidak berubah (logika sama)
- After: `users/{uid}/outlooks/{tanggal}.after` = `{actual, happened, change, reflect}`.
- Evaluasi: `users/{uid}/reviews/{d|w|m}_{tanggal-awal}` = `{period, start, end, w, x, i}` + cadangan `localStorage` `v2rev:{p}:{awal}`.
- Rentang minggu (mulai Senin) dan bulan dihitung sama seperti sebelumnya.
- **Rekap Evaluasi** tetap membaca dua sumber itu: "Jangan diulang" (x, kesalahan), "Perbaiki" (i), "Pertahankan" (w), dan refleksi After. Setelah menyimpan, rekap dimuat ulang otomatis (`DoaRecap.refresh()`).
- Tidak perlu mengubah Firestore Rules. Akurasi bias, kartu Before vs After, dan statistik Review tetap tampil seperti sebelumnya.
- Tab Pre-Market dan Journal Trade tidak berubah. Tab pertama yang terbuka tetap cerdas (Pre-Market bila belum ada outlook hari itu).

## Perilaku tab Review
- Simpan hanya menulis bagian yang disentuh (After dan/atau Evaluasi). Mengosongkan teks yang sudah tersimpan lalu menyimpan akan menghapus isinya.
- Tanggal diambil dari kolom Tanggal di atas form; ganti tanggal atau periode memuat isian yang sesuai.
- Offline / lambat (>12 dtk): pesan "akan tersinkron otomatis saat online" seperti sebelumnya.
- 4 bahasa (id, en, ms, es). Tema terang dan gelap.

## File
Baru: `review-in-form.js`, `review-in-form.css`, `CHANGELOG-v16.90.md`.
Diubah: `index.html` (tab, panel, tombol simpan, mode di wizard, kartu Diary & Review jadi baca saja, `DoaRecap.refresh`), `journal-form-ux.js` dan `undo-recovery.js` (tombol simpan baru ikut status simpan dan pemulihan draf), `premium.css` (ukuran tombol), `sw.js` (cache `v16-90-0-review-in-form`).
