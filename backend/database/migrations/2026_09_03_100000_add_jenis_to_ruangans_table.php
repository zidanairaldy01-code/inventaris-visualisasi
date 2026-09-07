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
        Schema::table('ruangans', function (Blueprint $table) {
            $table->string('jenis')->default('gedung')->after('nama_ruangan');
            $table->unsignedBigInteger('id_gedung')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ruangans', function (Blueprint $table) {
            $table->dropColumn('jenis');
            $table->unsignedBigInteger('id_gedung')->nullable(false)->change();
        });
    }
};
