# v16.93 — Personal Trading Rhythm

Ringkasan kebiasaan journaling di Beranda yang menilai **konsistensi, bukan profit**. Lapisan tampilan, **murni baca**: tidak menulis ke Firestore/localStorage, tidak menyentuh `V16Stats`, P/L, win rate, atau data journal. Tidak ada satu pun angka P/L di kartu ini (diuji: P/L ±1.000.000 menghasilkan keluaran identik).

## Isi kartu (di bawah kartu Beranda bawaan)
| Bagian | Isi |
|---|---|
| **Ringkasan** | Rutinitas hari ini (n/total) · **Beruntun** (hari ber-journal berturut-turut) · **28 hari terakhir** (hari kerja ber-journal / hari kerja yang sudah lewat). Nol ditampilkan "—", bukan "0" |
| **Rutinitas hari ini** | Pre-Market · Checklist pra-trade (disembunyikan bila checklist kosong) · Journal · Review harian, plus **Review mingguan**. Tiap langkah punya status teks (Selesai/Sebagian/Belum) dan tombol yang membuka form/halaman aslinya |
| **Kalender konsistensi** | 5 minggu terakhir, Senin–Minggu. Ketuk hari ber-journal untuk membukanya |
| **Belum dievaluasi** | Hari ber-journal yang review hariannya belum lengkap (terbaru dulu, 3 teratas + "+n lagi"), tombol **Evaluasi** membuka tab Review untuk tanggal itu |
| **Rencana Pre-Market** | Berapa rencana yang sudah direview (bagian After terisi) + daftar yang belum |

## Definisi (semua bisa disetel)
- **Hari ber-journal**: ada dokumen journal pada tanggal itu.
- **Dievaluasi**: review harian `d_{tanggal}` dengan kolom `w`, `x`, `i` terisi semua. Ini sama dengan "Journal Selesai" di Fokus Hari Ini. Sebagian terisi = "Review belum lengkap". Longgarkan lewat `REVIEW_NEED` (atas `trading-rhythm.js`).
- **Rencana direview**: `outlooks/{tanggal}.after` punya isi (actual/happened/change/reflect). Rencana **hari ini** belum dianggap tertunda; baru dihitung bila sudah direview atau setelah harinya lewat.
- **Beruntun**: akhir pekan kosong dan hari ini yang belum diisi **tidak memutus**; hari kerja kosong yang sudah lewat memutus. Journal di akhir pekan tetap dihitung.
- Hari kerja kosong di kalender netral (bukan merah): kartu ini mengajak, tidak menghukum.

## Kalender: isyarat selain warna
Penuh + ✓ = journal + evaluasi · outline + • = journal, belum dievaluasi · garis putus-putus + ◦ = rencana saja · polos = tanpa catatan · cincin tebal = hari ini. Setiap sel punya `aria-label` ("Sen, 26 Okt · Journal + evaluasi").

## Sumber data (semua sudah dimuat aplikasi)
`allJournals`, `allOutlooks`, `users/{uid}/reviews` (satu query baca `where('start','>=', awal kalender)`, disegarkan saat `review-saved`, buka Beranda, atau kembali ke tab; gagal/offline → cadangan localStorage `v2rev:d:*` / `v2rev:w:*`), checklist `v22ckitems` + `v21ck:{tgl}`.

## Aksesibilitas & tampilan
Target sentuh ≥44px untuk tombol, `prefers-reduced-motion`, `prefers-reduced-transparency`, `forced-colors`, gelap + terang, 4 bahasa (id/en/ms/es dari `journalLanguage`), tanpa overflow horizontal di 340px. Di layar sempit (≤380px) teks status disembunyikan secara visual tetapi tetap dibacakan pembaca layar.

## Perubahan pada berkas lama
- `index.html`: satu `<link>` dan satu `<script>` (tidak ada baris lain yang berubah).
- `sw.js`: cache `v16-93-0-trading-rhythm`, dua berkas baru didaftarkan.
- Kartu dipasang sebagai saudara `#hm-root`; padding bawah `.hm` dipindah ke kartu lewat `#view-home.ptr-on` (ruang untuk tab bar tetap sama).

## File
Baru: `trading-rhythm.js`, `trading-rhythm.css`, `design-system/rhythm-preview.html` (halaman uji tanpa login; hari ini dikunci 2026-10-27), `CHANGELOG-v16.93.md`.

## Membatalkan
Hapus `<link href="trading-rhythm.css">` dan `<script src="trading-rhythm.js">`. Tidak ada data yang perlu dibersihkan karena modul tidak menyimpan apa pun.

## Catatan pengujian
Node: 33 pemeriksaan logika murni (batas minggu/bulan/tahun/DST, streak, konsistensi 28 hari, status sel, rencana, review sebagian, P/L diabaikan). Chromium headless via `design-system/rhythm-preview.html` dengan CSS/JS asli: 390px, 340px, desktop 1100px, gelap + terang, 4 bahasa, tombol memanggil `openNewJournalForm` / `openReviewForm` / `editJournal` dengan tanggal yang benar, render ulang saat `review-saved`, tersembunyi saat `journals-error`, 0 error JS. `ambient_guard.py`, `tier_contrast.py`, `glass_contrast.py` lulus.
Belum diuji: **aplikasi penuh dengan login Firebase** (query `reviews` dan Firestore Rules belum dicoba nyata; bila ditolak, kartu otomatis memakai cadangan localStorage), iPhone/Safari fisik, VoiceOver/TalkBack, tampilan bersama mode editorial (`ed-on`) dan header adaptif. Jika tampilan tak berubah, buka ulang aplikasi dua kali (service worker baru).
