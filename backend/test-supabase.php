<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Services\SupabaseStorageService;
use Illuminate\Http\UploadedFile;

$supabase = app(SupabaseStorageService::class);

echo "Testing Supabase connection...\n";
echo "URL: " . config('services.supabase.url') . "\n";
echo "Bucket: " . config('services.supabase.storage_bucket') . "\n";
echo "Key: " . substr(config('services.supabase.anon_key'), 0, 20) . "...\n\n";

// Test dengan file dummy
$testImagePath = __DIR__.'/public/favicon.ico';
if (!file_exists($testImagePath)) {
    echo "Error: Test file not found at {$testImagePath}\n";
    exit(1);
}

$testFile = new UploadedFile(
    $testImagePath,
    'test-upload.ico',
    'image/x-icon',
    null,
    true
);

try {
    echo "Uploading test file...\n";
    $result = $supabase->uploadWithHash($testFile, 'test');
    echo "✓ Upload successful!\n";
    echo "URL: " . $result['url'] . "\n";
    echo "Path: " . $result['path'] . "\n";
} catch (\Exception $e) {
    echo "✗ Upload failed!\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✓ Supabase integration working!\n";
