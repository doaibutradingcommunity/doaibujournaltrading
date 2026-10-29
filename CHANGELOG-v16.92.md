# v16.92 — Live Activity Status Capsule

Kapsul kecil di atas layar untuk aktivitas yang **sedang berjalan**, lalu berubah atau hilang saat selesai. Pengguna cukup melirik, tanpa membaca toast atau layar gelap. Lapisan tampilan; data dan logika simpan/ekspor tidak diubah.

> Ini komponen web di dalam halaman, **bukan** Live Activity native iOS: tidak muncul di Lock Screen/Dynamic Island dan hilang bila aplikasi ditutup.

## Perilaku
| Aktivitas | Urutan kapsul |
|---|---|
| **Simpan journal** | Menyimpan journal… → (bila ada chart) Mengunggah chart 1/2… dengan cincin progres → **Journal tersimpan** (hilang ±2 dtk). Gagal: **Gagal menyimpan** + alasan (menetap 6 dtk, ketuk untuk menutup) |
| **Sinkronisasi** | Offline → kapsul **Offline · Disimpan di perangkat** menetap. Online lagi → Menyinkronkan… (menunggu `waitForPendingWrites` Firestore) → **Tersinkron**. Bila >15 dtk: **Belum tersinkron** (jadi Tersinkron sendiri saat selesai) |
| **Ekspor laporan** | Menyiapkan PDF/Excel/CSV… → **PDF siap · nama-file.pdf**. Gagal: **Ekspor gagal** + alasan. Tanpa data: kapsul ditutup, pesan lama tetap tampil |

Aturan umum: proses <120 ms tidak memunculkan kapsul (tanpa kedip); kapsul "berjalan" terlihat minimal 0,8 dtk; beberapa aktivitas sekaligus → yang paling penting tampil (gagal > berjalan > offline > selesai) dengan lencana **+n**. Saat berjalan, kapsul tidak menangkap sentuhan.

## Perubahan pada berkas lama
- `index.html`: satu `<link>` dan satu `<script>`; 6 baris `StatusCapsule.save.*` di alur simpan journal; tiga tombol ekspor dibungkus `lscExport(...)` (nama file dikembalikan, `return false` bila dibatalkan). Toast "Export … berhasil" hanya dipakai bila kapsul tidak ada.
- **Overlay simpan**: selama kapsul simpan berjalan, layar gelap + kartu pemintal disembunyikan (`html.lsc-save #loading`), tetapi lapisannya tetap menangkap sentuhan agar tidak terketuk dua kali. Overlay lain (profil, kalender, pre-market) tidak berubah. Ingin overlay lama kembali: hapus blok "OVERLAY LAMA" di akhir `status-capsule.css`.
- `sw.js`: cache `v16-92-0-status-capsule`, dua berkas baru didaftarkan.

## Aksesibilitas
Kapsul `aria-hidden`; pesan dibacakan lewat region `role="status"` `aria-live="polite"` terpisah. `prefers-reduced-motion`: tanpa morf, cincin jadi berdenyut. `prefers-reduced-transparency` dan `html.mo-lite`: kaca padat. `prefers-contrast: more`: cincin tebal. `forced-colors`: warna sistem. Safe area atas iPhone dihormati. 4 bahasa (id/en/ms/es, dari `journalLanguage`). Tema gelap dan terang.

## API untuk pemakaian berikutnya
`StatusCapsule.begin/update/ok/warn/fail/end(id, {…})`, `StatusCapsule.run({…}, fn)`, `StatusCapsule.exportRun(fmt, fn)`. Detail di komentar kepala `status-capsule.js`.

## File
Baru: `status-capsule.js`, `status-capsule.css`, `design-system/capsule-preview.html` (halaman uji tanpa login), `CHANGELOG-v16.92.md`.

## Membatalkan
Hapus `<link href="status-capsule.css">` dan `<script src="status-capsule.js">`. Semua kaitan memakai `window.StatusCapsule && …`, dan ekspor kembali ke perilaku + toast lama otomatis.

## Catatan pengujian
Chromium headless 390×844 dengan CSS/JS asli lewat `design-system/capsule-preview.html`: 31 skenario lulus (tanpa kedip, tunda tampil, urutan run→ok, progres upload, gagal + ketuk tutup, offline menetap → sinkron, ekspor tergambar sebelum kerja berat, batal/throw, prioritas + lencana, 4 bahasa, reduced-motion, buka saat offline, `pointer-events` saat berjalan). Skrip inline `index.html` lolos `node --check`; `ambient_guard.py` lulus.
Belum diuji: **alur simpan/ekspor di aplikasi penuh** (butuh login Firebase + CDN; kaitan hanya diperiksa sintaksnya), iPhone/Safari fisik (safe area, `backdrop-filter`), `waitForPendingWrites` dengan Firestore sungguhan (di uji tanpa Firebase, jalur "langsung Tersinkron"), VoiceOver/TalkBack, dan tabrakan visual dengan header adaptif di HP. Jika tampilan tak berubah, buka ulang aplikasi dua kali (service worker baru).
