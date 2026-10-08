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
            if (!Schema::hasColumn('sarana_prasaranas', 'luas_jumlah')) {
                $table->string('luas_jumlah', 100)->nullable()->after('satuan');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sarana_prasaranas', function (Blueprint $table) {
            if (Schema::hasColumn('sarana_prasaranas', 'luas_jumlah')) {
                $table->dropColumn('luas_jumlah');
            }
        });
    }
};
