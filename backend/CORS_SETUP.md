# Konfigurasi CORS untuk Laravel + Next.js

## Masalah yang Diperbaiki
Error "strict-origin-when-cross-origin" terjadi karena:
1. CORS tidak dikonfigurasi dengan benar untuk menerima credentials
2. Frontend tidak mengirim credentials dalam request
3. Konfigurasi session tidak compatible dengan cross-origin requests

## Perubahan yang Dilakukan

### 1. Backend Laravel (`backend/config/cors.php`)
- ✅ Mengubah `allowed_origins` dari `['*']` menjadi origins spesifik
- ✅ Menambahkan `http://localhost:3000` dan `http://127.0.0.1:3000`
- ✅ Mengaktifkan `supports_credentials: true`
- ✅ Menambahkan `exposed_headers: ['*']`
- ✅ Menaikkan `max_age` menjadi 86400 detik (24 jam)

### 2. Backend Bootstrap (`backend/bootstrap/app.php`)
- ✅ Menambahkan `HandleCors` middleware ke API routes
- ✅ Memastikan middleware CORS diprioritaskan (prepend)

### 3. Environment Variables (`backend/.env`)
- ✅ Menambahkan `FRONTEND_URL=http://localhost:3000`
- ✅ Mengatur `SESSION_SECURE_COOKIE=false` (untuk development di HTTP)
- ✅ Mengatur `SESSION_HTTP_ONLY=true`
- ✅ Mengatur `SESSION_SAME_SITE=none` (untuk cross-origin)

### 4. Frontend Axios Config (`src/lib/axios.ts`)
- ✅ Menambahkan `withCredentials: true` ke axios instance
- ✅ Ini memungkinkan cookies dan headers authorization dikirim dalam cross-origin requests

## Testing
Setelah perubahan ini:
1. Restart Laravel development server
2. Restart Next.js development server
3. Clear browser cache/cookies
4. Test API requests dari frontend

## Production Notes
Untuk production, pastikan:
1. Update `FRONTEND_URL` di `.env` dengan domain production
2. Ubah `SESSION_SECURE_COOKIE=true` untuk HTTPS
3. Update `allowed_origins` di `cors.php` dengan domain production
4. Pastikan SSL/TLS certificate valid

## Commands untuk Clear Cache
```bash
cd backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```
