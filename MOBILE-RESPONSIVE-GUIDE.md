# Mobile Responsive Enhancement Guide

## Status: ✅ In Progress

Panduan ini mendokumentasikan peningkatan mobile responsiveness untuk sistem inventaris aset.

---

## 🎯 Tujuan

1. **Tabel di mobile** → Card view yang touch-friendly
2. **Form multi-kolom** → Stack vertikal di mobile
3. **Search & filter** → Optimized layout untuk layar kecil
4. **Action buttons** → Full-width atau split buttons di mobile

---

## 🛠️ Tools yang Dibuat

### 1. **useMediaQuery Hook** (`src/hooks/useMediaQuery.ts`)

Custom hook untuk detect screen size:

```typescript
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/useMediaQuery';

const isMobile = useIsMobile();  // < 768px
const isTablet = useIsTablet();  // 768px - 1023px
const isDesktop = useIsDesktop(); // >= 1024px
```

**Breakpoints:**
- Mobile: `max-width: 767px`
- Tablet: `768px - 1023px`
- Desktop: `>= 1024px`

### 2. **MobileCard Components** (`src/components/MobileCard.tsx`)

Reusable components untuk mobile card view:

```typescript
import { 
  MobileCard,          // Container utama
  MobileCardHeader,    // Header dengan title, subtitle, badge
  MobileCardRow,       // Label-value pair
  MobileCardActions,   // Action buttons container
  MobileCardDivider    // Separator
} from '@/components/MobileCard';
```

**Contoh Penggunaan:**

```tsx
<MobileCard>
  <MobileCardHeader
    title="Nama Barang"
    subtitle="Kode: ABC123"
    badge={<span className="...">Status</span>}
    icon={<Package className="h-4 w-4" />}
  />
  
  <div className="space-y-2">
    <MobileCardRow label="Jumlah" value="10 Unit" />
    <MobileCardRow label="Kondisi" value={<Badge />} />
    <MobileCardRow label="Harga" value="Rp 100.000" />
  </div>
  
  <MobileCardActions>
    <button className="flex-1">Edit</button>
    <button className="flex-1">Delete</button>
  </MobileCardActions>
</MobileCard>
```

---

## ✅ Halaman yang Sudah Diupdate

### 1. **Wakapro - Inventaris Workshop** ✅
**File:** `src/app/wakapro/inventaris/page.tsx`

**Perubahan:**
- ✅ Import `useIsMobile` hook
- ✅ Import MobileCard components
- ✅ Conditional rendering: `isMobile ? <CardView /> : <TableView />`
- ✅ Mobile card dengan 7 fields (barang, kode, jumlah, kondisi, BAST, pengirim, tanggal)
- ✅ Badge kondisi dengan icon (CheckCircle/AlertTriangle)
- ✅ Keterangan di bawah divider
- ✅ Loading skeleton untuk mobile
- ✅ Empty state yang friendly

**Preview Mobile:**
```
┌─────────────────────────┐
│ 🎯 Laptop HP Pavilion   │ badge
│ ABC-123                 │
├─────────────────────────┤
│ Jumlah: 5 Unit          │
│ No. BAST: BAST/001/2026 │
│ Pengirim: Ahmad         │
│ Tanggal: 12 Sep 2026    │
├─────────────────────────┤
│ Catatan: Baik, siap     │
└─────────────────────────┘
```

### 2. **Wakapro - Penerimaan Barang** ✅
**File:** `src/app/wakapro/penerimaan/page.tsx`

**Perubahan:**
- ✅ Import `useIsMobile` + MobileCard components
- ✅ Import icons (Package, Truck, CheckCircle2, X, AlertTriangle)
- ✅ Conditional rendering untuk table/cards
- ✅ Action buttons: Terima (green) & Tolak (red) dengan icons
- ✅ Full-width buttons di mobile dengan `flex-1`
- ✅ Badge kondisi dengan icon
- ✅ Catatan pengiriman dengan divider

