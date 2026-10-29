# v16.57 — Hapus kotak persegi di hero Beranda

- Penyebab: `.hm-hero::after` lama (260×260 px + blur) bertabrakan dengan rim kaca `liquid-depth.css` (`inset:0`), sehingga muncul bingkai persegi samar di pojok kiri-atas kartu "Selamat pagi".
- Perbaikan: rim kaca kini mereset `width/height/filter` sehingga hanya menjadi bingkai tipis seukuran kartu.
- Versi cache service worker dinaikkan ke `v16-57-0-hero-fix`.
