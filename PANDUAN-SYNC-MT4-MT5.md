# Panduan Lengkap Sinkronisasi Real-Time MT4 & MT5 — Doa Ibu Trading Journal

Dokumen ini memandu Anda dalam mengatur integrasi otomatis transaksi dari **MetaTrader 4 (MT4)** dan **MetaTrader 5 (MT5)** ke **Doa Ibu Trading Journal** tanpa perlu memasukkan data secara manual.

---

## 1. Arsitektur Keamanan: Tanpa Password Akun Broker

> [!IMPORTANT]
> **Keamanan Akun Anda Adalah Prioritas Utama.**  
> Doa Ibu Journal **TIDAK PERNAH** meminta, menyimpan, atau membutuhkan login/password master akun broker Anda.

Sistem sinkronisasi bekerja searah menggunakan **Token Sync Rahasia per Akun**:
1. Anda membuat akun bertipe **MetaTrader 4** atau **MetaTrader 5** di Halaman Akun Doa Ibu Journal.
2. Setiap akun memiliki **Token Sync** unik (misal: `sync_tok_9x8a7...`).
3. Anda memasang Expert Advisor (EA) resmi Doa Ibu di MetaTrader dan memasukkan Token Sync tersebut.
4. Setiap kali trade ditutup, EA mengirim rincian transaksi (tiket, pair, arah, lot, harga, P/L, komisi, swap) ke endpoint webhook aman.
5. Jika suatu saat terminal/VPS Anda berpindah tangan, Anda cukup menekan tombol **"🔄 Buat Token Baru"** di Halaman Akun untuk mencabut akses lama secara instan.

---

## 2. Opsi Endpoint Penerima & Estimasi Biaya

Aplikasi Doa Ibu Journal menyediakan dua opsi implementasi endpoint webhook serverless:

| Opsi | Platform | Kebutuhan Paket | Estimasi Biaya | Rekomendasi |
|---|---|---|---|---|
| **Opsi A (Bawaan)** | **Netlify Functions** | **Netlify Starter (Gratis)** | **Rp 0 / Bulan (100% GRATIS)**<br>Termasuk 125.000 pemanggilan fungsi per bulan. | **Sangat Direkomendasikan** untuk stack web ini. |
| **Opsi B** | **Firebase Cloud Functions** | **Firebase Blaze (Pay-as-you-go)** | **Gratis** jika dalam kuota 2 juta request/bulan, namun **membutuhkan kartu kredit** untuk aktivasi paket Blaze Google Cloud. | Gunakan jika Anda ingin seluruh backend berada murni di Google Cloud. |

### Detail Opsi A: Netlify Functions (Gratis)
Berkas endpoint telah siap di:
```
netlify/functions/sync-trade.js
```
Ketika Doa Ibu Journal dideploy ke Netlify, endpoint webhook Anda akan otomatis aktif di:
```
https://<nama-aplikasi-anda>.netlify.app/.netlify/functions/sync-trade
```

**Pengaturan Environment Variable di Netlify:**
1. Buka dashboard Netlify proyek Anda > **Site configuration** > **Environment variables**.
2. Tambahkan variable:
   - `FIREBASE_PROJECT_ID`: ID proyek Firebase Anda.
   - `FIREBASE_SERVICE_ACCOUNT`: Isi teks JSON Service Account dari Firebase Console (**Project Settings** > **Service accounts** > **Generate new private key**).

---

## 3. Panduan Pemasangan EA di MetaTrader 4 (MT4)

Berkas EA MT4 tersedia di folder:
```
ea/DoaIbu_Sync_MT4.mq4
```
*(Anda juga bisa langsung mengunduhnya dengan menekan tombol **"📥 Unduh EA MT4"** pada kartu akun MT4 di Halaman Akun).*

### Langkah-langkah:
1. **Salin Berkas EA:**
   - Buka MetaTrader 4 di komputer atau VPS Anda.
   - Klik menu **File** → **Open Data Folder**.
   - Buka folder **MQL4** → lalu folder **Experts**.
   - Tempelkan (*paste*) berkas `DoaIbu_Sync_MT4.mq4` ke dalam folder tersebut.

2. **Izinkan WebRequest di MetaTrader 4:**
   - Di MT4, klik menu **Tools** → **Options** (atau tekan `Ctrl + O`).
   - Pilih tab **Expert Advisors**.
   - Centang kotak **"Allow WebRequest for listed URL"**.
   - Klik dua kali pada daftar di bawahnya (tanda `+`), lalu masukkan URL endpoint Anda:
     ```
     https://<nama-aplikasi-anda>.netlify.app
     ```
   - Klik **OK**.

