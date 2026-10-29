# v16.58 — Riwayat Journal seperti buku: 1 tanggal = 1 halaman, isinya susunan trade

- Sebelumnya semua trade di tanggal yang sama digabung jadi satu (P/L dijumlah, catatan/tag/chart dilebur), sehingga memperbaiki satu trade berarti membuka seluruh hari.
- Sekarang setiap tanggal adalah satu "halaman" berisi **daftar trade** (Trade 1, Trade 2, ...). Menambah journal baru di tanggal yang sama **menambah trade berikutnya**, tidak menimpa dan tidak menggabung.
- **Edit** hanya mengubah trade yang dipilih; trade lain di hari itu tidak tersentuh. **Hapus** juga per trade (halaman tanggal baru hilang kalau trade terakhirnya dihapus). Tetap bisa di-Urungkan.
- Riwayat Journal dikelompokkan per tanggal: header tanggal (total P/L hari itu + tombol "+ Trade") lalu susunan trade-nya. Filter, pencarian, Profit/Loss/BE, export, dan tampilan Stack kini bekerja per trade.
- Detail hari di Kalender menampilkan susunan trade dengan tombol Edit per trade. Tombol "Edit Data" menjadi "+ Tambah Trade" (tidak lagi menimpa data hari itu).
- Halaman yang berisi >1 trade dan dibuka dari tempat lain (Beranda, Stack, dll) menampilkan pemilih "Pilih trade yang mau diedit/dihapus".
- Mengubah tanggal saat edit memindahkan trade itu ke halaman tanggal baru.
- Import CSV broker: setiap trade menjadi satu entri sendiri (bisa dibuka dan diedit satu-satu). Menghapus trade hasil import melepas ID-nya sehingga bisa diimport ulang.
- Data lama aman: dokumen lama dibaca sebagai satu trade ("Gabungan" bila berisi >1 trade) dan baru dipecah saat kamu menambah trade di tanggal itu. Total harian (P/L, trades, win/BE/loss, pair, tag, dst.) selalu dihitung ulang dari daftar trade, jadi Kalender, Statistik, AI Coach, dll tetap konsisten.
- File baru: `journal-entries.js`. Versi cache service worker dinaikkan.
