# v17.04 — High-Contrast Market Sessions & Forex Factory Realtime News Suite

Pembaruan komprehensif sistem jam sesi pasar global (*Market Session Clock*) dengan desain **Ultra High-Contrast**, dukungan konversi zona waktu pengguna (*Multi-Timezone Engine*), serta integrasi **Forex Factory Realtime Economic Calendar & Multi-Filter Watchlist**.

---

## 💎 Ringkasan Pembaruan Utama

### 1. 🕒 Jam Sesi Trading Ultra High-Contrast & Identitas Visual Unik
- **Visual Kontras Tinggi & Eye-Pleasing**: Setiap sesi pasar kini memiliki tema warna neon & ambient glow yang kontras, tajam, dan mudah dikenali dalam sekejap mata:
  - **London (07:00 – 16:00 UTC)**: *Royal Emerald* (`#10b981`), latar hijau gelap mendalam, batas bercahaya, dan indikator berdenyut (*live beacon*).
  - **New York (12:00 – 21:00 UTC)**: *Solar Gold / Amber* (`#f59e0b`), aksen emas menyala khas Wall Street.
  - **Tokyo / Asia (00:00 – 09:00 UTC)**: *Cyber Violet* (`#a855f7`), aksen ungu elektrik khas pasar Asia.
  - **Sydney (21:00 – 06:00 UTC)**: *Oceanic Cyan* (`#0ea5e9`), aksen biru laut segar khas pasifik.
- **Bar Progres Sesi Realtime**: Tiap kartu sesi aktif dilengkapi bar progres visual persentase waktu yang telah berjalan (misal: `65% berjalan · Sisa 3j 15m`).
- **Status Sesi Jelas**: Lencana `● AKTIF` bercahaya untuk sesi yang sedang berjalan, dan status `TUTUP` yang tetap terbaca jelas dengan hitung mundur pembukaan (`Buka dlm 1j 40m`).
- **Highlight Golden Hours (London & NY Overlap)**: Spanduk khusus otomatis muncul ketika sesi London dan New York tumpang-tindih (pukul 19:00 – 23:00 WIB), menandai puncak likuiditas dan volatilitas harian pasar Forex & Gold (XAU/USD).
- **Alur 24 Jam Pasar (Visual 24H Timeline Track)**: Jalur visual 24 jam dengan jarum penunjuk (*live needle*) vertikal yang bergerak mengikuti waktu riil.

---

### 2. 🌐 Multi-Timezone Adjustment Engine
- **Penyesuaian Zona Waktu Dinamis**: Pengguna dapat memilih zona waktu mereka secara langsung lewat menu dropdown di pojok kanan radar sesi:
  - **Auto**: Deteksi otomatis zona waktu perangkat pengguna (misal: *WIB (UTC+7 · Asia/Jakarta)*).
  - **WIB (UTC+7)**: Jakarta, Surabaya, Bangkok, Hanoi.
  - **WITA (UTC+8)**: Bali, Makassar, Singapura, Kuala Lumpur, Hong Kong.
  - **WIT (UTC+9)**: Jayapura, Ambon, Tokyo.
  - **UTC / GMT**: London Standard / Forex Server Time.
  - **London (BST / GMT)**: Waktu sesi Eropa.
  - **New York (EDT / EST)**: Waktu sesi Amerika.
  - **Tokyo (JST)**: Waktu sesi Jepang.
  - **Sydney (AEST / AEDT)**: Waktu sesi Australia.
- **Sinkronisasi Seluruh Jam**:
  - Jam buka dan tutup 4 sesi trading otomatis terkonversi ke zona waktu terpilih (contoh pada WIB: London tampil `14:00 – 23:00 WIB`, New York `19:00 – 04:00 WIB`).
  - Jam digital monospace realtime (`HH:mm:ss`) berdetak tiap detik lengkap dengan tanggal dan kode zona waktu aktif.
  - Seluruh jadwal rilis berita Forex Factory terkonversi otomatis ke zona waktu terpilih.
- **Penyimpanan Preferensi**: Pilihan zona waktu disimpan di `localStorage` (`doa_market_tz_v17`) sehingga selalu diingat saat aplikasi dibuka kembali.

---

### 3. 📰 Realtime Forex Factory Economic Calendar
- **Sumber Data Terpercaya**: Data diambil langsung dari data feed resmi **Forex Factory (Fair Economy Media)** (`ff_calendar_thisweek.json`).
- **Arsitektur Multi-Tier Resilient Loader**:
  1. *Direct Fetch* ke Fair Economy.
  2. *CORS Proxy Fallback* untuk kompatibilitas penuh di berbagai peramban.
  3. *Smart LocalStorage Caching* (TTL 25 menit) untuk mematuhi rate limit Fair Economy dan mencegah blokir IP/Cloudflare 429.
  4. *Benchmark Macro Schedule Fallback* terstruktur jika perangkat offline.
- **Tombol Segarkan Data (Manual Refresh)**: Pengguna dapat menyegarkan data seketika kapan saja dengan animasi putar (*spin*) dan penunjuk waktu pembaruan terakhir.

---

