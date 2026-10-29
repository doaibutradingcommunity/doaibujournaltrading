# v17.03 — iOS Native Master Suite

Pembaruan menyeluruh arsitektur antarmuka dan pengalaman pengguna (**UI/UX**) Doa Ibu Trading Journal dengan standar **Apple Human Interface Guidelines (HIG)** setara aplikasi native iOS.

---

## 💎 Ringkasan Pembaruan Utama

### 1. 🔊 Web Audio Apple Taptic Synthesizer (`window.IosHaptics`)
- **Taptic Physical Haptic Emulation**: Menghasilkan gelombang mikro-impuls frekuensi rendah (35–65 Hz, durasi 3–8 ms) via Web Audio API (`AudioContext`) yang mereplikasi ketukan fisik Apple Taptic Engine pada sasis iPhone/HP/perangkat saat disentuh.
- **Spektrum Respons Taktil**:
  - `light`: Ketukan tab bar, tombol pill, dan navigasi dock.
  - `selection`: Pemilihan slider, picker, segmented control, dan quick tags.
  - `medium`: Penekanan filter, switch akun, dan tombol modal.
  - `success`: Saat journal tersimpan, screenshot ditempel, atau sinkronisasi selesai.
  - `warning`: Konfirmasi buang draf atau penghapusan trade.
- **Pengaturan Mandiri**: Dapat diaktifkan/dinonaktifkan langsung melalui tab Pengaturan (`Apple Taptic Haptic Feedback`).

---

### 2. ✨ Personal Trading Insight Engine (`window.PersonalTradingInsight`)
- **Analisis Pola Berbasis Data Aktual**: Menghitung metrik performa secara instan dan 100% lokal dari `allJournals` via `V16Stats.normalize()` tanpa memanggil API AI eksternal atau membocorkan data trading.
- **Empat Dimensi Analisis Intuitif**:
  1. **Setup Paling Menguntungkan**: Setup/tag dengan Win Rate tertinggi dan Net P/L positif disertai jumlah trade sampel.
  2. **Sesi Pasar Paling Optimal**: Perbandingan 4 sesi pasar global (Tokyo/Asia, London, New York, Overlap) dengan bar progres dan rasio profitabilitas.
  3. **Ritme Hari Trading**: Menemukan *Hari Terbaik* (Win rate tertinggi) vs *Hari Paling Menantang* untuk meningkatkan kesadaran emosional trader.
  4. **Efisiensi Risk / Reward**: Rasio rata-rata win berbanding rata-rata loss dan Profit Factor aktual.
- **Tab Segmented Control Khas iOS**: Pengguna dapat beralih antara tampilan `[Ringkasan]`, `[Sesi Pasar]`, dan `[Ritme Hari]` secara instan dengan transisi lembut dan haptic feedback.
- **Transparansi Sampel & Empty State**: Menampilkan lencana jujur `● X Trade Teranalisis`. Jika trade kurang dari 3, menampilkan empty state edukatif dengan tombol `＋ Catat Trade Hari Ini`.

---

### 3. ⚡ Quick Journal Experience & Data Security
- **Pencegahan Double Submission**: Sistem mendeteksi dan mengunci tombol `Simpan` saat pengiriman data berlangsung, menampilkan indikator pemrosesan putar (*loading spinner*), dan menyinkronkan status via `StatusCapsule` untuk mencegah entri ganda akibat ketukan berulang.
- **Auto-Suggest Hasil Trade**: Memasukkan nilai P/L positif otomatis memilih **Win**, P/L negatif memilih **Loss**, dan nilai 0 memilih **BE** disertai umpan balik haptic halus.
- **Live R:R & Analisis Cepat**: Indikator pill instan tepat di atas kolom P/L yang menampilkan estimasi rasio eksekusi (*Optimal* / *Sangat Baik* / *Evaluasi Setup*).
- **One-Tap ICT / SMC Quick Tags**: Deretan tombol cepat untuk setup populer (*#FVG, #OrderBlock, #Liquidity, #Breakout, #CHoCH, #Pullback, #Reversal, #News*) yang langsung menambahkan atau mencopot tag dengan satu sentuhan.
- **Instant Clipboard Paste & Drag-and-Drop**: Tekan `Ctrl + V` di komputer atau *Paste* di ponsel saat formulir terbuka untuk menempelkan screenshot chart secara langsung. Mendukung pula seret-lepas (*drag & drop*) berkas langsung ke area dropzone.
- **Auto-Save Draft & Safeguard**: Draf formulir tersimpan otomatis di perangkat dengan penunjuk waktu (*"Draf tersimpan otomatis pk HH:MM"*). Jika formulir ditutup saat ada perubahan, dialog konfirmasi iOS muncul (*Lanjut Mengisi*, *Tutup & Simpan Draf*, *Buang Perubahan*).

---

### 4. 🌐 Live Market Session Radar & Volatility Indicator
- Melacak 4 sesi trading dunia secara presisi dalam zona waktu UTC:
  - **Tokyo / Asia** (00:00 – 09:00 UTC)
  - **London** (07:00 – 16:00 UTC)
  - **New York** (12:00 – 21:00 UTC)
  - **London & NY Overlap** (12:00 – 16:00 UTC · Likuiditas Puncak)
- Dilengkapi titik radar berdenyut (*pulsing dot*), indikator status aktif/transisi/akhir pekan, dan hitung mundur waktu penutupan atau pembukaan sesi berikutnya.

---

### 5. 🫧 Estetika iOS HIG, Inset Grouped & Liquid Glass
- **Large Title Scroll Transition**: Header bertransisi menjadi bilah kaca cair (*Liquid Frosted Glass*, blur 28px dengan specular edge sheen) saat digulir lebih dari 20px.
- **Kartu Inset Grouped**: Kartu beradius 24px dengan tepi pantulan cahaya halus (*specular sheen*), kedalaman charcoal graphite, dan kontras teks tinggi.
- **Angka Numerik Tabular (`tnum`)**: Semua angka P/L, statistik, saldo, dan metrik keuangan diatur dengan `font-variant-numeric: tabular-nums lining-nums` sehingga digit tidak bergeser atau bergoyang saat nilai berubah.
- **Liquid Glass Terpilih**: Kaca cair hanya diterapkan pada elemen mengambang (header scroll, tab bar dock, modal scrim, status capsule) agar scrolling tetap ringan dan data padat tetap solid terbaca.
- **Integritas Contextual Ambient**: 100% mematuhi aturan keamanan ambient lighting (`ambient_guard.py` lulus uji dengan 0 pelanggaran; cahaya latar tidak pernah terikat fluktuasi P/L).

---

## 📂 Berkas yang Diperbarui
- **Diperbarui**:
  - `ios-native-suite.js`: Menambahkan Personal Trading Insight Engine, proteksi double submission, drag & drop, kalkulasi harian/sesi.
  - `ios-native-suite.css`: Menambahkan styling Inset Grouped, tab segmented insight, bar meter sesi & hari, spinner submit, tabular numerals.
  - `touch-chart.css`: Tabular numerals pada tooltip titik grafik dan ringkasan rentang.
  - `menu-settings.js`: Sakelar kendali getaran haptic fisik Apple Taptic.
  - `index.html`: Judul versi v17.03 iOS Native Master Suite.
  - `sw.js`: Versi Service Worker `v17-03-0-ios-native-master`.
