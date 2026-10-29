# v16.67 — Journal Form yang lebih intuitif

Form journal dipakai berulang kali, jadi yang diubah adalah kenyamanan, bukan dekorasi. ID field, data, dan logika simpan tidak berubah.

## A. Empat bagian
| Langkah | Isi | Status |
|---|---|---|
| 01 Trade Setup | Pair, arah, setup/tag, akun, sesi | Wajib (arah) |
| 02 Eksekusi | Risk %, emosi/psikologi | Opsional |
| 03 Hasil | Win/BE/Loss, P/L, Hasil (R), evaluasi bintang | Wajib (hasil) |
| 04 Review | Catatan/lesson learned, upload chart | Opsional |

Tanggal tetap di atas dan wajib. Tab Pre-Market tidak berubah.

## B. Progres sederhana
- "Langkah 2 / 4 · Eksekusi" + empat segmen. Segmen emas = bagian itu sudah ada isinya; merah = bagian wajib yang belum lengkap setelah gagal lanjut.
- "Wajib 2/3" berubah jadi "✓ Siap disimpan" saat semua bagian wajib terisi.
- Saat siap, muncul **Simpan sekarang**: langkah opsional bisa dilewati.
- Kalau Simpan ditekan tapi ada yang kurang, form pindah ke langkah yang bermasalah.

## C. Input terakhir
- Penanda **Terakhir** pada pilihan arah, akun, dan sesi.
- Chip Risk terakhir (3 nilai).
- Tombol **Pakai setup terakhir** (pair, arah, setup, akun, sesi, risk). Hasil, P/L, catatan, dan chart tidak pernah disalin.
- Riwayat pair/setup/sesi lama tetap dipakai; riwayat arah/akun/risk mulai terisi setelah journal pertama disimpan di versi ini.

## D. Tutup, Batal, Simpan
| Tombol | Arti |
|---|---|
| **Simpan** (emas) | Simpan ke journal |
| **Tutup** (kanan atas) | Tutup form, draf tetap tersimpan dan bisa dilanjutkan |
| **Batal** (kiri bawah, merah) | Buang isian |

Ada perubahan belum disimpan → dialog: *Lanjut mengisi* / *Tutup, simpan draf* / *Buang perubahan* (Batal: *Lanjut mengisi* / *Ya, buang isian*). Tidak ada perubahan → langsung menutup. Klik latar gelap diperlakukan sama dengan Tutup. Menutup tab dengan perubahan yang belum sempat tersimpan memunculkan peringatan browser.

## E. Status simpan (di bawah judul)
Belum ada perubahan → Perubahan belum disimpan → Draf tersimpan di perangkat · 14:02 → Menyimpan journal… → (gagal) Belum tersimpan · isianmu masih aman. Draf gagal disimpan (penyimpanan penuh) juga ditandai merah.

## File
Baru: `journal-form-ux.css`, `journal-form-ux.js`, `CHANGELOG-v16.67.md`.
Diubah: `index.html` (markup form 4 langkah, skrip wizard, satu `<link>` dan satu `<script>`), `trade-summary.js` (Risk, R, dan bintang kini masuk ke slot langkahnya; tanpa slot, perilaku lama), `undo-recovery.js` (hanya mengirim event `jf-draft` setelah draf ditulis), `sw.js` (cache `v16-67-0-form-ux`).

## Membatalkan sebagian
Hapus `<link href="journal-form-ux.css">` dan `<script src="journal-form-ux.js">` untuk menghilangkan status, konfirmasi, dan penanda terakhir. Struktur 4 langkah ada di `index.html`.
