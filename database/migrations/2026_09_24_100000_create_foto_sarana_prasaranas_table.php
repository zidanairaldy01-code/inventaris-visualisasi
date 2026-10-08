<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('foto_sarana_prasaranas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_sarana_prasarana')->nullable();
            $table->string('nama_barang_ref')->index(); // untuk shared lookup berdasarkan nama barang
            $table->string('nama_file');
            $table->string('path_file');
            $table->string('keterangan')->nullable();
            $table->boolean('is_thumbnail')->default(false);
            $table->unsignedInteger('urutan')->default(1);
            $table->timestamps();

            $table->foreign('id_sarana_prasarana')
                  ->references('id')
                  ->on('sarana_prasaranas')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('foto_sarana_prasaranas');
    }
};
