<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom nomor_pengiriman sebagai batch identifier untuk distribusi bulk.
     * Semua item dari satu pengiriman bulk akan memiliki nomor_pengiriman yang sama.
     * Distribusi single (store) tidak mengisi kolom ini (null).
     */
    public function up(): void
    {
        Schema::table('distribusi_asets', function (Blueprint $table) {
            $table->string('nomor_pengiriman')->nullable()->after('nomor_surat_jalan');
            $table->index('nomor_pengiriman');
        });
    }

    public function down(): void
    {
        Schema::table('distribusi_asets', function (Blueprint $table) {
            $table->dropIndex(['nomor_pengiriman']);
            $table->dropColumn('nomor_pengiriman');
        });
    }
};
