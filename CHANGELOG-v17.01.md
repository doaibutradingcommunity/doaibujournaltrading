# v17.01 — Touch-First Chart Exploration

Di atas v17.00. Tidak ada perubahan data, Firebase, autentikasi, V16Stats, atau skema journal. Semua angka tetap dari perhitungan lama; yang berubah hanya cara grafik digambar dan disentuh.

## 1. Grafik terasa seperti alat, bukan gambar
Berlaku untuk grafik **Equity (Performa Utama)** dan **Drawdown**.
- **Crosshair mengikuti jari.** Sentuh = langsung memilih titik; geser horizontal = garis bidik, titik, dan halo meluncur mengikuti jari. Geser vertikal tetap men-scroll halaman (`touch-action: pan-y`), jadi grafik tidak "menjebak" jempol.
- **Area sentuh lebar.** Seluruh lebar grafik (termasuk area sumbu) dan tinggi penuh bisa disentuh; jari tidak perlu tepat di garis. Di layar sentuh grafik minimal 168 px tinggi.
- **Tooltip dekat titik**, naik 30 px di atas jari pada layar sentuh supaya tidak tertutup; bila tidak muat di atas, pindah ke samping titik. Angka tidak pernah turun baris.
- **Ringkasan periode ikut seleksi** (kartu di bawah grafik): Periode, P/L periode, Hari trading, Hari profit (jumlah dan persen). Tanpa seleksi = seluruh rentang yang dipilih (7H/30H/90H/1T/Semua). Saat memilih titik = dari awal rentang sampai titik itu. Angka besar di atas grafik juga ikut titik yang disentuh.
- Setelah jari diangkat, pilihan bertahan 4 detik lalu kembali ke ringkasan rentang. Sentuh di luar grafik menutupnya lebih cepat. Mouse: hover. Keyboard: ←/→/Home/End, Esc.
- Getar halus (2 ms) tiap pindah titik di perangkat yang mendukung (Android; iOS Safari tidak menyediakan).

## 2. Kurva halus, tidak patah-patah
- Kurva memakai **monotone cubic** (Fritsch–Butland): mulus, tetapi **tidak pernah melampaui puncak atau lembah data**, jadi tidak ada puncak/lembah palsu di equity. Titik data tetap berada di jalur garis.
- **Mengganti gaya "anak tangga"** dari `identity.js` (v17.00 dan sebelumnya): `stepify` kini memakai kurva halus bila `TouchChart` ada; sparkline Beranda ikut halus. Plugin Chart.js (`doaIdentity`) memakai `monotone` + `tension .4` alih-alih `stepped:'after'`. Arsiran area dan penanda ujung (lancet) **tidak diubah**.
- Garis diberi cahaya tipis (`drop-shadow`).

## 3. Cahaya di belakang angka P/L
- Angka utama (`.pf-val`) punya **halo radial di belakangnya**: hijau saat profit, merah saat loss, tidak ada saat nol. Kekuatannya mengikuti seberapa jauh angka dari nol dalam rentang itu (0–1, `--tc-i`). Saat menggeser jari, warna dan kekuatan halo berubah mengikuti titik yang disentuh.
- Teks angka juga diberi `text-shadow` lembut; angka besar lain (`.de-fig .ed-fig .hm-pl .tcc-big .mag-big .stx-big .sp-net`) dan angka di tooltip mendapat cahaya lebih halus bila sudah berwarna profit/loss.
- Mode terang: cahaya lebih redup dan lebih lebar. `prefers-contrast: more`: halo dimatikan. `prefers-reduced-motion`: tanpa transisi.
- Catatan: ini cahaya **lokal di angka**, bukan ambient latar; aturan v16.81 (cahaya ambient tidak boleh mengikuti P/L) tetap utuh, `ambient_guard.py` lolos.

## Berkas
Baru: `touch-chart.js`, `touch-chart.css`, `CHANGELOG-v17.01.md`.
Diubah: `index.html` (link CSS/JS; `drawEquity`, `drawDD`, `eqHead` memakai `TouchChart`), `identity.js` (`stepify`, plugin Chart.js), `sw.js` (cache `v17-01-0-touch-chart`, dua berkas baru).
`touch-chart.js` dimuat **sebelum** `identity.js`.

## Membatalkan
Hapus `<script src="touch-chart.js">` dan `<link href="touch-chart.css">` dari `index.html`: `identity.js` kembali ke anak tangga. Catatan: `drawEquity`/`drawDD` versi ini memakai `TouchChart` untuk interaksi, jadi tanpa modul itu grafik tampil tanpa tooltip. Untuk pembatalan penuh, kembalikan `index.html` dari v17.00.

## Pengujian
Chromium, CSS dan JS asli proyek, Firebase diganti tiruan (login palsu + 95 hari data trade tiruan, termasuk rentetan loss), layar 390×844 sentuh, tema gelap dan terang:
- sentuh + geser (CDP touch): tooltip, crosshair, kepala angka, ringkasan periode, dan warna halo berubah; setelah jari diangkat kembali ke ringkasan rentang dalam 4 dtk;
- geser vertikal men-scroll halaman, tidak memilih titik;
- ganti rentang (30H) tidak menggandakan kartu ringkasan;
- grafik Drawdown disentuh; hover/leave mouse di desktop; tanpa error konsol; kurva berisi segmen `C` (halus);
- `scripts/ambient_guard.py` lolos.
**Belum diuji:** perangkat sentuh fisik (iPhone/Android), getar, VoiceOver/TalkBack; plugin Chart.js (grafik P/L di tab Statistik) karena Chart.js dari CDN tidak bisa dimuat di lingkungan uji, hanya dua properti dataset yang diubah; aplikasi penuh dengan login/Firestore nyata. Buka aplikasi dua kali setelah mengganti file (service worker baru).
