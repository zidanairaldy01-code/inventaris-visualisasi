<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Jurusan;
use App\Models\Gedung;
use App\Models\Ruangan;
use App\Models\User;

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

        // 5. Seeding Peralatan & Aset Fisik - DIHAPUS
        // Data aset hanya akan masuk lewat alur distribusi resmi:
        // Admin/Petugas membuat distribusi → Wakapro konfirmasi → Aset masuk ke inventaris workshop
        // Tidak ada lagi data dummy yang langsung di-seed ke database
    }
}
