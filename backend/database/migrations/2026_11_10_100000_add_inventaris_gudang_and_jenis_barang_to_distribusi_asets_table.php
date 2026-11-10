<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('distribusi_asets', function (Blueprint $table) {
            // Jadikan sarana_prasarana_id nullable agar bisa mendistribusikan langsung dari inventaris_gudang
            $table->unsignedBigInteger('sarana_prasarana_id')->nullable()->change();

            // Tambahkan relasi ke inventaris_gudangs
            $table->foreignId('inventaris_gudang_id')
                ->nullable()
                ->after('sarana_prasarana_id')
                ->constrained('inventaris_gudangs')
                ->nullOnDelete();

            // Tambahkan jenis_barang: 'habis_pakai' vs 'tidak_habis_pakai'
            $table->enum('jenis_barang', ['habis_pakai', 'tidak_habis_pakai'])
                ->default('tidak_habis_pakai')
                ->after('wakapro_penerima_id');

            // Tambahkan sisa_unit untuk tracking unit barang (khususnya barang habis pakai)
            $table->integer('sisa_unit')
                ->nullable()
                ->after('jumlah');
        });

        // Inisialisasi sisa_unit untuk data distribusi yang sudah ada agar sama dengan jumlah
        \Illuminate\Support\Facades\DB::table('distribusi_asets')
            ->whereNull('sisa_unit')
            ->update(['sisa_unit' => \Illuminate\Support\Facades\DB::raw('jumlah')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('distribusi_asets', function (Blueprint $table) {
            $table->dropForeign(['inventaris_gudang_id']);
            $table->dropColumn(['inventaris_gudang_id', 'jenis_barang', 'sisa_unit']);
        });
    }
};

