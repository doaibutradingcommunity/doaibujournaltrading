# v16.63 — Navigasi Adaptive Glass

Peningkatan tipis pada navigasi yang sudah ada (dock bawah v17 + Adaptive Header v16.41). Tanpa markup baru, tanpa sistem navigasi baru.

**Sudah ada dan tidak diubah:** dock bawah mengambang di HP, header yang mengecil saat menggulir (HP ±71→56px), dock turun saat keyboard muncul, navigasi desktop 4 halaman + "Lainnya".

**Ditambah:**
- **Indikator emas:** di HP, cahaya emas lembut meluncur di belakang tab aktif dan garis emas di tepi atas dibuat sedikit lebih jelas (memakai elemen `.npv-ind` yang sudah ada). Di desktop/tablet, garis emas kecil muncul di bawah halaman aktif.
- **Safe area:** `viewport-fit=cover` ditambahkan ke meta viewport agar `env(safe-area-inset-*)` yang sudah dipakai di dock, header, dan sheet benar-benar bernilai di perangkat dengan gesture bar / notch (sebelumnya selalu 0). Ruang bawah untuk fokus keyboard (`scroll-padding-bottom`) agar kolom yang difokus tidak tertutup dock. Landscape: header & konten tidak tertutup notch.
- **Target sentuh:** tablet/layar sentuh ≥641px kini 44px (tab navigasi, ikon header, bahasa, item "Lainnya"). HP sudah ≥44px. Desktop dengan mouse tidak diubah.
- **Android:** tombol Back menutup sheet Menu (sebelumnya keluar dari halaman). Tap tanpa kilatan dan tanpa jeda 300ms pada tombol navigasi/header.
- **Mode hemat:** HP yang sudah ditandai `html.mo-lite` oleh motion-system.js (RAM ≤2 GB, CPU ≤3 inti, Data Saver) kini juga memakai dock, sheet, dan header tanpa blur (warna sama). Tidak ada detektor baru.

**File:** baru `adaptive-nav.css`, `adaptive-nav.js`. Diubah: `index.html` (meta viewport, 1 link CSS, 1 script), `sw.js` (cache v16-63-0-adaptive-nav).
