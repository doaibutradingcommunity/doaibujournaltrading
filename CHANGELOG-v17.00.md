# v17.00 — Contextual Action Surface + angka PnL native

Di atas v16.99. Tidak ada perubahan data, Firebase, autentikasi, V16Stats, atau skema journal.

## 1. Contextual Action Surface
Satu action sheet bergaya iOS (kartu bergrup di dasar layar, tombol Batal terpisah, aksi destruktif merah), isinya mengikuti konteks:

| Konteks | Aksi |
|---|---|
| Trade (baris journal, panel detail) | Lihat detail · Edit · Evaluasi · Lihat chart · Duplikat · Pilih beberapa · Hapus trade |
| Chart (penampil chart, thumbnail chart) | Perbesar · Reset zoom · Buka di tab baru · Simpan gambar · Bagikan · Salin tautan |

- **Pemicu:** tombol ⋯ di baris (sudah ada), di panel detail (baru), dan di penampil chart (baru); tekan-tahan 0,5 dtk di layar sentuh; klik kanan di desktop.
- **Hapus selalu dikonfirmasi** lewat sheet kedua (menyebut pair · tanggal · P/L). Berlaku juga untuk tombol Hapus lama di baris, baki geser, dan panel detail, yang sebelumnya langsung menghapus. Dialog `confirm()` bawaan tidak muncul dua kali.
- **Evaluasi** membuka form trade lalu pindah ke tab Review.
- **Duplikat** (baru, `duplicateJournal` di `index.html`) membuka form trade BARU berisi pair, arah, sesi, akun, tag, dan strategi dari trade sumber. P/L, hasil, catatan, emosi, chart, dan ringkasan risiko dikosongkan supaya tidak terhitung ganda. Tidak ada yang tersimpan sebelum menekan Simpan.
- Lihat chart: bila trade punya lebih dari satu chart, muncul sheet pemilih.
- Aksesibilitas: fokus masuk ke sheet dan kembali ke pemicu, ↑/↓/Tab berputar di dalam sheet, Esc menutup, `role="dialog"`. Tanpa kaca (`html.mo-lite`, Reduce Transparency, kontras tinggi) permukaan menjadi solid. Reduced-motion: tanpa gerak.

## 2. Angka PnL: SF Pro Display / SF Pro Text
Newsreader dan Inter tidak lagi dipakai untuk angka P/L (link Newsreader dihapus dari `index.html`).
- **SF Pro Display** (angka besar): saldo utama, P/L hari ini, P/L bulanan, angka hero. `.pf-val .de-fig .ed-fig .hm-pl .v5-t-pl .jd-pl .tcc-big .tcc-hv .stx-big .mag-big .mag-chg .d .sp-net .calx-amt .t3-score b`
- **SF Pro Text** (angka kecil): daftar trade, tile, KPI. `.jr-pl .jr-day-pl .jr-pick-pl .t3-pl .stx-val .v5-kpi .v .pf-tv .pf-td .pf-cb .tnum`
- **Semua** memakai `font-variant-numeric: tabular-nums` (+ `"tnum"`), bobot semibold. Ini menggantikan angka proporsional (`pnum`) yang sebelumnya dipaksa type-system.css pada angka hero.
- Tanda +/− dan mata uang lebih kecil tapi hampir sebaris; desimal diredupkan.
- Catatan: SF Pro tidak bisa disematkan di web. Di iPhone/Mac, `-apple-system` memakai SF Pro dan memilih Display/Text sesuai ukuran; di Android/Windows jatuh ke Roboto/Segoe UI.
Penyetelan: `--num-display` dan `--num-text` di `action-surface.css`.

## Berkas
Baru: `action-surface.css`, `action-surface.js`, `CHANGELOG-v17.00.md`.
Diubah: `index.html` (link CSS/JS, hapus link Newsreader, `duplicateJournal`, `__jrApi.dup`), `journal-ux.js` (tombol ⋯ di panel detail, `JournalUX.current()`), `identity.css` (token `--id-num`), `sw.js` (cache `v17-00-0-action-surface`, dua berkas baru).

## Membatalkan
Hapus `<link href="action-surface.css">` dan `<script src="action-surface.js">` dari `index.html`. Tombol ⋯ di panel detail otomatis tidak dibuat bila modul tidak ada. Untuk font lama, kembalikan `--id-num` di `identity.css` dan link Newsreader.

## Pengujian
Chromium 141, CSS dan JS asli proyek dengan data trade tiruan (`__jrApi` tiruan), tema gelap dan terang, 390 px sentuh: ⋯ di baris, ⋯ di panel detail, ⋯ di penampil chart, tekan-tahan, Esc, konfirmasi hapus (batal tidak menghapus, hapus memanggil `del` sekali), tombol Hapus lama dikonfirmasi dulu, Edit, Evaluasi, Duplikat, Lihat chart (aktif dan nonaktif), huruf angka terpasang. Tanpa error konsol. `ambient_guard.py` lolos.
**Belum diuji:** aplikasi penuh dengan login/data Firestore nyata; `duplicateJournal` dan perpindahan ke tab Review di form asli (hanya diuji lewat `__jrApi` tiruan); Simpan gambar dan Bagikan di host gambar sungguhan (CORS); tekan-tahan di iPhone/Android fisik; VoiceOver/TalkBack; huruf SF Pro/Roboto sungguhan (sandbox memakai huruf cadangan). Buka aplikasi dua kali setelah mengganti file (service worker baru).
