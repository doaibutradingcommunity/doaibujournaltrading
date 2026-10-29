# v16.48 — Dashboard dengan hierarki informasi adaptif
**Satu area performa utama, KPI lain jadi ringkasan sekunder.** Hanya tampilan; semua angka tetap dari V16Stats.

- **Performa Utama** (kartu Equity): nilai P/L besar, perubahan periode (vs periode sebelumnya yang sama panjang; "Semua" = hari trading terakhir), rentang 7H/30H/90H/1T/Semua, dan grafik equity dalam satu blok.
- **Ringkasan** (menggantikan kartu KPI besar): baris ringkas yang bisa diperluas satu per satu dan "Lihat n lainnya". Statistik ★ Utama tampil dulu; bila kosong, 3 pertama.
- **Responsif**: HP 1 kolom · tablet 2 kolom (1,12fr : 1fr) · desktop 12 kolom (8 + 4), lebar dashboard hingga 80–84rem; semua baris Ringkasan terlihat di desktop.
- **Angka panjang/negatif**: font mengecil otomatis, lalu turun baris; tidak pernah dipotong. Sumbu grafik melebar sesuai label terpanjang.
- **Migrasi**: susunan standar v16.40–v16.47 yang belum diubah pindah otomatis. Susunan buatan pengguna tidak diubah.
- File: `performance-hero.css` (baru; hapus tautannya untuk membatalkan gaya), `index.html`, `sw.js` (cache v16-48-0).
- Catatan: gestur tarik-handle v16.47 untuk kartu KPI Dashboard tidak lagi berlaku di Dashboard (panel baru memakai tombol); tab Statistik tidak berubah.
