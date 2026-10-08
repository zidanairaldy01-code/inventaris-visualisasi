<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daftar_belanjas', function (Blueprint $table) {
            $table->foreignId('id_sumber_dana')
                ->nullable()
                ->after('id_folder')
                ->constrained('sumber_danas')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('daftar_belanjas', function (Blueprint $table) {
            $table->dropForeign(['id_sumber_dana']);
            $table->dropColumn('id_sumber_dana');
        });
    }
};
