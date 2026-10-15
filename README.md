# 🏫 Sistem Informasi Inventaris & Visualisasi Aset Sekolah
### SMK PGRI Telagasari — Smart School Asset & Facility Management System

> **Aplikasi modern berbasis web untuk digitalisasi, visualisasi interaktif, dan tata kelola inventaris sarana prasarana sekolah secara transparan, akuntabel, dan real-time.**

---

## 🌟 Tentang Aplikasi

Aplikasi **Inventaris & Visualisasi Aset** adalah platform komprehensif yang dirancang khusus untuk mempermudah instansi pendidikan (SMK PGRI Telagasari) dalam mencatat, mengelola, memantau, mendistribusikan, dan memvisualisasikan seluruh aset fisik sekolah. 

Mulai dari gedung bertingkat, ruang kelas, bengkel/workshop kejuruan, stok pergudangan bahan praktik, hingga alur distribusi belanja dan perbaikan servis sarana prasarana, seluruh data terintegrasi dalam satu sistem terpusat.

---

## 💎 Sisi Unggulan & Kelebihan Utama

### 1. 🏢 Visualisasi Fasilitas & Ruangan Interaktif
* **Pemetaan Gedung & Ruangan:** Visualisasi hierarki gedung sekolah per lantai dengan tampilan kartu modern, lengkap dengan informasi kapasitas, luas ruangan, dan jumlah aset yang ada di dalamnya.
* **Galeri Foto High-Definition:** Foto gedung dan ruang kelas ditampilkan dengan banner foto beresolusi tajam, dilengkapi fitur **Lightbox Zoom Modal** untuk inspeksi visual langsung dari web.
* **Pembeda Workshop & Ruang Teori:** Penanganan khusus untuk ruang praktik kejuruan (TKRO, TKJ, TITL, TP, RPL, dll.) dengan katalog aset workshop terpisah.

### 2. 👥 Multi-Role & Hak Akses Berjenjang
* **🛡️ Administrator (Super Admin):** Akses penuh ke seluruh konfigurasi master data gedung, ruangan, pengguna, kategori, kondisi, berita, dan monitoring laporan.
* **👔 Wakil Kepala Sekolah (Wakasek Sarpras & Keuangan):** Otoritas kontrol perencanaan, verifikasi pengadaan barang, rekap belanja per sumber dana, dan pemantauan kondisi aset sekolah secara berkala.
* **🔧 Waka Program Keahlian (Wakapro):** Portal khusus kepala bengkel/jurusan untuk memantau inventaris lab masing-masing, mengajukan servis perbaikan, memverifikasi tanda terima distribusi, dan mengatur peminjaman alat praktik.
* **✍️ Petugas Input:** Didesain efisien untuk operasional harian: input cepat mutasi stok, barcode/kode aset, upload nota belanja, dan pencatatan inventaris lapangan.
* **🌐 Portal Publik (Tanpa Login):** Halaman transparansi publik untuk melihat profil jurusan, daftar fasilitas unggulan, berita sekolah, serta cek aset per kelas.

### 3. 📦 Tata Kelola Gudang & Logistik Modern
* **Manajemen Stok Real-Time:** Pencatatan stok awal, mutasi masuk, mutasi keluar, dan perhitungan otomatis saldo akhir barang habis pakai maupun alat praktik.
* **Quick Stock Mutation:** Tombol aksi cepat tambah/kurang stok dengan catatan otomatis tanpa perlu mengisi formulir panjang.
* **Folderisasi Fleksibel:** Pengelompokan barang gudang berdasarkan folder tematik atau tahun ajaran dengan indikator visual label warna.

### 4. 💰 Rekapitulasi Pengadaan & Sumber Dana
* **Laporan Anggaran Multi-Sumber:** Transparansi belanja inventaris yang terpetakan ke sumber dana resmi (BOS Reguler, BOS Kinerja, Komite Sekolah, DAK, Yayasan, Bantuan Industri, dll.).
* **Perhitungan Nilai Aset Otomatis:** Akumulasi total nilai perolehan dan valuasi aset sekolah secara otomatis pada setiap kategori dan gedung.

### 5. 🔄 Alur Distribusi & Konfirmasi Penerimaan
* Alur terstruktur dari pengadaan hingga serah terima barang:
  1. Petugas/Wakasek mendistribusikan barang ke ruangan/jurusan tujuan.
  2. Sistem mengirimkan sinyal status barang dalam pengiriman.
  3. Wakapro menerima notifikasi dan melakukan konfirmasi penerimaan barang dengan satu klik.

