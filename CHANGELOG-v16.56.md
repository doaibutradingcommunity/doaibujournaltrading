# v16.56 — Perbaikan Riwayat Journal tidak bisa diklik

- Penyebab: `.jd-panel` (panel detail trade) memakai `display:flex` sehingga atribut `hidden` tidak berlaku. Setelah riwayat/detail dibuka lalu ditutup, lembar transparan tetap menutupi layar dan menelan semua sentuhan (filter Profit/Loss, tab, tombol).
- Perbaikan: `[hidden]` dipaksa `display:none`, panel/overlay yang tidak aktif diberi `pointer-events:none`, plus penutupan cadangan dan pembersihan `jd-lock` di `journal-ux.js`.
- Versi cache service worker dinaikkan agar perbaikan langsung termuat.
- Tidak mengubah data, autentikasi, atau logika trading.