**Preview Mobile:**
```
┌─────────────────────────┐
│ 🎯 Printer Epson L3110  │ ✅ Baik
│ PRN-001                 │
├─────────────────────────┤
│ Surat Jalan: SJ/001/26  │
│ Jumlah: 2 Unit          │
│ Pengirim: Budi          │
├─────────────────────────┤
│ [✓ Terima] [✗ Tolak]    │
└─────────────────────────┘
```

---

## 📋 Template untuk Update Halaman Lain

### Step 1: Import Dependencies

```typescript
import { useIsMobile } from '@/hooks/useMediaQuery';
import { 
  MobileCard, 
  MobileCardHeader, 
  MobileCardRow, 
  MobileCardActions,
  MobileCardDivider 
} from '@/components/MobileCard';
// Import icons yang dibutuhkan
import { Package, Edit2, Trash2 } from 'lucide-react';
```

### Step 2: Add Hook in Component

```typescript
export default function MyPage() {
  const isMobile = useIsMobile();
  // ... existing code
```

### Step 3: Replace Table with Conditional Rendering

**BEFORE:**
```tsx
<div className="overflow-x-auto">
  <table>...</table>
</div>
```

**AFTER:**
```tsx
{isMobile ? (
  /* Mobile Card View */
  <div className="space-y-3">
    {items.map((item) => (
      <MobileCard key={item.id}>
        {/* Card content */}
      </MobileCard>
    ))}
  </div>
) : (
  /* Desktop Table View */
  <div className="overflow-x-auto">
    <table>...</table>
  </div>
)}
```

### Step 4: Build Mobile Card Content

```tsx
<MobileCard key={item.id}>
  {/* Header */}
  <MobileCardHeader
    title={item.nama_barang}
    subtitle={item.kode}
    badge={<YourBadge />}
    icon={<Package className="h-4 w-4 text-blue-600" />}
  />
  
  {/* Data Rows */}
  <div className="space-y-2">
    <MobileCardRow label="Field 1" value={item.field1} />
    <MobileCardRow label="Field 2" value={item.field2} />
    <MobileCardRow label="Field 3" value={item.field3} />
  </div>
  
  {/* Optional: Extra Info */}
  {item.keterangan && (
    <>
      <MobileCardDivider />
      <div className="text-xs text-slate-500 italic">
        {item.keterangan}
      </div>
    </>
  )}
  
  {/* Actions (if needed) */}
  <MobileCardActions>
    <button className="flex-1 bg-blue-600 text-white ...">
      <Edit2 className="h-3.5 w-3.5" />
      Edit
    </button>
    <button className="flex-1 bg-red-600 text-white ...">
      <Trash2 className="h-3.5 w-3.5" />
      Hapus
    </button>
  </MobileCardActions>
</MobileCard>
```

---

## 🎨 Design Guidelines

### Colors & Badges

**Status/Kondisi Badges:**
```tsx
// Baik
className="bg-emerald-50 text-emerald-700 border border-emerald-200"

// Rusak/Warning
className="bg-amber-50 text-amber-700 border border-amber-200"

// Error/Ditolak
className="bg-red-50 text-red-700 border border-red-200"

// Info/Pending
className="bg-blue-50 text-blue-700 border border-blue-200"
```

### Button Styles

**Primary Action (Mobile):**
```tsx
className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 
  bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
  active:scale-95 transition-all text-xs font-bold shadow-sm"
```

**Danger Action:**
```tsx
className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 
  bg-red-600 text-white rounded-lg hover:bg-red-700 
  active:scale-95 transition-all text-xs font-bold shadow-sm"
```

### Loading States

**Mobile Skeleton:**
```tsx
{loading && Array.from({ length: 3 }).map((_, i) => (
  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
    <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
    <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
    <div className="h-3 bg-slate-100 rounded w-2/3" />
  </div>
))}
```

### Empty States

```tsx
<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
  <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
  <p className="font-semibold text-slate-600 text-sm">Belum ada data</p>
  <p className="text-xs mt-1 text-slate-400">
    Data akan muncul setelah ditambahkan
  </p>
</div>
```

