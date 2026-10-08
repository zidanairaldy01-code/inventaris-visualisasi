<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

Route::get('/test-supabase', function () {
    return response()->json([
        'supabase_url' => config('services.supabase.url'),
        'has_anon_key' => !empty(config('services.supabase.anon_key')),
        'anon_key_length' => strlen(config('services.supabase.anon_key') ?? ''),
        'has_service_key' => !empty(config('services.supabase.service_key')),
        'service_key_length' => strlen(config('services.supabase.service_key') ?? ''),
        'bucket' => config('services.supabase.storage_bucket'),
        'bucket_url' => config('services.supabase.url') . '/storage/v1/bucket/' . config('services.supabase.storage_bucket'),
    ]);
});
