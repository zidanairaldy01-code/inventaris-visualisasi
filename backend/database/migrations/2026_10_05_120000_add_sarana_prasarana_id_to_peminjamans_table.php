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
        // 1. Tambah sarana_prasarana_id ke tabel peminjamans jika belum ada
        Schema::table('peminjamans', function (Blueprint $table) {
            if (!Schema::hasColumn('peminjamans', 'sarana_prasarana_id')) {
                $table->foreignId('sarana_prasarana_id')
                    ->nullable()
                    ->after('id_aset')
                    ->constrained('sarana_prasaranas')
                    ->nullOnDelete();
            }
        });

        // 2. Ubah id_aset jadi nullable di peminjamans (karena barang bisa dari sarana_prasarana)
        try {
            \DB::statement('ALTER TABLE peminjamans MODIFY id_aset BIGINT UNSIGNED NULL');
        } catch (\Exception $e) {
            try {
                Schema::table('peminjamans', function (Blueprint $table) {
                    $table->unsignedBigInteger('id_aset')->nullable()->change();
                });
            } catch (\Exception $e2) {
                // Ignore if already nullable
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('peminjamans', function (Blueprint $table) {
            if (Schema::hasColumn('peminjamans', 'sarana_prasarana_id')) {
                $table->dropForeign(['sarana_prasarana_id']);
                $table->dropColumn('sarana_prasarana_id');
            }
        });

        try {
            \DB::statement('ALTER TABLE peminjamans MODIFY id_aset BIGINT UNSIGNED NOT NULL');
        } catch (\Exception $e) {
            // Ignore
        }
    }
};