### 6. 🛠️ Pemeliharaan Kondisi, Servis & Cetak SPK
* **Klasifikasi Kondisi Fisik:** Monitoring status aset kategori **Baik**, **Rusak Ringan**, dan **Rusak Berat**.
* **Integrasi Modul Servis:** Barang yang mengalami kerusakan dapat langsung diteruskan ke modul servis/perbaikan teknisi.
* **Cetak Otomatis SPK:** Fitur siap cetak **Surat Perintah Kerja (SPK)** perbaikan dengan format resmi sekolah.

### 7. 📑 Smart Import Excel & Validasi Otomatis
* **Spreadsheet Parser Cerdas:** Fitur import file Excel (.xlsx / .xls) yang mendeteksi header secara otomatis untuk memasukkan ratusan data barang inventaris sekaligus.
* **Pratinjau & Edit Inline:** Memvalidasi dan mengoreksi data pada tabel preview sebelum dieksekusi ke database.

### 8. 🛡️ Keamanan & Penanganan Error Transparan
* **Sistem Tempat Sampah (Soft-Delete 30 Hari):** Mencegah kehilangan data fatal jika terjadi kesalahan hapus; folder atau inventaris dapat dipulihkan kapan saja.
* **Modal Dialog Error Informatif:** Sistem error reporting terintegrasi (`GlobalErrorModal`) yang menampilkan keterangan penyebab error dan pesan validasi dari server secara jelas kepada pengguna.
* **Cloud Asset Storage:** Integrasi penyimpanan cloud Supabase Storage berkecepatan tinggi dengan fallback asset lokal.

---

## 🛠️ Arsitektur Teknologi

### Frontend
* **Framework:** [Next.js](https://nextjs.org/) (App Router, Server & Client Components)
* **Bahasa:** TypeScript
* **Styling & Desain:** Vanilla CSS + Tailwind CSS (Glassmorphism, Vibrant Palette, Micro-animations)
* **Icon Pack:** Lucide React
* **Data Processing:** SheetJS (XLSX) untuk manipulasi spreadsheet
* **Komunikasi API:** Axios dengan Interceptor & Event-Driven Error Handling

### Backend
* **Framework:** [Laravel](https://laravel.com/) (RESTful API Architecture)
* **Bahasa:** PHP 8.x
* **Database:** PostgreSQL / Supabase
* **Autentikasi:** Token-based Authentication (Laravel Sanctum)
* **Penyimpanan Media:** Supabase Object Storage / Public Disk Storage

---

## 🚀 Panduan Menjalankan Sistem

### 1. Menjalankan Backend (Laravel)
```bash
# Pindah ke direktori backend
cd backend

# Install dependensi PHP
composer install

# Salin konfigurasi environment
cp .env.example .env

# Generate application key
php artisan key:generate

# Migrasi & Seeder Database
php artisan migrate --seed

# Jalankan server API backend
php artisan serve
# Berjalan pada http://localhost:8000
```

### 2. Menjalankan Frontend (Next.js)
```bash
# Dari direktori root proyek
cd c:/projek/inventaris-visualisasi

# Install dependensi Node.js
npm install

# Jalankan server frontend development
npm run dev
# Berjalan pada http://localhost:3000
```

---

## 📂 Struktur Modul Aplikasi

```text
├── src/
│   ├── app/
│   │   ├── dashboard/          # Portal Administrasi & Super Admin
│   │   ├── wakasek/            # Portal Wakil Kepala Sekolah
│   │   ├── wakapro/            # Portal Waka Program Keahlian / Bengkel
│   │   ├── petugas-input/      # Portal Operasional Petugas Input
│   │   ├── public/             # Portal Informasi Publik & Transparansi Aset Kelas
│   │   ├── login/              # Halaman Masuk Terpusat Multi-Role
│   │   └── layout.tsx          # Master Layout dengan Global Error Modal & Toast
│   ├── components/             # Reusable UI (Foto Modal, Alert Dialog, Toast, Navigasi)
│   ├── hooks/                  # Custom React Hooks (useNotification, useAuth)
│   ├── lib/                    # Instance Axios & Konfigurasi Helper
│   └── utils/                  # Handler Error Terpusat & Parser
└── backend/                    # Server Laravel REST API
    ├── app/Http/Controllers/   # API Endpoints (Gedung, Ruangan, Aset, Inventaris, Gudang)
    ├── database/migrations/    # Skema Struktur Tabel Database
    └── routes/api.php          # Definisi Routing REST API
```

---

## 👨‍💻 Kontribusi & Hak Cipta

Dikembangkan untuk optimalisasi dan modernisasi sarana prasarana pendidikan di lingkungan **SMK PGRI Telagasari**.
Semua data dan aset dikelola demi mendukung kegiatan belajar mengajar yang berstandar industri.
