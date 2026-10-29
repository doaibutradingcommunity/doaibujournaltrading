# v16.79 — Morphing Glass Navigation

Indikator tab aktif kini satu kapsul kaca yang **berpindah dan berubah bentuk** (memanjang menutup jarak, lalu menyusut di tab tujuan), bukan ikon lama yang padam dan ikon baru yang menyala. Lapisan tampilan saja; data, statistik, dan logika navigasi tidak diubah.

## Satu indikator, dua permukaan
| Permukaan | Sebelum | Sekarang |
|---|---|---|
| Dock HP (≤640px) | `.npv-ind` sudah satu elemen yang meluncur (v16.75), tanpa perubahan bentuk | elemen yang sama; kapsulnya (`::before`) memanjang searah gerak lalu menyusut |
| Tab desktop (≥641px) | tiap tombol menggambar kapsulnya sendiri lewat `.active` (padam–nyala) | satu `<span class="mg-ind">` di dalam `.nav-wrap` yang berpindah antar-tab |

## Cara kerja
- **Desktop:** posisi akhir kapsul dipasang langsung (`left/top/width/height`), lalu animasi FLIP memakai **transform + filter saja**. Kotak awal diambil dari posisi visual kapsul saat itu, jadi klik beruntun (kapsul masih bergerak) langsung diarahkan ulang tanpa melompat.
- **Bentuk morph:** di tengah jalan kapsul memanjang hingga 1,45× (1 tab) sampai maks 1,7× (lompatan jauh), sedikit pipih (0,9×) dan lebih terang (brightness 1,14), lalu menyusut. Durasi 380–540 ms mengikuti jarak.
- **HP:** `morph-nav.js` hanya membaca `--i` pada dock dan menyetel arah (`data-mg-dir`), rasio (`--mg-sx`), dan kelas `.mg-go` sesaat. Animasi `@keyframes mg-dock-morph` ada di CSS; sisi belakang kapsul tetap, sisi depan yang memanjang.
- Pembacaan status lewat `MutationObserver` pada kelas `.active` dan `ResizeObserver` pada `.nav-wrap` (ganti bahasa, label "Lainnya" berubah menjadi nama halaman sekunder, header baru tampil setelah login). Kode navigasi lama tidak disentuh.
- Posisi tombol diukur dengan `offsetLeft/offsetTop` (bukan `getBoundingClientRect`) agar tidak terpengaruh `transform` sesaat seperti efek tekan `:active`. Tombol yang berada di dalam `.ms-grp` (menu-settings.js) dihitung lewat rantai `offsetParent`.

## Fallback
| Kondisi | Hasil |
|---|---|
| `prefers-reduced-motion`, `html.mo-lite`, `data-ui-effects="low"`, tanpa `Element.animate` | kapsul **langsung pindah** (desktop) / hanya geser lama v16.75 tanpa morph (HP) |
| Tanpa JS, atau skrip gagal dimuat | `.mg-on` tidak pernah dipasang → kapsul per-tombol v16.75.1 tetap tampil, persis v16.78 |
| `prefers-contrast: more` | kapsul bergaris tegas (pengganti aturan per-tombol) |
| `forced-colors` | satu garis `Highlight` di tab aktif; garis per-tombol dimatikan agar tidak ganda |

## Yang berubah selain itu
- **Cincin fokus keyboard pada tab aktif (desktop) kini tampil.** Di v16.78 bayangan kapsul `!important` menimpa `:focus-visible`, sehingga tab aktif yang difokus tidak menampakkan cincin sama sekali. Karena kapsul sekarang milik `.mg-ind`, cincin yang sama dengan tab lain (`--focus-ring`) dikembalikan.
- Kapsul memakai token yang sudah ada (`--gn-cap-bg`, `--gn-cap-edge`, `--gn-cap-drop`, `--gn-cap-spec`), jadi tema gelap/terang mengikuti v16.75 tanpa warna baru.

## Dikecualikan dengan sengaja
Popover "Lainnya" dan sheet Menu (bukan tab). Ikon dock (`svg` terisi/terangkat dari v16.75) tidak diubah.

## File
Baru: `morph-nav.css`, `morph-nav.js`, `CHANGELOG-v16.79.md`.
Diubah: `index.html` (satu `<link>` setelah `prismatic-edge.css`, satu `<script>` setelah `editorial.js`), `sw.js` (cache `v16-79-0-morphing-nav`, dua file baru masuk shell).

## Membatalkan
Hapus `<link href="morph-nav.css">` dan `<script src="morph-nav.js">`. Tampilan kembali persis v16.78.

## Catatan pengujian
Diuji di Chromium headless pada halaman uji yang memuat **seluruh CSS asli** `index.html` (23 blok `<style>` + 37 `<link>`), markup tab asli, serta JS asli dock (`nav-premium-v17`) dan `menu-settings.js`; perpindahan tab disimulasikan dengan stub kecil (`classList`, sama seperti `switchView`). Tailwind diganti reset preflight.
Diperiksa: kapsul = kotak tab aktif (selisih <1px) saat awal, setelah klik, setelah ganti ke tab sekunder (label "Lainnya" berubah), dan setelah resize; frame tengah morph (lebar 116→205px, tinggi 42→37,8px); klik beruntun berakhir di tab terakhir tanpa animasi tersisa; HP: arah kiri/kanan, rasio, restart saat ketuk beruntun; fallback reduced-motion, `mo-lite`, `data-ui-effects="low"` (tanpa animasi morph); `forced-colors`; tata letak tab tidak bergeser dibanding v16.78 (diuji juga dengan strip dipaksa tampil di 390px); gelap/terang.
Belum diuji: Safari/Android fisik (terutama `getAnimations` pada pseudo-element di Safari lama), aplikasi penuh dengan data nyata dan login Firebase, mode `calm` (`cn-on`) dan `analytic` secara visual, `prefers-contrast: more` secara visual (aturan ditulis, belum dirender), tab strip desktop yang bisa digulir horizontal pada layar sempit (641–~760px) saat tab aktif berada di luar layar.
