# Panduan Deploy: Doa Ibu Journal (PWA)

## Isi folder
- index.html — aplikasi (sudah ditambah manifest, service worker, tombol install)
- manifest.webmanifest — identitas aplikasi
- sw.js — service worker (cache & mode offline sebagian)
- icons/ — ikon aplikasi (ganti dengan logo asli, ukuran sama)
- _headers — pengaturan cache untuk Netlify

## Langkah
1. Upload SELURUH isi folder ini ke hosting HTTPS (Netlify: drag & drop folder di app.netlify.com/drop).
2. Firebase Console → Authentication → Settings → Authorized domains → tambahkan domain baru Anda. Tanpa ini login Google akan gagal.
3. Buka situs di HP (Chrome/Edge): muncul tombol "Install" atau menu ⋮ → "Instal aplikasi".
   iPhone: Safari → Bagikan → "Tambah ke Layar Utama".

## Catatan keamanan
- Firebase apiKey memang publik, tapi keamanan datanya bergantung pada Firebase Security Rules. Pastikan rules Firestore membatasi data per pengguna.
- API key ImgBB terlihat di kode. Siapa pun bisa memakainya. Pertimbangkan membuat key baru dan/atau memindahkan upload lewat backend.

## Fitur baru (v2)
- Ikon & logo: memakai logo Doa Ibu (icons/logo-512.png), tidak lagi bergantung ImgBB.
- Tab **Galeri**: kumpulan semua chart dari Journal (hasil trading) dan Market Outlook (mapping), dikelompokkan per bulan, bisa difilter dan diurutkan terbaru/terlama. Klik foto untuk zoom.
- Tab **Diary**: rencana harian (checklist), mood, dan catatan. Tersimpan di Firestore: users/{uid}/diaries/{tanggal}.

## PENTING: Firestore Security Rules
Diary memakai koleksi baru "diaries". Jika rules Anda hanya mengizinkan "journals" dan "outlooks", diary akan gagal disimpan. Contoh rules yang mencakup semuanya:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /users/{uid} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
          match /{document=**} {
            allow read, write: if request.auth != null && request.auth.uid == uid;
          }
        }
      }
    }

## Fitur baru (v3): Pengingat Journal
- Tombol lonceng di header → atur pengingat: aktif/nonaktif, jam, hari aktif, ulangi tiap 30 menit / 1 jam / 2 jam (maks. 3 kali), pesan kustom, getar, dan tombol "Tes notifikasi".
- Pengingat hanya muncul jika **belum ada journal untuk hari itu**. Begitu journal hari ini tersimpan, banner dan notifikasi otomatis hilang.
- Pengaturan tersimpan di Firestore pada dokumen `users/{uid}` (field `reminder`), jadi ikut ke perangkat lain. Tidak perlu mengubah Security Rules.
- File baru: `reminder-core.js` (logika bersama halaman & service worker). `sw.js` naik ke v3 (jangan lupa upload semua file).

### Cara kerja & batasannya (penting)
1. **Aplikasi terbuka**: banner "Kamu belum mengisi journal hari ini" muncul di dashboard.
2. **Aplikasi di latar belakang**: notifikasi sistem dikirim tepat waktu selama halaman masih hidup.
3. **Aplikasi tertutup**: memakai Periodic Background Sync (Chrome Android, aplikasi sudah diinstal). Browser yang menentukan seberapa sering ini jalan, jadi TIDAK dijamin tepat jam.
4. Untuk pengingat yang benar-benar tepat waktu walau aplikasi tertutup, dibutuhkan push server (Firebase Cloud Messaging + Cloud Functions terjadwal). Itu butuh paket Firebase Blaze.
5. iPhone/iPad: notifikasi hanya berfungsi bila aplikasi sudah ditambahkan ke Layar Utama (iOS 16.4+).
- Pengguna harus mengizinkan notifikasi saat mengaktifkan pengingat. Jika ditolak, banner di dalam aplikasi tetap berfungsi.
- Menekan notifikasi membuka aplikasi langsung ke form journal baru (juga tersedia sebagai shortcut ikon aplikasi).

## Perbaikan tampilan Android
- Tab bar tidak lagi terpotong di kiri/kanan: bisa digeser, ada fade di tepi, dan tab aktif otomatis ke tengah.
- Header lebih ringkas di HP: profil mengisi ruang sisa, tombol Logout jadi ikon, teks "Edit profil" dipersingkat.
- Tanggal "hari ini" kini memakai waktu lokal perangkat (sebelumnya UTC, sehingga jam 00:00-07:00 WIB tanggalnya masih kemarin).

## Tampilan v4: iOS 27 Liquid Glass
- **Font**: memakai SF Pro (font sistem iOS 27) lewat `-apple-system`. Otomatis aktif di iPhone/iPad/Mac. Lisensi Apple tidak mengizinkan SF Pro di-upload ke web, jadi di Android/Windows dipakai **Inter** (padanan terdekat, ada optical size Text ↔ Display seperti SF Pro). Plus Jakarta Sans sudah dilepas.
- **Kaca (Liquid Glass) gaya iOS 27**: blur lebih tebal supaya teks terbaca, tepi gelap tipis, highlight specular lebih terang, rim cahaya di sudut atas-kiri dan bawah-kanan.
- **Gelembung**: tab aktif, tombol emas, tombol + (FAB), chip, dan saklar berbentuk bubble kaca (saklar & slider punya "jempol" kaca memanjang seperti iOS 26/27).
- **Slider Transparansi Kaca** (baru di iOS 27): klik profil di kiri atas → geser "Transparansi Kaca" dari *Jernih* sampai *Pekat*. Tersimpan di perangkat (`localStorage: glassLevel`).
- **Toolbar seragam**: header punya blur bertahap + gradasi saat konten di-scroll di bawahnya, jadi teks tidak bertabrakan.
- **Aksesibilitas**: otomatis patuh pada "Reduce Transparency", "Increase Contrast", dan "Reduce Motion" di pengaturan perangkat.
- **Latar**: orb emas/amber lembut yang bergerak pelan di belakang kaca. Bisa dimatikan dengan menghapus blok `body::before` di CSS.
- Semua gaya baru ada di satu blok CSS di akhir `<style>` (diberi judul "iOS 27 · LIQUID GLASS LAYER"). Ubah `--lg` di `:root` untuk mengatur tingkat kaca bawaan (0 = jernih, 1 = pekat).
- `sw.js` naik ke v4. Upload semua file lagi supaya cache lama terganti.

## v7: Before vs After + Tag Gallery
- **Diary & Review → Before vs After**: pilih tanggal yang punya Market Outlook (Before), isi Actual bias, apa yang terjadi, perubahan market, refleksi (After). Muncul verdict sesuai/meleset dan akurasi bias. Tersimpan di Firestore `outlooks/{tanggal}.after` (rules tidak perlu diubah).
- **Galeri**: tiap chart bisa diberi tag Entry / SL / TP / Liquidity / FVG / OB / MSS / BOS + filter tag. Tersimpan di dokumen `users/{uid}` field `galleryTags`.
- `sw.js` naik ke v7. Upload semua file, lalu hapus cache PWA.

## v9: Sinkron Firestore + tombol Install di header
- **Review (Diary & Review → Review)** kini tersimpan di Firestore: `users/{uid}/reviews/{daily|weekly|monthly}_{tanggal-awal}`. Sebelumnya hanya di localStorage (per perangkat). Review lama di perangkat itu otomatis dimigrasi ke Firestore saat periodenya dibuka.
- **Diary** (`users/{uid}/diaries/{tanggal}`) dan **Before vs After** (`users/{uid}/outlooks/{tanggal}.after`) kini sinkron real-time: perubahan dari perangkat lain muncul otomatis tanpa reload. Pilihan tanggal Before vs After juga mencakup tanggal yang punya journal (tidak harus punya Market Outlook).
- Tombol simpan menampilkan status "Menyimpan…", pesan jelas bila offline, dan pesan khusus bila ditolak Security Rules.
- **Tombol Install** dipindah dari bawah layar ke header (ikon panah unduh di sebelah lonceng). Muncul hanya bila aplikasi bisa dipasang; di iPhone/iPad menampilkan petunjuk "Tambah ke Layar Utama".
- **Security Rules**: koleksi baru `reviews` tercakup oleh rules contoh di atas (`match /{document=**}` di bawah `users/{uid}`). Jika rules Anda menyebut koleksi satu per satu, tambahkan `reviews` dan `diaries`.
- `sw.js` naik ke v9. Upload semua file, lalu tutup dan buka ulang aplikasi (atau hapus cache PWA).

