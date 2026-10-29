# v16.99 — DOA IBU Signature Identity ("Lengkung Doa")

Visual-only, di atas v16.98. Tidak ada perubahan data, Firebase, autentikasi, V16Stats, atau logika navigasi.
Teks angka (`textContent`) tidak pernah diubah; hanya dibungkus span.

## Prinsip
Identitas dibangun dari GAMBAR (garis, bentuk, pola), bukan efek. `identity.css` tidak memakai blur, backdrop-filter, atau glow, jadi tetap terbaca saat kaca dimatikan (`html.mo-lite`, Reduce Transparency). Di mode itu arsiran dan garis dipertebal.

## Isi
- **Monogram**: lengkung runcing + anak tangga naik + garis ganda. Di header (≥640px), hero Beranda (`.ed-top` mode editorial, `.hm-top` klasik), pemuat (menggambar dirinya sendiri), dan favicon SVG (`icons/mark.svg`). Segel lama tetap di landing/login/Tentang dan ikon PWA.
- **Indikator**: perubahan periode (`.pf-cb`) jadi panji berujung runcing; cincin win rate dan checklist jadi gauge lengkung (id elemen dan `stroke-dasharray` dipertahankan, `stxViz()` tidak diubah); sel kalender mendapat segitiga ▲/▼ (bentuk menyertai warna).
- **Grafik**: equity SVG dan sparkline Beranda digambar bertahap (step-after); equity diarsir; garis nol bertitik; penanda ujung berbentuk lengkung. Plugin Chart.js `doaIdentity` (line chart saja) melakukan hal yang sama. Sparkline Beranda tidak diarsir (viewBox `preserveAspectRatio="none"` memiringkan arsiran).
- **Angka**: Newsreader (lining + tabular) hanya untuk angka besar (`.pf-val`, `.de-fig`, `.ed-fig`, `.hm-pl`). Tanda +/− dan mata uang dikecilkan dan diangkat, desimal diredupkan; juga berlaku di tile statistik kecil (tetap Inter). Font gagal dimuat → Inter.
- **Pindah halaman**: garis emas ditarik di bawah header, isi halaman mengendap bertahap (event `viewchange`). Hanya transform + opacity; mati saat reduced-motion.
- Aturan ganda ═ di bawah judul kartu menggantikan pemisah berbasis kabut.

## Penyetelan cepat
`identity.css` blok TOKEN: `--id-num` (huruf angka; isi `var(--font-family)` untuk kembali ke Inter), `--id-ink`, `--id-rule`, `--id-hatch-a`.

## Berkas
Baru: `identity.css`, `identity.js`, `icons/mark.svg`, `design-system/identity-preview.html` (snapshot CSS aplikasi, bukan di cache SW), `CHANGELOG-v16.99.md`.
Diubah: `index.html` (link Newsreader, favicon SVG, `identity.css`, `identity.js`), `sw.js` (cache `v16-99-0-signature-identity`).

## Membatalkan
Hapus `<link href="identity.css">` dan `<script src="identity.js">` dari `index.html`. Markup bawaan tidak diubah.

## Pengujian
Chromium 141 lewat `design-system/identity-preview.html` (CSS asli): gelap/terang, 390 dan 1100 px, blur dicabut, render ulang Beranda, pembaruan angka berulang, pindah halaman, pemuat, mo-lite. Pemecah angka lolos 21 format. `index.html` asli dimuat offline tanpa error dari identity.js. Skrip penjaga proyek lolos.
**Belum diuji:** Newsreader ter-render (sandbox offline), plugin Chart.js dengan Chart.js sungguhan (hanya objek tiruan), aplikasi penuh dengan login/data, halaman selain Beranda/Dashboard, Safari/iPhone fisik, VoiceOver/TalkBack, tampilan favicon di 16px, dan performa di perangkat nyata. Buka aplikasi dua kali setelah mengganti file (service worker baru).
