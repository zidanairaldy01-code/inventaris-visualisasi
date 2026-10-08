# 🚂 Railway Deployment Guide

## 📋 Masalah Login CORS Error

Jika login gagal dengan error di Network tab (request merah), itu masalah CORS.

## ✅ Solusi: Setup Environment Variables di Railway

### **1. Buka Railway Dashboard**

1. Login ke [Railway](https://railway.app)
2. Pilih project backend Anda
3. Klik tab **"Variables"**

### **2. Tambahkan Environment Variables Berikut:**

```env
# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://inventaris-visualisasi-production.up.railway.app

# Frontend URL (PENTING!)
FRONTEND_URL=https://inventaris-visualisasi.vercel.app

# CORS Configuration (SANGAT PENTING!)
CORS_ALLOWED_ORIGINS=https://inventaris-visualisasi.vercel.app

# Session Configuration (REQUIRED untuk login lintas domain)
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_DOMAIN=.railway.app
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=none

# Database (otomatis dari Railway MySQL plugin)
# Biasanya Railway sudah inject variables ini:
# DB_CONNECTION=mysql
# DB_HOST=...
# DB_PORT=3306
# DB_DATABASE=railway
# DB_USERNAME=root
# DB_PASSWORD=...

# Cache & Queue
CACHE_STORE=database
QUEUE_CONNECTION=database

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=error
```

### **3. Verifikasi CORS Config di Code**

File `backend/config/cors.php` sudah benar:

```php
'allowed_origins' => env('APP_ENV') === 'production' 
    ? array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', '')))
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],
```

### **4. Restart Railway Service**

Setelah menambahkan environment variables:
1. Railway akan otomatis restart
2. Atau klik **"Deploy"** untuk force restart

### **5. Test Login**

Gunakan credentials default:

```
Username: admin
Password: password123
```

---

## 🔧 Troubleshooting

### ❌ Jika masih error CORS:

1. **Cek Railway Variables** - Pastikan `CORS_ALLOWED_ORIGINS` sudah ada
2. **Cek URL Match** - URL Vercel harus PERSIS sama (tanpa trailing slash)
3. **Clear Browser Cache** - Tekan Ctrl+Shift+R di browser
4. **Cek Railway Logs** - Klik tab "Deployments" → "View Logs"

### ❌ Jika error 500:

1. **Cek Railway Logs** untuk error message
2. **Pastikan Database Connected** - Cek MySQL plugin di Railway
3. **Run Migration** - Connect ke Railway CLI dan run:
   ```bash
   php artisan migrate:fresh --seed
   ```

### ❌ Jika error 401 (Unauthorized):

1. **Database belum di-seed** - Run seeder di Railway
2. **Password salah** - Default password adalah `password123`
3. **User tidak ada** - Run `UserSeeder` di Railway

---

## 🎯 Checklist Deployment

- [ ] ✅ Environment variables sudah ditambahkan di Railway
- [ ] ✅ `CORS_ALLOWED_ORIGINS` berisi URL Vercel yang benar
- [ ] ✅ `SESSION_SECURE_COOKIE=true` dan `SESSION_SAME_SITE=none`
- [ ] ✅ Railway service sudah restart
- [ ] ✅ Database sudah di-migrate dan seed
- [ ] ✅ Vercel `NEXT_PUBLIC_API_URL` sudah benar
- [ ] ✅ Test login dengan username `admin` dan password `password123`

---

## 📞 Bantuan Lebih Lanjut

Jika masih ada masalah:

1. Screenshot **Network tab** (Headers, Preview, Response)
2. Screenshot **Console tab** untuk error JavaScript
3. Copy **Railway Logs** yang error
4. Share ke developer untuk debugging lebih lanjut

---

**Last Updated**: 2026-10-08
