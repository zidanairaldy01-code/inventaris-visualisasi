# 🔔 Modern Notification System - User Guide

## Overview

Sistem notifikasi modern yang menggantikan `alert()`, `confirm()`, dan toast notifications bawaan dengan design yang clean, tidak berlebihan, dan user-friendly.

---

## 🎨 Components Available

### 1. **Toast Notification** 
Quick feedback untuk actions (auto-dismiss dalam 4 detik)
- ✅ Success (green)
- ❌ Error (red)  
- ⚠️ Warning (amber)
- ℹ️ Info (blue)

### 2. **Alert Dialog**
Modal untuk menampilkan pesan penting (replace `alert()`)

### 3. **Confirm Dialog**
Modal untuk konfirmasi actions (replace `confirm()`)

---

## 📦 Installation & Setup

**Files Created:**
```
src/
├── components/
│   ├── Toast.tsx           ← Toast notification
│   ├── AlertDialog.tsx     ← Alert modal
│   └── ConfirmDialog.tsx   ← Confirm modal
├── hooks/
│   └── useNotification.tsx ← Custom hook
└── app/
    └── globals.css         ← Animations added
```

**No additional dependencies needed!** Semua menggunakan:
- React hooks
- Lucide icons (sudah installed)
- Tailwind CSS (sudah configured)

---

## 🚀 Quick Start

### Step 1: Import Hook

```tsx
import { useNotification } from '@/hooks/useNotification';
```

### Step 2: Initialize in Component

```tsx
function MyPage() {
  const notify = useNotification();

  // Your component logic...

  return (
    <>
      {/* IMPORTANT: Render notification components */}
      {notify.NotificationComponents}
      
      {/* Your page content */}
      <div>Your content here</div>
    </>
  );
}
```

### Step 3: Use Notifications

```tsx
// Success toast
notify.success('Data berhasil disimpan!');

// Error toast
notify.error('Gagal menyimpan data.');

// Warning toast
notify.warning('Perhatian! Stok hampir habis.');

// Info toast
notify.info('Proses sedang berjalan...');

// Alert dialog
notify.showAlert(
  'Berhasil',
  'Data Anda telah tersimpan dengan aman.',
  'success'
);

// Confirm dialog
notify.showConfirm(
  'Hapus Data?',
  'Data yang sudah dihapus tidak dapat dikembalikan.',
  () => {
    // Action jika user klik "Ya"
    deleteData();
  },
  'danger',
  'Ya, Hapus',
  'Batal'
);
```

---

## 📖 Detailed API Reference

### Toast Methods

#### `notify.success(message)`
Tampilkan toast sukses (green)

```tsx
notify.success('✓ Berhasil menambahkan barang');
```

#### `notify.error(message)`
Tampilkan toast error (red)

```tsx
notify.error('✗ Gagal mengambil data dari server');
```

#### `notify.warning(message)`
Tampilkan toast warning (amber)

```tsx
notify.warning('⚠ Stok barang tersisa 5 unit');
```

#### `notify.info(message)`
Tampilkan toast info (blue)

```tsx
notify.info('ℹ File sedang diproses, harap tunggu...');
```

#### `notify.showToast(message, type)`
Generic method dengan custom type

```tsx
notify.showToast('Custom message', 'success');
```

---

### Alert Dialog Method

#### `notify.showAlert(title, message, type?, buttonText?)`

**Parameters:**
- `title` (required): Judul dialog
- `message` (required): Isi pesan
- `type` (optional): `'success' | 'error' | 'warning' | 'info'` (default: `'info'`)
- `buttonText` (optional): Text button (default: `'Mengerti'`)

**Examples:**

```tsx
// Success alert
notify.showAlert(
  'Berhasil!',
  'Data barang berhasil ditambahkan ke inventaris.',
  'success',
  'OK'
);

// Error alert
notify.showAlert(
  'Kesalahan',
  'Token Anda telah expired. Silakan login kembali.',
  'error',
  'Login Ulang'
);

// Warning alert
notify.showAlert(
  'Peringatan',
  'Anda akan logout dari sistem dalam 5 menit karena tidak aktif.',
  'warning',
  'Mengerti'
);

// Info alert
notify.showAlert(
  'Informasi Penting',
  'Sistem akan maintenance pada Sabtu, 20 Sep 2026 pukul 22:00 WIB.',
  'info',
  'OK, Saya Mengerti'
);
```

---

### Confirm Dialog Method

#### `notify.showConfirm(title, message, onConfirm, type?, confirmText?, cancelText?)`

