# Web Undangan Edu Fair & Career Day 2026

Purwarupa sistem undangan digital + blast WhatsApp, sesuai lembar soal ASAS Proyek RPL (XI).
Semua berjalan **tanpa server database** - HTML, CSS, dan JavaScript murni.

## Cara menjalankan

**Cara 1 (disarankan, pakai XAMPP)**
1. Nyalakan **Apache** di XAMPP Control Panel.
2. Buka `http://localhost/edufair-2026/index.html`

**Cara 2 (tanpa Apache)**
```bash
C:\xampp\php\php.exe -S 127.0.0.1:8090 -t C:\xampp\htdocs\edufair-2026
```
lalu buka `http://127.0.0.1:8090/index.html`

**Cara 3 (klik dua kali index.html)** - jalan juga. Di halaman admin, tombol data contoh tetap berfungsi karena memakai cadangan `data-tamu.js` (browser memblokir `fetch()` pada alamat `file://`). Untuk CSV lain, pilih file manual lewat kotak unggah.

## Struktur file

| File | Isi |
| --- | --- |
| `index.html` | Halaman undangan: sampul, hero acara, info acara, rundown, benefit booth, peta, form RSVP, footer |
| `style.css` | Seluruh gaya tampilan, dirakit dari snippet extension (`an-*`) |
| `style-acara.css` | Tambahan khusus tema acara: hero, timeline rundown, kartu booth, peta, badge kategori |
| `script.js` | Personalisasi parameter URL, buka sampul, hitung mundur, RSVP, bagikan WhatsApp |
| `admin.html` | Halaman admin: muat CSV, tabel tamu, tombol blast WhatsApp |
| `admin.js` | Pembaca CSV (`FileReader`), pengurai CSV buatan sendiri, builder link personalisasi + link `wa.me` |
| `data-tamu.csv` | 7 data tamu (kolom: id, nama_tamu, instansi, kategori, no_whatsapp) |
| `data-tamu.js` | Cadangan isi CSV (dibuat otomatis oleh `alat/buat-cadangan-csv.py`) |
| `alat/buat-cadangan-csv.py` | Skrip pembuat `data-tamu.js` dari CSV |
| `screenshot/` | Bukti tampilan (desktop & HP) |

## Pemetaan ke lembar soal

| Kebutuhan soal | Diterapkan di |
| --- | --- |
| Responsif HP & laptop | `style.css` (grid `minmax(min(...), 1fr)`, tabel jadi kartu di layar sempit) + `style-acara.css` |
| Judul acara, tema | `index.html` bagian hero `.hero-acara` |
| Waktu pelaksanaan | `.info-cepat` (tanggal, jam, tempat) + hitung mundur di `script.js` |
| Peta lokasi (Google Maps embed) | `#lokasi` - `<iframe>` `output=embed` |
| Rundown acara | `#rundown` - daftar `.rundown` (garis waktu) |
| Daftar benefit booth | `#booth` - kartu `.booth` |
| Personalisasi `?to=...&kategori=...` | `script.js` fungsi `URLSearchParams` (bagian 1) |
| CSV minimal 5 data | `data-tamu.csv` (7 baris) |
| Baca CSV via FileReader | `admin.js` - `#file-csv` + `FileReader.readAsText()` |
| Tabel daftar tamu di admin | `admin.html` `#tabel-tamu` + `admin.js` `gambarTabel()` |
| Tombol "Kirim Undangan WhatsApp" per baris | `admin.js` `linkWhatsApp()` → `https://wa.me/<nomor>?text=<pesan+link>` |

## Contoh tautan personalisasi

```text
index.html?to=Universitas+Negeri&kategori=Universitas&instansi=Universitas+Negeri+Jakarta
index.html?to=Budi+Santoso%2C+S.Kom.&kategori=Perusahaan&instansi=PT+Telkom+Indonesia
```

Nama pada layar sampul, badge kategori, dan judul tab otomatis menyesuaikan.
Tanpa parameter, tampil sebagai "Tamu Undangan".

## Catatan teknis (berguna saat ditanya penguji)

- **Pengurai CSV ditulis sendiri** (`uraiCsv()`), bukan library, karena nama tamu mengandung koma di dalam tanda kutip:
  `"Dr. Rina Kusumawati, M.Pd."`. Parser menangani `""` sebagai satu tanda kutip asli.
- Nomor `08xx` otomatis diubah menjadi `628xx` sebelum membentuk link `wa.me`.
- Pesan WhatsApp memakai template dengan penanda `{nama}`, `{instansi}`, `{kategori}`, `{link}` - bisa diubah di halaman admin.
- RSVP disimpan di `localStorage` (prototipe tanpa server). Kalau nanti ada backend, cukup ganti isi `simpanRsvp()`.
- Animasi muncul saat digulir memakai CSS murni `animation-timeline: view()` (kelas `reveal`), tanpa library dan tanpa JavaScript; ada fallback untuk browser lama.

