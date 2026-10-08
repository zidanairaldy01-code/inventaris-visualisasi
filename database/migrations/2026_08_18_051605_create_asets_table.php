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
        Schema::create('asets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_kategori')->constrained('kategoris')->cascadeOnDelete();
            $table->foreignId('id_ruangan')->nullable()->constrained('ruangans')->nullOnDelete();
            $table->foreignId('id_sumber_dana')->nullable()->constrained('sumber_danas')->nullOnDelete();
            $table->foreignId('id_kondisi')->nullable()->constrained('kondisis')->nullOnDelete();
            $table->foreignId('id_user')->nullable()->constrained('users')->nullOnDelete();
            $table->string('kode_aset')->unique()->nullable();
            $table->string('nama_aset');
            $table->string('merek')->nullable();
            $table->string('tipe')->nullable();
            $table->string('warna')->nullable();
            $table->integer('jumlah')->default(1);
            $table->string('satuan')->nullable();
            $table->integer('tahun_perolehan')->nullable();
            $table->decimal('harga_perolehan', 15, 2)->nullable();
            $table->string('nomor_seri')->nullable();
            $table->date('tanggal_perolehan')->nullable();
            $table->text('deskripsi')->nullable();
            $table->string('status_aset')->default('Aktif');
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asets');
    }
};
