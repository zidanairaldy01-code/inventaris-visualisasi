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
  id_sumber_dana?: number | null;
  sumber_dana?: { id: number; nama_sumber: string; jenis_sumber: string | null } | null;
}

interface SumberDana {
  id: number;
  nama_sumber: string;
  jenis_sumber: string | null;
}

interface InventarisItem {
  id: number;
  no_urut: number | null;
  kode_rekening: string | null;
  kode_program: string | null;
  uraian: string;
  volume: number;
  satuan: string;
  tarif_harga: number;
  jumlah: number;
  keterangan: string | null;
  id_folder: number | null;
  id_sumber_dana?: number | null;
  folder?: CustomFolder | null;
  sumber_dana?: SumberDana | null;
  user?: { name: string };
  created_at: string;
}

interface Summary {
  total_items: number;
  total_volume: number;
  total_jumlah: number;
}

interface PreviewRow {
  no_urut: number;
  kode_rekening: string;
  kode_program: string;
  uraian: string;
  volume: number;
  satuan: string;
  tarif_harga: number;
  jumlah: number;
  keterangan: string;
  id_folder?: number | null;
  id_sumber_dana?: number | null;
}

type FormData = {
  no_urut: string;
  kode_rekening: string;
  kode_program: string;
  uraian: string;
  volume: string;
  satuan: string;
  tarif_harga: string;
  keterangan: string;
  id_folder: number | null;
  id_sumber_dana: number | null;
};

const emptyForm = (defaultFolderId: number | null = null): FormData => ({
  no_urut: '',
  kode_rekening: '',
  kode_program: '',
  uraian: '',
  volume: '1',
  satuan: 'Unit',
  tarif_harga: '0',
  keterangan: '',
  id_folder: defaultFolderId,
  id_sumber_dana: null,
});

