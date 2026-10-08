# Deployment Configuration Guide

## Problem: Foto Tidak Muncul Setelah Deploy

### Root Cause
Ketika aplikasi di-deploy ke production (Railway untuk backend, Vercel untuk frontend), foto yang di-upload berhasil tersimpan di database tetapi tidak muncul preview-nya karena URL foto masih menggunakan `http://localhost:8000`.

### Solution Steps

#### 1. Update Railway Environment Variables

Masuk ke Railway Dashboard → Project Anda → Variables tab, kemudian tambahkan/update:

```env
APP_URL=https://your-backend-url.up.railway.app
```

**Penting**: Ganti `your-backend-url.up.railway.app` dengan URL Railway backend Anda yang sebenarnya.

#### 2. Jalankan Storage Link Command di Railway

Pastikan symbolic link untuk storage sudah dibuat. Jalankan di Railway terminal:

```bash
php artisan storage:link
```

Atau tambahkan ke build command di Railway:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "composer install --no-dev --optimize-autoloader && php artisan storage:link"
  }
}
```

#### 3. Restart Railway Service

Setelah mengubah environment variables, restart service Railway agar perubahan diterapkan.

### What Was Changed in Code

**Modified Files:**
1. `backend/app/Models/FotoSaranaPrasarana.php`
2. `backend/app/Models/FotoAset.php`

**Changes:**
- Updated `getUrlFotoAttribute()` method to use `APP_URL` from config instead of Laravel's default `Storage::url()`
- Added validation to check if path is already a full URL
- More robust URL generation that properly handles trailing slashes

**Before:**
```php
public function getUrlFotoAttribute(): string
{
    return Storage::disk('public')->url($this->path_file);
}
```

**After:**
```php
public function getUrlFotoAttribute(): string
{
    // Jika path_file sudah berupa URL lengkap, return as-is
    if (filter_var($this->path_file, FILTER_VALIDATE_URL)) {
        return $this->path_file;
    }
    
    // Generate URL menggunakan APP_URL dari config
    $appUrl = rtrim(config('app.url'), '/');
    $storagePath = ltrim($this->path_file, '/');
    
    return "{$appUrl}/storage/{$storagePath}";
}
```

### Verification

Setelah deployment:

1. **Upload foto baru** di sarana prasarana
2. **Check database** - foto harus tersimpan dengan path seperti: `sarana-prasarana/xxxxx.jpg`
3. **Check API response** - `url_foto` harus berisi URL lengkap seperti: `https://your-backend-url.up.railway.app/storage/sarana-prasarana/xxxxx.jpg`
4. **Check frontend** - preview foto harus muncul dengan benar

### Common Issues

#### Issue: 404 Not Found untuk URL storage
**Solution**: Jalankan `php artisan storage:link` di Railway

#### Issue: URL masih menggunakan localhost
**Solution**: 
- Pastikan `APP_URL` di Railway environment variables sudah benar
- Restart Railway service
- Clear config cache: `php artisan config:clear`

#### Issue: Permission denied saat create symbolic link
**Solution**: Pastikan Railway memiliki write permission di folder `public/`. Biasanya ini sudah otomatis ter-handle oleh Railway.

### Environment Variables Checklist

#### Railway (Backend) Environment Variables

Pastikan Railway environment variables memiliki:

```env
APP_NAME=YourAppName
APP_ENV=production
APP_KEY=base64:your-app-key
APP_DEBUG=false
APP_URL=https://your-backend-url.up.railway.app

DB_CONNECTION=mysql
DB_HOST=your-db-host
DB_PORT=3306
DB_DATABASE=your-database
DB_USERNAME=your-username
DB_PASSWORD=your-password

SESSION_DRIVER=cookie
FILESYSTEM_DISK=public
```

#### Vercel (Frontend) Environment Variables

Pastikan Vercel environment variables memiliki:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app
```

**Penting**: URL harus sama dengan `APP_URL` di Railway, tanpa trailing slash.

### Testing Commands

Untuk testing di local sebelum deploy:

```bash
# Test URL generation
php artisan tinker
>>> $foto = App\Models\FotoSaranaPrasarana::first();
>>> $foto->url_foto;

# Should output full URL with APP_URL
```

### Related Files

- `backend/app/Models/FotoSaranaPrasarana.php` - Model untuk foto sarana prasarana
- `backend/app/Models/FotoAset.php` - Model untuk foto aset
- `backend/config/filesystems.php` - Konfigurasi filesystem Laravel
- `backend/.env` - Environment variables (local)
- Railway Variables - Environment variables (production)

---

**Last Updated**: 2026-10-08