## Update v10/v11 — Checklist kustom & Rekap Evaluasi

**Pre-Trade Checklist bisa diatur sendiri**
- Ketuk **✎ Atur** di kartu Pre-Trade Checklist: ubah teks, hapus, atau tambah poin (maks. 15). Tekan **Selesai** untuk menutup mode edit.
- Tombol **Kembalikan ke bawaan** memulihkan 7 poin awal.
- Tersimpan di localStorage dan disinkronkan ke Firestore pada `users/{uid}.checklistItems` (dokumen yang sama dengan `galleryTags`, jadi **Firestore Rules tidak perlu diubah**).
- Centang harian kini disimpan berdasarkan ID poin, sehingga mengubah urutan/isi checklist tidak merusak data lama.

**Rekap Evaluasi saat aplikasi dibuka**
- Setelah login, muncul popup berisi rangkuman dari Review (kolom "Apa yang salah", "Yang diperbaiki berikutnya", "Apa yang berjalan baik") dan refleksi "After" di Market Outlook, dari hari-hari sebelumnya (refleksi hari ini tidak ikut).
- Poin "Yang diperbaiki" terbaru ditampilkan sebagai **Fokus Hari Ini**.
- Popup muncul sekali per sesi buka aplikasi (dan lagi jika aplikasi ditinggal >30 menit). Ada opsi "Jangan tampilkan lagi hari ini".
- Bisa dibuka manual lewat panel Notifikasi di Dashboard: "📖 Baca rekap evaluasi sebelumnya".
- Membaca koleksi `reviews` dan `outlooks` yang sudah punya izin di Rules.

**v11:** rekap kini juga memuat tulisan hari ini, dan popup tampil langsung saat aplikasi dibuka (dari cache terakhir, lalu disegarkan dari server).

## v12: Rekap evaluasi otomatis saat aplikasi dibuka
- Popup "Rekap Evaluasi" kini muncul **setiap kali aplikasi dibuka/dimuat ulang** (bukan sekali per sesi tab). Tersedia opsi "Jangan tampilkan popup lagi hari ini".
- Kartu **Notifikasi** di Dashboard langsung menampilkan ringkasan (fokus, kesalahan, refleksi, catatan journal, diary, hal yang baik) tanpa perlu dipencet. "Lihat selengkapnya" membuka versi lengkap.
- Sumber data ditambah: catatan journal & diary hari sebelumnya (selain Review dan Refleksi After).
- `sw.js` naik ke v12: upload semua file agar cache lama diganti.

## v13: Pilihan mata uang akun (USD / USC / IDR)
- **Cara mengatur**: klik profil di kiri atas → bagian **Mata Uang Akun** → pilih **USD**, **USC** (US Cent), atau **IDR** (Rupiah). Langsung berlaku di seluruh aplikasi, tanpa perlu menekan Simpan Profil.
- **Tersimpan** di perangkat (`localStorage`) dan disinkronkan ke Firestore pada `users/{uid}.currency` (dokumen yang sama dengan profil, jadi **Firestore Rules tidak perlu diubah**). Login di perangkat lain otomatis memakai pilihan yang sama. Bawaan tetap USD, jadi pengguna lama tidak melihat perubahan sampai memilih sendiri.
- **PENTING: angka tidak dikonversi.** Pilihan ini hanya mengubah simbol dan format. Nilai P/L yang sudah tersimpan tetap apa adanya. Jadi pilih mata uang yang sesuai akun sejak awal; jika mengganti di tengah jalan, data lama akan dibaca sebagai mata uang baru.
- **Format**: USD `+$1,250.00` · USC `+¢12,500.00` · IDR `+Rp 1.250.000` (tanpa desimal, pemisah titik).
- **Anti-glitch untuk angka besar (Rupiah)**:
  - Sel kalender memakai format ringkas: `+988jt`, `-12,3jt`, `-250rb`, `+1,25M` (rb = ribu, jt = juta, M = miliar, T = triliun). Nominal lengkap muncul saat sel di-hover/ditahan (tooltip).
  - Kartu statistik otomatis mengecilkan font agar nominal panjang seperti `+Rp 2.222.088.654` tetap satu baris dan tidak meluber. Bila masih terlalu panjang di layar sangat kecil, teks dipotong dan nominal lengkap ada di tooltip.
  - Sumbu Y grafik memakai format ringkas (`500rb`, `1,5jt`).
  - Kartu Best Day / Worst Day menaruh nominal di atas dan tanggal di baris kecil di bawahnya.
- **Form input**: placeholder menyesuaikan (`150000 atau -80000` untuk IDR), label menampilkan satuan (`P/L Hari Ini (Rp)`), dan di bawah kolom P/L ada **pratinjau langsung** (`= +Rp 1.500.000`) untuk memastikan jumlah nol sudah benar.
- **Lainnya yang ikut menyesuaikan**: kartu journal, breakdown pair/sesi, Max Drawdown, Expectancy, Risk Calculator (label Balance), heatmap, Review, Edge Finder, preview import broker, notifikasi gabung journal, dan PDF export (total). Export CSV/Excel/PDF menambah kolom **Mata Uang**; nilai P/L di CSV/Excel tetap angka mentah.
- `sw.js` naik ke v13. Upload semua file, lalu tutup dan buka ulang aplikasi (atau hapus cache PWA).


## V16.2: Setup Performance (tab Statistik)
- Kartu per setup (dari kolom "Setup / Strategy Tag"): total trade, win/loss, win rate, net P/L, avg win/loss, profit factor, expectancy, avg R, streak terpanjang.
- Breakdown: Setup × Pair, Setup × Session, Setup × Direction (Direction = bias Long/Short; Neutral/campuran tidak ditebak).
- "View Trades" membuka daftar journal/trade pembentuk angka, lengkap dengan tombol "Buka journal".
- Di bawah 10 trade: ditampilkan "Insufficient data" untuk rasio (win rate, PF, expectancy). 10-29 = "Sample kecil", 30+ = "Sample cukup".
- Mode **Eksak** (default): hanya hari dengan satu nilai tunggal. Mode **Inklusif**: hari dengan beberapa setup/pair/session dihitung di tiap nilainya (P/L ganda, ditandai "shared").
- Journal lama hanya punya total per hari, jadi avg win/loss, streak, dan P/L dihitung per hari (diberi label). Avg R = N/A sampai ada data R per trade.
- Tidak ada perubahan skema Firestore; data V15 tidak disentuh. File yang berubah: index.html, v16-stats.js, sw.js (upload ulang semuanya). Tes: `node tests/sp-test.js` (butuh Playwright).

## V16.3: Edge Finder 2.0 (tab Statistik)
- Menggantikan kartu Edge Finder lama. Kombinasi: Pair × Session, Pair × Setup, Setup × Session, Setup × Direction, Session × Hari. Setup × Market muncul hanya jika ada data market per trade.
- Tiap kombinasi menampilkan sample, win rate, net P/L, expectancy, profit factor, avg R (N/A bila tidak ada data R), kalimat deskriptif historis, dan tombol "View Trades".
- Status: Not enough data (<10 trade, rasio disembunyikan), Historical pattern (10–29), Sufficient sample (≥30).
- Filter: tanggal, pair, session, setup, direction; mode Eksak/Inklusif seperti V16.2.
- Tidak ada prediksi atau klaim profit; tidak ada perubahan skema Firestore. File berubah: index.html, sw.js (v16-3). Upload ulang semuanya.

## V16.4: Psychology Analytics + Trading Score (Statistik)
Dua panel baru di tab Statistik, di bawah Edge Finder. Semua angka dihitung dari data kamu, tanpa data dummy.

