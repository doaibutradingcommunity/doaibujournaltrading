# v16.81 — Contextual Ambient Lighting

Cahaya latar menyesuaikan **konteks halaman**, bukan animasi acak. Tiap halaman punya atmosfer sendiri, identitas visual tetap satu. Lapisan tampilan saja; data, statistik, dan logika navigasi tidak diubah.

## Apa yang sudah ada, apa yang baru
| Sudah ada | Baru di versi ini |
|---|---|
| v16.66: tiga konteks kasar (glow / calm / analytic) mengatur *seberapa kuat* cahaya | **Bobot tiap lampu per halaman**: lampu mana yang memimpin berbeda di setiap halaman |
| v16.70: titik cahaya per halaman (`--sg-x/--sg-y`) | Tetap dipakai; kini dilengkapi fokus lampu |
| — | Token ambient per halaman di CSS, transisi opacity, dan penjaga larangan P/L |

Sebelum ini Beranda, Journal, Wrapped, dan Galeri sama-sama "glow" dan hanya beda titik geser. Sekarang tiap halaman punya triple bobot yang unik.

## Token per halaman (`contextual-ambient.css`)
Lampu `a` = kiri-atas besar · `b` = kanan-bawah besar · `c` = tengah kecil. Nilai 0–1.

| Halaman (label di app) | `view` | a | b | c | Arah |
|---|---|---|---|---|---|
| Beranda | `home` | 1 | .65 | .55 | hangat, kiri-atas, di atas hero P/L |
| Journal | `dashboard` | .60 | .60 | 1 | terpusat, seperti lampu baca |
| Kalender | `calendar` | .45 | .90 | .35 | menjauh dari grid, ke bawah-kanan |
| Statistik | `statistik` | .80 | .40 | .40 | garis cahaya di atas deretan KPI |
| Review Bulanan | `monthly` | .40 | .80 | .50 | |
| Strategy Playbook | `strategy` | .50 | .50 | .85 | |
| AI Coach | `coach` | .35 | .85 | .60 | terang di bawah, dekat input |
| Trading Wrapped | `wrapped` | .90 | .90 | .70 | sedikit lebih hidup |
| Galeri | `gallery` | .55 | .95 | .65 | |
| Diary & Review | `diary` | .60 | .40 | .30 | tenang, reflektif |
| Pengaturan | `settings` | .40 | .40 | .30 | |
| Tentang Kami | `web` | .70 | .60 | .50 | |
| Modal form journal | `form` | .50 | .35 | .30 | redup, fokus ke isian |

Catatan nama: tab berlabel **"Journal"** adalah `view="dashboard"`; **Beranda** adalah `home`. Angka di atas adalah pilihan desain awal, bukan hasil ukur; ubah langsung di CSS.

## Cara kerja
- `contextual-ambient.js` hanya memasang `data-cl="<halaman>"` pada `<body>` (dari event `viewchange`, tombol nav aktif, `body.authed`, dan `#form-section`, sumber yang sama dengan `ambient-glass.js`). Ia tidak membaca data apa pun.
- CSS memetakan `--cl-a/b/c` ke `filter: opacity()` pada tiap lampu, dengan transisi 0,9 dtk. Hanya opacity yang berubah, jadi berjalan di compositor: tanpa blur, tanpa repaint, tanpa pengukuran layout.
- Bobot tidak pernah di bawah **.30**, jadi tidak ada lampu yang padam di satu halaman. Berpindah halaman terasa seperti lampu yang diarahkan lain di ruangan yang sama.
- Warna, bentuk, ukuran, dan ritme napas lampu **sama di semua halaman**. Itulah yang menjaga identitas.
- Tidak bertabrakan dengan paralaks v16.80 (`translate`), animasi `sg-a/b/c` (`transform`), maupun napas `sg-breathe` (`opacity`): semuanya properti terpisah dan dikalikan.

## Larangan: cahaya tidak boleh bereaksi pada profit/loss
Keputusan sengaja: **tidak ada keterkaitan P/L sama sekali**, bukan sekadar "dibatasi". Alasannya, hari rugi yang membuat seluruh layar memerah mendorong reaksi emosional (tilt), padahal tujuan aplikasi ini adalah refleksi yang tenang. Angka P/L sudah berwarna hijau/merah di kartu datanya; latar tidak perlu mengulanginya.
- `contextual-ambient.css/.js` tidak memuat satu pun literal warna dan tidak membaca journal, `V16Stats`, atau Firestore.
- **`scripts/ambient_guard.py`** memindai 8 berkas ambient (baru + `ambient-glass`, `signature`, `depth-parallax`) dan gagal (exit 1) bila menemukan token P/L (`pnl`, `profit`, `loss`, `win`, `--green`, `--red`, …), warna merah/hijau, atau pembacaan data. Jalankan sebelum merilis perubahan ambient: `python3 scripts/ambient_guard.py`. Komentar dikecualikan; kondisi `@supports (… red …)` (deteksi fitur) dikecualikan.
- Jika kelak ingin isyarat hasil yang sangat halus, itu keputusan terpisah dan harus mengubah penjaga ini secara eksplisit.

## Fallback
`prefers-reduced-motion`, `html.mo-lite`, `data-ui-effects="low"`: bobot per halaman **tetap berlaku**, tetapi berganti seketika (tanpa transisi). `forced-colors`: `#sg-light` memang disembunyikan. Tanpa JS atau skrip gagal dimuat: `data-cl` tidak ada, cahaya persis v16.80. Landing/login tidak disentuh.

## File
Baru: `contextual-ambient.css`, `contextual-ambient.js`, `scripts/ambient_guard.py`, `CHANGELOG-v16.81.md`.
Diubah: `index.html` (satu `<link>` setelah `depth-parallax.css`, satu `<script>` setelah `depth-parallax.js`), `sw.js` (cache `v16-81-0-contextual-ambient`, dua file baru masuk shell).

## Membatalkan
Hapus `<link href="contextual-ambient.css">` dan `<script src="contextual-ambient.js">`. Tampilan kembali persis v16.80.

## Catatan pengujian
Diuji di Chromium headless (141) pada halaman uji kecil yang memuat **CSS/JS asli** `ambient-glass`, `signature`, `depth-parallax`, `contextual-ambient`, dengan stub `switchView` yang meniru handler asli (termasuk `switchView('home')` saat logout, `index.html:4117`). 38 pemeriksaan lulus: 12 halaman + form menghasilkan `data-cl` dan bobot yang benar; triple unik, min ≥ .30; filter hanya `opacity()`; **warna lampu identik di semua halaman**; transisi bergerak halus (nilai tengah di antara awal dan akhir) dan berakhir di token; form buka/tutup; halaman tak dikenal → Beranda; logout/login; data rugi/profit ekstrem dan kelas `pnl-loss` tidak mengubah bobot atau warna; paralaks v16.80 tetap jalan; fallback tiga mode berganti seketika; tema terang + HP (lampu `c` tetap tersembunyi). Kontrol negatif: penjaga terbukti gagal saat disisipi token `pnl` dan warna hex.
Belum diuji: aplikasi penuh dengan login Firebase dan data nyata, Safari/Android fisik (terutama transisi `filter: opacity` pada layer besar), dan **penilaian visual**: apakah selisih antar-halaman terasa pas, terlalu halus, atau terlalu kuat belum dilihat mata. Itu paling mudah disetel lewat angka di tabel di atas.
