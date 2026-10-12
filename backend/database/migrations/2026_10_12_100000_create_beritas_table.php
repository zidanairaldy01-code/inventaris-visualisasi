<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('beritas', function (Blueprint $table) {
            $table->id();
            $table->string('judul');
            $table->string('slug')->nullable()->unique();
            $table->text('ringkasan')->nullable();
            $table->longText('konten')->nullable();
            $table->string('gambar')->nullable();
            $table->date('tanggal')->nullable();
            $table->string('penulis')->default('Super Admin');
            $table->boolean('is_active')->default(true);
            $table->integer('urutan')->default(0);
            $table->foreignId('id_user')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Seed initial default news data from public landing page
        $defaultNews = [
            [
                'judul' => 'Peresmian Laboratorium Komputer Baru',
                'slug' => 'peresmian-laboratorium-komputer-baru',
                'ringkasan' => 'SMK PGRI Telagasari meresmikan laboratorium komputer dengan 40 unit PC terbaru yang dilengkapi dengan software pendukung pembelajaran programming dan desain grafis.',
                'konten' => 'SMK PGRI Telagasari meresmikan fasilitas laboratorium komputer terbaru dengan 40 unit PC spesifikasi modern. Laboratorium ini dilengkapi dengan software pendukung pembelajaran programming, desain grafis, dan animasi untuk mendukung kompetensi siswa dalam menghadapi era digital.',
                'gambar' => 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800',
                'tanggal' => '2024-01-15',
                'penulis' => 'Kepala Sekolah',
                'is_active' => true,
                'urutan' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'judul' => 'Workshop Industri 4.0 untuk Siswa',
                'slug' => 'workshop-industri-4-0-untuk-siswa',
                'ringkasan' => 'Kegiatan workshop bertema Industri 4.0 diikuti oleh 150 siswa dengan menghadirkan praktisi dari berbagai perusahaan teknologi terkemuka.',
                'konten' => 'Kegiatan workshop bertema Industri 4.0 diikuti oleh 150 siswa kejuruan dengan menghadirkan praktisi ahli dari perusahaan manufaktur dan teknologi terkemuka. Siswa diajarkan mengenai otomatisasi sistem dan IoT di dunia industri modern.',
                'gambar' => 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
                'tanggal' => '2024-01-20',
                'penulis' => 'Tim Humas',
                'is_active' => true,
                'urutan' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'judul' => 'Renovasi Gedung Workshop Teknik',
                'slug' => 'renovasi-gedung-workshop-teknik',
                'ringkasan' => 'Gedung workshop teknik telah selesai direnovasi dengan penambahan peralatan modern untuk mendukung pembelajaran praktik siswa jurusan teknik.',
                'konten' => 'Gedung workshop teknik telah selesai direnovasi total dengan standarisasi industri dan penambahan peralatan mesin modern untuk mendukung pembelajaran praktik siswa kejuruan agar siap kerja.',
                'gambar' => 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800',
                'tanggal' => '2024-01-25',
                'penulis' => 'Kepala Jurusan',
                'is_active' => true,
                'urutan' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'judul' => 'Penambahan Koleksi Buku Perpustakaan',
                'slug' => 'penambahan-koleksi-buku-perpustakaan',
                'ringkasan' => 'Perpustakaan sekolah menambah 500 judul buku baru untuk mendukung literasi siswa dan referensi pembelajaran di berbagai bidang studi.',
                'konten' => 'Perpustakaan sekolah menambah 500 judul buku referensi dan modul kejuruan baru untuk mendukung gerakan literasi siswa dan memperluas wawasan keilmuan di era global.',
                'gambar' => 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800',
                'tanggal' => '2024-02-01',
                'penulis' => 'Kepala Perpustakaan',
                'is_active' => true,
                'urutan' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('beritas')->insert($defaultNews);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('beritas');
    }
};
