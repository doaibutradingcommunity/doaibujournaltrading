# v16.64 — Login email + password

Login tidak lagi hanya Google. Pengguna bisa daftar dan masuk dengan email + password (Firebase Authentication), Google tetap tersedia.

**Alur (mengikuti kartu referensi):** isi email → tombol panah → isi password → panah. Footer "Belum punya akun? Daftar" berpindah antara Masuk dan Daftar.
- **Daftar:** nama panggilan (opsional, jadi nama profil), password dengan checklist syarat langsung (min. 6 karakter, huruf besar, huruf kecil, angka, simbol — sama dengan Password policy di Firebase Console), email verifikasi dikirim otomatis (tidak memblokir akses).
- **Masuk:** tombol mata untuk lihat/sembunyikan password, "Lupa password?" mengirim email reset.
- Pesan error jelas dan 4 bahasa (ID/EN/MS/ES). Tema gelap & terang. Tahan reduced-motion, fokus keyboard terlihat, input 16px (tidak zoom di iOS).
- Teks landing "login dengan Google" diperbarui menjadi "Google atau email".

**Perbaikan 16.64.1:** kolom email, nama, dan password tidak lagi punya kotak di dalam kotak; kolom jadi satu pil bersih dengan label emas saat aktif.

**Wajib di Firebase Console:** Authentication → Sign-in method → aktifkan **Email/Password**.

**v16.64.1:** kotak dalam di kolom email/password dihilangkan (gaya input global aplikasi ditimpa), jarak kolom dan pemisah dirapikan, label lebih lembut.

**File:** baru `login-card.css`, `login-card.js`. Diubah: `index.html` (markup layar login, handler Google lama dipindah, 1 link CSS, 1 script, teks landing), `sw.js` (cache v16-64-0-login-email).

**v16.64.2 — Halaman reset & email profesional**
- Baru `auth-action.html`: halaman membuat password baru (dan konfirmasi verifikasi email) dengan kartu yang sama seperti login. Cek syarat password langsung, tombol mata, 4 bahasa, tema gelap/terang, pesan jelas bila tautan kedaluwarsa. Pengalihan hanya ke domain yang sama.
- `sw.js`: halaman ini selalu dari jaringan dan tidak menimpa cache `index.html` (cache v16-64-2-reset-page).
- `login-card.js`: email reset/verifikasi membawa tautan kembali ke aplikasi; bila domain belum diizinkan, otomatis dikirim tanpa itu.
- Baru `PANDUAN-EMAIL-FIREBASE.md`: pengaturan Console + teks template email siap salin.
