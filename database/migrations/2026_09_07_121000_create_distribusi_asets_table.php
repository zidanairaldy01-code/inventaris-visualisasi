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
        Schema::create('distribusi_asets', function (Blueprint $table) {
            $table->id();
            $table->string('nomor_surat_jalan')->unique();
            $table->string('nomor_bast')->nullable()->unique();
            $table->foreignId('sarana_prasarana_id')->constrained('sarana_prasaranas')->onDelete('cascade');
            $table->foreignId('ruangan_tujuan_id')->constrained('ruangans')->onDelete('cascade');
            $table->foreignId('petugas_pengirim_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('wakapro_penerima_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('jumlah')->default(1);
            $table->date('tanggal_kirim');
            $table->timestamp('tanggal_terima')->nullable();
            $table->enum('status', ['menunggu_konfirmasi', 'diterima', 'ditolak'])->default('menunggu_konfirmasi');
            $table->text('catatan_pengiriman')->nullable();
            $table->text('catatan_penerimaan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('distribusi_asets');
    }
};