**Parameters:**
- `title` (required): Judul dialog
- `message` (required): Isi pesan
- `onConfirm` (required): Function yang dijalankan jika user klik confirm
- `type` (optional): `'danger' | 'warning' | 'info' | 'success'` (default: `'warning'`)
- `confirmText` (optional): Text button confirm (default: `'Ya, Lanjutkan'`)
- `cancelText` (optional): Text button cancel (default: `'Batal'`)

**Examples:**

```tsx
// Danger confirm (hapus data)
notify.showConfirm(
  'Hapus Barang?',
  'Barang yang sudah dihapus tidak dapat dikembalikan. Apakah Anda yakin?',
  () => {
    // Delete logic
    axios.delete(`/api/asets/${id}`)
      .then(() => notify.success('Barang berhasil dihapus'))
      .catch(() => notify.error('Gagal menghapus barang'));
  },
  'danger',
  'Ya, Hapus Sekarang',
  'Batal'
);

// Warning confirm (action berisiko)
notify.showConfirm(
  'Reset Data?',
  'Semua data akan kembali ke pengaturan awal. Proses ini membutuhkan waktu beberapa menit.',
  () => {
    resetDatabase();
  },
  'warning',
  'Ya, Reset',
  'Tidak Jadi'
);

// Info confirm (action normal)
notify.showConfirm(
  'Kirim Laporan?',
  'Laporan akan dikirim ke email wakasek dan tidak dapat dibatalkan setelah dikirim.',
  () => {
    sendReport();
  },
  'info',
  'Ya, Kirim',
  'Tinjau Lagi'
);

// Success confirm (action positif)
notify.showConfirm(
  'Publikasikan?',
  'Data akan terlihat oleh semua user setelah dipublikasikan.',
  () => {
    publishData();
  },
  'success',
  'Publikasikan Sekarang',
  'Simpan sebagai Draft'
);
```

---

## 🎯 Complete Example: CRUD Page

