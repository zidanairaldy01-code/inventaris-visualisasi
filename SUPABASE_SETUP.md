# Supabase Storage Setup Guide

Panduan lengkap untuk setup Supabase Storage untuk menyimpan foto/gambar aplikasi inventaris.

## 🎯 Kenapa Supabase?

✅ **Gratis** - 1GB storage gratis  
✅ **Public URL** - Tidak ada masalah CORS  
✅ **CDN** - Gambar ter-serve dengan cepat  
✅ **Reliable** - 99.9% uptime guarantee  
✅ **Simple** - Setup dalam 5 menit  

## 📋 Langkah 1: Buat Project Supabase

1. **Kunjungi** https://supabase.com
2. **Sign up** atau login dengan GitHub
3. **Create New Project**
   - Organization: Pilih atau buat baru
   - Project Name: `inventaris-aset` (atau nama bebas)
   - Database Password: Buat password yang kuat (simpan!)
   - Region: **Southeast Asia (Singapore)** (paling dekat dengan Indonesia)
4. **Tunggu** ±2 menit sampai project selesai dibuat

## 📋 Langkah 2: Buat Storage Bucket

1. Buka project yang sudah dibuat
2. Klik **Storage** di sidebar kiri
3. Klik **New Bucket**
4. Isi form:
   - **Name**: `inventaris-photos`
   - **Public bucket**: ✅ **CENTANG INI** (penting!)
   - **File size limit**: `5 MB`
   - **Allowed MIME types**: `image/jpeg, image/png, image/jpg, image/webp`
5. Klik **Create bucket**

## 📋 Langkah 3: Ambil Credentials

1. Klik **Project Settings** (icon ⚙️ di sidebar kiri bawah)
2. Klik **API** di menu settings
3. Copy credentials berikut:

### Project URL
```
https://xxxxxxxxxxxxx.supabase.co
```
Copy dari **Project URL**

### Anon Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBh...
```
Copy dari **Project API keys** → **anon** → **public**

### Service Role Key (Optional, untuk admin operations)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBh...
```
Copy dari **Project API keys** → **service_role** → **secret** (⚠️ JANGAN SHARE!)

## 📋 Langkah 4: Konfigurasi Backend Laravel

### 4.1 Update `.env` di Backend

Buka file `backend/.env` dan tambahkan/update:

```env
# Supabase Storage Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET=inventaris-photos
```

**⚠️ Ganti dengan credentials Anda!**

### 4.2 Update `.env.production.example` (untuk Railway)

Tambahkan variabel yang sama di `.env.production.example` agar tidak lupa saat deploy ke Railway.

### 4.3 Update Railway Environment Variables

1. Buka **Railway Dashboard** → Project → Settings → Variables
2. Tambahkan environment variables:
   - `SUPABASE_URL`: `https://xxxxxxxxxxxxx.supabase.co`
   - `SUPABASE_ANON_KEY`: `eyJhbG...` (anon key Anda)
   - `SUPABASE_SERVICE_KEY`: `eyJhbG...` (service key Anda)
   - `SUPABASE_STORAGE_BUCKET`: `inventaris-photos`
3. **Redeploy** service

## 📋 Langkah 5: Test Upload

### 5.1 Test dari Local

```bash
# Restart Laravel server
cd backend
php artisan serve
```

### 5.2 Test Upload Foto

1. Buka aplikasi frontend
2. Pergi ke **Sarana & Prasarana**
3. Pilih salah satu item
4. Klik tombol **Kamera** 📷
5. **Upload foto** baru
6. **Cek** foto muncul dengan URL Supabase

### 5.3 URL yang Diharapkan

Foto yang di-upload akan punya URL seperti ini:

```
https://xxxxxxxxxxxxx.supabase.co/storage/v1/object/public/inventaris-photos/sarana-prasarana/filename.jpg
```

## 📂 Struktur Bucket

```
inventaris-photos/              # Bucket name
├── aset/                        # Foto aset/inventaris
│   ├── 1234567890_file1.jpg
│   └── 9876543210_file2.jpg
└── sarana-prasarana/           # Foto sarana prasarana
    ├── 1234567890_file1.jpg
    └── 9876543210_file2.jpg
```

## 🔧 Troubleshooting

### ❌ Error: "Failed to upload to Supabase"

**Solusi:**
1. Cek environment variables sudah benar
2. Pastikan bucket name adalah `inventaris-photos`
3. Pastikan bucket di-set **public**
4. Restart Laravel server

### ❌ Error: "CORS policy"

**Solusi:**
1. Pastikan bucket adalah **Public bucket**
2. Cek di **Storage Settings** → **CORS** → Allow all origins sudah enabled

### ❌ Foto tidak muncul (404)

**Solusi:**
1. Cek URL foto di Network tab browser
2. Buka URL langsung di browser
3. Jika 404, cek apakah file ter-upload di **Supabase Dashboard → Storage**
4. Pastikan bucket name di URL sama dengan config

### ❌ Upload sukses tapi foto lama tidak muncul

**Solusi:**
Foto lama masih di Railway storage. Ada 2 pilihan:
1. **Manual migration**: Download foto lama → Upload ulang via aplikasi
2. **Keep both**: Biarkan foto lama di Railway, foto baru di Supabase (model sudah handle ini)

## 📊 Monitoring & Quota

### Cek Usage

1. Buka **Supabase Dashboard**
2. Klik **Project Settings** → **Usage**
3. Lihat:
   - **Storage**: Berapa GB terpakai (limit 1GB free)
   - **Bandwidth**: Berapa GB transfer (limit 2GB free)
   - **API Requests**: Jumlah request

### Upgrade Plan

Jika sudah mendekati limit:
1. **Free Plan**: 1GB storage, 2GB bandwidth/month
2. **Pro Plan** ($25/month): 100GB storage, 250GB bandwidth
3. Atau **Self-host** Supabase (gratis, unlimited)

## 🎨 Best Practices

1. **Compress Images**: Resize/compress gambar sebelum upload
2. **Naming Convention**: Gunakan prefix `{timestamp}_{originalname}`
3. **File Size Limit**: Max 5MB per file (sudah di-set di validation)
4. **Backup**: Export bucket secara berkala untuk backup
5. **Access Control**: Jangan share Service Role Key ke public

## 🔒 Security Notes

✅ **Anon Key**: Aman di-share ke frontend (public)  
⚠️ **Service Key**: JANGAN di-share atau commit ke git!  
✅ **Bucket Public**: Aman untuk foto yang memang untuk ditampilkan  
❌ **Bucket Private**: Gunakan untuk dokumen sensitif (bukan foto publik)  

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs/guides/storage
- **Storage API Ref**: https://supabase.com/docs/reference/javascript/storage
- **Dashboard**: https://app.supabase.com

## ✅ Checklist Setup

- [ ] Buat project Supabase
- [ ] Buat bucket `inventaris-photos` (public)
- [ ] Copy credentials (URL, anon key)
- [ ] Update `.env` di backend
- [ ] Update environment variables di Railway
- [ ] Test upload foto
- [ ] Verify foto muncul dengan URL Supabase

Setelah semua checklist ✅, sistem siap digunakan! 🎉
