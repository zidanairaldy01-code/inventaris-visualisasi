# Perbaikan: Error Upload Foto di Railway Production

## Ringkasan Masalah
Upload foto ke endpoint `/api/sarana-prasaranas/{id}/fotos` gagal dengan error:
```
HTTP 500: "Gagal upload foto: URI must include a scheme and host."
```

## Akar Masalah

**Masalah Utama:** File `start.sh` yang digunakan Railway untuk deployment tidak meng-copy environment variables Supabase ke file `.env` yang di-generate.

Walaupun variabel sudah ditambahkan di Railway Dashboard, Laravel tidak bisa mengaksesnya karena `start.sh` hanya meng-generate `.env` dengan variabel yang sudah di-list dalam script tersebut.

**Lokasi Masalah:**
1. `backend/start.sh` - Script deployment tidak include variabel Supabase
2. `backend/app/Services/SupabaseStorageService.php:14` - Service mencoba akses `config('services.supabase.url')` yang kosong

## Solusi: Update start.sh dan Tambahkan Variables ke Railway

### Langkah 1: Update File start.sh (SUDAH DILAKUKAN)

File `backend/start.sh` sudah diupdate untuk include variabel Supabase:

```bash
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
SUPABASE_STORAGE_BUCKET=${SUPABASE_STORAGE_BUCKET:-inventaris-photo}
```

### Langkah 2: Commit & Push Perubahan

```bash
cd backend
git add start.sh
git commit -m "fix: tambah Supabase env vars ke start.sh"
git push origin main
```

Railway akan otomatis trigger redeploy setelah push.

### Langkah 3: Tambahkan Variables di Railway Dashboard
### Langkah 3: Tambahkan Variables di Railway Dashboard

1. Buka https://railway.app
2. Masuk ke project: `inventaris-visualisasi-production`
3. Klik service backend
4. Buka tab **Variables**

### Langkah 4: Add Variabel Supabase
Tambahkan environment variables berikut (gunakan nilai dari file `.env` lokal Anda):

| Nama Variabel | Nilai | Catatan |
|---------------|-------|---------|
| `SUPABASE_URL` | `https://sphwghxndohrvfmnklmv.supabase.co` | **WAJIB** - Diperlukan untuk konstruksi URI |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Public anonymous key |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | **WAJIB** - Digunakan untuk upload |
| `SUPABASE_STORAGE_BUCKET` | `inventaris-photo` | Nama bucket default |

### Langkah 5: Verifikasi di Railway Logs
### Langkah 5: Verifikasi di Railway Logs

Setelah deployment selesai, cek Railway logs. Anda harus melihat output seperti ini:

```
✓ Generated .env file
APP_URL = https://inventaris-visualisasi-production.up.railway.app
SUPABASE_URL = https://sphwghxndohrvfmnklmv.supabase.co
SUPABASE_STORAGE_BUCKET = inventaris-photo
```

**Jika `SUPABASE_URL` masih kosong**, berarti variabel belum ditambahkan di Railway Dashboard.

Kemudian test upload foto dari frontend dan monitor logs untuk pesan `"Supabase upload successful"`.

## Perbaikan Alternatif: Tambahkan Validasi di Constructor

Untuk mencegah error yang tidak jelas, validasi sudah ditambahkan ke `SupabaseStorageService`:

```php
public function __construct()
{
    $this->url = config('services.supabase.url');
    $this->key = config('services.supabase.service_key');
    $this->bucket = config('services.supabase.storage_bucket', 'inventaris-photo');
    
    // Validasi konfigurasi
    if (empty($this->url)) {
        throw new \RuntimeException(
            'SUPABASE_URL tidak dikonfigurasi. Silakan set di environment variables Anda.'
        );
    }
    
    if (empty($this->key)) {
        throw new \RuntimeException(
            'SUPABASE_SERVICE_KEY tidak dikonfigurasi. Silakan set di environment variables Anda.'
        );
    }
    
    // Validasi format URL
    if (!filter_var($this->url, FILTER_VALIDATE_URL)) {
        throw new \RuntimeException(
            "Format SUPABASE_URL tidak valid: {$this->url}. Harus include scheme (https://) dan host."
        );
    }
}
```

Ini akan memberikan pesan error yang lebih jelas saat aplikasi startup, bukan saat runtime.

## Perintah Test Cepat

### Test Lokal (setelah set env vars)
```bash
cd backend
php artisan config:clear
php artisan config:cache
php artisan tinker

# Di tinker:
config('services.supabase.url')  # Harus return: https://sphwghxndohrvfmnklmv.supabase.co
config('services.supabase.service_key')  # Harus return key Anda
```

### Test Production (via Railway CLI)
```bash
railway run php artisan tinker
# Lalu cek config values seperti di atas
```

## Checklist Pencegahan

- [ ] Semua environment variables Supabase ditambahkan ke Railway
- [ ] Deployment Railway berhasil
- [ ] Upload foto ditest di frontend production
- [ ] Log direview untuk pesan upload success
- [ ] Validasi constructor sudah ditambahkan untuk error message yang lebih baik

## File Terkait
- `backend/app/Services/SupabaseStorageService.php` - Service yang menggunakan config
- `backend/config/services.php` - Definisi konfigurasi
- `backend/.env.production.example` - Template environment production (sudah diupdate)
- `backend/app/Http/Controllers/Api/FotoSaranaPrasaranaController.php` - Endpoint upload

## Perilaku yang Diharapkan Setelah Diperbaiki
1. Upload foto harus berhasil dengan HTTP 201
2. Response harus include record foto dengan `url_foto`
3. Log harus menunjukkan: `"Supabase upload successful"`
4. Foto harus bisa diakses via URL public Supabase