**Psychology Analytics** (deskriptif, bukan sebab-akibat)
- Emotion × Hasil: jumlah trade, win rate, net P/L, expectancy per emotion tag.
- Emotion × Setup, × Session, × Mistake Tag.
- Kalimat ringkasan berbunyi, misalnya: "Trade yang diberi tag FOMO memiliki win rate 39%." Tidak ada klaim "FOMO menyebabkan loss".
- Kurang dari 10 trade = **Insufficient data**; 10–29 = Sample kecil; 30+ = Sample cukup.
- Mode **Semua tag**: hari dengan beberapa emotion dihitung di tiap tag (ditandai "shared"). Mode **Tag tunggal**: hanya hari dengan satu tag.
- Mistake Tag: journal V15 belum punya field ini, jadi tampil "Insufficient data" sampai ada data `tradeLog[].mistake`.

**Trading Score** (kualitas eksekusi 0–100, P/L tidak masuk hitungan)
| Komponen | Bobot | Sumber data |
|---|---|---|
| Risk Management | 25 | Risk calculator hari itu (sesuai batas = 100, melebihi = 0) |
| Plan Adherence | 20 | Tugas "Rencana hari ini" di Diary yang selesai |
| Entry Quality | 15 | Belum ada data di journal V15 (No data) |
| Exit Management | 15 | Belum ada data di journal V15 (No data) |
| Emotion Control | 15 | Porsi emotion tag non-negatif (Fearful, FOMO, Anxious, Revenge, Greedy, Frustrated = negatif) |
| Checklist Completion | 10 | Checklist pre-trade yang dicentang |
- Komponen tanpa data tidak dihitung dan tidak diberi angka. Skor harian butuh minimal 2 komponen; kurang dari itu tampil Insufficient data.
- Checklist dan Risk calculator tersimpan di perangkat (localStorage), jadi skor memakai data dari perangkat yang sedang dipakai.
- Field opsional per trade bila suatu saat ditambahkan: `tradeLog[].followedPlan`, `entryScore`, `exitScore`, `mistake`, `emotion`.
- `sw.js` naik ke v16-4. Upload semua file, lalu hapus cache PWA.
- Tes: `node tests/ps-test.js` (V16.4) dan `node tests/sp-test.js` (V16.2).

## V16.5 (Prompt 1/2): Dashboard baru + Review Bulanan
- **Dashboard** (tab pertama) kini berisi: 6 KPI (Net P/L, Win Rate, Profit Factor, Expectancy, Max Drawdown, Total Trades), Equity Curve, Monthly Calendar Heatmap, Setup Performance, Edge Finder Insights, Psychology Snapshot, dan Recent Trade Review. Desktop memakai grid 2 kolom, mobile menumpuk kartu.
- Tampilan Dashboard V15 lama (KPI, grafik P/L, filter 7D/30D/90D) **tidak dihapus**: dilipat di bagian "Tampilan Dashboard V15 (klasik)". Risk Calculator dan Pre-Trade Checklist tetap di bawahnya.
- **Review Bulanan** (tab baru): pilih bulan, lihat 14 metrik, catatan "What Went Well" / "What Needs Improvement" yang dihasilkan dari data, dan "Focus for Next Month" yang diisi manual. Catatan fokus tersimpan di `users/{uid}/reviews/focus_{YYYY-MM}` (koleksi `reviews` yang sama dengan Review V9, tidak perlu mengubah Rules) dan di perangkat sebagai cadangan.
- Semua angka dihitung dari journal lewat `v16-stats.js` (fungsi baru: `monthReview`, `dashboardSummary`, `calendarMonth`, `equityByDay`, dst). Tidak ada data dummy dan tidak ada rekomendasi trading otomatis.
- Data yang memang belum dicatat aplikasi (Average R per trade, Mistake Tag) tampil sebagai **N/A / "Belum ada data"**, bukan angka karangan.
- `loadJournals()` kini mengirim event `journals-error` saat gagal, supaya Dashboard bisa menampilkan state error + tombol "Coba lagi".
- Hook untuk Prompt 2 (Global Filter): `window.V165.state.filters = {from,to,pair,session,setup,direction,emotion,tag,result}` lalu `V165.renderAll()`.
- `sw.js` naik ke v16-5. Upload semua file, lalu hapus cache PWA.
- Tes: `node tests/v165-test.js` (modul) dan `node tests/v165-app-test.js` (aplikasi asli vs baseline V16.4).
## V16.5 (Prompt 2/2): Global Filter + Quality Control + Final Polish
- **Global Filter** muncul di atas Dashboard dan Review Bulanan (satu state yang sama). Tombol "Filter" membuka 9 pilihan: Dari tanggal, Sampai tanggal, Pair, Session, Setup, Direction, Result, Tags, Emotion. Pilihan Pair/Session/Setup/Tags/Emotion hanya berisi nilai yang benar-benar ada di journalmu.
- Filter aktif tampil sebagai chip (klik untuk menghapus satu filter) dan ringkasan "Menampilkan X dari Y trade". Tombol **Clear All Filters** menghapus semuanya. Jika tidak ada data yang cocok, muncul empty state dengan tombol Clear All Filters.
- **Sinkron dengan filter Journal V15** (dua arah): tanggal, pair, session, tag, dan arah (Long/Short). Mengubah filter di daftar Journal ikut mengubah Dashboard, dan sebaliknya. Setup, Result, dan Emotion hanya ada di filter global. Arah "Neutral" di daftar Journal tidak punya padanan di Dashboard, jadi tidak dipaksakan. Filter tidak disimpan setelah halaman ditutup (sama seperti filter Journal V15).
- **Journal harian dengan beberapa nilai** (misalnya dua pair): ikut tersaring bila salah satu nilainya cocok, sama seperti filter Journal V15. P/L hari itu dihitung utuh karena tidak ada rincian per trade, dan Dashboard memberi catatan jujur soal ini.
- **Result** memakai P/L: per trade bila ada `tradeLog`, per hari untuk journal harian.
- **QC**: angka journal yang rusak (teks/kosong) dirapikan di memori saat dimuat (Firestore tidak diubah), sehingga V15 klasik dan V16 tidak menampilkan NaN. Ada state loading (skeleton), error (+ Coba lagi, termasuk bila memuat >15 detik), dan empty. Overflow horizontal 2px di Statistik pada layar sempit diperbaiki.
- **Polish**: teks terkecil di modul V16 naik ke 13px, grid filter 3 kolom di desktop dan 2 kolom di mobile, kontrol minimal 40px, fokus keyboard terlihat dan tetap di tempat setelah filter berubah.
- Fungsi baru di `v16-stats.js`: `filterOptions(units)` dan opsi `applyFilters(units, f, {inclusive:true})`. Perilaku default `applyFilters` untuk modul Statistik tidak berubah.
- `sw.js` naik ke v16-5-2. Upload semua file, lalu hapus cache PWA.
- Tes baru: `node tests/v165-filter-test.js` (filter, sinkron V15, state) dan `node tests/v165-audit.js` (audit NaN/overflow/font di semua view V16).

## v16.9: Emas mengkilap, Teal/Coral, Liquid Glass
- **Header emas foil**: semua judul/label berwarna kuning kini memakai gradien emas metalik (palet dari logo) dengan kilau yang bergeser pelan. Mati otomatis bila perangkat memakai "Reduce Motion".
- **Profit = Teal, Loss = Coral**: satu nada untuk seluruh app (teks, chip, bar, grafik, kalender). Mode gelap `#2dd4bf` / `#ff7a68`, mode terang `#0f766e` / `#b83526` (kontras ≥ 4.5:1).
- **Liquid Glass emas**: blur lebih tebal, pita cahaya diagonal, specular kiri-atas, bloom emas kanan-bawah, bingkai emas bercahaya, latar dengan pendar emas ala logo, tombol & tab aktif berbentuk batang emas cair.
- Semua gaya baru ada di blok `<style id="luxe-v169">` di akhir `index.html`. `sw.js` naik ke v16-9-0: upload semua file agar cache lama terganti.


## V16.11
- Before vs After & Review dipindah dari Statistik ke tab **Diary & Review** (logika form sama).
- Perbaikan: checklist pre-trade tidak lagi membuat halaman naik-turun saat dicentang.
- Dihapus: "Tampilan Dashboard V15 (klasik)".
- Lapisan warna baru (aurora lembut, kilau emas, aksen emerald) tanpa mengubah logika.

