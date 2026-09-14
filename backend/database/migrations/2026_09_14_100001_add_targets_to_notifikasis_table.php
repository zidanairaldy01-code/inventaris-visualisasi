<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('notifikasis', function (Blueprint $table) {
            $table->string('target_role', 50)->default('admin')->after('id');
            $table->unsignedBigInteger('target_user_id')->nullable()->after('target_role');
            $table->unsignedBigInteger('target_ruangan_id')->nullable()->after('target_user_id');

            $table->foreign('target_user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('target_ruangan_id')->references('id')->on('ruangans')->nullOnDelete();
            $table->index(['target_role', 'is_read']);
            $table->index(['target_ruangan_id', 'is_read']);
        });

        // Update data lama agar memiliki target_role = 'admin' dan ekstrak target_ruangan_id jika ada
        $existingNotifs = DB::table('notifikasis')->get();
        foreach ($existingNotifs as $notif) {
            $ruanganId = null;
            if (!empty($notif->data)) {
                $decoded = json_decode($notif->data, true);
                if (is_array($decoded) && !empty($decoded['ruangan_id'])) {
                    $ruanganId = $decoded['ruangan_id'];
                }
            }
            DB::table('notifikasis')->where('id', $notif->id)->update([
                'target_role'       => 'admin',
                'target_ruangan_id' => $ruanganId,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifikasis', function (Blueprint $table) {
            $table->dropForeign(['target_user_id']);
            $table->dropForeign(['target_ruangan_id']);
            $table->dropIndex(['target_role', 'is_read']);
            $table->dropIndex(['target_ruangan_id', 'is_read']);
            $table->dropColumn(['target_role', 'target_user_id', 'target_ruangan_id']);
        });
    }
};
