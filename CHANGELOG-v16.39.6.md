# v16.39.6 — Pre-Trade: pasang ke beranda HP/tablet
- Tombol baru "📲 Pasang ke beranda" di kartu Pre-Trade Checklist (aplikasi utama) membuka `pretrade.html?install=1`.
- `pretrade.html`: kartu panduan pemasangan sesuai perangkat (Android/Chrome, iPhone/iPad Safari, desktop). Di Android/Chrome tombol pasang otomatis muncul bila browser mengizinkan. Panduan disembunyikan bila sudah terpasang atau ditutup, dan selalu tampil lagi lewat `?install=1`.
- Ikon Pre-Trade terpasang sebagai app mandiri (layar penuh, buka instan, offline), terpisah dari ikon aplikasi utama.
- Catatan: ini ikon/shortcut PWA, bukan widget native. Widget interaktif asli (Android/iOS) memerlukan aplikasi native.
- `sw.js`: cache v16-39-6-pretrade-beranda.
