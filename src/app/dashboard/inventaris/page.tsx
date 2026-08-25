'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  ClipboardList, Search, Plus, Edit2, Trash2, Upload,
  FileSpreadsheet, RefreshCw, TrendingUp, TrendingDown,
  Package, Layers, Download, Calendar, X, Save, AlertTriangle,
  ChevronLeft, ChevronRight, Folder, FolderOpen, ArrowLeft,
  Grid, List as ListIcon, HardDrive, FolderPlus, MoreVertical,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Toast from '@/components/Toast';

/* ─────────────────────── Types ─────────────────────── */
interface CustomFolder {
  id: number;
  nama_folder: string;
  keterangan?: string;
  warna?: string;
  items_count?: number;
  created_at?: string;
}

interface InventarisItem {
  id: number;
  tanggal_pengambilan: string;
  kode: string;
  nama_barang: string;
  satuan: string;
  stok_awal: number;
  stok_masuk: number;
  stok_keluar: number;
  stok_akhir: number;
  keterangan?: string;
  id_folder?: number | null;
  folder?: CustomFolder | null;
  user?: { name: string };
  created_at: string;
}

interface Summary {
  total_items: number;
  total_stok_awal: number;
  total_stok_masuk: number;
  total_stok_keluar: number;
  total_stok_akhir: number;
}

interface PreviewRow {
  tanggal_pengambilan: string;
  kode: string;
  nama_barang: string;
  satuan: string;
  stok_awal: number;
  stok_masuk: number;
  stok_keluar: number;
  stok_akhir: number;
  keterangan: string;
  id_folder?: number | null;
}

type FormData = Omit<PreviewRow, 'stok_akhir'>;

const emptyForm = (defaultFolderId: number | null = null): FormData => ({
  tanggal_pengambilan: new Date().toISOString().split('T')[0],
  kode: '',
  nama_barang: '',
  satuan: 'Unit',
  stok_awal: 0,
  stok_masuk: 0,
  stok_keluar: 0,
  keterangan: '',
  id_folder: defaultFolderId,
});

/* ─────────────────────── Helpers ─────────────────────── */
const parseNum = (val: unknown): number => {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : Math.round(n);
};

const parseDate = (cell: unknown): string => {
  if (!cell) return new Date().toISOString().split('T')[0];
  if (cell instanceof Date) return cell.toISOString().split('T')[0];
  const s = String(cell).trim();
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try { return new Date(s).toISOString().split('T')[0]; } catch { return new Date().toISOString().split('T')[0]; }
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

const folderColorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  blue:    { bg: 'bg-blue-50 hover:bg-blue-100/80',    border: 'border-blue-200',    text: 'text-blue-800',    iconBg: 'bg-blue-600' },
  indigo:  { bg: 'bg-indigo-50 hover:bg-indigo-100/80', border: 'border-indigo-200', text: 'text-indigo-800', iconBg: 'bg-indigo-600' },
  purple:  { bg: 'bg-purple-50 hover:bg-purple-100/80', border: 'border-purple-200', text: 'text-purple-800', iconBg: 'bg-purple-600' },
  emerald: { bg: 'bg-emerald-50 hover:bg-emerald-100/80', border: 'border-emerald-200', text: 'text-emerald-800', iconBg: 'bg-emerald-600' },
  amber:   { bg: 'bg-amber-50 hover:bg-amber-100/80',  border: 'border-amber-200',   text: 'text-amber-800',   iconBg: 'bg-amber-600' },
  rose:    { bg: 'bg-rose-50 hover:bg-rose-100/80',   border: 'border-rose-200',    text: 'text-rose-800',    iconBg: 'bg-rose-600' },
};

