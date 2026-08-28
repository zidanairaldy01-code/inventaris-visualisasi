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
        Schema::table('sarana_prasaranas', function (Blueprint $table) {
            $table->bigInteger('nilai_harga_pembelian')->default(0)->after('stok_akhir');
            $table->bigInteger('nilai_harga_sekarang')->default(0)->after('nilai_harga_pembelian');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sarana_prasaranas', function (Blueprint $table) {
            $table->dropColumn(['nilai_harga_pembelian', 'nilai_harga_sekarang']);
        });
    }
};
