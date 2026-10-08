<?php

namespace Database\Seeders;

use App\Models\SumberDana;
use Illuminate\Database\Seeder;

class SumberDanaSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            [
                'nama_sumber' => 'BOS (Bantuan Operasional Sekolah)',
                'jenis_sumber' => 'BOS',
                'keterangan'   => 'Dana dari pemerintah pusat untuk operasional sekolah',
            ],
            [
                'nama_sumber' => 'Dana Sekolah',
                'jenis_sumber' => 'Dana Sekolah',
                'keterangan'   => 'Dana mandiri yang dikelola oleh sekolah',
            ],
            [
                'nama_sumber' => 'APBD',
                'jenis_sumber' => 'APBD',
                'keterangan'   => 'Anggaran Pendapatan dan Belanja Daerah',
            ],
            [
                'nama_sumber' => 'Hibah / Donasi',
                'jenis_sumber' => 'Hibah',
                'keterangan'   => 'Dana hibah atau donasi dari pihak eksternal',
            ],
            [
                'nama_sumber' => 'Komite Sekolah',
                'jenis_sumber' => 'Komite',
                'keterangan'   => 'Dana yang bersumber dari komite sekolah / orang tua murid',
            ],
        ];

        foreach ($data as $item) {
            SumberDana::firstOrCreate(
                ['nama_sumber' => $item['nama_sumber']],
                $item
            );
        }
    }
}
