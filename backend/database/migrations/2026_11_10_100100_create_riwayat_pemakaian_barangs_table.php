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
        Schema::create('riwayat_pemakaian_barangs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('distribusi_aset_id')->constrained('distribusi_asets')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('jumlah_pakai');
            $table->integer('sisa_sebelumnya');
            $table->integer('sisa_setelahnya');
            $table->date('tanggal_pemakaian');
            $table->text('keperluan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('riwayat_pemakaian_barangs');
    }
};

