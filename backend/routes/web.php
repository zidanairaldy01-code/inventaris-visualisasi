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
        'storage_disk' => config('filesystems.default'),
        'public_disk_url' => config('filesystems.disks.public.url'),
        'public_path_exists' => file_exists($publicPath),
        'storage_path_exists' => file_exists($storagePath),
        'is_symlink' => is_link($publicPath),
        'storage_files' => File::allFiles($storagePath),
        'sample_url' => Storage::disk('public')->url('test.jpg'),
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
