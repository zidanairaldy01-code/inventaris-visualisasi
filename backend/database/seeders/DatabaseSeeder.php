<?php

namespace Database\Seeders;

use App\Models\User;
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
        // Create default admin user
        User::create([
            'nama_lengkap' => 'Administrator',
            'username' => 'admin',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => true,
        ]);

        // Create default user
        User::create([
            'nama_lengkap' => 'Test User',
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
            'role' => 'user',
            'status' => true,
        ]);

        // Call other seeders (only master data)
        $this->call([
            MasterDataSeeder::class,      // Master data: Kategori, Kondisi, Sumber Dana, Gedung, Ruangan
            JurusanKelasSeeder::class,    // Jurusan & Kelas
            // DummyDataSeeder::class,    // Disabled - no dummy data
        ]);
    }
}