/* ─────────────────────── Helpers ─────────────────────── */
const parseNum = (val: unknown): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  const s = String(val).trim().replace(/[^\d.,]/g, '');
  if (!s) return 0;
  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  if (dots > 0 && commas > 0) {
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    return Math.round(parseFloat(lastDot > lastComma ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.'))) || 0;
  }
  if (dots > 1 || (dots === 1 && s.substring(s.lastIndexOf('.') + 1).length === 3)) {
    return parseInt(s.replace(/\./g, ''), 10) || 0;
  }
  if (commas > 1 || (commas === 1 && s.substring(s.lastIndexOf(',') + 1).length === 3)) {
    return parseInt(s.replace(/,/g, ''), 10) || 0;
  }
  return Math.round(parseFloat(s.replace(',', '.'))) || 0;
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const formatRupiahShort = (n: number) => {
  if (!n || isNaN(n)) return 'Rp 0';
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} Rb`;
  return `Rp ${n}`;
};

const getItemJumlah = (item: InventarisItem): number =>
  Number(item.jumlah) || Number(item.volume) * Number(item.tarif_harga) || 0;

const folderColorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  blue:    { bg: 'bg-blue-50 hover:bg-blue-100/80',    border: 'border-blue-200',    text: 'text-blue-800',    iconBg: 'bg-blue-600' },
  indigo:  { bg: 'bg-indigo-50 hover:bg-indigo-100/80', border: 'border-indigo-200', text: 'text-indigo-800', iconBg: 'bg-indigo-600' },
  purple:  { bg: 'bg-purple-50 hover:bg-purple-100/80', border: 'border-purple-200', text: 'text-purple-800', iconBg: 'bg-purple-600' },
  emerald: { bg: 'bg-emerald-50 hover:bg-emerald-100/80', border: 'border-emerald-200', text: 'text-emerald-800', iconBg: 'bg-emerald-600' },
  amber:   { bg: 'bg-amber-50 hover:bg-amber-100/80',  border: 'border-amber-200',   text: 'text-amber-800',   iconBg: 'bg-amber-600' },
  rose:    { bg: 'bg-rose-50 hover:bg-rose-100/80',   border: 'border-rose-200',    text: 'text-rose-800',    iconBg: 'bg-rose-600' },
};

const normCell = (v: unknown): string => String(v ?? '').trim().toLowerCase();

const BELANJA_FORMAT_ERROR =
  'Format Excel tidak valid. Gunakan template Daftar Belanja dengan kolom: No. Urut, Kode Rekening, Kode Program, Uraian, Rincian Perhitungan (Volume, Satuan, Tarif Harga), dan Jumlah.';

type BelanjaColMap = {
  no_urut?: number;
  kode_rekening?: number;
  kode_program?: number;
  uraian: number;
  volume: number;
  satuan: number;
  tarif_harga: number;
  jumlah?: number;
};

function findBelanjaHeader(rows: unknown[][]): { h1Idx: number; hasSubHeader: boolean } {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!row) continue;

    const h1 = row.map(normCell);
    const h1Text = h1.join(' ');
    const hasUraian = h1.some(c => c.includes('uraian'));
    const hasRekening = h1.some(c => c.includes('kode rekening'));
    const hasProgram = h1.some(c => c.includes('kode program'));
    if (!hasUraian || !hasRekening || !hasProgram) continue;

    const h2 = (rows[i + 1] ?? []).map(normCell);
    const hasSubHeader =
      h1Text.includes('rincian perhitungan') &&
      h2.some(c => c.includes('volume')) &&
      h2.some(c => c.includes('satuan')) &&
      h2.some(c => c.includes('tarif') || c.includes('harga'));

    if (hasSubHeader) return { h1Idx: i, hasSubHeader: true };

    const hasFlatCols =
      h1.some(c => c.includes('volume')) &&
      h1.some(c => c.includes('satuan')) &&
      h1.some(c => c.includes('tarif') || c.includes('harga'));
    if (hasFlatCols) return { h1Idx: i, hasSubHeader: false };
  }

  throw new Error(BELANJA_FORMAT_ERROR);
}

function buildBelanjaColMap(h1: string[], h2: string[], hasSubHeader: boolean): BelanjaColMap {
  const colMap: Partial<BelanjaColMap> = {};

  h1.forEach((c, i) => {
    if ((c.includes('no') && c.includes('urut')) || c === 'no.' || c === 'no') colMap.no_urut = i;
    if (c.includes('kode rekening')) colMap.kode_rekening = i;
    if (c.includes('kode program')) colMap.kode_program = i;
    if (c.includes('uraian')) colMap.uraian = i;
    if (c === 'jumlah' || (c.includes('jumlah') && !c.includes('barang'))) colMap.jumlah = i;

    if (!hasSubHeader) {
      if (c.includes('volume')) colMap.volume = i;
      if (c.includes('satuan') && !c.includes('tarif')) colMap.satuan = i;
      if (c.includes('tarif') || c.includes('harga satuan')) colMap.tarif_harga = i;
    }
  });

  if (hasSubHeader) {
    h2.forEach((c, i) => {
      if (c.includes('volume')) colMap.volume = i;
      if (c.includes('satuan')) colMap.satuan = i;
      if (c.includes('tarif') || (c.includes('harga') && !c.includes('satuan'))) colMap.tarif_harga = i;
    });
  }

  if (colMap.uraian === undefined || colMap.volume === undefined || colMap.satuan === undefined || colMap.tarif_harga === undefined) {
    throw new Error(BELANJA_FORMAT_ERROR);
  }

  return colMap as BelanjaColMap;
}

function buildBelanjaExportSheet(items: InventarisItem[]) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['No. Urut', 'Kode Rekening', 'Kode Program', 'Uraian', 'Rincian Perhitungan', null, null, 'Jumlah'],
    [null, null, null, null, 'Volume', 'Satuan', 'Tarif Harga', null],
    ...items.map(it => [
      it.no_urut ?? '',
      it.kode_rekening || '',
      it.kode_program || '',
      it.uraian,
      Number(it.volume) || 0,
      it.satuan,
      Number(it.tarif_harga) || 0,
      getItemJumlah(it),
    ]),
  ]);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 6 } },
    { s: { r: 0, c: 7 }, e: { r: 1, c: 7 } },
  ];
  ws['!cols'] = [{ wch: 8 }, { wch: 22 }, { wch: 18 }, { wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }];
  return ws;
}

/* ──────────────────── Excel Parser — Format Daftar Belanja ──────────────────── */
function parseExcelFile(file: File, activeFolderId: number | null): Promise<PreviewRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array', cellDates: true, raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

        if (!rows || rows.length === 0) {
          throw new Error('File Excel kosong atau tidak dapat dibaca.');
        }

        const { h1Idx, hasSubHeader } = findBelanjaHeader(rows);
        const h1 = rows[h1Idx].map(normCell);
        const h2 = (rows[h1Idx + 1] ?? []).map(normCell);
        const colMap = buildBelanjaColMap(h1, h2, hasSubHeader);
        const dataStart = h1Idx + (hasSubHeader ? 2 : 1);

        const result: PreviewRow[] = [];
        let autoIdx = 1;

        for (let i = dataStart; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every(c => c === null || c === undefined || String(c).trim() === '')) continue;

          const uraian = String(row[colMap.uraian] ?? '').trim();
          if (!uraian) continue;

          const noUrutRaw = colMap.no_urut !== undefined ? row[colMap.no_urut] : autoIdx;
          const noUrut = parseNum(noUrutRaw) || autoIdx;
          const volume = parseNum(row[colMap.volume]) || 0;
          const satuan = String(row[colMap.satuan] ?? '').trim() || 'Unit';
          const tarifHarga = parseNum(row[colMap.tarif_harga]) || 0;
          const jumlah = colMap.jumlah !== undefined
            ? parseNum(row[colMap.jumlah]) || volume * tarifHarga
            : volume * tarifHarga;

          result.push({
            no_urut: noUrut,
            kode_rekening: colMap.kode_rekening !== undefined ? String(row[colMap.kode_rekening] ?? '').trim() : '',
            kode_program: colMap.kode_program !== undefined ? String(row[colMap.kode_program] ?? '').trim() : '',
            uraian,
            volume,
            satuan,
            tarif_harga: tarifHarga,
            jumlah,
            keterangan: '',
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
  const [sumberDanaList, setSumberDanaList] = useState<SumberDana[]>([]);
  const [filterSumberDana, setFilterSumberDana] = useState<string>('');
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
  const [folderForm, setFolderForm] = useState({ nama_folder: '', keterangan: '', warna: 'blue', id_sumber_dana: null as number | null });
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
      const res = await axios.get('/api/folder-inventaris?jenis=inventaris-belanja');
      if (res.data.status === 'success') {
        setFolders(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* ── Fetch Sumber Dana List ── */
  const fetchSumberDana = useCallback(async () => {
    try {
      const res = await axios.get('/api/sumber-danas');
      const list = Array.isArray(res.data) ? res.data : (res.data.data ?? []);
      setSumberDanaList(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* ── Fetch Inventaris Items ── */
  const fetchData = useCallback(async (folderId: number | null | -1 = activeFolderId) => {
    try {
      setLoading(true);
      let url = '/api/daftar-belanja';
      const params: string[] = [];
      if (folderId === -1) {
        params.push('id_folder=general');
      } else if (typeof folderId === 'number' && folderId > 0) {
        params.push(`id_folder=${folderId}`);
      }
      if (url && params.length) url += '?' + params.join('&');

      const res = await axios.get(url);
      if (res.data.status === 'success') {
        setData(res.data.data);
        setFiltered(res.data.data);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [activeFolderId]);

  useEffect(() => {
    fetchFolders();
    fetchSumberDana();
  }, [fetchFolders, fetchSumberDana]);

  useEffect(() => {
    fetchData(activeFolderId);
  }, [activeFolderId, fetchData]);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFiltered(data.filter(item => {
      const matchSearch =
        item.uraian.toLowerCase().includes(q) ||
        (item.kode_rekening || '').toLowerCase().includes(q) ||
        (item.kode_program || '').toLowerCase().includes(q) ||
        item.satuan.toLowerCase().includes(q) ||
        item.folder?.nama_folder.toLowerCase().includes(q) ||
        (item.sumber_dana?.nama_sumber ?? '').toLowerCase().includes(q);
      const matchSumber = !filterSumberDana ||
        String(item.id_sumber_dana) === filterSumberDana;
      return matchSearch && matchSumber;
    }));
    setPage(1);
  }, [searchQuery, filterSumberDana, data]);

  /* ── Get Active Folder Object ── */
  const activeFolderObj = folders.find(f => f.id === activeFolderId);
  const activeFolderTitle = activeFolderId === -1
    ? 'File Tanpa Folder (Umum)'
    : (activeFolderObj ? activeFolderObj.nama_folder : 'Semua Folder');

  /* ── FOLDER CRUD HANDLERS ── */
  const openCreateFolder = () => {
    setEditFolderTarget(null);
    setFolderForm({ nama_folder: '', keterangan: '', warna: 'blue', id_sumber_dana: null });
    setShowFolderModal(true);
  };

  const openEditFolder = (f: CustomFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditFolderTarget(f);
    setFolderForm({ nama_folder: f.nama_folder, keterangan: f.keterangan || '', warna: f.warna || 'blue', id_sumber_dana: f.id_sumber_dana ?? null });
    setShowFolderModal(true);
  };

  const handleSaveFolder = async () => {
    if (!folderForm.nama_folder.trim()) { showToast('Nama folder wajib diisi', 'error'); return; }
    try {
      setSavingFolder(true);
      const payload = { ...folderForm, jenis: 'inventaris-belanja' };
      if (editFolderTarget) {
        await axios.put(`/api/folder-inventaris/${editFolderTarget.id}`, payload);
        showToast('Folder berhasil diperbarui', 'success');
      } else {
        await axios.post('/api/folder-inventaris', payload);
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
    // Auto-set sumber dana dari folder aktif jika ada
    const defaultSumberDana = defaultFolder
      ? (folders.find(f => f.id === defaultFolder)?.id_sumber_dana ?? null)
      : null;
    setEditTarget(null);
    setFormData({ ...emptyForm(defaultFolder), id_sumber_dana: defaultSumberDana });
    setShowFormModal(true);
  };

  const openEdit = (item: InventarisItem) => {
    setEditTarget(item);
    setFormData({
      no_urut: item.no_urut != null ? String(item.no_urut) : '',
      kode_rekening: item.kode_rekening || '',
      kode_program: item.kode_program || '',
      uraian: item.uraian,
      volume: String(item.volume),
      satuan: item.satuan,
      tarif_harga: String(item.tarif_harga),
      keterangan: item.keterangan || '',
      id_folder: item.id_folder || null,
      id_sumber_dana: item.id_sumber_dana || null,
    });
    setShowFormModal(true);
  };

  const buildPayload = (form: FormData) => ({
    no_urut: form.no_urut ? parseInt(form.no_urut, 10) : null,
    kode_rekening: form.kode_rekening || null,
    kode_program: form.kode_program || null,
    uraian: form.uraian.trim(),
    volume: parseFloat(form.volume) || 0,
    satuan: form.satuan.trim(),
    tarif_harga: parseFloat(form.tarif_harga) || 0,
    keterangan: form.keterangan || null,
    id_folder: form.id_folder,
    id_sumber_dana: form.id_sumber_dana,
  });

  const handleSave = async () => {
    if (!formData.uraian.trim()) { showToast('Uraian wajib diisi', 'error'); return; }
    try {
      setSaving(true);
      const payload = buildPayload(formData);
      if (editTarget) {
        await axios.put(`/api/daftar-belanja/${editTarget.id}`, payload);
        showToast('Data belanja berhasil diupdate', 'success');
      } else {
        await axios.post('/api/daftar-belanja', payload);
        showToast('Data belanja berhasil ditambahkan', 'success');
      }
      setShowFormModal(false);
      fetchData(); fetchFolders();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan data inventaris';
      showToast(msg, 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await axios.delete(`/api/daftar-belanja/${deleteTarget.id}`);
      showToast('Data belanja berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData(); fetchFolders();
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
    const jumlah = (editingPreviewRow.volume || 0) * (editingPreviewRow.tarif_harga || 0);
    const updated = [...previewData];
    updated[idx] = { ...editingPreviewRow, jumlah };
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
    if (!importFile && previewData.length === 0) {
      showToast('Pilih file Excel terlebih dahulu', 'warning');
      return;
    }

    setImporting(true);
    setImportState('importing');

    try {
      const rows = Array.from(selectedRows).map(i => previewData[i]);
      if (rows.length === 0) {
        showToast('Pilih minimal 1 baris data', 'warning');
        return;
      }

      setImportProgress({ current: 0, total: rows.length, percent: 0, currentItemName: '' });

      const res = await axios.post('/api/daftar-belanja/batch-store', { items: rows });

      if (res.data.status === 'success') {
        setImportState('completed');
        setImportProgress({ current: rows.length, total: rows.length, percent: 100, currentItemName: '' });
        setTimeout(() => {
          showToast(res.data.message || `Berhasil import ${rows.length} data belanja`, 'success');
          closeImport();
          fetchData();
          fetchFolders();
        }, 600);
      } else {
        showToast(res.data.message || 'Gagal import data belanja', 'error');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal meng-import file Excel';
      showToast(msg, 'error');
    } finally {
      setImporting(false);
      setImportState('idle');
    }
  };

  const closeImport = () => {
    setShowImportModal(false); setShowPreview(false);
    setImportFile(null); setPreviewData([]); setSelectedRows(new Set());
    setParseError(''); setEditingPreviewIdx(null);
  };

  /* ── Export ── */
  const handleExport = () => {
    if (!filtered.length) { showToast('Tidak ada data untuk diexport', 'warning'); return; }
    const ws = buildBelanjaExportSheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Belanja');
    const folderLabel = activeFolderId ? (activeFolderObj?.nama_folder || 'Umum') : 'Semua';
    XLSX.writeFile(wb, `Daftar_Belanja_${folderLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast(`Export ${filtered.length} data belanja berhasil`, 'success');
  };

  const downloadTemplate = () => {
    const ws = buildBelanjaExportSheet([
      {
        id: 0, no_urut: 1, kode_rekening: '5.1.02.01.01.0001', kode_program: '5.01.01.2.01',
        uraian: 'Buku Tulis isi 38 Lembar', volume: 10, satuan: 'Pak', tarif_harga: 3500, jumlah: 35000,
        keterangan: null, id_folder: null, created_at: '',
      },
      {
        id: 0, no_urut: 2, kode_rekening: '5.1.02.01.01.0002', kode_program: '5.01.01.2.01',
        uraian: 'Pulpen Standard AE7 Black', volume: 20, satuan: 'Pcs', tarif_harga: 2500, jumlah: 50000,
        keterangan: null, id_folder: null, created_at: '',
      },
      {
        id: 0, no_urut: 3, kode_rekening: '5.1.02.01.01.0005', kode_program: '5.02.01.2.02',
        uraian: 'Kertas HVS A4 80gr Sidu', volume: 5, satuan: 'Rim', tarif_harga: 48000, jumlah: 240000,
        keterangan: null, id_folder: null, created_at: '',
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Daftar Belanja');
    XLSX.writeFile(wb, 'Template_Daftar_Belanja.xlsx');
    showToast('Template Daftar Belanja berhasil didownload', 'success');
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
                <h1 className="text-3xl font-extrabold text-white tracking-tight"> Rekap Belanja</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/20">
                  Modul Belanja & Pengadaan
                </span>
              </div>
              <p className="text-blue-100 text-sm mt-1">Kelola data pembelanjaan dengan format No. Urut, Kode Rekening, Kode Program, Uraian, dan Rincian Perhitungan</p>
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
              {/* Badge sumber dana folder aktif */}
              {activeFolderObj?.sumber_dana && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">
                  💰 {activeFolderObj.sumber_dana.nama_sumber}
                  {activeFolderObj.sumber_dana.jenis_sumber && (
                    <span className="opacity-70">({activeFolderObj.sumber_dana.jenis_sumber})</span>
                  )}
                </span>
              )}
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
      {(activeFolderId !== null || viewMode === 'all') && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg">
                <Package className="h-4 w-4 text-white" />
              </div>
              <p className="text-[11px] font-semibold text-indigo-900 uppercase tracking-wide">Total Jenis Barang</p>
            </div>
            <p className="text-2xl font-extrabold text-indigo-900">{filtered.length} <span className="text-sm font-normal text-indigo-700">Jenis</span></p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg">
                <Layers className="h-4 w-4 text-white" />
              </div>
              <p className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide">Total Unit Barang</p>
            </div>
            <p className="text-2xl font-extrabold text-blue-900">
              {filtered.reduce((s, item) => s + (Number(item.volume) || 0), 0)} <span className="text-sm font-normal text-blue-700">Unit</span>
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <p className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wide">Total Pembelanjaan</p>
            </div>
            <p className="text-2xl font-extrabold text-emerald-900">
              {formatRupiah(filtered.reduce((s, item) => s + getItemJumlah(item), 0))}
            </p>
          </div>
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
                const folderItems = data.filter(item => Number(item.id_folder) === f.id);
                const folderTotalPembelanjaan = folderItems.reduce((s, item) => s + getItemJumlah(item), 0);

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
                      {/* Badge Sumber Dana */}
                      {f.sumber_dana && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-700 border border-teal-200">
                          💰 {f.sumber_dana.nama_sumber}
                        </span>
                      )}
                      {f.keterangan && <p className="text-xs text-slate-500 truncate mt-0.5">{f.keterangan}</p>}
                      <div className="mt-3 space-y-1 pt-2 border-t border-black/5">
                        <p className="text-xs text-slate-600 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-700">{f.items_count ?? folderItems.length}</span> barang
                          </span>
                        </p>
                        <p className="text-xs font-bold text-emerald-800 flex items-center justify-between bg-emerald-100/60 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                          <span>Total Belanja:</span>
                          <span>{formatRupiahShort(folderTotalPembelanjaan)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Folder Umum / Tanpa Folder */}
              {(() => {
                const looseItems = data.filter(item => !item.id_folder);
                const looseTotalPembelanjaan = looseItems.reduce((s, item) => s + getItemJumlah(item), 0);
                return (
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
                      <div className="mt-3 space-y-1 pt-2 border-t border-slate-200/60">
                        <p className="text-xs text-slate-600 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-700">{looseItems.length}</span> barang
                          </span>
                        </p>
                        <p className="text-xs font-bold text-emerald-800 flex items-center justify-between bg-emerald-100/60 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                          <span>Total Belanja:</span>
                          <span>{formatRupiahShort(looseTotalPembelanjaan)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
              {/* Filter Sumber Dana */}
              <select
                value={filterSumberDana}
                onChange={e => setFilterSumberDana(e.target.value)}
                className="border border-slate-200 bg-slate-50 text-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Semua Sumber Dana</option>
                {sumberDanaList.map(sd => (
                  <option key={sd.id} value={String(sd.id)}>{sd.nama_sumber}</option>
                ))}
              </select>
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
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">No. Urut</th>
                      {viewMode === 'all' && <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Folder</th>}
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Kode Rekening</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Kode Program</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Uraian</th>
                      <th className="px-4 py-3 text-xs font-bold text-teal-700 uppercase tracking-wide text-left">Sumber Dana</th>
                      <th className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wide text-center">Volume</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-center">Satuan</th>
                      <th className="px-4 py-3 text-xs font-bold text-emerald-700 uppercase tracking-wide text-right">Tarif Harga</th>
                      <th className="px-4 py-3 text-xs font-bold text-indigo-700 uppercase tracking-wide text-right">Jumlah</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map((item, i) => {
                      const totalHarga = getItemJumlah(item);

                      return (
                        <tr key={item.id} className="hover:bg-indigo-50/40 transition-colors group">
                          <td className="px-4 py-3 text-slate-500 text-xs">{item.no_urut ?? (page - 1) * PER_PAGE + i + 1}</td>
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
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-slate-100 text-indigo-700 border border-slate-200 px-2 py-0.5 rounded font-semibold">{item.kode_rekening || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs font-mono whitespace-nowrap">
                            {item.kode_program || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{item.uraian}</div>
                            {item.keterangan && <div className="text-xs text-slate-400 truncate max-w-[250px]">{item.keterangan}</div>}
                          </td>
                          <td className="px-4 py-3">
                            {item.sumber_dana ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200 whitespace-nowrap">
                                {item.sumber_dana.nama_sumber}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                              {item.volume}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-slate-600">{item.satuan}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700 text-xs whitespace-nowrap">
                            {Number(item.tarif_harga) > 0 ? formatRupiah(Number(item.tarif_harga)) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-indigo-700 text-xs whitespace-nowrap">
                            {totalHarga > 0 ? formatRupiah(totalHarga) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(item)} className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors" title="Edit">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setDeleteTarget(item)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Hapus">
                                <Trash2 className="h-3.5 w-3.5" />
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

              {/* Sumber Dana — field baru */}
              <div>
                <label className="block text-xs font-semibold text-teal-700 mb-1 flex items-center gap-1">
                  💰 Sumber Dana
                  <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <select
                  value={folderForm.id_sumber_dana ?? ''}
                  onChange={e => setFolderForm(f => ({ ...f, id_sumber_dana: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full border border-teal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50"
                >
                  <option value="">-- Tidak ada / Pilih Sumber Dana --</option>
                  {sumberDanaList.map(sd => (
                    <option key={sd.id} value={sd.id}>
                      {sd.nama_sumber}{sd.jenis_sumber ? ` (${sd.jenis_sumber})` : ''}
                    </option>
                  ))}
                </select>
                {folderForm.id_sumber_dana && (
                  <p className="text-[11px] text-teal-600 mt-1">
                    ✓ Item baru di folder ini akan otomatis menggunakan sumber dana ini
                  </p>
                )}
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
                  <label className="block text-xs font-semibold text-teal-700 mb-1">Sumber Dana</label>
                  <select
                    value={formData.id_sumber_dana || ''}
                    onChange={e => setFormData(f => ({ ...f, id_sumber_dana: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border border-teal-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-teal-50"
                  >
                    <option value="">-- Pilih Sumber Dana (Opsional) --</option>
                    {sumberDanaList.map(sd => (
                      <option key={sd.id} value={sd.id}>{sd.nama_sumber}{sd.jenis_sumber ? ` (${sd.jenis_sumber})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. Urut</label>
                  <input value={formData.no_urut} onChange={e => setFormData(f => ({ ...f, no_urut: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Opsional" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
                  <input value={formData.satuan} onChange={e => setFormData(f => ({ ...f, satuan: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Unit, Pcs, Set..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Program</label>
                  <input value={formData.kode_program} onChange={e => setFormData(f => ({ ...f, kode_program: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="5.01.01.2.01" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Rekening</label>
                  <input value={formData.kode_rekening} onChange={e => setFormData(f => ({ ...f, kode_rekening: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="5.1.02.01.01.0001" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Uraian <span className="text-red-500">*</span></label>
                  <input value={formData.uraian} onChange={e => setFormData(f => ({ ...f, uraian: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Uraian barang / belanja..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-700 mb-1">Volume</label>
                  <input type="number" min="0" step="0.01" value={formData.volume} onChange={e => setFormData(f => ({ ...f, volume: e.target.value }))}
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">Tarif Harga</label>
                  <input type="number" min="0" step="0.01" value={formData.tarif_harga} onChange={e => setFormData(f => ({ ...f, tarif_harga: e.target.value }))}
                    className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-700 mb-1">Jumlah (otomatis)</label>
                  <div className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm bg-purple-50 text-purple-700 font-bold">
                    {formatRupiah((parseFloat(formData.volume) || 0) * (parseFloat(formData.tarif_harga) || 0))}
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
              <span className="font-semibold text-slate-800">{deleteTarget.uraian}</span>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className={`bg-white rounded-2xl w-full shadow-2xl transition-all duration-300 my-4 ${showPreview ? 'max-w-7xl' : 'max-w-lg'} max-h-[95vh] flex flex-col`}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600" />
                <span className="hidden sm:inline">
                  {showPreview ? `Preview & Edit Data Inventaris (${previewData.length} baris)` : `Import Excel ke ${activeFolderTitle}`}
                </span>
                <span className="sm:hidden">
                  {showPreview ? `Preview (${previewData.length})` : 'Import Excel'}
                </span>
              </h2>
              <button onClick={closeImport} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" /></button>
            </div>

            <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1">
              {!showPreview ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1.5">
                    <p className="font-bold text-blue-900 mb-1">📋 Format Excel Daftar Belanja:</p>
                    <div className="overflow-x-auto my-2">
                      <table className="text-[11px] border border-blue-200 rounded-lg overflow-hidden w-full text-center">
                        <thead className="bg-blue-100 text-blue-900 font-bold">
                          <tr>
                            <th className="px-2 py-1 border border-blue-200" rowSpan={2}>No. Urut</th>
                            <th className="px-2 py-1 border border-blue-200" rowSpan={2}>Kode Rekening</th>
                            <th className="px-2 py-1 border border-blue-200" rowSpan={2}>Kode Program</th>
                            <th className="px-2 py-1 border border-blue-200" rowSpan={2}>Uraian</th>
                            <th className="px-2 py-1 border border-blue-200" colSpan={3}>Rincian Perhitungan</th>
                            <th className="px-2 py-1 border border-blue-200" rowSpan={2}>Jumlah</th>
                          </tr>
                          <tr>
                            <th className="px-2 py-1 border border-blue-200">Volume</th>
                            <th className="px-2 py-1 border border-blue-200">Satuan</th>
                            <th className="px-2 py-1 border border-blue-200">Tarif Harga</th>
                          </tr>
                        </thead>
                        <tbody className="text-blue-700 bg-white">
                          <tr>
                            <td className="px-2 py-1 border border-blue-200">1</td>
                            <td className="px-2 py-1 border border-blue-200">5.1.02.01.01.0001</td>
                            <td className="px-2 py-1 border border-blue-200">5.01.01.2.01</td>
                            <td className="px-2 py-1 border border-blue-200 text-left">Buku Tulis 38 Lembar</td>
                            <td className="px-2 py-1 border border-blue-200">10</td>
                            <td className="px-2 py-1 border border-blue-200">Pak</td>
                            <td className="px-2 py-1 border border-blue-200">3.500</td>
                            <td className="px-2 py-1 border border-blue-200">35.000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-blue-600">✓ Header 2 baris dengan sub-kolom <strong>Rincian Perhitungan</strong> (Volume, Satuan, Tarif Harga)</p>
                    <p className="text-[11px] text-blue-600">✓ Target Folder: <strong className="text-blue-900">{activeFolderTitle}</strong></p>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 gap-2">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-indigo-900">{previewData.length} baris dari Excel</p>
                      <p className="text-[10px] sm:text-xs text-indigo-600">{selectedRows.size} dipilih • Target: {activeFolderTitle}</p>
                    </div>
                    <button onClick={toggleAll}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors font-medium whitespace-nowrap">
                      {selectedRows.size === previewData.length ? 'Batal Semua' : 'Pilih Semua'}
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
                      <table className="w-full text-xs min-w-[900px]">
                        <thead className="bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 w-10 sticky left-0 bg-slate-100 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                              <input type="checkbox" checked={selectedRows.size === previewData.length && previewData.length > 0} onChange={toggleAll} className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer" />
                            </th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600 sticky left-10 bg-slate-100 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">No</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600">Kode Kegiatan</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600">Kode Rekening</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600">Uraian</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-center font-bold text-blue-700">Jumlah Barang</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-right font-bold text-emerald-700">Harga Satuan</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-right font-bold text-indigo-700">Jumlah</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-center font-bold text-slate-600 sticky right-0 bg-slate-100 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">Aksi</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.map((row, idx) => {
                          const isEditing = editingPreviewIdx === idx;
                          const eRow = editingPreviewRow!;
                          const totalCalculated = (row.volume || 0) * (row.tarif_harga || 0);
                          return (
                            <tr key={idx} className={`transition-colors ${selectedRows.has(idx) ? 'bg-indigo-50/40' : 'hover:bg-slate-50'} ${isEditing ? 'bg-amber-50 ring-2 ring-inset ring-amber-400' : ''}`}>
                              <td className="px-2 sm:px-3 py-2 text-center sticky left-0 bg-white border-r border-slate-100">
                                <input type="checkbox" checked={selectedRows.has(idx)} onChange={() => toggleRow(idx)} className="w-3.5 h-3.5 rounded text-indigo-600 cursor-pointer" />
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-slate-500 font-medium sticky left-10 bg-white border-r border-slate-100">{idx + 1}</td>

                              {isEditing ? (
                                <>
                                  <td className="px-2 py-1"><input value={eRow.kode_program || ''} onChange={e => setEditingPreviewRow(r => r ? { ...r, kode_program: e.target.value } : r)} className="w-24 sm:w-28 border border-amber-300 rounded px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1"><input value={eRow.kode_rekening || ''} onChange={e => setEditingPreviewRow(r => r ? { ...r, kode_rekening: e.target.value } : r)} className="w-28 sm:w-32 border border-amber-300 rounded px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1"><input value={eRow.uraian} onChange={e => setEditingPreviewRow(r => r ? { ...r, uraian: e.target.value } : r)} className="w-40 sm:w-48 border border-amber-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1 text-center"><input type="number" min="1" value={eRow.volume} onChange={e => setEditingPreviewRow(r => r ? { ...r, volume: +e.target.value } : r)} className="w-14 sm:w-16 border border-blue-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50 font-bold" /></td>
                                  <td className="px-2 py-1 text-right"><input type="number" min="0" value={eRow.tarif_harga || 0} onChange={e => setEditingPreviewRow(r => r ? { ...r, tarif_harga: +e.target.value } : r)} className="w-24 sm:w-28 border border-emerald-300 rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-emerald-50" /></td>
                                  <td className="px-2 py-1 text-right font-bold text-indigo-700">Rp {((eRow.volume || 0) * (eRow.tarif_harga || 0)).toLocaleString('id-ID')}</td>
                                  <td className="px-2 py-1 sticky right-0 bg-amber-50 border-l border-slate-100">
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={() => saveEditPreview(idx)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors" title="Simpan"><Save className="h-3 w-3" /></button>
                                      <button onClick={cancelEditPreview} className="p-1 bg-slate-400 text-white rounded hover:bg-slate-500 transition-colors" title="Batal"><X className="h-3 w-3" /></button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-2 sm:px-3 py-2 text-slate-600 font-mono">{row.kode_program || '-'}</td>
                                  <td className="px-2 sm:px-3 py-2 text-indigo-600 font-mono font-semibold">{row.kode_rekening || '-'}</td>
                                  <td className="px-2 sm:px-3 py-2 font-medium text-slate-900">{row.uraian}</td>
                                  <td className="px-2 sm:px-3 py-2 text-center font-bold text-blue-700">{row.volume} {row.satuan}</td>
                                  <td className="px-2 sm:px-3 py-2 text-right font-semibold text-emerald-700">{row.tarif_harga ? `Rp ${row.tarif_harga.toLocaleString('id-ID')}` : '-'}</td>
                                  <td className="px-2 sm:px-3 py-2 text-right font-bold text-indigo-700">{totalCalculated > 0 ? `Rp ${totalCalculated.toLocaleString('id-ID')}` : (row.jumlah ? `Rp ${row.jumlah.toLocaleString('id-ID')}` : '-')}</td>
                                  <td className="px-2 sm:px-3 py-2 sticky right-0 bg-white border-l border-slate-100">
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
