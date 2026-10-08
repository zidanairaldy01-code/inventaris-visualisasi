<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('servises', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_aset')->constrained('asets')->cascadeOnDelete();
            $table->string('jenis_perbaikan');
            $table->date('tanggal_servis');
            $table->decimal('biaya_servis', 15, 2)->default(0);
            $table->string('teknisi_bengkel')->nullable();
            $table->text('deskripsi_kerusakan')->nullable();
            $table->string('status')->default('Selesai'); // Selesai, Proses, Batal
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('servises');
    }
};
