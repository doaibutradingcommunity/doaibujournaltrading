# v16.89 — Liquid Glass dengan tiga tingkat material

Satu efek kaca untuk semua elemen membuat layar rata. Kini setiap permukaan masuk satu dari tiga tingkat, masing-masing dengan transparansi, blur, dan tepi sendiri yang naik-turun secara konsisten. Lapisan tampilan saja: data, statistik, dan logika tidak diubah.

## Tiga tingkat
| | **L1 Clear Glass** | **L2 Soft Glass** | **L3 Solid Surface** |
|---|---|---|---|
| Elemen | dock, tombol tambah (FAB), pil navigasi desktop | header, sheet "Lainnya", menu, popover, toast, modal tanpa form | kartu statistik/KPI/grafik, tabel, form Journal, sheet Profil, modal berisi form, filter global |
| Alpha gelap (slider `--lg` 0…1) | .44 – .62 | .66 – .86 | .97 – .99 |
| Alpha terang | .56 – .76 | .74 – .88 | .97 – .99 |
| Blur | 16px | 30px | 0 |
| Saturate | 190% | 160% | – |
| Brightness (peredam latar) gelap / terang | .56 / 1.04 | .76 / 1.04 | – |
| Tepi atas (sorot) gelap | .42 | .20 | .085 |
| Cincin 1px gelap | .16 | .10 | .07 |

Logika tangga: makin bening permukaannya, makin tegas tepinya dan makin kuat latar di belakangnya diredupkan. Blur tidak menurun satu arah: L1 sengaja lebih tajam dari L2 (kaca bening, bukan kabut). Semua angka ada di dua blok token teratas `glass-tiers.css` (`--gt1-*`, `--gt2-*`, `--gt3-*`); tema terang punya blok sendiri.

## Sebelum → sesudah (diukur, alpha / blur)
| Elemen | Sebelum | Sesudah |
|---|---|---|
| Dock + FAB (gelap) | .70 / 26px | .54 / 16px |
| Dock + FAB (terang) | .56 / 26px | .67 / 16px |
| Header desktop (gelap) | .59 / 26px | .77 / 30px |
| Pil navigasi desktop (gelap) | .59 / 26px (sama dengan header) | .54 / 16px (lebih bening dari header) |
| Sheet, menu, toast (gelap) | .68 / 32px | .77 / 30px |
| Kartu statistik desktop (gelap) | .95 / 10px | .98 / 0 |
| Form Journal (gelap) | .88 / 24px | .98 / 0 |
| Modal berisi form, sheet Profil (gelap) | .70 / 22–26px | .98 / 0 |
| Modal tanpa form (gelap) | .70 / 22–26px | .77 / 30px |
| Filter global `.v5-fbar` (gelap) | .68 / 32px (kaca melayang) | .98 / 0 |
| Header tabel lengket | 94% + abu | padat penuh + garis bawah L3 |

## Yang diubah
1. **Token:** `--gt*` baru; token lama diarahkan ke tingkat yang benar (`--nt-*` dock/FAB, `--gn-bar-*` pil, `--sgt-nav/float/form/data-*` smart-glass, `--lm-a/-blur/-dim` modal gelap). Pemetaan memakai satu aturan untuk tema gelap dan terang karena `smart-glass.css` punya blok terang yang lebih kuat.
2. **Tepi:** `--amb-rim` (L2) dan `--amb-solid-edge` (L3) disusun ulang dengan struktur `signature-glass.css` yang sama (sorot kiri-atas 128°, umber kanan-bawah). Yang berubah hanya sorot atas dan cincin 1px, yang kini mengikuti tangga. Cincin L2 sebelumnya .022 (hampir tak terlihat).
3. **Header:** garis tepi header memakai token L2 (sebelumnya angka tetap di `ambient-glass.css`).
4. **Form:** `#form-section > .glass` / `#jw-card` memakai latar L3. Di tema gelap, `liquid-modal.css` menjadikan semua modal kaca grafit; modal yang memuat `input/select/textarea` dan sheet Profil kini kembali ke L3, modal tanpa form tetap kaca (L2).
5. **Fallback:** `prefers-reduced-transparency`, `html.mo-lite`, `data-ui-effects="low"`, tanpa `backdrop-filter`, `prefers-contrast: more` (tepi dua kali lebih tegas), dan `forced-colors` memakai rangkaian yang sama dengan `smart-glass.css`.

