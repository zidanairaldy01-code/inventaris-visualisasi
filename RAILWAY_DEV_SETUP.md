# Setup Development dengan Railway Backend

Dokumen ini menjelaskan cara menggunakan Railway production backend untuk gambar/storage saat development di localhost.

## Mengapa Menggunakan Railway Backend untuk Gambar?

Saat development di localhost, kadang kita ingin menggunakan gambar/foto yang sudah ada di production Railway server, sehingga tidak perlu upload ulang ke localhost.

## Konfigurasi

### 1. Frontend (.env.local)

Ubah `NEXT_PUBLIC_API_URL` untuk menggunakan Railway:

```env
# Local Development with Railway backend
NEXT_PUBLIC_API_URL=https://inventaris-visualisasi-production.up.railway.app
```

### 2. Backend CORS (config/cors.php)

Backend Railway harus mengizinkan request dari localhost:3000:

```php
'allowed_origins' => env('APP_ENV') === 'production' 
    ? array_merge(
        array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', ''))),
        ['http://localhost:3000', 'http://127.0.0.1:3000'] // Allow localhost for development
    )
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],
```

**PENTING**: Path `storage/*` harus ditambahkan ke CORS paths:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie', 'storage/*'],
```

### 3. Deploy Perubahan ke Railway

Setelah mengubah `config/cors.php`, push ke Railway:

```bash
cd backend
git add config/cors.php
git commit -m "Update CORS to allow localhost for development"
git push railway main
```

atau jika menggunakan Railway CLI:

```bash
railway up
```

### 4. Restart Next.js Development Server

```bash
# Stop server (Ctrl+C) kemudian restart
npm run dev
```

## Cara Kerja

1. Frontend Next.js di **localhost:3000** akan melakukan API request ke **Railway production**
2. Gambar akan di-load dari **Railway storage** melalui URL: `https://inventaris-visualisasi-production.up.railway.app/storage/...`
3. Backend Railway akan mengizinkan request dari localhost karena CORS sudah dikonfigurasi

## Kembali ke Localhost Backend

Jika ingin kembali menggunakan localhost backend, ubah `.env.local`:

```env
# Local Development
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Dan restart Next.js dev server.

## Troubleshooting

### Gambar Tidak Muncul

1. **Cek Console Browser**: Lihat apakah ada CORS error
2. **Cek Railway Logs**: Pastikan CORS config sudah diterapkan
3. **Cek Network Tab**: Lihat response dari request storage
4. **Clear Cache**: Hapus cache browser dan restart dev server

### CORS Error

Jika masih ada CORS error, pastikan:
- Backend Railway sudah di-deploy dengan config CORS terbaru
- `storage/*` sudah ditambahkan ke paths
- localhost:3000 ada di allowed_origins

### 401 Unauthorized

Pastikan Anda sudah login dan token auth tersimpan di cookies.
