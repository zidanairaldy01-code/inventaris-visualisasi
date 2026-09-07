<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Ruangan;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Cari salah satu ruangan workshop untuk Wakapro jika ada
        $ruanganWorkshop = Ruangan::where('jenis', 'workshop')->first() ?? Ruangan::first();

        // 1. Super Admin
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'nama_lengkap' => 'Super Administrator',
                'email' => 'admin@sekolah.com',
                'password' => bcrypt('password123'),
                'role' => 'super_admin',
                'status' => true,
            ]
        );

        // 2. Petugas Input
        User::updateOrCreate(
            ['username' => 'petugas'],
            [
                'nama_lengkap' => 'Ahmad Fauzi (Petugas Input)',
                'email' => 'petugas@sekolah.com',
                'password' => bcrypt('password123'),
                'role' => 'petugas',
                'status' => true,
            ]
        );

        // 3. Wakasek Sarpras
        User::updateOrCreate(
            ['username' => 'wakasek'],
            [
                'nama_lengkap' => 'Drs. H. Mulyadi, M.Pd (Wakasek Sarpras)',
                'email' => 'wakasek@sekolah.com',
                'password' => bcrypt('password123'),
                'role' => 'wakasek',
                'status' => true,
            ]
        );

        // 4. Wakapro (Kepala Bengkel)
        User::updateOrCreate(
            ['username' => 'wakapro'],
            [
                'nama_lengkap' => 'Rahmat Hidayat, S.T. (Wakapro Bengkel)',
                'email' => 'wakapro@sekolah.com',
                'password' => bcrypt('password123'),
                'role' => 'wakapro',
                'ruangan_id' => $ruanganWorkshop ? $ruanganWorkshop->id : null,
                'status' => true,
            ]
        );
    }
}