/* ──────────────────── Excel Parser (client-side) ──────────────────── */
function parseExcelFile(file: File, activeFolderId: number | null): Promise<PreviewRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array', cellDates: true, raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

        let h1Idx = -1;
        for (let i = 0; i < Math.min(rows.length, 6); i++) {
          const text = rows[i].map(c => String(c ?? '').toLowerCase()).join(' ');
          if (text.includes('nama') || text.includes('kode') || text.includes('tanggal')) {
            h1Idx = i;
            break;
          }
        }
        if (h1Idx === -1) throw new Error('Header tidak ditemukan. Pastikan ada kolom Nama Barang / Kode / Tanggal.');

        const h1: string[] = rows[h1Idx].map(c => String(c ?? '').trim().toLowerCase());
        const h2Raw = rows[h1Idx + 1] ?? [];
        const h2: string[] = h2Raw.map(c => String(c ?? '').trim().toLowerCase());
        const h2Text = h2.join(' ');
        const hasSubHeader =
          /\bawal\b/.test(h2Text) || /\bakhir\b/.test(h2Text) ||
          /\bmasuk\b/.test(h2Text) || /\bkeluar\b/.test(h2Text) ||
          /\bin\b/.test(h2Text) || /\bout\b/.test(h2Text);

        const maxCols = Math.max(h1.length, h2.length);
        const combined: string[] = Array.from({ length: maxCols }, (_, i) =>
          `${h1[i] ?? ''} ${h2[i] ?? ''}`.trim()
        );

        const colMap: Record<string, number> = {};
        combined.forEach((c, i) => {
          const v1 = h1[i] ?? '';
          const v2 = h2[i] ?? '';

          if (c.includes('tanggal') && colMap.tanggal === undefined) colMap.tanggal = i;
          if ((v1 === 'kode' || c.includes('kode')) && colMap.kode === undefined) colMap.kode = i;
          if (c.includes('nama') && colMap.nama_barang === undefined) colMap.nama_barang = i;
          if (c.includes('satuan') && colMap.satuan === undefined) colMap.satuan = i;
          if (c.includes('awal') && colMap.stok_awal === undefined) colMap.stok_awal = i;
          if ((c.includes('masuk') || v2 === 'in' || (v1 === 'in' && !hasSubHeader)) && colMap.stok_masuk === undefined) colMap.stok_masuk = i;
          if ((c.includes('keluar') || v2 === 'out' || (v1 === 'out' && !hasSubHeader)) && colMap.stok_keluar === undefined) colMap.stok_keluar = i;
          if ((c.includes('akhir') || c.includes('saldo')) && colMap.stok_akhir === undefined) colMap.stok_akhir = i;
          if ((c.includes('keterangan') || v1 === 'ket') && colMap.keterangan === undefined) colMap.keterangan = i;
        });

        const dataStart = h1Idx + (hasSubHeader ? 2 : 1);
        const result: PreviewRow[] = [];
        let autoIdx = 1;

        for (let i = dataStart; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(c => c === null || c === undefined || String(c).trim() === '')) continue;

          const nama = String(row[colMap.nama_barang] ?? '').trim();
          if (!nama) continue;

          const rawKode = colMap.kode !== undefined ? String(row[colMap.kode] ?? '').trim() : '';
          const kode = rawKode || `INV-${String(autoIdx).padStart(4, '0')}`;
          const awal = parseNum(colMap.stok_awal !== undefined ? row[colMap.stok_awal] : 0);
          const masuk = parseNum(colMap.stok_masuk !== undefined ? row[colMap.stok_masuk] : 0);
          const keluar = parseNum(colMap.stok_keluar !== undefined ? row[colMap.stok_keluar] : 0);

          result.push({
            tanggal_pengambilan: parseDate(colMap.tanggal !== undefined ? row[colMap.tanggal] : null),
            kode,
            nama_barang: nama,
            satuan: colMap.satuan !== undefined ? (String(row[colMap.satuan] ?? '').trim() || 'Unit') : 'Unit',
            stok_awal: awal,
            stok_masuk: masuk,
            stok_keluar: keluar,
            stok_akhir: awal + masuk - keluar,
            keterangan: colMap.keterangan !== undefined ? String(row[colMap.keterangan] ?? '').trim() : '',
            id_folder: activeFolderId,
          });
          autoIdx++;
        }

        if (result.length === 0) throw new Error('Tidak ada data valid ditemukan di file Excel.');
        resolve(result);
      } catch (err: unknown) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsArrayBuffer(file);
  });
}

