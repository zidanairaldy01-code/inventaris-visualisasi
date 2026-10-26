<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('distribusi_asets', function (Blueprint $table) {
            if (!Schema::hasColumn('distribusi_asets', 'foto_kondisi_wakapro')) {
                // foto_kondisi_wakapro: foto yang diambil wakapro saat memeriksa dan menerima barang
                // berbeda dari foto_kerusakan yang diisi saat kondisi rusak
                $table->string('foto_kondisi_wakapro')->nullable()->after('foto_kerusakan')
                      ->comment('URL/path foto kondisi barang saat diterima wakapro');
            }
        });
    }

    public function down(): void
    {
        Schema::table('distribusi_asets', function (Blueprint $table) {
            if (Schema::hasColumn('distribusi_asets', 'foto_kondisi_wakapro')) {
                $table->dropColumn('foto_kondisi_wakapro');
            }
        });
    }
};
