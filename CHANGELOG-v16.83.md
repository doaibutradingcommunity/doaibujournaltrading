# v16.83 — Liquid Glass untuk Rekap Evaluasi

v16.82 mengubah modal Journal Baru, Profil, Pengingat, Entri Kalender, dan Strategy picker menjadi kaca grafit, tetapi sengaja melewati `#v22-recap` (Rekap Evaluasi). Modal itu masih tampak padat dan kecokelatan. Versi ini membawanya ke bahasa visual yang sama. Lapisan tampilan saja; data, grafik, dan logika tidak diubah.

## Penyebab khusus modal ini
1. `.rc-dlg` (index.html) memakai `background: radial-gradient(emas .16), rgba(24,22,16,.92) !important`: dasar cokelat-hitam (R > G > B) pada alpha .92. Karena `!important`, token `--amb-*` / `--sgt-*` yang dipakai v16.82 tidak berpengaruh di sini.
2. `box-shadow` `!important` emas jenuh (.38–.45), lalu 200,169,106 (.24), tanpa bayangan berlapis.
3. Kartu dalam (`.rc-trend`, `.rc-hero`) memakai wash emas, sehingga seluruh isi ikut menghangat.

## Yang berubah (§3 di `liquid-modal.css`)
| Aspek | Sebelum | Sesudah |
|---|---|---|
| Latar | `24,22,16` alpha .92 + wash emas | grafit `25,27,32`, alpha .62–.76 mengikuti slider `--lg` |
| Blur latar | `blur(36px) saturate(180%)` | `blur(26px) saturate(78%) brightness(.80)` (HP: 22px) |
| Garis tepi | emas jenuh | putih-keemasan `255,241,208` alpha .24, 1px |
| Highlight atas | emas .55–.60 | garis 1px putih-emas (alpha .62 di tengah) + inset 1px alpha .55 |
| Pantulan | wash emas sudut kiri-atas | pita diagonal tipis, sorot sudut, gradasi atas-terang/bawah-gelap (netral) |
| Bayangan | 1 lapis | 4 lapis: kontak · dekat · menengah · jauh (HP: 3 lapis) |
| Kartu "Jejak evaluasi" | wash emas .035 + border emas .25 | putih netral .02–.06, border putih-emas .14 |
| Kartu "Fokus hari ini" | emas .22 → .06 | emas .15 → .04 (tetap jadi aksen) |
| Dropdown "Data" | `20,19,15` (hitam hangat) | grafit `25,27,32` alpha .55 |

Semua nilai memakai token `--lm-*` dari §0, jadi satu tempat untuk menyetel.

## Fallback
- `html.mo-lite`, `data-ui-effects="low"`, tanpa `backdrop-filter`: latar padat grafit (alpha .97, bukan cokelat `#1d1b14`); tepi, highlight, dan bayangan berlapis tetap berlaku.
- `prefers-reduced-transparency`, `forced-colors`: padat .97, tanpa blur. `prefers-contrast: more`: alpha .94.
- Tema terang tidak disentuh.

## File
Diubah: `liquid-modal.css` (§3 baru + komentar kepala), `sw.js` (cache `v16-83-0-liquid-recap`).
Baru: `CHANGELOG-v16.83.md`.
`index.html` tidak diubah.

## Membatalkan
Hapus blok §3 dari `liquid-modal.css`. Tampilan Rekap Evaluasi kembali persis v16.82.

## Catatan pengujian
Lulus: kurung/kurawal seimbang, `scripts/ambient_guard.py`.
Belum diuji secara visual (tidak ada browser di lingkungan kerja): tampilan sebenarnya di perangkat, termasuk di atas lampu ambient asli. Jika tampilan tak berubah, buka ulang aplikasi dua kali (service worker baru aktif pada pemuatan berikutnya) atau hapus data situs.
