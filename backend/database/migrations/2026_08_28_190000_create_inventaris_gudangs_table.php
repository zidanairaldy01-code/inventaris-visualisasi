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
        Schema::create('inventaris_gudangs', function (Blueprint $table) {
            $table->id();
            $table->date('tanggal_pengambilan')->nullable();
            $table->string('kode')->nullable();
            $table->string('nama_barang');
            $table->string('satuan', 50)->default('Unit');
            $table->integer('stok_awal')->default(0);
            $table->integer('stok_masuk')->default(0);
            $table->integer('stok_keluar')->default(0);
            $table->integer('stok_akhir')->default(0);
            $table->text('keterangan')->nullable();
            $table->foreignId('id_user')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('id_folder')->nullable()->constrained('folder_inventaris')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventaris_gudangs');
    }
};