## v16.12: Halaman awal baru + perbaikan glow hijau
- **Glow hijau tertinggal dihapus**: blob teal/ungu di latar belakang (`#vibe-ambient`) diganti hangat/emas redup, tint teal pada kartu kaca & hero statistik dihapus. Efek glow pada angka profit/loss tetap ada, tetapi hanya di teks (radius kecil), tidak menyebar ke background sel kalender.
- **Landing page baru**: preview aplikasi (data ilustrasi), siklus 4 langkah (Rencanakan, Catat, Evaluasi, Perbaiki), kartu semua fitur, panel "Cara Mengisi" (Sebelum Trade, Setelah Trade, Refleksi) berisi daftar isian + contoh, 3 kebiasaan trader, dan tombol CTA.
- Teks landing tersedia lengkap dalam Indonesia & English. Melayu memakai teks Indonesia dan Español memakai teks English (terjemahan penuh bisa ditambah di objek `LP_ID` / `LP_EN` lalu salin ke `I18N.ms` / `I18N.es`).
- `sw.js` naik ke v16-12-0. Upload semua file, lalu tutup & buka ulang PWA agar cache lama terganti.

## v16.12.1: Rotasi layar
- `manifest.webmanifest`: `"orientation"` diubah dari `portrait` menjadi `any`, sehingga aplikasi yang di-install bisa berputar otomatis ke landscape mengikuti perangkat. Tidak ada kode yang mengunci orientasi di `index.html`.
- **Penting:** Android menyimpan manifest saat aplikasi di-install. Hapus aplikasi lama dari layar utama lalu install ulang dari browser agar pengaturan baru terpakai. Pastikan juga "Putar otomatis" aktif di HP/tablet.
- `sw.js` naik ke v16-12-1.

## v16.12.2: Tampilan kalender baru
- Kalender kini berbentuk kartu bulan (judul, **P/L Bulanan**, tombol ‹ ›), grid hari dengan P/L + jumlah trade, badge **Hari ini**, dan kolom **Pekan** (total P/L & jumlah trade per baris, hanya menghitung hari di bulan yang sedang dilihat).
- Ikon bintang di tiap tanggal untuk menandai hari penting. Tanda bintang disimpan di perangkat/browser ini saja (localStorage, per akun), tidak ke Firestore.
- Tidak ada perubahan data/Firestore. Responsif: di HP angka memakai format ringkas.
- `sw.js` naik ke v16-12-2. Upload semua file, lalu tutup & buka ulang PWA agar cache lama terganti.

## v16.13: Journal "Satu Pintu, Dua Bagian"
Tombol **+** membuka satu form dengan dua tab terpisah:
- **Pre-Market** (sebelum trade): prediksi, alasan, chart outlook. Punya tombol **Simpan Pre-Market** sendiri dan hanya menyimpan outlook.
- **Journal Trade** (setelah trade), 3 langkah dengan indikator `1 / 3`: 01 Trade (P/L, pair, arah, setup, Win/Loss, akun, sesi) → 02 Psikologi → 03 Refleksi (lesson learned + chart). Tombol **Simpan Journal** muncul di langkah 3.
- Tanggal dipakai bersama oleh kedua bagian (di atas tab).
- Tab awal otomatis: Pre-Market bila outlook tanggal itu belum ada; Journal Trade bila sudah ada atau saat mengedit journal.
- Simpan Journal tidak lagi menimpa Pre-Market, kecuali bagian Pre-Market memang diubah pada sesi form yang sama.
- Wajib hanya di langkah Trade: tanggal, Win/Loss, Long/Short (mode edit tidak dipaksa ulang). Enter = lanjut, bukan simpan.
- Struktur data Firestore tidak berubah. Tes: `node tests/wizard-test.js`. `sw.js` naik ke v16-13-0: upload semua file.


## Fitur baru (v16.17): Trade Stack (opsi tampilan journal)
- Di Dashboard → Riwayat Journal ada sakelar **Daftar | Stack**. Pilih **Stack** untuk mengganti daftar journal dengan kartu bertumpuk: geser kiri/kanan (atau tombol ‹ ›, panah keyboard) untuk berpindah, ketuk kartu untuk membaliknya (catatan, tag, emosi, chart, Edit/Hapus).
- Pilihan tampilan tersimpan di perangkat. Stack mengikuti Filter & Sort yang aktif di dashboard. Satu kartu = satu entri journal (per hari).
- Hanya membaca data yang ada, jadi tidak perlu mengubah Firestore Rules. File baru: `trade-stack.js`; `sw.js` naik ke v16-17 (upload semua file).

## Fitur baru (v16.18): Automatic Trade Summary
- Setelah **Simpan Journal**, muncul kartu **Trade Summary** berisi ringkasan satu paragraf, contoh: "Kamu mengambil setup Breakout pada sesi London dengan risk 1%. Trade ditutup pada +2.1R. Evaluasi trade kamu hari ini adalah ★★★★☆." Ringkasan yang sama tampil di tiap kartu Riwayat Journal dan di sisi belakang kartu Trade Stack.
- Tiga field baru (semua opsional): **Risk per trade (%)** dan **Hasil (R)** di langkah 01 Trade, **Evaluasi trade hari ini** (1-5 bintang) di langkah 03 Refleksi. Disimpan di dokumen journal sebagai `riskPct`, `rMultiple`, `rating`. Tidak perlu mengubah Firestore Rules.
- Ringkasan hanya memakai data yang diisi. Bagian yang kosong dilewati (tanpa R dipakai P/L; tanpa bintang kalimat evaluasi dihilangkan). Journal lama tetap punya ringkasan dari setup, sesi, dan P/L.
- Jika satu tanggal diisi lebih dari sekali, setiap isian menjadi **trade tersendiri** di halaman tanggal itu (lihat bagian "Journal seperti buku"). R, risk, dan bintang tersimpan per trade; total harian dihitung otomatis.
- File baru: `trade-summary.js`; `sw.js` naik ke v16-18 (upload semua file, lalu tutup & buka ulang PWA).

## v16.21: Navigasi premium (mobile)
- **Dock bawah 5 slot**: Dashboard · Kalender · Statistik · Diary · Menu. Tab aktif ditandai warna emas dan satu garis emas di tepi atas dock yang berpindah mengikuti tab.
- **Menu** (sheet dari bawah): Review Bulanan, Galeri, Tentang Kami, pengaturan cepat (Tema, Bahasa, Pasang aplikasi bila tersedia) dan Keluar. Tutup dengan ketuk area gelap, geser ke bawah, atau Esc.
- **Header mobile** hanya berisi profil, lonceng, dan pengaturan. Tema/bahasa/logout/install pindah ke Menu.
- Dock turun otomatis saat keyboard muncul. Mengikuti mode gelap/terang, 4 bahasa, dan "Reduce Motion/Transparency".
- **Fungsi tidak diubah**: dock hanya memanggil `.click()` pada tombol asli (`#nav-*`, `#btn-theme-toggle`, `#btn-logout`, `#btn-install`, `#app-language`). Tampilan desktop/tablet (>640px) sama seperti sebelumnya.
- Kode baru ada di `<style id="nav-premium-v17">` dan `<script id="nav-premium-v17-js">` di `index.html`. `sw.js` naik ke v16-21-nav: upload semua file, lalu tutup dan buka ulang aplikasi.
- Mengembalikan ke versi lama: hapus dua blok tersebut; bar lama otomatis tampil lagi.

## v16.22: Strategy Library
**Halaman baru "Strategy Library"** (tab di desktop; di HP ada di sheet **Menu**).
- Buat strategy: **Nama**, **Deskripsi**, **Entry Checklist** (tiap rule bisa **Wajib** atau **Opsional**, bisa diurutkan), **Invalidation Rules**, **Exit Rules**.
- Per strategy: Edit, Duplikat, Arsipkan (hilang dari pilihan journal, data lama aman), Hapus. Ada pencarian dan tab Aktif/Arsip.
- Template awal untuk memulai: *Breakout Retest* dan *ICT · IFVG* (hanya mengisi form, tidak tersimpan otomatis).
- Kartu strategy menampilkan statistik dari journal kamu: jumlah trade, win rate (baru tampil bila >= 10 trade), kepatuhan rata-rata, net P/L. Di "Lihat aturan" ada perbandingan hasil saat semua rule tercentang vs ada yang terlewat (butuh >= 10 trade per kelompok, deskriptif, bukan sebab-akibat).
- Hari journal yang memakai lebih dari satu strategy tidak ikut dihitung P/L-nya (tidak ada rincian P/L per trade); diberi catatan di kartu.

