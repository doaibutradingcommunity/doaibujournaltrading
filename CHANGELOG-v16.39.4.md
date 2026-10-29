# v16.39.4 — Kalender: tidak lagi nge-blank hitam saat ganti tanggal
- Akar masalah: `#calendar-section.enter` memakai animasi `fadeUp` dengan fill-mode `both`, sehingga `transform: translateY(0)` menempel permanen. Transform di leluhur membuat `position: fixed` mengacu ke seluruh section kalender, bukan layar: overlay gelap menjadi layer setinggi seluruh halaman yang dianimasikan (GPU HP menggambarnya sepotong-sepotong -> kotak hitam, angka sel hilang), dan panel detail bisa berpusat di luar layar.
- Perbaikan: `#calendar-section.enter { animation-fill-mode: backwards }` — fade-in awal tetap ada, transform dilepas setelah selesai. Overlay kini tepat seukuran layar.
- Skrim gelap dianimasikan lewat opacity (`::before`) bukan background-color; sedikit lebih terang (.56).
- Ketuk tanggal/bintang: tanpa filter brightness, ripple, dan tap-highlight yang memicu gambar ulang sel.
- Hanya tampilan/interaksi; hitungan P/L dan data tidak diubah.
