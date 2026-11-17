// ===============================
// Ruang Fokus - script.js
// ===============================


// ===== Fungsi bantu =====

function ambil(selector) {
    return document.querySelector(selector);
}

function ambilSemua(selector) {
    return document.querySelectorAll(selector);
}

// ubah tanggal menjadi teks "2026-11-16" untuk dipakai sebagai kunci per hari
function kunciHari(waktu) {
    const d = new Date(waktu);
    const tahun = d.getFullYear();
    const bulan = String(d.getMonth() + 1).padStart(2, '0');
    const tanggal = String(d.getDate()).padStart(2, '0');
    return tahun + '-' + bulan + '-' + tanggal;
}

// simpan dan baca data dari localStorage
function simpan(kunci, nilai) {
    try {
        localStorage.setItem('rf:' + kunci, JSON.stringify(nilai));
    } catch (e) {
        // abaikan jika penyimpanan tidak tersedia
    }
}

function muat(kunci, bawaan) {
    try {
        const data = localStorage.getItem('rf:' + kunci);
        if (data) {
            return JSON.parse(data);
        }
        return bawaan;
    } catch (e) {
        return bawaan;
    }
}


// ===== Tema gelap / terang =====

const root = document.documentElement;
const tombolTema = ambil('#theme');

function aturTema(tema) {
    if (tema === 'light') {
        root.setAttribute('data-theme', 'light');
        tombolTema.textContent = 'Gelap';
    } else {
        root.removeAttribute('data-theme');
        tombolTema.textContent = 'Terang';
    }
    simpan('theme', tema);
}

tombolTema.addEventListener('click', function () {
    if (root.getAttribute('data-theme') === 'light') {
        aturTema('dark');
    } else {
        aturTema('light');
    }
});

aturTema(muat('theme', 'dark'));


// ===== Navigasi antar halaman =====

const daftarHalaman = ['tugas', 'timer', 'catatan', 'statistik'];

