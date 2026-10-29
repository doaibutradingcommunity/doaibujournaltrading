# v16.37 — Liquid Glass Refinement

## Fokus
Membuat Liquid Glass lebih matang: premium, lapang, konsisten, mudah dibaca, dan lebih ringan.

## Perubahan
- Mengurangi blur default dari 18px menjadi 10px (8px pada layar kecil).
- Membatasi blur ke permukaan mengambang seperti dock, toast, range, dan tooltip; kartu konten utama tetap tajam dan lebih solid.
- Menyatukan radius dan memperhalus border serta shadow lintas panel.
- Mengurangi glow pada angka profit/loss agar warna status tetap jelas tanpa halo berlebihan.
- Menahan aksen emas untuk ringkasan P/L utama dan tindakan penting, bukan seluruh elemen.
- Mempertahankan fallback untuk reduced-transparency serta dukungan tema terang.
- Hanya menambahkan lapisan CSS; logika trading, data, navigasi, dan autentikasi tidak diubah.

## Verifikasi
- Pastikan stylesheet baru dimuat setelah `premium.css` dan `liquid-glass-v1634.css`.
- Uji tema gelap/terang, halaman dashboard, kartu jurnal, modal, dock mobile, serta status profit/loss.
- Uji pada perangkat kelas rendah dan aktifkan pengaturan aksesibilitas reduced transparency.
