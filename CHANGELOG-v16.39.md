# v16.39 — Pre-Trade cepat (checklist + rekap evaluasi tanpa buka aplikasi penuh)
- Halaman baru `pretrade.html`: checklist pre-trade (tombol besar, sekali ketuk) + rekap evaluasi hari sebelumnya (Fokus hari ini, Jangan diulang, Pertahankan, refleksi/journal/diary). Data sama dengan aplikasi utama (localStorage yang sama), jadi centang di sini langsung terbaca di aplikasi dan sebaliknya.
- Bisa dipasang sebagai ikon sendiri di layar utama (`pretrade.webmanifest`), dan muncul sebagai shortcut saat ikon aplikasi utama ditekan lama (Android).
- Terbuka instan dan jalan offline dari cache; bila online dan sudah login, rekap & daftar poin disegarkan dari Firestore (hanya baca).
- `sw.js`: cache v16-39-pretrade; navigasi ke pretrade.html tidak lagi menimpa cache index.html.