**Terhubung ke Journal Trade** (langkah 01 Trade, di bawah Setup / Strategy Tag):
- **Strategy Digunakan**: pilih strategy. Nama strategy otomatis ditambahkan ke Setup / Strategy Tag (tag yang kamu tulis sendiri tidak pernah dihapus), jadi **Setup Performance** dan **Edge Finder** otomatis ikut menghitung strategy ini.
- **Strategy Compliance**: centang rule yang terpenuhi, ada penghitung `2/2 Tercentang`, label WAJIB/OPSIONAL, tombol Centang semua/Kosongkan, dan pengingat Invalidation & Exit.
- Rule wajib yang belum dicentang **tidak memblokir simpan**: dicatat jujur sebagai rule yang terlewat (itu inti pelajarannya).
- Tombol **+ Strategy baru** di form journal membuka editor di atas form tanpa kehilangan isian, lalu strategy baru langsung terpilih.
- Kartu Riwayat Journal menampilkan chip strategy dengan kepatuhan (hijau = lengkap, merah = ada rule wajib terlewat).

**Data & keamanan**
- Firestore baru: `users/{uid}/strategies/{id}`. Rules contoh di atas (`match /{document=**}` di bawah `users/{uid}`) sudah mencakupnya. Jika rules kamu menyebut koleksi satu per satu, tambahkan `strategies`.
- Journal menyimpan field baru (opsional): `strategyId`, `strategyName`, `strategyLog` (salinan rule + status centang saat trade dicatat). Jadi riwayat tidak berubah walau strategy nanti diedit atau dihapus. Journal lama tetap berfungsi tanpa perubahan.
- Satu hari dengan beberapa entry menggabungkan `strategyLog` (maks. 30 entri). Saat edit, hanya entri strategy terakhir yang diganti.
- File baru: `strategy-library.js`. Perubahan kecil di `index.html` (tab, container, simpan/edit journal, chip kartu, entri Menu mobile) dan `sw.js` (v16-22-strategy). Upload semua file lalu tutup dan buka ulang aplikasi.
- Tes: `node tests/sl-test.js` (butuh Playwright).

## Fitur baru (v16.24): Personalisasi Dashboard
Tombol **⚙ Atur Dashboard** (kanan atas judul Dashboard) membuka panel pengaturan:
- **Posisi kartu**: tombol ▲ ▼ menaikkan/menurunkan kartu di dalam grupnya.
- **Penempatan tiap kartu**: *Utama* (langsung terlihat), *Detail* (dilipat di "Analisis lengkap", dibuka saat butuh), atau *Sembunyi*. Fokus Hari Ini dan Statistik Utama hanya bisa Utama/Sembunyi.
- **Informasi utama**: tiap statistik (Net P/L, Win Rate, Profit Factor, Expectancy, Max Drawdown, Total Trades) bisa ditandai **★ Utama** (maks. 4, tampil ringkas di kartu "Statistik Utama"), **Detail** (ikut kartu "Statistik Lainnya"), atau **Sembunyi**.
- **Kembalikan default** (ketuk dua kali) memulihkan tampilan awal. Tampilan awal = tampilan sebelum fitur ini.

Catatan teknis
- Hanya mengatur tampilan; semua angka tetap dihitung `V16Stats` dari journal.
- Disimpan di `localStorage` (kunci `v24dash:<uid>`) dan dicadangkan ke Firestore pada dokumen `users/{uid}`, field `dashLayout` (versi dengan `ts` terbaru yang dipakai). Rules yang sudah ada untuk `users/{uid}` sudah cukup; bila Firestore menolak, pengaturan lokal tetap berjalan.
- Kartu/ statistik baru di masa depan: tambahkan ke `CARD_DEFS` / `KPI_DEFS` (di `index.html`, modul V16.5). Pengaturan lama otomatis dilengkapi, id jangan diubah.
- Tes: `node tests/v24-dash-test.js` (modul) dan `node tests/v24-app-test.js` (aplikasi penuh, stub Firebase).

## Fitur baru (v16.25): AI Trading Coach
**Halaman baru "AI Coach"** (tab di desktop; di HP ada di sheet **Menu**, di bawah Strategy Library). Asisten evaluasi yang membaca riwayat journal dan membantu menemukan kebiasaan yang perlu diperbaiki. **Analisis berjalan lokal di perangkat, tanpa AI eksternal dan tanpa panggilan jaringan.**

- **Evaluasi Mingguan**: pilih pekan (Senin–Minggu) dengan tombol panah. Isinya Net P/L, win rate, jumlah trade, hari journal, pembanding dengan pekan lalu, serta daftar "Berjalan baik" dan "Perlu diperbaiki" (hari terbaik/terburuk, setup, emosi negatif, mistake tag, rule wajib yang terlewat, streak loss, tag yang belum lengkap). Pekan dengan di bawah 10 trade diberi label **sampel kecil**.
- **Pola Kerugian Berulang**: kelompok trade yang net P/L dan expectancy-nya negatif (min. 10 trade dan 3 loss) berdasarkan Setup, Pair, Sesi, Emosi, Mistake, Hari, Arah, serta kombinasi (Setup × Sesi, Setup × Pair, Pair × Sesi). Ditambah tiga pola perilaku: **hari beremosi negatif**, **hari dengan trade jauh di atas biasanya**, dan **rule wajib strategy yang terlewat** (min. 5 hari). Rentang bisa 30 hari / 90 hari / Semua. Pola yang memuat trade persis sama digabung jadi satu ("Trade yang sama juga cocok dengan: …").
- **Setup Terbaik**: setup dengan net P/L dan expectancy positif (min. 10 trade), plus kombinasi yang menonjol. Bila tag setup baru terisi di bawah 60% trade, muncul catatan untuk melengkapinya.
- **Fokus Latihan Berikutnya**: maksimal 3 saran **kebiasaan (proses)**, bukan sinyal entry/exit: centang semua rule wajib, batasi trade per hari, jeda saat emosi negatif, telaah ulang pola tertentu, lengkapi tag, atau menjaga konsistensi journal. Tekan **Jadikan fokus** untuk melacaknya: kartu fokus aktif menampilkan angka pekan ini terhadap target (Tercapai / Belum). Fokus tanpa angka (telaah ulang) ditandai "Dinilai manual".
- **Ngobrol dengan AI**: percakapan AI sungguhan **belum aktif**, karena butuh integrasi model. Sementara itu ada tombol **Salin ringkasan** (hanya angka agregat, tanpa catatan, chart, atau link) untuk ditempel ke asisten AI pilihanmu.

**Aturan jujur (sama seperti V16.x)**
- Semua angka dihitung dari journalmu lewat `V16Stats`. Tidak ada data dummy; bagian tanpa data tampil kosong/N/A.
- Di bawah 10 trade tidak ada pola. 10–29 = "Sampel kecil", 30+ = "Sampel cukup".
- Deskriptif, bukan sebab-akibat. Journal harian lama yang mencantumkan beberapa setup tidak ditebak (mode Eksak, seperti V16.2).

**Data & keamanan**
- Hanya fokus latihan yang kamu pilih yang disimpan: `localStorage` (`aicoach:<uid>`) dan dicadangkan ke Firestore `users/{uid}`, field `coachFocus` (versi dengan `ts` terbaru dipakai). Rules untuk `users/{uid}` yang sudah ada cukup; bila Firestore menolak, pengaturan lokal tetap jalan. Journal tidak diubah.
- **Jangan menaruh API key model AI di `index.html` atau file JS lain**: kodenya publik. Bila nanti ingin percakapan AI sungguhan, panggil model lewat backend/Cloud Function milikmu sendiri, dan kirim hanya ringkasan agregat seperti yang dihasilkan tombol Salin ringkasan.

**File**
- Baru: `ai-coach.js` (mesin analisis, bisa dites di Node), `ai-coach-ui.js` (halaman dan interaksi).
- Berubah: `index.html` (tab "AI Coach", container, entri Menu mobile, ikon, dua tag script), `sw.js` (v16-25-ai-coach). Upload semua file lalu tutup dan buka ulang aplikasi.
- Tes: `node tests/coach-test.js` (mesin, tanpa Playwright) dan `node tests/coach-app-test.js` (aplikasi penuh dengan Firebase di-stub, butuh Playwright).
- Mengembalikan ke versi sebelumnya: hapus tombol `#nav-coach`, container `#coach-section`, `'coach'` di `VIEW_SECTIONS` dan `SHEET`, serta dua tag script.

