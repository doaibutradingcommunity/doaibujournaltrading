# v16.60 — Smart Expandable Cards

- Kartu ringkasan tetap kecil dan rapi; ketuk untuk melihat rincian. Rincian **hanya muncul bila datanya ada** (tidak ada angka karangan).
- **Hero Net P/L (Performa Utama):** baris "Rincian P/L" membuka Profit kotor, Loss kotor, Biaya (komisi & swap) bila tercatat, lalu Net P/L. Baris Biaya otomatis tersembunyi bila belum ada data biaya.
- **Kartu Ringkasan:** badan yang sudah bisa dibuka kini menampilkan rincian: Win Rate/Total Trades (menang · loss · BE), Profit Factor (gross profit & loss), Expectancy (rata-rata menang & loss, bila data per trade).
- **Data biaya opsional:** field baru `fees` per trade (+ = biaya). Import CSV broker kini menyimpan komisi+swap+fee ke `fees`; P/L tetap bersih seperti sebelumnya. Trade yang diinput manual belum punya biaya, jadi baris Biaya tidak ditampilkan. Bila biaya hanya tercatat di sebagian journal, ada catatan "tercatat di X dari Y journal".
- Statistik (`V16Stats`) menambah `fees` & `feeN`. Aksesibel (aria-expanded, fokus keyboard), animasi halus, mengikuti prefers-reduced-motion.
- File baru: `smart-cards.js`, `smart-cards.css`. Cache service worker dinaikkan.