```tsx
'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { useNotification } from '@/hooks/useNotification';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Item {
  id: number;
  nama: string;
  jumlah: number;
}

export default function CRUDPage() {
  const notify = useNotification();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/items');
      setItems(res.data);
      notify.info('Data berhasil dimuat');
    } catch (err) {
      notify.error('Gagal memuat data. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Create
  const handleAdd = async (data: Omit<Item, 'id'>) => {
    try {
      await axios.post('/api/items', data);
      notify.success('✓ Item berhasil ditambahkan');
      fetchItems();
    } catch (err) {
      notify.error('✗ Gagal menambahkan item');
    }
  };

  // Update
  const handleEdit = async (id: number, data: Partial<Item>) => {
    try {
      await axios.put(`/api/items/${id}`, data);
      notify.success('✓ Item berhasil diperbarui');
      fetchItems();
    } catch (err) {
      notify.error('✗ Gagal memperbarui item');
    }
  };

  // Delete dengan konfirmasi
  const handleDelete = (item: Item) => {
    notify.showConfirm(
      'Hapus Item?',
      `Apakah Anda yakin ingin menghapus "${item.nama}"? Tindakan ini tidak dapat dibatalkan.`,
      async () => {
        try {
          await axios.delete(`/api/items/${item.id}`);
          notify.success('✓ Item berhasil dihapus');
          fetchItems();
        } catch (err) {
          notify.error('✗ Gagal menghapus item');
        }
      },
      'danger',
      'Ya, Hapus',
      'Batal'
    );
  };

  // Info alert
  const showInfo = () => {
    notify.showAlert(
      'Tentang Halaman Ini',
      'Halaman ini digunakan untuk mengelola data inventaris barang. Anda dapat menambah, mengubah, dan menghapus item.',
      'info',
      'Mengerti'
    );
  };

  return (
    <>
      {/* WAJIB: Render notification components */}
      {notify.NotificationComponents}

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Kelola Items</h1>
          <div className="flex gap-2">
            <button
              onClick={showInfo}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg"
            >
              Info
            </button>
            <button
              onClick={() => handleAdd({ nama: 'New Item', jumlah: 0 })}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Tambah Item
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-white rounded-lg border">
                <div>
                  <h3 className="font-bold">{item.nama}</h3>
                  <p className="text-sm text-gray-600">Jumlah: {item.jumlah}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item.id, { jumlah: item.jumlah + 1 })}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

---

## 🎨 Design Guidelines

### Colors & Icons

| Type | Color | Icon | Use Case |
|------|-------|------|----------|
| **Success** | Green (emerald) | ✓ CheckCircle | Data saved, action completed |
| **Error** | Red | ✗ XCircle | Failed requests, validation errors |
| **Warning** | Amber/Yellow | ⚠ AlertTriangle | Cautionary messages, low stock |
| **Info** | Blue | ℹ Info | General information, tips |

### Tone of Voice

**DO** ✅
- "Data berhasil disimpan"
- "Gagal mengambil data dari server"
- "Apakah Anda yakin ingin menghapus?"
- "Stok tersisa 5 unit"

**DON'T** ❌
- "Yay! Data kamu udah tersimpan nih! 🎉🎊"  ← Terlalu casual
- "OOPS! Something went wrong! 😱😭"  ← Terlalu dramatis
- "Are you absolutely positively sure?"  ← Terlalu panjang
- "Stock low warning alert notification"  ← Terlalu teknis

### Duration

- **Toast**: 4 seconds (auto-dismiss dengan progress bar)
- **Alert**: Manual dismiss (user harus klik button)
- **Confirm**: Manual dismiss (user harus pilih option)

---

## 🔄 Migration dari alert() & confirm()

### Before (Native alerts)

```tsx
// Old way - Windows native alert
if (confirm('Hapus data ini?')) {
  deleteData();
  alert('Data berhasil dihapus!');
} else {
  alert('Penghapusan dibatalkan');
}
```

### After (Modern notifications)

```tsx
// New way - Modern UI
notify.showConfirm(
  'Hapus Data?',
  'Data yang sudah dihapus tidak dapat dikembalikan.',
  () => {
    deleteData();
    notify.success('Data berhasil dihapus');
  },
  'danger',
  'Ya, Hapus',
  'Batal'
);
```

---

## 📱 Mobile Responsive

Semua notification components sudah **fully responsive**:
- Toast muncul di top-right (desktop) & top-center (mobile)
- Dialog auto-adjust width untuk mobile
- Touch-friendly buttons (min 44px height)
- Smooth animations untuk mobile

---

## ⚡ Performance Tips

1. **Don't create multiple notification hooks**
   ```tsx
   // ❌ BAD - Creates multiple instances
   function Component() {
     const notify1 = useNotification();
     const notify2 = useNotification();
     // ...
   }
   
   // ✅ GOOD - Single instance per component
   function Component() {
     const notify = useNotification();
     // ...
   }
   ```

2. **Avoid notification spam**
   ```tsx
   // ❌ BAD - Too many notifications
   items.forEach(item => {
     notify.success(`Saved ${item.name}`);
   });
   
   // ✅ GOOD - Single summary
   notify.success(`✓ Saved ${items.length} items`);
   ```

3. **Use appropriate type**
   ```tsx
   // ❌ BAD - Wrong type
   notify.error('Data saved successfully'); // Confusing!
   
   // ✅ GOOD - Correct type
   notify.success('Data saved successfully');
   ```

---

## 🐛 Troubleshooting

**Problem:** Toast tidak muncul  
**Solution:** Pastikan `{notify.NotificationComponents}` di-render di component

**Problem:** Dialog tidak close ketika klik backdrop  
**Solution:** Ini by design untuk prevent accidental close. User harus klik button.

**Problem:** Multiple toasts overlap  
**Solution:** Normal behavior. Toast terbaru akan muncul dan dismiss otomatis.

**Problem:** Animation patah-patah  
**Solution:** Pastikan globals.css sudah include animation keyframes.

---

## 📚 Best Practices

1. **Be concise**: Message maksimal 2 baris
2. **Be specific**: "Gagal menyimpan" → "Gagal menyimpan karena koneksi terputus"
3. **Be consistent**: Gunakan format yang sama di seluruh app
4. **Be helpful**: Berikan action hint jika mungkin
5. **Be appropriate**: Gunakan type yang sesuai dengan context

---

## 🎓 Examples by Use Case

### Form Validation
```tsx
if (!formData.nama) {
  notify.warning('⚠ Nama barang wajib diisi');
  return;
}
```

### API Success
```tsx
await axios.post('/api/items', data);
notify.success('✓ Barang berhasil ditambahkan');
```

### API Error
```tsx
try {
  await axios.get('/api/items');
} catch (err) {
  notify.error('✗ Gagal memuat data. Coba lagi.');
}
```

### Async Process
```tsx
notify.info('ℹ Sedang memproses Excel file...');
await processExcel(file);
notify.success('✓ File berhasil diimport');
```

### Critical Action
```tsx
notify.showConfirm(
  'Reset Database?',
  'PERINGATAN: Semua data akan dihapus permanent!',
  () => resetDB(),
  'danger',
  'Ya, Saya Yakin',
  'Batalkan'
);
```

---

**Created:** 12 September 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
