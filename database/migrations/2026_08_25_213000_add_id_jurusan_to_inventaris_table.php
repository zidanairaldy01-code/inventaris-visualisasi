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
        if (Schema::hasTable('inventaris') && !Schema::hasColumn('inventaris', 'id_jurusan')) {
            Schema::table('inventaris', function (Blueprint $table) {
                $table->foreignId('id_jurusan')->nullable()->after('id_user')->constrained('jurusans')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('inventaris') && Schema::hasColumn('inventaris', 'id_jurusan')) {
            Schema::table('inventaris', function (Blueprint $table) {
                $table->dropForeign(['id_jurusan']);
                $table->dropColumn('id_jurusan');
            });
        }
    }
};