/* ══════════════════════ MAIN COMPONENT ══════════════════════ */
export default function CustomInventarisDrivePage() {
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [data, setData] = useState<InventarisItem[]>([]);
  const [filtered, setFiltered] = useState<InventarisItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });

  // Navigation: null = Root Folder Grid, number = Inside Folder ID, -1 = Uncategorized / Loose items
  const [activeFolderId, setActiveFolderId] = useState<number | null | -1>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'all'>('folders');

  // Pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  // Folder CRUD modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editFolderTarget, setEditFolderTarget] = useState<CustomFolder | null>(null);
  const [folderForm, setFolderForm] = useState({ nama_folder: '', keterangan: '', warna: 'blue' });
  const [savingFolder, setSavingFolder] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<CustomFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  // Item CRUD modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState<InventarisItem | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm(null));
  const [saving, setSaving] = useState(false);

  // Delete item confirm
  const [deleteTarget, setDeleteTarget] = useState<InventarisItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [editingPreviewIdx, setEditingPreviewIdx] = useState<number | null>(null);
  const [editingPreviewRow, setEditingPreviewRow] = useState<PreviewRow | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importState, setImportState] = useState<'idle' | 'importing' | 'completed'>('idle');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percent: 0, currentItemName: '' });
  const [showPreview, setShowPreview] = useState(false);
  const [parseError, setParseError] = useState('');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ show: true, message, type });
  }, []);

  /* ── Fetch Folders List ── */
  const fetchFolders = useCallback(async () => {
    try {
      const res = await axios.get('/api/folder-inventaris');
      if (res.data.status === 'success') {
        setFolders(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* ── Fetch Inventaris Items ── */
  const fetchData = useCallback(async (folderId: number | null | -1 = activeFolderId) => {
    try {
      setLoading(true);
      let url = '/api/inventaris';
      if (folderId === -1) {
        url += '?id_folder=general';
      } else if (typeof folderId === 'number' && folderId > 0) {
        url += `?id_folder=${folderId}`;
      }

      const res = await axios.get(url);
      if (res.data.status === 'success') {
        setData(res.data.data);
        setFiltered(res.data.data);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [activeFolderId]);

  const fetchSummary = useCallback(async (folderId: number | null | -1 = activeFolderId) => {
    try {
      let url = '/api/inventaris/summary';
      if (folderId === -1) {
        url += '?id_folder=general';
      } else if (typeof folderId === 'number' && folderId > 0) {
        url += `?id_folder=${folderId}`;
      }
      const res = await axios.get(url);
      if (res.data.status === 'success') setSummary(res.data.data);
    } catch { /* ignore */ }
  }, [activeFolderId]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchData(activeFolderId);
    fetchSummary(activeFolderId);
  }, [activeFolderId, fetchData, fetchSummary]);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFiltered(data.filter(item =>
      item.nama_barang.toLowerCase().includes(q) ||
      item.kode.toLowerCase().includes(q) ||
      item.satuan.toLowerCase().includes(q) ||
      item.folder?.nama_folder.toLowerCase().includes(q)
    ));
    setPage(1);
  }, [searchQuery, data]);

  /* ── Get Active Folder Object ── */
  const activeFolderObj = folders.find(f => f.id === activeFolderId);
  const activeFolderTitle = activeFolderId === -1
    ? 'File Tanpa Folder (Umum)'
    : (activeFolderObj ? activeFolderObj.nama_folder : 'Semua Folder');

  /* ── FOLDER CRUD HANDLERS ── */
  const openCreateFolder = () => {
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
      if (editFolderTarget) {
        await axios.put(`/api/folder-inventaris/${editFolderTarget.id}`, folderForm);
        showToast('Folder berhasil diperbarui', 'success');
      } else {
        await axios.post('/api/folder-inventaris', folderForm);
        showToast('Folder baru berhasil dibuat', 'success');
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
      showToast('Folder berhasil dihapus', 'success');
      setDeleteFolderTarget(null);
      if (activeFolderId === deleteFolderTarget.id) setActiveFolderId(null);
      fetchFolders(); fetchData();
    } catch {
      showToast('Gagal menghapus folder', 'error');
    } finally { setDeletingFolder(false); }
  };

  /* ── ITEM CRUD HANDLERS ── */
  const openAdd = () => {
    const defaultFolder = activeFolderId && activeFolderId > 0 ? activeFolderId : null;
    setEditTarget(null);
    setFormData(emptyForm(defaultFolder));
    setShowFormModal(true);
  };

  const openEdit = (item: InventarisItem) => {
    setEditTarget(item);
    setFormData({
      tanggal_pengambilan: item.tanggal_pengambilan,
      kode: item.kode,
      nama_barang: item.nama_barang,
      satuan: item.satuan,
      stok_awal: item.stok_awal,
      stok_masuk: item.stok_masuk,
      stok_keluar: item.stok_keluar,
      keterangan: item.keterangan || '',
      id_folder: item.id_folder || null,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.nama_barang.trim()) { showToast('Nama barang wajib diisi', 'error'); return; }
    try {
      setSaving(true);
      const payload = { ...formData };
      if (editTarget) {
        await axios.put(`/api/inventaris/${editTarget.id}`, payload);
        showToast('Data inventaris berhasil diupdate', 'success');
      } else {
        await axios.post('/api/inventaris', payload);
        showToast('Data inventaris berhasil ditambahkan', 'success');
      }
      setShowFormModal(false);
      fetchData(); fetchSummary(); fetchFolders();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan data inventaris';
      showToast(msg, 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await axios.delete(`/api/inventaris/${deleteTarget.id}`);
      showToast('Data inventaris berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData(); fetchSummary(); fetchFolders();
    } catch {
      showToast('Gagal menghapus data inventaris', 'error');
    } finally { setDeleting(false); }
  };

  /* ── Import Excel ── */
  const handleFileSelect = async (file: File) => {
    setParseError('');
    setImportFile(file);
    try {
      const defaultFolder = activeFolderId && activeFolderId > 0 ? activeFolderId : null;
      const parsed = await parseExcelFile(file, defaultFolder);
      setPreviewData(parsed);
      setSelectedRows(new Set(parsed.map((_, i) => i)));
      setShowPreview(true);
      setEditingPreviewIdx(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file Excel';
      setParseError(msg);
      showToast(msg, 'error');
    }
  };

  /* ── Preview inline edit ── */
  const startEditPreview = (idx: number) => {
    setEditingPreviewIdx(idx);
    setEditingPreviewRow({ ...previewData[idx] });
  };
  const cancelEditPreview = () => { setEditingPreviewIdx(null); setEditingPreviewRow(null); };
  const saveEditPreview = (idx: number) => {
    if (!editingPreviewRow) return;
    const awal = editingPreviewRow.stok_awal;
    const masuk = editingPreviewRow.stok_masuk;
    const keluar = editingPreviewRow.stok_keluar;
    const updated = [...previewData];
    updated[idx] = { ...editingPreviewRow, stok_akhir: awal + masuk - keluar };
    setPreviewData(updated);
    setEditingPreviewIdx(null);
    setEditingPreviewRow(null);
  };
  const deletePreviewRow = (idx: number) => {
    const updated = previewData.filter((_, i) => i !== idx);
    setPreviewData(updated);
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
    setSelectedRows(selectedRows.size === previewData.length ? new Set() : new Set(previewData.map((_, i) => i)));
  };

  /* ── Import selected ── */
  const handleImportSelected = async () => {
    if (selectedRows.size === 0) { showToast('Pilih minimal 1 data', 'warning'); return; }
    
    const rows = Array.from(selectedRows).map(i => previewData[i]);
    const total = rows.length;

    setImporting(true);
    setImportState('importing');
    setImportProgress({ current: 0, total, percent: 0, currentItemName: rows[0]?.nama_barang || '' });

    let ok = 0, fail = 0;

    for (let i = 0; i < total; i++) {
      const row = rows[i];
      const currentCount = i + 1;
      const percent = Math.round((currentCount / total) * 100);

      setImportProgress({
        current: currentCount,
        total,
        percent,
        currentItemName: row.nama_barang || `Data #${currentCount}`,
      });

      try {
        await axios.post('/api/inventaris', row);
        ok++;
      } catch { fail++; }
    }

    setImportState('completed');

    setTimeout(() => {
      setImporting(false);
      setImportState('idle');
      if (ok > 0) {
        showToast(`Berhasil meng-import ${ok} data inventaris${fail > 0 ? `, ${fail} gagal` : ''}`, 'success');
        closeImport();
        fetchData(); fetchSummary(); fetchFolders();
      } else {
        showToast('Semua data inventaris gagal diimport', 'error');
      }
    }, 1200);
  };

  const closeImport = () => {
    setShowImportModal(false); setShowPreview(false);
    setImportFile(null); setPreviewData([]); setSelectedRows(new Set());
    setParseError(''); setEditingPreviewIdx(null);
  };

  /* ── Export ── */
  const handleExport = () => {
    if (!filtered.length) { showToast('Tidak ada data untuk diexport', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(filtered.map(it => ({
      'Folder': it.folder?.nama_folder || 'File Tanpa Folder',
      'Tanggal Pengambilan': it.tanggal_pengambilan,
      'Kode': it.kode, 'Nama Barang': it.nama_barang, 'Satuan': it.satuan,
      'Stok Awal': it.stok_awal, 'Stok Masuk (IN)': it.stok_masuk,
      'Stok Keluar (OUT)': it.stok_keluar, 'Stok Akhir': it.stok_akhir,
      'Keterangan': it.keterangan || '-',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaris');
    const folderLabel = activeFolderId ? (activeFolderObj?.nama_folder || 'Umum') : 'Semua';
    XLSX.writeFile(wb, `Inventaris_${folderLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast(`Export ${filtered.length} data inventaris berhasil`, 'success');
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['TANGGAL PENGAMBILAN', 'KODE', 'NAMA BARANG', 'SATUAN', 'STOK', '', '', ''],
      ['', '', '', '', 'AWAL', 'IN', 'OUT', 'AKHIR'],
      ['08/07/2026', '', 'Mesin Pengasah Endmill', 'Unit', 1, 0, 1, 0],
      ['28/07/2026', '', 'Penghancur Kertas Joyko SHD-02', 'Unit', 1, 0, 1, 0],
      ['20/07/2026', '', 'Meja Kantor Besi Minimalis', 'Unit', 10, 5, 3, 12],
    ]);
    ws['!merges'] = [{ s: { r: 0, c: 4 }, e: { r: 0, c: 7 } }];
    ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 40 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Inventaris.xlsx');
    showToast('Template Inventaris berhasil didownload', 'success');
  };

  /* ── Pagination ── */
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="p-6 space-y-6">
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, show: false }))} />
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-12 translate-x-12" />
        <div className="flex items-center justify-between relative z-10 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl ring-1 ring-white/30">
              <HardDrive className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Inventaris Drive</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/20">
                  Custom Admin Folder
                </span>
              </div>
              <p className="text-blue-100 text-sm mt-1">Kelola folder inventaris buatan sendiri secara fleksibel ala Google Drive</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFolderId === null && (
              <button
                onClick={openCreateFolder}
                className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <FolderPlus className="h-4 w-4 text-indigo-600" /> + Buat Folder Baru
              </button>
            )}
            <button
              onClick={() => { setActiveFolderId(null); setViewMode('folders'); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeFolderId === null && viewMode === 'folders'
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              <Grid className="h-4 w-4" /> Daftar Folder
            </button>
            <button
              onClick={() => { setActiveFolderId(null); setViewMode('all'); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeFolderId === null && viewMode === 'all'
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              <ListIcon className="h-4 w-4" /> Semua Barang
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <button
            onClick={() => setActiveFolderId(null)}
            className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-700"
          >
            <HardDrive className="h-4 w-4 text-indigo-600" />
            <span>Inventaris Drive</span>
          </button>

          {activeFolderId !== null && (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg text-indigo-700 font-bold">
                <FolderOpen className="h-4 w-4 text-indigo-600" />
                <span>{activeFolderTitle}</span>
              </div>
            </>
          )}
        </div>

        {activeFolderId !== null && (
          <button
            onClick={() => setActiveFolderId(null)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Semua Folder
          </button>
        )}
      </div>

      {/* Summary Cards (Hanya muncul jika di dalam folder tertentu atau mode semua barang) */}
      {(activeFolderId !== null || viewMode === 'all') && summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Item', value: summary.total_items, icon: Package, from: 'from-indigo-500', to: 'to-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900' },
            { label: 'Stok Awal', value: summary.total_stok_awal, icon: Layers, from: 'from-blue-500', to: 'to-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
            { label: 'Total Masuk', value: `+${summary.total_stok_masuk}`, icon: TrendingUp, from: 'from-emerald-500', to: 'to-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900' },
            { label: 'Total Keluar', value: `-${summary.total_stok_keluar}`, icon: TrendingDown, from: 'from-orange-500', to: 'to-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900' },
            { label: 'Stok Akhir', value: summary.total_stok_akhir, icon: Package, from: 'from-purple-500', to: 'to-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
          ].map(({ label, value, icon: Icon, from, to, bg, border, text }) => (
            <div key={label} className={`${bg} border ${border} rounded-xl p-4 shadow-sm`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`p-2 bg-gradient-to-br ${from} ${to} rounded-lg`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <p className={`text-[11px] font-semibold ${text} uppercase tracking-wide`}>{label}</p>
              </div>
              <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ════════ TAMPILAN CUSTOM FOLDER GRID (Root View) ════════ */}
      {activeFolderId === null && viewMode === 'folders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Folder className="h-5 w-5 text-amber-500 fill-amber-500/20" />
              Folder Saya ({folders.length})
            </h2>
            <button
              onClick={openCreateFolder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" /> + Buat Folder Baru
            </button>
          </div>

          {folders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <FolderPlus className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">Belum Ada Folder Custom</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Buat folder khusus pertama Anda untuk mengelompokkan barang inventaris.
              </p>
              <button
                onClick={openCreateFolder}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-semibold shadow-sm transition-colors"
              >
                <FolderPlus className="h-4 w-4" /> Buat Folder Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Folder-Folder buatan Admin */}
              {folders.map((f) => {
                const colorKey = f.warna || 'blue';
                const color = folderColorMap[colorKey] || folderColorMap.blue;

                return (
                  <div
                    key={f.id}
                    onClick={() => setActiveFolderId(f.id)}
                    className={`${color.bg} border ${color.border} rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group relative overflow-hidden`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-3 ${color.iconBg} rounded-xl text-white shadow-md group-hover:scale-110 transition-transform`}>
                        <FolderOpen className="h-6 w-6" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => openEditFolder(f, e)}
                          className="p-1.5 bg-white/80 hover:bg-white text-slate-600 rounded-lg shadow-sm"
                          title="Edit Folder"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(f); }}
                          className="p-1.5 bg-white/80 hover:bg-white text-red-600 rounded-lg shadow-sm"
                          title="Hapus Folder"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className={`font-bold text-base ${color.text} group-hover:underline line-clamp-1`}>
                        {f.nama_folder}
                      </h3>
                      {f.keterangan && <p className="text-xs text-slate-500 truncate mt-0.5">{f.keterangan}</p>}
                      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">{f.items_count ?? 0}</span> barang inventaris
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Folder Umum / Tanpa Folder */}
              <div
                onClick={() => setActiveFolderId(-1)}
                className="bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-slate-700 rounded-xl text-white shadow-md group-hover:scale-110 transition-transform">
                    <Folder className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-white rounded text-slate-600 border border-slate-200">
                    DEFAULT
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800 group-hover:underline line-clamp-1">
                    File Tanpa Folder (Umum)
                  </h3>
                  <p className="text-xs text-slate-400 truncate mt-0.5">Barang yang tidak dimasukkan ke folder</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ TAMPILAN TABEL BARANG (Inside Folder View / All Mode) ════════ */}
      {(activeFolderId !== null || viewMode === 'all') && (
        <>
          {/* Actions Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text" placeholder={`Cari barang di ${activeFolderTitle}...`}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => fetchData()} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors" title="Refresh">
                  <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={handleExport} disabled={!filtered.length}
                  className="flex items-center gap-2 px-3 py-2.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors font-medium">
                  <Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span>
                </button>
                <button onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors font-medium">
                  <FileSpreadsheet className="h-4 w-4" /><span className="hidden sm:inline">Import Excel</span>
                </button>
                <button onClick={openAdd}
                  className="flex items-center gap-2 px-3 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm">
                  <Plus className="h-4 w-4" /><span className="hidden sm:inline">Tambah Data</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-indigo-600" />
                  Daftar Barang — {activeFolderTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {filtered.length} item barang {searchQuery ? `(dari ${data.length})` : ''}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                </div>
              ) : paged.length === 0 ? (
                <div className="text-center py-16">
                  <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-slate-600 font-medium">{searchQuery ? 'Tidak ada data inventaris sesuai pencarian' : `Belum ada data di ${activeFolderTitle}`}</h3>
                  {!searchQuery && (
                    <button onClick={() => setShowImportModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                      <FileSpreadsheet className="h-4 w-4" /> Import Excel ke Folder Ini
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">No</th>
                      {viewMode === 'all' && <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Folder</th>}
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Tanggal</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Kode</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Nama Barang</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Satuan</th>
                      <th className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wide text-center">Awal</th>
                      <th className="px-4 py-3 text-xs font-bold text-emerald-700 uppercase tracking-wide text-center">Masuk</th>
                      <th className="px-4 py-3 text-xs font-bold text-orange-700 uppercase tracking-wide text-center">Keluar</th>
                      <th className="px-4 py-3 text-xs font-bold text-purple-700 uppercase tracking-wide text-center">Akhir</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map((item, i) => (
                      <tr key={item.id} className="hover:bg-indigo-50/40 transition-colors group">
                        <td className="px-4 py-3 text-slate-500 text-xs">{(page - 1) * PER_PAGE + i + 1}</td>
                        {viewMode === 'all' && (
                          <td className="px-4 py-3 text-xs font-medium text-slate-700">
                            {item.folder ? (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold border border-indigo-100 flex items-center gap-1 w-fit">
                                <Folder className="h-3 w-3" /> {item.folder.nama_folder}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">Umum</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" />{fmtDate(item.tanggal_pengambilan)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">{item.kode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{item.nama_barang}</div>
                          {item.keterangan && <div className="text-xs text-slate-400 truncate max-w-[200px]">{item.keterangan}</div>}
                        </td>
                        <td className="px-4 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.satuan}</span></td>
                        <td className="px-4 py-3 text-center"><span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">{item.stok_awal}</span></td>
                        <td className="px-4 py-3 text-center"><span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">+{item.stok_masuk}</span></td>
                        <td className="px-4 py-3 text-center"><span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg border border-orange-200">-{item.stok_keluar}</span></td>
                        <td className="px-4 py-3 text-center"><span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200">{item.stok_akhir}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(item)} className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors" title="Edit">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(item)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Hapus">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
        </>
      )}

      {/* ════════ FOLDER CREATE / EDIT MODAL ════════ */}
      {showFolderModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-indigo-600" />
                {editFolderTarget ? 'Edit Folder' : 'Buat Folder Baru'}
              </h3>
              <button onClick={() => setShowFolderModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Folder <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={folderForm.nama_folder}
                  onChange={e => setFolderForm(f => ({ ...f, nama_folder: e.target.value }))}
                  placeholder="Misal: Inventaris Lab Komputer, TKR, DKV..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Deskripsi</label>
                <textarea
                  value={folderForm.keterangan}
                  onChange={e => setFolderForm(f => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Deskripsi singkat folder..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warna Folder</label>
                <div className="flex items-center gap-2">
                  {['blue', 'indigo', 'purple', 'emerald', 'amber', 'rose'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFolderForm(f => ({ ...f, warna: color }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${folderColorMap[color].iconBg} ${
                        folderForm.warna === color ? 'scale-110 border-slate-900 ring-2 ring-indigo-300' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowFolderModal(false)}
                  disabled={savingFolder}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveFolder}
                  disabled={savingFolder}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {savingFolder ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingFolder ? 'Simpan...' : 'Simpan Folder'}
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
            <p className="text-sm text-slate-600 mb-1">
              <span className="font-semibold text-slate-800">{deleteFolderTarget.nama_folder}</span>
            </p>
            <p className="text-xs text-slate-500 mb-6">Barang di dalamnya tidak akan terhapus, tetapi akan dialihkan ke file tanpa folder.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteFolderTarget(null)} disabled={deletingFolder}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors">Batal</button>
              <button onClick={handleDeleteFolder} disabled={deletingFolder}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {deletingFolder ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletingFolder ? 'Hapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ ITEM CRUD MODAL ════════ */}
      {showFormModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {editTarget ? <Edit2 className="h-5 w-5 text-indigo-600" /> : <Plus className="h-5 w-5 text-indigo-600" />}
                {editTarget ? 'Edit Data Inventaris' : 'Tambah Data Inventaris Baru'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Folder</label>
                  <select
                    value={formData.id_folder || ''}
                    onChange={e => setFormData(f => ({ ...f, id_folder: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">File Tanpa Folder (Umum)</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>📁 {f.nama_folder}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Barang <span className="text-red-500">*</span></label>
                  <input value={formData.nama_barang} onChange={e => setFormData(f => ({ ...f, nama_barang: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nama barang..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode</label>
                  <input value={formData.kode} onChange={e => setFormData(f => ({ ...f, kode: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Otomatis jika kosong" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
                  <input value={formData.satuan} onChange={e => setFormData(f => ({ ...f, satuan: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Unit, Pcs, Set..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pengambilan</label>
                  <input type="date" value={formData.tanggal_pengambilan} onChange={e => setFormData(f => ({ ...f, tanggal_pengambilan: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-700 mb-1">Stok Awal</label>
                  <input type="number" min="0" value={formData.stok_awal} onChange={e => setFormData(f => ({ ...f, stok_awal: +e.target.value }))}
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">Stok Masuk (IN)</label>
                  <input type="number" min="0" value={formData.stok_masuk} onChange={e => setFormData(f => ({ ...f, stok_masuk: +e.target.value }))}
                    className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-700 mb-1">Stok Keluar (OUT)</label>
                  <input type="number" min="0" value={formData.stok_keluar} onChange={e => setFormData(f => ({ ...f, stok_keluar: +e.target.value }))}
                    className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-700 mb-1">Stok Akhir (otomatis)</label>
                  <div className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm bg-purple-50 text-purple-700 font-bold">
                    {formData.stok_awal + formData.stok_masuk - formData.stok_keluar}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan</label>
                  <textarea value={formData.keterangan} onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))}
                    rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Opsional..." />
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowFormModal(false)} disabled={saving}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 text-sm font-medium transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ DELETE ITEM CONFIRM MODAL ════════ */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hapus Data Inventaris?</h3>
            <p className="text-sm text-slate-600 mb-1">
              <span className="font-semibold text-slate-800">{deleteTarget.nama_barang}</span>
            </p>
            <p className="text-xs text-slate-500 mb-6">Tindakan ini tidak bisa dibatalkan.</p>
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

      {/* ════════ IMPORT MODAL ════════ */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl w-full shadow-2xl transition-all duration-300 ${showPreview ? 'max-w-7xl' : 'max-w-lg'}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-violet-600" />
                {showPreview ? `Preview & Edit Data Inventaris (${previewData.length} baris)` : `Import Excel ke ${activeFolderTitle}`}
              </h2>
              <button onClick={closeImport} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
            </div>

            <div className="px-6 py-5">
              {!showPreview ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
                    <p className="font-semibold text-blue-900 mb-2">📋 Format yang didukung:</p>
                    <p>✓ Header 2 baris: baris 1 = TANGGAL/KODE/NAMA/SATUAN/STOK, baris 2 = AWAL/IN/OUT/AKHIR</p>
                    <p>✓ Header 1 baris: kolom dengan nama lengkap (Stok Awal, Stok Masuk, dst.)</p>
                    <p>✓ Target Folder: <strong className="text-blue-900">{activeFolderTitle}</strong></p>
                  </div>

                  {parseError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{parseError}</p>
                    </div>
                  )}

                  <label className="block w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/30 transition-all">
                    <Upload className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <span className="text-sm font-medium text-slate-600">
                      {importFile ? <span className="text-violet-600">{importFile.name}</span> : 'Klik atau drag file Excel di sini'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">.xlsx, .xls, .csv — maks 5 MB</p>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                  </label>

                  <button onClick={downloadTemplate}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 font-medium transition-colors">
                    <Download className="h-4 w-4" /> Download Template Inventaris
                  </button>

                  <button onClick={closeImport} className="w-full py-2.5 bg-slate-100 text-slate-700 text-sm rounded-xl hover:bg-slate-200 font-medium transition-colors">Batal</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-indigo-900">{previewData.length} baris dari Excel</p>
                      <p className="text-xs text-indigo-600">{selectedRows.size} dipilih • Target: {activeFolderTitle}</p>
                    </div>
                    <button onClick={toggleAll}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                      {selectedRows.size === previewData.length ? 'Batal Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[55vh] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 w-10"><input type="checkbox" checked={selectedRows.size === previewData.length && previewData.length > 0} onChange={toggleAll} className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer" /></th>
                          <th className="px-3 py-2.5 text-left font-bold text-slate-600">No</th>
                          <th className="px-3 py-2.5 text-left font-bold text-slate-600">Tanggal</th>
                          <th className="px-3 py-2.5 text-left font-bold text-slate-600">Kode</th>
                          <th className="px-3 py-2.5 text-left font-bold text-slate-600">Nama Barang</th>
                          <th className="px-3 py-2.5 text-left font-bold text-slate-600">Satuan</th>
                          <th className="px-3 py-2.5 text-center font-bold text-blue-700">Awal</th>
                          <th className="px-3 py-2.5 text-center font-bold text-emerald-700">IN</th>
                          <th className="px-3 py-2.5 text-center font-bold text-orange-700">OUT</th>
                          <th className="px-3 py-2.5 text-center font-bold text-purple-700">Akhir</th>
                          <th className="px-3 py-2.5 text-center font-bold text-slate-600">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.map((row, idx) => {
                          const isEditing = editingPreviewIdx === idx;
                          const eRow = editingPreviewRow!;
                          return (
                            <tr key={idx} className={`transition-colors ${selectedRows.has(idx) ? 'bg-indigo-50/40' : 'hover:bg-slate-50'} ${isEditing ? 'bg-amber-50 ring-2 ring-inset ring-amber-400' : ''}`}>
                              <td className="px-3 py-2 text-center">
                                <input type="checkbox" checked={selectedRows.has(idx)} onChange={() => toggleRow(idx)} className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer" />
                              </td>
                              <td className="px-3 py-2 text-slate-500">{idx + 1}</td>

                              {isEditing ? (
                                <>
                                  <td className="px-2 py-1"><input type="date" value={eRow.tanggal_pengambilan} onChange={e => setEditingPreviewRow(r => r ? { ...r, tanggal_pengambilan: e.target.value } : r)} className="w-28 border border-amber-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1"><input value={eRow.kode} onChange={e => setEditingPreviewRow(r => r ? { ...r, kode: e.target.value } : r)} className="w-24 border border-amber-300 rounded px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1"><input value={eRow.nama_barang} onChange={e => setEditingPreviewRow(r => r ? { ...r, nama_barang: e.target.value } : r)} className="w-48 border border-amber-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1"><input value={eRow.satuan} onChange={e => setEditingPreviewRow(r => r ? { ...r, satuan: e.target.value } : r)} className="w-16 border border-amber-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1 text-center"><input type="number" min="0" value={eRow.stok_awal} onChange={e => setEditingPreviewRow(r => r ? { ...r, stok_awal: +e.target.value } : r)} className="w-14 border border-blue-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50" /></td>
                                  <td className="px-2 py-1 text-center"><input type="number" min="0" value={eRow.stok_masuk} onChange={e => setEditingPreviewRow(r => r ? { ...r, stok_masuk: +e.target.value } : r)} className="w-14 border border-emerald-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-emerald-50" /></td>
                                  <td className="px-2 py-1 text-center"><input type="number" min="0" value={eRow.stok_keluar} onChange={e => setEditingPreviewRow(r => r ? { ...r, stok_keluar: +e.target.value } : r)} className="w-14 border border-orange-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-orange-400 bg-orange-50" /></td>
                                  <td className="px-2 py-1 text-center"><span className="w-14 inline-block text-center px-2 py-1 bg-purple-100 text-purple-700 font-bold rounded">{eRow.stok_awal + eRow.stok_masuk - eRow.stok_keluar}</span></td>
                                  <td className="px-2 py-1">
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={() => saveEditPreview(idx)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors" title="Simpan"><Save className="h-3 w-3" /></button>
                                      <button onClick={cancelEditPreview} className="p-1 bg-slate-400 text-white rounded hover:bg-slate-500 transition-colors" title="Batal"><X className="h-3 w-3" /></button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.tanggal_pengambilan}</td>
                                  <td className="px-3 py-2">
                                    <span className={`font-mono px-1.5 py-0.5 rounded text-xs ${row.kode.startsWith('INV-') ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>{row.kode}</span>
                                  </td>
                                  <td className="px-3 py-2 font-medium text-slate-900">{row.nama_barang}</td>
                                  <td className="px-3 py-2 text-slate-500">{row.satuan}</td>
                                  <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded">{row.stok_awal}</span></td>
                                  <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded">+{row.stok_masuk}</span></td>
                                  <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 bg-orange-100 text-orange-700 font-bold rounded">-{row.stok_keluar}</span></td>
                                  <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 bg-purple-100 text-purple-700 font-bold rounded">{row.stok_akhir}</span></td>
                                  <td className="px-3 py-2">
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={() => startEditPreview(idx)} className="p-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors" title="Edit baris ini">
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button onClick={() => deletePreviewRow(idx)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors" title="Hapus baris ini">
                                        <Trash2 className="h-3 w-3" />
                                      </button>
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

                  <div className="flex gap-3">
                    <button onClick={() => { setShowPreview(false); setImportFile(null); setPreviewData([]); setSelectedRows(new Set()); }}
                      disabled={importing} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm rounded-xl hover:bg-slate-200 disabled:opacity-50 font-medium transition-colors">
                      ← Kembali
                    </button>
                    <button onClick={handleImportSelected} disabled={selectedRows.size === 0 || importing}
                      className="flex-1 py-2.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                      {importing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4" /> Import {selectedRows.size} Data ke {activeFolderTitle}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-indigo-600 border-r-violet-600 animate-spin" />
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
                {importState === 'importing' ? 'Sedang Meng-import Data Inventaris...' : 'Import Selesai!'}
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
                    className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 h-full rounded-full transition-all duration-300 shadow-sm"
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
