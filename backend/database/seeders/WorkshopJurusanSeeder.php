<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Jurusan;
use App\Models\Gedung;
use App\Models\Ruangan;
use App\Models\User;
use App\Models\SaranaPrasarana;
use App\Models\DistribusiAset;
use Illuminate\Support\Str;

class WorkshopJurusanSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Data Jurusan
        $jurusansData = [
            ['kode_jurusan' => 'TP', 'nama_jurusan' => 'Teknik Pemesinan', 'deskripsi' => 'Fasilitas manufaktur, bubut, milling, dan CNC'],
            ['kode_jurusan' => 'TMI', 'nama_jurusan' => 'Teknik Mekanik Industri', 'deskripsi' => 'Fasilitas otomatisasi industri, mekatronika, dan pneumatik'],
            ['kode_jurusan' => 'TPL', 'nama_jurusan' => 'Teknik Pengelasan', 'deskripsi' => 'Fasilitas pengelasan SMAW, GMAW, GTAW, dan fabrikasi logam'],
            ['kode_jurusan' => 'RPL', 'nama_jurusan' => 'Rekayasa Perangkat Lunak', 'deskripsi' => 'Lab komputasi, pengembangan software, dan jaringan lokal'],
            ['kode_jurusan' => 'TKR', 'nama_jurusan' => 'Teknik Kendaraan Ringan', 'deskripsi' => 'Workshop perbaikan otomotif, tune up, chasis, dan kelistrikan mobil'],
        ];

        $jurusans = [];
        foreach ($jurusansData as $j) {
            $jurusans[$j['kode_jurusan']] = Jurusan::updateOrCreate(
                ['kode_jurusan' => $j['kode_jurusan']],
                [
                    'nama_jurusan' => $j['nama_jurusan'],
                    'deskripsi' => $j['deskripsi']
                ]
            );
        }

        // 2. Data Gedung per Jurusan
        $gedungsData = [
            'TP' => ['kode' => 'GD-TP', 'nama' => 'Gedung Workshop Teknik Pemesinan', 'deskripsi' => 'Area Barat Kampus Utama - Bengkel TP'],
            'TMI' => ['kode' => 'GD-TMI', 'nama' => 'Gedung Workshop Teknik Mekanik Industri', 'deskripsi' => 'Area Utara Kampus Utama - Bengkel TMI'],
            'TPL' => ['kode' => 'GD-TPL', 'nama' => 'Gedung Workshop Teknik Pengelasan', 'deskripsi' => 'Area Selatan Kampus Utama - Bengkel TPL'],
            'RPL' => ['kode' => 'GD-RPL', 'nama' => 'Gedung Lab Computer Science & Software', 'deskripsi' => 'Lantai 2 Gedung Utama - Lab RPL'],
            'TKR' => ['kode' => 'GD-TKR', 'nama' => 'Gedung Workshop Teknik Kendaraan Ringan', 'deskripsi' => 'Area Timur Kampus Utama - Bengkel TKR'],
        ];

        $gedungs = [];
        foreach ($gedungsData as $kodeJurusan => $g) {
            $gedungs[$kodeJurusan] = Gedung::updateOrCreate(
                ['kode_gedung' => $g['kode']],
                [
                    'nama_gedung' => $g['nama'],
                    'deskripsi' => $g['deskripsi'],
                    'jumlah_lantai' => 1
                ]
            );
        }

        // 3. Data Ruangan Workshop Utama
        $ruangansData = [
            'TP' => ['kode' => 'R-WTP-01', 'nama' => 'Bengkel Teknik Pemesinan (Workshop TP)'],
            'TMI' => ['kode' => 'R-WTMI-01', 'nama' => 'Bengkel Teknik Mekanik Industri (Workshop TMI)'],
            'TPL' => ['kode' => 'R-WTPL-01', 'nama' => 'Bengkel Teknik Pengelasan (Workshop TPL)'],
            'RPL' => ['kode' => 'R-WRPL-01', 'nama' => 'Lab Komputer & Software Development (Lab RPL)'],
            'TKR' => ['kode' => 'R-WTKR-01', 'nama' => 'Bengkel Otomotif TKR (Workshop TKR)'],
        ];

        $ruangans = [];
        foreach ($ruangansData as $kodeJurusan => $r) {
            $ruangans[$kodeJurusan] = Ruangan::updateOrCreate(
                ['kode_ruangan' => $r['kode']],
                [
                    'nama_ruangan' => $r['nama'],
                    'id_gedung' => $gedungs[$kodeJurusan]->id,
                    'jenis' => 'bengkel',
                    'deskripsi' => 'Ruangan praktik utama jurusan ' . $jurusans[$kodeJurusan]->nama_jurusan
                ]
            );
        }

        // 4. User Petugas & Wakapro
        $petugasUser = User::where('role', 'petugas')->first() ?? User::where('username', 'petugas')->first();

        $wakaprosData = [
            'TP' => ['username' => 'wakapro_tp', 'nama' => 'Bambang Susanto, S.Pd.', 'email' => 'wakapro_tp@smk.sch.id'],
            'TMI' => ['username' => 'wakapro_tmi', 'nama' => 'Dedi Setiadi, M.T.', 'email' => 'wakapro_tmi@smk.sch.id'],
            'TPL' => ['username' => 'wakapro_tpl', 'nama' => 'Heri Setiawan, S.T.', 'email' => 'wakapro_tpl@smk.sch.id'],
            'RPL' => ['username' => 'wakapro_rpl', 'nama' => 'Rina Kurnia, M.Kom.', 'email' => 'wakapro_rpl@smk.sch.id'],
            'TKR' => ['username' => 'wakapro_tkr', 'nama' => 'Agus Prasetyo, S.T.', 'email' => 'wakapro_tkr@smk.sch.id'],
        ];

        $wakaproUsers = [];
        foreach ($wakaprosData as $kodeJurusan => $w) {
            $wakaproUsers[$kodeJurusan] = User::updateOrCreate(
                ['username' => $w['username']],
                [
                    'nama_lengkap' => $w['nama'],
                    'email' => $w['email'],
                    'password' => bcrypt('password123'),
                    'role' => 'wakapro',
                    'ruangan_id' => $ruangans[$kodeJurusan]->id,
                    'status' => true
                ]
            );
        }

        // Akun default wakapro untuk kompatibilitas
        User::updateOrCreate(
            ['username' => 'wakapro'],
            [
                'nama_lengkap' => 'Wakapro TP (Bambang Susanto, S.Pd.)',
                'email' => 'wakapro@sekolah.com',
                'password' => bcrypt('password123'),
                'role' => 'wakapro',
                'ruangan_id' => $ruangans['TP']->id,
                'status' => true
            ]
        );

        // 5. Seeding Peralatan & Aset Fisik Spesifik per Bengkel
        $asetsPerBengkel = [
            'TP' => [
                ['nama' => 'Mesin Bubut CNC Lathe Fanuc', 'kondisi' => 'Baik', 'jumlah' => 4],
                ['nama' => 'Mesin Milling Manual Heavy Duty', 'kondisi' => 'Baik', 'jumlah' => 6],
                ['nama' => 'Mesin Merekres / Skrap Manual', 'kondisi' => 'Cukup Baik', 'jumlah' => 2],
                ['nama' => 'Jangka Sorong Digital Mitutoyo 150mm', 'kondisi' => 'Baik', 'jumlah' => 20],
                ['nama' => 'Micrometer Outside 0-25mm', 'kondisi' => 'Rusak Ringan', 'jumlah' => 5],
            ],
            'TMI' => [
                ['nama' => 'Trainer PLC Siemens S7-1200', 'kondisi' => 'Baik', 'jumlah' => 5],
                ['nama' => 'Modul Practical Pneumatic & Electropneumatic', 'kondisi' => 'Baik', 'jumlah' => 8],
                ['nama' => 'Lengan Robot Arm Manipulator 6-Axis', 'kondisi' => 'Baik', 'jumlah' => 3],
                ['nama' => 'Oscilloscope Digital 100MHz 2 Channel', 'kondisi' => 'Baik', 'jumlah' => 10],
                ['nama' => 'Power Supply Variabel DC 0-30V 5A', 'kondisi' => 'Rusak Ringan', 'jumlah' => 2],
            ],
            'TPL' => [
                ['nama' => 'Mesin Las SMAW Inverter 200 Ampere', 'kondisi' => 'Baik', 'jumlah' => 12],
                ['nama' => 'Mesin Las TIG/GTAW Stainless Steel', 'kondisi' => 'Baik', 'jumlah' => 6],
                ['nama' => 'Mesin Las MIG/MAG Co2 350A', 'kondisi' => 'Cukup Baik', 'jumlah' => 4],
                ['nama' => 'Helm Las Otomatis Auto Darkening', 'kondisi' => 'Baik', 'jumlah' => 25],
                ['nama' => 'Mesin Potong Plasma Cutter 40A', 'kondisi' => 'Rusak Ringan', 'jumlah' => 3],
            ],
            'RPL' => [
                ['nama' => 'PC Workstation Core i7 13700K 32GB RAM', 'kondisi' => 'Baik', 'jumlah' => 30],
                ['nama' => 'Server Network Rack 42U + Switch Managed 48 Port', 'kondisi' => 'Baik', 'jumlah' => 2],
                ['nama' => 'UPS Online Double Conversion 3000VA', 'kondisi' => 'Baik', 'jumlah' => 4],
                ['nama' => 'Proyektor Short Throw Full HD 4000 Lumens', 'kondisi' => 'Baik', 'jumlah' => 2],
                ['nama' => 'Router Board Mikrotik RB4011', 'kondisi' => 'Baik', 'jumlah' => 6],
            ],
            'TKR' => [
                ['nama' => 'Dongkrak Hidrolik Buaya 3 Ton', 'kondisi' => 'Baik', 'jumlah' => 6],
                ['nama' => 'Engine Stand 4-Cylinder EFI', 'kondisi' => 'Baik', 'jumlah' => 4],
                ['nama' => 'Automotive Diagnostic Scanner OBD2', 'kondisi' => 'Baik', 'jumlah' => 3],
                ['nama' => 'Dynamic Engine Analyzer & Tune Up Kit', 'kondisi' => 'Baik', 'jumlah' => 2],
                ['nama' => 'Tire Changer & Wheel Balancer Automated', 'kondisi' => 'Cukup Baik', 'jumlah' => 2],
            ]
        ];

        $counter = 1;
        foreach ($asetsPerBengkel as $kodeJurusan => $items) {
            $ruanganTarget = $ruangans[$kodeJurusan];
            $jurusanTarget = $jurusans[$kodeJurusan];
            $wakaproTarget = $wakaproUsers[$kodeJurusan];

            foreach ($items as $idx => $item) {
                $kodeAsset = 'SAR-' . $kodeJurusan . '-' . str_pad($idx + 1, 3, '0', STR_PAD_LEFT);
                
                $sarana = SaranaPrasarana::updateOrCreate(
                    ['kode' => $kodeAsset],
                    [
                        'nama_barang' => $item['nama'],
                        'satuan' => 'Unit',
                        'kondisi' => $item['kondisi'],
                        'stok_awal' => $item['jumlah'],
                        'stok_masuk' => 0,
                        'stok_keluar' => 0,
                        'stok_akhir' => $item['jumlah'],
                        'keterangan' => 'Peralatan praktikum ' . $jurusanTarget->nama_jurusan
                    ]
                );

                // Buat data distribusi aset fisik ke ruangan workshop
                DistribusiAset::updateOrCreate(
                    [
                        'nomor_surat_jalan' => 'SJ-' . $kodeJurusan . '-' . str_pad($counter, 4, '0', STR_PAD_LEFT),
                    ],
                    [
                        'nomor_bast' => 'BAST-' . $kodeJurusan . '-' . str_pad($counter, 4, '0', STR_PAD_LEFT),
                        'sarana_prasarana_id' => $sarana->id,
                        'ruangan_tujuan_id' => $ruanganTarget->id,
                        'petugas_pengirim_id' => $petugasUser ? $petugasUser->id : 1,
                        'wakapro_penerima_id' => $wakaproTarget ? $wakaproTarget->id : null,
                        'jumlah' => $item['jumlah'],
                        'tanggal_kirim' => now()->subDays(rand(10, 60))->toDateString(),
                        'tanggal_terima' => now()->subDays(rand(1, 9)),
                        'status' => 'diterima',
                        'catatan_pengiriman' => 'Distribusi awal inventaris workshop ' . $jurusanTarget->nama_jurusan,
                        'catatan_penerimaan' => 'Barang diterima lengkap dan terverifikasi di ' . $ruanganTarget->nama_ruangan
                    ]
                );
                $counter++;
            }
        }
    }
}