---

## 🚀 Prioritas Halaman Selanjutnya

### High Priority (Sering Digunakan)
- [ ] **Dashboard Users** - Tabel user dengan role & ruangan
- [ ] **Petugas - Distribusi** - Daftar distribusi yang dibuat
- [ ] **Dashboard - Distribusi** - Tracking distribusi semua workshop
- [ ] **Sarana Prasarana** - Inventaris utama (kompleks, butuh folder view juga)
- [ ] **Peminjaman** - Daftar peminjaman barang
- [ ] **Servis** - Maintenance tracking

### Medium Priority
- [ ] **Gedung** - Master gedung
- [ ] **Ruangan** - Master ruangan
- [ ] **Kategori** - Master kategori
- [ ] **Kondisi** - Master kondisi
- [ ] **Daftar Belanja** - Shopping list

### Low Priority
- [ ] **Laporan** - Report pages (biasanya untuk print/export)
- [ ] **History** - Audit log

---

## 📊 Best Practices

### 1. **Always Show Critical Info First**
Urutkan field dari paling penting ke kurang penting:
- Nama/Title
- ID/Kode
- Status/Kondisi
- Jumlah/Nilai
- Tanggal
- Keterangan

### 2. **Use Icons Sparingly**
Hanya gunakan icon untuk:
- Header (identifikasi jenis item)
- Status badges (visual quick scan)
- Action buttons (clarity)

### 3. **Touch-Friendly Targets**
- Minimum button height: `py-2` (32px)
- Minimum touch area: 44x44px (iOS guidelines)
- Gap between buttons: `gap-2` (8px minimum)

### 4. **Performance**
- Lazy load images jika ada foto
- Limit initial render ke 10-20 items
- Implement virtual scrolling untuk list panjang (future)

### 5. **Accessibility**
- Maintain semantic HTML structure
- Keep ARIA labels for screen readers
- Ensure color contrast ratio >= 4.5:1

---

## 🧪 Testing Checklist

Untuk setiap halaman yang diupdate:

- [ ] Mobile (< 768px): Card view muncul
- [ ] Tablet (768-1023px): Masih card view atau hybrid?
- [ ] Desktop (>= 1024px): Table view muncul
- [ ] Loading state: Skeleton sesuai layout
- [ ] Empty state: Message & icon sesuai
- [ ] Action buttons: Touch-friendly & tidak overlap
- [ ] Badge/status: Readable & tidak terpotong
- [ ] Long text: Truncate atau wrap dengan baik
- [ ] Images (if any): Responsive & not breaking layout

---

## 📝 Notes

### Known Issues
- ❌ None yet

### Future Improvements
- [ ] Add swipe gestures untuk delete/edit (mobile native feel)
- [ ] Implement pull-to-refresh
- [ ] Add bottom sheet untuk filter di mobile
- [ ] Virtual scrolling untuk list > 100 items

### Dependencies
- `lucide-react` - Icons
- `react` - Hooks (useState, useEffect, useCallback)
- Tailwind CSS 4 - Styling
- No external mobile UI library needed

---

## 🎓 Training Tips

**Untuk developer lain yang akan mengerjakan:**

1. Baca template di atas
2. Pilih 1 halaman sederhana dulu (e.g., master data)
3. Copy-paste template
4. Adjust field names sesuai data model
5. Test di browser dengan responsive mode
6. Commit dengan message: `feat: add mobile responsive to [page-name]`

**Estimasi waktu per halaman:**
- Simple table (< 5 columns): 15-30 menit
- Medium table (5-10 columns): 30-60 menit
- Complex table (> 10 columns + actions): 1-2 jam

---

## 📚 References

- [Tailwind Breakpoints](https://tailwindcss.com/docs/responsive-design)
- [iOS Touch Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
- [Material Design Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)

---

**Last Updated:** 12 September 2026  
**Updated By:** Kiro AI Assistant  
**Status:** 2/50+ pages completed (Wakapro Inventaris, Wakapro Penerimaan)
