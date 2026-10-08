# Konfigurasi CORS untuk Laravel + Next.js

## Masalah yang Diperbaiki
Error "strict-origin-when-cross-origin" terjadi karena:
1. CORS tidak dikonfigurasi dengan benar untuk menerima credentials
2. Frontend tidak mengirim credentials dalam request
3. Konfigurasi session tidak compatible dengan cross-origin requests

## Perubahan yang Dilakukan

### 1. Backend Laravel (`backend/config/cors.php`)
- ✅ Mengubah `allowed_origins` dari `['*']` menjadi origins spesifik
- ✅ Development: mengizinkan `http://localhost:3000` dan `http://127.0.0.1:3000`
- ✅ Production: menggunakan pattern untuk Vercel dan Railway domains
- ✅ Mengaktifkan `supports_credentials: true`
- ✅ Menambahkan `exposed_headers: ['*']`
- ✅ Menaikkan `max_age` menjadi 86400 detik (24 jam)

### 2. Backend Bootstrap (`backend/bootstrap/app.php`)
- ✅ Menambahkan `HandleCors` middleware ke API routes
- ✅ Memastikan middleware CORS diprioritaskan (prepend)

### 3. Environment Variables

#### Development (`backend/.env`)
```env
APP_ENV=local
FRONTEND_URL=http://localhost:3000
SESSION_SECURE_COOKIE=false
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=none
```

#### Production Railway (Environment Variables)
**WAJIB ditambahkan di Railway Dashboard:**
```env
APP_ENV=production
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=none
```

#### Production Vercel (Environment Variables)
**WAJIB ditambahkan di Vercel Project Settings:**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

### 4. Frontend Axios Config (`src/lib/axios.ts`)
- ✅ Menambahkan `withCredentials: true` ke axios instance
- ✅ Ini memungkinkan cookies dan headers authorization dikirim dalam cross-origin requests

## Setup Production

### Railway (Backend Laravel)
1. Buka Railway Dashboard → Pilih project backend
2. Pergi ke **Variables** tab
3. Tambahkan/Update environment variables berikut:
   ```
   APP_ENV=production
   CORS_ALLOWED_ORIGINS=https://nama-frontend-anda.vercel.app
   SESSION_SECURE_COOKIE=true
   SESSION_HTTP_ONLY=true
   SESSION_SAME_SITE=none
   ```
4. Deploy ulang jika tidak auto-deploy

### Vercel (Frontend Next.js)
1. Buka Vercel Dashboard → Pilih project frontend
2. Pergi ke **Settings** → **Environment Variables**
3. Tambahkan/Update:
   ```
   NEXT_PUBLIC_API_URL=https://nama-backend-anda.railway.app
   ```
4. Redeploy project

### Jika Masih Error Login di Production
1. Clear browser cache/cookies
2. Coba di incognito/private window
3. Cek browser console untuk error CORS yang spesifik
4. Pastikan URL di `CORS_ALLOWED_ORIGINS` dan `NEXT_PUBLIC_API_URL` sudah benar (tanpa trailing slash)

## Testing
Setelah perubahan ini:
1. **Development**: Restart Laravel & Next.js server
2. **Production**: Redeploy kedua services
3. Clear browser cache/cookies
4. Test login dan API requests

## Production Notes
⚠️ **PENTING untuk Production:**
1. `CORS_ALLOWED_ORIGINS` harus URL frontend Vercel yang EXACT
2. `SESSION_SECURE_COOKIE=true` karena menggunakan HTTPS
3. `SESSION_SAME_SITE=none` wajib untuk cross-origin cookies dengan HTTPS
4. Pastikan Railway backend menggunakan HTTPS (default Railway sudah HTTPS)

## Commands untuk Clear Cache
```bash
cd backend
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

## Troubleshooting

### Login gagal setelah deploy
- Cek `CORS_ALLOWED_ORIGINS` di Railway sudah sesuai URL Vercel
- Cek `NEXT_PUBLIC_API_URL` di Vercel sudah sesuai URL Railway
- Pastikan tidak ada trailing slash di URL
- Clear browser cookies

### Error "Access-Control-Allow-Origin"
- Pastikan `APP_ENV=production` di Railway
- Cek pattern Vercel URL sudah benar di cors.php
- Pastikan Railway auto-deploy setelah update environment variables