## v16.26: Strategy Playbook
**Strategy Library naik kelas menjadi "Strategy Playbook"**: bukan sekadar catatan, tapi standar yang bisa dinilai dari journal kamu sendiri. Strategy lama otomatis tetap berfungsi; semua field baru opsional.

**Yang baru di tiap strategy**
- **Stop Loss** dan **Target / Take Profit** (selain Entry Checklist, Invalidation, Exit yang sudah ada).
- **Angka standar**: Minimal RR (cth. 2 berarti 1:2), Risiko maks. per trade (%), dan Target kepatuhan (%, bawaan 80).
- **Checklist per grup**: tiap rule bisa dimasukkan ke Setup, Entry, Risiko (SL/TP), atau Manajemen & Exit. Grup tampil sebagai sub-judul di Playbook dan di form journal (hanya bila rule-nya lebih dari satu grup). Tetap ada Wajib/Opsional.
- **Contoh Setup (screenshot)**: sampai 6 screenshot **Setup Valid** dan 6 **Setup Tidak Valid**, masing-masing dengan catatan singkat. Gambar diunggah ke imgbb (sama seperti chart di journal), screenshot besar otomatis dikecilkan dulu. Tap gambar untuk memperbesar. Label VALID / TIDAK VALID selalu tertulis, bukan hanya warna.
- Template Breakout Retest dan ICT sudah berisi grup, stop loss, target, dan angka standar.

**Kartu strategy**
- Bar **kepatuhan** dengan garis emas = target kamu.
- Tombol **Lihat aturan** sekarang punya 3 tab: **Aturan** (checklist per grup, invalidasi, SL, target, exit), **Contoh Setup** (galeri valid vs tidak valid), **Evaluasi**.

**Tab Evaluasi: aturan vs aktual** (semua dihitung lokal dari journal)
- **Kepatuhan rata-rata** vs target.
- **Hari dengan semua rule wajib tercentang** vs target.
- **Risiko per trade** (kolom Risk % di journal) vs batas risiko maks., plus berapa hari yang melebihi batas.
- **Reward:Risk saat menang** vs Minimal RR. Dihitung dari hari dengan 1 trade dan R positif, jadi hasilnya jujur per trade.
- Status **Sesuai / Belum sesuai** hanya muncul bila datanya cukup (kepatuhan >= 5 journal, risiko dan RR >= 3 data). Selain itu tertulis **Data belum cukup**.
- **Kepatuhan per rule**: rule yang paling sering terlewat ada di paling atas dan diberi tanda **Sering terlewat**.
- Tren 10 journal terakhir vs semua, serta perbandingan hasil saat semua rule tercentang vs ada yang terlewat (tetap deskriptif, butuh >= 10 trade per kelompok).

**Ringkasan di atas halaman**: panel **Kepatuhan per setup** menampilkan semua strategy aktif berdampingan dengan bar dan target masing-masing.

**Di form Journal**: checklist tampil per grup. Bagian "Invalidasi & exit" kini juga memuat Stop Loss, Target, batas RR/risiko, dan thumbnail contoh setup sebagai rujukan visual sebelum entry.

**Data**
- Firestore `users/{uid}/strategies/{id}` mendapat field opsional: `stopLoss`, `target`, `minRR`, `maxRisk`, `targetComp`, `examples:[{id,url,kind,caption}]`, dan `checklist[].group`. `strategyLog[].items[]` ikut menyimpan `group`. Tidak perlu mengubah Firestore Rules.
- Journal lama tetap berfungsi. Journal yang dicatat sebelum v16.26 dianggap grup Entry.
- File yang berubah: `strategy-library.js`, `index.html` (label tab jadi Strategy Playbook), `sw.js` (v16-26-playbook). Upload semua file lalu tutup dan buka ulang aplikasi.
- Tes: `node tests/pb-test.js` (butuh Playwright). Tes lama `tests/sl-test.js` tetap lulus.

## v16.27: Premium Experience
Lapisan tampilan tambahan: dark luxury gold, kaca transparan, aksen profit/loss. Tidak mengubah data, perhitungan, atau Firestore.

- **File baru:** `premium.css`, `premium.js`. Dimuat paling akhir di `index.html`. Hapus dua baris itu (dan class `px` di `<body>`) untuk kembali persis ke v16.26.
- **Dashboard:** hierarki lebih jelas. Judul tidak lagi emas (emas hanya untuk aksi dan status aktif), hero Fokus Hari Ini lebih ringkas, tombol aksi tidak lagi setinggi layar.
- **Grafik equity:** pilihan rentang 7H / 30H / 90H / 1T / Semua (hanya rentang yang punya ≥2 hari trading dan berbeda dari Semua yang tampil), nilai besar yang ikut berubah saat disentuh atau di-hover, dan navigasi keyboard (panah, Home, End, Esc). Angka periode dihitung ulang dari awal rentang.
- **Perpindahan halaman:** transisi lembut searah urutan tab; otomatis nonaktif bila perangkat memakai "kurangi gerakan".
- **Skeleton, empty, error:** satu bahasa visual. Kalender, Statistik, dan Galeri menampilkan skeleton saat data dimuat; bila gagal atau lebih dari 15 detik muncul pesan error/offline dengan tombol "Coba lagi". Semua `alert()` bawaan browser diganti toast (info emas, berhasil profit, gagal loss).
- **Mobile:** tombol + pindah ke kanan dan menyingkir saat menggulir turun; label dock minimal 11px; input form minimal 48px dengan font 16px.
- **Ukuran teks:** Pengaturan > Ukuran teks (Standar / Nyaman), tersimpan di perangkat. Tidak ada teks fungsional di bawah 12px.
- **Service worker:** `v16-27-premium`. Upload semua file, lalu tutup dan buka ulang aplikasi sekali.
- **Tes:** `PLAYWRIGHT_PATH=<path playwright> node tests/premium-test.js` (memakai `tests/premium-harness`, Firebase di-stub, tanpa jaringan).

## v16.28: Trading Wrapped
**Halaman baru "Trading Wrapped"** (tab di desktop; di HP ada di sheet **Menu**, di bawah AI Coach). Laporan visual **mingguan, bulanan, dan tahunan** dari journalmu, berupa 8 kartu vertikal (1080x1920) yang bisa digeser, dibuka lewat titik, atau dengan tombol panah kiri/kanan di keyboard. **Semua dihitung lokal dari journal, tanpa data dummy dan tanpa panggilan jaringan.**

**Isi kartu**
1. **Sampul**: periode, jumlah trade, hari journal, win rate. Periode yang masih berjalan diberi label.
2. **Hasil**: Net P/L, selisih dibanding periode sebelumnya, win rate, profit factor, expectancy, max drawdown, dan kurva P/L.
3. **Terbaik & terburuk**: laporan tahunan menampilkan **bulan** terbaik/terburuk (12 batang); laporan mingguan dan bulanan menampilkan **hari** terbaik/terburuk. Terbaik hanya bila net > 0, terburuk hanya bila net < 0 dan ada minimal 2 periode.
4. **Setup performa terbaik**: maks. 3 setup dengan net positif dan minimal 3 trade di periode itu, lengkap dengan win rate, label sampel, dan angka **sepanjang riwayat**. Historis, bukan prediksi.
5. **Emosi & kesalahan**: emosi dan mistake tag yang paling sering, plus jumlah hari beremosi negatif dan net P/L hari itu.
6. **Konsistensi & kepatuhan**: hari journal per pekan dan kepatuhan rule, masing-masing dibanding periode sebelumnya, plus persentase hari dengan semua rule wajib tercentang.
7. **Target tercapai**: hanya target yang benar-benar bisa dinilai. (a) Kepatuhan per strategy vs **Target kepatuhan** di Strategy Playbook (butuh >= 5 hari, selain itu "Data belum cukup"). (b) **Fokus AI Coach** yang kamu pilih, dinilai per pekan (berapa pekan tercapai). Fokus tanpa angka ditandai "Dinilai manual". Tanpa target, kartu menjelaskan cara mengaturnya.
8. **Fokus perbaikan berikutnya**: maks. 3 saran **kebiasaan (proses)** dari mesin AI Coach (bukan sinyal entry/exit), ditambah catatan "Focus for Next Month" dari Review Bulanan (hanya untuk laporan bulanan).

