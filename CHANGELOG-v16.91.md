# v16.91 — Gesture-Driven Journal List

Daftar journal di HP bisa dipakai satu tangan tanpa memenuhi layar dengan tombol. Lapisan tampilan dan interaksi; struktur data tidak diubah.

## Perilaku
| Aksi | Hasil | Tombol/jalur setara (tanpa gestur) |
|---|---|---|
| **Geser kartu ke kiri** | Baki tindakan sekunder muncul: Edit · Pilih · Hapus | Tombol **⋯** di kartu (fokus langsung ke Edit, Escape menutup) |
| **Ketuk kartu** | Buka detail (tetap) | Enter / Spasi |
| **Tahan kartu (±0,5 dtk)** | Masuk mode pilih, kartu itu terpilih | Tombol **Pilih** di toolbar · **Pilih** di baki geser · Ctrl/Cmd+klik (desktop) |
| Ketuk kartu saat mode pilih | Tambah/kurangi pilihan | Enter / Spasi |
| Ketuk saat baki terbuka | Hanya menutup baki (tidak membuka detail) | — |

Mode pilih: bilah bawah dengan **Selesai · n dipilih · Semua/Kosongkan · Hapus**. Menghapus pilihan terakhir, Escape, atau pindah halaman menutup mode. Tombol "tambah trade" disembunyikan selama mode pilih supaya tidak bertabrakan.

## Keamanan data
- **Hapus massal** (`__jrApi.delMany`): satu cadangan per halaman tanggal, satu transaksi per halaman, **satu snackbar Urungkan** untuk semuanya (UR 10 menit, bertahan setelah reload). Trade hasil import dilepas dari `importedIds` seperti hapus tunggal.
- Pilihan yang tersaring/hilang setelah render ulang otomatis dibuang: trade yang tidak terlihat tidak pernah ikut terhapus.
- Kunci tanpa trade (`tanggal` saja) diabaikan oleh hapus massal; tidak pernah menebak trade mana.
- Geser tidak pernah menjalankan aksi sendiri (tidak ada "geser penuh = hapus"); aksi selalu lewat tombol yang terlihat.

## Aksesibilitas
Kartu di mode pilih: `aria-pressed` + label "Pilih: …". Bilah punya `role="toolbar"` dan pengumuman (`aria-live`) saat mode dibuka/ditutup. Target sentuh ≥44px. `prefers-reduced-motion`: tanpa animasi. `forced-colors`: sorotan pilihan memakai `Highlight`. 4 bahasa (id/en/ms/es).

## Cakupan
Gestur hanya untuk sentuhan/pena di layar ≤720px (sama dengan tata letak kartu HP). Mouse/desktop: tampilan lama + tombol Pilih. Tombol Edit/Hapus inline di HP diganti satu tombol ⋯ (isinya sama dengan baki geser).

## Perubahan pada berkas lama
- `gesture-ui.js`: geser-kiri-untuk-detail (v16.47) dan tipnya dilepas bila `journal-gestures.js` aktif (`window.__jrGest`). Gestur lain (tarik-tutup detail, geser antar trade, handle statistik, haptic) tidak berubah.
- `index.html`: kartu mendapat penanda centang, tombol ⋯, dan baki; toolbar mendapat tombol Pilih; `deleteJournals` + `__jrApi.delMany`; satu `<link>` dan satu `<script>`.
- `sw.js`: cache `v16-91-0-journal-gestures`, dua berkas baru didaftarkan.

## File
Baru: `journal-gestures.js`, `journal-gestures.css`, `CHANGELOG-v16.91.md`.

## Membatalkan
Hapus `<link href="journal-gestures.css">` dan `<script src="journal-gestures.js">`. Geser-untuk-detail v16.47 kembali otomatis; tombol ⋯ tersembunyi tidak ada lagi karena CSS-nya ikut hilang, jadi Edit/Hapus inline muncul kembali.

## Catatan pengujian
Chromium headless 390×844 (sentuhan CDP) dengan CSS dan markup kartu asli dari `index.html`: 23 skenario lulus (ketuk, geser buka/tutup, geser kecil kembali, gulir vertikal diabaikan, ⋯ + fokus + Escape, tahan → pilih tanpa membuka detail, ketuk toggle, pilih semua/kosongkan, hapus massal memanggil `delMany` dengan id yang benar, Escape, render ulang membuang pilihan hilang); desktop 1100px (tanpa ⋯/baki, Ctrl+klik, Enter di mode pilih); `delMany` diuji dengan Firestore tiruan dan `JEntries` asli. 0 error JS; `ambient_guard.py` lulus.
Belum diuji: iPhone/Safari dan Android sungguhan (terutama tekan-tahan vs menu sistem, haptic), aplikasi penuh dengan login + data nyata, VoiceOver/TalkBack. Tombol Kembali HP belum menutup mode pilih (hanya Selesai/Escape). Jika tampilan tak berubah, buka ulang aplikasi dua kali (service worker baru).
