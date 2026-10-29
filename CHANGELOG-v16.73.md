# v16.73 — Tipografi & ritme

Satu bahasa tipografi untuk semua halaman (Beranda, Journal, Kalender, Statistik, Strategy, Coach, Wrapped, Galeri, Pengaturan, Pre-trade, login/auth): satu font, satu skala ukuran, satu skala jarak, satu skala radius.

## Font
- **Inter** (variabel 400–700, optical size otomatis) untuk semua teks dan angka. Sebelumnya tiga keluarga bercampur: SF/Inter di aplikasi, serif Newsreader di angka Beranda, font sistem di halaman pre-trade dan auth. Newsreader dihapus.
- Satu token `--font-family`; semua tumpukan font eksplisit di CSS/JS diganti ke token itu (termasuk ekspor gambar Wrapped).

## Ukuran (skala tunggal)
12 caption · 13 label · 15 isi · 17 sub-judul · 20/22 judul · 28 judul besar · 34+ angka hero. Sebelumnya ±30 ukuran berbeda (8,5 sampai 34 px, banyak selisih 0,5 px). Tidak ada teks di bawah 12 px, kecuali angka dan jumlah trade di dalam sel kalender 7 kolom pada layar < 640 px (11 dan 10 px), dan label tab bawah di layar 351–420 px (11 px). Input 16 px di layar sentuh agar iOS tidak memperbesar halaman.

## Bobot
400 isi · 500 label · 600 judul, angka, tombol. 700 hanya untuk tekanan khusus; 800/900 dihapus. Angka besar dan teks kecil yang tadinya Bold kini Semibold: lebih tenang, kontras antarperan lebih jelas.

## Angka finansial
`tabular-nums` + `lining-nums` di semua elemen angka (P/L, KPI, kalender, tabel, nilai berwarna hijau/merah), sebelumnya hanya di ±60 selektor; teks biasa dan judul memakai lebar proporsional karena `tnum` melebarkan tanda hubung ("Rata-rata"). Angka hero yang berdiri sendiri juga proporsional supaya tanda minus/plus tidak berjarak lebar. Angka hero memakai keluarga font yang sama dengan teks, semibold, tracking rapat.

## Label
52 aturan huruf kapital penuh diubah ke sentence case; 21 jarak huruf lebar (hingga .28em) diturunkan ke ≤ .01em. Kelas Tailwind `uppercase`, `tracking-wide/wider` dan `text-[10px]/[11px]` di markup ikut diganti.

## Jarak dan radius
- ±1.140 nilai `padding` / `margin` / `gap` dirapikan ke kelipatan 4 px. Nilai pasangan (mis. margin negatif dan padding induknya) dipetakan oleh fungsi yang sama, jadi tetap seimbang.
- ±245 `border-radius` dipetakan ke 8 · 12 · 16 · 20 · 24 · 28 · pill (sebelumnya 7, 9, 10, 11, 13, 14, 15, 17, 18, 21, 22, 26, 30, 32, 34 px bercampur).

## File
Baru: `type-system.css` (token + aturan peran, dimuat terakhir), `CHANGELOG-v16.73.md`.
Diubah: `index.html` (link font, `<link type-system.css>`), `ds.css`, `editorial.css`, 36 file CSS/JS lainnya (normalisasi nilai), `pretrade.html`, `auth-action.html`, `sw.js` (cache `v16-73-0-typography`).

## Membatalkan
Hapus `<link href="type-system.css">` untuk melepas token dan aturan peran. Normalisasi nilai (ukuran, jarak, radius) ada di file asal; untuk kembali sepenuhnya pakai v16.72.

## Catatan
- Diuji di Chromium headless (Firebase di-stub). Belum diuji di Safari/Android fisik.
- Angka Beranda kini sans (Inter), bukan serif. Jika serif editorial ingin dipertahankan hanya untuk angka hero, cukup ubah `--ed-serif` dan `.ed-fig` di `editorial.css`; sisanya tidak terpengaruh.
