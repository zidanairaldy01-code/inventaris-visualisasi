<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Kategori;
use App\Models\Kondisi;
use App\Models\SumberDana;
use App\Models\Gedung;
use App\Models\Ruangan;

class MasterDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Seed Kategori
        $kategoris = [
            'Elektronik',
            'Furniture',
            'Kendaraan',
            'Alat Olahraga',
            'Alat Musik',
            'Buku',
            'Komputer',
            'Lab Equipment',
            'Alat Tulis',
            'Lainnya',
        ];

        foreach ($kategoris as $nama) {
            Kategori::create(['nama_kategori' => $nama]);
        }

        // Seed Kondisi
        $kondisis = [
            'Baik',
            'Rusak Ringan',
            'Rusak Berat',
        ];

        foreach ($kondisis as $nama) {
            Kondisi::create(['nama_kondisi' => $nama]);
        }

        // Seed Sumber Dana
        $sumberDanas = [
            'BOS',
            'Yayasan (YPLP)',
            'Mandiri',
        ];

        foreach ($sumberDanas as $nama) {
            SumberDana::create(['nama_sumber' => $nama]);
        }

        // Seed Gedung Default
        $gedung = Gedung::create([
            'nama_gedung' => 'Gedung Utama',
            'kode_gedung' => 'GU-001',
            'jumlah_lantai' => 2,
            'deskripsi' => 'Gedung utama sekolah SMK PGRI Telagasari',
        ]);

        // Seed Ruangan Default
        $ruangans = [
            ['nama_ruangan' => 'Ruang Kepala Sekolah', 'kode_ruangan' => 'R-001', 'lantai' => '1'],
            ['nama_ruangan' => 'Ruang Guru', 'kode_ruangan' => 'R-002', 'lantai' => '1'],
            ['nama_ruangan' => 'Ruang TU', 'kode_ruangan' => 'R-003', 'lantai' => '1'],
            ['nama_ruangan' => 'Perpustakaan', 'kode_ruangan' => 'R-004', 'lantai' => '1'],
            ['nama_ruangan' => 'Lab Komputer', 'kode_ruangan' => 'R-005', 'lantai' => '2'],
        ];

        foreach ($ruangans as $ruangan) {
            Ruangan::create(array_merge($ruangan, ['id_gedung' => $gedung->id]));
        }

        echo "✅ Master data berhasil dibuat:\n";
        echo "   - " . count($kategoris) . " Kategori\n";
        echo "   - " . count($kondisis) . " Kondisi\n";
        echo "   - " . count($sumberDanas) . " Sumber Dana\n";
        echo "   - 1 Gedung\n";
        echo "   - " . count($ruangans) . " Ruangan\n";
    }
}
