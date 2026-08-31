<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menambahkan kolom id_sumber_dana ke tabel folder_inventaris
     * agar folder belanja bisa dihubungkan dengan sumber dana tertentu.
     */
    public function up(): void
    {
        if (Schema::hasTable('folder_inventaris') && !Schema::hasColumn('folder_inventaris', 'id_sumber_dana')) {
            Schema::table('folder_inventaris', function (Blueprint $table) {
                $table->foreignId('id_sumber_dana')
                    ->nullable()
                    ->after('jenis')
                    ->constrained('sumber_danas')
                    ->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('folder_inventaris') && Schema::hasColumn('folder_inventaris', 'id_sumber_dana')) {
            Schema::table('folder_inventaris', function (Blueprint $table) {
                $table->dropForeign(['id_sumber_dana']);
                $table->dropColumn('id_sumber_dana');
            });
        }
    }
};
