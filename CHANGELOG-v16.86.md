# v16.86 — Native Sheet Presentation

Modal di HP terasa seperti lembar yang naik dari bawah. Lapisan tampilan dan interaksi; data, Firestore, dan logika komponen tidak diubah. Menutup sheet selalu lewat tombol tutup milik komponen itu sendiri (diklik), sehingga konfirmasi "belum tersimpan" tetap jalan.

## Yang sudah ada sejak v16.71 (tidak diulang)
Sudut atas 28px, animasi naik, tinggi mengikuti isi dengan batas `--ss-max`, handle di Profil/Pengingat/Kalender/Journal/Rekap/Daftar trade, naik di atas keyboard.

## Yang ditemukan dan diperbaiki
| Temuan | Perbaikan |
|---|---|
| **Geser-tutup v16.71 tidak menggerakkan sheet.** Animasi `ssRise` (fill `both`, `!important`, selektor ber-ID) menimpa `transform` inline: handle ditarik 110px, posisi sheet tetap. Sheet hanya menutup di akhir gestur | Selama sheet memegang transform tarikan, animasinya dimatikan lewat gaya inline `!important`; dikembalikan saat sheet tertutup |
| Tombol Kembali HP meninggalkan aplikasi saat sheet terbuka (hanya menu "Lainnya" dan zoom grafik yang ditangani) | Satu entri riwayat selama ada sheet terbuka. Kembali menutup sheet teratas. Ditolak komponen (konfirmasi belum tersimpan): entri dipasang lagi. Sheet berganti sheet tidak menambah entri. Tidak bentrok dengan `adaptive-nav.js` |
| Profil, Pengingat, Input Kalender, Form Journal: tanpa `role="dialog"`, tanpa Escape, fokus tidak dikelola | Peran + `aria-modal` + nama dari judul; Escape menutup lewat tombol tutup; fokus masuk ke sheet, Tab terkurung, fokus kembali ke pemicu |
| Trade 360 dan editor Strategy Library: sudut 24px, hanya bergeser 24px, tanpa handle | Sudut `--ss-r`, naik penuh dari bawah, handle yang bisa ditarik, geser-tutup |
| Tirai Strategy Library / dialog konfirmasi / Ringkasan Trade memakai takaran sendiri | Satu token `--amb-scrim` + `--amb-blur-scrim` |

## Baru
- **Tirai ikut meredup saat sheet ditarik** (warna dan blur proporsional jarak tarikan), termasuk untuk tarikan dari handle v16.71.
- **Tarik dari isi sheet** saat gulir di paling atas, hanya untuk sheet baca/pilih: Rekap, Daftar trade, Picker trade, Workspace. Tidak untuk formulir (Profil, Pengingat, Kalender, Journal, editor Strategi): di sana hanya handle/header, dan Journal dengan perubahan belum tersimpan menahan tarikan (karet) lalu menanyakan.
- Tidak aktif bila: isi sedang tergulir, gestur lebih horizontal daripada vertikal, awal sentuhan di input / select / textarea / canvas / slider.

## Batas
- Trade 360 tetap **tinggi tetap** (maksimum `--ss-max`), bukan mengikuti isi: isinya berganti antar tab dan tinggi yang melompat lebih buruk.
- Menutup lewat tombol atau Kembali tetap **tanpa animasi keluar** (komponen menyembunyikan lewat `hidden`); animasi keluar hanya terlihat pada geser-tutup.
- Detail hari Kalender dan Ringkasan Trade adalah kartu di tengah, bukan sheet bawah; tidak diubah.
- Tablet/desktop: hanya perilaku (Kembali, Escape, fokus). Tampilan ≥641px tidak diubah.
- Tombol Kembali baru aktif ±140 ms setelah sheet terbuka (menunggu entri riwayat menu "Lainnya" lepas).

## Fallback
`prefers-reduced-motion`: tanpa transisi masuk/handle. `forced-colors`: handle `CanvasText`. Tanpa `color-mix` (browser lama): tirai tetap penuh saat ditarik, tidak rusak.

## File
Baru: `native-sheet.css`, `native-sheet.js`, `CHANGELOG-v16.86.md`.
Diubah: `index.html` (satu `<link>` setelah `native-tabbar.css`, satu `<script>` di akhir), `sw.js` (cache `v16-86-0-native-sheet`, dua berkas didaftarkan), `scripts/ambient_guard.py` (memindai berkas baru; lulus).

## Membatalkan
Hapus `<link href="native-sheet.css">` dan `<script src="native-sheet.js">`. Kembali persis v16.85.1 (termasuk geser-tutup yang tidak menggerakkan sheet).

## Catatan pengujian
Chromium headless 390×844 dengan sentuhan CDP, memuat `index.html` asli (tanpa Tailwind/Firebase, karena jaringan tidak terjangkau; `.hidden` disuplai manual) dan CSS asli Trade 360 / Strategy Library.
Lulus: peran/nama dialog; fokus masuk dan kembali; 40× Tab tetap di dalam; Escape; Kembali menutup sheet; menutup lewat UI melepas entri; A→B tanpa entri tambahan; tarikan kecil kembali dan tirai pulih; tarikan besar menutup; gulir di isi tidak memicu tarikan; formulir tidak bisa ditarik dari isi; Trade 360 dan Strategi: sudut 28px, handle, tarik dari handle menutup; 0 error JS dari berkas baru.
Belum diuji: iPhone/Safari dan Android sungguhan (tombol Kembali perangkat, gesture swipe-back iOS), aplikasi penuh dengan login dan data nyata, komponen asli Trade 360 / Strategi (diuji dengan DOM tiruan), VoiceOver/TalkBack. Jika tampilan tak berubah, buka ulang aplikasi dua kali atau hapus data situs (service worker baru).
