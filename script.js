/* ==========================================================================
   script.js - logika halaman undangan (index.html)
   1. Personalisasi nama tamu dari parameter URL
   2. Tombol "Buka Undangan" menutup layar sampul
   3. Hitung mundur ke tanggal acara
   4. Form RSVP (prototipe: disimpan di localStorage)
   5. Tombol bagikan ke WhatsApp
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  // ------------------------------------------------------------------
  // 1. PERSONALISASI DARI URL
  //    Cara utama (satu parameter, dipisah koma):
  //      index.html?nama=Raka Pratama,S.Kom.,PT Telkom Indonesia,Perusahaan
  //      urutan: nama, gelar, instansi, kategori
  //    Cara lama tetap jalan: ?to=..&instansi=..&kategori=..
  //    Catatan: koma DI DALAM satu bagian harus ditulis %2C,
  //    contoh gelar ganda -> "Rina Kusumawati,S.E.%2C M.Pd.,Universitas Indonesia,Universitas"
  // ------------------------------------------------------------------
  var params = new URLSearchParams(window.location.search);

  // dibaca dari query mentah supaya koma pemisah dan koma di dalam teks tidak tertukar
  function bacaBagianNama() {
    var cocok = /[?&]nama=([^&]*)/.exec(window.location.search);
    if (!cocok) return null;
    var mentah = cocok[1].split(',').map(function (bagian) {
      return decodeURIComponent(bagian.replace(/\+/g, ' ')).trim();
    });
    if (!mentah.length || mentah[0] === '') return null;

    var hasil = { nama: mentah[0], gelar: '', instansi: '', kategori: '' };

    if (mentah.length >= 4) {
      // nama & gelar bisa mengandung koma, jadi dua bagian TERAKHIR = instansi & kategori
      hasil.kategori = mentah[mentah.length - 1];
      hasil.instansi = mentah[mentah.length - 2];
      hasil.gelar = mentah.slice(1, mentah.length - 2).join(', ');
    } else if (mentah.length === 3) {
      hasil.gelar = mentah[1];
      hasil.instansi = mentah[2];
    } else if (mentah.length === 2) {
      hasil.gelar = mentah[1];
    }
    return hasil;
  }

  var dariNama = bacaBagianNama();
  var nama = dariNama ? dariNama.nama : (params.get('to') || '').trim();
  var gelar = dariNama ? dariNama.gelar : (params.get('gelar') || '').trim();
  var kategori = dariNama ? dariNama.kategori : (params.get('kategori') || '').trim();
  var instansi = dariNama ? dariNama.instansi : (params.get('instansi') || '').trim();
  var namaLengkap = gelar !== '' ? nama + ', ' + gelar : nama;

  var elNama = document.getElementById('nama-tamu');
  var elKategori = document.getElementById('kategori-tamu');
  var elInstansi = document.getElementById('instansi-tamu');

  // kalau parameter kosong, pakai teks umum supaya undangan tetap layak dilihat
  if (elNama) elNama.textContent = namaLengkap !== '' ? namaLengkap : 'Tamu Undangan';
  if (elKategori) elKategori.textContent = kategori !== '' ? kategori : 'Peserta';
  if (elInstansi) {
    elInstansi.textContent = instansi !== '' ? instansi : 'Instansi / Universitas';
    if (instansi === '') elInstansi.style.opacity = '.7';
  }

  // warna badge mengikuti kategori tamu
  if (elKategori) {
    var kelas = {
      'universitas': 'badge-universitas',
      'perusahaan': 'badge-perusahaan',
      'alumni': 'badge-alumni',
      'siswa': 'badge-siswa',
      'guru': 'badge-guru'
    };
    var kunci = kategori.toLowerCase();
    elKategori.className = 'badge ' + (kelas[kunci] || 'badge-netral');
  }

  // judul tab ikut nama tamu (enak dilihat saat link dibuka di HP)
  if (namaLengkap !== '') document.title = 'Undangan untuk ' + namaLengkap + ' - Edu Fair 2026';

  // ------------------------------------------------------------------
  // 2. TOMBOL BUKA UNDANGAN
  // ------------------------------------------------------------------
  var tombolBuka = document.getElementById('tombol-buka');
  var amplop = document.getElementById('amplop');

  // Buka undangan: cukup lepas kelas, transisinya dari CSS (fade + naik pelan).
  // Tidak ada lompatan gulir - halaman baru boleh digulir setelah sampul hilang.
  function bukaUndangan(segera) {
    if (!amplop) return;
    if (segera) {
      amplop.style.transitionDuration = '0s';
      var kotak = amplop.querySelector('.amplop-kotak');
      if (kotak) kotak.style.transitionDuration = '0s';
    }

    // halaman di belakang sampul ikut muncul pelan (crossfade, bukan berubah seketika)
    document.body.classList.add('undangan-terbuka');
    amplop.classList.add('amplop-selesai');
    document.body.classList.remove('kunci-gulir');

    // sembunyikan total SETELAH animasi keluar selesai (bukan dengan timer tetap)
    var sudahSelesai = false;
    var sembunyikan = function () {
      if (sudahSelesai) return;
      sudahSelesai = true;
      amplop.setAttribute('aria-hidden', 'true');
      amplop.style.display = 'none';
    };
    amplop.addEventListener('animationend', function (kejadian) {
      if (kejadian.animationName === 'pudarKeluar') sembunyikan();
    });
    amplop.addEventListener('transitionend', function (kejadian) {
      if (kejadian.propertyName === 'visibility') sembunyikan();
    });
    window.setTimeout(sembunyikan, 1400);   // jaring pengaman
  }

  if (tombolBuka && amplop) {
    document.body.classList.add('kunci-gulir');   // cegah halaman bergulir di balik sampul
    tombolBuka.addEventListener('click', function () { bukaUndangan(false); });
    if (params.get('buka') === '1') bukaUndangan(true);   // mode pratinjau
  }

  // ------------------------------------------------------------------
  // 2b. NAVBAR PIL: mengecil halus saat digulir + menandai bagian aktif
  // ------------------------------------------------------------------
  var nav = document.getElementById('nav-pil');
  if (nav) {
    var perbaruiNav = function () {
      nav.classList.toggle('nav-pil-padat', window.scrollY > 28);
    };
    perbaruiNav();
    window.addEventListener('scroll', perbaruiNav, { passive: true });

    var tautan = nav.querySelectorAll('nav a');
    if ('IntersectionObserver' in window) {
      var pengamat = new IntersectionObserver(function (masuk) {
        masuk.forEach(function (m) {
          if (!m.isIntersecting) return;
          tautan.forEach(function (a) {
            a.classList.toggle('aktif', a.getAttribute('href') === '#' + m.target.id);
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ['acara', 'rundown', 'booth', 'lokasi', 'rsvp'].forEach(function (id) {
        var bagian = document.getElementById(id);
        if (bagian) pengamat.observe(bagian);
      });
    }
  }

  // ------------------------------------------------------------------
  // 3. HITUNG MUNDUR
  // ------------------------------------------------------------------
  var waktuAcara = new Date('2026-03-14T07:30:00+07:00').getTime();
  var kotakAngka = document.querySelectorAll('#countdown .angka');

  function perbaruiHitungMundur() {
    if (kotakAngka.length !== 4) return;
    var sisa = waktuAcara - Date.now();
    if (sisa < 0) sisa = 0;

    var hari = Math.floor(sisa / 86400000);
    var jam = Math.floor(sisa / 3600000) % 24;
    var menit = Math.floor(sisa / 60000) % 60;
    var detik = Math.floor(sisa / 1000) % 60;

    kotakAngka[0].textContent = String(hari).padStart(2, '0');
    kotakAngka[1].textContent = String(jam).padStart(2, '0');
    kotakAngka[2].textContent = String(menit).padStart(2, '0');
    kotakAngka[3].textContent = String(detik).padStart(2, '0');
  }
  perbaruiHitungMundur();
  setInterval(perbaruiHitungMundur, 1000);

  // ------------------------------------------------------------------
  // 4. FORM RSVP
  //    Prototipe tanpa server: data disimpan di localStorage browser.
  //    Kalau nanti ada backend, tinggal ganti isi fungsi simpanRsvp().
  // ------------------------------------------------------------------
  var form = document.getElementById('form-rsvp');
  if (form) {
    // isi otomatis dari parameter URL supaya tamu tidak mengetik ulang
    if (namaLengkap !== '' && document.getElementById('r-nama')) document.getElementById('r-nama').value = namaLengkap;
    if (instansi !== '' && document.getElementById('r-instansi')) document.getElementById('r-instansi').value = instansi;
    if (kategori !== '' && document.getElementById('r-kategori')) {
      var pilih = document.getElementById('r-kategori');
      for (var i = 0; i < pilih.options.length; i++) {
        if (pilih.options[i].value.toLowerCase() === kategori.toLowerCase()) pilih.selectedIndex = i;
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var data = {
        nama: document.getElementById('r-nama').value.trim(),
        instansi: document.getElementById('r-instansi').value.trim(),
        kategori: document.getElementById('r-kategori').value,
        kehadiran: document.getElementById('r-kehadiran').value,
        jumlah: parseInt(document.getElementById('r-jumlah').value, 10) || 1,
        pesan: document.getElementById('r-pesan').value.trim(),
        waktu: new Date().toISOString()
      };

      if (data.nama === '') {
        document.getElementById('r-nama').focus();
        return;
      }

      simpanRsvp(data);

      var kotak = document.getElementById('konfirmasi');
      document.getElementById('konfirmasi-nama').textContent = data.nama;
      kotak.classList.add('tampil');
      kotak.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.reset();
    });
  }

  function simpanRsvp(data) {
    try {
      var kunci = 'rsvp-edufair-2026';
      var daftar = JSON.parse(localStorage.getItem(kunci) || '[]');
      daftar.push(data);
      localStorage.setItem(kunci, JSON.stringify(daftar));
    } catch (err) {
      // localStorage bisa diblokir (mode privat); jangan sampai form gagal total
      console.warn('Konfirmasi tidak tersimpan:', err);
    }
  }

  // ------------------------------------------------------------------
  // 5. TOMBOL BAGIKAN KE WHATSAPP
  // ------------------------------------------------------------------
  var bagikan = document.getElementById('bagikan-wa');
  if (bagikan) {
    bagikan.addEventListener('click', function (e) {
      e.preventDefault();
      var pesan = 'Undangan Edu Fair & Career Day 2026 - SMK Negeri 1\n'
                + 'Sabtu, 14 Maret 2026, 07.30 WIB\n\n'
                + 'Silakan buka undangan Anda di sini:\n' + window.location.href;
      window.open('https://wa.me/?text=' + encodeURIComponent(pesan), '_blank');
    });
  }

  // tahun di footer
  var tahun = document.getElementById('tahun');
  if (tahun) tahun.textContent = new Date().getFullYear();
});