3. **Pasang EA ke Chart:**
   - Buka panel **Navigator** (`Ctrl + N`) di sebelah kiri MT4.
   - Klik kanan pada bagian **Expert Advisors**, lalu pilih **Refresh**.
   - Cari EA **DoaIbu_Sync_MT4**, lalu tarik (*drag*) ke salah satu chart grafik yang sedang aktif (misalnya EURUSD M1).
   - Pada jendela pengaturan yang muncul:
     - Tab **Common**: Pastikan centang **"Allow live trading"** dan **"Allow DLL imports"** (opsional).
     - Tab **Inputs**:
       - `InpApiUrl`: Masukkan URL webhook Netlify Anda (`https://<domain>/.netlify/functions/sync-trade`).
       - `InpSyncToken`: Masukkan **Token Sync** yang Anda salin dari Halaman Akun Doa Ibu Journal.
       - `InpAutoBackfill`: Atur `true` jika ingin riwayat trade sebelumnya (hingga 30 hari) otomatis masuk ke jurnal.
       - `InpPollIntervalSec`: Default `15` detik.
   - Klik **OK**.

4. **Verifikasi Status:**
   - Perhatikan tab **Experts** di jendela Terminal bawah MT4 (`Ctrl + T`).
   - Log sukses akan tampil:
     ```
     [DoaIbu] Memulai Doa Ibu Sync MT4 v17.03...
     [DoaIbu SUCCESS] Berhasil menyinkronkan X trade ke Doa Ibu Journal!
     ```

---

## 4. Panduan Pemasangan EA di MetaTrader 5 (MT5)

Berkas EA MT5 tersedia di folder:
```
ea/DoaIbu_Sync_MT5.mq5
```
*(Anda juga bisa langsung mengunduhnya dengan menekan tombol **"📥 Unduh EA MT5"** pada kartu akun MT5 di Halaman Akun).*

### Langkah-langkah:
1. **Salin Berkas EA:**
   - Buka MetaTrader 5 di komputer atau VPS Anda.
   - Klik menu **File** → **Open Data Folder**.
   - Buka folder **MQL5** → lalu folder **Experts**.
   - Tempelkan berkas `DoaIbu_Sync_MT5.mq5` ke dalam folder tersebut.

2. **Izinkan WebRequest di MetaTrader 5:**
   - Di MT5, klik menu **Tools** → **Options** (`Ctrl + O`).
   - Pilih tab **Expert Advisors**.
   - Centang kotak **"Allow WebRequest for listed URL"**.
   - Tambahkan URL endpoint Anda:
     ```
     https://<nama-aplikasi-anda>.netlify.app
     ```
   - Klik **OK**.

3. **Pasang EA ke Chart:**
   - Di panel **Navigator** (`Ctrl + N`), klik kanan **Expert Advisors** → **Refresh**.
   - Tarik **DoaIbu_Sync_MT5** ke salah satu chart aktif.
   - Di tab **Inputs**, masukkan:
     - `InpApiUrl`: URL webhook Anda.
     - `InpSyncToken`: Token Sync dari Halaman Akun.
   - Klik **OK**.

4. **Verifikasi Status:**
   - Periksa tab **Experts** di panel bawah MT5 (`Ctrl + T`) untuk melihat pesan konfirmasi sinkronisasi berhasil.

---

## 5. Menerapkan Firestore Security Rules

Berkas aturan keamanan resmi telah disiapkan di root proyek:
```
firestore.rules
```

### Cara Memasang ke Firebase:

#### Cara 1: Menggunakan Firebase CLI (Jika terinstal)
Jalankan perintah berikut di terminal komputer Anda:
```bash
firebase deploy --only firestore:rules
```

#### Cara 2: Salin Manual via Firebase Console (Sangat Mudah & Cepat)
1. Buka [Firebase Console](https://console.firebase.google.com/) dan pilih proyek Doa Ibu Journal Anda.
2. Di menu navigasi kiri, pilih **Firestore Database**.
3. Klik tab **Rules** di bagian atas.
4. Hapus isi rules lama, lalu salin dan tempelkan (*copy-paste*) seluruh isi berkas `firestore.rules`.
5. Klik tombol **Publish**.

---

## 6. Penanganan Masalah Umum (Troubleshooting)

### Error 4060 di MetaTrader Terminal
- **Penyebab:** MetaTrader memblokir panggilan HTTP/HTTPS karena URL belum didaftarkan di whitelist.
- **Solusi:** Buka menu `Tools -> Options -> Expert Advisors`, centang *"Allow WebRequest for listed URL"*, dan pastikan URL `https://...` sudah ditambahkan.

### Respons HTTP 401 atau 403
- **Penyebab:** Token Sync tidak cocok atau akun telah dihapus dari aplikasi.
- **Solusi:** Buka Halaman Akun di Doa Ibu Journal, salin ulang Token Sync akun yang bersangkutan, dan masukkan ke parameter `InpSyncToken` di EA.

### Trade Ganda Tidak Muncul
- **Penyebab:** Ini adalah fitur pencegahan duplikasi (*anti-duplicate guard*). Jika sebuah tiket order sudah pernah tersinkronkan, sistem tidak akan menyimpannya dua kali.
- Setiap trade hasil sinkronisasi akan ditandai dengan badge pengingat untuk melengkapi analisa chart dan refleksi psikologi.
