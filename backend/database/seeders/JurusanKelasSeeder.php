<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Jurusan;
use App\Models\Kelas;

class JurusanKelasSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jurusans = [
            [
                'kode_jurusan' => 'TP',
                'nama_jurusan' => 'Teknik Permesinan',
                'deskripsi' => 'Program keahlian yang mempelajari teknik permesinan dan manufaktur'
            ],
            [
                'kode_jurusan' => 'TMI',
                'nama_jurusan' => 'Teknik Mesin Industri',
                'deskripsi' => 'Program keahlian yang mempelajari teknik mesin dan industri'
            ],
            [
                'kode_jurusan' => 'RPL',
                'nama_jurusan' => 'Rekayasa Perangkat Lunak',
                'deskripsi' => 'Program keahlian yang mempelajari pengembangan software dan aplikasi'
            ],
            [
                'kode_jurusan' => 'TKR',
                'nama_jurusan' => 'Teknik Kendaraan Ringan',
                'deskripsi' => 'Program keahlian yang mempelajari teknik otomotif kendaraan ringan'
            ],
            [
                'kode_jurusan' => 'TPL',
                'nama_jurusan' => 'Teknik Pengelasan',
                'deskripsi' => 'Program keahlian yang mempelajari teknik pengelasan dan fabrikasi logam'
            ],
        ];

        foreach ($jurusans as $jurusanData) {
            $jurusan = Jurusan::create($jurusanData);

            // Buat kelas untuk setiap tingkat
            $tingkatList = ['X', 'XI', 'XII'];
            $tahunAjaran = '2026/2027';

            foreach ($tingkatList as $tingkat) {
                // Buat 2 kelas per tingkat sebagai default
                // User bisa tambah lebih banyak nanti
                for ($i = 1; $i <= 2; $i++) {
                    Kelas::create([
                        'id_jurusan' => $jurusan->id,
                        'tingkat' => $tingkat,
                        'nama_kelas' => "$tingkat {$jurusan->kode_jurusan} $i",
                        'tahun_ajaran' => $tahunAjaran,
                        'wali_kelas' => null,
                        'jumlah_siswa' => rand(30, 36), // Random 30-36 siswa
                    ]);
                }
            }
        }
    }
}
