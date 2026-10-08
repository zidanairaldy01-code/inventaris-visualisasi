# ▲ Vercel Deployment Guide

## 📋 Setup Environment Variables di Vercel

### **1. Buka Vercel Dashboard**

1. Login ke [Vercel](https://vercel.com)
2. Pilih project frontend Anda
3. Klik **Settings** → **Environment Variables**

### **2. Tambahkan Variable Berikut:**

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://inventaris-visualisasi-production.up.railway.app` | Production, Preview, Development |

> ⚠️ **PENTING**: Pastikan URL Railway backend Anda PERSIS sama (tanpa trailing slash `/`)

### **3. Redeploy**

Setelah menambahkan environment variable:

1. Klik tab **"Deployments"**
2. Klik titik tiga pada deployment terakhir
3. Pilih **"Redeploy"**

ATAU commit & push perubahan untuk trigger auto-deploy.

---

## 🔍 Verifikasi URL Backend

URL backend Railway Anda adalah:
```
https://inventaris-visualisasi-production.up.railway.app
```

Coba akses di browser:
- `https://inventaris-visualisasi-production.up.railway.app/api/login` ✅ Harus return JSON error (bukan HTML error)

---

## 🎯 Checklist

- [ ] ✅ `NEXT_PUBLIC_API_URL` sudah ditambahkan di Vercel Environment Variables
- [ ] ✅ URL mengarah ke Railway backend (bukan localhost!)
- [ ] ✅ Frontend sudah di-redeploy setelah update environment variable
- [ ] ✅ Clear browser cache (Ctrl+Shift+R)
- [ ] ✅ Test login dengan username `admin` dan password `password123`

---

## 🐛 Debugging

### **Cek di Browser Console (F12):**

Jika masih error, buka Console dan lihat error message:

```javascript
// Error CORS
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy

// Error Network
Failed to fetch
net::ERR_CONNECTION_REFUSED

// Error 401
Unauthorized - Username atau password salah
```

### **Cek Network Tab:**

1. Buka DevTools (F12) → Network tab
2. Login ke aplikasi
3. Lihat request `login`:
   - **Status**: Harus 200 (OK) atau 401 (Unauthorized jika password salah)
   - **Request URL**: Harus ke Railway (`https://inventaris-visualisasi-production.up.railway.app/api/login`)
   - **Response**: Lihat error message di tab Response

---

**Last Updated**: 2026-10-08
