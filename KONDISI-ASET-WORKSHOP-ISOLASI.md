# Kondisi Aset Workshop - Data Isolation

## Tanggal: 12 September 2026

---

## 🎯 Problem Statement

**Masalah:**
- Menu "Kondisi Aset" di sidebar wakapro mengarah ke `/dashboard/kondisi` (salah)
- Seharusnya mengarah ke `/wakapro/kondisi` 
- Backend API `asetRusak()` menampilkan **semua aset rusak** tanpa filter
- Wakapro bisa melihat kondisi aset rusak dari workshop lain (data leak!)

**User Story:**
> "Sebagai wakapro, saya ingin melihat daftar aset rusak **hanya di workshop saya sendiri**, agar saya bisa fokus maintenance aset yang saya kelola tanpa kebingungan dengan data workshop lain."

---

## ✅ Solusi yang Diimplementasi

### 1. Backend - Filter by Ruangan Wakapro

**File:** `backend/app/Http/Controllers/Api/KondisiController.php`

**Method:** `asetRusak()`

**Perubahan:**

#### A) Deteksi User Role & Ruangan ID
```php
$user = $request->user();
$isWakapro = $user && $user->role === 'wakapro';
$ruanganId = $isWakapro ? $user->ruangan_id : null;
```

#### B) Early Return jika Wakapro Belum Ada Ruangan
```php
if ($isWakapro && !$ruanganId) {
    return response()->json([
        'status' => 'success',
        'warning' => 'Anda belum ditentukan ruangan workshop. Silakan hubungi admin.',
        'summary' => [...empty stats...],
        'data' => [],
    ]);
}
```

#### C) Filter Aset Query by Ruangan
```php
// Sebelum: Ambil semua aset rusak
$asetQuery = \App\Models\Aset::with([...])
    ->whereHas('kondisi', ...);

// Sesudah: Filter untuk wakapro
if ($isWakapro && $ruanganId) {
    $asetQuery->where('id_ruangan', $ruanganId);
}
```

#### D) Skip Sarana Prasarana untuk Wakapro
```php
// Wakapro TIDAK manage sarana prasarana, skip saja
if (!$isWakapro && ($lokasiFilter === 'all' || $lokasiFilter === 'sarana_prasarana')) {
    // Fetch sarana prasarana rusak...
}
```

#### E) Summary Statistics Filtered
```php
if ($isWakapro && $ruanganId) {
    // Count hanya aset di ruangan workshop wakapro
    $allTotal = \App\Models\Aset::where('id_ruangan', $ruanganId)
        ->whereHas('kondisi', ...)->count();
    // dst...
} else {
    // Count semua aset untuk admin/petugas/wakasek
    $allTotal = \App\Models\Aset::whereHas('kondisi', ...)->count() 
              + \App\Models\SaranaPrasarana::where(...)->count();
}
```

---

### 2. Frontend - Handle Warning Message

**File:** `src/app/wakapro/kondisi/page.tsx`

**Perubahan di `fetchAsetRusak()`:**

```tsx
const res = await axios.get('/api/kondisis/aset-rusak', {...});

if (res.data?.status === 'success') {
    setRusakItems(res.data.data || []);
    setSummaryRusak(res.data.summary);
    
    // NEW: Show warning toast jika wakapro belum ada ruangan
    if (res.data.warning) {
        showToast(res.data.warning, 'warning');
    }
}
```

**Result:**
- Jika wakapro belum assign ruangan → Toast warning muncul
- Data kosong ditampilkan (tidak error)
- User tahu harus contact admin untuk assignment

---

### 3. Routing Already Correct

**File:** `src/components/Sidebar.tsx`

**Function:** `getHrefForRole()`

```tsx
if (role === 'wakapro') {
    if (href === '/dashboard/kondisi') return '/wakapro/kondisi'; // ✅ Sudah benar
    // ... other routes
}
```

**Status:** ✅ Routing sudah benar, tidak perlu diubah

**File:** `src/app/wakapro/kondisi/page.tsx`

**Status:** ✅ Halaman sudah exist

---

## 🔒 Data Isolation Guaranteed

### Before Fix:
```
Wakapro Workshop A login → Menu Kondisi
  ↓
Dashboard/Kondisi (wrong path)
  ↓
Backend returns ALL aset rusak (Workshop A + B + C + Sarana Prasarana)
  ↓
❌ Data leak! Workshop A bisa lihat kondisi Workshop B
```

