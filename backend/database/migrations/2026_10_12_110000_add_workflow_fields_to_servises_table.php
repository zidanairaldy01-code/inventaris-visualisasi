<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('servises', function (Blueprint $table) {
            if (!Schema::hasColumn('servises', 'pelapor_user_id')) {
                $table->foreignId('pelapor_user_id')->nullable()->after('sarana_prasarana_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('servises', 'ruangan_id')) {
                $table->foreignId('ruangan_id')->nullable()->after('pelapor_user_id')->constrained('ruangans')->nullOnDelete();
            }
            if (!Schema::hasColumn('servises', 'approved_by_wakasek_id')) {
                $table->foreignId('approved_by_wakasek_id')->nullable()->after('teknisi_bengkel')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('servises', 'tanggal_acc_wakasek')) {
                $table->timestamp('tanggal_acc_wakasek')->nullable()->after('approved_by_wakasek_id');
            }
            if (!Schema::hasColumn('servises', 'verified_by_admin_id')) {
                $table->foreignId('verified_by_admin_id')->nullable()->after('tanggal_acc_wakasek')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('servises', 'tanggal_selesai_admin')) {
                $table->timestamp('tanggal_selesai_admin')->nullable()->after('verified_by_admin_id');
            }
            if (!Schema::hasColumn('servises', 'catatan_wakasek')) {
                $table->text('catatan_wakasek')->nullable()->after('tanggal_selesai_admin');
            }
            if (!Schema::hasColumn('servises', 'catatan_admin')) {
                $table->text('catatan_admin')->nullable()->after('catatan_wakasek');
            }
        });
    }

    public function down(): void
    {
        Schema::table('servises', function (Blueprint $table) {
            $table->dropForeign(['pelapor_user_id']);
            $table->dropForeign(['ruangan_id']);
            $table->dropForeign(['approved_by_wakasek_id']);
            $table->dropForeign(['verified_by_admin_id']);
            $table->dropColumn([
                'pelapor_user_id',
                'ruangan_id',
                'approved_by_wakasek_id',
                'tanggal_acc_wakasek',
                'verified_by_admin_id',
                'tanggal_selesai_admin',
                'catatan_wakasek',
                'catatan_admin'
            ]);
        });
    }
};
