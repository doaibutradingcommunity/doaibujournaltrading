# v16.74 — Optical Glass & Edge Refraction

Kaca tidak sekadar transparan dan blur: tepinya menangkap cahaya. Satu sumber cahaya (kiri-atas), dua lapis garis tepi yang sangat halus, dan pantulan champagne gold hanya di area tertentu. Lapisan tampilan saja; data, statistik, dan logika tidak diubah.

## Masalah yang diperbaiki
Kartu data (`hm-card`, `hm-tile`, `stat-card`, `glass.ms-card`, dll.) punya outline abu-putih rata di keempat sisi, hasil dari dua sumber yang menumpuk: `border: 1px solid var(--di-border)` dan cincin `inset 0 0 0 1px` putih dari `--amb-solid-edge`. Hasilnya tebal dan datar, tanpa arah cahaya.

## Model tepi
- **Atas paling terang**, kiri sedang, kanan redup, **bawah gelap** (bukan putih).
- **Border dua lapis, masing-masing 1px:** lapis luar = sabit di luar tepi (`box-shadow` offset, nol pergeseran layout), lapis dalam = garis `inset`. Di sudut membulat sabit menipis sendiri, jadi tidak ada sambungan keras.
- **Refraksi:** cahaya lunak tertahan tepat di bawah tepi atas (`inset … -20px`), dan bayang tipis di atas tepi bawah.
- **Tidak ada outline putih tebal rata.** Border 1px lama pada panel dibuat transparan (hanya `border-color`; ukuran tidak berubah).

## Pantulan champagne gold, hanya di area tertentu
- **Hero / panel utama** (hero Beranda, ekuitas, kalender, statistik): garis atas champagne hanya di sisi kiri lalu memudar (sebelumnya garis emas membentang 6%→94%); sisi kanan putih redup; garis kiri champagne turun dari sudut lalu hilang; sorot lunak di sudut kiri-atas. Kekuatan mengikuti `--amb-gold`, jadi halaman calm tetap netral seperti v16.70.
- **Kaca melayang** (sheet, menu, toast, filter, modal): garis atas sisi kiri, tangkapan tepi kiri, sorot sudut, dan gradasi atas-terang → bawah-gelap. Ada lantai kekuatan agar identitas tetap ada di halaman calm.
- **Kartu data padat:** sengaja tanpa emas, hanya tepi. Angka tetap yang menonjol (keputusan v16.66 dipertahankan).
- Warna champagne bergeser sedikit mengikuti nada hari (`--sg-c1`) bila browser mendukung `color-mix()`.
- Hover `hm-tile`: pantulan hangat di tepi atas saja, bukan cincin emas rata.

## Cara kerja
Aditif, dimuat paling akhir (setelah `type-system.css`). Tidak ada aturan lama yang ditulis ulang:
1. mengganti **token** tepi yang sudah dipakai lapisan lama: `--amb-solid-edge`, `--amb-rim` (ambient-glass), `--sl-rim/-hi`, `--sl-lit/-hi` (spatial-layers), `--di-border`, `--di-highlight`;
2. menetralkan `border-color` panel;
3. menambah pantulan lewat `background-image` (warna dasar dan alpha dari slider transparansi `--lg` tetap berlaku).

Dock, pil header, dan panel detail (`.jd-panel`) tidak diberi gradasi baru karena isiannya dipegang aturan lain; tepinya ikut model cahaya lewat token.

## Hormat pada perangkat dan preferensi
- Tema terang: atas putih murni, bawah abu hangat, champagne lebih dalam agar terbaca.
- `prefers-contrast: more`: tepi lebih tegas, tetap berarah.
- `forced-colors`: border sistem (`CanvasText`) kembali.
- `prefers-reduced-transparency` dan HP hemat (`mo-lite`): isian padat dari lapisan lama tetap menang; hanya gradasi statis, tanpa blur tambahan, tanpa animasi baru.
- Hanya `body.authed`. Landing dan login tidak disentuh.

## File
Baru: `optical-glass.css`, `CHANGELOG-v16.74.md`.
Diubah: `index.html` (satu `<link>` setelah `type-system.css`), `sw.js` (cache `v16-74-0-optical-glass`, file baru masuk shell).

## Membatalkan
Hapus `<link href="optical-glass.css">`. Tampilan kembali persis v16.73.

## Catatan
- Diuji di Chromium headless pada halaman uji yang memuat tumpukan CSS asli: panel padat, hero, dan kaca melayang; tema gelap dan terang; mode glow, calm, analytic. Belum diuji di Safari/Android fisik dan belum pada halaman aplikasi penuh (Firebase tidak tersedia di lingkungan uji).
- Header (`app-header`) dan dock hanya berubah lewat token tepi; garis emas bawah header dari v16.70 tidak diubah.
