<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Gedung;
use App\Models\Ruangan;
use App\Models\Kategori;
use App\Models\Kondisi;
use App\Models\SumberDana;
use App\Models\Aset;
use App\Models\Servis;
use App\Models\Peminjaman;
use Illuminate\Support\Facades\DB;

class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        // Disable foreign key checks (SQLite & MySQL compatible)
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
        }

        Servis::truncate();
        Peminjaman::truncate();
        Aset::truncate();
        Ruangan::truncate();
        Gedung::truncate();
        Kategori::truncate();
        Kondisi::truncate();
        SumberDana::truncate();

        if ($driver === 'mysql') {
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        } elseif ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON;');
        }

        // Pastikan admin ada
        $admin = User::firstOrCreate(
            ['username' => 'admin'],
            [
                'nama_lengkap' => 'Administrator',
                'email'        => 'admin@sekolah.com',
                'password'     => bcrypt('password123'),
                'role'         => 'admin',
                'status'       => true,
            ]
        );

        // ─── GEDUNG ───────────────────────────────────────────────
        $gedungs = [
            ['nama_gedung' => 'Gedung A (Kelas Teori)', 'deskripsi' => 'Gedung utama ruang kelas teori', 'jumlah_lantai' => 2],
            ['nama_gedung' => 'Gedung B (Laboratorium)', 'deskripsi' => 'Gedung laboratorium komputer dan sains', 'jumlah_lantai' => 2],
            ['nama_gedung' => 'Gedung C (Bengkel)', 'deskripsi' => 'Gedung praktik kejuruan dan bengkel', 'jumlah_lantai' => 1],
        ];
        foreach ($gedungs as $g) {
            Gedung::create($g);
        }
        $gedungA = Gedung::where('nama_gedung', 'like', '%Gedung A%')->first();
        $gedungB = Gedung::where('nama_gedung', 'like', '%Gedung B%')->first();
        $gedungC = Gedung::where('nama_gedung', 'like', '%Gedung C%')->first();

        // ─── RUANGAN ─────────────────────────────────────────────
        $ruanganData = [
            // Gedung A
            ['nama_ruangan' => 'Kelas X-TKJ-1',    'lantai' => '1', 'deskripsi' => 'Kelas Teori TKJ Angkatan 1', 'id_gedung' => $gedungA->id],
            ['nama_ruangan' => 'Kelas XI-TKJ-2',   'lantai' => '1', 'deskripsi' => 'Kelas Teori TKJ Angkatan 2', 'id_gedung' => $gedungA->id],
            ['nama_ruangan' => 'Kelas XII-AKUN',   'lantai' => '2', 'deskripsi' => 'Kelas Akuntansi',            'id_gedung' => $gedungA->id],
            ['nama_ruangan' => 'Ruang Guru',        'lantai' => '1', 'deskripsi' => 'Ruang Dewan Guru',          'id_gedung' => $gedungA->id],
            // Gedung B
            ['nama_ruangan' => 'Lab Komputer 1',   'lantai' => '1', 'deskripsi' => 'Laboratorium TKJ',          'id_gedung' => $gedungB->id],
            ['nama_ruangan' => 'Lab Komputer 2',   'lantai' => '2', 'deskripsi' => 'Laboratorium Multimedia',   'id_gedung' => $gedungB->id],
            // Gedung C
            ['nama_ruangan' => 'Bengkel Otomotif', 'lantai' => '1', 'deskripsi' => 'Bengkel Praktik Otomotif',  'id_gedung' => $gedungC->id],
            ['nama_ruangan' => 'Gudang',            'lantai' => '1', 'deskripsi' => 'Gudang penyimpanan aset',  'id_gedung' => $gedungC->id],
        ];
        foreach ($ruanganData as $r) {
            Ruangan::create($r);
        }
        $ruangans = Ruangan::all();

        // ─── KATEGORI ────────────────────────────────────────────
        $kategoriData = [
            'Elektronik & Komputer',
            'Mebel & Furnitur',
            'Peralatan Praktik',
            'Alat Tulis Kantor',
            'Peralatan Kebersihan',
        ];
        foreach ($kategoriData as $k) {
            Kategori::create(['nama_kategori' => $k]);
        }
        $kategoris = Kategori::all()->keyBy('nama_kategori');

        // ─── KONDISI ─────────────────────────────────────────────
        $kondisiData = ['Baik', 'Cukup Baik', 'Rusak Ringan', 'Rusak Berat'];
        foreach ($kondisiData as $k) {
            Kondisi::create(['nama_kondisi' => $k]);
        }
        $kondisis = Kondisi::all()->keyBy('nama_kondisi');

        // ─── SUMBER DANA ─────────────────────────────────────────
        $sumberDanaData = ['Dana BOS', 'APBD', 'Bantuan Provinsi', 'Dana Komite', 'Hibah'];
        foreach ($sumberDanaData as $s) {
            SumberDana::create(['nama_sumber' => $s]);
        }
        $sumberDanas = SumberDana::all();

        // ─── 50 ASET DUMMY ────────────────────────────────────────
        $asetList = [
            // Lab Komputer 1
            ['nama_aset' => 'PC Desktop Acer',       'merek' => 'Acer',      'tipe' => 'Aspire TC-895',  'ruangan' => 'Lab Komputer 1',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 20, 'satuan' => 'Unit',   'harga' => 6500000],
            ['nama_aset' => 'Monitor LED 21"',        'merek' => 'Samsung',   'tipe' => 'S21BN250',       'ruangan' => 'Lab Komputer 1',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 20, 'satuan' => 'Unit',   'harga' => 1800000],
            ['nama_aset' => 'Keyboard USB',           'merek' => 'Logitech',  'tipe' => 'K120',           'ruangan' => 'Lab Komputer 1',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Cukup Baik',    'jumlah' => 22, 'satuan' => 'Unit',   'harga' => 150000],
            ['nama_aset' => 'Mouse Optik USB',        'merek' => 'Logitech',  'tipe' => 'M100',           'ruangan' => 'Lab Komputer 1',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Cukup Baik',    'jumlah' => 22, 'satuan' => 'Unit',   'harga' => 100000],
            ['nama_aset' => 'Switch Hub 24 Port',     'merek' => 'TP-Link',   'tipe' => 'TL-SF1024',      'ruangan' => 'Lab Komputer 1',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 1,  'satuan' => 'Unit',   'harga' => 850000],
            ['nama_aset' => 'Printer Laser',          'merek' => 'HP',        'tipe' => 'LaserJet M110w', 'ruangan' => 'Lab Komputer 1',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Rusak Ringan',  'jumlah' => 1,  'satuan' => 'Unit',   'harga' => 2100000],
            // Lab Komputer 2
            ['nama_aset' => 'Laptop Multimedia',      'merek' => 'Lenovo',    'tipe' => 'IdeaPad 3',      'ruangan' => 'Lab Komputer 2',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 15, 'satuan' => 'Unit',   'harga' => 8000000],
            ['nama_aset' => 'Headset Multimedia',     'merek' => 'JBL',       'tipe' => 'T110',           'ruangan' => 'Lab Komputer 2',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Cukup Baik',    'jumlah' => 15, 'satuan' => 'Unit',   'harga' => 250000],
            ['nama_aset' => 'Kamera DSLR',            'merek' => 'Canon',     'tipe' => 'EOS 200D',       'ruangan' => 'Lab Komputer 2',   'kategori' => 'Peralatan Praktik',     'kondisi' => 'Baik',          'jumlah' => 3,  'satuan' => 'Unit',   'harga' => 7500000],
            ['nama_aset' => 'Tripod Kamera',          'merek' => 'Joby',      'tipe' => 'GorillaPod',     'ruangan' => 'Lab Komputer 2',   'kategori' => 'Peralatan Praktik',     'kondisi' => 'Baik',          'jumlah' => 3,  'satuan' => 'Unit',   'harga' => 450000],
            // Ruang Guru
            ['nama_aset' => 'Meja Guru',              'merek' => '-',         'tipe' => 'Kayu Jati',      'ruangan' => 'Ruang Guru',       'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Baik',          'jumlah' => 20, 'satuan' => 'Unit',   'harga' => 1200000],
            ['nama_aset' => 'Kursi Guru',             'merek' => 'Olympic',   'tipe' => 'Ergonomic',      'ruangan' => 'Ruang Guru',       'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Baik',          'jumlah' => 20, 'satuan' => 'Unit',   'harga' => 800000],
            ['nama_aset' => 'Laptop Guru',            'merek' => 'Asus',      'tipe' => 'VivoBook 14',    'ruangan' => 'Ruang Guru',       'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 5,  'satuan' => 'Unit',   'harga' => 7200000],
            ['nama_aset' => 'Printer Inkjet',         'merek' => 'Epson',     'tipe' => 'L3250',          'ruangan' => 'Ruang Guru',       'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 2,  'satuan' => 'Unit',   'harga' => 2500000],
            ['nama_aset' => 'Lemari Arsip',           'merek' => 'Brother',   'tipe' => 'Metal 4 Pintu',  'ruangan' => 'Ruang Guru',       'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Baik',          'jumlah' => 4,  'satuan' => 'Unit',   'harga' => 2000000],
            ['nama_aset' => 'Papan Pengumuman',       'merek' => '-',         'tipe' => 'Busa Cork',      'ruangan' => 'Ruang Guru',       'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Cukup Baik',    'jumlah' => 2,  'satuan' => 'Unit',   'harga' => 350000],
            // Kelas X-TKJ-1
            ['nama_aset' => 'Meja Siswa',             'merek' => '-',         'tipe' => 'Kayu Standar',   'ruangan' => 'Kelas X-TKJ-1',    'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Cukup Baik',    'jumlah' => 36, 'satuan' => 'Unit',   'harga' => 350000],
            ['nama_aset' => 'Kursi Siswa',            'merek' => '-',         'tipe' => 'Plastik/Besi',   'ruangan' => 'Kelas X-TKJ-1',    'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Cukup Baik',    'jumlah' => 36, 'satuan' => 'Unit',   'harga' => 200000],
            ['nama_aset' => 'Papan Tulis Whiteboard', 'merek' => 'Sakura',    'tipe' => '120x240cm',      'ruangan' => 'Kelas X-TKJ-1',    'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Baik',          'jumlah' => 1,  'satuan' => 'Unit',   'harga' => 600000],
            ['nama_aset' => 'Proyektor LCD',          'merek' => 'Epson',     'tipe' => 'EB-X49',         'ruangan' => 'Kelas X-TKJ-1',    'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 1,  'satuan' => 'Unit',   'harga' => 4500000],
            ['nama_aset' => 'Speaker Aktif',          'merek' => 'Simbadda', 'tipe' => 'SIM-585N',       'ruangan' => 'Kelas X-TKJ-1',    'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Rusak Ringan',  'jumlah' => 1,  'satuan' => 'Unit',   'harga' => 350000],
            ['nama_aset' => 'Tempat Sampah',          'merek' => '-',         'tipe' => 'Plastik',        'ruangan' => 'Kelas X-TKJ-1',    'kategori' => 'Peralatan Kebersihan',  'kondisi' => 'Baik',          'jumlah' => 2,  'satuan' => 'Unit',   'harga' => 50000],
            // Kelas XI-TKJ-2
            ['nama_aset' => 'Meja Siswa',             'merek' => '-',         'tipe' => 'Kayu Standar',   'ruangan' => 'Kelas XI-TKJ-2',   'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Cukup Baik',    'jumlah' => 36, 'satuan' => 'Unit',   'harga' => 350000],
            ['nama_aset' => 'Kursi Siswa',            'merek' => '-',         'tipe' => 'Plastik/Besi',   'ruangan' => 'Kelas XI-TKJ-2',   'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Rusak Ringan',  'jumlah' => 36, 'satuan' => 'Unit',   'harga' => 200000],
            ['nama_aset' => 'Proyektor LCD',          'merek' => 'BenQ',      'tipe' => 'MX550',          'ruangan' => 'Kelas XI-TKJ-2',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 1,  'satuan' => 'Unit',   'harga' => 4800000],
            ['nama_aset' => 'Kipas Angin Berdiri',    'merek' => 'Panasonic', 'tipe' => 'F-EP304',        'ruangan' => 'Kelas XI-TKJ-2',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 2,  'satuan' => 'Unit',   'harga' => 450000],
            // Kelas XII-AKUN
            ['nama_aset' => 'Meja Siswa',             'merek' => '-',         'tipe' => 'Kayu Standar',   'ruangan' => 'Kelas XII-AKUN',   'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Baik',          'jumlah' => 30, 'satuan' => 'Unit',   'harga' => 350000],
            ['nama_aset' => 'Kalkulator Ilmiah',      'merek' => 'Casio',     'tipe' => 'FX-991EX',       'ruangan' => 'Kelas XII-AKUN',   'kategori' => 'Alat Tulis Kantor',     'kondisi' => 'Baik',          'jumlah' => 30, 'satuan' => 'Unit',   'harga' => 350000],
            ['nama_aset' => 'Lemari Kelas',           'merek' => '-',         'tipe' => 'Kayu 2 Pintu',   'ruangan' => 'Kelas XII-AKUN',   'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Cukup Baik',    'jumlah' => 1,  'satuan' => 'Unit',   'harga' => 1500000],
            // Bengkel Otomotif
            ['nama_aset' => 'Jack Hidrolik',          'merek' => 'Tekiro',    'tipe' => '2 Ton',          'ruangan' => 'Bengkel Otomotif', 'kategori' => 'Peralatan Praktik',     'kondisi' => 'Baik',          'jumlah' => 3,  'satuan' => 'Unit',   'harga' => 1200000],
            ['nama_aset' => 'Toolkit Mekanik',        'merek' => 'Tekiro',    'tipe' => '150 Pcs',        'ruangan' => 'Bengkel Otomotif', 'kategori' => 'Peralatan Praktik',     'kondisi' => 'Baik',          'jumlah' => 5,  'satuan' => 'Set',    'harga' => 2500000],
            ['nama_aset' => 'Kompresor Angin',        'merek' => 'Lakoni',    'tipe' => 'Falcon 1/4 HP',  'ruangan' => 'Bengkel Otomotif', 'kategori' => 'Peralatan Praktik',     'kondisi' => 'Baik',          'jumlah' => 2,  'satuan' => 'Unit',   'harga' => 2000000],
            ['nama_aset' => 'Mesin Las SMAW',         'merek' => 'Lincoln',   'tipe' => 'AC-225',         'ruangan' => 'Bengkel Otomotif', 'kategori' => 'Peralatan Praktik',     'kondisi' => 'Cukup Baik',    'jumlah' => 3,  'satuan' => 'Unit',   'harga' => 4000000],
            ['nama_aset' => 'Dongkrak Buaya',         'merek' => 'Tekiro',    'tipe' => '3 Ton',          'ruangan' => 'Bengkel Otomotif', 'kategori' => 'Peralatan Praktik',     'kondisi' => 'Baik',          'jumlah' => 2,  'satuan' => 'Unit',   'harga' => 850000],
            ['nama_aset' => 'AVO Meter Digital',      'merek' => 'Sanwa',     'tipe' => 'CD-771',         'ruangan' => 'Bengkel Otomotif', 'kategori' => 'Peralatan Praktik',     'kondisi' => 'Baik',          'jumlah' => 10, 'satuan' => 'Unit',   'harga' => 350000],
            ['nama_aset' => 'Baju Kerja / Wearpack',  'merek' => '-',         'tipe' => 'Size L',         'ruangan' => 'Bengkel Otomotif', 'kategori' => 'Peralatan Praktik',     'kondisi' => 'Cukup Baik',    'jumlah' => 30, 'satuan' => 'Pcs',    'harga' => 120000],
            ['nama_aset' => 'Engine Stand',           'merek' => '-',         'tipe' => 'Universal',      'ruangan' => 'Bengkel Otomotif', 'kategori' => 'Peralatan Praktik',     'kondisi' => 'Rusak Ringan',  'jumlah' => 2,  'satuan' => 'Unit',   'harga' => 3500000],
            // Gudang
            ['nama_aset' => 'Rak Besi 5 Susun',      'merek' => '-',         'tipe' => 'Heavy Duty',     'ruangan' => 'Gudang',           'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Baik',          'jumlah' => 5,  'satuan' => 'Unit',   'harga' => 1800000],
            ['nama_aset' => 'Tinta Printer Epson',    'merek' => 'Epson',     'tipe' => '664 Black',      'ruangan' => 'Gudang',           'kategori' => 'Alat Tulis Kantor',     'kondisi' => 'Baik',          'jumlah' => 10, 'satuan' => 'Botol',  'harga' => 65000],
            ['nama_aset' => 'Kertas A4 80gsm',        'merek' => 'Sinar Dunia', 'tipe' => 'A4 80gr',      'ruangan' => 'Gudang',           'kategori' => 'Alat Tulis Kantor',     'kondisi' => 'Baik',          'jumlah' => 50, 'satuan' => 'Rim',    'harga' => 55000],
            ['nama_aset' => 'Sapu Lantai',            'merek' => '-',         'tipe' => 'Ijuk',           'ruangan' => 'Gudang',           'kategori' => 'Peralatan Kebersihan',  'kondisi' => 'Baik',          'jumlah' => 20, 'satuan' => 'Pcs',    'harga' => 35000],
            ['nama_aset' => 'Kemoceng',               'merek' => '-',         'tipe' => 'Bulu Ayam',      'ruangan' => 'Gudang',           'kategori' => 'Peralatan Kebersihan',  'kondisi' => 'Baik',          'jumlah' => 15, 'satuan' => 'Pcs',    'harga' => 25000],
            ['nama_aset' => 'Kabel VGA 1.5m',         'merek' => 'Belden',    'tipe' => '1.5m',          'ruangan' => 'Gudang',           'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 10, 'satuan' => 'Pcs',    'harga' => 45000],
            ['nama_aset' => 'UPS 1200VA',             'merek' => 'APC',       'tipe' => 'BV1200I',        'ruangan' => 'Gudang',           'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Rusak Berat',   'jumlah' => 2,  'satuan' => 'Unit',   'harga' => 1500000],
            // Lab Komputer 1 (lanjutan)
            ['nama_aset' => 'Kursi Lab Komputer',     'merek' => '-',         'tipe' => 'Busa Putar',     'ruangan' => 'Lab Komputer 1',   'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Cukup Baik',    'jumlah' => 22, 'satuan' => 'Unit',   'harga' => 500000],
            ['nama_aset' => 'Meja Komputer Lab',      'merek' => '-',         'tipe' => 'Kayu MDF',       'ruangan' => 'Lab Komputer 1',   'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Baik',          'jumlah' => 20, 'satuan' => 'Unit',   'harga' => 800000],
            ['nama_aset' => 'AC Split 1 PK',          'merek' => 'Daikin',    'tipe' => 'FTN25J',         'ruangan' => 'Lab Komputer 1',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 2,  'satuan' => 'Unit',   'harga' => 4200000],
            ['nama_aset' => 'CCTV Camera',            'merek' => 'Hikvision', 'tipe' => 'DS-2CD2143G2',  'ruangan' => 'Lab Komputer 1',   'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 2,  'satuan' => 'Unit',   'harga' => 650000],
            // Ruang Guru (lanjutan)
            ['nama_aset' => 'Dispenser Air',          'merek' => 'Cosmos',    'tipe' => 'CWD-1188',       'ruangan' => 'Ruang Guru',       'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Baik',          'jumlah' => 1,  'satuan' => 'Unit',   'harga' => 600000],
            ['nama_aset' => 'Jam Dinding',            'merek' => 'Seiko',     'tipe' => 'Quartz',         'ruangan' => 'Ruang Guru',       'kategori' => 'Mebel & Furnitur',      'kondisi' => 'Baik',          'jumlah' => 1,  'satuan' => 'Unit',   'harga' => 150000],
            ['nama_aset' => 'Telepon Kantor',         'merek' => 'Panasonic', 'tipe' => 'KX-TS888MX',    'ruangan' => 'Ruang Guru',       'kategori' => 'Elektronik & Komputer', 'kondisi' => 'Cukup Baik',    'jumlah' => 1,  'satuan' => 'Unit',   'harga' => 380000],
        ];

        $ruanganMap = $ruangans->keyBy('nama_ruangan');
        $sumberDanaAll = $sumberDanas->toArray();

        foreach ($asetList as $index => $data) {
            $ruangan  = $ruanganMap->get($data['ruangan']);
            $kategori = $kategoris->get($data['kategori']);
            $kondisi  = $kondisis->get($data['kondisi']);
            $sumber   = $sumberDanaAll[array_rand($sumberDanaAll)];

            if (!$ruangan || !$kategori || !$kondisi) continue;

            $kode = 'AST-' . str_pad($index + 1, 4, '0', STR_PAD_LEFT);
            $tahun = rand(2018, 2024);

            Aset::create([
                'id_kategori'   => $kategori->id,
                'id_ruangan'    => $ruangan->id,
                'id_sumber_dana'=> $sumber['id'],
                'id_kondisi'    => $kondisi->id,
                'id_user'       => $admin->id,
                'kode_aset'     => $kode,
                'nama_aset'     => $data['nama_aset'],
                'merek'         => $data['merek'],
                'tipe'          => $data['tipe'],
                'jumlah'        => $data['jumlah'],
                'satuan'        => $data['satuan'],
                'tahun_perolehan'  => $tahun,
                'harga_perolehan'  => $data['harga'],
                'tanggal_perolehan'=> "$tahun-" . str_pad(rand(1,12),2,'0',STR_PAD_LEFT) . '-' . str_pad(rand(1,28),2,'0',STR_PAD_LEFT),
                'status_aset'   => 'aktif',
            ]);
        }

        $total = Aset::count();

        // ─── DUMMY DATA SERVIS / PERBAIKAN ────────────────────────
        $asetPrinter  = Aset::where('nama_aset', 'like', '%Printer%')->first();
        $asetSpeaker  = Aset::where('nama_aset', 'like', '%Speaker%')->first();
        $asetAC       = Aset::where('nama_aset', 'like', '%AC%')->first();
        $asetProyektor= Aset::where('nama_aset', 'like', '%Proyektor%')->first();
        $asetEngine   = Aset::where('nama_aset', 'like', '%Engine Stand%')->first();

        if ($asetPrinter) {
            Servis::create([
                'id_aset'             => $asetPrinter->id,
                'jenis_perbaikan'     => 'Ganti Toner & Roll Head',
                'tanggal_servis'     => '2026-07-15',
                'biaya_servis'       => 450000,
                'teknisi_bengkel'    => 'CV Mitra Tekno Karawang',
                'deskripsi_kerusakan'=> 'Kertas sering tersangkut dan hasil cetak bergaris',
                'status'             => 'Selesai',
            ]);
        }

        if ($asetSpeaker) {
            Servis::create([
                'id_aset'             => $asetSpeaker->id,
                'jenis_perbaikan'     => 'Perbaikan Board Power & IC Audio',
                'tanggal_servis'     => '2026-08-01',
                'biaya_servis'       => 175000,
                'teknisi_bengkel'    => 'Servis Elektronik Jaya',
                'deskripsi_kerusakan'=> 'Suara dengung keras dan potensio volume aus',
                'status'             => 'Selesai',
            ]);
        }

        if ($asetAC) {
            Servis::create([
                'id_aset'             => $asetAC->id,
                'jenis_perbaikan'     => 'Maintenance Rutin & Isi Freon R32',
                'tanggal_servis'     => '2026-08-10',
                'biaya_servis'       => 250000,
                'teknisi_bengkel'    => 'Teknisi AC Telagasari',
                'deskripsi_kerusakan'=> 'AC kurang dingin dan mampet saluran drainase',
                'status'             => 'Selesai',
            ]);
        }

        if ($asetProyektor) {
            Servis::create([
                'id_aset'             => $asetProyektor->id,
                'jenis_perbaikan'     => 'Penggantian Bohlam Lampu Proyektor',
                'tanggal_servis'     => '2026-08-14',
                'biaya_servis'       => 1200000,
                'teknisi_bengkel'    => 'Service Center Epson',
                'deskripsi_kerusakan'=> 'Indikator lampu merah berkedip, tidak mau menampilkan gambar',
                'status'             => 'Proses',
            ]);
        }

        if ($asetEngine) {
            Servis::create([
                'id_aset'             => $asetEngine->id,
                'jenis_perbaikan'     => 'Pengelasan ulang bracket & ganti roda putar',
                'tanggal_servis'     => '2026-06-20',
                'biaya_servis'       => 350000,
                'teknisi_bengkel'    => 'Bengkel Las Mandiri',
                'deskripsi_kerusakan'=> 'Roda penopang patah karena beban berat',
                'status'             => 'Selesai',
            ]);
        }

        // ─── DUMMY DATA PEMINJAMAN ────────────────────────────────
        $asetLaptopMM = Aset::where('nama_aset', 'like', '%Laptop Multimedia%')->first();
        $asetKamera   = Aset::where('nama_aset', 'like', '%Kamera%')->first();
        $asetLaptopGuru= Aset::where('nama_aset', 'like', '%Laptop Guru%')->first();

        if ($asetLaptopMM) {
            Peminjaman::create([
                'id_aset'                 => $asetLaptopMM->id,
                'nama_peminjam'           => 'Pak Ahmad Fauzi, S.Kom',
                'role_peminjam'           => 'Guru',
                'jumlah'                  => 2,
                'tanggal_pinjam'          => '2026-08-15',
                'tanggal_kembali_rencana' => '2026-08-20',
                'keperluan'               => 'Persiapan Uji Kompetensi Keahlian (UKK) Siswa TKJ',
                'status'                  => 'Dipinjam',
            ]);
        }

        if ($asetKamera) {
            Peminjaman::create([
                'id_aset'                 => $asetKamera->id,
                'nama_peminjam'           => 'Rian Hidayat (Siswa XII MM)',
                'role_peminjam'           => 'Siswa',
                'jumlah'                  => 1,
                'tanggal_pinjam'          => '2026-08-16',
                'tanggal_kembali_rencana' => '2026-08-18',
                'keperluan'               => 'Dokumentasi Acara Peringatan HUT Kemerdekaan RI di Sekolah',
                'status'                  => 'Dipinjam',
            ]);
        }

        if ($asetLaptopGuru) {
            Peminjaman::create([
                'id_aset'                 => $asetLaptopGuru->id,
                'nama_peminjam'           => 'Bu Nining Ratnasari, M.Pd',
                'role_peminjam'           => 'Guru',
                'jumlah'                  => 1,
                'tanggal_pinjam'          => '2026-08-01',
                'tanggal_kembali_rencana' => '2026-08-05',
                'tanggal_kembali_aktual'  => '2026-08-05',
                'keperluan'               => 'Pelatihan Pembelajaran Digital Dinas Pendidikan',
                'status'                  => 'Dikembalikan',
            ]);
        }

        if ($asetProyektor) {
            Peminjaman::create([
                'id_aset'                 => $asetProyektor->id,
                'nama_peminjam'           => 'Siti Nurjanah (Pengurus OSIS)',
                'role_peminjam'           => 'Siswa',
                'jumlah'                  => 1,
                'tanggal_pinjam'          => '2026-08-08',
                'tanggal_kembali_rencana' => '2026-08-09',
                'tanggal_kembali_aktual'  => '2026-08-09',
                'keperluan'               => 'Rapat Koordinasi Pengurus OSIS di Aula',
                'status'                  => 'Dikembalikan',
            ]);
        }

        $this->command->info("✅ Selesai! Total {$total} aset, 5 data servis, dan 4 data peminjaman dummy berhasil dibuat.");
    }
}
