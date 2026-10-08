# 🚀 Quick Start - Supabase Storage (5 Menit)

Panduan cepat untuk setup Supabase Storage dan mulai upload foto.

## ⚡ Step 1: Buat Project Supabase (2 menit)

1. Buka https://supabase.com
2. Klik **Start your project**
3. **Sign in with GitHub**
4. **New project**:
   - Name: `inventaris-aset`
   - Database Password: (buat & simpan!)
   - Region: **Southeast Asia (Singapore)**
5. Klik **Create new project**
6. ⏳ Tunggu 2 menit

## ⚡ Step 2: Buat Storage Bucket (1 menit)

1. Klik **Storage** di sidebar
2. Klik **New bucket**
3. Setting:
   - Name: `inventaris-photos`
   - ✅ **Public bucket** (PENTING!)
   - File size limit: `5`
   - Allowed MIME: `image/jpeg, image/png, image/jpg, image/webp`
4. **Create bucket**

## ⚡ Step 3: Copy Credentials (30 detik)

1. Klik **⚙️ Settings** → **API**
2. Copy 2 hal ini:

### URL
```
https://abcdefghijklmnop.supabase.co
```

### Anon Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFz...
```

## ⚡ Step 4: Update Backend Environment (30 detik)

Buka `backend/.env` dan tambahkan:

```env
# Supabase Storage
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET=inventaris-photos
```

**⚠️ Ganti dengan credentials Anda yang tadi di-copy!**

## ⚡ Step 5: Test Upload (1 menit)

```bash
# Restart Laravel server
cd backend
php artisan serve
```

Lalu:
1. Buka aplikasi frontend
2. Buka **Sarana & Prasarana**
3. Klik icon **📷 Kamera** pada item
4. **Upload foto baru**
5. ✅ Foto akan muncul dengan URL Supabase!

## 🎉 Selesai!

URL foto baru akan terlihat seperti:
```
https://abcdefghijklmnop.supabase.co/storage/v1/object/public/inventaris-photos/sarana-prasarana/123456_foto.jpg
```

## 🔧 Troubleshooting

### Foto tidak muncul?

1. **Cek Console Browser** - Ada error?
2. **Cek Network Tab** - URL-nya apa?
3. **Cek .env** - Credentials sudah benar?
4. **Restart server** - Laravel perlu restart untuk baca .env baru

### Error "Failed to upload"?

1. **Bucket name** harus `inventaris-photos` (sama persis!)
2. **Public bucket** harus di-centang
3. **Credentials** di .env sudah benar?

### Butuh bantuan?

Baca dokumentasi lengkap di `SUPABASE_SETUP.md`

---

**Total waktu:** ±5 menit ⚡
**Biaya:** FREE (1GB storage, 2GB bandwidth/bulan)
**Next:** Deploy ke Railway dengan update environment variables di sana juga!
