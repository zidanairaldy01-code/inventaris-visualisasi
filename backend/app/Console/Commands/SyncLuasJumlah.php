<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncLuasJumlah extends Command
{
    protected $signature = 'sync:luas-jumlah {--fix : Jalankan update ke DB}';
    protected $description = 'Cek dan sinkronkan luas_jumlah dengan stok_akhir untuk data numerik';

    public function handle()
    {
        $items = DB::select(
            "SELECT id, nama_barang, luas_jumlah, stok_akhir 
             FROM sarana_prasaranas 
             WHERE luas_jumlah REGEXP '^[0-9]+$' 
               AND CAST(luas_jumlah AS UNSIGNED) != stok_akhir"
        );

        $this->info('Total tidak sinkron (numerik): ' . count($items));

        foreach ($items as $item) {
            $this->line("  ID={$item->id} | {$item->nama_barang} | luas_jumlah={$item->luas_jumlah} | stok_akhir={$item->stok_akhir}");
        }

        if ($this->option('fix') && count($items) > 0) {
            DB::statement(
                "UPDATE sarana_prasaranas 
                 SET luas_jumlah = CAST(stok_akhir AS CHAR)
                 WHERE luas_jumlah REGEXP '^[0-9]+$' 
                   AND CAST(luas_jumlah AS UNSIGNED) != stok_akhir"
            );
            $this->info('✅ Update selesai.');
        } elseif ($this->option('fix')) {
            $this->info('Tidak ada data yang perlu diupdate.');
        } else {
            $this->info('Tambahkan --fix untuk menjalankan update.');
        }

        return 0;
    }
}

