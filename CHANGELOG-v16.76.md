# v16.76 — Smart Glass Transparency

Desain cantik vs desain yang nyaman dipakai: transparansi tidak sama rata, ia mengikuti **peran** permukaan. Lapisan tampilan saja; data, statistik, dan logika tidak diubah.

## Tingkat transparansi (tema gelap; terang di `smart-glass.css`)
| Tingkat | Dipakai untuk | Alpha (slider `--lg` 0→1) | Backdrop |
|---|---|---|---|
| NAV | dock HP, header, tab tablet/desktop | .46 – .70 | blur 26px, redup (brightness .74) |
| FLOAT | menu, sheet, popover, toast, filter, modal umum | .54 – .80 | blur 32px, brightness .78 |
| FORM | modal berisi formulir (jurnal, strategi, dll.) | .88 – .96 | blur 24px; input memakai latar sendiri tanpa blur ganda |
| DATA | kartu P/L, KPI, grafik, tile, kartu `.glass` di halaman | .92 – .98 (HP: .985, tanpa blur) | blur 10px (hanya ≥641px) |
| Tabel | header tabel lengket | padat | — |

Hero (ekuitas, kalender, statistik) tetap padat penuh seperti v16.74. Slider "Transparansi kaca" tetap bekerja; ia hanya menggeser alpha **di atas lantai** tiap tingkat.

## Teks tetap kontras di atas grafik / latar bergerak
- Lantai alpha per tingkat + `brightness()` pada backdrop-filter (gelap: diredupkan; terang: diangkat), sehingga kaca tipis tidak pernah bertemu latar terang penuh.
- Label nav tidak aktif lebih terang (.62 → .78 gelap, .58 → .72 terang), label dock/tab/toast diberi `text-shadow` tipis.
- Header tabel lengket (`thead.sticky`, sebelumnya `bg-white/5`) kini padat; baris yang digulir tidak lagi tembus di bawah judul kolom.
- Rasio kontras terburuk dihitung dengan `scripts/glass_contrast.py` (model: latar blur abu 25–100% di bawah kaca). Tema gelap, lg=0, latar putih penuh: teks utama ≥ 4.4:1 (NAV) / 5.2:1 (FLOAT); pada latar realistis (≤75%) ≥ 6.4:1. Tema terang ≥ 7.7:1 di semua kasus. Label sekunder pada latar putih penuh bisa di bawah 4.5:1 — itu sebabnya label nav diberi warna lebih terang di atas.

## Fallback tanpa blur
Satu rangkaian token menangani semuanya; bila aktif, alpha naik ke .95–1 dan `backdrop-filter: none` (tidak ada kaca setengah-transparan tanpa blur):
- `prefers-reduced-transparency`
- `html.mo-lite` (HP hemat) dan `html[data-ui-effects="low"]`
- browser tanpa `backdrop-filter` (`@supports not`)
- `prefers-contrast: more`: blur tetap, lantai alpha .90–1
- `forced-colors`: blur dimatikan, sistem memegang warna
Tanpa `color-mix()`, kartu data tetap padat 100% seperti v16.74.

## Cara kerja
Aditif, dimuat paling akhir (setelah `glass-nav.css`). Mengganti token yang sudah dibaca lapisan lama (`--amb-bar-a`, `--amb-float-a`, `--gn-bar-bg`) dan menambah `backdrop-filter` berbasis token. Aturan data memakai `:not(#sgt-1):not(#sgt-2):not(#sgt-3)` untuk menaikkan spesifisitas di atas `:not(#export-menu):not(#filter-panel)` milik ambient-glass.css. Hanya `body.authed`.

## File
Baru: `smart-glass.css`, `CHANGELOG-v16.76.md`, `scripts/glass_contrast.py`.
Diubah: `index.html` (satu `<link>` setelah `glass-nav.css`), `sw.js` (cache `v16-76-0-smart-glass`, file baru masuk shell).

## Membatalkan
Hapus `<link href="smart-glass.css">`. Tampilan kembali persis v16.75.1.

## Catatan
Diuji di Chromium headless (390px dan 1180px; gelap, terang, `mo-lite`) pada `index.html` asli tanpa JS dengan elemen uji (dock, tab, kartu, toast, modal formulir, tabel): nilai terhitung diperiksa untuk tiap tingkat dan tiap fallback. Belum diuji di Safari/Android fisik, belum pada aplikasi penuh (Firebase tidak tersedia di lingkungan uji), dan `prefers-reduced-transparency` diverifikasi lewat jalur token yang sama dengan `mo-lite` (Chromium belum bisa mengemulasikannya).