**Ekspor**
- **Simpan gambar**: PNG 1080x1920 untuk kartu yang sedang dibuka. **Bagikan** muncul bila perangkat mendukung berbagi file. **Unduh PDF**: semua kartu, satu kartu per halaman.
- Dibuat di perangkat (tanpa upload). PDF memakai library jsPDF yang sudah dimuat aplikasi; bila belum termuat (offline), muncul pesan dan kamu bisa mencoba lagi.
- Di bawah kartu ada **Lihat sebagai teks** (ringkasan 9 baris) untuk pembaca layar dan salin cepat.

**Aturan jujur (sama seperti V16.x)**
- Bagian tanpa data tampil N/A atau penjelasan, bukan angka karangan. Di bawah 10 trade diberi label sampel kecil.
- Deskriptif dan historis, bukan sebab-akibat dan bukan saran trading.
- Berpindah jenis laporan memakai hari journal terakhir pada laporan yang sedang dibuka sebagai patokan. Panah hanya melompat ke periode yang punya journal (ditambah periode berjalan).

**Data & keamanan**
- Tidak ada yang ditulis: Trading Wrapped hanya **membaca** journal, strategy (`StrategyLib.list()`, getter baru baca-saja), fokus AI Coach (`aicoach:<uid>` / `users/{uid}.coachFocus`), dan catatan fokus bulanan (`v165focus:<YYYY-MM>` / `reviews/focus_<YYYY-MM>`). Tidak perlu mengubah Firestore Rules.

**File**
- Baru: `trading-wrapped.js` (mesin + kartu SVG, bisa dites di Node), `trading-wrapped-ui.js` (halaman dan ekspor).
- Berubah: `index.html` (tab, container, entri Menu, ikon, dua tag script), `strategy-library.js` (getter `list`), `premium.js` (urutan transisi tab), `sw.js` (`v16-28-wrapped`). Upload semua file lalu tutup dan buka ulang aplikasi sekali.
- Kembali ke v16.27: hapus tombol `#nav-wrapped`, container `#wrapped-section`, `wrapped` di `VIEW_SECTIONS`, `SHEET`, dan `premium.js`, serta dua tag script.
- Tes: `node tests/wrapped-test.js` (mesin + kartu, tanpa browser). Tes aplikasi penuh: `FB_OUT=/tmp/fb.js node tests/wrapped-make-stub.js && FB_OUT=/tmp/fb.js python3 tests/wrapped-app-test.py` (Playwright Python, Firebase di-stub, jsPDF tiruan).


## Halaman awal v16.29 (hero, pratinjau, transisi)
- **Hero**: judul besar (hingga ±78px), satu tombol utama "Mulai Journaling"; "Lihat Fitur & Cara Pakai" kini tautan teks sekunder. Preview berbentuk dashboard aplikasi (tab, Net P/L + kurva, win rate ring, profit factor, streak, kalender).
- **Pratinjau hidup**: bagian baru `#lp-preview` (kurva P/L kumulatif, P/L per hari, ringkasan performa). Semua kartu berlabel **DEMO**; angkanya ilustrasi statis, bukan data siapa pun. Grafik tampil dengan efek wipe singkat saat di-scroll.
- **Data nyata setelah login**: dashboard menampilkan data Firestore pengguna seperti biasa; sapaan singkat (toast) "Selamat datang kembali, <nama> · P/L bulan ini ..." muncul hanya sesudah login baru, bukan tiap buka ulang.
- **Transisi**: landing ↔ login ↔ app memakai fade ±150 ms keluar / ±240 ms masuk (`swapScreen`). Tidak ada splash. Bila ada sesi Firebase tersimpan, landing tidak sempat berkedip: garis emas tipis di atas layar menggantikannya (batas aman 3 detik). `prefers-reduced-motion` → semua perpindahan instan, grafik langsung penuh.
- Teks baru ada di `LP2_ID` / `LP2_EN` (ms memakai ID, es memakai EN, sama seperti pola LP sebelumnya). `sw.js` naik ke `v16-29-landing`; upload semua file.

## Fitur baru (v16.30): Personalized Workspace
Dashboard kini bisa dibentuk sesuai gaya trading. Dibangun di atas "Atur Dashboard" v16.24 (pilih kartu, urutan, statistik utama), yang tetap ada dan kini bernama **⚙ Atur Workspace**.

**Di Dashboard (di bawah judul)**
- **Chip preset**: *Standar* · *Scalping* · *Intraday* · *Swing* · preset buatanmu. Satu ketukan menyusun ulang kartu, statistik utama, dan kepadatan. Chip aktif memakai tanda **diubah** bila kamu sudah menggeser sesuatu dari susunan aslinya.
- **Ringkas | Lengkap**: *Ringkas* = lebih padat (subjudul kartu dan keterangan kecil disembunyikan, grafik equity lebih pendek, Recent Trade 3 hari, Setup 3 baris, Edge 2 pola, hero hari ini tanpa trio statistik). *Lengkap* = tampilan seperti sebelumnya. Peringatan data (mis. "N trade tidak masuk karena tanpa tag") tetap tampil di kedua mode.

**Di panel Atur Workspace**
- **Preset**: kartu Standar/Scalping/Intraday/Swing + **Preset saya**. Simpan susunan aktif lewat kolom nama di bagian bawah panel (maks. 4 preset sendiri; nama yang sama menimpa; nama preset bawaan ditolak). Hapus dengan ✕ lalu ketuk **Yakin?**.
- **Urutan**: tahan pegangan ⠿ di kiri tiap kartu lalu geser (mouse, jari, atau pena). Tombol ▲ ▼ tetap tersedia untuk keyboard.
- **Kembalikan default** hanya memulihkan susunan; preset buatanmu tidak ikut terhapus.

**Isi preset bawaan** (susunan tampilan, bukan saran trading)
| Preset | Kartu utama (berurutan) | Statistik utama | Tampilan |
|---|---|---|---|
| Scalping | Hari Ini, Statistik, Recent, Equity, Psikologi | Win Rate, Expectancy, Max Drawdown, Total Trades | Ringkas |
| Intraday | Hari Ini, Statistik, Equity, Kalender, Recent | Net P/L, Win Rate, Profit Factor, Expectancy | Lengkap |
| Swing | Hari Ini, Statistik, Equity, Kalender, Setup, Edge Finder | Net P/L, Profit Factor, Expectancy, Max Drawdown | Lengkap |

Catatan teknis
- Pengaturan naik ke **versi 2** (`v: 2`): field baru `mode` (`full`/`compact`), `preset` (id aktif), `custom` (daftar preset sendiri, tiap item = urutan + penempatan + statistik + mode). Data v1 lama otomatis dimigrasi tanpa kehilangan pengaturan; data rusak dibersihkan oleh `normLayout`. Tersimpan di `localStorage` (`v24dash:<uid>`) dan Firestore `users/{uid}.dashLayout` (rules yang sama).
- Preset bawaan didefinisikan di `BUILTINS` (modul V16.5 di `index.html`) lewat `mkSnap(...)`; tambah/ubah di sana. Id preset jangan diganti.
- Semua angka tetap dihitung `V16Stats`; preset dan mode hanya mengubah tampilan.
- API untuk uji: `V165.layout.apply(id)`, `.setMode(m)`, `.save(nama)`, `.remove(id)`, `.state()`, `.presets()`.
- `sw.js` naik ke `v16-30-workspace`; upload semua file lalu tutup dan buka ulang aplikasi.
- Tes: `node tests/v30-workspace-test.js` (preset, kepadatan, preset sendiri, drag, migrasi v1). `tests/v165-harness.js` kini ikut memuat CSS personalisasi.

## Pembaruan tampilan (v16.31): Rekap Evaluasi
Tampilan notifikasi rekap evaluasi dirombak agar senada dengan kartu dashboard terbaru (emas, kaca, kapsul). Data, sumber rekap, dan perilaku buka otomatis tidak berubah.