function tampilkanHalaman(nama) {
    if (!daftarHalaman.includes(nama)) {
        nama = 'tugas';
    }

    ambilSemua('.view').forEach(function (halaman) {
        halaman.hidden = (halaman.id !== nama);
    });

    ambilSemua('.tab').forEach(function (tab) {
        if (tab.getAttribute('href') === '#' + nama) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    if (nama === 'statistik') {
        tampilkanStatistik();
    }
}

window.addEventListener('hashchange', function () {
    tampilkanHalaman(location.hash.slice(1));
});

// pintasan keyboard: tekan 1 sampai 4
document.addEventListener('keydown', function (e) {
    const sedangMengetik = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if (sedangMengetik || e.ctrlKey || e.metaKey || e.altKey) {
        return;
    }

    const nomor = Number(e.key) - 1;
    if (daftarHalaman[nomor]) {
        location.hash = daftarHalaman[nomor];
    }
});


// ===== Sapaan sesuai waktu =====

function tampilkanSapaan() {
    const sekarang = new Date();
    const jam = sekarang.getHours();
    let sapaan = '';

    if (jam < 11) {
        sapaan = 'Selamat pagi.';
    } else if (jam < 15) {
        sapaan = 'Selamat siang.';
    } else if (jam < 18) {
        sapaan = 'Selamat sore.';
    } else {
        sapaan = 'Selamat malam.';
    }

    ambil('#sapaan').textContent = sapaan;
    ambil('#tanggal').textContent = sekarang.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}


// ===== Tugas =====

let tugas = muat('tasks', []);
let filterAktif = 'semua';
let kataCari = '';

const urutanPrioritas = ['tinggi', 'sedang', 'rendah'];
const daftarTugas = ambil('#daftar-tugas');

if (!Array.isArray(tugas)) {
    tugas = [];
}

function simpanTugas() {
    simpan('tasks', tugas);
    tampilkanTugas();
}

function tampilkanTugas() {
    daftarTugas.innerHTML = '';

    // saring berdasarkan filter dan pencarian, lalu urutkan
    const tampil = tugas
        .filter(function (t) {
            let cocokFilter = true;
            if (filterAktif === 'aktif') {
                cocokFilter = !t.done;
            } else if (filterAktif === 'selesai') {
                cocokFilter = t.done;
            }
            const cocokCari = t.text.toLowerCase().includes(kataCari.toLowerCase());
            return cocokFilter && cocokCari;
        })
        .sort(function (a, b) {
            if (a.done !== b.done) {
                return a.done - b.done;
            }
            const selisihPrioritas = urutanPrioritas.indexOf(a.prio) - urutanPrioritas.indexOf(b.prio);
            if (selisihPrioritas !== 0) {
                return selisihPrioritas;
            }
            return a.created - b.created;
        });

    // pesan jika daftar kosong
    if (tampil.length === 0) {
        const kosong = document.createElement('li');
        kosong.className = 'kosong';
        if (tugas.length > 0) {
            kosong.textContent = 'Tidak ada tugas yang cocok.';
        } else {
            kosong.textContent = 'Belum ada tugas. Tulis satu di atas.';
        }
        daftarTugas.appendChild(kosong);
    }

    // buat satu baris untuk setiap tugas
    tampil.forEach(function (t) {
        const li = document.createElement('li');
        if (t.done) {
            li.className = 'done';
        }

        // kotak centang
        const centang = document.createElement('input');
        centang.type = 'checkbox';
        centang.checked = t.done;
        centang.id = 'c' + t.id;
        centang.addEventListener('change', function () {
            t.done = centang.checked;
            if (t.done) {
                t.doneAt = Date.now();
            } else {
                t.doneAt = null;
            }
            simpanTugas();
        });

        // teks tugas (klik dua kali untuk mengubah)
        const label = document.createElement('label');
        label.htmlFor = centang.id;
        label.textContent = t.text;
        label.title = 'Klik dua kali untuk mengubah';
        label.addEventListener('dblclick', function (e) {
            e.preventDefault();
            ubahTugas(t, li, label);
        });

        // tombol prioritas (klik untuk ganti)
        const prioritas = document.createElement('button');
        prioritas.type = 'button';
        prioritas.className = 'prio ' + t.prio;
        prioritas.textContent = t.prio;
        prioritas.addEventListener('click', function () {
            const nomor = urutanPrioritas.indexOf(t.prio);
            t.prio = urutanPrioritas[(nomor + 1) % urutanPrioritas.length];
            simpanTugas();
        });

        // tombol hapus
        const hapus = document.createElement('button');
        hapus.type = 'button';
        hapus.className = 'hapus';
        hapus.textContent = '\u00d7';
        hapus.setAttribute('aria-label', 'Hapus tugas');
        hapus.addEventListener('click', function () {
            tugas = tugas.filter(function (x) {
                return x.id !== t.id;
            });
            simpanTugas();
        });

        li.append(centang, label, prioritas, hapus);
        daftarTugas.appendChild(li);
    });

    // jumlah tugas selesai
    const jumlahSelesai = tugas.filter(function (t) {
        return t.done;
    }).length;

    if (tugas.length > 0) {
        ambil('#jumlah-tugas').textContent = jumlahSelesai + ' dari ' + tugas.length + ' selesai';
    } else {
        ambil('#jumlah-tugas').textContent = '';
    }

    ambil('#hapus-selesai').style.visibility = jumlahSelesai > 0 ? 'visible' : 'hidden';
}

// ubah teks tugas langsung di tempat
function ubahTugas(t, li, label) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit';
    input.value = t.text;
    input.maxLength = 80;

    li.replaceChild(input, label);
    input.focus();
    input.select();

    let sudahSelesai = false;

    function selesaiMengubah(simpanPerubahan) {
        if (sudahSelesai) {
            return;
        }
        sudahSelesai = true;

        const teksBaru = input.value.trim();
        if (simpanPerubahan && teksBaru) {
            t.text = teksBaru;
        }
        simpanTugas();
    }

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            selesaiMengubah(true);
        }
        if (e.key === 'Escape') {
            selesaiMengubah(false);
        }
    });

    input.addEventListener('blur', function () {
        selesaiMengubah(true);
    });
}

// tambah tugas baru
ambil('#form-tugas').addEventListener('submit', function (e) {
    e.preventDefault();

    const teks = ambil('#input-tugas').value.trim();
    if (teks === '') {
        return;
    }

    tugas.push({
        id: Date.now() + Math.random().toString(36).slice(2, 6),
        text: teks,
        done: false,
        doneAt: null,
        prio: ambil('#pilih-prioritas').value,
        created: Date.now()
    });

    ambil('#input-tugas').value = '';
    simpanTugas();
});

// tombol filter: semua / aktif / selesai
ambil('#filters').addEventListener('click', function (e) {
    const tombol = e.target.closest('button');
    if (!tombol) {
        return;
    }

    filterAktif = tombol.dataset.filter;
    ambilSemua('#filters button').forEach(function (b) {
        b.classList.toggle('active', b === tombol);
    });
    tampilkanTugas();
});

// kolom pencarian
ambil('#cari').addEventListener('input', function (e) {
    kataCari = e.target.value.trim();
    tampilkanTugas();
});

