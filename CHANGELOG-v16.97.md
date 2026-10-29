# v16.97 — Calm Glass Navigation (perbaikan)

Visual-only. Tidak ada perubahan markup, logika navigasi, autentikasi, Firebase, atau data.

**Penyebab v16.96 tidak terlihat:** `glassy-v4.css` dan `glass-tiers.css` memakai pemilih `[data-amb]` ×6–×10 dengan `!important`, sehingga aturan v16.96 selalu kalah. Di tablet/desktop, `header::before` juga disembunyikan dan header diberi `backdrop-filter: none`, jadi konten yang tergulir di bawah header tampak tajam menembus pil navigasi.

- Header tablet/desktop kini punya lapisan kabut blur yang memudar ke bawah (konten di belakang tidak lagi mengganggu).
- Pil navigasi, profil, dan lonceng memakai kaca bening berblur dengan tepi tipis.
- Tab aktif: dari gradasi emas pekat (#f3d77e → #d4af37) menjadi wash champagne redup dengan teks krem; garis/glow emas dimatikan. Tema terang memakai wash cokelat-emas lembut.
- Kapsul morph (`.mg-ind`) dan tombol aktif tidak lagi berwarna ganda.
- HP: dock bawah sedikit lebih bening, kapsul aktif champagne redup.
- Mode hemat (`mo-lite`, efek rendah) dan Reduce Transparency: tanpa blur, kabut dibuat lebih pekat.

Berkas: `navigation-refinement-v16.97.css` (menggantikan v16.96). Cache SW: `v16-97-0-calm-glass-nav`.
Penyetelan cepat: blok TOKEN di bagian atas CSS (`--nv-blur-band`, `--nv-blur-pill`, `--nv-act-*`).
