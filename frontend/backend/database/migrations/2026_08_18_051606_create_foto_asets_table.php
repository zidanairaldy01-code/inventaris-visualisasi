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
        Schema::create('foto_asets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('id_aset')->constrained('asets')->cascadeOnDelete();
            $table->string('nama_file');
            $table->string('path_file');
            $table->text('keterangan')->nullable();
            $table->boolean('is_thumbnail')->default(false);
            $table->integer('urutan')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('foto_asets');
    }
};
