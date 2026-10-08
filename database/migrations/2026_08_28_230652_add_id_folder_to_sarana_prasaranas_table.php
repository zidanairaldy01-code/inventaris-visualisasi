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
        Schema::table('sarana_prasaranas', function (Blueprint $table) {
            $table->foreignId('id_folder')->nullable()->after('id_user')->constrained('folder_inventaris')->nullOnDelete();
            $table->index('id_folder');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sarana_prasaranas', function (Blueprint $table) {
            $table->dropForeign(['id_folder']);
            $table->dropIndex(['id_folder']);
            $table->dropColumn('id_folder');
        });
    }
};
