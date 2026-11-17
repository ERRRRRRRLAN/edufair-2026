/* ==========================================================================
   admin.js - halaman admin.html
   1. Membaca file CSV (FileReader untuk upload, fetch untuk data contoh)
   2. Mengurai CSV sendiri (mendukung tanda kutip, nama yang mengandung koma)
   3. Menampilkan tabel + pencarian + filter kategori
   4. Membuat link personalisasi dan link WhatsApp (blast) per tamu
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  var templateBawaan =
    'Yth. {nama}\n' +
    '{instansi}\n\n' +
    'Dengan hormat, kami mengundang Bapak/Ibu/Saudara/i untuk hadir pada acara ' +
    'Edu Fair & Career Day 2026 SMK Negeri 1.\n\n' +
    'Hari/Tanggal : Sabtu, 14 Maret 2026\n' +
    'Waktu        : 07.30 - 15.00 WIB\n' +
    'Tempat       : Aula & Lapangan SMK Negeri 1\n\n' +
    'Undangan digital Anda (nama sudah tercetak otomatis):\n' +
    '{link}\n\n' +
    'Merupakan suatu kehormatan apabila Bapak/Ibu/Saudara/i berkenan hadir.\n' +
    'Terima kasih.\n\n' +
    'Panitia Edu Fair & Career Day 2026';

  var daftarTamu = [];      // semua baris CSV
  var elStatus = document.getElementById('status-baca');
  var elTabel = document.getElementById('isi-tabel');
  var elKeterangan = document.getElementById('keterangan-tabel');
  var elCari = document.getElementById('cari');
  var elFilter = document.getElementById('filter-kategori');
  var elTemplate = document.getElementById('template-pesan');

  elTemplate.value = templateBawaan;

  // ------------------------------------------------------------------
  // 1. PENGURAI CSV
  //    - pemisah dideteksi otomatis: koma, titik koma (Excel Indonesia),
  //      atau tab. Excel berbahasa Indonesia menyimpan CSV dengan ";".
  //    - nama instansi bisa mengandung koma di dalam tanda kutip,
  //      contoh: "Dr. Rina Kusumawati, M.Pd."
  // ------------------------------------------------------------------
  function deteksiPemisah(teks) {
    var calon = [',', ';', '\t'];
    var barisPertama = teks.split('\n')[0] || '';
    var terbaik = ',';
    var terbanyak = 0;

    calon.forEach(function (p) {
      // hitung pemisah di luar tanda kutip
      var jumlah = 0, dalamKutip = false;
      for (var i = 0; i < barisPertama.length; i++) {
        var c = barisPertama[i];
        if (c === '"') dalamKutip = !dalamKutip;
        else if (c === p && !dalamKutip) jumlah++;
      }
      if (jumlah > terbanyak) { terbanyak = jumlah; terbaik = p; }
    });
    return terbaik;
  }

  function uraiCsv(teks, pemisah) {
    pemisah = pemisah || deteksiPemisah(teks);
    var hasil = [];
    var baris = [];
    var sel = '';
    var dalamKutip = false;

    teks = teks.replace(/^\uFEFF/, '')          // buang BOM dari Excel
               .replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (var i = 0; i < teks.length; i++) {
      var ch = teks[i];

      if (dalamKutip) {
        if (ch === '"') {
          if (teks[i + 1] === '"') {   // "" di dalam kutip = satu tanda kutip asli
            sel += '"';
            i++;
          } else {
            dalamKutip = false;
          }
        } else {
          sel += ch;                   // pemisah & baris baru di dalam kutip tetap isi sel
        }
        continue;
      }

      if (ch === '"') {
        dalamKutip = true;
      } else if (ch === pemisah) {
        baris.push(sel);
        sel = '';
      } else if (ch === '\n') {
        baris.push(sel);
        hasil.push(baris);
        baris = [];
        sel = '';
      } else {
        sel += ch;
      }
    }

    if (sel !== '' || baris.length > 0) {
      baris.push(sel);
      hasil.push(baris);
    }
    return hasil;
  }

  // ------------------------------------------------------------------
  // 1b. NAMA KOLOM: dibuat toleran supaya CSV dari Excel/Sheets tetap terbaca
  //     "Nama Tamu", "NAMA_TAMU", "no whatsapp", "No. HP" -> dikenali
  // ------------------------------------------------------------------
  var ALIAS = {
    id: ['id', 'no', 'nomor', 'nomor_urut', 'urut'],
    nama_tamu: ['nama_tamu', 'nama', 'name', 'nama_lengkap', 'namatamu', 'tamu'],
    instansi: ['instansi', 'institusi', 'instansi_universitas', 'universitas', 'perusahaan', 'sekolah', 'asal', 'lembaga'],
    kategori: ['kategori', 'kategory', 'tipe', 'jenis', 'golongan'],
    no_whatsapp: ['no_whatsapp', 'whatsapp', 'no_wa', 'wa', 'nomor_wa', 'telepon', 'no_hp', 'nohp', 'hp', 'phone', 'kontak', 'no_telp', 'telp']
  };

  function kunciHeader(nama) {
    var k = String(nama || '')
      .replace(/^\uFEFF/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    for (var kunci in ALIAS) {
      if (ALIAS[kunci].indexOf(k) > -1) return kunci;
    }
    return k;
  }

  // nomor yang dirusak Excel menjadi notasi ilmiah: 6,28226E+12
  function nomorMeragukan(nomor) {
    var n = String(nomor || '').trim();
    if (n === '') return true;
    if (/e\+?\d+/i.test(n)) return true;            // 6,28226E+12
    if (!/^[0-9+()\s.\-]+$/.test(n)) return true;   // ada huruf/simbol aneh
    var digit = n.replace(/[^0-9]/g, '');
    return digit.length < 9 || digit.length > 15;
  }

  // ------------------------------------------------------------------
  // 2. PROSES DATA HASIL URAIAN -> OBJEK
  // ------------------------------------------------------------------
  function siapkanData(barisCsv) {
    if (!barisCsv.length) return [];

    // header diterjemahkan ke nama baku (id, nama_tamu, instansi, kategori, no_whatsapp)
    var header = barisCsv[0].map(kunciHeader);
    var data = [];

    for (var i = 1; i < barisCsv.length; i++) {
      var kolom = barisCsv[i];
      if (!kolom || kolom.join('').trim() === '') continue;

      var obj = {};
      for (var c = 0; c < header.length; c++) {
        obj[header[c]] = (kolom[c] || '').trim();
      }

      // kalau kolom nama tidak dikenali, ambil kolom kedua sebagai nama
      if (!obj.nama_tamu && kolom.length > 1) obj.nama_tamu = (kolom[1] || '').trim();

      if (!obj.nama_tamu) continue;

      obj.nomor_meragukan = nomorMeragukan(obj.no_whatsapp);
      data.push(obj);
    }
    return data;
  }

  function infoHeader(barisCsv) {
    if (!barisCsv.length) return '';
    return barisCsv[0].map(function (h) { return h.trim(); }).join(' | ');
  }

  // ------------------------------------------------------------------
  // 3. LINK PERSONALISASI + PESAN WHATSAPP
  // ------------------------------------------------------------------
  function linkUndangan(tamu) {
    var dasar = window.location.href.replace(/admin\.html.*$/, 'index.html');
    var q = new URLSearchParams();
    q.set('to', tamu.nama_tamu || 'Tamu Undangan');
    q.set('kategori', tamu.kategori || 'Peserta');
    if (tamu.instansi) q.set('instansi', tamu.instansi);
    return dasar + '?' + q.toString();
  }

  function pesanUntuk(tamu, link) {
    return elTemplate.value
      .replace(/\{nama\}/g, tamu.nama_tamu || '')
      .replace(/\{instansi\}/g, tamu.instansi || '')
      .replace(/\{kategori\}/g, tamu.kategori || '')
      .replace(/\{link\}/g, link);
  }

  function linkWhatsApp(tamu) {
    // nomor yang rusak (mis. 6,28226E+12 dari Excel) tidak dibuatkan link,
    // supaya tidak mengirim undangan ke nomor yang salah
    if (tamu.nomor_meragukan) return '';
    var link = linkUndangan(tamu);
    var nomor = (tamu.no_whatsapp || '').replace(/[^0-9]/g, '');
    if (nomor.indexOf('0') === 0) nomor = '62' + nomor.slice(1);  // 08xx -> 628xx
    return 'https://wa.me/' + nomor + '?text=' + encodeURIComponent(pesanUntuk(tamu, link));
  }

  // ------------------------------------------------------------------
  // 4. TAMPILKAN TABEL
  // ------------------------------------------------------------------
  var kelasKategori = {
    'universitas': 'badge-universitas',
    'perusahaan': 'badge-perusahaan',
    'alumni': 'badge-alumni'
  };

  function gambarTabel() {
    var kunci = (elCari.value || '').toLowerCase().trim();
    var filter = elFilter.value;

    var tampil = daftarTamu.filter(function (t) {
      var cocokKata = (t.nama_tamu + ' ' + t.instansi + ' ' + t.kategori).toLowerCase().indexOf(kunci) > -1;
      var cocokFilter = filter === '' || (t.kategori || '').toLowerCase() === filter.toLowerCase();
      return cocokKata && cocokFilter;
    });

    elTabel.innerHTML = '';

    if (!tampil.length) {
      elTabel.innerHTML = '<tr><td colspan="6" class="kecil">Tidak ada tamu yang cocok.</td></tr>';
    }

    tampil.forEach(function (t, urut) {
      var link = linkUndangan(t);
      var wa = linkWhatsApp(t);
      var tr = document.createElement('tr');

      var selNomor = '<td class="kolom-pendek" data-label="No. WhatsApp">' +
          aman(t.no_whatsapp) +
          (t.nomor_meragukan ? ' <span class="badge badge-tidak">perlu dicek</span>' : '') +
        '</td>';

      var aksi = t.nomor_meragukan
        ? '<span class="badge badge-ragu">nomor tidak valid</span>' +
          '<button class="btn btn-kecil btn-garis" type="button" data-link="' + aman(link) + '">Salin link</button>' +
          '<a class="btn btn-kecil btn-garis" target="_blank" rel="noopener" href="' + aman(link) + '">Buka</a>'
        : '<a class="btn btn-kecil" target="_blank" rel="noopener" href="' + aman(wa) + '">Kirim WA</a>' +
          '<button class="btn btn-kecil btn-garis" type="button" data-link="' + aman(link) + '">Salin link</button>' +
          '<a class="btn btn-kecil btn-garis" target="_blank" rel="noopener" href="' + aman(link) + '">Buka</a>';

      tr.innerHTML =
        '<td class="kolom-pendek" data-label="ID">' + aman(t.id || urut + 1) + '</td>' +
        '<td class="kolom-pendek" data-label="Nama">' + aman(t.nama_tamu) + '</td>' +
        '<td data-label="Instansi">' + aman(t.instansi) + '</td>' +
        '<td class="kolom-pendek" data-label="Kategori">' +
          '<span class="badge ' + (kelasKategori[(t.kategori || '').toLowerCase()] || 'badge-netral') + '">' + aman(t.kategori) + '</span>' +
        '</td>' +
        selNomor +
        '<td class="kolom-aksi" data-label="Aksi">' + aksi + '</td>';

      elTabel.appendChild(tr);
    });

    // tombol salin link
    elTabel.querySelectorAll('button[data-link]').forEach(function (tombol) {
      tombol.addEventListener('click', function () {
        var tautan = tombol.getAttribute('data-link');
        if (navigator.clipboard) navigator.clipboard.writeText(tautan);
        var asal = tombol.textContent;
        tombol.textContent = 'Tersalin';
        setTimeout(function () { tombol.textContent = asal; }, 1400);
      });
    });

    elKeterangan.textContent = 'Daftar tamu (' + tampil.length + ' dari ' + daftarTamu.length + ')';
    perbaruiStatistik();
  }

  function aman(teks) {
    return String(teks == null ? '' : teks)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function perbaruiStatistik() {
    var hitung = { universitas: 0, perusahaan: 0, alumni: 0 };
    daftarTamu.forEach(function (t) {
      var k = (t.kategori || '').toLowerCase();
      if (hitung[k] !== undefined) hitung[k]++;
    });
    document.getElementById('stat-total').textContent = daftarTamu.length;
    document.getElementById('stat-universitas').textContent = hitung.universitas;
    document.getElementById('stat-perusahaan').textContent = hitung.perusahaan;
    document.getElementById('stat-alumni').textContent = hitung.alumni;
  }

  // ------------------------------------------------------------------
  // 5. MUAT DATA: dari upload (FileReader) atau data contoh (fetch)
  // ------------------------------------------------------------------
  function pakaiTeksCsv(teks, sumber) {
    var pemisah = deteksiPemisah(teks);
    var barisCsv = uraiCsv(teks, pemisah);
    daftarTamu = siapkanData(barisCsv);
    gambarTabel();

    var namaPemisah = pemisah === ';' ? 'titik koma' : (pemisah === '\t' ? 'tab' : 'koma');

    if (daftarTamu.length === 0) {
      // jangan biarkan pesan "0 tamu" tanpa penjelasan
      var contoh = (teks.split('\n')[1] || '').slice(0, 70);
      elStatus.innerHTML = 'Tidak ada tamu yang terbaca dari <strong>' + sumber + '</strong>. ' +
        'Pemisah terdeteksi: <strong>' + namaPemisah + '</strong>. ' +
        'Kolom terbaca: <code>' + aman(infoHeader(barisCsv)) + '</code>. ' +
        'Baris contoh: <code>' + aman(contoh) + '</code>. ' +
        'Pastikan ada kolom nama (nama_tamu / nama).';
      elStatus.setAttribute('data-status', 'kosong');
      return;
    }

    var perluDicek = daftarTamu.filter(function (t) { return t.nomor_meragukan; }).length;

    elStatus.textContent = 'Berhasil memuat ' + daftarTamu.length + ' tamu dari ' + sumber +
      ' (pemisah: ' + namaPemisah + ').' +
      (perluDicek ? ' ' + perluDicek + ' nomor WhatsApp tidak valid (format ilmiah dari Excel seperti 6,28226E+12) - tombol WA baris itu dinonaktifkan.' : '');
    elStatus.setAttribute('data-status', 'ok:' + daftarTamu.length);
  }

  document.getElementById('file-csv').addEventListener('change', function (e) {
    var berkas = e.target.files[0];
    if (!berkas) return;

    // FileReader = cara membaca file di sisi browser tanpa server
    var pembaca = new FileReader();
    pembaca.onload = function (ev) {
      pakaiTeksCsv(ev.target.result, berkas.name);
    };
    pembaca.readAsText(berkas);
  });

  document.getElementById('muat-contoh').addEventListener('click', function () {
    // 1) coba ambil file asli (butuh http/Apache)
    fetch('data-tamu.csv')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (teks) {
        if (teks.indexOf('nama_tamu') === -1 && teks.indexOf('nama') === -1) {
          throw new Error('isi bukan CSV');
        }
        pakaiTeksCsv(teks, 'data-tamu.csv');
      })
      .catch(function () {
        // 2) cadangan: data yang ditanam di data-tamu.js (dipakai saat file://)
        if (window.DATA_TAMU_CSV) {
          pakaiTeksCsv(window.DATA_TAMU_CSV, 'data cadangan (data-tamu.js)');
          elStatus.textContent += ' Halaman dibuka tanpa server, jadi data dibaca dari cadangan.';
        } else {
          elStatus.textContent = 'Gagal memuat data contoh. Pilih file CSV secara manual lewat kotak di atas.';
          elStatus.setAttribute('data-status', 'gagal');
        }
      });
  });

  // tarik-lepas (drag & drop) file CSV
  var dropzone = document.getElementById('dropzone');
  ['dragenter', 'dragover'].forEach(function (nama) {
    dropzone.addEventListener(nama, function (e) {
      e.preventDefault();
      dropzone.classList.add('aktif');
    });
  });
  ['dragleave', 'drop'].forEach(function (nama) {
    dropzone.addEventListener(nama, function (e) {
      e.preventDefault();
      dropzone.classList.remove('aktif');
    });
  });
  dropzone.addEventListener('drop', function (e) {
    var berkas = e.dataTransfer.files[0];
    if (!berkas) return;
    var pembaca = new FileReader();
    pembaca.onload = function (ev) { pakaiTeksCsv(ev.target.result, berkas.name); };
    pembaca.readAsText(berkas);
  });

  // pencarian + filter
  elCari.addEventListener('input', gambarTabel);
  elFilter.addEventListener('change', gambarTabel);

  // contoh pesan (pratinjau template)
  function perbaruiContoh() {
    var contoh = { nama_tamu: 'Dr. Rina Kusumawati, M.Pd.', instansi: 'Universitas Indonesia', kategori: 'Universitas' };
    document.getElementById('contoh-pesan').textContent =
      'Pratinjau: ' + pesanUntuk(contoh, 'https://.../index.html?to=...').split('\n')[0] + ' ...';
  }
  elTemplate.addEventListener('input', perbaruiContoh);
  perbaruiContoh();

  // kalau dibuka lewat web server, data contoh langsung dimuat;
  // kalau dibuka sebagai file://, tombol contoh memakai data-tamu.js (cadangan)
  document.getElementById('muat-contoh').click();
  if (window.location.protocol === 'file:') {
    elStatus.textContent = 'Dibuka sebagai file langsung (file://). Data contoh dibaca dari cadangan; untuk data lain, pilih file CSV manual.';
  }
});