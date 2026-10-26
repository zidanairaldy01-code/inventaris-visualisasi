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
        // 1. Tabel Super Admin
        Schema::create('super_admins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('nama_lengkap');
            $table->string('no_telepon')->nullable();
            $table->string('hak_akses')->default('Super Administrator (Full Access)');
            $table->timestamps();
        });

        // 2. Tabel Petugas Input
        Schema::create('petugas_inputs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('nama_lengkap');
            $table->string('nip')->nullable();
            $table->string('shift_kerja')->default('Pagi');
            $table->string('divisi')->default('Inventaris & Sarana Prasarana');
            $table->timestamps();
        });

        // 3. Tabel Wakapro (Wakil Kepala Program Keahlian / Kepala Bengkel)
        Schema::create('wakapros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('nama_lengkap');
            $table->string('nip')->nullable();
            $table->string('program_keahlian')->nullable();
            $table->foreignId('ruangan_id')->nullable()->constrained('ruangans')->nullOnDelete();
            $table->timestamps();
        });

        // 4. Tabel Wakasek (Wakil Kepala Sekolah)
        Schema::create('wakaseks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('nama_lengkap');
            $table->string('nip')->nullable();
            $table->string('bidang')->default('Sarana dan Prasarana');
            $table->timestamps();
        });

        // Sinkronisasi data pengguna yang sudah ada ke tabel masing-masing
        $now = now();
        $users = DB::table('users')->get();

        foreach ($users as $u) {
            if ($u->role === 'super_admin') {
                DB::table('super_admins')->updateOrInsert(
                    ['user_id' => $u->id],
                    [
                        'nama_lengkap' => $u->nama_lengkap,
                        'no_telepon'   => null,
                        'hak_akses'    => 'Super Administrator (Full Access)',
                        'created_at'   => $now,
                        'updated_at'   => $now,
                    ]
                );
            } elseif ($u->role === 'petugas') {
                DB::table('petugas_inputs')->updateOrInsert(
                    ['user_id' => $u->id],
                    [
                        'nama_lengkap' => $u->nama_lengkap,
                        'nip'          => null,
                        'shift_kerja'  => 'Pagi',
                        'divisi'       => 'Inventaris & Sarana Prasarana',
                        'created_at'   => $now,
                        'updated_at'   => $now,
                    ]
                );
            } elseif ($u->role === 'wakapro') {
                DB::table('wakapros')->updateOrInsert(
                    ['user_id' => $u->id],
                    [
                        'nama_lengkap'     => $u->nama_lengkap,
                        'nip'              => null,
                        'program_keahlian' => 'Teknik Komputer & Jaringan',
                        'ruangan_id'       => $u->ruangan_id ?? null,
                        'created_at'       => $now,
                        'updated_at'       => $now,
                    ]
                );
            } elseif ($u->role === 'wakasek') {
                DB::table('wakaseks')->updateOrInsert(
                    ['user_id' => $u->id],
                    [
                        'nama_lengkap' => $u->nama_lengkap,
                        'nip'          => null,
                        'bidang'       => 'Sarana dan Prasarana',
                        'created_at'   => $now,
                        'updated_at'   => $now,
                    ]
                );
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wakaseks');
        Schema::dropIfExists('wakapros');
        Schema::dropIfExists('petugas_inputs');
        Schema::dropIfExists('super_admins');
    }
};
