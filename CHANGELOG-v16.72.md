# v16.72 — Hierarki visual editorial

Mata langsung ke angka yang paling penting. Lapisan tampilan saja: data, Firestore, dan perhitungan statistik tidak diubah. Dikunci ke `html.ed-on` (dipasang `editorial.js`).

## Urutan perhatian di Beranda
1. **P/L hari ini**: angka terbesar di halaman (serif Newsreader, hingga 84px di desktop, 50–56px di HP). Bila belum ada journal hari ini tampil "—" dengan keterangan, ukuran tetap sama agar tata letak tidak bergeser.
2. **P/L bulan ini**: angka kedua (32–44px), di bawah/di samping hari ini, dipisah garis tipis.
3. **Tombol Journal Baru**: satu-satunya tombol emas pekat di layar.
4. **Statistik sekunder**: win rate, profit factor, dan jumlah trade bulan ini, 16px dalam satu baris tipis di bawah P/L bulan ini.
5. Langkah berikutnya, sesi terakhir, aturan: lebih tenang (teks bergaris bawah, kartu tanpa cahaya emas).

Win rate, profit factor, dan jumlah trade dibaca dari `V16Stats` (sumber yang sama dengan Dashboard), jadi angkanya konsisten. Jumlah trade menggantikan jumlah journal.

## Grafik ekuitas ringkas, detail saat disentuh
- **Beranda:** garis P/L kumulatif bulan ini setinggi 72px, tanpa sumbu dan angka. Sentuh atau geser: label berganti jadi tanggal, angka bulan ini jadi kumulatif hari itu, baris keterangan jadi P/L hari itu; garis penunjuk dan titik ikut bergeser. Dilepas: kembali sendiri setelah 1,4 dtk (langsung pada mouse). Keyboard: panah kiri/kanan, Home, End, Escape; dibacakan lewat live region.
- **Dashboard (Performa Utama):** tinggi grafik turun (HP 210 → 132px, desktop 300 → 168px), sumbu Y hanya batas bawah dan atas, garis bantu lebih samar. Tooltip sentuh yang sudah ada tidak diubah.

## Tombol Journal Baru
- Pil berlabel (ikon + "Journal Baru", mengikuti bahasa) di semua ukuran layar; sebelumnya bulat tanpa label di HP dan baru berlabel saat disorot di desktop.
- Saat menggulir ia menciut jadi bulat dan tetap terlihat (memakai keadaan "istirahat" v16.65), tidak hilang.
- Denyut `vibePulse` dimatikan, sesuai catatan v16.70.
- Kartu "langkah berikutnya" tidak lagi tombol emas, dan tile "Journal Baru" di akses cepat dihapus (duplikat). Tersisa dua tile: Galeri Chart dan Evaluasi. Tombol "Masuk ke Jurnal" di hero dihapus; jalurnya tetap lewat tab Journal dan tautan "Semua jurnal".

## File
Baru: `editorial.css`, `editorial.js`, `CHANGELOG-v16.72.md`.
Diubah: `index.html` (font Newsreader, satu `<link>`, satu `<script>`, tiga kait kecil di `hero()`, `quick()`, `drawEquity()`), `sw.js` (cache `v16-72-0-editorial`, dua file baru masuk shell).

## Membatalkan
Hapus `<link href="editorial.css">` dan `<script src="editorial.js">` dari `index.html`. Tiga kait di inline script hanya aktif bila `html.ed-on` ada, jadi tampilan kembali persis v16.71.

## Diuji (Chromium headless, Firebase di-stub, 390×844 dan 1280×860)
Angka dan ukuran huruf hierarki, sentuh/geser sparkline lalu pulih, keadaan kosong (tanpa journal hari ini, tanpa journal sama sekali), bahasa Inggris, tema terang, tombol menciut saat gulir, tinggi grafik Dashboard sebelum dan sesudah, tanpa error JS dan tanpa gulir horizontal.

**Belum diuji:**
- Perangkat iOS/Android nyata, dan FPS/baterai.
- Font Newsreader: di lingkungan uji tidak ada jaringan, jadi yang tampil serif cadangan (Iowan/Palatino/Times). Cek angka (lining, tabular) dengan font aslinya.
- Tailwind juga tidak termuat di lingkungan uji, jadi header dan dock tampil tanpa gaya Tailwind; hero Beranda memakai CSS sendiri sehingga tidak terpengaruh. Di layar kecil, periksa apakah tombol Journal Baru menutupi baris statistik sekunder saat halaman di puncak.
- Layout desktop memakai kolom kiri (hari ini) yang lebih pendek dari kolom kanan; lihat apakah ruang kosongnya mengganggu.
