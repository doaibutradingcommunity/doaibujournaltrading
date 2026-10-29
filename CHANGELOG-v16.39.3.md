# v16.39.3 — Kalender: animasi tidak lagi patah-patah
- Penyebab: kalender digambar ulang total (grid dikosongkan lalu dibangun lagi) dan panel detail ditulis ulang setiap ada snapshot Firestore, event `journals-loaded`, atau perubahan mata uang, sehingga animasi masuk panel terputar berulang dan sel kalender berkedip.
- `renderCalendar`: hasil dibandingkan dengan render sebelumnya; bila identik DOM tidak disentuh. Penanda tanggal terpilih diterapkan lewat class, bukan ikut dibangun ulang.
- `showDayDetail`: refresh saat panel sudah terbuka tidak memutar ulang animasi dan tidak menulis ulang bila isinya sama.
- Buka/tutup panel: backdrop fade-in, sheet naik halus, dan ada fade-out saat ditutup (sebelumnya langsung hilang). Hormati `prefers-reduced-motion`.
- Sheet tidak lagi ikut efek global (blur, hover, mengecil saat ditekan) yang menimbulkan getaran.
- Hanya tampilan/interaksi; hitungan P/L dan data tidak diubah.
