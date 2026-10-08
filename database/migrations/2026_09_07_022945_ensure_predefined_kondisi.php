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
        $kondisis = [
            [
                'nama_kondisi' => 'Baik',
                'keterangan' => 'Aset dalam kondisi baik dan berfungsi optimal',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama_kondisi' => 'Cukup Baik',
                'keterangan' => 'Aset masih berfungsi namun mulai menunjukkan tanda-tanda keausan',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama_kondisi' => 'Rusak Ringan',
                'keterangan' => 'Aset masih dapat digunakan namun memerlukan perbaikan ringan',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama_kondisi' => 'Rusak Berat',
                'keterangan' => 'Aset memerlukan perbaikan berat untuk dapat digunakan kembali',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nama_kondisi' => 'Tidak Layak Pakai',
                'keterangan' => 'Aset tidak dapat digunakan lagi dan perlu dihapuskan',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($kondisis as $kondisi) {
            DB::table('kondisis')->updateOrInsert(
                ['nama_kondisi' => $kondisi['nama_kondisi']],
                $kondisi
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't delete predefined conditions
    }
};