// hapus semua tugas yang sudah selesai
ambil('#hapus-selesai').addEventListener('click', function () {
    tugas = tugas.filter(function (t) {
        return !t.done;
    });
    simpanTugas();
});


// ===== Timer =====

const menitPerMode = {
    fokus: 25,
    pendek: 5,
    panjang: 15
};

const keliling = 2 * Math.PI * 90; // keliling lingkaran r = 90

let mode = 'fokus';
let totalDetik = menitPerMode.fokus * 60;
let sisaDetik = totalDetik;
let berjalan = false;
let waktuSelesai = 0;
let interval = null;
let sesi = muat('sessions', {});

const ring = ambil('#ring');

// ubah detik menjadi format 25:00
function formatWaktu(detik) {
    const menit = String(Math.floor(detik / 60)).padStart(2, '0');
    const sisa = String(detik % 60).padStart(2, '0');
    return menit + ':' + sisa;
}

function perbaruiTimer() {
    ambil('#waktu').textContent = formatWaktu(sisaDetik);
    ring.style.strokeDashoffset = String(keliling * (1 - sisaDetik / totalDetik));

    if (berjalan) {
        document.title = formatWaktu(sisaDetik) + ' - Ruang Fokus';
        ambil('#tombol-mulai').textContent = 'Jeda';
    } else {
        document.title = 'Ruang Fokus';
        if (sisaDetik < totalDetik && sisaDetik > 0) {
            ambil('#tombol-mulai').textContent = 'Lanjut';
        } else {
            ambil('#tombol-mulai').textContent = 'Mulai';
        }
    }
}

function hentikanTimer() {
    berjalan = false;
    clearInterval(interval);
    interval = null;
}

// bunyi pendek tiga kali saat sesi selesai
function bunyi() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.35, 0.7].forEach(function (jeda) {
            const osilator = ctx.createOscillator();
            const volume = ctx.createGain();
            osilator.frequency.value = 660;
            osilator.connect(volume);
            volume.connect(ctx.destination);
            volume.gain.setValueAtTime(0.0001, ctx.currentTime + jeda);
            volume.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + jeda + 0.03);
            volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + jeda + 0.3);
            osilator.start(ctx.currentTime + jeda);
            osilator.stop(ctx.currentTime + jeda + 0.32);
        });
    } catch (e) {
        // abaikan jika audio tidak tersedia
    }
}

function sesiSelesai() {
    hentikanTimer();
    sisaDetik = 0;

    if (mode === 'fokus') {
        const hariIni = kunciHari(Date.now());
        sesi[hariIni] = (sesi[hariIni] || 0) + 1;
        simpan('sessions', sesi);
        ambil('#status').textContent = 'Sesi selesai. Ambil istirahat.';
    } else {
        ambil('#status').textContent = 'Istirahat selesai.';
    }

    bunyi();
    perbaruiTimer();
}

function hitungMundur() {
    sisaDetik = Math.max(0, Math.round((waktuSelesai - Date.now()) / 1000));

    if (sisaDetik === 0) {
        sesiSelesai();
    } else {
        perbaruiTimer();
    }
}

function aturUlangTimer() {
    hentikanTimer();
    sisaDetik = totalDetik;
    ambil('#status').textContent = 'Siap dimulai';
    perbaruiTimer();
}

ambil('#tombol-mulai').addEventListener('click', function () {
    // jika sedang berjalan, jeda
    if (berjalan) {
        hentikanTimer();
        ambil('#status').textContent = 'Dijeda';
        perbaruiTimer();
        return;
    }

    // jika belum berjalan, mulai
    if (sisaDetik === 0) {
        sisaDetik = totalDetik;
    }
    waktuSelesai = Date.now() + sisaDetik * 1000;
    berjalan = true;
    ambil('#status').textContent = (mode === 'fokus') ? 'Sedang fokus' : 'Istirahat';
    interval = setInterval(hitungMundur, 250);
    perbaruiTimer();
});

ambil('#tombol-reset').addEventListener('click', aturUlangTimer);

// pilih mode: fokus / istirahat pendek / istirahat panjang
ambil('#modes').addEventListener('click', function (e) {
    const tombol = e.target.closest('button');
    if (!tombol) {
        return;
    }

    mode = tombol.dataset.mode;
    totalDetik = menitPerMode[mode] * 60;
    ambilSemua('#modes button').forEach(function (b) {
        b.classList.toggle('active', b === tombol);
    });
    aturUlangTimer();
});


// ===== Catatan =====

const isiCatatan = ambil('#isi-catatan');
let timerSimpan = null;

