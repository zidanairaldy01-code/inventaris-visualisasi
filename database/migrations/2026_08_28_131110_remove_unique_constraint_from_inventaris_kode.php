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
        if (Schema::hasTable('inventaris')) {
            Schema::table('inventaris', function (Blueprint $table) {
                $table->dropUnique(['kode']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('inventaris')) {
            Schema::table('inventaris', function (Blueprint $table) {
                $table->unique('kode');
            });
        }
    }
};
