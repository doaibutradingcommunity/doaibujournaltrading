# v16.85.1 — Native Floating Tab Bar + tombol tambah journal bulat

Dock bawah HP dibuat seperti tab bar mengambang iOS. Lapisan tampilan; logika navigasi, data, dan statistik tidak diubah.

## Spesifikasi dan hasilnya
| Permintaan | Hasil |
|---|---|
| Transparan, membulat, seperti dock iOS | Kapsul penuh (`border-radius: 999px`), latar kaca `--nt-bg` + blur 26px + saturate 180% |
| Lapisan kaca | Pantulan tipis di tepi atas dan bawah, cincin 1px, sheen vertikal lembut, bayangan berlapis |
| Ikon konsisten dengan SF Symbols | Ikon dock digambar ulang bergaya `house`, `list.bullet.rectangle`, `calendar`, `chart.bar`, `ellipsis` (garis 1.7, sudut bulat, bentuk tertutup agar bisa terisi). Ikon aktif terisi lembut + garis sedikit lebih tebal, tanpa glow |
| Label singkat dan jelas | Slot "Lainnya" tidak lagi menampilkan "Strategy Playbook" / "Review Bulanan" / "Tentang Kami" yang terpotong: kini Strategi, Bulanan, Wrapped, Tentang (4 bahasa) |
| Aktif = kapsul halus, bukan kotak emas | Kapsul kaca netral selebar slot yang meluncur antar tab. Garis emas tepi atas, cahaya radial emas, dan kapsul bergradasi emas dimatikan. Ikon aktif memakai tint aksen; label aktif memakai warna teks utama |
| Safe area iPhone | Bawah: `calc(var(--mnav-gap) + env(safe-area-inset-bottom))`. Kiri/kanan: `max(14px, env(safe-area-inset-left/right))`. Nilai `--mnav-h` / `--mnav-gap` tidak diubah, jadi FAB, toast, dan padding halaman tetap sejajar |

## Tombol tambah journal (HP ≤640px)
Sebelumnya: pil emas berlabel "Journal Baru" di atas dock. Sekarang: lingkaran kaca 56px yang tetap melayang di atas dock (tidak sebaris, supaya dock tetap selebar penuh dan label tidak sempit).
- Bahan sama dengan bar (token `--nt-*`); ikon "+" memakai tint aksen. Label dan kilap kubah emas dimatikan.
- Rata dengan tepi kanan dock, jarak 12px di atasnya, ikut turun saat dock memadat. Opsi "tombol di kiri" (Gesture UI) tetap berfungsi.
- Gulir turun: tidak lagi mengecil terpisah; tetap menyingkir saat keyboard, sheet, atau form terbuka.
- Tablet/desktop (≥641px) tidak diubah.

## Kontras (diukur di Chromium, latar paling terang di belakang bar)
| | Label tidak aktif | Label aktif |
|---|---|---|
| Gelap, lama (v16.84) | 5.8–6.5 : 1 | 6.5 : 1 |
| Gelap, baru | 6.3–6.6 : 1 | 5.7 : 1 |
| Terang, lama | 8.6–8.8 : 1 | 16.4 : 1 |
| Terang, baru | 8.7 : 1 | 14.2 : 1 |

Token keterbacaan `smart-glass.css` (`--sgt-label-off`, `--sgt-text-shadow`) dan `brightness()` pada backdrop dipertahankan.

## Fallback
`mo-lite`: tanpa blur, kaca padat. `prefers-reduced-transparency`: padat. `prefers-contrast: more`: cincin 1.5px, kapsul aktif bergaris. `forced-colors`: kapsul menjadi garis `Highlight`. `prefers-reduced-motion`: tanpa transisi ikon. Mode memadat saat gulir turun (v16.65) tetap bekerja.

## Penyetelan cepat
Semua di blok token atas `native-tabbar.css`: `--nt-tint` (ikon aktif; ganti ke putih/hitam untuk tampilan netral penuh), `--nt-label-on`, `--nt-bg`, `--nt-blur`, `--nt-bright`, `--nt-cap`.

## File
Baru: `native-tabbar.css`, `CHANGELOG-v16.85.md`.
Diubah (v16.85.1): `native-tabbar.css` saja untuk tombol tambah; `sw.js` cache `v16-85-1-native-tabbar-fab`.
Diubah (v16.85): `index.html` (satu `<link>` setelah `signature-glass.css`; peta `ICON` untuk 5 ikon dock; `shortLabel` + peta `DOCK_SHORT`), `sw.js` (cache `v16-85-0-native-tabbar`, berkas baru didaftarkan), `scripts/ambient_guard.py` (memindai berkas baru; lulus).

## Membatalkan
Hapus `<link href="native-tabbar.css">`: dock kembali seperti v16.84. Ikon dan label singkat tetap (perubahan kecil di `index.html`).

## Catatan pengujian
Diuji di Chromium headless 390×844 pada halaman uji yang memuat seluruh CSS asli (urutan cascade sama) dan markup dock yang sama dengan hasil skrip: tema gelap dan terang, perbandingan sebelum/sesudah, tab aktif di slot pertama, tengah, dan terakhir, mode memadat, `mo-lite`, `forced-colors`, `prefers-contrast: more`, safe area bawah 34px (jarak dock ke tepi layar 46px = 12 + 34). Skrip nav asli dijalankan di DOM tiruan: tanpa error, label slot "Lainnya" benar untuk lima halaman sekunder.
Belum diuji: aplikasi penuh dengan login dan data nyata (Firebase/Tailwind CDN tidak terjangkau), iPhone/Safari fisik (`env(safe-area-inset-*)` hanya disimulasikan dengan nilai tetap), tablet ≥641px (tidak diubah). Jika tampilan tak berubah, buka ulang aplikasi dua kali atau hapus data situs (service worker baru).
