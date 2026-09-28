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
        Schema::create('workshops', function (Blueprint $table) {
            $table->id();
            $table->string('nama_workshop');
            $table->text('deskripsi');
            $table->string('kategori'); // Otomotif, Teknologi, Listrik, Manufaktur, Multimedia
            $table->string('icon')->default('wrench'); // wrench, laptop, zap, cog
            $table->string('foto_workshop')->nullable();
            $table->json('fasilitas')->nullable(); // Array of facilities
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workshops');
    }
};
