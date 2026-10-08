<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;

Route::get('/', function () {
    return view('welcome');
});

// Debug route untuk cek storage configuration (hapus di production!)
Route::get('/debug-storage', function () {
    $publicPath = public_path('storage');
    $storagePath = storage_path('app/public');
    
    return response()->json([
        'app_url' => config('app.url'),
        'app_url_env' => env('APP_URL'),
        'storage_disk' => config('filesystems.default'),
        'filesystem_disk_env' => env('FILESYSTEM_DISK'),
        'public_disk_url' => config('filesystems.disks.public.url'),
        'public_path_exists' => file_exists($publicPath),
        'storage_path_exists' => file_exists($storagePath),
        'is_symlink' => is_link($publicPath),
        'storage_files' => File::allFiles($storagePath),
        'sample_url' => Storage::disk('public')->url('test.jpg'),
        'all_env_app' => [
            'APP_NAME' => env('APP_NAME'),
            'APP_ENV' => env('APP_ENV'),
            'APP_URL' => env('APP_URL'),
        ],
    ]);
});

// Clear config cache (untuk testing, hapus setelah selesai)
Route::get('/clear-cache', function () {
    \Illuminate\Support\Facades\Artisan::call('config:clear');
    \Illuminate\Support\Facades\Artisan::call('cache:clear');
    
    return response()->json([
        'message' => 'Cache cleared successfully',
        'app_url_after_clear' => config('app.url'),
    ]);
});

// Fallback route untuk serving storage files jika symbolic link tidak berfungsi di Railway
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);
    
    if (!file_exists($fullPath)) {
        abort(404, 'File not found: ' . $fullPath);
    }
    
    $mimeType = mime_content_type($fullPath);
    
    return response()->file($fullPath, [
        'Content-Type' => $mimeType,
        'Cache-Control' => 'public, max-age=31536000',
    ]);
})->where('path', '.*');
