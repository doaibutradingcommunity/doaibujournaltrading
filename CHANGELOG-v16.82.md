# v16.82 — Liquid Glass Modal

Modal utama (Journal Baru, Profil, Pengingat, Entri Kalender, Strategy picker) sebelumnya terbaca padat dan kecokelatan. Versi ini mengubahnya menjadi kaca grafit transparan. Lapisan tampilan saja; data, statistik, dan logika tidak diubah.

## Apa yang berubah
| Aspek | Sebelum (v16.81) | Sesudah (v16.82) |
|---|---|---|
| Warna kaca | `22,23,26` alpha .925 (terukur) | grafit netral-dingin `25,27,32`, alpha .62–.76 mengikuti slider `--lg` (default ≈ .70) |
| Blur latar | `blur(24px) saturate(140%) brightness(.86)` | `blur(26px) saturate(78%) brightness(.80)` (HP: 22px) |
| Panel dalam (kotak form, kartu) | `--di-surface-1` alpha .88 (hampir solid) | inset putih netral alpha .04 |
| Footer form | sama dengan panel dalam | grafit alpha .82 (tetap menutup isi yang tergulir) |
| Garis tepi | putih .075 | putih-keemasan `255,241,208` alpha .24, 1px, mengelilingi panel |
| Highlight atas | champagne penuh (s.d. .78) | garis 1px putih-emas alpha .55 + titik sorot tepi atas (maks .72) |
| Pantulan | sorot champagne sudut kiri-atas | tiga lapis netral: pita diagonal tipis, sorot sudut, gradasi atas-terang/bawah-gelap |
| Bayangan | `e3` (3 lapis) | 4 lapis: kontak · dekat · menengah · jauh (HP: 3 lapis) |

## Penyebab "padat dan kecokelatan"
1. Alpha form hampir padat (smart-glass.css §3), jadi latar tidak tembus.
2. `saturate(140–170%)` pada backdrop memperkuat cahaya ambient emas di belakang kaca menjadi semburat cokelat.
3. Sorot champagne di sudut (optical-glass.css / prismatic-edge.css) menambah rona hangat.
4. **Panel di dalam modal** (`form.jw-form`, `.jw-foot`) memakai `--di-surface-1` alpha .88 dan menutupi hampir seluruh modal, sehingga perubahan pada kaca luar nyaris tak terlihat.
5. Bayangan satu tingkat membuat modal kurang terangkat.

## Cara kerja
`liquid-modal.css` (dimuat paling akhir) hanya mengganti **token** yang sudah dibaca lapisan lama, pada elemen modal itu sendiri: `--amb-glass-rgb`, `--amb-float-a`, `--amb-rim`, `--amb-drop` (ambient-glass / glass-depth), `--sgt-float-bf`, `--sgt-form-bf` (smart-glass), `--pe-stack` (prismatic-edge), `--di-surface-1/2` (liquid-glass-v1634). Aturan langsung: `background-image` dan latar `#jw-card .jw-foot`. Semua nilai yang bisa disetel ada di §0 (`--lm-*`).

Cakupan: `.modal-overlay > .glass` (termasuk `#jw-card`) dan `#sp-modal .sp-sheet`.
Tidak disentuh: tema terang, `#v22-recap` (punya bingkai emas sendiri), `#image-zoom-modal`.

## Fallback
- `html.mo-lite`, `data-ui-effects="low"`, browser tanpa `backdrop-filter`: kaca (alpha, blur, panel dalam) tetap seperti v16.81 (padat); hanya garis tepi, highlight, dan bayangan berlapis yang berlaku karena murah.
- `prefers-reduced-transparency`, `forced-colors`: alpha kembali ke `--sgt-form-a` (≥ .97), blur dimatikan. `prefers-contrast: more`: alpha kembali ke `--sgt-form-a` (.98).
- Sengaja tidak memakai gerbang `@media (…: no-preference)`: di browser yang tidak mengenal fiturnya, seluruh blok bernilai salah dan gaya baru tidak akan pernah tampil.

## File
Baru: `liquid-modal.css`, `CHANGELOG-v16.82.md`.
Diubah: `index.html` (satu `<link>` setelah `contextual-ambient.css`), `sw.js` (cache `v16-82-0-liquid-modal`, file baru masuk shell).

## Membatalkan
Hapus `<link href="liquid-modal.css">`. Tampilan kembali persis v16.81.

## Catatan pengujian
Diuji di Chromium 131 headless pada `index.html` asli (skrip dibuang, status login dan modal dipaksa tampil): nilai terhitung berubah dari alpha .925 → .698, `saturate(1.4)` → `saturate(.78)`; tangkapan layar sebelum/sesudah dibandingkan (modal Journal Baru). Sintaks valid, `scripts/ambient_guard.py` lulus.
Belum diuji: aplikasi penuh dengan login dan lampu ambient asli (pada uji, lampu ditiru dengan gradasi emas), Safari/Android fisik, modal Profil/Pengingat/Entri Kalender/Strategy picker secara visual, dan mode terang (sengaja tidak disentuh).
Penting saat memasang: pastikan `liquid-modal.css` ikut ter-deploy dan `index.html` yang baru terpakai. Jika tampilan tak berubah, buka ulang aplikasi dua kali (service worker v16-82 baru aktif setelah pemuatan berikutnya) atau hapus data situs.
