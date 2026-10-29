# v16.94 — Glassy Dashboard (gaya video referensi + liquid glass emas)

Lapisan tampilan saja: satu berkas CSS baru, `glassy-v4.css`, dimuat paling akhir. Tidak ada markup, JS, atau data yang diubah.

## Yang meniru video
| Video "Glassy Dashboard V4" | Di aplikasi |
|---|---|
| Latar ruang hangat yang di-blur (jendela, tanaman, lampu bulat, sofa) | Latar gradien murni (tanpa gambar, tanpa animasi): cahaya jendela kanan-atas, tanaman kiri, lampu bulat, sofa bawah. Terang = krem hangat; gelap = kayu-ambar |
| Kartu kaca frosted besar, sudut sangat bulat | Radius 28px (hero 34px, HP 24/28px); blur 30px, saturasi 150%; tepi putih tipis + sorot atas + pantulan emas kanan-bawah |
| Pil navigasi, item aktif pil hitam | Tema terang: pil gelap bertepi emas dengan teks emas. Tema gelap: pil emas |
| Tombol pil kuning | Tombol utama = pil emas; tombol sekunder = pil gelap (terang) / pil kaca (gelap) |
| Judul ringan & besar, angka tegas | Font Outfit (cadangan Inter), judul 500, angka 500 |
| Kartu gelap berisi daftar centang kuning ("CRM Deal Tasks") | Kartu **Trading Rhythm** menjadi panel gelap dengan centang emas (tema terang saja) |

## Yang tetap
Tiga tingkat material (`glass-tiers.css`), arah cahaya 128°, token emas, slider "Transparansi kaca" (`--lg`), tema gelap/terang, dock bawah HP, semua logika dan data.
Kartu data (KPI/tabel/statistik) yang di v16.89 dibuat padat kini frosted: token `--gt3-*` diarahkan ke kaca, jadi formulir tetap lebih padat (alpha .80–.92) agar nyaman diisi.

## Penyetelan cepat (blok TOKEN di `glassy-v4.css`)
`--gv-r` radius · `--gv-blur` / `--gv-sat` blur & saturasi · `--gv-fill-a/b` kekeruhan kaca · `--gv-scrim` warna pita header. Latar ada di bagian 2.

## Aksesibilitas & fallback
`prefers-reduced-transparency`, `html.mo-lite`, `data-ui-effects="low"`, dan browser tanpa `backdrop-filter`: kartu jadi padat hangat (bentuk, radius, emas tetap). Teks sekunder tema terang digelapkan (`--mu: #5a564b`).
Kontras terukur dari render (Chromium 141): teks utama 12:1, teks sekunder ≥ 5,9:1 (terang) dan ≥ 4,9:1 (gelap), label nav ≥ 7:1.

## Perubahan pada berkas lama
- `index.html`: satu `<link href="glassy-v4.css">` setelah `trading-rhythm.css`.
- `sw.js`: cache `v16-94-0-glassy-dashboard`, `glassy-v4.css` didaftarkan. Font Outfit ikut tersimpan lewat `fonts.googleapis.com` yang sudah ada di daftar host.

## Membatalkan
Hapus `<link href="glassy-v4.css">`. Tampilan kembali persis v16.93.

## Catatan pengujian
Diuji di Chromium headless dengan CSS asli: Beranda (hero, statistik, tile, kartu terakhir, Rhythm), header + nav desktop, kartu `.stat-card`/`.glass` generik; gelap & terang; desktop 1280 dan HP 390. `ambient_guard.py` lulus, kurung CSS seimbang, `sw.js` valid.
**Belum diuji:** aplikasi penuh dengan login Firebase dan data nyata, halaman Kalender/Statistik/Strategy/Coach/Galeri/Diary, modal & form journal, Safari/iPhone fisik (`backdrop-filter`, safe area), dan font Outfit (uji offline memakai font cadangan). Jika tampilan tak berubah, buka ulang aplikasi dua kali (service worker baru).