### 4. 🎛️ Multi-Filter Berita & Watchlist Bintang
- **Filter Mata Uang Cepat (Currency Chips)**:
  - Dukungan tombol 1-sentuhan untuk mata uang utama: `ALL`, `USD 🇺🇸`, `EUR 🇪🇺`, `GBP 🇬🇧`, `JPY 🇯🇵`, `AUD 🇦🇺`, `CAD 🇨🇦`, `CHF 🇨🇭`, `NZD 🇳🇿`.
- **Filter Tingkat Dampak (Impact Level)**:
  - `🔴 High Impact (Tinggi)`: Berita penggerak pasar utama (CPI, NFP, Fed Rate, FOMC, GDP).
  - `🟠 Medium Impact (Sedang)`: PMI, Retail Sales, Klaim Pengangguran.
  - `🟡 Low Impact (Rendah)`: Sentimen konsumen & lelang obligasi.
  - `⚪ Holiday (Libur Bank)`: Penutupan pasar perbankan regional.
  - **Tombol Pintas 1-Tap `⚡ Hanya High Impact (Red Folder)`**: Memfilter instan hanya berita berisiko tinggi.
- **Filter Jangka Waktu (Timeframe)**:
  - `⏰ Akan Datang (Upcoming)`: Menampilkan rilis berita yang belum terjadi dari jam sekarang ke depan (diurutkan paling dekat terlebih dahulu).
  - `📅 Hari Ini (Today)`: Seluruh rilis berita hari ini.
  - `🗓️ Minggu Ini (This Week)`: Kalender lengkap satu pekan.
- **Pencarian Realtime**: Kotak pencarian instan berdasarkan judul berita atau mata uang (misal: ketik "CPI", "FOMC", "Powell", "Unemployment").
- **Watchlist Bintang (⭐ Dipantau)**:
  - Klik ikon bintang (★ / ☆) pada setiap kartu berita untuk menyematkan event penting yang ingin dipantau.
  - Dilengkapi tab filter khusus `⭐ Dipantau ([Jumlah])`.

---

### 5. 🚨 Peringatan Berita Kritis Imminent (< 45 Menit)
- Jika terdapat berita *High Impact* (USD, EUR, GBP, dll) yang akan rilis dalam waktu kurang dari 45 menit:
  - Spanduk peringatan merah menyala otomatis tampil di bagian atas Radar Sesi:
    `🚨 [USD] Core CPI m/m dalam 18 menit! Waspada lonjakan volatilitas & pelebaran spread.`
- Di bagian bawah radar terdapat cuplikan 3 berita mendatang terdekat dan tombol cepat `Lihat Jadwal Lengkap News ➔` yang langsung membuka halaman kalender berita.

---

### 6. 📱 Halaman Penuh Navigasi (`Forex News`)
- Tab navigasi baru **Forex News** ditambahkan pada bilah menu navigasi utama di samping Beranda, Journal, dan Kalender.
- Dapat diakses dari ponsel maupun komputer dengan animasi transisi halaman mulus khas Doa Ibu Journal.

---

## 🛠️ Perbaikan Bug & Penyempurnaan Tema (v17.04.1)

1. **Pemindahan Pengaturan Zona Waktu ke Menu Pengaturan**:
   - Menghapus dropdown zona waktu di dalam header kartu radar sesi yang sebelumnya menutupi dan menghalangi bagan sesi London saat di-scroll atau dibuka.
   - Opsi zona waktu dipindahkan secara permanen ke dalam **Halaman Pengaturan** (`#settings-section` -> `#ms-timezone`), di bawah kartu Tampilan sejajar dengan pilihan Bahasa.
   - Pada radar sesi dan kalender berita, kini hanya terdapat tombol pil minimalis non-intrusif (`.ios-tz-pill-btn`) yang jika diklik akan mengarahkan pengguna secara mulus ke pengaturan zona waktu di Pengaturan.

2. **Koreksi Presisi Tanggal & Jam Rilis Berita Forex Factory**:
   - Memperbaiki ketidaksesuaian waktu pada rilis berita Forex Factory dengan menyelaraskan format ISO-8601 ber-offset native EDT (`-04:00`), menghilangkan pergeseran 4 jam yang terjadi sebelumnya.
   - Waktu rilis berita kini menampilkan jam lokal pengguna (misal: `19:30 WIB`) bersandingan dengan waktu rilis asli Forex Factory `(8:30 AM EDT)`.
   - Mengintegrasikan data lengkap 3 kolom: **Actual**, **Forecast**, dan **Previous**.
   - Dilengkapi tautan langsung ke halaman detail resmi [forexfactory.com/calendar](https://www.forexfactory.com/calendar).

3. **Harmonisasi Desain Kartu dengan Tema Utama Doa Ibu Journal**:
   - Menyelaraskan kartu News (`.fn-header-card`, `.fn-controls-card`, `.fn-event-card`), Radar Sesi (`.ios-session-radar`), dan Kartu Insight (`.ios-insight-card`) dengan tema khas Doa Ibu Journal:
     - Lapisan kaca mewah (*Luxury Glass*) dengan efek blur mendalam (`backdrop-filter: blur(26px) saturate(165%)`).
     - Aksen emas sampanye khas (*Champagne Gold* `#C8A96A` / `#e0b94a`) pada tombol aktif, bilah progres, dan tag.
     - Pantulan kilau emas halus (*Champagne Sheen Overlay* `::before`).
     - Dukungan penuh untuk tema Gelap (Dark Graphite) maupun Terang (Light Mode `body.light`).
