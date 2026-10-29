# v16.98 — Glassy Dashboard · emas lembut

Visual-only, di atas v16.97. Tidak ada markup, JS, navigasi, autentikasi, Firebase, atau data yang diubah. Satu berkas diperbarui: `glassy-v4.css`.

## Masalah yang diperbaiki
1. **Emas terlalu terang.** Tombol utama ("Isi sekarang", "Tulis journal pertamamu"), tombol "Journal Baru" (FAB), dan teks tombol sekunder memakai emas penuh (#f6dc86 → #d9b43f) dengan pendar tebal. Kini memakai tiga token emas lembut dan pendar dikecilkan:
   - gelap: `--gv-g1/2/3` = #dcc47e / #c3a455 / #a2843a
   - terang: #d4ba78 / #b99a4c / #9a7d34
   - pendar bawah tombol: `--gv-glow` .28 (sebelumnya ±.75)
   - kilau kubah FAB dimatikan; tepi kartu & sorot atas tema gelap sedikit diturunkan.
2. **Kontras terlalu keras.** Teks utama tema gelap dari putih-krem terang ke krem lembut (`--tx` #e0d8c3, `--text-primary` .90, `--mu` #a8a08c, aksen `--g` #cdb46a).
3. **Ikon tab atas hampir tak terlihat.** Ikon adalah `::before` mask dengan opasitas .75 di atas warna label yang juga transparan. Kini label tab tidak aktif berwarna padat (`--sgt-label-off`), opasitas ikon penuh, dan garis ikon ditebalkan tipis (drop-shadow 0,45px).

## Hubungan dengan v16.97
`navigation-refinement-v16.97.css` (pemilih ×12, dimuat paling akhir) tetap memegang pil nav, tab aktif champagne, kabut header, dan dock HP. Bagian nav di `glassy-v4.css` dipangkas menjadi bentuk saja (radius pil, padding) supaya tidak ada dua sumber warna untuk elemen yang sama.

## Penyetelan cepat (blok TOKEN, `glassy-v4.css`)
`--gv-g1/2/3` emas · `--gv-glow` pendar · `--gv-fill-a/b` kekeruhan kaca · `--gv-blur` · `--gv-r` radius. Warna teks ada di bagian 10.

## Cache
Service worker `v16-98-0-glassy-soft-gold`. Buka aplikasi dua kali setelah mengganti file.

## Pengujian
Render Chromium 141 dari CSS asli v16.97 (tema gelap & terang, 1280px dan 390px) dengan sampel Beranda editorial. Kontras terukur: teks utama ≥ 9,5:1, sekunder ≥ 5,2:1. `ambient_guard.py`, `glass_contrast.py`, `tier_contrast.py` berjalan lancar; `sw.js` valid.
**Belum diuji:** aplikasi penuh dengan login/data nyata, halaman selain Beranda, modal & form journal, Safari/iPhone fisik, font Outfit (uji offline memakai font cadangan).
