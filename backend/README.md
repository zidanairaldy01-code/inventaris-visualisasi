# ⚙️ Backend API — Sistem Inventaris & Visualisasi Aset
### RESTful API Service untuk SMK PGRI Telagasari

> **Backend engine yang menggerakkan seluruh transaksi data, manajemen aset, pergudangan, alur serah terima, dan sinkronisasi media untuk aplikasi Inventaris & Visualisasi Aset.**

---

## 📌 Gambaran Umum Layanan Backend

Backend ini dibangun menggunakan **Laravel** yang dioptimalkan sebagai antarmuka **REST API murni** untuk melayani Frontend (Next.js). Dirancang dengan arsitektur modular yang menjamin skalabilitas, kecepatan respons, integritas relasional data aset, serta keamanan transaksi data sekolah.

---

## 💎 Keunggulan Arsitektur & Fitur Backend

### 1. 🗄️ Relasi Data Aset Komprehensif (Eloquent ORM)
* Mengelola relasi hierarki bertingkat: `Gedung` ➜ `Ruangan` ➜ `Aset` ➜ `Galeri Foto`.
* Menyimpan riwayat perubahan status barang, mutasi gudang, dan log peminjaman secara terstruktur.
* Mendukung eager-loading cerdas untuk performa response JSON super cepat tanpa query berlebih (N+1 query avoidance).

### 2. 🔐 Autentikasi & Otorisasi Berjenjang (Role-Based Access Control)
* Menggunakan **Laravel Sanctum** untuk pengelolaan sesi token yang aman.
* Proteksi rute API spesifik berdasarkan hak akses pengguna:
  * `admin`: Kendali penuh seluruh endpoint.
  * `wakasek`: Hak otorisasi anggaran, rekap belanja, audit aset, dan pemantauan kondisi.
  * `wakapro`: Hak kelola workshop jurusan terkait, konfirmasi penerimaan distribusi, dan servis alat.
  * `petugas-input`: Hak input operasional data gudang, aset, dan mutasi barang harian.

### 3. ☁️ Integrasi Hybrid Storage (Supabase Cloud + Local Disk)
* Pengelolaan upload foto gedung, ruangan, berita, dan thumbnail aset dengan integrasi Supabase Object Storage.
* Dilengkapi sanitasi nama file unik dan helper URL publik otomatis.

### 4. 🗑️ Soft Deletes & Mekanisme Tempat Sampah 30 Hari
* Endpoint khusus penghapusan sementara (`soft-delete`) untuk folder dan inventaris, memungkinkan fitur restore maupun pengosongan massal (*empty trash*).
* Menjaga keamanan data historis sekolah dari aksi tidak sengaja.

### 5. ⚡ Robust Exception & Error Handling
* Output response error dalam format JSON standar (`{ message, errors }`) yang terhubung langsung dengan `GlobalErrorModal` di frontend.
* Menyajikan detail validasi formulir dan error penanganan database secara transparan untuk memudahkan pelacakan kendala.

---

## 📡 Ringkasan Endpoint Utama API

| Modul | Endpoint | Metode | Keterangan |
| :--- | :--- | :---: | :--- |
| **Auth** | `/api/login` | `POST` | Masuk sistem dan penerbitan token akses |
| **Auth** | `/api/user` | `GET` | Mengambil data profil pengguna yang sedang login |
| **Gedung** | `/api/gedungs` | `GET, POST, PUT, DELETE` | Manajemen master gedung sekolah & foto gedung |
| **Ruangan** | `/api/ruangans` | `GET, POST, PUT, DELETE` | Manajemen ruang kelas, lab, dan workshop kejuruan |
| **Aset** | `/api/asets` | `GET, POST, PUT, DELETE` | CRUD data aset fisik dan perlengkapan sarpras |
| **Foto Aset** | `/api/asets/{id}/fotos` | `POST, DELETE` | Manajemen galeri multi-foto aset |
| **Gudang** | `/api/inventaris-gudang` | `GET, POST, PUT, DELETE` | Stok fisik gudang & transaksi mutasi stok masuk/keluar |
| **Belanja** | `/api/daftar-belanja` | `GET, POST, PUT, DELETE` | Pencatatan pengadaan inventaris belanja |
| **Folder** | `/api/folder-inventaris` | `GET, POST, PUT, DELETE` | Pengelompokan folder inventaris tematik |
| **Trash** | `/api/folder-inventaris/trash/empty` | `DELETE` | Pengosongan permanen tempat sampah folder |
| **Distribusi**| `/api/distribusis` | `GET, POST, PUT, DELETE` | Distribusi aset dari gudang ke ruangan/jurusan |
| **Kondisi** | `/api/kondisis` | `GET, POST, PUT, DELETE` | Master kategori kondisi fisik (Baik, Rusak Ringan, Berat) |
| **Servis** | `/api/servis` | `GET, POST, PUT, DELETE` | Tiket perbaikan servis aset rusak & Surat SPK |
| **Peminjaman**| `/api/peminjamans` | `GET, POST, PUT, DELETE` | Transaksi peminjaman barang dan pengembalian |
| **Sumber Dana**| `/api/sumber-danas` | `GET, POST, PUT, DELETE` | Master alokasi anggaran (BOS, Yayasan, Komite, dll.) |
| **Berita** | `/api/beritas` | `GET, POST, PUT, DELETE` | Publikasi berita dan kegiatan sarpras sekolah |

---

## 🛠️ Konfigurasi Environment (`.env`)

Pastikan variabel berikut disesuaikan pada file `backend/.env`:

```env
APP_NAME="Inventaris SMK PGRI Telagasari"
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost:8000

# Konfigurasi Database (PostgreSQL / Supabase / MySQL)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=inventaris_db
DB_USERNAME=postgres
DB_PASSWORD=secret

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Konfigurasi Storage Supabase (Opsional jika menggunakan Cloud Storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-key
SUPABASE_BUCKET=inventaris
```

---

## 💻 Menjalankan Perintah Artisan Penting

```bash
# Menjalankan server API lokal
php artisan serve

# Menjalankan migrasi database
php artisan migrate

# Mengisi data awal (Seeder)
php artisan db:seed

# Membersihkan cache aplikasi & config
php artisan config:clear
php artisan route:clear
php artisan cache:clear
```
