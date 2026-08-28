'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Package, AlertTriangle, CheckCircle2, Search, RefreshCw,
  FileSpreadsheet, Plus, Upload, DollarSign, Layers, TrendingUp,
  Camera, Edit2, Trash2, X, Loader2, Download, ChevronLeft, ChevronRight,
  Folder, FolderOpen, ArrowLeft, Grid, List as ListIcon, FolderPlus, MoreVertical, Save
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Toast from '@/components/Toast';
import AsetFotoModal from '@/components/AsetFotoModal';

/* ─────────────────────── Types ─────────────────────── */
interface MasterItem {
  id: number;
  nama_kategori?: string;
  nama_ruangan?: string;
  nama_kondisi?: string;
}

interface CustomFolder {
  id: number;
  nama_folder: string;
  keterangan?: string;
  warna?: string;
  items_count?: number;
  created_at?: string;
}

interface SaranaPrasaranaItem {
  id: number;
  tanggal_pengambilan: string | null;
  kode: string | null;
  nama_barang: string;
  satuan: string;
  stok_awal: number;
  stok_masuk: number;
  stok_keluar: number;
  stok_akhir: number;
  nilai_harga_pembelian: number;
  nilai_harga_sekarang: number;
  keterangan: string | null;
  id_user: number | null;
  id_folder: number | null;
  user?: { id: number; name: string };
  created_at?: string;
  updated_at?: string;
}

interface FormData {
  tanggal_pengambilan: string;
  kode: string;
  nama_barang: string;
  satuan: string;
  stok_awal: string;
  stok_masuk: string;
  stok_keluar: string;
  nilai_harga_pembelian: string;
  nilai_harga_sekarang: string;
  keterangan: string;
}

interface PreviewRow {
  no: number;
  jenis_kekayaan: string;
  luas_jumlah: string;
  nilai_harga_pembelian: number;
  nilai_harga_sekarang: number;
  keterangan: string;
  satuan: string;
}

