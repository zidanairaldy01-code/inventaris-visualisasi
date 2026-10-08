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
        // Add foto column to gedungs table
        Schema::table('gedungs', function (Blueprint $table) {
            $table->string('foto_gedung')->nullable()->after('deskripsi');
        });

        // Add foto column to ruangans table
        Schema::table('ruangans', function (Blueprint $table) {
            $table->string('foto_ruangan')->nullable()->after('deskripsi');
        });

        // Add foto_thumbnail column to asets table
        Schema::table('asets', function (Blueprint $table) {
            $table->string('foto_thumbnail')->nullable()->after('deskripsi');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gedungs', function (Blueprint $table) {
            $table->dropColumn('foto_gedung');
        });

        Schema::table('ruangans', function (Blueprint $table) {
            $table->dropColumn('foto_ruangan');
        });

        Schema::table('asets', function (Blueprint $table) {
            $table->dropColumn('foto_thumbnail');
        });
    }
};
