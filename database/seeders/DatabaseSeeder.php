<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Kondisi;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(UserSeeder::class);

        // Create predefined conditions (diperlukan sistem untuk status aset)
        $kondisis = [
            [
                'nama_kondisi' => 'Baik',
                'keterangan' => 'Aset dalam kondisi baik dan berfungsi optimal'
            ],
            [
                'nama_kondisi' => 'Cukup Baik',
                'keterangan' => 'Aset masih berfungsi namun mulai menunjukkan tanda-tanda keausan'
            ],
            [
                'nama_kondisi' => 'Rusak Ringan',
                'keterangan' => 'Aset masih dapat digunakan namun memerlukan perbaikan ringan'
            ],
            [
                'nama_kondisi' => 'Rusak Berat',
                'keterangan' => 'Aset memerlukan perbaikan berat untuk dapat digunakan kembali'
            ],
            [
                'nama_kondisi' => 'Tidak Layak Pakai',
                'keterangan' => 'Aset tidak dapat digunakan lagi dan perlu dihapuskan'
            ],
        ];

        foreach ($kondisis as $kondisi) {
            Kondisi::firstOrCreate(
                ['nama_kondisi' => $kondisi['nama_kondisi']],
                $kondisi
            );
        }

        // SEMUA DATA LAINNYA DIHAPUS
        // Admin akan menambahkan data secara manual:
        // - Gedung, Ruangan, Workshop melalui dashboard admin
        // - User lain (wakapro, petugas) melalui user management
        // - Sumber dana, jurusan, dll melalui master data management
    }
}