/* ─────────────────────── Helpers ─────────────────────── */
const kondisiStyle = (k?: string) => {
  if (!k) return 'bg-slate-100 text-slate-600';
  const l = k.toLowerCase();
  if (l.includes('baik')) return 'bg-emerald-100 text-emerald-700';
  if (l.includes('ringan')) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const formatRupiahShort = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} Rb`;
  return `Rp ${n}`;
};

const emptyForm = (): FormData => ({
  tanggal_pengambilan: '',
  kode: '',
  nama_barang: '',
  satuan: 'Unit',
  stok_awal: '0',
  stok_masuk: '0',
  stok_keluar: '0',
  nilai_harga_pembelian: '0',
  nilai_harga_sekarang: '0',
  keterangan: '',
});

const parseAngka = (val: unknown): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);

  const s = String(val).trim();
  if (!s) return 0;

  const cleaned = s.replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;

  if (/^\d{1,3}([.,]\d{3})+$/.test(cleaned)) {
    return parseInt(cleaned.replace(/[.,]/g, ''), 10) || 0;
  }

  const dots = (cleaned.match(/\./g) || []).length;
  const commas = (cleaned.match(/,/g) || []).length;

  if (dots > 0 && commas > 0) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastDot > lastComma) {
      return Math.round(parseFloat(cleaned.replace(/,/g, ''))) || 0;
    } else {
      return Math.round(parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))) || 0;
    }
  }

  if (dots > 0) {
    const lastDot = cleaned.lastIndexOf('.');
    const afterDot = cleaned.substring(lastDot + 1);
    if (dots > 1 || afterDot.length === 3) {
      return parseInt(cleaned.replace(/\./g, ''), 10) || 0;
    }
    return Math.round(parseFloat(cleaned)) || 0;
  }

  if (commas > 0) {
    const lastComma = cleaned.lastIndexOf(',');
    const afterComma = cleaned.substring(lastComma + 1);
    if (commas > 1 || afterComma.length === 3) {
      return parseInt(cleaned.replace(/,/g, ''), 10) || 0;
    }
    return Math.round(parseFloat(cleaned.replace(',', '.'))) || 0;
  }

  return parseInt(cleaned, 10) || 0;
};

// Excel Parser
function parseKekayaanExcel(file: File): Promise<PreviewRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result as ArrayBuffer, { type: 'array', raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

        if (!rows || rows.length === 0) {
          throw new Error('File Excel kosong atau tidak dapat dibaca.');
        }

        let headerIdx = -1;
        let maxScore = -1;

        const keywords = ['jenis', 'kekayaan', 'luas', 'jumlah', 'pembelian', 'sekarang', 'ket', 'barang', 'uraian', 'nama'];

        for (let i = 0; i < Math.min(rows.length, 12); i++) {
          if (!rows[i]) continue;
          const rowNorm = rows[i].map(c => String(c ?? '').toLowerCase().trim());
          const rowText = rowNorm.join(' ');

          let score = 0;
          keywords.forEach(kw => {
            if (rowText.includes(kw)) score++;
          });

          const filledCells = rowNorm.filter(c => c !== '').length;
          if (score > maxScore && filledCells >= 2) {
            maxScore = score;
            headerIdx = i;
          }
        }

        if (headerIdx === -1 || maxScore === 0) headerIdx = 0;

        const headers: string[] = (rows[headerIdx] || []).map(c => String(c ?? '').trim().toLowerCase());

        const findCol = (...kwList: string[]) =>
          headers.findIndex(h => kwList.some(kw => h.includes(kw)));

        let colNo       = findCol('no');
        let colJenis    = findCol('jenis', 'kekayaan', 'nama', 'uraian', 'barang', 'item');
        let colLuas     = findCol('luas', 'jumlah', 'vol', 'banyak', 'qty');
        let colBeli     = findCol('pembelian', 'perolehan', 'harga beli', 'nilai beli', 'harga perolehan');
        let colSekarang = findCol('sekarang', 'saat ini', 'harga sekarang', 'nilai sekarang');
        let colKet      = findCol('ket', 'keterangan', 'catatan', 'kondisi', 'lokasi');

        const totalCols = (rows[headerIdx] || []).length;
        if (colJenis === -1 && totalCols >= 2) colJenis = 1;
        if (colNo === -1 && totalCols >= 1) colNo = 0;
        if (colLuas === -1 && totalCols >= 3) colLuas = 2;
        if (colBeli === -1 && totalCols >= 4) colBeli = 3;
        if (colSekarang === -1 && totalCols >= 5) colSekarang = 4;
        if (colKet === -1 && totalCols >= 6) colKet = 5;

        const result: PreviewRow[] = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(c => c === null || String(c ?? '').trim() === '')) continue;

          let jenis = colJenis >= 0 ? String(row[colJenis] ?? '').trim() : '';

          if (!jenis) {
            for (let c = 0; c < row.length; c++) {
              const val = String(row[c] ?? '').trim();
              if (val && isNaN(Number(val)) && val.length > 2 && !val.toLowerCase().includes('total')) {
                jenis = val;
                break;
              }
            }
          }

          if (!jenis || jenis.toLowerCase().startsWith('total') || jenis.toLowerCase().startsWith('jumlah total')) {
            continue;
          }

          const noVal     = colNo >= 0 ? String(row[colNo] ?? '').trim() : String(result.length + 1);
          const jumlahRaw = colLuas >= 0 ? String(row[colLuas] ?? '').trim() : '1';
          const beli      = colBeli >= 0 ? parseAngka(row[colBeli]) : 0;
          const skrg      = colSekarang >= 0 ? parseAngka(row[colSekarang]) : 0;
          const ket       = colKet >= 0 ? String(row[colKet] ?? '').trim() : '';

          result.push({
            no: parseInt(noVal) || (result.length + 1),
            jenis_kekayaan: jenis,
            luas_jumlah: jumlahRaw || '1',
            nilai_harga_pembelian: beli,
            nilai_harga_sekarang: skrg,
            keterangan: ket,
            satuan: 'Unit',
          });
        }

        if (result.length === 0) {
          throw new Error('Tidak ada data valid ditemukan. Silakan periksa format tabel Excel atau download template format kekayaan yang tersedia.');
        }

        resolve(result);
      } catch (err: unknown) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file Excel.'));
    reader.readAsArrayBuffer(file);
  });
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all";

/* ─────────────────────── Halaman Utama ─────────────────────── */
export default function SaranaPrasaranaPage() {
  const [asets, setAsets] = useState<SaranaPrasaranaItem[]>([]);
  const [filtered, setFiltered] = useState<SaranaPrasaranaItem[]>([]);
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Folder navigation: null = Root (Folders Grid), number = Inside Folder ID, -1 = Loose items (Tanpa Folder)
  const [activeFolderId, setActiveFolderId] = useState<number | null | -1>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'all'>('folders');

  // Multi-select Checkbox Batch Delete
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [deletingBatch, setDeletingBatch] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // Folder Modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editFolderTarget, setEditFolderTarget] = useState<CustomFolder | null>(null);
  const [folderForm, setFolderForm] = useState({ nama_folder: '', keterangan: '', warna: 'blue' });
  const [savingFolder, setSavingFolder] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<CustomFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  // Foto modal
  const [selectedAset, setSelectedAset] = useState<SaranaPrasaranaItem | null>(null);

  // Edit/Add modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAset, setEditingAset] = useState<SaranaPrasaranaItem | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Single Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<SaranaPrasaranaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Master data
  const [kategoris, setKategoris] = useState<MasterItem[]>([]);
  const [ruangans, setRuangans] = useState<MasterItem[]>([]);
  const [kondisis, setKondisis] = useState<MasterItem[]>([]);

  // Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [editingPreviewIdx, setEditingPreviewIdx] = useState<number | null>(null);
  const [editingPreviewRow, setEditingPreviewRow] = useState<PreviewRow | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importState, setImportState] = useState<'idle' | 'importing' | 'completed'>('idle');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percent: 0, currentItemName: '' });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ show: true, message, type });
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchFolders();
    fetchAsets();
    // fetchMasterData tidak diperlukan — kategoris/ruangans/kondisis tidak digunakan di halaman ini
  }, []);

  const fetchFolders = async () => {
    try {
      const res = await axios.get('/api/folder-inventaris?jenis=sarana-prasarana');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setFolders(list);
    } catch { setFolders([]); }
  };

  const fetchAsets = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await axios.get('/api/sarana-prasaranas');
      const data: SaranaPrasaranaItem[] = res.data.data || res.data;
      setAsets(data);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchMasterData = async () => {
    // Tidak digunakan — data kategori/ruangan/kondisi tidak relevan untuk sarana & prasarana
  };

  // Filter items by search only (no folder support for sarana prasarana)
  useEffect(() => {
    let result = asets;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.nama_barang.toLowerCase().includes(q) ||
        (a.kode?.toLowerCase().includes(q) ?? false) ||
        (a.keterangan?.toLowerCase().includes(q) ?? false)
      );
    }

    setFiltered(result);
    setPage(1);
    setSelectedItemIds(new Set()); // Reset selections on filter change
  }, [search, asets]);

  /* ── Folder Handlers ── */
  const openAddFolder = () => {
    setEditFolderTarget(null);
    setFolderForm({ nama_folder: '', keterangan: '', warna: 'blue' });
    setShowFolderModal(true);
  };

  const openEditFolder = (f: CustomFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditFolderTarget(f);
    setFolderForm({ nama_folder: f.nama_folder, keterangan: f.keterangan || '', warna: f.warna || 'blue' });
    setShowFolderModal(true);
  };

  const handleSaveFolder = async () => {
    if (!folderForm.nama_folder.trim()) { showToast('Nama folder wajib diisi', 'error'); return; }
    try {
      setSavingFolder(true);
      const payload = { ...folderForm, jenis: 'sarana-prasarana' };
      if (editFolderTarget) {
        await axios.put(`/api/folder-inventaris/${editFolderTarget.id}`, payload);
        showToast(`Folder "${folderForm.nama_folder}" berhasil diperbarui`, 'success');
      } else {
        await axios.post('/api/folder-inventaris', payload);
        showToast(`Folder "${folderForm.nama_folder}" berhasil dibuat`, 'success');
      }
      setShowFolderModal(false);
      fetchFolders();
    } catch {
      showToast('Gagal menyimpan folder', 'error');
    } finally { setSavingFolder(false); }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      setDeletingFolder(true);
      await axios.delete(`/api/folder-inventaris/${deleteFolderTarget.id}`);
      showToast(`Folder "${deleteFolderTarget.nama_folder}" berhasil dihapus`, 'success');
      setDeleteFolderTarget(null);
      if (activeFolderId === deleteFolderTarget.id) setActiveFolderId(null);
      fetchFolders();
      fetchAsets(true);
    } catch {
      showToast('Gagal menghapus folder', 'error');
    } finally { setDeletingFolder(false); }
  };

  /* ── Batch Selection Handlers ── */
  const toggleSelectItem = (id: number) => {
    const next = new Set(selectedItemIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedItemIds(next);
  };

  const toggleSelectAll = () => {
    if (paged.length === 0) return;
    const allPagedIds = paged.map(a => a.id);
    const isAllSelected = allPagedIds.every(id => selectedItemIds.has(id));
    const next = new Set(selectedItemIds);
    if (isAllSelected) {
      allPagedIds.forEach(id => next.delete(id));
    } else {
      allPagedIds.forEach(id => next.add(id));
    }
    setSelectedItemIds(next);
  };

  const handleBatchDelete = async () => {
    if (selectedItemIds.size === 0) return;
    try {
      setDeletingBatch(true);
      const ids = Array.from(selectedItemIds);
      // Delete one by one since no batch delete endpoint exists for sarana-prasarana
      await Promise.all(ids.map(id => axios.delete(`/api/sarana-prasaranas/${id}`)));
      showToast(`Berhasil menghapus ${ids.length} data sarana & prasarana`, 'success');
      setSelectedItemIds(new Set());
      setIsSelectMode(false);
      setShowBatchDeleteConfirm(false);
      fetchAsets(true);
    } catch {
      showToast('Gagal menghapus data terpilih', 'error');
    } finally { setDeletingBatch(false); }
  };

  /* ── Item Single CRUD ── */
  const openAddModal = () => {
    setEditingAset(null);
    setFormData(emptyForm());
    setFormErrors({});
    setShowFormModal(true);
  };

  const openEditModal = (item: SaranaPrasaranaItem) => {
    setEditingAset(item);
    setFormData({
      tanggal_pengambilan:    item.tanggal_pengambilan || '',
      kode:                   item.kode || '',
      nama_barang:            item.nama_barang,
      satuan:                 item.satuan,
      stok_awal:              String(item.stok_awal),
      stok_masuk:             String(item.stok_masuk),
      stok_keluar:            String(item.stok_keluar),
      nilai_harga_pembelian:  String(item.nilai_harga_pembelian ?? 0),
      nilai_harga_sekarang:   String(item.nilai_harga_sekarang ?? 0),
      keterangan:             item.keterangan || '',
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);
    try {
      const payload = {
        tanggal_pengambilan:    formData.tanggal_pengambilan || null,
        kode:                   formData.kode || null,
        nama_barang:            formData.nama_barang,
        satuan:                 formData.satuan || 'Unit',
        stok_awal:              Number(formData.stok_awal) || 0,
        stok_masuk:             Number(formData.stok_masuk) || 0,
        stok_keluar:            Number(formData.stok_keluar) || 0,
        nilai_harga_pembelian:  Number(formData.nilai_harga_pembelian) || 0,
        nilai_harga_sekarang:   Number(formData.nilai_harga_sekarang) || 0,
        keterangan:             formData.keterangan || null,
      };

      if (editingAset) {
        await axios.put(`/api/sarana-prasaranas/${editingAset.id}`, payload);
        showToast(`Sarana & Prasarana "${formData.nama_barang}" berhasil diperbarui.`, 'success');
      } else {
        await axios.post('/api/sarana-prasaranas', payload);
        showToast(`Sarana & Prasarana "${formData.nama_barang}" berhasil ditambahkan.`, 'success');
      }
      setShowFormModal(false);
      fetchAsets(true);
      fetchFolders();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (e?.response?.data?.errors) {
        const errs: Record<string, string> = {};
        Object.entries(e.response.data.errors).forEach(([k, v]) => { errs[k] = v[0]; });
        setFormErrors(errs);
      } else {
        showToast(e?.response?.data?.message || 'Gagal menyimpan data.', 'error');
        setShowFormModal(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await axios.delete(`/api/sarana-prasaranas/${deleteTarget.id}`);
      showToast(`Data "${deleteTarget.nama_barang}" berhasil dihapus.`, 'success');
      setDeleteTarget(null);
      fetchAsets(true);
      fetchFolders();
    } catch {
      showToast('Gagal menghapus data.', 'error');
    } finally { setDeleting(false); }
  };

  const set = (k: keyof FormData, v: string) => setFormData(prev => ({ ...prev, [k]: v }));

  /* ── Import Excel ── */
  const openImport = () => {
    setParseError('');
    setImportFile(null);
    setPreviewRows([]);
    setSelectedRows(new Set());
    setShowPreview(false);
    setShowImportModal(true);
  };

  const handleFileSelect = async (file: File) => {
    setParseError('');
    setImportFile(file);
    try {
      const rows = await parseKekayaanExcel(file);
      setPreviewRows(rows);
      setSelectedRows(new Set(rows.map((_, i) => i)));
      setShowPreview(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file Excel';
      setParseError(msg);
      showToast(msg, 'error');
    }
  };

  const startEditPreview = (idx: number) => {
    setEditingPreviewIdx(idx);
    setEditingPreviewRow({ ...previewRows[idx] });
  };
  const cancelEditPreview = () => { setEditingPreviewIdx(null); setEditingPreviewRow(null); };
  const saveEditPreview = (idx: number) => {
    if (!editingPreviewRow) return;
    const updated = [...previewRows];
    updated[idx] = editingPreviewRow;
    setPreviewRows(updated);
    setEditingPreviewIdx(null);
    setEditingPreviewRow(null);
  };
  const deletePreviewRow = (idx: number) => {
    const updated = previewRows.filter((_, i) => i !== idx);
    setPreviewRows(updated);
    const newSel = new Set<number>();
    selectedRows.forEach(i => { if (i < idx) newSel.add(i); else if (i > idx) newSel.add(i - 1); });
    setSelectedRows(newSel);
  };
  const toggleRow = (idx: number) => {
    const s = new Set(selectedRows);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setSelectedRows(s);
  };
  const toggleAll = () => {
    setSelectedRows(selectedRows.size === previewRows.length ? new Set() : new Set(previewRows.map((_, i) => i)));
  };

  const handleImportSelected = async () => {
    if (selectedRows.size === 0) { showToast('Pilih minimal 1 data untuk diimport', 'warning'); return; }
    
    const rows = Array.from(selectedRows).map(i => previewRows[i]);
    const total = rows.length;

    setImporting(true);
    setImportState('importing');
    setImportProgress({ current: 0, total, percent: 10, currentItemName: 'Menyiapkan paket data...' });

    const payloadItems = rows.map(row => ({
      tanggal_pengambilan:    new Date().toISOString().split('T')[0],
      kode:                   null,
      nama_barang:            row.jenis_kekayaan,
      satuan:                 row.satuan || 'Unit',
      stok_awal:              parseInt(row.luas_jumlah) || 1,
      stok_masuk:             0,
      stok_keluar:            0,
      nilai_harga_pembelian:  row.nilai_harga_pembelian || 0,
      nilai_harga_sekarang:   row.nilai_harga_sekarang  || 0,
      keterangan:             row.keterangan || null,
    }));

    try {
      const CHUNK_SIZE = 150;
      let ok = 0;
      for (let c = 0; c < payloadItems.length; c += CHUNK_SIZE) {
        const chunk = payloadItems.slice(c, c + CHUNK_SIZE);
        const res = await axios.post('/api/sarana-prasaranas/batch-store', { items: chunk });
        ok += res.data.count || chunk.length;
        const processed = Math.min(c + CHUNK_SIZE, payloadItems.length);
        const percent = Math.round((processed / total) * 100);
        setImportProgress({
          current: processed,
          total,
          percent,
          currentItemName: `Tersimpan ${processed} dari ${total} data...`,
        });
      }

      setImportState('completed');

      setTimeout(() => {
        setImporting(false);
        setImportState('idle');
        showToast(`Berhasil import ${ok} data sarana prasarana`, 'success');
        closeImport();
        fetchAsets(true);
        fetchFolders();
      }, 800);
    } catch (err: unknown) {
      setImporting(false);
      setImportState('idle');
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message || 'Gagal meng-import data ke database.';
      showToast(msg, 'error');
    }
  };

  const closeImport = () => {
    setShowImportModal(false);
    setShowPreview(false);
    setImportFile(null);
    setPreviewRows([]);
    setSelectedRows(new Set());
    setParseError('');
    setEditingPreviewIdx(null);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['NO', 'JENIS KEKAYAAN', 'LUAS/JUMLAH', 'NILAI HARGA PEMBELIAN', 'NILAI HARGA SEKARANG', 'KET'],
      [1, 'Proyektor Epson EB-X400', '2 Unit', 5000000, 4000000, 'Kondisi baik'],
      [2, 'Meja Kerja Besi Minimalis', '10', 1200000, 1000000, ''],
      [3, 'Kursi Putar Kantor', '20', 800000, 650000, 'Beberapa ada goresan'],
    ]);
    ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 15 }, { wch: 26 }, { wch: 26 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Kekayaan');
    XLSX.writeFile(wb, 'Template_Sarana_Prasarana.xlsx');
    showToast('Template berhasil didownload', 'success');
  };

  const exportExcel = () => {
    if (!filtered.length) { showToast('Tidak ada data untuk diexport', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(filtered.map((a, i) => ({
      'NO': i + 1,
      'JENIS KEKAYAAN': a.nama_barang,
      'LUAS/JUMLAH': `${a.stok_akhir} ${a.satuan}`,
      'NILAI HARGA PEMBELIAN': a.nilai_harga_pembelian || 0,
      'NILAI HARGA SEKARANG': a.nilai_harga_sekarang || 0,
      'KET': a.keterangan || '',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sarana & Prasarana');
    XLSX.writeFile(wb, `Sarana_Prasarana_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast(`Export ${filtered.length} data berhasil`, 'success');
  };

  // Summary calculation
  const totalJenis = filtered.length;
  const totalLuasJumlah = filtered.reduce((s, a) => s + (Number(a.stok_akhir) || 0), 0);
  const totalNilaiPembelian = filtered.reduce((s, a) => s + (Number(a.nilai_harga_pembelian) || 0), 0);
  const totalNilaiSekarang = filtered.reduce((s, a) => s + (Number(a.nilai_harga_sekarang) || 0), 0);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Active folder object
  const folderList = Array.isArray(folders) ? folders : [];
  const activeFolderObj = folderList.find(f => f.id === activeFolderId);
  const activeFolderTitle = activeFolderId === null
    ? 'Semua Folder'
    : activeFolderId === -1
      ? 'Aset Tanpa Folder'
      : activeFolderObj?.nama_folder || 'Folder';

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-fadeInUp">
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, show: false }))} />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-12 translate-x-12" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl ring-1 ring-white/30">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Sarana &amp; Prasarana</h1>
              <p className="text-blue-100 text-sm mt-1">Manajemen aset sarana &amp; prasarana sekolah berbasis folder</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { fetchFolders(); fetchAsets(true); }} className="p-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={openAddFolder}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/15 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/25 text-sm font-semibold transition-all shadow-sm">
              <FolderPlus className="h-4 w-4" /> Buat Folder
            </button>
            <button
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) setSelectedItemIds(new Set());
              }}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md ${
                isSelectMode
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-white/15 backdrop-blur-md border border-white/30 text-white hover:bg-white/25'
              }`}
            >
              {isSelectMode ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4 text-rose-300" />}
              <span>{isSelectMode ? 'Batal Pilih' : 'Hapus Beberapa'}</span>
            </button>
            <button onClick={exportExcel} disabled={!filtered.length}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl hover:bg-white/20 text-sm font-semibold transition-colors disabled:opacity-40">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={openImport}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 rounded-xl text-sm font-bold transition-all shadow-md">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Import Excel
            </button>
            <button onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 rounded-xl text-sm font-bold transition-all shadow-md">
              <Plus className="h-4 w-4" /> Tambah Data
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-sm shadow-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-200 uppercase tracking-wider">Total Jenis Kekayaan</span>
            <div className="p-2 bg-white/10 rounded-xl"><Package className="h-4 w-4 text-white" /></div>
          </div>
          <p className="text-2xl font-bold mt-2">{totalJenis} <span className="text-sm font-normal text-blue-200">Jenis</span></p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Luas/Jumlah</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Layers className="h-4 w-4" /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{totalLuasJumlah.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Nilai Pembelian</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><DollarSign className="h-4 w-4" /></div>
          </div>
          <p className="text-xl font-bold text-blue-600 mt-2 truncate" title={formatRupiah(totalNilaiPembelian)}>{formatRupiahShort(totalNilaiPembelian)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Nilai Sekarang</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="h-4 w-4" /></div>
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-2 truncate" title={formatRupiah(totalNilaiSekarang)}>{formatRupiahShort(totalNilaiSekarang)}</p>
        </div>
      </div>

      {/* Navigation Breadcrumb & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Breadcrumb / Mode switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === 'folders' && activeFolderId !== null && (
            <button onClick={() => setActiveFolderId(null)}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold">
              <ArrowLeft className="h-4 w-4" /> Kembali ke Folder
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setViewMode('folders'); setActiveFolderId(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'folders' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <Grid className="h-3.5 w-3.5" /> Tampilan Folder
            </button>
            <button
              onClick={() => { setViewMode('all'); setActiveFolderId(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              <ListIcon className="h-3.5 w-3.5" /> Semua Items
            </button>
          </div>

          <span className="text-slate-300">|</span>
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-indigo-500" />
            {activeFolderTitle}
          </span>
        </div>

        {/* Search */}
        <div className="relative max-w-md w-full md:w-auto flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari jenis kekayaan..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* FLOATING ACTION BAR FOR BATCH DELETE */}
      {selectedItemIds.size > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl px-6 py-3.5 shadow-2xl flex items-center justify-between animate-fadeInUp sticky top-4 z-30">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold">
              {selectedItemIds.size}
            </span>
            <p className="text-sm font-semibold">Data sarana & prasarana terpilih</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedItemIds(new Set())} className="text-xs font-medium text-slate-400 hover:text-white transition-colors">
              Batal Pilih
            </button>
            <button onClick={() => setShowBatchDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md">
              <Trash2 className="h-3.5 w-3.5" /> Hapus Terpilih ({selectedItemIds.size})
            </button>
          </div>
        </div>
      )}

      {/* ════════ FOLDERS GRID (Tampil saat mode Folder & berada di Root) ════════ */}
      {viewMode === 'folders' && activeFolderId === null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Folder className="h-5 w-5 text-indigo-600" /> Daftar Folder Sarana &amp; Prasarana
            </h2>
            <button onClick={openAddFolder} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Buat Folder
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Folder Card Custom */}
            {folderList.map(f => {
              const itemCount = asets.filter(a => Number(a.id_folder) === f.id).length;
              return (
                <div key={f.id}
                  onClick={() => setActiveFolderId(f.id)}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group relative flex flex-col justify-between h-40">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                      <Folder className="h-7 w-7" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => openEditFolder(f, e)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors" title="Edit Folder">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(f); }} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors" title="Hapus Folder">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{f.nama_folder}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{f.keterangan || 'Tidak ada keterangan'}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                      <span className="font-semibold">{itemCount} items</span>
                      <span className="text-[10px] text-slate-400">Buka Folder →</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Default Loose Items Card */}
            <div
              onClick={() => setActiveFolderId(-1)}
              className="bg-slate-50 rounded-2xl p-5 border border-dashed border-slate-300 hover:border-indigo-400 transition-all cursor-pointer group flex flex-col justify-between h-40">
              <div className="flex items-start justify-between">
                <div className="p-3 rounded-2xl bg-slate-200 text-slate-600 group-hover:scale-110 transition-transform">
                  <Layers className="h-7 w-7" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">Aset Tanpa Folder</h3>
                <p className="text-xs text-slate-400 mt-0.5">Item di luar folder</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200 pt-2">
                  <span className="font-semibold">{asets.filter(a => !a.id_folder).length} items</span>
                  <span className="text-[10px] text-slate-400">Buka →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ MAIN TABLE DATA (Tampil jika di dalam folder / mode All) ════════ */}
      {(viewMode === 'all' || activeFolderId !== null) && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" /> {activeFolderTitle}
            </h2>
            <p className="text-xs text-slate-500">{filtered.length} item {search ? `(dari ${asets.length})` : ''}</p>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span>Memuat data sarana &amp; prasarana...</span>
              </div>
            ) : paged.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                {search ? 'Tidak ada data yang sesuai pencarian.' : 'Belum ada data sarana & prasarana di folder ini.'}
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    {isSelectMode && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={paged.length > 0 && paged.every(a => selectedItemIds.has(a.id))}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 w-10">No</th>
                    <th className="px-4 py-3">Jenis Kekayaan</th>
                    <th className="px-4 py-3 text-center">Luas/Jumlah</th>
                    <th className="px-4 py-3 text-right">Nilai Harga Pembelian</th>
                    <th className="px-4 py-3 text-right">Nilai Harga Sekarang</th>
                    <th className="px-4 py-3">Ket</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paged.map((aset, i) => {
                    const isSelected = selectedItemIds.has(aset.id);
                    return (
                      <tr key={aset.id} className={`transition-colors group ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'}`}>
                        {isSelectMode && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(aset.id)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-slate-400 text-xs">{(page - 1) * PER_PAGE + i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{aset.nama_barang}</div>
                          {aset.kode && <div className="text-xs font-mono text-slate-400 mt-0.5">{aset.kode}</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-slate-800">{aset.stok_akhir}</span>
                          <span className="text-xs text-slate-400 ml-1">{aset.satuan}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-slate-700">{formatRupiah(aset.nilai_harga_pembelian || 0)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-emerald-600">{formatRupiah(aset.nilai_harga_sekarang || 0)}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {aset.keterangan ? (
                            <div className="truncate max-w-[160px]" title={aset.keterangan}>{aset.keterangan}</div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(aset)} className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors" title="Edit">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteTarget(aset)} className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors" title="Hapus">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Halaman {page} dari {totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ FOLDER MODAL (Add/Edit) ════════ */}
      {showFolderModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-indigo-600" />
                {editFolderTarget ? 'Edit Folder' : 'Buat Folder Baru'}
              </h3>
              <button onClick={() => setShowFolderModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Folder *</label>
                <input
                  type="text" value={folderForm.nama_folder}
                  onChange={e => setFolderForm(f => ({ ...f, nama_folder: e.target.value }))}
                  placeholder="Contoh: Sarana Jurusan RPL"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan (Opsional)</label>
                <textarea
                  value={folderForm.keterangan}
                  onChange={e => setFolderForm(f => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Catatan tambahan untuk folder ini..."
                  rows={2} className={inputCls + ' resize-none'}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowFolderModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200">Batal</button>
                <button onClick={handleSaveFolder} disabled={savingFolder}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
                  {savingFolder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editFolderTarget ? 'Simpan Perubahan' : 'Buat Folder'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ DELETE FOLDER CONFIRM MODAL ════════ */}
      {deleteFolderTarget && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hapus Folder Ini?</h3>
            <p className="text-sm text-slate-600 mb-6 font-semibold">{deleteFolderTarget.nama_folder}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteFolderTarget(null)} disabled={deletingFolder}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors">Batal</button>
              <button onClick={handleDeleteFolder} disabled={deletingFolder}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {deletingFolder ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletingFolder ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ BATCH DELETE CONFIRM MODAL ════════ */}
      {showBatchDeleteConfirm && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-rose-100 rounded-full mb-4">
              <AlertTriangle className="h-7 w-7 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hapus {selectedItemIds.size} Data Terpilih?</h3>
            <p className="text-xs text-slate-500 mb-6">Data yang dihapus tidak dapat dikembalikan lagi.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowBatchDeleteConfirm(false)} disabled={deletingBatch}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors">Batal</button>
              <button onClick={handleBatchDelete} disabled={deletingBatch}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {deletingBatch ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletingBatch ? 'Menghapus...' : 'Ya, Hapus Semua'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Foto — tidak digunakan di sarana & prasarana */}

      {/* ════════ SINGLE DELETE CONFIRM MODAL ════════ */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hapus Data Ini?</h3>
            <p className="text-sm text-slate-600 mb-6 font-semibold">{deleteTarget.nama_barang}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors">Batal</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ IMPORT EXCEL MODAL ════════ */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className={`bg-white rounded-2xl w-full shadow-2xl transition-all duration-300 my-4 ${showPreview ? 'max-w-6xl' : 'max-w-lg'} max-h-[95vh] flex flex-col`}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                <span className="hidden sm:inline">
                  {showPreview
                    ? `Preview & Edit Data Kekayaan (${previewRows.length} baris)`
                    : `Import Excel ke ${activeFolderTitle}`}
                </span>
                <span className="sm:hidden">
                  {showPreview ? `Preview (${previewRows.length})` : 'Import Excel'}
                </span>
              </h2>
              <button onClick={closeImport} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" /></button>
            </div>

            <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1">
              {!showPreview ? (
                <div className="space-y-4">
                  {/* Format info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1.5">
                    <p className="font-bold text-blue-900 mb-2">📋 Format Excel yang Didukung:</p>
                    <div className="overflow-x-auto">
                      <table className="text-xs border border-blue-200 rounded-lg overflow-hidden w-full text-center">
                        <thead className="bg-blue-100 text-blue-800">
                          <tr>
                            {['NO', 'JENIS KEKAYAAN', 'LUAS/JUMLAH', 'NILAI HARGA PEMBELIAN', 'NILAI HARGA SEKARANG', 'KET'].map(h => (
                              <th key={h} className="px-2 py-1.5 border border-blue-200 font-bold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-blue-700">
                          <tr>
                            <td className="px-2 py-1 border border-blue-200">1</td>
                            <td className="px-2 py-1 border border-blue-200 text-left">Proyektor Epson</td>
                            <td className="px-2 py-1 border border-blue-200">2 Unit</td>
                            <td className="px-2 py-1 border border-blue-200">500.000</td>
                            <td className="px-2 py-1 border border-blue-200">400.000</td>
                            <td className="px-2 py-1 border border-blue-200">Baik</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {parseError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{parseError}</p>
                    </div>
                  )}

                  <label className="block w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all">
                    <Upload className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <span className="text-sm font-medium text-slate-600">
                      {importFile ? <span className="text-emerald-600">{importFile.name}</span> : 'Klik atau drag file Excel di sini'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">.xlsx, .xls, .csv — maks 5 MB</p>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                  </label>

                  <button onClick={downloadTemplate}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 font-medium transition-colors">
                    <Download className="h-4 w-4" /> Download Template Format Kekayaan
                  </button>
                  <button onClick={closeImport} className="w-full py-2.5 bg-slate-100 text-slate-700 text-sm rounded-xl hover:bg-slate-200 font-medium transition-colors">Batal</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 gap-2">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-emerald-900">{previewRows.length} data dari Excel</p>
                      <p className="text-[10px] sm:text-xs text-emerald-600">{selectedRows.size} dipilih untuk diimport ke {activeFolderTitle}</p>
                    </div>
                    <button onClick={toggleAll}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors font-medium whitespace-nowrap">
                      {selectedRows.size === previewRows.length ? 'Batal Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  {/* Mobile: Scroll hint */}
                  <div className="sm:hidden bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <p className="text-xs text-blue-700">Geser tabel ke kanan untuk melihat semua kolom →</p>
                  </div>

                  {/* Scrollable table container */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto max-h-[50vh] sm:max-h-[55vh]">
                      <table className="w-full text-xs min-w-[800px]">
                        <thead className="bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 w-10 sticky left-0 bg-slate-100 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                              <input type="checkbox" checked={selectedRows.size === previewRows.length && previewRows.length > 0} onChange={toggleAll} className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer" />
                            </th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600 sticky left-10 bg-slate-100 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">No</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600">Jenis Kekayaan</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600">Luas/Jumlah</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-right font-bold text-blue-700">Nilai Harga Pembelian</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-right font-bold text-emerald-700">Nilai Harga Sekarang</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600">Ket</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-center font-bold text-slate-600 sticky right-0 bg-slate-100 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {previewRows.map((row, idx) => {
                          const isEditing = editingPreviewIdx === idx;
                          const eRow = editingPreviewRow!;
                          return (
                            <tr key={idx} className={`transition-colors ${selectedRows.has(idx) ? 'bg-emerald-50/40' : 'hover:bg-slate-50'} ${isEditing ? 'bg-amber-50 ring-2 ring-inset ring-amber-400' : ''}`}>
                              <td className="px-2 sm:px-3 py-2 text-center sticky left-0 bg-white border-r border-slate-100">
                                <input type="checkbox" checked={selectedRows.has(idx)} onChange={() => toggleRow(idx)} className="w-3.5 h-3.5 rounded text-emerald-600 cursor-pointer" />
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-slate-500 font-medium sticky left-10 bg-white border-r border-slate-100">{row.no}</td>

                              {isEditing ? (
                                <>
                                  <td className="px-2 py-1"><input value={eRow.jenis_kekayaan} onChange={e => setEditingPreviewRow(r => r ? { ...r, jenis_kekayaan: e.target.value } : r)} className="w-40 sm:w-48 border border-amber-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1"><input value={eRow.luas_jumlah} onChange={e => setEditingPreviewRow(r => r ? { ...r, luas_jumlah: e.target.value } : r)} className="w-20 sm:w-24 border border-amber-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1"><input type="number" min="0" value={eRow.nilai_harga_pembelian} onChange={e => setEditingPreviewRow(r => r ? { ...r, nilai_harga_pembelian: +e.target.value } : r)} className="w-28 sm:w-32 border border-blue-300 rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50" /></td>
                                  <td className="px-2 py-1"><input type="number" min="0" value={eRow.nilai_harga_sekarang} onChange={e => setEditingPreviewRow(r => r ? { ...r, nilai_harga_sekarang: +e.target.value } : r)} className="w-28 sm:w-32 border border-emerald-300 rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-emerald-50" /></td>
                                  <td className="px-2 py-1"><input value={eRow.keterangan} onChange={e => setEditingPreviewRow(r => r ? { ...r, keterangan: e.target.value } : r)} className="w-32 sm:w-40 border border-amber-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1 sticky right-0 bg-amber-50 border-l border-slate-100">
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={() => saveEditPreview(idx)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600" title="Simpan"><Save className="h-3 w-3" /></button>
                                      <button onClick={cancelEditPreview} className="p-1 bg-slate-400 text-white rounded hover:bg-slate-500" title="Batal"><X className="h-3 w-3" /></button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-2 sm:px-3 py-2 font-medium text-slate-900 max-w-[180px] sm:max-w-[220px]">
                                    <div className="truncate">{row.jenis_kekayaan}</div>
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-slate-600">{row.luas_jumlah}</td>
                                  <td className="px-2 sm:px-3 py-2 text-right font-semibold text-blue-700">
                                    {row.nilai_harga_pembelian > 0 ? formatRupiah(row.nilai_harga_pembelian) : '-'}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-right font-semibold text-emerald-700">
                                    {row.nilai_harga_sekarang > 0 ? formatRupiah(row.nilai_harga_sekarang) : '-'}
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 text-slate-500 max-w-[120px] sm:max-w-[150px]">
                                    <div className="truncate">{row.keterangan || '-'}</div>
                                  </td>
                                  <td className="px-2 sm:px-3 py-2 sticky right-0 bg-white border-l border-slate-100">
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={() => startEditPreview(idx)} className="p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200" title="Edit baris"><Edit2 className="h-3 w-3" /></button>
                                      <button onClick={() => deletePreviewRow(idx)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Hapus baris"><Trash2 className="h-3 w-3" /></button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => { setShowPreview(false); setImportFile(null); setPreviewRows([]); setSelectedRows(new Set()); }}
                      disabled={importing}
                      className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm rounded-xl hover:bg-slate-200 disabled:opacity-50 font-medium transition-colors">
                      ← Kembali
                    </button>
                    <button onClick={handleImportSelected} disabled={selectedRows.size === 0 || importing}
                      className="flex-1 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                      {importing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4" /> Import {selectedRows.size} Data Kekayaan</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ FORM MODAL (Add/Edit Single Item) ════════ */}
      {showFormModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">
                {editingAset ? 'Edit Sarana & Prasarana' : 'Tambah Sarana & Prasarana Baru'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Kode Barang">
                  <input 
                    type="text" 
                    value={formData.kode} 
                    onChange={e => set('kode', e.target.value)} 
                    placeholder="Opsional" 
                    className={inputCls} 
                  />
                  {formErrors.kode && <p className="text-xs text-red-500 mt-1">{formErrors.kode}</p>}
                </FormField>

                <FormField label="Tanggal Pengambilan">
                  <input 
                    type="date" 
                    value={formData.tanggal_pengambilan} 
                    onChange={e => set('tanggal_pengambilan', e.target.value)} 
                    className={inputCls} 
                  />
                  {formErrors.tanggal_pengambilan && <p className="text-xs text-red-500 mt-1">{formErrors.tanggal_pengambilan}</p>}
                </FormField>

                <div className="sm:col-span-2">
                  <FormField label="Jenis Kekayaan" required>
                    <input 
                      type="text" 
                      value={formData.nama_barang} 
                      onChange={e => set('nama_barang', e.target.value)} 
                      required 
                      placeholder="Contoh: Proyektor Epson EB-X400" 
                      className={inputCls} 
                    />
                    {formErrors.nama_barang && <p className="text-xs text-red-500 mt-1">{formErrors.nama_barang}</p>}
                  </FormField>
                </div>

                <FormField label="Luas / Jumlah" required>
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.stok_awal} 
                    onChange={e => set('stok_awal', e.target.value)} 
                    required 
                    className={inputCls} 
                  />
                  {formErrors.stok_awal && <p className="text-xs text-red-500 mt-1">{formErrors.stok_awal}</p>}
                </FormField>

                <FormField label="Satuan" required>
                  <input 
                    type="text" 
                    value={formData.satuan} 
                    onChange={e => set('satuan', e.target.value)} 
                    required 
                    placeholder="Unit, Pcs, m²..." 
                    className={inputCls} 
                  />
                  {formErrors.satuan && <p className="text-xs text-red-500 mt-1">{formErrors.satuan}</p>}
                </FormField>

                <FormField label="Nilai Harga Pembelian">
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.nilai_harga_pembelian} 
                    onChange={e => set('nilai_harga_pembelian', e.target.value)} 
                    placeholder="0" 
                    className={inputCls} 
                  />
                  {formErrors.nilai_harga_pembelian && <p className="text-xs text-red-500 mt-1">{formErrors.nilai_harga_pembelian}</p>}
                </FormField>

                <FormField label="Nilai Harga Sekarang">
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.nilai_harga_sekarang} 
                    onChange={e => set('nilai_harga_sekarang', e.target.value)} 
                    placeholder="0" 
                    className={inputCls} 
                  />
                  {formErrors.nilai_harga_sekarang && <p className="text-xs text-red-500 mt-1">{formErrors.nilai_harga_sekarang}</p>}
                </FormField>

                <div className="sm:col-span-2">
                  <FormField label="Keterangan (Ket)">
                    <textarea 
                      value={formData.keterangan} 
                      onChange={e => set('keterangan', e.target.value)} 
                      rows={2}
                      className={inputCls + ' resize-none'} 
                      placeholder="Catatan kondisi, lokasi, dll..." 
                    />
                    {formErrors.keterangan && <p className="text-xs text-red-500 mt-1">{formErrors.keterangan}</p>}
                  </FormField>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Batal</button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center space-x-2 disabled:opacity-50">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingAset ? 'Simpan Perubahan' : 'Tambah Data'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ IMPORT PROGRESS ANIMATION OVERLAY ════════ */}
      {importing && importState !== 'idle' && createPortal(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-scaleUp">
            {importState === 'importing' ? (
              <div className="relative inline-flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-emerald-500 border-r-indigo-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-black text-slate-900">{importProgress.percent}%</span>
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            )}

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {importState === 'importing' ? 'Sedang Meng-import Data...' : 'Import Selesai!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {importState === 'importing'
                  ? `Memproses ${importProgress.current} dari ${importProgress.total} data ke database`
                  : `Semua data telah tersimpan di database.`}
              </p>
            </div>

            {importState === 'importing' && (
              <div className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-emerald-500 via-indigo-500 to-blue-500 h-full rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${importProgress.percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate px-4">
                  {importProgress.currentItemName}
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
