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

    // Pemisah standar = koma biasa. Kalau koma sudah di-encode jadi %2C
    // (sebagian aplikasi pesan melakukan ini), tetap dibaca sebagai pemisah.
    var mentah = cocok[1].indexOf(',') > -1
      ? cocok[1].split(',')
      : decodeURIComponent(cocok[1]).split(',');

    mentah = mentah.map(function (bagian) {
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
  // 4. FORM RSVP + DAFTAR KONFIRMASI BERSAMA
  //    Penyimpanan bersama memakai ntfy.sh (tanpa akun, tanpa server sendiri).
  //    Setiap konfirmasi dikirim sebagai satu pesan JSON ke topik di bawah,
  //    lalu halaman undangan membaca topik itu dan menampilkan semuanya.
  //    Cadangan: localStorage, dipakai kalau jaringan bermasalah.
  // ------------------------------------------------------------------
  var KONFIRMASI = {
    dasar: 'https://ntfy.sh',
    topik: 'edufair2026-konfirmasi-erlan-7f3a9'
  };

  function alamatTopik(ekstra) {
    return KONFIRMASI.dasar + '/' + KONFIRMASI.topik + (ekstra || '');
  }

  function ambilLokal() {
    try {
      return JSON.parse(localStorage.getItem('rsvp-edufair-2026') || '[]');
    } catch (err) {
      return [];
    }
  }

  function simpanLokal(data) {
    try {
      var daftar = ambilLokal();
      daftar.push(data);
      localStorage.setItem('rsvp-edufair-2026', JSON.stringify(daftar));
    } catch (err) {
      console.warn('Cadangan lokal tidak tersimpan:', err);
    }
  }

  // kirim konfirmasi ke penyimpanan bersama
  function kirimKonfirmasi(data) {
    var ke = alamatTopik();
    return fetch(ke, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return true;
    });
  }

  // baca semua konfirmasi, gabungkan dengan cadangan lokal, lalu gambar
  function muatKonfirmasi() {
    var daftar = ambilLokal();

    return fetch(alamatTopik('/json?poll=1&since=all'), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (teks) {
        var dariTopik = teks.split('\n').filter(function (b) { return b.trim() !== ''; })
          .map(function (b) {
            try {
              var isi = JSON.parse(b);
              var data = JSON.parse(isi.message);
              data._id = isi.id;
              data._waktu = isi.time;
              return data;
            } catch (err) {
              return null;                 // pesan uji/asing diabaikan
            }
          })
          .filter(function (x) { return x && x.nama; });

        // gabung: utamakan yang dari topik, tambah yang hanya ada di perangkat ini
        var kunci = {};
        var gabung = [];
        [].concat(dariTopik, daftar).forEach(function (d) {
          var id = d._id || (d.nama + '|' + d.kehadiran + '|' + (d.pesan || ''));
          if (kunci[id]) return;
          kunci[id] = true;
          gabung.push(d);
        });

        gabung.sort(function (a, b) {
          var ta = a._waktu ? a._waktu : Date.parse(a.waktu || 0) / 1000;
          var tb = b._waktu ? b._waktu : Date.parse(b.waktu || 0) / 1000;
          return tb - ta;
        });

        gambarKonfirmasi(gabung);
        var status = document.getElementById('status-simpan');
        if (status) status.textContent = dariTopik.length
          ? 'Terhubung ke daftar bersama (' + dariTopik.length + ' konfirmasi).'
          : 'Mode luring: konfirmasi tersimpan di perangkat ini dulu.';
      })
      .catch(function () {
        gambarKonfirmasi(daftar);
        var status = document.getElementById('status-simpan');
        if (status) status.textContent = 'Mode luring: konfirmasi tersimpan di perangkat ini dulu.';
      });
  }

  function gambarKonfirmasi(daftar) {
    var wadah = document.getElementById('daftar-konfirmasi');
    if (!wadah) return;

    var hitung = { Hadir: 0, 'Tidak Hadir': 0, Ragu: 0, orang: 0 };
    daftar.forEach(function (d) {
      if (hitung[d.kehadiran] !== undefined) hitung[d.kehadiran]++;
      if (d.kehadiran === 'Hadir') hitung.orang += parseInt(d.jumlah, 10) || 1;
    });

    var set = function (id, nilai) {
      var el = document.getElementById(id);
      if (el) el.textContent = nilai;
    };
    set('stat-hadir', hitung.Hadir);
    set('stat-tidak', hitung['Tidak Hadir']);
    set('stat-ragu', hitung.Ragu);
    set('stat-orang', hitung.orang);
    set('jumlah-konfirmasi', '(' + daftar.length + ' konfirmasi)');

    if (!daftar.length) {
      wadah.innerHTML = '<p class="kecil">Belum ada konfirmasi. Jadilah yang pertama.</p>';
      return;
    }

    wadah.innerHTML = daftar.map(function (d) {
      var kehadiran = d.kehadiran || 'Ragu';
      var kelas = kehadiran === 'Hadir' ? 'hadir' : (kehadiran === 'Tidak Hadir' ? 'tidak' : 'ragu');
      var inisial = (d.nama || '?').trim().charAt(0).toUpperCase();
      var waktu = d._waktu ? new Date(d._waktu * 1000) : new Date(d.waktu || Date.now());
      var tanggal = waktu.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      var tambahan = d.instansi ? '<span class="kecil">' + aman(d.instansi) + '</span>' : '';

      return '<div class="kartu-ucapan">' +
        '<div class="baris-atas">' +
          '<span class="nama"><span class="avatar">' + aman(inisial) + '</span>' + aman(d.nama) + '</span>' +
          '<span class="badge badge-' + kelas + '">' + aman(kehadiran) +
            (parseInt(d.jumlah, 10) > 1 ? ' ' + aman(String(d.jumlah)) + ' orang' : '') + '</span>' +
        '</div>' +
        (d.pesan ? '<p class="isi">' + aman(d.pesan) + '</p>' : '') +
        tambahan +
        '<span class="waktu">' + tanggal + '</span>' +
      '</div>';
    }).join('');
  }

  function aman(teks) {
    return String(teks == null ? '' : teks)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

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

      var kotak = document.getElementById('konfirmasi');
      var status = document.getElementById('status-simpan');

      simpanLokal(data);                    // langsung aman di perangkat ini
      gambarKonfirmasi(ambilLokal());       // tampil segera

      kirimKonfirmasi(data)
        .then(function () {
          if (status) status.textContent = 'Tersimpan ke daftar bersama.';
          return muatKonfirmasi();
        })
        .catch(function () {
          if (status) status.textContent = 'Gagal kirim ke daftar bersama - tersimpan di perangkat ini saja.';
        });

      document.getElementById('konfirmasi-nama').textContent = data.nama;
      kotak.classList.add('tampil');
      kotak.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.reset();
    });

    // muat pertama + perbarui tiap 15 detik supaya konfirmasi orang lain ikut terlihat
    muatKonfirmasi();
    setInterval(muatKonfirmasi, 15000);
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