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
        if (Schema::hasTable('sarana_prasaranas') && !Schema::hasTable('inventaris')) {
            Schema::rename('sarana_prasaranas', 'inventaris');
        } elseif (!Schema::hasTable('inventaris')) {
            Schema::create('inventaris', function (Blueprint $table) {
                $table->id();
                $table->date('tanggal_pengambilan');
                $table->string('kode')->unique();
                $table->string('nama_barang');
                $table->string('satuan', 50);
                $table->integer('stok_awal')->default(0);
                $table->integer('stok_masuk')->default(0);
                $table->integer('stok_keluar')->default(0);
                $table->integer('stok_akhir')->default(0);
                $table->text('keterangan')->nullable();
                $table->foreignId('id_user')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('inventaris')) {
            Schema::rename('inventaris', 'sarana_prasaranas');
        }
    }
};
