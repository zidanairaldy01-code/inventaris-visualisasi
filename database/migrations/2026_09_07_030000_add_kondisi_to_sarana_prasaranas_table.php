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
            if (!Schema::hasColumn('sarana_prasaranas', 'kondisi')) {
                $table->string('kondisi', 50)->default('Baik')->after('nilai_harga_sekarang');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sarana_prasaranas', function (Blueprint $table) {
            if (Schema::hasColumn('sarana_prasaranas', 'kondisi')) {
                $table->dropColumn('kondisi');
            }
        });
    }
};
