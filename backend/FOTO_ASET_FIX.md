# Perbaikan Foto Aset Sarana Prasarana

## Masalah
Foto aset pada halaman Sarana Prasarana menggunakan URL Railway yang hardcoded di model, sehingga:
1. Tidak berfungsi di development (localhost)
2. Tidak fleksibel saat ganti domain production
3. Foto tidak muncul jika URL berubah

## Root Cause
Model `FotoSaranaPrasarana` dan `FotoAset` menggunakan hardcoded URL:
```php
$appUrl = 'https://inventaris-visualisasi-production.up.railway.app';
return "{$appUrl}/storage/{$storagePath}";
```

## Solusi
Menggunakan `Storage::url()` Laravel helper yang otomatis mengambil `APP_URL` dari environment:
```php
return Storage::url($this->path_file);
```

## Perubahan yang Dilakukan

### 1. Model FotoSaranaPrasarana (`app/Models/FotoSaranaPrasarana.php`)
✅ **BEFORE:**
```php
public function getUrlFotoAttribute(): string
{
    if (filter_var($this->path_file, FILTER_VALIDATE_URL)) {
        return $this->path_file;
    }
    
    $appUrl = 'https://inventaris-visualisasi-production.up.railway.app';
    $storagePath = ltrim($this->path_file, '/');
    return "{$appUrl}/storage/{$storagePath}";
}
```

✅ **AFTER:**
```php
public function getUrlFotoAttribute(): string
{
    if (filter_var($this->path_file, FILTER_VALIDATE_URL)) {
        return $this->path_file;
    }
    
    // Gunakan Laravel Storage URL helper yang sudah proper
    // Ini akan otomatis menggunakan APP_URL dari environment
    return Storage::url($this->path_file);
}
```

### 2. Model FotoAset (`app/Models/FotoAset.php`)
✅ Perubahan yang sama untuk konsistensi

### 3. Config Filesystems (`config/filesystems.php`)
✅ Sudah benar - menggunakan `APP_URL` dari environment:
```php
'public' => [
    'driver' => 'local',
    'root' => storage_path('app/public'),
    'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
    'visibility' => 'public',
]
```

## Cara Kerja

### Development (Localhost)
1. `APP_URL=http://localhost:8000` di `.env`
2. Storage link: `php artisan storage:link` (sudah dibuat)
3. URL foto: `http://localhost:8000/storage/sarana-prasarana/foto.jpg`

### Production (Railway)
1. `APP_URL=https://your-backend.railway.app` di Railway environment variables
2. Storage link: dibuat otomatis di `start.sh` saat deploy
3. URL foto: `https://your-backend.railway.app/storage/sarana-prasarana/foto.jpg`

## Environment Variables Required

### Development (.env)
```env
APP_URL=http://localhost:8000
```

### Production Railway (Environment Variables)
```env
APP_URL=https://your-backend-name.railway.app
```

**⚠️ PENTING:** Pastikan `APP_URL` di Railway sesuai dengan domain Railway Anda!

## Testing

### Local Development
1. Pastikan backend server running: `php artisan serve`
2. Pastikan storage link exists: `php artisan storage:link`
3. Upload foto di halaman Sarana Prasarana
4. Cek foto muncul dengan URL: `http://localhost:8000/storage/...`

### Production Railway
1. Set `APP_URL` di Railway environment variables
2. Deploy backend
3. Railway akan otomatis menjalankan `php artisan storage:link` via `start.sh`
4. Upload foto dan verifikasi URL menggunakan domain Railway

## Troubleshooting

### Foto tidak muncul setelah upload
1. Cek `APP_URL` di environment sudah benar
2. Cek storage link exists: `ls -la public/storage` (seharusnya symlink ke `storage/app/public`)
3. Clear config cache: `php artisan config:clear`
4. Restart server

### URL foto masih menggunakan URL lama
1. Clear cache: `php artisan cache:clear`
2. Clear config: `php artisan config:clear`
3. Restart server

### Permission error saat upload
1. Pastikan folder `storage/app/public` writable:
   - Linux/Mac: `chmod -R 775 storage`
   - Windows: Pastikan folder tidak read-only

## Benefits
✅ Foto bekerja di development dan production tanpa hardcode
✅ Mudah ganti domain production (tinggal update `APP_URL`)
✅ Mengikuti best practice Laravel
✅ Konsisten dengan konfigurasi Laravel standard