### After Fix:
```
Wakapro Workshop A login → Menu Kondisi
  ↓
/wakapro/kondisi (correct path)
  ↓
Backend filters: WHERE id_ruangan = Workshop A's ruangan_id
  ↓
Returns ONLY aset rusak di Workshop A
  ↓
✅ Isolated! Workshop A tidak bisa lihat Workshop B
```

---

## 📊 Test Scenarios

### Scenario 1: Wakapro Dengan Ruangan (Normal Case)
**Given:** Wakapro login dengan `ruangan_id = 5` (Workshop Multimedia)

**When:** Klik menu "Kondisi Aset"

**Then:**
- ✅ Navigate ke `/wakapro/kondisi`
- ✅ API call: `GET /api/kondisis/aset-rusak`
- ✅ Backend filter: `WHERE id_ruangan = 5`
- ✅ Frontend tampilkan hanya aset rusak di Workshop Multimedia
- ✅ Summary stats hanya hitung Workshop Multimedia
- ✅ Tidak ada data dari workshop lain

**Data Shown:**
```
Total Rusak: 8 unit (hanya Workshop Multimedia)
- Rusak Ringan: 3
- Rusak Berat: 4
- Tidak Layak: 1

List:
1. Printer Epson L3110 - Rusak Ringan (Workshop Multimedia)
2. Laptop Asus X441 - Rusak Berat (Workshop Multimedia)
3. ...dst (semua di Workshop Multimedia)
```

---

### Scenario 2: Wakapro Tanpa Ruangan (Edge Case)
**Given:** Wakapro login dengan `ruangan_id = NULL` (belum di-assign)

**When:** Klik menu "Kondisi Aset"

**Then:**
- ✅ Navigate ke `/wakapro/kondisi`
- ✅ API call: `GET /api/kondisis/aset-rusak`
- ✅ Backend return: `warning` message + empty data
- ✅ Frontend show toast: ⚠️ "Anda belum ditentukan ruangan workshop. Silakan hubungi admin."
- ✅ Summary stats: semua 0
- ✅ Empty state ditampilkan

**Data Shown:**
```
⚠️ Toast: "Anda belum ditentukan ruangan workshop. Silakan hubungi admin."

Total Rusak: 0 unit
- Rusak Ringan: 0
- Rusak Berat: 0
- Tidak Layak: 0

[Empty state illustration]
Belum ada data aset rusak
```

---

### Scenario 3: Admin/Wakasek Akses Kondisi (Different Behavior)
**Given:** Super Admin atau Wakasek login

**When:** Klik menu "Kondisi Aset"

**Then:**
- ✅ Navigate ke `/dashboard/kondisi` (admin path)
- ✅ API call: `GET /api/kondisis/aset-rusak`
- ✅ Backend return: **SEMUA aset rusak** (tidak ada filter)
- ✅ Includes: Aset Gedung + All Workshop + Sarana Prasarana
- ✅ Summary stats: total dari semua sumber

**Data Shown:**
```
Total Rusak: 45 unit (dari SEMUA lokasi)
- Rusak Ringan: 15
- Rusak Berat: 25
- Tidak Layak: 5

List:
1. Printer Epson - Workshop A
2. Laptop Asus - Workshop B
3. Kursi Kayu - Gedung A Lt 2
4. Meja Guru - Sarana Prasarana
5. ...dst (dari semua sumber)
```

---

## 🔐 Security Benefits

### 1. **Data Isolation**
- Wakapro A **tidak bisa** lihat kondisi Workshop B
- Prevents information leakage antar workshop
- Each wakapro hanya fokus ke aset mereka

### 2. **Role-Based Filtering**
- Filter dilakukan di **backend** (secure)
- Frontend tidak bisa bypass (tidak ada client-side only filter)
- User role di-validate dari JWT token

### 3. **Early Warning System**
- Wakapro tanpa ruangan langsung dapat warning
- Mencegah confusion ("Kok data kosong?")
- Clear action item (hubungi admin)

---

## 📋 Checklist Testing

