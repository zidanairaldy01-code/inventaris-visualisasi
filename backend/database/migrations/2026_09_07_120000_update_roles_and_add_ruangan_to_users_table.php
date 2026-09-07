<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Ubah tipe kolom role agar mendukung super_admin, petugas, wakasek, wakapro
        DB::statement("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'petugas'");

        // Perbarui data yang ada jika masih 'admin' atau 'user'
        DB::table('users')->where('role', 'admin')->update(['role' => 'super_admin']);
        DB::table('users')->where('role', 'user')->update(['role' => 'petugas']);

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'ruangan_id')) {
                $table->foreignId('ruangan_id')->nullable()->after('role')->constrained('ruangans')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'ruangan_id')) {
                $table->dropForeign(['ruangan_id']);
                $table->dropColumn('ruangan_id');
            }
        });

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'user') DEFAULT 'user'");
    }
};
