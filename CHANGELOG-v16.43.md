# v16.43 — Trade Journal UX
**Baris lebih mudah dipindai**
- Riwayat Journal kini berupa baris ringkas: tanggal, pair, arah, jumlah trade + W/BE/L, sesi, penanda (catatan, jumlah chart, setup pertama), status, dan P/L. Catatan panjang, chart, dan ringkasan trade tidak lagi memanjangkan daftar.
- **Status Profit / Loss / BE** ditampilkan sebagai lencana dengan ikon + teks (bukan hanya warna): P/L > 0 = Profit, P/L < 0 = Loss, P/L 0 = BE. Aturan yang sama dipakai oleh baris, filter, dan panel detail.

**Pencarian & filter konsisten**
- Kolom **pencarian** selalu terlihat: mencari di pair, tanggal (angka maupun nama hari/bulan), sesi, arah, akun, setup/tag, emosi, catatan, dan nama strategi. Beberapa kata = semuanya harus cocok. `Esc` mengosongkan kolom.
- Segmen **Semua / Profit / Loss / BE** langsung di bawah pencarian.
- **Chip filter aktif** (dengan tombol ×) + "Reset semua". Pencarian dan status ikut dalam hitungan "x / y journal", Reset Filter, serta Export (CSV/Excel/PDF mengikuti hasil yang tampil).
- Kolom filter lanjutan memakai gaya kontrol yang sama dengan kolom lain di aplikasi.

**Detail trade dalam panel**
- Klik/ketuk baris (atau Enter/Spasi) membuka **panel detail**: drawer kanan di desktop, bottom sheet di HP. Isi: ringkasan trade, Market Outlook, strategi, setup, sesi, emosi, catatan, chart (tetap bisa di-zoom), tombol **Edit** dan **Hapus** (Hapus tetap memakai Urungkan v16.42).
- Navigasi ‹ › (atau tombol panah ← →) antar journal sesuai urutan/filter yang tampil; `Esc`, klik latar, atau × menutup; fokus kembali ke baris.
- Teks baru tersedia dalam ID/EN/MS/ES.
- File baru: `journal-ux.js`, `journal-ux.css`. Perubahan di `index.html`: toolbar, logika filter, `renderJournalCard` (kini ringkas) + `renderJournalDetail`. Tidak ada perubahan pada hitungan statistik atau data.
- `sw.js`: cache v16-43-0-journal-ux.
