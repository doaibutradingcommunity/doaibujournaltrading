# v16.65 — Adaptive Navigation

Penyempurnaan tipis di atas navigasi v16.63 (dock bawah, header adaptif, nav desktop 4 halaman + "Lainnya"). Tidak ada markup atau sistem navigasi baru.

**HP**
- **Dock memadat saat menggulir turun:** tinggi 64 → 52px, label hanya tersisa pada halaman aktif. Kembali penuh saat menggulir naik, di puncak/dasar halaman, ganti halaman, atau menyentuh dock.
- **Tombol tambah journal tidak lagi hilang saat menggulir.** Sebelumnya disembunyikan oleh dua sistem lama (`mf-fab-hide` dan `px-hide`), sehingga di tengah halaman panjang tombolnya tak bisa dijangkau. Kini ia "beristirahat" (lebih kecil dan tenang) dan tetap bisa diketuk, lalu ikut turun mengikuti dock agar jaraknya tetap. Tetap tersembunyi saat keyboard, sheet Menu, filter, atau form terbuka.

**Desktop / tablet**
- Tombol tambah melebar menjadi pil berlabel ("Journal Baru" / "New Journal" / "Jurnal Baru" / "Nuevo Diario") saat disorot atau fokus keyboard; label mengikuti bahasa aplikasi.
- Pintasan keyboard **N** membuka journal baru (tidak aktif saat mengetik, saat form/modal terbuka, di HP, atau sebelum login). `aria-keyshortcuts="N"` terpasang.
- Tombol tidak lagi hilang saat menggulir (keadaan istirahat yang sama).

**Aksesibilitas & performa:** tahan `prefers-reduced-motion` (tanpa transisi); hanya `transform`, `opacity`, dan tinggi dock yang beranimasi; mode hemat (`html.mo-lite`) tidak berubah.

**File:** diubah `adaptive-nav.css`, `adaptive-nav.js`, `sw.js` (cache v16-65-0-adaptive-nav); baru `CHANGELOG-v16.65.md`. `index.html` tidak diubah.
