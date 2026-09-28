# Dokumentasi Halaman Publik - SMK PGRI Telagasari

## 📋 Overview

Halaman publik sistem inventaris aset SMK PGRI Telagasari dirancang untuk memberikan transparansi informasi aset dan fasilitas sekolah kepada masyarakat umum.

## 🎨 Struktur Halaman

### 1. **Navbar (PublicNavbar)**
- Logo sekolah di kiri
- Nama website di tengah kiri
- Menu navigasi di tengah (Beranda, Berita, Workshop, Kelas, Tentang, Katalog Aset)
- Tombol Login di kanan atas
- Responsive dengan mobile menu

**File**: `src/components/public/PublicNavbar.tsx`

---

### 2. **Hero Section (HeroSection)**
- Judul besar dan tagline menarik
- Quick stats cards (4 kartu statistik):
  - Jenis Aset
  - Total Unit
  - Nilai Aset
  - Total Ruangan
- CTA buttons (Lihat Katalog & Tentang Sekolah)
- Background gradient blue modern

**File**: `src/components/public/HeroSection.tsx`

**Props**:
```typescript
interface HeroSectionProps {
  stats: {
    total_item: number;
    total_unit: number;
    total_nilai: number;
    total_ruangan?: number;
  } | null;
}
```

---

### 3. **News Carousel (NewsCarousel)**
- Slider otomatis setiap 5 detik
- Foto berita di sebelah kiri
- Deskripsi berita di sebelah kanan
- Navigation buttons (prev/next)
- Dots indicator untuk navigasi
- Pause on hover

**File**: `src/components/public/NewsCarousel.tsx`

**Data Structure**:
```typescript
interface NewsItem {
  id: number;
  title: string;
  description: string;
  image: string;
  date: string;
  author: string;
}
```

**Note**: Saat ini menggunakan mock data. Bisa diintegrasikan dengan API backend untuk berita dinamis.

---

### 4. **Workshop Section (WorkshopSection)**
- Grid layout untuk card workshop
- Filter berdasarkan kategori (Semua, Otomotif, Teknologi, Listrik, Manufaktur, Multimedia)
- Setiap card berisi:
  - Foto workshop
  - Icon kategori
  - Nama workshop
  - Deskripsi singkat
  - List fasilitas
- Hover effects untuk interaktivitas

**File**: `src/components/public/WorkshopSection.tsx`

**Data Structure**:
```typescript
interface Workshop {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  image: string;
  facilities: string[];
}
```

**Note**: Menggunakan mock data. Bisa dibuatkan API endpoint di backend untuk data workshop.

---

### 5. **Kelas Section (KelasSection)**
- Grid layout sama seperti workshop
- Menampilkan program keahlian/jurusan
- Setiap card berisi:
  - Header dengan gradient warna per jurusan
  - Badge singkatan jurusan (TKRO, TKJ, TITL, dll)
  - Nama lengkap jurusan
  - Deskripsi
  - Statistik (jumlah siswa, durasi studi)
  - CTA button "Lihat Detail Jurusan"
- Bottom info card dengan akreditasi, total siswa, dan alumni

**File**: `src/components/public/KelasSection.tsx`

**Data Structure**:
```typescript
interface Kelas {
  id: number;
  name: string;
  jurusan: string;
  description: string;
  studentCount: number;
  image: string;
  color: string;
}
```

**Note**: Menggunakan mock data. Bisa dibuatkan API endpoint di backend untuk data jurusan.

---

### 6. **Catalog Section (CatalogSection)**
- Terintegrasi dengan API backend
- Filter dan pencarian:
  - Search by nama ruangan
  - Filter by gedung
  - Filter by kelas (X, XI, XII)
  - Filter by jurusan
  - Reset filter button
- Grid layout untuk card ruangan
- Modal untuk detail inventaris per ruangan
- Menampilkan foto aset, kondisi, kategori, dan jumlah

**File**: `src/components/public/CatalogSection.tsx`

**API Endpoints Used**:
- `GET /api/ruangans` - Mendapatkan list ruangan
- `GET /api/gedungs` - Mendapatkan list gedung
- `GET /api/asets?per_page=all` - Mendapatkan semua aset

---

### 7. **About Section (AboutSection)**
- Informasi tentang sekolah
- Grid layout dengan foto dan konten
- Visi & Misi cards
- Galeri foto fasilitas (3 kolom)
- Contact information card dengan:
  - Alamat
  - Telepon
  - Email
  - Embedded map (placeholder)

