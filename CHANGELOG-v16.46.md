# v16.46 — Spatial Layered Interface
**Konten disusun dalam lapisan yang punya kedalaman, bukan kumpulan kotak datar**

**Lima lapisan**
- **L1 Panel sekunder** (kartu statistik, KPI, tile Beranda, alat bantu): rendah, bayangan kontak tipis.
- **L2 Panel utama** (grafik ekuitas, hero Beranda, kalender, hero Statistik): lebih dominan — tepi atas lebih terang, bayangan tiga tingkat, isi padat agar angka terbaca.
- **L3 Mengambang** (header, nav, dock, sheet Menu, Filter & Sort, menu Ekspor, tombol tambah): kaca dengan bayangan jatuh jelas. Saat halaman digulir, kontrol atas terangkat lebih tinggi.
- **L4 Lapisan atas** (detail trade, modal): scrim menggelapkan; halaman di bawahnya mundur sedikit (skala 0,992, tanpa rotasi). Detail trade masuk dari tepi layar (kanan di desktop, bawah di HP).

**Terukur**
- Bayangan dibangun dari lapisan kontak + sekitar, bukan satu bayangan besar. Cahaya selalu dari kiri atas.
- Transparansi hanya di L3/L4 dan mengikuti slider "Transparansi kaca". Panel isi tidak memakai blur.
- Tidak ada rotate/skew/perspective pada elemen berisi teks. Angka memakai tabular-nums dan tidak ditransformasi.
- Mati otomatis/menyesuaikan: reduced motion, reduced transparency, tanpa backdrop-filter, forced colors, cetak. Di HP bayangan jatuh jauh dikurangi.

**Teknis**
- File baru: `spatial-layers.css` (dimuat terakhir), `spatial-layers.js` (hanya menambah `body.sl-scrolled`). `index.html`: dua baris tautan. Tidak ada perubahan data, statistik, atau logika filter.
- Halaman mundur memakai `transform` pada `#app > main`; dikecualikan saat bottom sheet filter terbuka (sheet itu `position: fixed` di dalam `<main>`).
- Untuk membatalkan: hapus dua tautan itu dari `index.html`.
- `sw.js`: cache v16-46-0-spatial-layers.
