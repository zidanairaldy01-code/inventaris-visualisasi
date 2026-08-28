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
                $table->date('tanggal_pengambilan')->nullable()->change();
                $table->string('kode')->nullable()->change();
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
                $table->date('tanggal_pengambilan')->nullable(false)->change();
                $table->string('kode')->nullable(false)->change();
            });
        }
    }
};
