# v17.02 — iOS Native Suite & High-End Journaling Architecture

Meningkatkan Doa Ibu Journal Trading menjadi aplikasi journaling dengan standar Human Interface Guidelines (HIG) khas Apple iOS, menghadirkan estetika premium, audio-tactile feedback, dan alur journaling sekelas aplikasi native iOS.

## 1. Web Audio Taptic Synthesizer (Sensasi Haptic iOS)
- Mengatasi keterbatasan iOS Safari yang menonaktifkan API getar fisik (`navigator.vibrate`) dengan memanfaatkan **Web Audio API** (`AudioContext`).
- Menghasilkan gelombang mikro-impuls frekuensi rendah (35–55 Hz, durasi 3–6 ms) yang mereplikasi ketukan fisik **Apple Taptic Engine** melalui sasis perangkat.
- Memberikan respons haptic instan saat:
  - Berpindah tab atau navigasi dock (`light`)
  - Memilih slider, picker, dan segment pill (`selection`)
  - Menekan tombol, switch, dan tag strategi (`medium`)
  - Berhasil menyimpan journal atau menempelkan gambar (`success`)
  - Menghapus atau membatalkan perubahan (`warning`)
- Bekerja mulus di iPhone, iPad, Android, Mac, dan PC.

## 2. Instant Chart Upload: Clipboard Paste Langsung (Ctrl + V / Paste Mobile)
- Menghapus friksi mengunggah screenshot chart: tidak perlu lagi menekan tombol "Pilih file" dan menjelajah folder.
- Cukup tekan **Ctrl + V** (atau tahan dan pilih Paste di mobile) saat formulir Journal atau Pre-Market terbuka:
  - Gambar dari clipboard otomatis dideteksi dan diubah menjadi file lampiran.
  - Preview thumbnail langsung muncul seketika di galeri formulir.
  - Disertai konfirmasi halus dari Status Capsule: *"📋 Screenshot ditempel dari clipboard"*.

## 3. Live Market Session Radar & Volatility Indicator
- Widget radar sesi pasar global yang terpasang di bagian atas Beranda dan Journal.
- Melacak 4 sesi trading dunia secara presisi dalam zona waktu UTC:
  - **Tokyo / Asia** (00:00 – 09:00 UTC)
  - **London** (07:00 – 16:00 UTC)
  - **New York** (12:00 – 21:00 UTC)
  - **London & NY Overlap** (12:00 – 16:00 UTC · Likuiditas Puncak)
- Menampilkan status langsung (Aktif / Transisi / Akhir Pekan) dengan titik radar berdenyut dan hitung mundur waktu penutupan atau pembukaan sesi berikutnya.

## 4. Smart Journaling Form Assistance
- **Auto-Suggest Hasil Trade**: Ketika memasukkan nilai P/L hari ini, formulir secara otomatis memilih status Win, BE, atau Loss dengan umpan balik haptic halus.
- **Live R:R & Analisis Cepat**: Menampilkan kalkulasi instan R-Multiple dan status eksekusi langsung di atas kolom input P/L.
- **One-Tap Quick Setup Chips**: Tombol cepat untuk setup populer (*#FVG, #OrderBlock, #Liquidity, #Breakout, #CHoCH, #Pullback, #Reversal*) yang langsung menambahkan tag dengan satu ketukan.

## 5. iOS Large Title & Dynamic Frosted Header
- Transisi halus header kaca cair (*Liquid Frosted Glass*, blur 28px) saat halaman digulir.
- Batas tipis berkilau (*specular edge sheen*) dan kartu sudut melengkung 24px khas iOS.
- Sepenuhnya patuh pada aturan keamanan ambient lighting (`ambient_guard.py` tetap lolos, tidak ada manipulasi warna ambient berbasis P/L).

## Berkas yang Diperbarui
- **Baru**: `ios-native-suite.css`, `ios-native-suite.js`, `CHANGELOG-v17.02.md`
- **Diperbarui**: `index.html` (memuat suite CSS & JS baru), `sw.js` (cache `v17-02-0-ios-native`).
