<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Workshop;

class WorkshopSeeder extends Seeder
{
    public function run(): void
    {
        $workshops = [
            [
                'nama_workshop' => 'Workshop Teknik Kendaraan Ringan',
                'deskripsi' => 'Fasilitas lengkap untuk praktik perawatan dan perbaikan kendaraan ringan dengan peralatan standar industri.',
                'kategori' => 'Otomotif',
                'icon' => 'wrench',
                'fasilitas' => json_encode(['Lift Hidrolik', 'Engine Analyzer', 'Wheel Balancer', 'AC Service Station']),
                'is_active' => true,
            ],
            [
                'nama_workshop' => 'Laboratorium Komputer & Jaringan',
                'deskripsi' => 'Laboratorium dengan 40 unit PC untuk pembelajaran programming, networking, dan sistem informasi.',
                'kategori' => 'Teknologi',
                'icon' => 'laptop',
                'fasilitas' => json_encode(['40 Unit PC', 'Cisco Router', 'Network Simulator', 'Server Room']),
                'is_active' => true,
            ],
            [
                'nama_workshop' => 'Workshop Instalasi Listrik',
                'deskripsi' => 'Ruang praktik instalasi listrik dengan panel simulator dan peralatan kelistrikan standar SNI.',
                'kategori' => 'Listrik',
                'icon' => 'zap',
                'fasilitas' => json_encode(['Panel Listrik', 'PLC Trainer', 'Motor Control', 'Safety Equipment']),
                'is_active' => true,
            ],
            [
                'nama_workshop' => 'Workshop Mesin Produksi',
                'deskripsi' => 'Dilengkapi mesin bubut, frais, dan CNC untuk pembelajaran teknik pemesinan dan manufaktur.',
                'kategori' => 'Manufaktur',
                'icon' => 'cog',
                'fasilitas' => json_encode(['Mesin Bubut', 'Mesin Frais', 'CNC Machine', 'Welding Station']),
                'is_active' => true,
            ],
            [
                'nama_workshop' => 'Studio Multimedia',
                'deskripsi' => 'Studio untuk praktik desain grafis, video editing, dan animasi dengan software profesional.',
                'kategori' => 'Multimedia',
                'icon' => 'laptop',
                'fasilitas' => json_encode(['iMac Workstation', 'DSLR Camera', 'Green Screen', 'Audio Mixer']),
                'is_active' => true,
            ],
            [
                'nama_workshop' => 'Workshop Las & Fabrikasi',
                'deskripsi' => 'Area praktik pengelasan dan fabrikasi logam dengan berbagai jenis mesin las modern.',
                'kategori' => 'Manufaktur',
                'icon' => 'wrench',
                'fasilitas' => json_encode(['MIG Welder', 'TIG Welder', 'Plasma Cutter', 'Safety Booth']),
                'is_active' => true,
            ],
        ];

        foreach ($workshops as $workshop) {
            Workshop::updateOrCreate(
                ['nama_workshop' => $workshop['nama_workshop']],
                $workshop
            );
        }

        $this->command->info('✅ Workshop data seeded successfully!');
    }
}
