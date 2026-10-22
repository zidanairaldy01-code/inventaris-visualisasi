<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->longText('value')->nullable();
            $table->string('type')->default('string'); // string | json | boolean
            $table->timestamps();
        });

        // Seed default values
        $defaults = [
            ['key' => 'sekolah_nama',       'value' => 'SMK PGRI Telagasari',       'type' => 'string'],
            ['key' => 'sekolah_tagline',     'value' => 'Mencetak Generasi Terampil dan Berakhlak Mulia', 'type' => 'string'],
            ['key' => 'sekolah_deskripsi1',  'value' => 'SMK PGRI Telagasari adalah institusi pendidikan kejuruan yang telah berdiri sejak tahun 1999. Kami berkomitmen untuk menghasilkan lulusan yang kompeten, profesional, dan siap kerja dengan membekali siswa dengan keterampilan praktis dan pengetahuan teori yang seimbang.', 'type' => 'string'],
            ['key' => 'sekolah_deskripsi2',  'value' => 'Dengan fasilitas workshop dan laboratorium yang lengkap serta tenaga pengajar berpengalaman, kami memastikan setiap siswa mendapatkan pendidikan berkualitas tinggi yang sesuai dengan kebutuhan industri saat ini.', 'type' => 'string'],
            ['key' => 'sekolah_tahun_berdiri', 'value' => '1999', 'type' => 'string'],
            ['key' => 'sekolah_hero_foto',   'value' => 'https://images.unsplash.com/photo-1562774053-701939374585?w=800', 'type' => 'string'],
            ['key' => 'visi',                'value' => 'Menjadi SMK unggul dalam menghasilkan lulusan yang kompeten, berakhlak mulia, dan berdaya saing global.', 'type' => 'string'],
            ['key' => 'misi',                'value' => 'Menyelenggarakan pendidikan kejuruan berbasis kompetensi dengan fasilitas modern dan kerjasama industri.', 'type' => 'string'],
            ['key' => 'fasilitas_foto',      'value' => json_encode([
                ['url' => 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=600', 'caption' => 'Gedung Sekolah'],
                ['url' => 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600', 'caption' => 'Ruang Kelas'],
                ['url' => 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600',  'caption' => 'Area Sekolah'],
            ]), 'type' => 'json'],
            ['key' => 'kontak_alamat',       'value' => "Jl. Raya Telagasari No. 123\nTelagasari, Karawang, Jawa Barat 41383", 'type' => 'string'],
            ['key' => 'kontak_telepon',      'value' => '(0267) 123-4567', 'type' => 'string'],
            ['key' => 'kontak_email',        'value' => 'info@smkpgritelagasari.sch.id', 'type' => 'string'],
            ['key' => 'maps_embed_url',      'value' => '', 'type' => 'string'],
        ];

        DB::table('site_settings')->insert(
            array_map(fn($r) => array_merge($r, ['created_at' => now(), 'updated_at' => now()]), $defaults)
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
