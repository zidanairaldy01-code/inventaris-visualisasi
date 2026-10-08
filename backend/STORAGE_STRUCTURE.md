# Storage Structure - Organized Photo Folders

Dokumen ini menjelaskan struktur penyimpanan foto yang terorganisir untuk semua sistem di aplikasi inventaris.

## 📁 Struktur Folder

```
backend/
├── storage/
│   └── app/
│       └── public/
│           └── img/                    # Root folder untuk semua gambar
│               ├── aset/               # Foto untuk sistem Aset/Inventaris
│               ├── sarana-prasarana/   # Foto untuk sistem Sarana & Prasarana
│               ├── peminjaman/         # (Future) Foto untuk sistem Peminjaman
│               ├── servis/             # (Future) Foto untuk sistem Servis
│               └── workshop/           # (Future) Foto untuk sistem Workshop
└── public/
    └── storage/ -> ../storage/app/public  (symlink)
```

## 🎯 Sistem dan Folder

| Sistem | Folder Path | Controller | Model |
|--------|-------------|------------|-------|
| **Aset/Inventaris** | `img/aset/` | `FotoAsetController` | `FotoAset` |
| **Sarana Prasarana** | `img/sarana-prasarana/` | `FotoSaranaPrasaranaController` | `FotoSaranaPrasarana` |
| Peminjaman | `img/peminjaman/` | *(Belum ada)* | - |
| Servis | `img/servis/` | *(Belum ada)* | - |
| Workshop | `img/workshop/` | *(Belum ada)* | - |

## 🔧 Cara Menambahkan Sistem Foto Baru

Jika Anda ingin menambahkan sistem foto baru (misalnya untuk Peminjaman), ikuti langkah berikut:

### 1. Buat Folder

```bash
mkdir -p storage/app/public/img/peminjaman
```

### 2. Buat Migration untuk Tabel Foto

```bash
php artisan make:migration create_foto_peminjamans_table
```

```php
// database/migrations/YYYY_MM_DD_HHMMSS_create_foto_peminjamans_table.php
Schema::create('foto_peminjamans', function (Blueprint $table) {
    $table->id();
    $table->foreignId('id_peminjaman')->constrained('peminjamans')->onDelete('cascade');
    $table->string('nama_file');
    $table->string('path_file');
    $table->text('keterangan')->nullable();
    $table->boolean('is_thumbnail')->default(false);
    $table->integer('urutan')->default(1);
    $table->timestamps();
});
```

### 3. Buat Model

```bash
php artisan make:model FotoPeminjaman
```

```php
// app/Models/FotoPeminjaman.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class FotoPeminjaman extends Model
{
    protected $table = 'foto_peminjamans';

    protected $fillable = [
        'id_peminjaman',
        'nama_file',
        'path_file',
        'keterangan',
        'is_thumbnail',
        'urutan',
    ];

    protected $appends = ['url_foto'];

    public function getUrlFotoAttribute(): string
    {
        if (filter_var($this->path_file, FILTER_VALIDATE_URL)) {
            return $this->path_file;
        }
        
        $baseUrl = rtrim(config('app.url'), '/');
        $storagePath = Storage::url($this->path_file);
        
        return $baseUrl . $storagePath;
    }

    public function peminjaman()
    {
        return $this->belongsTo(Peminjaman::class, 'id_peminjaman');
    }
}
```

### 4. Buat Controller

```bash
php artisan make:controller Api/FotoPeminjamanController
```

```php
// app/Http/Controllers/Api/FotoPeminjamanController.php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FotoPeminjaman;
use App\Models\Peminjaman;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FotoPeminjamanController extends Controller
{
    public function store(Request $request, $id)
    {
        $item = Peminjaman::findOrFail($id);

        $request->validate([
            'foto' => 'required|image|mimes:jpeg,png,jpg,webp|max:3072',
            'keterangan' => 'nullable|string|max:255',
            'is_thumbnail' => 'nullable|boolean',
        ]);

        if (!$request->hasFile('foto')) {
            return response()->json(['message' => 'File tidak ditemukan'], 400);
        }

        // Simpan ke public/storage/img/peminjaman
        $path = $request->file('foto')->store('img/peminjaman', 'public');

        if ($request->boolean('is_thumbnail', false)) {
            FotoPeminjaman::where('id_peminjaman', $item->id)
                ->update(['is_thumbnail' => false]);
        }

        $existingCount = FotoPeminjaman::where('id_peminjaman', $item->id)->count();

        $foto = FotoPeminjaman::create([
            'id_peminjaman' => $item->id,
            'nama_file' => $request->file('foto')->getClientOriginalName(),
            'path_file' => $path,
            'keterangan' => $request->keterangan,
            'is_thumbnail' => $request->boolean('is_thumbnail', $existingCount === 0),
            'urutan' => $existingCount + 1,
        ]);

        return response()->json($foto->append('url_foto'), 201);
    }

    public function destroy(string $id)
    {
        $foto = FotoPeminjaman::findOrFail($id);

        if (Storage::disk('public')->exists($foto->path_file)) {
            Storage::disk('public')->delete($foto->path_file);
        }

        $foto->delete();
        return response()->json(['message' => 'Foto berhasil dihapus']);
    }
}
```

### 5. Tambahkan Route

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    // ... existing routes

    // Foto Peminjaman
    Route::post('peminjamans/{id}/fotos', [FotoPeminjamanController::class, 'store']);
    Route::delete('foto-peminjaman/{id}', [FotoPeminjamanController::class, 'destroy']);
});
```

## 🔄 Migration Foto Lama

Jika Anda memiliki foto yang tersimpan di struktur folder lama, gunakan command berikut untuk migrasi otomatis:

```bash
php artisan foto:migrate-structure
```

Command ini akan:
- ✅ Memindahkan file foto ke folder baru
- ✅ Mengupdate path di database
- ✅ Menampilkan progress bar
- ✅ Skip foto yang sudah di-migrate
- ⚠️ Warning jika file tidak ditemukan

## 🌐 URL Foto

Dengan struktur baru, URL foto akan menjadi:

```
http://localhost:8000/storage/img/aset/filename.jpg
http://localhost:8000/storage/img/sarana-prasarana/filename.jpg
```

Atau di production:

```
https://your-domain.com/storage/img/aset/filename.jpg
https://your-domain.com/storage/img/sarana-prasarana/filename.jpg
```

## 🎨 Keuntungan Struktur Ini

1. **Terorganisir** - Setiap sistem memiliki folder terpisah
2. **Scalable** - Mudah menambahkan sistem baru
3. **Clean URL** - Path yang mudah dibaca dan dipahami
4. **Maintenance** - Mudah backup/restore per sistem
5. **Performance** - Isolasi file mencegah folder terlalu besar

## 📝 Catatan

- Semua foto disimpan di disk `public`
- Path di database hanya menyimpan relative path (e.g., `img/aset/foto.jpg`)
- Full URL di-generate otomatis oleh model accessor `getUrlFotoAttribute()`
- CORS sudah dikonfigurasi untuk mengizinkan akses ke `/storage/*`

## 🚨 Important

Jangan lupa jalankan migration command setelah update controller:

```bash
php artisan foto:migrate-structure
```

Dan pastikan symlink storage sudah dibuat:

```bash
php artisan storage:link
```
