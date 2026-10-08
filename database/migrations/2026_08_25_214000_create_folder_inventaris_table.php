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
        if (!Schema::hasTable('folder_inventaris')) {
            Schema::create('folder_inventaris', function (Blueprint $table) {
                $table->id();
                $table->string('nama_folder');
                $table->text('keterangan')->nullable();
                $table->string('warna', 30)->default('blue');
                $table->timestamps();
            });
        }

        if (Schema::hasTable('inventaris') && !Schema::hasColumn('inventaris', 'id_folder')) {
            Schema::table('inventaris', function (Blueprint $table) {
                $table->foreignId('id_folder')->nullable()->after('id_user')->constrained('folder_inventaris')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('inventaris') && Schema::hasColumn('inventaris', 'id_folder')) {
            Schema::table('inventaris', function (Blueprint $table) {
                $table->dropForeign(['id_folder']);
                $table->dropColumn('id_folder');
            });
        }

        Schema::dropIfExists('folder_inventaris');
    }
};
