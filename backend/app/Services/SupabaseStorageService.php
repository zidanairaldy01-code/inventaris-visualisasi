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
        $this->key = config('services.supabase.service_key'); // Use service_key for uploads
        $this->bucket = config('services.supabase.storage_bucket', 'inventaris-photo');
        
        // Validate configuration to prevent runtime errors
        if (empty($this->url)) {
            throw new \RuntimeException(
                'SUPABASE_URL is not configured. Please set it in your environment variables. ' .
                'Expected format: https://your-project.supabase.co'
            );
        }
        
        if (empty($this->key)) {
            throw new \RuntimeException(
                'SUPABASE_SERVICE_KEY is not configured. Please set it in your environment variables.'
            );
        }
        
        // Validate URL format
        if (!filter_var($this->url, FILTER_VALIDATE_URL)) {
            throw new \RuntimeException(
                "Invalid SUPABASE_URL format: '{$this->url}'. Must include scheme (https://) and host."
            );
        }
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
        
        // Read file content reliably (try getContent first, fallback to getRealPath)
        $fileContent = $file->getContent();
        if ($fileContent === false || strlen($fileContent) === 0) {
            $realPath = $file->getRealPath();
            if ($realPath && file_exists($realPath)) {
                $fileContent = file_get_contents($realPath);
            }
        }
        
        if (empty($fileContent)) {
            throw new \Exception("File kosong atau tidak dapat dibaca: " . $file->getClientOriginalName());
        }

        // Determine mime type reliably
        $mimeType = $file->getMimeType() ?: $file->getClientMimeType() ?: 'application/octet-stream';
        // Normalize common browser / Windows mime types
        if ($mimeType === 'image/x-png') $mimeType = 'image/png';
        if ($mimeType === 'image/pjpeg') $mimeType = 'image/jpeg';
        
        // Upload using HTTP POST with apikey and Bearer authorization
        $response = Http::timeout(60)->withHeaders([
            'apikey'        => $this->key,
            'Authorization' => "Bearer {$this->key}",
            'Content-Type'  => $mimeType,
            'x-upsert'      => 'true', // Allow overwrite if file exists
        ])->withBody($fileContent, $mimeType)
          ->post($url);

        if (!$response->successful()) {
            $errorBody = $response->body();
            $errorStatus = $response->status();
            
            \Log::error('Supabase upload failed', [
                'status'    => $errorStatus,
                'body'      => $errorBody,
                'path'      => $path,
                'url'       => $url,
                'bucket'    => $this->bucket,
                'file_size' => strlen($fileContent),
                'mime_type' => $mimeType,
            ]);
            
            throw new \Exception("Failed to upload to Supabase (HTTP {$errorStatus}): {$errorBody}");
        }

        $publicUrl = $this->getPublicUrl($path);

        \Log::info('Supabase upload successful', [
            'path' => $path,
            'url'  => $publicUrl,
        ]);

        return [
            'url'  => $publicUrl,
            'path' => $path,
        ];
    }

    /**
     * Upload file dengan nama otomatis (hash)
     */
    public function uploadWithHash(UploadedFile $file, string $folder = ''): array
    {
        $extension = $file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'jpg';
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
        
        $response = Http::timeout(30)->withHeaders([
            'apikey'        => $this->key,
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
        $response = Http::timeout(30)->withHeaders([
            'apikey'        => $this->key,
            'Authorization' => "Bearer {$this->key}",
        ])->get($url);

        if ($response->successful()) {
            return true;
        }

        // Create bucket if not exists
        $createUrl = "{$this->url}/storage/v1/bucket";
        $response = Http::timeout(30)->withHeaders([
            'apikey'        => $this->key,
            'Authorization' => "Bearer {$this->key}",
            'Content-Type'  => 'application/json',
        ])->post($createUrl, [
            'id'              => $this->bucket,
            'name'            => $this->bucket,
            'public'          => true,
            'file_size_limit' => 10485760, // 10MB
        ]);

        return $response->successful();
    }
}
