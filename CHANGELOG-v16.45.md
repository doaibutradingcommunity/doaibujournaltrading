# v16.45 — Menu, Pengaturan & Navigasi
**Menu dikelompokkan menurut fungsi, navigasi HP lebih ringkas, dan preferensi tampilan disatukan di Pengaturan**

**Menu bergrup**
- Lima grup: **Ringkasan** (Beranda, Dashboard, Kalender), **Jurnal** (Diary & Review, Galeri), **Analisis** (Statistik, Review Bulanan, Trading Wrapped), **Strategi** (Strategy Playbook, AI Coach), **Lainnya** (Pengaturan, Tentang Kami).
- HP: dock 5 slot tidak berubah. Sheet **Menu** kini berisi kartu 2 kolom per grup (judul grup + 8 tujuan) dan **Keluar** di bawah; tidak lagi daftar panjang bercampur tema/bahasa. **Pengaturan** kini ada di sheet Menu; tombol Menu pada dock menyala saat halaman Pengaturan terbuka.
- Desktop: tab diurutkan sesuai grup dengan pemisah tipis; tiap grup punya `role="group"` + label (ikut bahasa).

**Satu tempat untuk preferensi**
- Halaman **Pengaturan** dibagi tiga kartu:
  - **Tampilan** — Tema (Gelap/Terang), Bahasa, Ukuran teks, Transparansi kaca.
  - **Akun & data** — Mata uang akun, Edit profil, Pengingat journal.
  - **Aplikasi & sesi** — Pasang aplikasi (muncul hanya bila bisa dipasang), Keluar.
- Tombol tema, bahasa, pasang, dan keluar disembunyikan dari header (semua ukuran layar); header kini hanya profil, pengingat, dan pengaturan. Kontrol lama tidak dihapus: Pengaturan hanya meneruskan klik ke sana, jadi logika tema/bahasa/pasang/keluar tidak berubah.
- Kartu **Ukuran teks** (disuntik `premium.js` sebagai kartu terpisah) dipindah ke kartu Tampilan, dan kini ikut berganti bahasa (sebelumnya tetap seperti saat dibuat).
- Subjudul Pengaturan diperbarui; teks baru tersedia dalam ID/EN/MS/ES.

**Teknis**
- File baru: `menu-settings.js`, `menu-settings.css`. `index.html`: kamus + grup + sheet pada skrip nav v17 (mengekspos `window.DoaNav`), markup halaman Pengaturan, dan dua baris tautan CSS/JS. Tidak ada perubahan pada data, statistik, atau logika filter.
- Untuk mengembalikan tema/bahasa/keluar ke header: hapus blok "Header: preferensi tinggal di Pengaturan" di `menu-settings.css`.
- `sw.js`: cache v16-45-0-menu-settings.
