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
        Schema::table('distribusi_asets', function (Blueprint $table) {
            $table->decimal('harga_satuan', 15, 2)->default(0)->after('jumlah');
            $table->decimal('total_harga', 15, 2)->default(0)->after('harga_satuan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('distribusi_asets', function (Blueprint $table) {
            $table->dropColumn(['harga_satuan', 'total_harga']);
        });
    }
};
