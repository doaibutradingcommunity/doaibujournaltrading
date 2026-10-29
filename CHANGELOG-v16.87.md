# v16.87 — Native Sheet 2.0

Semua sheet di HP kini berasal dari satu sistem gerak, satu jalur tutup, dan satu dialog "belum tersimpan". Lapisan tampilan dan interaksi; data, Firestore, dan logika komponen tidak diubah. Menggantikan `native-sheet.js` / `native-sheet.css` v16.86.

## Yang ditemukan (v16.86) dan diperbaiki
| Temuan | Perbaikan |
|---|---|
| Hanya sebagian sheet punya animasi keluar. Profil, Pengingat, Kalender, Journal, Rekap, Daftar trade, Filter menghilang seketika; Trade 360 dan editor Strategi terpotong di 240 ms; keluar Detail trade tak pernah terlihat (`visibility` langsung hidden) | Masuk .30 s, keluar .22 s, kurva `cubic-bezier(.32,.72,0,1)` untuk semua. Sheet yang disembunyikan komponen secara instan dipertahankan sesaat (sebelum frame digambar) lalu diluncurkan turun; Filter memakai `NativeSheet.exit()` |
| Detail trade masuk hanya 40 px sambil memudar | Naik penuh dari bawah seperti sheet lain |
| Tiga mesin tarik (sheet-system, gesture-ui Detail, mobile-float Filter) dengan ambang dan pelepasan berbeda; Detail tertahan di posisi tarikan lalu hilang tanpa meluncur | Satu mesin di `native-sheet.js` untuk handle, header, dan isi |
| Pelepasan tetap: ambang jarak, kecepatan EMA yang lamban untuk flick pendek | Pegas kritis yang melanjutkan kecepatan jari (jendela 100 ms); sheet yang sedang kembali bisa ditangkap lagi |
| Formulir dengan perubahan tak pernah menanyakan saat ditarik (jarak dibandingkan setelah diredam karet, maksimum 60 px) | Jarak mentah dipakai untuk keputusan; karet lalu kembali lalu bertanya |
| Konfirmasi "belum tersimpan" tiga versi: Journal (dialog sendiri), Trade 360 (`confirm()` browser), Profil / Pengingat / Kalender / editor Strategi (tidak ada: tutup = isian hilang) | Satu dialog untuk lima sheet itu. Journal tetap dengan dialog tiga pilihannya. Berlaku untuk tombol tutup, ketuk tirai, Escape, tombol Kembali, dan tarik |
| Guard Trade 360 `.t3-st.dirty` ikut menyala untuk "belum disimpan ke akun" padahal tidak ada perubahan | Memakai tombol "Buang perubahan" yang hanya ada saat benar-benar berubah |
| Handle Trade 360 hilang setelah dibuka ulang (komponen mengosongkan `innerHTML`) | Dipasang ulang otomatis |
| Tirai Detail / Filter diredam lewat `body` (tirai bukan induk sheet) | Tirai dicari per sheet; mode `opacity` untuk tirai terpisah |

## Dua mode tinggi
- `data-ns-fit="content"` (Profil, Pengingat, Kalender, Rekap, Daftar trade, Picker, Workspace, Filter, Detail): tinggi mengikuti isi sampai `--ns-max`; perubahan tinggi isi (>8 px) dianimasikan 240 ms, bagian bawah menempel.
- `data-ns-fit="fixed"` (Journal, Trade 360, editor Strategi): satu tinggi `--ns-fixed` (= `--ns-max`), tidak melompat antar tab atau saat isi bertambah. Journal mode keyboard (`.jw-kb`) tidak diubah.

## Satu jalur menutup
`NativeSheet.close()` / `requestClose()`: tombol tutup, ketuk tirai, Escape, Kembali, dan tarik semuanya berakhir mengklik tombol tutup milik komponen. Papan ketik ditutup saat sheet ditutup atau ditarik; kolom yang difokus digulir ke area terlihat saat keyboard muncul.
Deteksi belum tersimpan: foto isian pada sentuhan/ketikan pertama (bukan saat dibuka), berubah lalu dikembalikan = tidak berubah. `confirm()` Trade 360 diganti dialog yang sama hanya saat penutupan sheet diminta; confirm lain (hapus trade, buang perubahan, konflik simpan) tetap bawaan browser.

## Berkas
Diganti: `native-sheet.js`, `native-sheet.css`.
Kait satu baris (tidak aktif tanpa `native-sheet.js`, lewat `window.__nsDrag`): `sheet-system.js` (handle), `gesture-ui.js` (tarik-tutup Detail; geser antar trade tetap), `mobile-float.js` (tarik Filter + `NativeSheet.exit` pada `closeSheet`).
`sw.js`: cache `v16-87-0-native-sheet-2`. `CHANGELOG-v16.87.md` baru. Penjaga ambient lulus.

## Membatalkan
Hapus `<link href="native-sheet.css">` dan `<script src="native-sheet.js">`: kembali ke v16.71 (tiga kait menjadi tidak aktif).

## Catatan pengujian
Chromium headless 390×844 (sentuhan CDP) memuat `index.html` asli tanpa Tailwind/Firebase (tidak terjangkau; `.hidden` disuplai manual). Lulus pada komponen asli: Profil (keluar terukur 421→919 px, selesai ±300 ms tanpa sisa gaya; kotor: tombol tutup, tirai, Escape, Kembali, tarik; isian dikembalikan = tidak bertanya), tarik 1:1 (70 px jari = 70 px), lepas pelan kembali, tarik panjang dan flick menutup, formulir tidak bisa ditarik dari isi, Trade 360 (handle, 28 px, tinggi tetap 812 px, dialog dari lima jalur, Buang menutup), Filter (keluar 75→859 px, tarik dari header), Journal (tinggi tetap, footer menempel), animasi tinggi 423→513 px, reduced-motion, desktop 1280 tidak berubah. Detail trade dan editor Strategi diuji dengan DOM tiruan yang menyalin logika buka/tutup komponen (data nyata tidak tersedia) plus CSS asli.
Belum diuji: iPhone/Safari dan Android sungguhan (tombol Kembali perangkat, gesture swipe-back iOS, keyboard layar nyata, `visualViewport`), Tailwind sungguhan, Recap / Daftar trade / Picker / Workspace (jalur umum sama dengan Profil, tidak dibuka satu per satu), Detail dan editor Strategi dengan data nyata, tablet 641–720 px untuk tarikan (hanya CSS), VoiceOver/TalkBack. Jika tampilan tak berubah, buka ulang aplikasi dua kali atau hapus data situs (service worker baru).
