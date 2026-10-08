<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('peminjamans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_aset')->constrained('asets')->cascadeOnDelete();
            $table->string('nama_peminjam');
            $table->string('role_peminjam')->default('Siswa'); // Siswa, Guru, Staf
            $table->integer('jumlah')->default(1);
            $table->date('tanggal_pinjam');
            $table->date('tanggal_kembali_rencana')->nullable();
            $table->date('tanggal_kembali_aktual')->nullable();
            $table->text('keperluan')->nullable();
            $table->string('status')->default('Dipinjam'); // Dipinjam, Dikembalikan, Terlambat
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('peminjamans');
    }
};
