# v16.44 — Mobile-First Floating UI
**Pengalaman satu tangan di HP (layar ≤ 640px; desktop tidak berubah)**

**Navigasi bawah mengambang**
- Dock 5 slot + sheet Menu yang sudah ada (v17) tetap dipakai dan kini ikut turun saat sheet Filter terbuka.

**Tombol tambah trade mudah dijangkau**
- Tombol **+** dipindah ke zona jempol (kanan bawah, tepat di atas dock), ukuran 56px.
- **Menyingkir saat menggulir turun**, muncul lagi saat menggulir naik, saat berhenti ±1,4 detik, di puncak halaman, dan di dasar halaman.
- Otomatis tersembunyi saat keyboard muncul, sheet Menu/Filter terbuka, panel detail trade terbuka, atau form journal terbuka — tidak menutupi tombol Simpan.

**Filter sebagai bottom sheet**
- **Filter & Sort** kini terbuka sebagai bottom sheet: scrim, handle geser-ke-bawah untuk menutup, ×, `Esc`, dan klik latar. Isi dapat digulir; tombol aksi menempel di bawah.
- Footer: **Reset** dan **Lihat n journal** (jumlah hasil ikut berubah langsung saat filter diubah).
- Kolom 2 baris, tinggi sentuh ≥ 46px, font 16px (iOS tidak memperbesar layar saat fokus).
- Tombol Filter & Sort menampilkan **lencana jumlah filter lanjutan** yang aktif (semua ukuran layar).
- Fokus dijebak di dalam sheet; saat ditutup, fokus kembali ke tombol Filter.
- Panel dipindah ke `<body>` hanya di HP (agar `position: fixed` tidak terikat ke seksi beranimasi); di desktop tetap inline seperti sebelumnya.

**Kartu statistik ringkas & dapat diperluas**
- Dashboard & Statistik: **4 kartu pertama** tampil, sisanya di balik **Lihat n lainnya / Ringkas**.
- **Ketuk kartu** untuk menampilkan keterangan (baris kecil di bawah angka); panah menunjukkan keadaan. Dapat dioperasikan dengan keyboard (Enter/Spasi, `role="button"`, `aria-expanded`).
- Keadaan buka/tutup bertahan saat dashboard dirender ulang.

**Lain-lain**
- Teks baru tersedia dalam ID/EN/MS/ES. Hormati `prefers-reduced-motion` dan `prefers-reduced-transparency`.
- File baru: `mobile-float.js`, `mobile-float.css`. Perubahan di `index.html` hanya dua baris (tautan CSS + script). Tidak ada perubahan pada hitungan statistik, data, atau logika filter.
- `sw.js`: cache v16-44-0-mobile-float.
