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
        $admin = User::updateOrCreate(
            ['username' => 'admin'],
            [
                'nama_lengkap' => 'Super Administrator',
                'email' => 'admin@sekolah.com',
                'password' => bcrypt('password123'),
                'role' => 'super_admin',
                'status' => true,
            ]
        );
        $admin->superAdmin()->updateOrCreate(
            ['user_id' => $admin->id],
            [
                'nama_lengkap' => $admin->nama_lengkap,
                'no_telepon'   => '081234567890',
                'hak_akses'    => 'Super Administrator (Full Access)',
            ]
        );

        // 2. Petugas Input
        $petugas = User::updateOrCreate(
            ['username' => 'petugas'],
            [
                'nama_lengkap' => 'Ahmad Fauzi (Petugas Input)',
                'email' => 'petugas@sekolah.com',
                'password' => bcrypt('password123'),
                'role' => 'petugas',
                'status' => true,
            ]
        );
        $petugas->petugasInput()->updateOrCreate(
            ['user_id' => $petugas->id],
            [
                'nama_lengkap' => $petugas->nama_lengkap,
                'nip'          => '198507122010011002',
                'shift_kerja'  => 'Pagi',
                'divisi'       => 'Inventaris & Sarana Prasarana',
            ]
        );

        // 3. Wakasek Sarpras
        $wakasek = User::updateOrCreate(
            ['username' => 'wakasek'],
            [
                'nama_lengkap' => 'Drs. H. Mulyadi, M.Pd (Wakasek Sarpras)',
                'email' => 'wakasek@sekolah.com',
                'password' => bcrypt('password123'),
                'role' => 'wakasek',
                'status' => true,
            ]
        );
        $wakasek->wakasek()->updateOrCreate(
            ['user_id' => $wakasek->id],
            [
                'nama_lengkap' => $wakasek->nama_lengkap,
                'nip'          => '197203151998021001',
                'bidang'       => 'Sarana dan Prasarana',
            ]
        );

        // 4. Wakapro (Kepala Bengkel)
        $wakapro = User::updateOrCreate(
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
        $wakapro->wakapro()->updateOrCreate(
            ['user_id' => $wakapro->id],
            [
                'nama_lengkap'     => $wakapro->nama_lengkap,
                'nip'              => '198011242008011015',
                'program_keahlian' => 'Teknik Komputer & Jaringan',
                'ruangan_id'       => $wakapro->ruangan_id,
            ]
        );
    }
}
