# v16.47 — Gesture-Driven Mobile UI
**Interaksi HP lebih alami, tanpa mengurangi akses lewat tombol.** Aktif hanya untuk sentuhan/pena di layar ≤ 640px; mouse & desktop tidak berubah.

| Gestur | Hasil | Alternatif tombol |
|---|---|---|
| Geser kartu journal ke kiri | Membuka detail trade (label "Detail ›" muncul saat digeser) | Ketuk kartu / Enter |
| Tarik header detail trade ke bawah | Menutup sheet detail | Tombol × |
| Geser kiri/kanan di isi detail | Trade berikutnya / sebelumnya (getar pendek di ujung daftar) | Tombol ‹ › |
| Tarik handle ringkasan statistik ke bawah/atas | Memperluas / meringkas kartu KPI | Tombol "Lihat n lainnya" |
| Filter & Sort, tombol tambah trade | Sudah bottom sheet (v16.44) dengan tarik-tutup; tombol tambah selalu terjangkau | — |

**Pengaturan → Gestur & sentuhan**
- *Getaran haptic* Aktif/Mati — hanya tampil di perangkat yang mendukung `navigator.vibrate`; otomatis mati bila "kurangi gerakan" aktif. (iOS Safari tidak mendukung API ini.)
- *Posisi tombol tambah* Kanan (bawaan) / Kiri, untuk jangkauan ibu jari.

**Tip sekali tampil** di atas daftar journal: "geser kartu ke kiri untuk melihat detail" (bisa ditutup, tersimpan).

**Teknis**
- File baru: `gesture-ui.js`, `gesture-ui.css` (dimuat terakhir). `index.html`: dua baris tautan. `sw.js`: cache `v16-47-0-gesture-ui`.
- Tidak ada perubahan data, statistik, atau logika filter. Gestur memanggil kontrol yang sudah ada (`JournalUX.open`, tombol ‹ ›/×, tombol "Lihat lainnya"), jadi perilaku tetap satu jalur.
- Gestur horizontal dikunci hanya bila gerakan jelas mendatar; gulir vertikal halaman tidak terganggu. Klik susulan setelah gestur ditelan agar tidak membuka dua kali.
- Preferensi disimpan di localStorage: `gu_haptic`, `gu_fab`, `gu_hint`.
- Untuk membatalkan: hapus dua tautan itu dari `index.html`.