## Tidak diubah (disengaja)
- Bayangan jatuh (`--nt-drop`, `--amb-drop`, `--amb-solid-drop`) sudah membentuk tangga melayang → sedang → rendah.
- Sheet padat yang sudah hampir opak dan penuh isi: Detail trade (`.jd-panel`), Trade 360 (`.t3`), editor Strategi (`.sl-sheet`), sheet Kalender (`.calx-sheet`), serta hero (`.hm-hero`, `.pf-hero`, `.stx-hero`).
- Cincin ornamen emas (`::after` pada kartu/hero/modal) dan garis atas `prismatic-edge.css`: lapisan terpisah dari tepi inset yang diatur di sini.
- Tidak ada elemen "toolbar mengambang" terpisah di aplikasi ini; yang melayang adalah dock, FAB, dan pil navigasi desktop. Ketiganya L1.
- `.px-range` (pemilih rentang) tetap permukaan data (L3) karena berada di dalam halaman, bukan melayang.

## Kontras (`scripts/tier_contrast.py`, latar di belakang kaca B = .25…1.0)
| | Teks utama | Teks sekunder / label | Sebelumnya (v16.76) |
|---|---|---|---|
| L1 gelap | 6.3 | 5.0 | NAV 4.6 / 3.7 |
| L2 gelap | 7.2 | 3.7 | FLOAT 5.2 / 2.9 |
| L1 terang | 8.2 | 5.8 | NAV 7.7 / 5.5 |
| L2 terang | 11.6 | 5.2 | FLOAT 9.7 / 4.8 |

**Catatan jujur:** teks sekunder L2 gelap (3.7) masih di bawah 4.5 bila di belakangnya benar-benar putih penuh; itu terburuk yang mungkin, dan sudah lebih baik dari sebelumnya (2.9). Teks utama aman di semua kasus. Jika ada panel L2 gelap yang sering berada di atas grafik terang, naikkan lantai `--gt2-a` atau turunkan `--gt2-bright`.

## File
Baru: `glass-tiers.css`, `scripts/tier_contrast.py`, `CHANGELOG-v16.89.md`.
Diubah: `index.html` (satu `<link>` setelah `dash-editorial.css`), `sw.js` (cache `v16-89-0-glass-tiers`, berkas baru didaftarkan), `scripts/ambient_guard.py` (memindai berkas baru; lulus).

## Membatalkan
Hapus `<link href="glass-tiers.css">`: tampilan kembali persis v16.88. Untuk hanya mengembalikan modal form ke kaca grafit, hapus bagian 5(d) di `glass-tiers.css`.

## Catatan pengujian
Chromium headless pada halaman uji yang memuat CSS asli `index.html` (semua `<link>` dan `<style>`, urutan cascade sama) dengan markup minimal untuk tiap elemen. Diukur lewat computed style: 390px dan 1280px, tema gelap dan terang, sebelum dan sesudah; fallback `html.mo-lite`, `prefers-contrast: more`, `forced-colors`. Tanpa error JS. Penjaga ambient lulus.
**Belum diuji:** aplikasi penuh dengan login dan data nyata (Firebase/Tailwind tidak terjangkau), tampilan visual kaca di atas konten nyata (latar halaman uji tertimpa CSS aplikasi, jadi hanya angka yang diverifikasi, bukan kesan visualnya), iPhone/Safari dan Android asli, markup modal asli (diuji dengan `.modal-overlay > .glass` dan `#sp-modal .sp-sheet` tiruan), `prefers-reduced-transparency` (tidak bisa diemulasikan; jalurnya sama dengan `mo-lite`), tablet 641–1024px. Angka tiap tingkat adalah pilihan desain awal; setel di dua blok token teratas setelah dilihat di perangkat nyata. Jika tampilan tak berubah, buka ulang aplikasi dua kali atau hapus data situs (service worker baru).
