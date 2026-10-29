# v16.78 — Prismatic Edge Glass

Pembiasan cahaya yang sangat halus di tepi atas kaca. Ketika sheet dibuka, tepi atasnya menangkap kilau champagne gold; bagian lain tetap graphite. Material terasa lebih nyata tanpa membuat seluruh panel berkilau. Lapisan tampilan saja; data, statistik, dan logika tidak diubah.

## Tiga batas yang menjaga efek tetap halus
| Batas | Cara |
|---|---|
| Tepi saja | garis 1px: pseudo-element bertopeng cincin (pola yang sama dengan cincin modal lama) |
| Top saja | gradient hanya digambar di 20px teratas; sisi dan bawah tidak disentuh |
| Terbatas | satu titik sorot (±32% lebar) + serat dispersi tipis (es → champagne → rose, alpha .13–.34) |

Saat dibuka, titik sorot menyapu sekali dari kiri (±1,1 dtk, jeda .14 dtk) lalu berhenti di posisi diamnya. Tidak berulang. Keyframe tanpa 100%, jadi akhir animasi = gaya dasar.

## Siapa memegang apa
| Sheet | Pseudo | Catatan |
|---|---|---|
| `.npv-sheet` (menu HP) | `::before` baru | strip lengket 28px agar tepi tidak ikut tergulir; padding atas 8px dipindah ke strip, jarak isi tetap |
| `.modal-overlay > .glass` | `::before` lama | cincin `--orn-rim` (emas diagonal di semua sisi) diganti gradasinya; geometri & topeng dipakai apa adanya |
| `#sp-modal .sp-sheet` | `::after` lama | cincin `.glass::after`, sama seperti modal |

## Yang berubah selain itu
- Garis champagne atas dan **kiri** dari `optical-glass.css` v16.74 (dua lapis pertama `background-image`) dihentikan **hanya di tiga sheet di atas**. Kalau tidak, ada dua garis emas di baris piksel yang sama dan sisi kiri tetap keemasan. Sorot sudut lunak dan gradasi atas-terang/bawah-gelap tetap.
- Warna mengikuti `--og-champ` (terang = champagne lebih dalam) dan `--og-g` (halaman calm tetap tenang).

## Dikecualikan dengan sengaja
`#v22-recap` (sudah punya bingkai emas sendiri), `.jd-panel` (padat, berisi P/L), menu/popover/toast/filter (bukan sheet), FAB (sorotnya milik `glass-depth.css`). Alpha, blur, brightness, bayangan, dan fallback (v16.75–v16.77) tidak disentuh.

## Aksesibilitas & hemat daya
- `prefers-reduced-motion`, `html.mo-lite`, `data-ui-effects="low"`: tanpa animasi; garis statis di posisi diam.
- `prefers-contrast: more`: serat dispersi dibuang, titik sorot dipertahankan.
- `forced-colors`: dimatikan.
- Tanpa `mask-composite`: seluruh blok dilewati, sheet tampil seperti v16.77.

## File
Baru: `prismatic-edge.css`, `CHANGELOG-v16.78.md`.
Diubah: `index.html` (satu `<link>` setelah `glass-depth.css`), `sw.js` (cache `v16-78-0-prismatic-edge`, file baru masuk shell).

## Membatalkan
Hapus `<link href="prismatic-edge.css">`. Tampilan kembali persis v16.77.

## Catatan pengujian
Diuji di Chromium headless pada `index.html` asli (skrip dihapus, markup sheet/modal/strategy picker disisipkan): gelap dan terang; menu HP 390px, modal dan strategy picker 900px. Diperiksa: garis hanya di tepi atas kiri dan sisanya graphite; jarak isi sheet tidak bergeser (handle tetap di +10px dari tepi); tepi tetap ada saat sheet digulir (30 baris tambahan, scrollTop 300); frame animasi pada 0,5/0,8/1,9 dtk.
Belum diuji: Safari/Android fisik, aplikasi penuh dengan data nyata, `prefers-reduced-motion` dan `prefers-contrast` secara visual (aturan ditulis, belum dirender), modal selain contoh (form jurnal asli), halaman `calm`/`analytic` secara visual. Font di screenshot uji adalah fallback.
