# v16.42 — Undo dan Recovery
**Undo (pembatalan)**
- Hapus journal, hapus diary, dan hapus strategi kini langsung berjalan lalu menampilkan snackbar **Urungkan** (10 detik; berhenti saat kursor/fokus ada di snackbar). Kondisi dokumen dicadangkan sebelum dihapus. Dialog konfirmasi lama diganti undo; bila modul tidak termuat, konfirmasi lama tetap dipakai.
- Perubahan penting juga bisa diurungkan: **edit journal**, **penggabungan** entry baru ke journal di tanggal yang sama, **input cepat di Kalender**, dan **import CSV/broker** (seluruh import dibatalkan sekaligus; hari yang belum ada sebelumnya dihapus lagi).
- Cadangan undo disimpan di perangkat selama **10 menit**. Setelah halaman dimuat ulang, snackbar Urungkan muncul lagi; di luar kolom teks juga bisa dengan **Ctrl/Cmd+Z**.
- Bila di tempat yang sama sudah ada data baru (mis. journal tanggal itu dibuat ulang), aplikasi bertanya dulu sebelum menimpa.

**Recovery (pemulihan draft)**
- **Form journal** disimpan otomatis ke perangkat saat diisi (semua kolom, emosi, rating, bagian Pre-Market, tab/langkah wizard, dan `submitId` anti-ganda). Draft baru dibuat hanya jika ada isi bermakna; edit journal punya draft sendiri per journal.
- Menutup form (Batal, klik latar, Esc), menutup tab, refresh, atau crash **tidak menghapus draft**. Saat aplikasi dibuka lagi muncul "Draft journal belum tersimpan — Lanjutkan / Buang"; menekan tombol **+** saat ada draft melanjutkan draft itu ("Mulai baru" tersedia). Membuka Edit pada journal yang punya perubahan belum tersimpan menawarkan **Pulihkan**.
- Draft dibuang **hanya setelah simpan berhasil** (atau dibuang manual), dan otomatis setelah 14 hari. Karena `submitId` ikut dipulihkan, mengulang simpan setelah gangguan tidak menggandakan entry.
- **Diary**: catatan, tugas, dan mood yang belum disimpan ditawarkan kembali saat tanggal itu dibuka.
- Batasan: file gambar yang dipilih tapi belum diunggah tidak bisa ikut disimpan di draft (pilih ulang); pilihan checklist Strategy di dalam form dipulihkan hanya bila berupa kolom form biasa.
- File baru: `undo-recovery.js`, `undo-recovery.css`. Hook kecil di `index.html` (hapus/simpan/kalender/import/diary) dan `strategy-library.js` (hapus strategi). Tidak ada perubahan pada hitungan statistik.
- `sw.js`: cache v16-42-0-undo-recovery.