## Hasil uji (diukur, bukan perkiraan)

- Personalisasi: `?to=Universitas+Negeri&kategori=Universitas` → nama "Universitas Negeri", badge `badge-universitas`; tanpa parameter → "Tamu Undangan".
- Admin membaca `data-tamu.csv` asli: **7 tamu**, **7 link `wa.me`**, statistik 3 universitas / 2 perusahaan / 2 alumni, nama berkoma tetap utuh (`Dr. Rina Kusumawati, M.Pd.` → `Rina%20Kusumawati%2C%20M.Pd.` pada link).
- Responsif: tidak ada geser ke samping di 390 / 768 / 1440 px. Grid 1 kolom di HP, 2 kolom di laptop; tabel admin otomatis jadi daftar kartu di HP.

## Yang di luar snippet extension (jujur)

1. `style-acara.css` - gaya khusus acara (hero, rundown, booth, peta, badge kategori). Lapisan dasar & animasi tetap dari snippet `an-*`.
2. `script.js` dan `admin.js` - logika JavaScript (personalisasi, hitung mundur, RSVP, parser CSV, link WhatsApp). Snippet extension memang hanya menyediakan tampilan.
3. Tautan Google Maps embed dan tanggal acara (isi konten, silakan ganti).

## Kenapa ada `data-tamu.js`?

Kalau `admin.html` dibuka dengan klik dua kali (`file://`), browser memblokir `fetch('data-tamu.csv')`,
sehingga tombol "Muat data-tamu.csv (contoh)" tidak bisa mengambil file. Solusinya: isi CSV ditanam
di `data-tamu.js` sebagai cadangan (hanya dipakai kalau `fetch()` gagal).

Alur lengkap tombol tersebut:

1. Coba `fetch('data-tamu.csv')` -> berhasil kalau dibuka lewat Apache/`php -S`.
2. Kalau gagal, pakai `window.DATA_TAMU_CSV` dari `data-tamu.js`.
3. Kalau keduanya tidak ada, tampilkan pesan "pilih file manual".

Setelah `data-tamu.csv` diubah, jalankan `python alat/buat-cadangan-csv.py` supaya cadangannya ikut baru.


## Kalau CSV berasal dari Excel (kasus yang sering terjadi)

Dua hal yang bikin file Excel gagal/aneh kalau dijadikan CSV:

**1. Pemisah bukan koma.** Excel berbahasa Indonesia menyimpan CSV dengan titik koma (`;`),
contoh isi `data-tamu2.csv`. Admin sekarang **mendeteksi pemisah otomatis** (koma, titik koma, atau tab),
jadi file seperti itu tetap terbaca 7 tamu.

**2. Nomor WhatsApp berubah jadi notasi ilmiah.** Kalau kolom nomor diformat sebagai angka,
Excel menulisnya `6,28226E+12` - angka aslinya sudah hilang dan tidak bisa dipulihkan dari file itu.
Admin menandainya dengan badge **"perlu dicek"** dan **mematikan tombol Kirim WA** untuk baris tersebut
supaya undangan tidak terkirim ke nomor yang salah.

Cara mencegah di Excel:

1. Format kolom nomor menjadi **Text** (klik kanan kolom -> Format Cells -> Text) **sebelum** mengetik/menempel nomor.
2. Kalau nomor sudah rusak, awali dengan tanda kutip: `'6281234567890`.
3. Simpan sebagai **CSV (Comma delimited)** - atau biarkan titik koma, sudah didukung.


## Keputusan desain UI (revisi terakhir)

1. **Tanpa garis hias setengah** di bawah judul atau di kepala komponen. Pemisah bagian cukup ruang kosong dan tipografi.
2. **Tanpa garis aksen di tepi atas kartu** - kartu memakai bayangan halus saja.
3. **Tanpa emoji.** Semua ikon memakai SVG inline (`<span class="ikon">`), jadi tampilannya sama di semua perangkat dan warnanya ikut tema.
4. **Navbar pil mengambang** (`an-navbar`): `position: fixed`, radius 999px, kaca buram (backdrop blur), mengecil halus saat halaman digulir (`.nav-pil-padat`, transisi 0,35 detik) dan menandai bagian yang sedang dibaca.
5. **Buka undangan halus**: sampul memudar 0,8 detik sambil isinya naik sedikit (`translateY(-14px) scale(1.02)`), halaman dikunci tidak bisa digulir selama sampul terbuka, dan **tidak ada lompatan gulir** setelahnya.
6. **Scroll reveal CSS murni**: `.reveal` dan `.reveal-isi` memakai `animation-timeline: view()`, jadi elemen muncul pelan saat masuk layar tanpa JavaScript.
