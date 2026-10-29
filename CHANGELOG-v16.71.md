# v16.71 — Premium Sheet System

Satu bahasa untuk semua sheet/modal di HP. Lapisan tampilan + gestur; data, Firestore, dan logika tidak diubah.
Semua dikunci ke `html.ss-on` (dipasang `sheet-system.js`). Desktop tidak berubah (geometri modal diuji identik dengan dan tanpa `ss-on`).

## Yang berubah
- **Handle nyata:** profil, pengingat, kalender, form jurnal, rekap, daftar trade, picker, workspace punya handle yang bisa ditarik (sebelumnya hiasan). Filter dan detail trade tetap memakai gestur tarik bawaan; ukuran/warna handle disamakan.
- **Geser-tutup tidak menutup sendiri.** Ia mengklik tombol tutup milik komponen itu, sehingga konfirmasi "perubahan belum tersimpan" di form jurnal tetap muncul; sheet lalu kembali ke posisi (efek karet saat ada perubahan belum tersimpan).
- **Satu tombol tutup:** "× Tutup" 44px, kanan atas, di semua sheet (sebelumnya "Tutup" / "× Tutup" / "×", 34–40px). Di bawah 360px jadi ikon saja. Label mengikuti bahasa (id/en/ms/es).
- **Judul tetap | isi menggulir | aksi tetap:** Profil, Pengingat, Input Kalender disusun ulang menjadi head/body/foot. Tombol Simpan pindah ke footer lewat atribut `form=` (submit tetap bekerja).
- **Urutan aksi seragam:** sekunder di kiri, utama (emas) di kanan, tinggi 48px. **Detail Trade:** Hapus | + Trade | Edit (sebelumnya Edit di kiri).
- **Tinggi sesuai isi** dengan batas atas sama (`--ss-gap`: 32px + safe-area), sudut 28px, animasi masuk sama.
- **Filter:** sesi, arah, urutan menjadi chip 44px sekali ketuk. `<select>` asli tetap ada dan dipakai aplikasi (Pair/Tag tetap select). Chip sinkron setelah Reset.
- **Keyboard & safe area:** `visualViewport` diukur global (`--ss-kb`, `--ss-vvh`); sheet naik di atas keyboard (berguna di iOS Safari), padding gesture-bar dilepas saat keyboard terbuka, sisi kiri/kanan menghormati notch di landscape.
- **Kunci gulir halaman** di belakang sheet (≤900px).

## Tidak ikut
Trade 360 (layar penuh), viewer gambar, menu navigasi, toast. Form jurnal tetap memakai penyesuaian keyboard miliknya (v16.14).

## File
Baru: `sheet-system.css`, `sheet-system.js`. Diubah: `index.html` (link + script), `sw.js` (cache `v16-71-0-sheets`).
Membatalkan: hapus kedua baris itu dari `index.html`.

## Diuji (Chromium headless 390×844, Firebase di-stub)
Metrik 4 modal, geser-tutup (jauh/dekat), submit via tombol footer, form kotor + geser (konfirmasi muncul), chip + Reset, detail trade, rekap, keyboard simulasi 336px, tema terang, desktop 1280.
**Belum diuji:** perangkat iOS/Android nyata, dan sheet daftar trade (`sp`), picker, workspace (hanya CSS/JS umum, belum dibuka satu per satu).
