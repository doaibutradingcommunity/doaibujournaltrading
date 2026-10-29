# v16.88 — Dashboard dengan komposisi editorial

Tab Journal (Personal Trading Command Center) berubah dari kumpulan kartu seragam menjadi satu komposisi dengan urutan perhatian yang jelas. Lapisan tampilan: data, Firestore, dan perhitungan statistik tidak diubah. Dikunci ke `html.ed-on` (sama seperti v16.72, yang menangani Beranda).

## Urutan perhatian
1. **P/L hari ini**: angka terbesar, tanpa kotak kartu (54px+ di HP, hingga 104px di desktop).
2. **P/L bulan ini**: angka kedua di samping (≥820px) atau di bawah (HP), dipisah garis tipis. Meta: hari trading, trade, win rate, streak.
3. **Satu tombol Journal Baru** di baris keputusan di bawahnya; satu-satunya emas pekat. Tombol melayang disembunyikan selama tombol ini terlihat (IntersectionObserver) dan muncul lagi saat tergulir lewat, jadi hanya satu aksi utama yang tampil. Tanpa observer, tombol melayang tetap ada.
4. **Grafik equity**: tinggi HP 188px / desktop 300px (sebelumnya 132 / 168). Angka kumulatif diperkecil agar tidak bersaing dengan P/L hari ini. Satu-satunya permukaan kaca di area utama.
5. **Statistik lain**: grid hairline tanpa kotak. 2 kolom HP, 4 kolom tablet, 2 kolom di samping grafik di desktop. Ketuk sel untuk penjelasan; sel terbuka melebar satu baris. Tampil awal 4 sel (sebelumnya 3) agar grid 2 kolom tidak berlubang.
6. Kartu analisis di bawahnya tidak diubah.

Angka bulan ini memakai unit yang sama dengan kartu hari ini (akun yang sedang dibuka, filter tanggal tidak berlaku).

## Keputusan teknis
- Panel statistik tidak lagi memakai kelas `glass v5-card` saat `ed-on`: lapisan permukaan lama (`#app > main :is(.v5-card…)` dengan `!important` dan beberapa ID) tidak mungkin dilawan dengan bersih.
- Kartu "Fokus Hari Ini" lama (termasuk dua tombol emas dan tiga statistik hari ini) digantikan masthead. Win rate dan trade hari ini kini ada di baris meta; streak di kolom bulan ini.

## File
Baru: `dash-editorial.css`, `dash-editorial.js`, `CHANGELOG-v16.88.md`.
Diubah: `index.html` (satu `<link>`, satu `<script>`, kait di `todayHero()`, `secOrder()`, `secPanel()`, `drawEquity()`), `sw.js` (cache `v16-88-0-dash-editorial`, dua berkas masuk shell). `scripts/ambient_guard.py` lulus.

## Membatalkan
Hapus `<link href="dash-editorial.css">` dan `<script src="dash-editorial.js">`. Kait di `index.html` hanya aktif bila `window.DoaDashEditorial` ada; tampilan kembali persis v16.87.

## Catatan pengujian
Chromium headless dengan Firebase/Tailwind di-stub dan data sintetis. Diperiksa visual: HP 390 dan 360, tablet 820, desktop 1280, tema gelap dan terang; hari ini profit, loss, belum ada journal, pengguna tanpa journal; angka $123 juta; sel statistik terbuka; serah-terima tombol melayang. Tanpa gulir horizontal di 320px, tanpa error JS.
**Belum diuji:** iPhone/Safari dan Android asli, data Firestore nyata, mata uang Rupiah/Cent, font Newsreader asli, VoiceOver/TalkBack. Header tampil tanpa gaya Tailwind di lingkungan uji. Jika tampilan tak berubah, buka ulang aplikasi dua kali atau hapus data situs (service worker baru).
