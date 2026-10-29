# v16.84 — Signature Glass Identity

Satu bahasa material kaca yang hanya dimiliki DOA IBU, bukan tiruan Liquid Glass iOS. Lapisan tampilan saja; data, statistik, dan logika tidak diubah.

## Masalah yang ditemukan
Setiap komponen sudah punya tepi emas dan bayangan, tetapi masing-masing dari rumus berbeda: cincin hero putih 140° (`--ld-rim`), cincin kartu emas 140° (`--orn-rim`) dengan garis tengah simetris, wash header 155°, tab aktif dan tombol dengan bayangan dalam lurus ke bawah, bayangan dalam hitam netral. Tidak ada satu arah cahaya.

## Empat ciri
| Ciri | Aturan |
|---|---|
| Sudut kaca | Satu sumbu 128° dari kiri-atas (searah lampu ambient `a`). Pita pantul, wash header, kilap kubah FAB, dan bayangan dalam tombol mengikutinya. Sudut kiri-atas = titik paling terang. |
| Refleksi emas | Tepi 1px champagne menyala di sudut kiri-atas, memudar di sisi atas dan kiri (bentuk L), lalu pantulan kedua sangat redup di kanan-bawah. Asimetri ini yang membedakannya dari rim putih rata iOS. |
| Bayangan dalam | Cokelat-hangat, bukan hitam netral: bibir gelap di sisi jauh dari lampu + kolam bayangan kanan-bawah. Cekungan (input, `.hm-goal`) membalik logikanya: kiri-atas gelap, kanan-bawah menangkap emas. |
| Pola cahaya | Pita diagonal tipis di sepertiga kiri-atas + titik kilau di sudut. Kekuatan ikut bobot lampu halaman (`--cl-a`, v16.81), rentang sempit .82–1, tanpa animasi. |

## Satu token, enam varian
Token: `--dg-angle`, `--dg-gold`, `--dg-umber`, `--dg-sig-img` (lapisan lukis), `--dg-ring` (diarahkan ke `--ld-rim` dan `--orn-rim`), `--amb-solid-edge` / `--amb-rim` (bayangan dalam). Varian hanya mengatur takaran (`--dg-i`, `--dg-s`, `--dg-r`, `--dg-reach`, `--dg-t`):

| Varian | Komponen | Sifat |
|---|---|---|
| hero | hero Beranda, ekuitas, kalender, statistik | takaran penuh |
| data | kartu angka, KPI, grafik, tile | tepi saja, pita nyaris tak terlihat; angka tidak ditimpa |
| float | menu, popover, toast, filter, sheet, modal | tepi lebih terang; tepi ATAS sheet/modal tetap milik `prismatic-edge.css` (`--dg-t:0`) agar tidak ada dua garis emas |
| nav | dock, pil tab, blok header | lewat `--gn-bar-sheen` (glass-nav) |
| jewel | FAB, `.btn-gold`, tombol utama | bayangan dalam miring 128°, kilap kubah mengikuti sudut |
| well | input form, `.hm-goal`, `.sg-well` | cekung, cahaya dibalik; cincin fokus tidak ditimpa |

API komponen baru: `data-dg="hero|data|float|nav|jewel|well"`.

## Berinteraksi dengan v16.82–v16.83
Modal tetap kaca grafit netral (token `--lm-*` pada elemen modal menang atas token body saya). Material ini hanya menambah tepi emas L dan pantulan kanan-bawah; alpha, blur, saturate, dan warna dasar modal tidak disentuh.

## Batas
Hanya gradient dan bayangan statis: tanpa animasi, filter, blur baru, atau JS. Tidak menyentuh alpha, `backdrop-filter`, warna dasar, atau fallback v16.76/77. Cahaya tidak terikat profit/loss: berkas ini tidak memuat merah/hijau dan tidak membaca data; `scripts/ambient_guard.py` kini memindainya (lulus).

## Fallback
`forced-colors`: seluruh lukisan emas dimatikan (`--dg-boost:0`). `prefers-contrast: more`: tepi dinaikkan ×1.35, pita dilepas. `prefers-reduced-motion`, `mo-lite`, efek rendah: tidak berpengaruh (semua statis). Tema terang: emas lebih dalam (×1.22), bayangan umber lebih tipis, sudut dan pola sama.

## File
Baru: `signature-glass.css`, `CHANGELOG-v16.84.md`.
Diubah: `index.html` (satu `<link>` setelah `liquid-modal.css`), `sw.js` (cache `v16-84-0-signature-glass`), `scripts/ambient_guard.py` (memindai berkas baru).

## Membatalkan
Hapus `<link href="signature-glass.css">`. Tampilan kembali persis v16.83.

## Catatan pengujian
Diuji di Chromium headless pada halaman uji yang memuat seluruh CSS asli v16.83 dengan urutan cascade sama dan markup asli (header, hero, tile, KPI, kartu, FAB, toast, modal form): tema gelap dan terang, perbandingan sebelum/sesudah, emulasi `forced-colors`, `prefers-contrast: more`, dan lebar 390px. Penjaga ambient lulus.
Belum diuji: aplikasi penuh dengan login dan data nyata (Tailwind CDN tidak terjangkau di lingkungan kerja, jadi tata letak halaman uji memakai pengganti minimal), dock/sheet HP dan Safari/Android fisik, halaman Kalender/Statistik/Coach, `#v22-recap`. Takaran (`--dg-i` per varian) adalah pilihan desain awal; setel di bagian 2 berkas CSS setelah dilihat di perangkat nyata. Jika tampilan tak berubah, buka ulang aplikasi dua kali atau hapus data situs (service worker baru).