### Backend Testing
- [ ] Wakapro dengan ruangan → return filtered aset
- [ ] Wakapro tanpa ruangan → return empty + warning
- [ ] Admin → return ALL aset rusak
- [ ] Wakasek → return ALL aset rusak
- [ ] Petugas → return ALL aset rusak
- [ ] Filter kondisi works (Rusak Ringan, Berat, Tidak Layak)
- [ ] Search query works (nama barang, kode, lokasi)

### Frontend Testing
- [ ] Menu "Kondisi Aset" navigate ke `/wakapro/kondisi`
- [ ] Toast warning muncul jika ruangan NULL
- [ ] Summary cards show correct numbers
- [ ] Table hanya tampilkan aset workshop sendiri
- [ ] Filter kondisi works
- [ ] Search works
- [ ] Empty state friendly jika data kosong
- [ ] Loading state smooth

### Cross-Workshop Testing
- [ ] Login sebagai Wakapro Workshop A
- [ ] Cek kondisi → hanya lihat Workshop A
- [ ] Logout
- [ ] Login sebagai Wakapro Workshop B
- [ ] Cek kondisi → hanya lihat Workshop B
- [ ] ✅ Confirm: Workshop A & B data **TIDAK overlap**

---

## 🎯 Expected Behavior Summary

| User Role | Path | Data Scope | Includes Sarana Prasarana? |
|-----------|------|------------|---------------------------|
| **Wakapro (with ruangan)** | `/wakapro/kondisi` | Workshop sendiri saja | ❌ No |
| **Wakapro (no ruangan)** | `/wakapro/kondisi` | Empty (0 items) | ❌ No |
| **Super Admin** | `/dashboard/kondisi` | Semua lokasi | ✅ Yes |
| **Petugas Input** | `/petugas-input/kondisi` | Semua lokasi | ✅ Yes |
| **Wakasek Sarpras** | `/wakasek/kondisi` | Semua lokasi | ✅ Yes |

---

## 💡 Implementation Notes

### Why Filter at Backend?
✅ **Security**: Client-side filter bisa di-bypass  
✅ **Performance**: Database filter lebih cepat  
✅ **Consistency**: Single source of truth  
✅ **Scalability**: Tidak kirim data unnecessary ke frontend  

### Why Skip Sarana Prasarana for Wakapro?
✅ **Scope**: Wakapro hanya manage aset workshop  
✅ **Clarity**: Sarana Prasarana = scope admin/petugas  
✅ **Simplicity**: Tidak bingung dengan data di luar tanggung jawab  

### Why Return Empty Instead of 403?
✅ **UX**: 403 error terlihat seperti "akses ditolak"  
✅ **Friendly**: Empty + warning lebih informatif  
✅ **Actionable**: User tahu harus contact admin  

---

## 🚀 Deployment Checklist

**Before Deploy:**
- [ ] Backend code tested locally
- [ ] Frontend code tested locally
- [ ] Database has sample data for testing
- [ ] Multiple wakapro users created with different ruangan

**Deploy Steps:**
1. Push backend changes (`KondisiController.php`)
2. Push frontend changes (`wakapro/kondisi/page.tsx`)
3. Test di staging dengan 2-3 wakapro berbeda
4. Verify data isolation works
5. Deploy to production

**After Deploy:**
- [ ] Monitor for errors di production logs
- [ ] Collect user feedback (apakah wakapro paham?)
- [ ] Document in user manual

---

## 📚 Related Documentation

- `CHANGELOG-WORKSHOP-ISOLASI.md` - Distribusi & Penerimaan isolation
- `MOBILE-RESPONSIVE-GUIDE.md` - Mobile responsiveness
- `NOTIFICATION-SYSTEM-GUIDE.md` - Toast notifications

---

## 🎓 Lessons Learned

**Problem:** Data isolation tidak konsisten across features

**Root Cause:** 
- Distribusi sudah filter by `ruangan_id` ✅
- Inventaris sudah filter by `ruangan_id` ✅  
- **Kondisi belum filter** ❌ ← Just fixed!

**Best Practice:**
- Selalu filter data di backend based on user role
- Return meaningful warning messages (bukan hard error)
- Test with multiple users dari workshop berbeda

---

**Status:** ✅ Complete  
**Tested:** ⏳ Pending (need manual testing)  
**Deployed:** ⏳ Not yet  
**Last Updated:** 12 September 2026, 17:30 WIB
