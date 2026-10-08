# 🔧 Fix Login Issue - Quick Guide

## 🔴 Problem

Login gagal di production (Vercel + Railway) dengan error CORS atau Network Failed.

---

## ✅ Solution (3 Steps)

### **Step 1: Railway - Add Environment Variables**

Login ke Railway Dashboard → Your Project → **Variables** tab

Tambahkan variables berikut:

```env
APP_ENV=production
APP_DEBUG=false
FRONTEND_URL=https://inventaris-visualisasi.vercel.app
CORS_ALLOWED_ORIGINS=https://inventaris-visualisasi.vercel.app
SESSION_DOMAIN=.railway.app
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none
```

> ⚠️ **PENTING**: Pastikan `CORS_ALLOWED_ORIGINS` berisi URL Vercel Anda yang PERSIS!

### **Step 2: Vercel - Add Environment Variable**

Login ke Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

Tambahkan:

```
Key: NEXT_PUBLIC_API_URL
Value: https://inventaris-visualisasi-production.up.railway.app
```

Pilih environment: **Production, Preview, Development** (semua)

Lalu **Redeploy** frontend!

### **Step 3: Test Login**

Buka website Anda di browser:
- Clear cache (Ctrl+Shift+R)
- Login dengan:
  ```
  Username: admin
  Password: password123
  ```

---

## 🔍 Verification Checklist

- [ ] ✅ Railway variables `CORS_ALLOWED_ORIGINS` sudah ditambahkan
- [ ] ✅ Railway variables `SESSION_SECURE_COOKIE=true`
- [ ] ✅ Railway service sudah restart (otomatis setelah update variables)
- [ ] ✅ Vercel variable `NEXT_PUBLIC_API_URL` sudah ditambahkan
- [ ] ✅ Vercel frontend sudah di-redeploy
- [ ] ✅ Browser cache sudah di-clear
- [ ] ✅ Test login berhasil ✨

---

## 🐛 Still Not Working?

### Debug Steps:

1. **Open Browser DevTools (F12)**
   - Tab **Console**: Lihat error message
   - Tab **Network**: Klik request `login` yang error
     - Cek **Request URL**: Harus ke Railway (bukan localhost!)
     - Cek **Status Code**: 
       - `Failed` / `CORS` → Railway variables salah
       - `401` → Password salah atau database belum seed
       - `500` → Backend error, cek Railway logs

2. **Check Railway Logs**
   - Railway Dashboard → **Deployments** tab → **View Logs**
   - Lihat error message terakhir

3. **Check Railway Database**
   - Pastikan database sudah di-migrate dan seed
   - Connect via Railway CLI:
     ```bash
     railway run php artisan migrate:fresh --seed
     ```

4. **Test API Manually**
   - Buka di browser: `https://inventaris-visualisasi-production.up.railway.app/api/login`
   - Harus return JSON error (bukan HTML 404)

---

## 📞 Need Help?

Screenshot ini dan share ke developer:
1. ✅ Browser Console tab (F12)
2. ✅ Network tab → Request `login` → Headers + Response
3. ✅ Railway Environment Variables screenshot
4. ✅ Vercel Environment Variables screenshot
5. ✅ Railway Logs screenshot

---

## 🎯 Quick Reference

| Platform | URL |
|----------|-----|
| Frontend | `https://inventaris-visualisasi.vercel.app` |
| Backend | `https://inventaris-visualisasi-production.up.railway.app` |
| API Endpoint | `https://inventaris-visualisasi-production.up.railway.app/api/login` |

| Default Login |  |
|--------------|--|
| Username | `admin` |
| Password | `password123` |

---

**Created**: 2026-10-08  
**Last Updated**: 2026-10-08
