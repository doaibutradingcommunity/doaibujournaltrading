# v16.49 — Transisi yang konsisten
**Satu bahasa gerak untuk pergantian halaman, panel, dan grafik; prioritas pada kelancaran nyata di perangkat.** Hanya tampilan; tidak ada perubahan data, statistik, atau navigasi.

**Masalah yang ditemukan**
- Durasi tersebar di 140–550 ms dari 8+ blok CSS yang saling menimpa (v16.36 motion, mi-, mdl-, vibe, spatial, mobile-float).
- Pindah halaman: kaskade per-anak (550 ms + delay) dan `filter: blur()` pada keyframe `di-view-in`.
- Grafik Chart.js digambar ulang dari nol (animasi 1 dtk) setiap render ulang: ganti tema, mata uang, snapshot data.
- Animasi tanpa akhir yang menggambar ulang tiap frame (`background-position`/`box-shadow` di puluhan judul emas, tombol emas, tombol tambah, blob ambient blur 70 px).
- Seluruh `<main>` diskala saat modal terbuka (raster ulang satu halaman penuh).

**Sistem baru**
| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--mo-fast` | 120 ms | tekan tombol |
| `--mo-base` | 200 ms | pindah halaman, akordeon, fade overlay |
| `--mo-panel` | 240 ms | sheet, modal, detail trade |
| `--mo-exit` | 160 ms | keluar (selalu lebih cepat dari masuk) |
Satu kurva `cubic-bezier(.22,.61,.36,1)`. Token lama (`--di-motion-*`, `--mi-*`, `--sl-ease`) dipetakan ke token ini.

- **Halaman**: satu fade + geser 6 px per seksi; kaskade anak dan blur dihapus.
- **Panel**: modal/sheet/detail trade memakai durasi sama; akordeon Ringkasan dan "Lihat n lainnya" kini masuk dengan fade 200 ms; chevron selaras. Efek mundur halaman (skala 0,992) dimatikan di layar sentuh.
- **Grafik**: kurva ekuitas 640→360 ms, kurva bulanan 1,1 dtk→0,6 dtk; Chart.js 360 ms hanya saat pertama muncul (render ulang langsung tampil), hover 120 ms, tanpa animasi bila data > 400 titik.
- **Hemat tenaga**: di layar sentuh, kilau emas/denyut/blob ambient dimatikan; di desktop dijeda saat menggulir. `html.mo-lite` otomatis untuk perangkat hemat (RAM ≤ 2 GB, CPU ≤ 3 inti, Data Saver): halaman hanya fade, grafik tanpa animasi.
- **Kurangi gerakan** (sistem) tetap dihormati di semua bagian baru.

**Teknis**
- File baru: `motion-system.css`, `motion-system.js` (dimuat terakhir). `index.html`: dua baris tautan. `sw.js`: cache `v16-49-0-motion-system`.
- Untuk membatalkan: hapus dua tautan itu dari `index.html`.
- Belum diuji di perangkat fisik; lihat catatan verifikasi di bawah pada serah terima.
