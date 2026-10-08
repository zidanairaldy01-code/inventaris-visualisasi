<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('folder_inventaris') && !Schema::hasColumn('folder_inventaris', 'jenis')) {
            Schema::table('folder_inventaris', function (Blueprint $table) {
                // 'inventaris' = folder milik halaman Inventaris
                // 'sarana-prasarana' = folder milik halaman Sarana & Prasarana
                $table->string('jenis', 30)->default('inventaris')->after('warna');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('folder_inventaris') && Schema::hasColumn('folder_inventaris', 'jenis')) {
            Schema::table('folder_inventaris', function (Blueprint $table) {
                $table->dropColumn('jenis');
            });
        }
    }
};
