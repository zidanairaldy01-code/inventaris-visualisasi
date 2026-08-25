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
        if (Schema::hasTable('asets') && !Schema::hasColumn('asets', 'id_folder')) {
            Schema::table('asets', function (Blueprint $table) {
                $table->foreignId('id_folder')->nullable()->after('id_user')->constrained('folder_inventaris')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('asets') && Schema::hasColumn('asets', 'id_folder')) {
            Schema::table('asets', function (Blueprint $table) {
                $table->dropForeign(['id_folder']);
                $table->dropColumn('id_folder');
            });
        }
    }
};