**Kartu di panel Notifikasi (Dashboard)**
- Kepala kartu: medali ikon, judul, dan *Update terakhir · Kemarin*, plus tombol **Buka**.
- **Fokus hari ini** tampil sebagai kartu emas besar (diambil dari "Yang diperbaiki berikutnya" terbaru).
- **Jangan diulang** dan **Pertahankan** berdampingan (merah / hijau), tiap kartu menampilkan maksimal 3 baris.
- Kapsul pintasan **Refleksi · Journal · Diary** beserta jumlahnya. Semua kartu dan kapsul bisa diketuk dan popup langsung terbuka di bagian yang dipilih.
- Notifikasi lain (reminder journal, weekly/monthly review, risk limit) kini berupa baris kapsul seragam. Bila belum ada rekap, tampil tombol *Rekap evaluasi*.

**Popup Rekap Evaluasi**
- Kartu **Fokus hari ini** di atas, lalu **tab filter** (Semua · Jangan diulang · Perbaiki · Pertahankan · Refleksi · Journal · Diary) dengan jumlah per bagian. Tab hanya muncul untuk bagian yang ada isinya.
- Isi tiap bagian berbentuk **timeline**: titik berwarna per kategori, label tanggal relatif (*Hari ini*, *Kemarin*, atau *9 Okt*) dan label periode (*Mingguan*/*Bulanan*).
- Footer tetap di bawah (tidak ikut tergulir): saklar *Jangan tampilkan popup lagi hari ini* dan tombol **Saya sudah baca**.
- Mendukung tema terang dan gelap, bottom sheet di layar kecil, `prefers-reduced-motion` dan `prefers-reduced-transparency`. Fokus kembali ke tombol pemicu saat popup ditutup.

Catatan teknis
- Semua gaya ada di `<style id="recap-v31">` (di bawah `nav-premium-v17`). Id lama `#v22-recap`, `#v22-x`, `#v22-ok`, `#v22-off` dipertahankan.
- API: `DoaRecap.open(bagian?)` (bagian: `x` `i` `w` `R` `J` `Y`), `DoaRecap.inline()`, `DoaRecap.empty()`.
- `sw.js` naik ke `v16-31-recap`; upload semua file lalu tutup dan buka ulang aplikasi.
- Tes: `node tests/v31-recap-test.js` (popup, filter tab, kartu Notifikasi, empty-state, fokus, 3 lebar layar × gelap/terang).

## Beranda (v16.33)
- Setelah login, aplikasi membuka tab **Beranda**: sapaan, langkah berikutnya, ringkasan bulan ini, akses cepat (Journal Baru, Galeri Chart, Evaluasi), sesi terakhir, serta aturan & tujuan. Tombol **Masuk ke Jurnal** membuka Dashboard.
- Tidak perlu mengubah Firestore Security Rules: Beranda hanya membaca data yang sudah ada (journals, outlooks, `reviews/focus_YYYY-MM`) dan tidak menulis apa pun.
- Upload ulang SEMUA file (service worker naik ke `v16-33-home`).

## v16.38: Strategy vs Execution
Di **Strategy Playbook**, panel paling atas membandingkan aturan strategi dengan yang benar-benar kamu jalankan, dan memisahkan **kualitas keputusan** dari **hasil**.
- **Sampel layak**: journal dengan satu strategy, checklist terisi, dan R tercatat. Sisanya dikeluarkan dan jumlahnya ditampilkan per alasan.
- **Patuh**: semua rule wajib tercentang. **Menang**: R > 0. Total R per hari diambil dari kolom R di journal.
- **Matriks keputusan x hasil**: patuh+menang (proses benar), patuh+rugi (varians normal, jangan ubah aturan), melanggar+menang (beruntung, jangan ditiru), melanggar+rugi (kesalahan yang bisa dihindari).
- Angka baru muncul bila sampel cukup (>= 5 hari per kelompok; >= 10 trade untuk expectancy). Ini statistik deskriptif, bukan sinyal trading dan bukan bukti sebab-akibat.
- **Ekspor**: tombol Ekspor JSON/CSV. Untuk laporan teks offline: `python3 scripts/strategy_vs_execution.py file-ekspor.json --days 90`.

## v16.42: Undo dan Recovery
- **Salah hapus?** Setelah menghapus journal, diary, atau strategi, tekan **Urungkan** di snackbar bawah layar. Hal yang sama berlaku setelah mengedit journal, menggabungkan entry di tanggal yang sama, mengisi Kalender cepat, atau import. Masih bisa diurungkan sampai 10 menit, juga setelah refresh (Ctrl/Cmd+Z di luar kolom teks).
- **Form tertutup atau aplikasi error?** Isi form journal dan diary disimpan otomatis di perangkat. Buka aplikasi lagi, lalu tekan **Lanjutkan** (atau tombol **+**). Draft hilang hanya setelah kamu menyimpan atau menekan **Buang**.
- Gambar chart yang belum terunggah tidak ikut tersimpan di draft; pilih ulang bila perlu.

## v16.51: Trade Journal 360°
Buka detail journal, lalu ketuk kartu **Trade Journal 360°**. Isi enam bagian (Overview, Timeline, Sebelum vs Sesudah, Aturan, Review, Riwayat) dan tekan **Simpan**. Journal satu hari yang berisi beberapa trade bisa dianalisis per trade lewat tombol **Tambah trade**. Data tersimpan di field `t360` pada dokumen journal yang sama (tanpa koleksi baru). Detail lengkap: `CHANGELOG-v16.51.md`.

## Journal seperti buku (v16.58)

Satu tanggal = satu **halaman**. Isi halaman itu adalah susunan trade: Trade 1, Trade 2, dan seterusnya.

- **Menambah trade di tanggal yang sama**: tekan **+ Trade** di header tanggal (Riwayat Journal), tombol **+ Tambah Trade** di detail hari Kalender, atau tombol **+** lalu pilih tanggalnya. Trade baru ditambahkan ke halaman itu, tidak menimpa dan tidak menggabung dengan trade lain.
- **Memperbaiki satu trade**: di Riwayat Journal, ketuk trade yang dimaksud lalu **Edit**. Hanya trade itu yang berubah. Di Kalender, buka detail hari lalu tekan **Edit** pada trade yang dipilih. Kalau kamu membuka halaman yang berisi beberapa trade dari tempat lain, akan muncul pilihan "Pilih trade yang mau diedit".
- **Menghapus**: juga per trade, dan masih bisa **Urungkan**. Halaman tanggal baru hilang kalau trade terakhirnya dihapus.
- **Mengubah tanggal saat edit** memindahkan trade itu ke halaman tanggal yang baru.
- **Total harian** (P/L, jumlah trade, Win/BE/Loss, pair, tag, dll) selalu dihitung ulang dari daftar trade, jadi Kalender, Statistik, dan AI Coach tetap konsisten.
- **Import CSV broker**: tiap trade menjadi entri sendiri. Kalau satu trade hasil import dihapus karena salah, ID-nya dilepas sehingga bisa diimport ulang.
- **Journal lama** tetap aman: yang berisi beberapa trade hasil penggabungan lama tampil sebagai satu baris berlabel **Gabungan**, dan baru dipecah saat kamu menambah trade baru di tanggal itu.
- Data Trade Journal 360° tersimpan per tanggal (halaman), bukan per trade.

## Detail journal seperti laporan (v16.61)
Ketuk satu trade di Riwayat Journal untuk membuka panel detail yang disusun seperti laporan evaluasi:
1. **Ringkasan hasil** di atas: P/L besar, status, arah, lalu baris metrik (Hasil R, Risk, Evaluasi bintang, Biaya). Metrik yang tidak kamu isi tidak ditampilkan.
2. **Screenshot setup** sebagai fokus: satu foto besar, thumbnail untuk berpindah antar chart, ketuk foto untuk memperbesar.
3. **Alasan Entry, Emosi, Evaluasi** sebagai bagian bernomor yang bisa dibuka-tutup. Bagian pertama terbuka otomatis, sisanya menampilkan cuplikan saat tertutup. Pilihan buka-tutupmu diingat saat berpindah trade dengan ‹ ›.
Bagian yang tidak ada isinya otomatis tidak muncul. Saat isi di-scroll, header memadat agar P/L tetap terlihat.
