<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

use Illuminate\Support\Facades\Schedule;
use App\Models\FolderInventaris;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('folder:purge-trash', function () {
    $expired = FolderInventaris::onlyTrashed()
        ->where('deleted_at', '<=', now()->subDays(30))
        ->get();

    $count = 0;
    foreach ($expired as $folder) {
        \App\Models\InventarisGudang::where('id_folder', $folder->id)->delete();
        \App\Models\DaftarBelanja::where('id_folder', $folder->id)->delete();
        \App\Models\SaranaPrasarana::where('id_folder', $folder->id)->delete();
        \App\Models\Inventaris::where('id_folder', $folder->id)->delete();
        $folder->forceDelete();
        $count++;
    }

    $this->info("Purged {$count} expired trashed folders (older than 30 days).");
})->purpose('Purge soft-deleted folders older than 30 days');

Schedule::command('folder:purge-trash')->daily();
