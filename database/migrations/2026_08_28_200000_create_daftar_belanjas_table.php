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
        Schema::create('daftar_belanjas', function (Blueprint $table) {
            $table->id();
            $table->integer('no_urut')->nullable();
            $table->string('kode_rekening')->nullable();
            $table->string('kode_program')->nullable();
            $table->text('uraian');
            $table->decimal('volume', 12, 2)->default(0);
            $table->string('satuan')->default('Unit');
            $table->decimal('tarif_harga', 15, 2)->default(0);
            $table->decimal('jumlah', 15, 2)->default(0);
            $table->text('keterangan')->nullable();
            $table->foreignId('id_user')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Index untuk pencarian
            $table->index('kode_rekening');
            $table->index('kode_program');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daftar_belanjas');
    }
};
