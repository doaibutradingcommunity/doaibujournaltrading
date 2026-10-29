# v16.41 — Adaptive Header
- Header **mengecil saat menggulir turun** dan **membesar lagi saat menggulir naik**, kembali ke atas halaman, atau saat Tab keyboard masuk ke header.
- Tetap terlihat saat mengecil: foto + nama profil, lonceng pengingat (titik merah), tema, pengaturan, dan navigasi (desktop). Menyingkir sementara: teks "Edit profil", bahasa, logout, pasang aplikasi, subjudul brand.
- Isi halaman tidak melompat: selisih tinggi header diukur otomatis dan dikompensasi lewat margin.
- Hormati `prefers-reduced-motion`. Di HP, bar navigasi bawah tidak berubah.
- File baru: `adaptive-header.css`, `adaptive-header.js` (satu kelas `is-compact` pada `header.app-header`). Tidak ada perubahan pada logika journal/statistik.
- `sw.js`: cache v16-41-0-adaptive-header.