isiCatatan.value = muat('notes', '');

function hitungKarakter() {
    ambil('#jumlah-karakter').textContent = isiCatatan.value.length + ' karakter';
}

isiCatatan.addEventListener('input', function () {
    hitungKarakter();
    ambil('#status-simpan').textContent = 'Menyimpan...';

    // simpan otomatis setelah berhenti mengetik 0,5 detik
    clearTimeout(timerSimpan);
    timerSimpan = setTimeout(function () {
        simpan('notes', isiCatatan.value);
        ambil('#status-simpan').textContent = 'Tersimpan';
    }, 500);
});


// ===== Statistik =====

function tampilkanStatistik() {
    // hitung tugas selesai per hari
    const selesaiPerHari = {};
    tugas.forEach(function (t) {
        if (t.done && t.doneAt) {
            const k = kunciHari(t.doneAt);
            selesaiPerHari[k] = (selesaiPerHari[k] || 0) + 1;
        }
    });

    // hitung hari beruntun
    let beruntun = 0;
    for (let i = 0; i < 365; i++) {
        const k = kunciHari(Date.now() - i * 86400000);
        if (selesaiPerHari[k]) {
            beruntun++;
        } else if (i > 0) {
            break;
        }
    }

    const sesiHariIni = sesi[kunciHari(Date.now())] || 0;
    const totalSesi = Object.values(sesi).reduce(function (a, b) {
        return a + b;
    }, 0);

    const jumlahSelesai = tugas.filter(function (t) {
        return t.done;
    }).length;

    const angka = [
        [jumlahSelesai, 'Tugas selesai'],
        [tugas.length - jumlahSelesai, 'Tugas aktif'],
        [sesiHariIni, 'Sesi fokus hari ini'],
        [totalSesi * 25, 'Menit fokus total'],
        [beruntun, 'Hari beruntun']
    ];

    const kotakAngka = ambil('#angka');
    kotakAngka.innerHTML = '';

    angka.forEach(function (item) {
        const kotak = document.createElement('div');
        kotak.className = 'stat';

        const nilai = document.createElement('b');
        nilai.textContent = item[0];

        const keterangan = document.createElement('span');
        keterangan.textContent = item[1];

        kotak.append(nilai, keterangan);
        kotakAngka.appendChild(kotak);
    });

    // grafik batang 7 hari terakhir
    const hari = [];
    for (let i = 6; i >= 0; i--) {
        hari.push(Date.now() - i * 86400000);
    }

    const nilaiHari = hari.map(function (h) {
        return selesaiPerHari[kunciHari(h)] || 0;
    });
    const tertinggi = Math.max(1, ...nilaiHari);

    const grafik = ambil('#grafik');
    grafik.innerHTML = '';

    hari.forEach(function (h, i) {
        const kolom = document.createElement('div');
        kolom.className = 'col';

        const angkaAtas = document.createElement('span');
        angkaAtas.textContent = nilaiHari[i];

        const batang = document.createElement('i');
        batang.style.height = '0%';
        if (nilaiHari[i] === 0) {
            batang.className = 'nol';
        }

        const namaHari = document.createElement('span');
        namaHari.textContent = new Date(h).toLocaleDateString('id-ID', { weekday: 'short' });

        kolom.append(angkaAtas, batang, namaHari);
        grafik.appendChild(kolom);

        // beri jeda singkat supaya animasi batang terlihat
        setTimeout(function () {
            batang.style.height = (nilaiHari[i] / tertinggi * 70) + '%';
        }, 50);
    });
}

// unduh semua data sebagai file JSON
ambil('#unduh').addEventListener('click', function () {
    const data = JSON.stringify({
        tasks: tugas,
        sessions: sesi,
        notes: isiCatatan.value,
        exported: new Date().toISOString()
    }, null, 2);

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    link.download = 'ruang-fokus.json';
    link.click();

    setTimeout(function () {
        URL.revokeObjectURL(link.href);
    }, 1000);
});

// hapus semua data
ambil('#hapus-semua').addEventListener('click', function () {
    if (!confirm('Hapus semua tugas, catatan, dan statistik?')) {
        return;
    }

    tugas = [];
    sesi = {};
    isiCatatan.value = '';

    simpan('tasks', tugas);
    simpan('sessions', sesi);
    simpan('notes', '');

    hitungKarakter();
    tampilkanTugas();
    tampilkanStatistik();
});


// ===== Jalankan saat halaman dibuka =====

tampilkanSapaan();
tampilkanTugas();
perbaruiTimer();
hitungKarakter();
tampilkanHalaman(location.hash.slice(1));
