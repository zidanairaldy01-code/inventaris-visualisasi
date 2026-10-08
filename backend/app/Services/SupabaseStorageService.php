<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Http\UploadedFile;

class SupabaseStorageService
{
    protected string $url;
    protected string $key;
    protected string $bucket;

    public function __construct()
    {
        $this->url = config('services.supabase.url');
        $this->key = config('services.supabase.anon_key');
        $this->bucket = config('services.supabase.storage_bucket', 'inventaris-photos');
    }

    /**
     * Upload file ke Supabase Storage
     * 
     * @param UploadedFile $file
     * @param string $path Path di dalam bucket (e.g., 'aset/foto.jpg')
     * @return array{url: string, path: string}
     * @throws \Exception
     */
    public function upload(UploadedFile $file, string $path): array
    {
        $url = "{$this->url}/storage/v1/object/{$this->bucket}/{$path}";
        
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
            'Content-Type' => $file->getMimeType(),
        ])->attach(
            'file', 
            file_get_contents($file->getRealPath()),
            $file->getClientOriginalName()
        )->post($url, [
            'file' => $file
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to upload to Supabase: ' . $response->body());
        }

        $publicUrl = $this->getPublicUrl($path);

        return [
            'url' => $publicUrl,
            'path' => $path,
        ];
    }

    /**
     * Upload file dengan nama otomatis (hash)
     */
    public function uploadWithHash(UploadedFile $file, string $folder = ''): array
    {
        $extension = $file->getClientOriginalExtension();
        $filename = uniqid() . '_' . time() . '.' . $extension;
        $path = $folder ? "{$folder}/{$filename}" : $filename;
        
        return $this->upload($file, $path);
    }

    /**
     * Delete file dari Supabase Storage
     */
    public function delete(string $path): bool
    {
        $url = "{$this->url}/storage/v1/object/{$this->bucket}/{$path}";
        
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
        ])->delete($url);

        return $response->successful();
    }

    /**
     * Get public URL untuk file
     */
    public function getPublicUrl(string $path): string
    {
        return "{$this->url}/storage/v1/object/public/{$this->bucket}/{$path}";
    }

    /**
     * Check apakah bucket sudah ada, jika belum buat bucket
     */
    public function ensureBucketExists(): bool
    {
        $url = "{$this->url}/storage/v1/bucket/{$this->bucket}";
        
        // Check if bucket exists
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
        ])->get($url);

        if ($response->successful()) {
            return true;
        }

        // Create bucket if not exists
        $createUrl = "{$this->url}/storage/v1/bucket";
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->key}",
            'Content-Type' => 'application/json',
        ])->post($createUrl, [
            'id' => $this->bucket,
            'name' => $this->bucket,
            'public' => true,
            'file_size_limit' => 5242880, // 5MB
            'allowed_mime_types' => ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
        ]);

        return $response->successful();
    }
}
