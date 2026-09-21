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
        // 1. Tambah kolom ke servises
        Schema::table('servises', function (Blueprint $table) {
            if (!Schema::hasColumn('servises', 'sarana_prasarana_id')) {
                $table->foreignId('sarana_prasarana_id')->nullable()->after('id_aset')->constrained('sarana_prasaranas')->nullOnDelete();
            }
            if (!Schema::hasColumn('servises', 'foto_kerusakan')) {
                $table->string('foto_kerusakan')->nullable()->after('deskripsi_kerusakan');
            }
        });

        // Ubah id_aset jadi nullable di servises (karena aset bisa dari sarana_prasarana)
        try {
            \DB::statement('ALTER TABLE servises MODIFY id_aset BIGINT UNSIGNED NULL');
        } catch (\Exception $e) {
            // Abaikan jika sudah nullable
        }

        // 2. Tambah kolom ke distribusi_asets
        Schema::table('distribusi_asets', function (Blueprint $table) {
            if (!Schema::hasColumn('distribusi_asets', 'foto_kerusakan')) {
                $table->string('foto_kerusakan')->nullable()->after('catatan_penerimaan');
            }
        });

        // 3. Tambah kolom ke sarana_prasaranas
        Schema::table('sarana_prasaranas', function (Blueprint $table) {
            if (!Schema::hasColumn('sarana_prasaranas', 'foto_kerusakan')) {
                $table->string('foto_kerusakan')->nullable()->after('kondisi');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('servises', function (Blueprint $table) {
            if (Schema::hasColumn('servises', 'foto_kerusakan')) {
                $table->dropColumn('foto_kerusakan');
            }
            if (Schema::hasColumn('servises', 'sarana_prasarana_id')) {
                $table->dropForeign(['sarana_prasarana_id']);
                $table->dropColumn('sarana_prasarana_id');
            }
        });

        Schema::table('distribusi_asets', function (Blueprint $table) {
            if (Schema::hasColumn('distribusi_asets', 'foto_kerusakan')) {
                $table->dropColumn('foto_kerusakan');
            }
        });

        Schema::table('sarana_prasaranas', function (Blueprint $table) {
            if (Schema::hasColumn('sarana_prasaranas', 'foto_kerusakan')) {
                $table->dropColumn('foto_kerusakan');
            }
        });
    }
};