**File**: `src/components/public/AboutSection.tsx`

---

### 8. **Footer (PublicFooter)**
- 4 kolom informasi:
  - About & Logo
  - Quick Links
  - Contact Info
  - Social Media
- Copyright dan legal links
- Responsive layout

**File**: `src/components/public/PublicFooter.tsx`

---

## 🚀 Cara Menggunakan

### Instalasi
Semua komponen sudah dibuat dan siap digunakan. Halaman utama (`src/app/page.tsx`) sudah mengimport semua komponen.

### Menjalankan Development Server
```bash
npm run dev
```

Buka browser dan akses: `http://localhost:3000`

---

## 🔧 Konfigurasi & Customization

### 1. Mengganti Logo Sekolah
Edit di file:
- `src/components/public/PublicNavbar.tsx`
- `src/components/public/PublicFooter.tsx`

Ganti URL:
```typescript
src="http://localhost:8000/storage/img/pgri-telagasari.jpg"
```

### 2. Menambah/Edit Data Workshop
Edit file: `src/components/public/WorkshopSection.tsx`

Atau buat API endpoint di backend Laravel:
```php
// Route: GET /api/workshops
Route::get('/workshops', [WorkshopController::class, 'index']);
```

### 3. Menambah/Edit Data Jurusan
Edit file: `src/components/public/KelasSection.tsx`

Atau buat API endpoint di backend Laravel:
```php
// Route: GET /api/jurusans-public
Route::get('/jurusans-public', [JurusanController::class, 'publicIndex']);
```

### 4. Menambah/Edit Berita
Edit file: `src/components/public/NewsCarousel.tsx`

Atau buat API endpoint di backend Laravel:
```php
// Route: GET /api/news
Route::get('/news', [NewsController::class, 'index']);
```

### 5. Mengubah Warna Theme
Edit file: `tailwind.config.ts` untuk mengubah color scheme sesuai identitas sekolah.

---

## 📱 Responsive Design

Semua komponen sudah responsive dan mobile-friendly:
- ✅ Mobile (320px - 768px)
- ✅ Tablet (768px - 1024px)
- ✅ Desktop (1024px+)

---

## 🎯 Fitur Utama

### ✨ Yang Sudah Diimplementasikan:
1. ✅ Navbar sticky dengan logo dan menu navigasi
2. ✅ Hero section dengan statistik real-time dari API
3. ✅ News carousel dengan auto-play
4. ✅ Workshop section dengan filter kategori
5. ✅ Kelas/jurusan section dengan card colorful
6. ✅ Catalog section terintegrasi dengan API
7. ✅ About section dengan visi-misi dan contact
8. ✅ Footer lengkap dengan social media
9. ✅ Filter dan search untuk katalog aset
10. ✅ Modal detail inventaris per ruangan
11. ✅ Smooth scroll navigation
12. ✅ Hover effects dan animations
13. ✅ Loading states

### 🔮 Rekomendasi Pengembangan Selanjutnya:
1. Buat API backend untuk Workshop dan Jurusan
2. Implementasi sistem berita/pengumuman di backend
3. Tambahkan halaman detail untuk setiap jurusan
4. Implementasi Google Maps embed untuk lokasi
5. Tambahkan galeri foto sekolah yang lebih lengkap
6. Implementasi search global
7. Tambahkan statistik pengunjung
8. Implementasi PWA (Progressive Web App)
9. Add SEO optimization (meta tags, schema.org)
10. Implementasi multilingual (Indonesia & English)

---

## 📚 Dependencies

Komponen menggunakan:
- **Next.js 16.3.1** - React framework
- **React 19.2.8** - UI library
- **Axios** - HTTP client untuk API calls
- **Lucide React** - Icon library
- **Tailwind CSS 4** - Styling

---

## 🐛 Troubleshooting

### Logo tidak muncul
Pastikan file logo ada di: `backend/storage/app/public/img/pgri-telagasari.jpg`

Dan jalankan di backend Laravel:
```bash
php artisan storage:link
```

### API tidak bisa diakses
Pastikan backend Laravel sudah running di `http://localhost:8000`

Check file `src/lib/axios.ts` untuk konfigurasi base URL.

### Styling tidak muncul
Pastikan Tailwind CSS sudah dikonfigurasi dengan benar di `tailwind.config.ts`

---

## 📞 Support

Jika ada pertanyaan atau butuh bantuan, silakan buat issue atau hubungi tim development.

---

## 📄 License

© 2024 SMK PGRI Telagasari. All rights reserved.
