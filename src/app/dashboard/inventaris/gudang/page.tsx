'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Boxes, Search, Plus, Edit2, Trash2, Upload,
  FileSpreadsheet, RefreshCw, TrendingUp, TrendingDown,
  Package, Layers, Download, Calendar, X, Save, AlertTriangle,
  ChevronLeft, ChevronRight, Folder, FolderOpen, ArrowLeft,
  Grid, List as ListIcon, HardDrive, FolderPlus, CheckCircle2,
  Warehouse, ArrowUpRight, ArrowDownLeft, AlertCircle,
  RotateCcw, Clock, Eye, Archive
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
  deleted_at?: string;
  sisa_hari?: number;
  inventaris_gudangs?: GudangItem[];
}

interface GudangItem {
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

interface PreviewRow {
  tanggal_pengambilan: string;
  kode: string;
  lokasi_rak?: string;
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
  lokasi_rak: 'Gudang Utama',
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

const getLokasiRak = (item: GudangItem): string => {
  if (!item.keterangan) return 'Gudang Utama';
  const match = item.keterangan.match(/Rak:\s*([^|]+)/i) || item.keterangan.match(/Lokasi:\s*([^|]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return 'Gudang Utama';
};

const getCleanKeterangan = (item: GudangItem): string => {
  if (!item.keterangan) return '';
  let s = item.keterangan;
  s = s.replace(/Rak:\s*[^|]+\|?/i, '');
  s = s.replace(/Lokasi:\s*[^|]+\|?/i, '');
  return s.trim().replace(/^\||\|$/g, '').trim();
};

const parseDate = (cell: unknown): string => {
  if (!cell) return '';
  if (cell instanceof Date) return cell.toISOString().split('T')[0];
  const s = String(cell).trim();
  if (!s) return '';
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try { return new Date(s).toISOString().split('T')[0]; } catch { return ''; }
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

/* ──────────────────── Excel Parser Gudang ──────────────────── */
function parseExcelFileGudang(file: File, activeFolderId: number | null): Promise<PreviewRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array', cellDates: true, raw: false });

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error('File Excel tidak memiliki sheet yang valid.');
        }

        // Find sheet with data
        let rows: unknown[][] = [];
        for (const name of wb.SheetNames) {
          const sheet = wb.Sheets[name];
          if (!sheet) continue;
          const parsedRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
          if (parsedRows && parsedRows.some(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && String(c).trim() !== ''))) {
            rows = parsedRows;
            break;
          }
        }

        if (!rows || rows.length === 0) {
          throw new Error('File Excel kosong atau tidak dapat dibaca.');
        }

        const result: PreviewRow[] = [];

        // ════════ ENGINE 1: SMART HEADER & COLUMN MAPPER ════════
        let h1Idx = -1;
        for (let i = 0; i < Math.min(rows.length, 25); i++) {
          if (!rows[i] || !Array.isArray(rows[i])) continue;
          const rowCells = rows[i].map(c => String(c ?? '').toLowerCase().trim());
          
          let headerMatchCount = 0;
          rowCells.forEach(cell => {
            if (
              cell.includes('no') ||
              cell.includes('tanggal') ||
              cell.includes('kode') ||
              cell.includes('nama') ||
              cell.includes('barang') ||
              cell.includes('uraian') ||
              cell.includes('satuan') ||
              cell.includes('stok') ||
              cell.includes('awal') ||
              cell.includes('masuk') ||
              cell.includes('keluar') ||
              cell.includes('akhir') ||
              cell === 'in' ||
              cell === 'out'
            ) {
              headerMatchCount++;
            }
          });

          if (headerMatchCount >= 2) {
            h1Idx = i;
            break;
          }
        }

        if (h1Idx !== -1) {
          const h1: string[] = rows[h1Idx].map(c => String(c ?? '').trim().toLowerCase());
          const h2Raw = rows[h1Idx + 1] ?? [];
          const h2: string[] = Array.isArray(h2Raw) ? h2Raw.map(c => String(c ?? '').trim().toLowerCase()) : [];
          const h2Text = h2.join(' ');
          const hasSubHeader =
            /\bawal\b/.test(h2Text) || /\bakhir\b/.test(h2Text) ||
            /\bin\b/.test(h2Text) || /\bout\b/.test(h2Text) ||
            /\bmasuk\b/.test(h2Text) || /\bkeluar\b/.test(h2Text);

          const maxCols = Math.max(h1.length, h2.length);
          const combined: string[] = Array.from({ length: maxCols }, (_, i) =>
            `${h1[i] ?? ''} ${h2[i] ?? ''}`.trim()
          );

          const colMap: Record<string, number> = {};
          combined.forEach((c, i) => {
            const v1 = h1[i] ?? '';
            const v2 = h2[i] ?? '';

            if (colMap.tanggal === undefined && c.includes('tanggal')) colMap.tanggal = i;
            if (colMap.lokasi_rak === undefined && (c.includes('rak') || c.includes('lokasi'))) colMap.lokasi_rak = i;
            if (colMap.nama_barang === undefined && (c.includes('nama') || c.includes('barang') || c.includes('uraian'))) colMap.nama_barang = i;
            if (colMap.satuan === undefined && c.includes('satuan')) colMap.satuan = i;

            if (colMap.stok_awal === undefined && (c.includes('awal') || v1 === 'awal' || v2 === 'awal')) colMap.stok_awal = i;
            if (colMap.stok_masuk === undefined && (c.includes('masuk') || v2 === 'in' || v1 === 'in' || c === 'in' || c.endsWith(' in') || c.startsWith('in '))) colMap.stok_masuk = i;
            if (colMap.stok_keluar === undefined && (c.includes('keluar') || v2 === 'out' || v1 === 'out' || c === 'out' || c.endsWith(' out') || c.startsWith('out '))) colMap.stok_keluar = i;
            if (colMap.stok_akhir === undefined && (c.includes('akhir') || v2 === 'akhir' || v1 === 'akhir' || c.includes('saldo'))) colMap.stok_akhir = i;

            if (colMap.kode === undefined && (v1 === 'kode' || (c.includes('kode') && !c.includes('kegiatan') && !c.includes('rekening')))) {
              colMap.kode = i;
            }
            if (colMap.keterangan === undefined && (c.includes('keterangan') || v1 === 'ket' || v2 === 'ket')) colMap.keterangan = i;
          });

          if (colMap.nama_barang === undefined) {
            h1.forEach((v1, i) => {
              if (v1.includes('nama') || v1.includes('barang') || v1.includes('uraian')) colMap.nama_barang = i;
            });
          }
          if (colMap.nama_barang === undefined && maxCols >= 4) {
            colMap.nama_barang = 3;
          }

          const dataStart = h1Idx + (hasSubHeader ? 2 : 1);
          let autoIdx = 1;

          for (let i = dataStart; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !Array.isArray(row) || row.every(c => c === null || c === undefined || String(c).trim() === '')) continue;

            let nama = '';
            if (colMap.nama_barang !== undefined && row[colMap.nama_barang] !== undefined && row[colMap.nama_barang] !== null) {
              nama = String(row[colMap.nama_barang] ?? '').trim();
            }

            if (!nama) {
              for (let cIdx = 0; cIdx < row.length; cIdx++) {
                const cellVal = String(row[cIdx] ?? '').trim();
                if (cellVal && isNaN(Number(cellVal)) && !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(cellVal) && cellVal.length > 2 && !['unit', 'pcs', 'set', 'sak'].includes(cellVal.toLowerCase())) {
                  nama = cellVal;
                  break;
                }
              }
            }

            if (!nama) continue;

            const namaLower = nama.toLowerCase();
            if (namaLower === 'nama barang' || namaLower === 'uraian' || namaLower.startsWith('total') || namaLower.startsWith('jumlah') || namaLower === 'stok') continue;

            const tgl = parseDate(colMap.tanggal !== undefined ? row[colMap.tanggal] : null);
            const rak = colMap.lokasi_rak !== undefined ? String(row[colMap.lokasi_rak] ?? '').trim() : 'Gudang Utama';
            const rawKode = colMap.kode !== undefined ? String(row[colMap.kode] ?? '').trim() : '';
            const kode = rawKode;

            const awal = parseNum(colMap.stok_awal !== undefined ? row[colMap.stok_awal] : 0);
            const masuk = parseNum(colMap.stok_masuk !== undefined ? row[colMap.stok_masuk] : 0);
            const keluar = parseNum(colMap.stok_keluar !== undefined ? row[colMap.stok_keluar] : 0);
            const akhir = awal + masuk - keluar;

            const rawSatuan = colMap.satuan !== undefined ? String(row[colMap.satuan] ?? '').trim() : '';
            const satuan = rawSatuan || 'Unit';

            let ketParts: string[] = [];
            if (rak && rak !== 'Gudang Utama') ketParts.push(`Rak: ${rak}`);
            if (colMap.keterangan !== undefined && row[colMap.keterangan]) {
              const userKet = String(row[colMap.keterangan]).trim();
              if (userKet) ketParts.push(userKet);
            }

            result.push({
              tanggal_pengambilan: tgl,
              kode,
              lokasi_rak: rak,
              nama_barang: nama,
              satuan,
              stok_awal: awal,
              stok_masuk: masuk,
              stok_keluar: keluar,
              stok_akhir: akhir,
              keterangan: ketParts.join(' | '),
              id_folder: activeFolderId,
            });
            autoIdx++;
          }
        }

        // ════════ ENGINE 2: UNIVERSAL FALLBACK ROW SCANNER ════════
        if (result.length === 0) {
          let fallbackAutoIdx = 1;
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !Array.isArray(row) || row.every(c => c === null || c === undefined || String(c).trim() === '')) continue;

            const rowTexts = row.map(c => String(c ?? '').trim());
            const fullText = rowTexts.join(' ').toLowerCase();

            // Skip header/footer summary rows
            if (
              fullText.includes('tanggal pengambilan') ||
              fullText.includes('nama barang') ||
              fullText.startsWith('total') ||
              fullText.startsWith('jumlah')
            ) continue;

            let nama = '';
            let tgl = new Date().toISOString().split('T')[0];
            let kode = '';
            let satuan = 'Unit';
            const numbers: number[] = [];

            rowTexts.forEach((val) => {
              if (!val) return;

              if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(val) || /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                tgl = parseDate(val);
                return;
              }

              if (/^\d+$/.test(val) || /^\d+[\.,]\d+$/.test(val)) {
                numbers.push(parseNum(val));
                return;
              }

              const valLower = val.toLowerCase();
              if (['unit', 'pcs', 'set', 'sak', 'kaleng', 'roll', 'box', 'buah', 'meter', 'kg', 'liter', 'pack'].includes(valLower)) {
                satuan = val;
                return;
              }

              if (!nama && val.length >= 2 && !['no', 'kode', 'stok', 'awal', 'in', 'out', 'akhir'].includes(valLower)) {
                nama = val;
              } else if (!kode && (valLower.startsWith('gdg') || valLower.includes('-') || /^[a-z0-9]{3,}$/i.test(val))) {
                kode = val;
              }
            });

            if (!nama) continue;

            const stokAwal = numbers[0] !== undefined ? numbers[0] : 0;
            const stokMasuk = numbers[1] !== undefined ? numbers[1] : 0;
            const stokKeluar = numbers[2] !== undefined ? numbers[2] : 0;
            const stokAkhir = stokAwal + stokMasuk - stokKeluar;

            result.push({
              tanggal_pengambilan: tgl,
              kode: kode || '',
              lokasi_rak: 'Gudang Utama',
              nama_barang: nama,
              satuan,
              stok_awal: stokAwal,
              stok_masuk: stokMasuk,
              stok_keluar: stokKeluar,
              stok_akhir: stokAkhir,
              keterangan: '',
              id_folder: activeFolderId,
            });
            fallbackAutoIdx++;
          }
        }

        if (result.length === 0) throw new Error('Tidak ada data gudang valid ditemukan di file Excel.');
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
export default function InventarisGudangPage() {
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [data, setData] = useState<GudangItem[]>([]);
  const [filtered, setFiltered] = useState<GudangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });

  // Navigation: null = Root Folder Grid, number = Inside Folder ID, -1 = Uncategorized
  const [activeFolderId, setActiveFolderId] = useState<number | null | -1>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'all'>('folders');

  // Pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  // Folder CRUD modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editFolderTarget, setEditFolderTarget] = useState<CustomFolder | null>(null);
  const [folderForm, setFolderForm] = useState({ nama_folder: '', keterangan: '', warna: 'emerald' });
  const [savingFolder, setSavingFolder] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<CustomFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  // Trash bin state
  const [trashFolders, setTrashFolders] = useState<CustomFolder[]>([]);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [viewingTrashFolder, setViewingTrashFolder] = useState<CustomFolder | null>(null);
  const [actionTrashLoading, setActionTrashLoading] = useState<number | 'empty' | null>(null);
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);
  const [confirmForceDeleteTarget, setConfirmForceDeleteTarget] = useState<CustomFolder | null>(null);

  // Item CRUD modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState<GudangItem | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm(null));
  const [saving, setSaving] = useState(false);

  // Quick Mutasi Modal (+ / - stok)
  const [showMutasiModal, setShowMutasiModal] = useState(false);
  const [mutasiTarget, setMutasiTarget] = useState<GudangItem | null>(null);
  const [mutasiType, setMutasiType] = useState<'in' | 'out'>('in');
  const [mutasiJumlah, setMutasiJumlah] = useState<number>(1);
  const [mutasiKet, setMutasiKet] = useState<string>('');
  const [savingMutasi, setSavingMutasi] = useState(false);

  // Delete item confirm
  const [deleteTarget, setDeleteTarget] = useState<GudangItem | null>(null);
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

  /* ── Fetch Folders List Gudang ── */
  const fetchFolders = useCallback(async () => {
    try {
      const res = await axios.get('/api/folder-inventaris?jenis=inventaris-gudang');
      if (res.data.status === 'success') {
        setFolders(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* ── Fetch Trashed Folders (Recycle Bin) ── */
  const fetchTrashFolders = useCallback(async () => {
    try {
      setLoadingTrash(true);
      const res = await axios.get('/api/folder-inventaris/trash?jenis=inventaris-gudang');
      if (res.data?.status === 'success') {
        setTrashFolders(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTrash(false);
    }
  }, []);

  /* ── Fetch Inventaris Gudang Items ── */
  const fetchData = useCallback(async (folderId: number | null | -1 = activeFolderId) => {
    try {
      setLoading(true);
      let url = '/api/inventaris-gudang';
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

  useEffect(() => {
    fetchFolders();
    fetchTrashFolders();
  }, [fetchFolders, fetchTrashFolders]);

  useEffect(() => {
    fetchData(activeFolderId);
  }, [activeFolderId, fetchData]);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFiltered(data.filter(item =>
      item.nama_barang.toLowerCase().includes(q) ||
      item.kode.toLowerCase().includes(q) ||
      item.satuan.toLowerCase().includes(q) ||
      (item.keterangan && item.keterangan.toLowerCase().includes(q)) ||
      item.folder?.nama_folder.toLowerCase().includes(q)
    ));
    setPage(1);
  }, [searchQuery, data]);

  /* ── Get Active Folder Object ── */
  const activeFolderObj = folders.find(f => f.id === activeFolderId);
  const activeFolderTitle = activeFolderId === -1
    ? 'File Gudang Tanpa Folder'
    : (activeFolderObj ? activeFolderObj.nama_folder : 'Semua Gudang');

  /* ── FOLDER CRUD HANDLERS ── */
  const openCreateFolder = () => {
    setEditFolderTarget(null);
    setFolderForm({ nama_folder: '', keterangan: '', warna: 'emerald' });
    setShowFolderModal(true);
  };

  const openEditFolder = (f: CustomFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditFolderTarget(f);
    setFolderForm({ nama_folder: f.nama_folder, keterangan: f.keterangan || '', warna: f.warna || 'emerald' });
    setShowFolderModal(true);
  };

  const handleSaveFolder = async () => {
    if (!folderForm.nama_folder.trim()) { showToast('Nama folder wajib diisi', 'error'); return; }
    try {
      setSavingFolder(true);
      const payload = { ...folderForm, jenis: 'inventaris-gudang' };
      if (editFolderTarget) {
        await axios.put(`/api/folder-inventaris/${editFolderTarget.id}`, payload);
        showToast('Folder gudang berhasil diperbarui', 'success');
      } else {
        await axios.post('/api/folder-inventaris', payload);
        showToast('Folder gudang baru berhasil dibuat', 'success');
      }
      setShowFolderModal(false);
      fetchFolders();
    } catch {
      showToast('Gagal menyimpan folder gudang', 'error');
    } finally { setSavingFolder(false); }
  };

  // ── Pindahkan ke Tempat Sampah (Soft Delete - 30 Hari) ──
  const handleSoftDeleteFolder = async (folder: CustomFolder) => {
    try {
      setDeletingFolder(true);
      const res = await axios.delete(`/api/folder-inventaris/${folder.id}`);
      showToast(res.data?.message || 'Folder berhasil dipindahkan ke tempat sampah', 'success');
      setDeleteFolderTarget(null);
      if (activeFolderId === folder.id) setActiveFolderId(null);
      fetchFolders();
      fetchData();
      fetchTrashFolders();
    } catch {
      showToast('Gagal memindahkan folder ke tempat sampah', 'error');
    } finally {
      setDeletingFolder(false);
    }
  };

  // ── Hapus Permanen Sekarang (Hard Delete Langsung) ──
  const handleForceDeleteFolder = async (folder: CustomFolder) => {
    try {
      setDeletingFolder(true);
      const res = await axios.delete(`/api/folder-inventaris/${folder.id}/force`);
      showToast(res.data?.message || 'Folder dan seluruh isinya berhasil dihapus permanen', 'success');
      setDeleteFolderTarget(null);
      setConfirmForceDeleteTarget(null);
      if (viewingTrashFolder?.id === folder.id) setViewingTrashFolder(null);
      if (activeFolderId === folder.id) setActiveFolderId(null);
      fetchFolders();
      fetchData();
      fetchTrashFolders();
    } catch {
      showToast('Gagal menghapus folder permanen', 'error');
    } finally {
      setDeletingFolder(false);
    }
  };

  // ── Pulihkan Folder dari Tempat Sampah (Restore) ──
  const handleRestoreFolder = async (folderId: number) => {
    try {
      setActionTrashLoading(folderId);
      const res = await axios.post(`/api/folder-inventaris/${folderId}/restore`);
      showToast(res.data?.message || 'Folder berhasil dipulihkan dari tempat sampah', 'success');
      if (viewingTrashFolder?.id === folderId) setViewingTrashFolder(null);
      fetchFolders();
      fetchData();
      fetchTrashFolders();
    } catch {
      showToast('Gagal memulihkan folder dari tempat sampah', 'error');
    } finally {
      setActionTrashLoading(null);
    }
  };

  // ── Kosongkan Seluruh Tempat Sampah ──
  const handleEmptyTrash = async () => {
    try {
      setActionTrashLoading('empty');
      const res = await axios.delete('/api/folder-inventaris/trash/empty?jenis=inventaris-gudang');
      showToast(res.data?.message || 'Tempat sampah berhasil dikosongkan', 'success');
      setShowEmptyTrashConfirm(false);
      setViewingTrashFolder(null);
      fetchFolders();
      fetchData();
      fetchTrashFolders();
    } catch {
      showToast('Gagal mengosongkan tempat sampah', 'error');
    } finally {
      setActionTrashLoading(null);
    }
  };

  /* ── ITEM CRUD HANDLERS ── */
  const openAdd = () => {
    const defaultFolder = activeFolderId && activeFolderId > 0 ? activeFolderId : null;
    setEditTarget(null);
    setFormData(emptyForm(defaultFolder));
    setShowFormModal(true);
  };

  const openEdit = (item: GudangItem) => {
    setEditTarget(item);
    setFormData({
      tanggal_pengambilan: item.tanggal_pengambilan || '',
      kode: item.kode || '',
      lokasi_rak: getLokasiRak(item),
      nama_barang: item.nama_barang || '',
      satuan: item.satuan || 'Unit',
      stok_awal: item.stok_awal,
      stok_masuk: item.stok_masuk,
      stok_keluar: item.stok_keluar,
      keterangan: getCleanKeterangan(item),
      id_folder: item.id_folder || null,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.nama_barang.trim()) { showToast('Nama barang wajib diisi', 'error'); return; }
    try {
      setSaving(true);
      const ketFormatted = `Rak: ${formData.lokasi_rak || 'Gudang Utama'}${formData.keterangan ? ' | ' + formData.keterangan : ''}`;
      const payload = {
        tanggal_pengambilan: formData.tanggal_pengambilan,
        kode: formData.kode,
        nama_barang: formData.nama_barang,
        satuan: formData.satuan,
        stok_awal: formData.stok_awal,
        stok_masuk: formData.stok_masuk,
        stok_keluar: formData.stok_keluar,
        keterangan: ketFormatted,
        id_folder: formData.id_folder,
      };

      if (editTarget) {
        await axios.put(`/api/inventaris-gudang/${editTarget.id}`, payload);
        showToast('Data stok gudang berhasil diupdate', 'success');
      } else {
        await axios.post('/api/inventaris-gudang', payload);
        showToast('Data stok gudang berhasil ditambahkan', 'success');
      }
      setShowFormModal(false);
      fetchData(); fetchFolders();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan data gudang';
      showToast(msg, 'error');
    } finally { setSaving(false); }
  };

  /* ── Mutasi Quick Modal (+ / -) ── */
  const openMutasi = (item: GudangItem, type: 'in' | 'out') => {
    setMutasiTarget(item);
    setMutasiType(type);
    setMutasiJumlah(1);
    setMutasiKet(type === 'in' ? 'Restock / Penambahan Stok' : 'Pengeluaran Barang');
    setShowMutasiModal(true);
  };

  const handleSaveMutasi = async () => {
    if (!mutasiTarget || mutasiJumlah <= 0) { showToast('Jumlah mutasi minimal 1 unit', 'warning'); return; }
    try {
      setSavingMutasi(true);
      const isAdd = mutasiType === 'in';
      const newMasuk = isAdd ? (mutasiTarget.stok_masuk + mutasiJumlah) : mutasiTarget.stok_masuk;
      const newKeluar = !isAdd ? (mutasiTarget.stok_keluar + mutasiJumlah) : mutasiTarget.stok_keluar;

      const payload = {
        tanggal_pengambilan: mutasiTarget.tanggal_pengambilan,
        kode: mutasiTarget.kode,
        nama_barang: mutasiTarget.nama_barang,
        satuan: mutasiTarget.satuan,
        stok_awal: mutasiTarget.stok_awal,
        stok_masuk: newMasuk,
        stok_keluar: newKeluar,
        keterangan: mutasiTarget.keterangan,
        id_folder: mutasiTarget.id_folder,
      };

      await axios.put(`/api/inventaris-gudang/${mutasiTarget.id}`, payload);
      showToast(`Berhasil ${isAdd ? 'tambah' : 'kurang'} stok (${mutasiJumlah} ${mutasiTarget.satuan})`, 'success');
      setShowMutasiModal(false);
      fetchData();
    } catch {
      showToast('Gagal memproses mutasi stok', 'error');
    } finally { setSavingMutasi(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await axios.delete(`/api/inventaris-gudang/${deleteTarget.id}`);
      showToast('Barang gudang berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData(); fetchFolders();
    } catch {
      showToast('Gagal menghapus data gudang', 'error');
    } finally { setDeleting(false); }
  };

  /* ── Import Excel Gudang ── */
  const handleFileSelect = async (file: File) => {
    setParseError('');
    setImportFile(file);
    try {
      const defaultFolder = activeFolderId && activeFolderId > 0 ? activeFolderId : null;
      const parsed = await parseExcelFileGudang(file, defaultFolder);
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

  const handleImportSelected = async () => {
    const rows = Array.from(selectedRows).map(i => previewData[i]);
    if (rows.length === 0) {
      showToast('Pilih minimal 1 data untuk di-import', 'warning');
      return;
    }

    setImporting(true);
    setImportState('importing');

    try {
      // Kirim data yang sudah diverifikasi dan ditampilkan di preview ke batch-store
      const res = await axios.post('/api/inventaris-gudang/batch-store', {
        items: rows,
        id_folder: activeFolderId && activeFolderId > 0 ? activeFolderId : null,
      });

      setImportState('completed');
      setTimeout(() => {
        if (res.data.status === 'success') {
          showToast(res.data.message || `Berhasil meng-import ${rows.length} data gudang!`, 'success');
          closeImport();
          fetchData();
          fetchFolders();
        } else {
          showToast(res.data.message || 'Gagal import data gudang', 'error');
        }
      }, 600);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal meng-import data Excel';
      showToast(msg, 'error');
      setImportState('idle');
    } finally {
      setImporting(false);
    }
  };

  const closeImport = () => {
    setShowImportModal(false); setShowPreview(false);
    setImportFile(null); setPreviewData([]); setSelectedRows(new Set());
    setParseError(''); setEditingPreviewIdx(null);
  };

  /* ── Export Excel Gudang ── */
  const handleExport = () => {
    if (!filtered.length) { showToast('Tidak ada data untuk diexport', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(filtered.map(it => ({
      'Folder': it.folder?.nama_folder || 'File Tanpa Folder',
      'Tanggal Pengambilan': it.tanggal_pengambilan ? new Date(it.tanggal_pengambilan).toLocaleDateString('id-ID') : '-',
      'Lokasi / Rak': getLokasiRak(it),
      'Kode Barang': it.kode,
      'Nama Barang': it.nama_barang,
      'Satuan': it.satuan,
      'Stok Awal': it.stok_awal,
      'Barang Masuk (IN)': it.stok_masuk,
      'Barang Keluar (OUT)': it.stok_keluar,
      'Stok Akhir': it.stok_akhir,
      'Status Stok': it.stok_akhir <= 0 ? 'Habis' : (it.stok_akhir <= 5 ? 'Menipis' : 'Aman'),
      'Keterangan': getCleanKeterangan(it) || '-',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaris Gudang');
    const folderLabel = activeFolderId ? (activeFolderObj?.nama_folder || 'Umum') : 'Semua';
    XLSX.writeFile(wb, `Inventaris_Gudang_${folderLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast(`Export ${filtered.length} data gudang berhasil`, 'success');
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['NO', 'TANGGAL PENGAMBILAN', 'KODE', 'NAMA BARANG', 'SATUAN', 'STOK', '', '', ''],
      ['', '', '', '', '', 'AWAL', 'IN', 'OUT', 'AKHIR'],
      [1, '08/07/2026', '', 'Mesin Pengasah Endmill', 'Unit', 1, 0, 1, 0],
      [2, '08/07/2026', 'GDG-0002', 'Semen Gresik 50kg', 'Sak', 50, 20, 10, 60],
      [3, '09/07/2026', 'GDG-0003', 'Cat Tembok Nippon Paint 5kg', 'Kaleng', 15, 0, 3, 12],
    ]);
    ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 16 }, { wch: 35 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Gudang');
    XLSX.writeFile(wb, 'Template_Inventaris_Gudang.xlsx');
    showToast('Template Gudang berhasil didownload', 'success');
  };

  /* ── Pagination ── */
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const totalSKU = filtered.length;
  const totalStokFisik = filtered.reduce((s, it) => s + (it.stok_akhir || 0), 0);
  const totalMasuk = filtered.reduce((s, it) => s + (it.stok_masuk || 0), 0);
  const totalKeluar = filtered.reduce((s, it) => s + (it.stok_keluar || 0), 0);
  const totalMenipis = filtered.filter(it => (it.stok_akhir || 0) <= 5).length;

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="p-6 space-y-6">
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, show: false }))} />
      )}

      {/* Header Banner Gudang */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-12 translate-x-12" />
        <div className="flex items-center justify-between relative z-10 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl ring-1 ring-white/30">
              <Warehouse className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Inventaris Gudang Drive</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/20">
                  Modul Stok & Gudang Utama
                </span>
              </div>
              <p className="text-emerald-100 text-sm mt-1">Manajemen stok barang gudang, lokasi rak, serta pencatatan barang masuk & keluar</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFolderId === null && (
              <button
                onClick={openCreateFolder}
                className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <FolderPlus className="h-4 w-4 text-emerald-600" /> + Buat Folder Gudang
              </button>
            )}
            <button
              onClick={() => { setActiveFolderId(null); setViewMode('folders'); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeFolderId === null && viewMode === 'folders'
                  ? 'bg-white text-emerald-800 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              <Grid className="h-4 w-4" /> Folder Gudang
            </button>
            <button
              onClick={() => { setActiveFolderId(null); setViewMode('all'); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeFolderId === null && viewMode === 'all'
                  ? 'bg-white text-emerald-800 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              <ListIcon className="h-4 w-4" /> Semua Barang Gudang
            </button>
            <button
              onClick={() => { setShowTrashModal(true); fetchTrashFolders(); }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-rose-500/25 hover:bg-rose-500/35 text-white backdrop-blur-sm border border-rose-300/30 shadow-sm"
              title="Tempat Sampah Folder Gudang"
            >
              <Trash2 className="h-4 w-4 text-rose-200" />
              <span>Tempat Sampah</span>
              {trashFolders.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded-full leading-none shadow-sm">
                  {trashFolders.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <button
            onClick={() => setActiveFolderId(null)}
            className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-700"
          >
            <Warehouse className="h-4 w-4 text-emerald-600" />
            <span>Inventaris Gudang</span>
          </button>

          {activeFolderId !== null && (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 font-bold">
                <FolderOpen className="h-4 w-4 text-emerald-600" />
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
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Semua Folder Gudang
          </button>
        )}
      </div>

      {/* Summary Cards Gudang */}
      {(activeFolderId !== null || viewMode === 'all') && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg">
                <Boxes className="h-4 w-4 text-white" />
              </div>
              <p className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wide">Total SKU Barang</p>
            </div>
            <p className="text-2xl font-extrabold text-emerald-900">{totalSKU} <span className="text-sm font-normal text-emerald-700">Jenis</span></p>
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-700 rounded-lg">
                <Layers className="h-4 w-4 text-white" />
              </div>
              <p className="text-[11px] font-semibold text-teal-900 uppercase tracking-wide">Stok Fisik Gudang</p>
            </div>
            <p className="text-2xl font-extrabold text-teal-900">{totalStokFisik} <span className="text-sm font-normal text-teal-700">Unit</span></p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg">
                <ArrowDownLeft className="h-4 w-4 text-white" />
              </div>
              <p className="text-[11px] font-semibold text-blue-900 uppercase tracking-wide">Barang Masuk (IN)</p>
            </div>
            <p className="text-2xl font-extrabold text-blue-900">+{totalMasuk} <span className="text-sm font-normal text-blue-700">Unit</span></p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg">
                <ArrowUpRight className="h-4 w-4 text-white" />
              </div>
              <p className="text-[11px] font-semibold text-orange-900 uppercase tracking-wide">Barang Keluar (OUT)</p>
            </div>
            <p className="text-2xl font-extrabold text-orange-900">-{totalKeluar} <span className="text-sm font-normal text-orange-700">Unit</span></p>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-700 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <p className="text-[11px] font-semibold text-rose-900 uppercase tracking-wide">Stok Menipis / Re-stock</p>
            </div>
            <p className="text-2xl font-extrabold text-rose-900">{totalMenipis} <span className="text-sm font-normal text-rose-700">SKU</span></p>
          </div>
        </div>
      )}

      {/* ════════ FOLDER GRID VIEW GUDANG ════════ */}
      {activeFolderId === null && viewMode === 'folders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Folder className="h-5 w-5 text-emerald-500 fill-emerald-500/20" />
              Folder Gudang ({folders.length})
            </h2>
            <button
              onClick={openCreateFolder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" /> + Buat Folder Gudang
            </button>
          </div>

          {folders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <FolderPlus className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">Belum Ada Folder Gudang</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Buat folder khusus untuk mengelompokkan stok gudang per sektor, rak, atau jenis material.
              </p>
              <button
                onClick={openCreateFolder}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-xs font-semibold shadow-sm transition-colors"
              >
                <FolderPlus className="h-4 w-4" /> Buat Folder Gudang Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {folders.map((f) => {
                const colorKey = f.warna || 'emerald';
                const color = folderColorMap[colorKey] || folderColorMap.emerald;
                const folderItems = data.filter(item => Number(item.id_folder) === f.id);
                const totalStokInFolder = folderItems.reduce((sum, item) => sum + (item.stok_akhir || 0), 0);

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
                      <div className="mt-3 space-y-1 pt-2 border-t border-black/5">
                        <p className="text-xs text-slate-600 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-700">{f.items_count ?? folderItems.length}</span> SKU
                          </span>
                          <span className="font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                            {totalStokInFolder} Unit
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Folder Default / Umum Gudang */}
              {(() => {
                const looseItems = data.filter(item => !item.id_folder);
                const looseStok = looseItems.reduce((sum, item) => sum + (item.stok_akhir || 0), 0);
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
                        File Gudang Tanpa Folder
                      </h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">Barang gudang tanpa folder khusus</p>
                      <div className="mt-3 space-y-1 pt-2 border-t border-slate-200/60">
                        <p className="text-xs text-slate-600 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-700">{looseItems.length}</span> SKU
                          </span>
                          <span className="font-bold text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded">
                            {looseStok} Unit
                          </span>
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

      {/* ════════ TABEL STOK GUDANG ════════ */}
      {(activeFolderId !== null || viewMode === 'all') && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text" placeholder={`Cari stok gudang di ${activeFolderTitle}...`}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => fetchData()} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors" title="Refresh">
                  <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={handleExport} disabled={!filtered.length}
                  className="flex items-center gap-2 px-3 py-2.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors font-medium">
                  <Download className="h-4 w-4" /><span className="hidden sm:inline">Export Excel</span>
                </button>
                <button onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-3 py-2.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors font-medium">
                  <FileSpreadsheet className="h-4 w-4" /><span className="hidden sm:inline">Import Excel</span>
                </button>
                <button onClick={openAdd}
                  className="flex items-center gap-2 px-3 py-2.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm">
                  <Plus className="h-4 w-4" /><span className="hidden sm:inline">Tambah Stok Barang</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-emerald-600" />
                  Stok Barang Gudang — {activeFolderTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {filtered.length} SKU barang gudang {searchQuery ? `(dari ${data.length})` : ''}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
                </div>
              ) : paged.length === 0 ? (
                <div className="text-center py-16">
                  <Boxes className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-slate-600 font-medium">{searchQuery ? 'Tidak ada stok barang sesuai pencarian' : `Belum ada barang di ${activeFolderTitle}`}</h3>
                  {!searchQuery && (
                    <button onClick={() => setShowImportModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
                      <FileSpreadsheet className="h-4 w-4" /> Import Excel Gudang
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">No</th>
                      {viewMode === 'all' && <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Folder</th>}
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Tanggal Pengambilan</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Lokasi / Rak</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Kode Barang</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-left">Nama Barang / Spesifikasi</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-center">Satuan</th>
                      <th className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wide text-center">Awal</th>
                      <th className="px-4 py-3 text-xs font-bold text-emerald-700 uppercase tracking-wide text-center">IN (+)</th>
                      <th className="px-4 py-3 text-xs font-bold text-orange-700 uppercase tracking-wide text-center">OUT (-)</th>
                      <th className="px-4 py-3 text-xs font-bold text-purple-700 uppercase tracking-wide text-center">Stok Akhir</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-center">Status</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map((item, i) => {
                      const rak = getLokasiRak(item);
                      const cleanKet = getCleanKeterangan(item);
                      const isLow = item.stok_akhir <= 5 && item.stok_akhir > 0;
                      const isEmpty = item.stok_akhir <= 0;

                      return (
                        <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors group">
                          <td className="px-4 py-3 text-slate-500 text-xs">{(page - 1) * PER_PAGE + i + 1}</td>
                          {viewMode === 'all' && (
                            <td className="px-4 py-3 text-xs font-medium text-slate-700">
                              {item.folder ? (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold border border-emerald-100 flex items-center gap-1 w-fit">
                                  <Folder className="h-3 w-3" /> {item.folder.nama_folder}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">Umum</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap">
                            {item.tanggal_pengambilan ? (
                              <span className="text-slate-600 font-medium">
                                {new Date(item.tanggal_pengambilan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700 text-xs font-semibold whitespace-nowrap">
                            <span className="px-2 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-200/70 inline-block">
                              📍 {rak}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold">{item.kode}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{item.nama_barang}</div>
                            {cleanKet && <div className="text-xs text-slate-400 truncate max-w-[220px]">{cleanKet}</div>}
                          </td>
                          <td className="px-4 py-3 text-center"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.satuan}</span></td>
                          <td className="px-4 py-3 text-center"><span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">{item.stok_awal}</span></td>
                          <td className="px-4 py-3 text-center"><span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">+{item.stok_masuk}</span></td>
                          <td className="px-4 py-3 text-center"><span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg border border-orange-200">-{item.stok_keluar}</span></td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-1 text-xs font-black rounded-lg border ${isEmpty ? 'bg-red-100 text-red-700 border-red-200' : (isLow ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-purple-100 text-purple-700 border-purple-200')}`}>
                              {item.stok_akhir}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isEmpty ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full border border-red-200 inline-flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Habis
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200 inline-flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Menipis
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Safe
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openMutasi(item, 'in')} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors" title="+ Tambah Masuk">
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => openMutasi(item, 'out')} className="p-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors" title="- Catat Keluar">
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
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
                <FolderPlus className="h-5 w-5 text-emerald-600" />
                {editFolderTarget ? 'Edit Folder Gudang' : 'Buat Folder Gudang Baru'}
              </h3>
              <button onClick={() => setShowFolderModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Folder Gudang <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={folderForm.nama_folder}
                  onChange={e => setFolderForm(f => ({ ...f, nama_folder: e.target.value }))}
                  placeholder="Misal: Material Bangunan, Perkakas Bengkel, Bahan DKV..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Sektor Rak</label>
                <textarea
                  value={folderForm.keterangan}
                  onChange={e => setFolderForm(f => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Deskripsi singkat area / rak tempat penyimpanan..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Warna Label Folder</label>
                <div className="flex items-center gap-2">
                  {['emerald', 'blue', 'indigo', 'purple', 'amber', 'rose'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFolderForm(f => ({ ...f, warna: color }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${folderColorMap[color].iconBg} ${
                        folderForm.warna === color ? 'scale-110 border-slate-900 ring-2 ring-emerald-300' : 'border-transparent opacity-80 hover:opacity-100'
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
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
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

      {/* ════════ DELETE / TRASH FOLDER OPTIONS MODAL ════════ */}
      {deleteFolderTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 border border-slate-100">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-900">Hapus Folder</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  &ldquo;<span className="font-medium text-slate-700">{deleteFolderTarget.nama_folder}</span>&rdquo;
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() => handleSoftDeleteFolder(deleteFolderTarget)}
                disabled={deletingFolder}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 transition-colors flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Archive className="h-4 w-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">Pindahkan ke Sampah</p>
                    <p className="text-[11px] text-slate-400">Tersimpan selama 30 hari</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-700 shrink-0">Pilih</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = deleteFolderTarget;
                  setDeleteFolderTarget(null);
                  setConfirmForceDeleteTarget(target);
                }}
                disabled={deletingFolder}
                className="w-full text-left px-3.5 py-2.5 rounded-xl border border-rose-100 hover:border-rose-200 hover:bg-rose-50/40 transition-colors flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Trash2 className="h-4 w-4 text-rose-400 group-hover:text-rose-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-rose-700">Hapus Permanen</p>
                    <p className="text-[11px] text-rose-400/80">Langsung dihapus permanen</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-rose-400 group-hover:text-rose-600 shrink-0">Pilih</span>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setDeleteFolderTarget(null)}
                disabled={deletingFolder}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ CONFIRM FORCE DELETE MODAL ════════ */}
      {confirmForceDeleteTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 border border-slate-100">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Hapus Permanen?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Folder <strong className="text-slate-800">&quot;{confirmForceDeleteTarget.nama_folder}&quot;</strong> dan seluruh data barang di dalamnya akan dihapus permanen dan tidak dapat dipulihkan.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => setConfirmForceDeleteTarget(null)}
                disabled={deletingFolder}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleForceDeleteFolder(confirmForceDeleteTarget)}
                disabled={deletingFolder}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {deletingFolder ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{deletingFolder ? 'Menghapus...' : 'Hapus'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ CONFIRM EMPTY TRASH MODAL ════════ */}
      {showEmptyTrashConfirm && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
              <Trash2 className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Kosongkan Tempat Sampah?</h3>
            <p className="text-xs text-slate-600 mb-4">
              Semua folder ({trashFolders.length}) dan seluruh data barang di dalamnya akan dihapus secara permanen dari database. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmptyTrashConfirm(false)}
                disabled={actionTrashLoading === 'empty'}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleEmptyTrash}
                disabled={actionTrashLoading === 'empty'}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {actionTrashLoading === 'empty' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {actionTrashLoading === 'empty' ? 'Mengosongkan...' : 'Ya, Kosongkan'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ TEMPAT SAMPAH (RECYCLE BIN) MODAL ════════ */}
      {showTrashModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex items-center justify-between border-b border-rose-900/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">Tempat Sampah Folder Gudang</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                      {trashFolders.length} Folder
                    </span>
                  </div>
                  <p className="text-xs text-rose-200/80 mt-0.5">
                    Folder di tempat sampah otomatis terhapus permanen setelah 30 hari jika tidak dipulihkan.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {trashFolders.length > 0 && !viewingTrashFolder && (
                  <button
                    onClick={() => setShowEmptyTrashConfirm(true)}
                    disabled={actionTrashLoading === 'empty'}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-rose-400/30 flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Kosongkan Sampah</span>
                  </button>
                )}
                <button
                  onClick={() => { setShowTrashModal(false); setViewingTrashFolder(null); }}
                  className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {viewingTrashFolder ? (
                /* ── DETAIL ISI FOLDER DI TEMPAT SAMPAH ── */
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200">
                    <button
                      onClick={() => setViewingTrashFolder(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Sampah
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreFolder(viewingTrashFolder.id)}
                        disabled={actionTrashLoading === viewingTrashFolder.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                      >
                        {actionTrashLoading === viewingTrashFolder.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        <span>Pulihkan Folder Ini</span>
                      </button>
                      <button
                        onClick={() => setConfirmForceDeleteTarget(viewingTrashFolder)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus Permanen</span>
                      </button>
                    </div>
                  </div>

                  {/* Folder Summary Card */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                        <Folder className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-800">{viewingTrashFolder.nama_folder}</h3>
                        <p className="text-xs text-slate-500">{viewingTrashFolder.keterangan || 'Tanpa keterangan'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-amber-800 font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Sisa Waktu: <strong>{viewingTrashFolder.sisa_hari ?? 30} Hari</strong></span>
                      </div>
                      <div className="bg-slate-100 px-3 py-1.5 rounded-xl text-slate-600 font-semibold">
                        Total {viewingTrashFolder.inventaris_gudangs?.length || 0} Barang
                      </div>
                    </div>
                  </div>

                  {/* Notice Banner */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Folder ini dan barang-barang di bawah ini saat ini berada di <strong>Tempat Sampah</strong>. Klik tombol <strong>&quot;Pulihkan Folder Ini&quot;</strong> untuk mengaktifkan kembali folder dan barang-barangnya ke menu Gudang utama.
                    </span>
                  </div>

                  {/* Table Barang di Folder Sampah */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Daftar Barang di Dalam Folder Ini</span>
                      <span className="text-[11px] text-slate-500">{viewingTrashFolder.inventaris_gudangs?.length || 0} SKU</span>
                    </div>
                    <div className="overflow-x-auto max-h-[42vh]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                            <th className="py-2.5 px-3 w-12 text-center">No</th>
                            <th className="py-2.5 px-3">Kode</th>
                            <th className="py-2.5 px-3">Nama Barang</th>
                            <th className="py-2.5 px-3">Satuan</th>
                            <th className="py-2.5 px-3 text-right">Stok Akhir</th>
                            <th className="py-2.5 px-3">Lokasi / Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(!viewingTrashFolder.inventaris_gudangs || viewingTrashFolder.inventaris_gudangs.length === 0) ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
                                Tidak ada data barang di dalam folder ini saat dihapus.
                              </td>
                            </tr>
                          ) : (
                            viewingTrashFolder.inventaris_gudangs.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">{item.kode || '-'}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{item.nama_barang}</td>
                                <td className="py-2.5 px-3 text-slate-600">{item.satuan}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{item.stok_akhir}</td>
                                <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{item.keterangan || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── DAFTAR SEMUA FOLDER DI TEMPAT SAMPAH ── */
                <div>
                  {loadingTrash ? (
                    <div className="py-16 text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">Memuat data tempat sampah...</p>
                    </div>
                  ) : trashFolders.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
                        <Trash2 className="h-7 w-7" />
                      </div>
                      <h3 className="text-base font-bold text-slate-700 mb-1">Tempat Sampah Kosong</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Tidak ada folder gudang yang berada di tempat sampah. Folder yang dihapus akan disimpan di sini selama 30 hari sebelum terhapus permanen otomatis.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trashFolders.map((f) => {
                        const sisa = f.sisa_hari ?? 30;
                        const badgeColor =
                          sisa <= 3
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : sisa <= 7
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300';

                        const deletedDateStr = f.deleted_at
                          ? new Date(f.deleted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '-';

                        return (
                          <div
                            key={f.id}
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 shadow-sm">
                                    <Folder className="h-6 w-6" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-800 line-clamp-1">{f.nama_folder}</h4>
                                    <p className="text-[11px] text-slate-400">Dihapus: {deletedDateStr}</p>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badgeColor}`}>
                                  <Clock className="h-3 w-3" />
                                  <span>{sisa} Hari Lagi</span>
                                </span>
                              </div>

                              {f.keterangan && (
                                <p className="text-xs text-slate-500 line-clamp-1 mb-3 bg-slate-50 px-2.5 py-1 rounded-lg">
                                  {f.keterangan}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-xs text-slate-600 py-2 border-t border-slate-100">
                                <span className="flex items-center gap-1 font-medium">
                                  <Package className="h-3.5 w-3.5 text-slate-400" />
                                  <strong className="text-slate-800">{f.items_count ?? f.inventaris_gudangs?.length ?? 0}</strong> SKU Barang di dalamnya
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                              <button
                                onClick={() => setViewingTrashFolder(f)}
                                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                                title="Buka dan lihat barang di dalam folder ini"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Lihat Isi</span>
                              </button>
                              <button
                                onClick={() => handleRestoreFolder(f.id)}
                                disabled={actionTrashLoading === f.id}
                                className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-emerald-200 disabled:opacity-50"
                                title="Pulihkan folder ke aktif"
                              >
                                {actionTrashLoading === f.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                <span>Pulihkan</span>
                              </button>
                              <button
                                onClick={() => setConfirmForceDeleteTarget(f)}
                                className="px-2.5 py-2 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-rose-200"
                                title="Hapus permanen sekarang"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Permanen</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>* Data di tempat sampah dapat dipulihkan kapan saja sebelum 30 hari.</span>
              <button
                onClick={() => { setShowTrashModal(false); setViewingTrashFolder(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ ITEM CRUD MODAL GUDANG ════════ */}
      {showFormModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {editTarget ? <Edit2 className="h-5 w-5 text-emerald-600" /> : <Plus className="h-5 w-5 text-emerald-600" />}
                {editTarget ? 'Edit Data Barang Gudang' : 'Tambah Barang Gudang Baru'}
              </h2>
              <button onClick={() => setShowFormModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Folder Gudang</label>
                  <select
                    value={formData.id_folder || ''}
                    onChange={e => setFormData(f => ({ ...f, id_folder: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">File Gudang Tanpa Folder</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>📁 {f.nama_folder}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Barang / Material <span className="text-red-500">*</span></label>
                  <input value={formData.nama_barang || ''} onChange={e => setFormData(f => ({ ...f, nama_barang: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Misal: Semen Gresik 50kg, Kabel NYM..." />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Barang</label>
                  <input value={formData.kode || ''} onChange={e => setFormData(f => ({ ...f, kode: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Otomatis jika kosong (GDG-xxxx)" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi Rak / Gudang</label>
                  <input value={formData.lokasi_rak || ''} onChange={e => setFormData(f => ({ ...f, lokasi_rak: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Rak A-01, Gudang Utama..." />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
                  <input value={formData.satuan || ''} onChange={e => setFormData(f => ({ ...f, satuan: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Unit, Pcs, Sak, Kaleng..." />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-700 mb-1">Stok Awal</label>
                  <input type="number" min="0" value={formData.stok_awal} onChange={e => setFormData(f => ({ ...f, stok_awal: +e.target.value }))}
                    className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">Barang Masuk (IN)</label>
                  <input type="number" min="0" value={formData.stok_masuk} onChange={e => setFormData(f => ({ ...f, stok_masuk: +e.target.value }))}
                    className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-orange-700 mb-1">Barang Keluar (OUT)</label>
                  <input type="number" min="0" value={formData.stok_keluar} onChange={e => setFormData(f => ({ ...f, stok_keluar: +e.target.value }))}
                    className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50" />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Spesifikasi</label>
                  <textarea value={formData.keterangan || ''} onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))}
                    rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Catatan tambahan spesifikasi barang..." />
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowFormModal(false)} disabled={saving}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 text-sm font-medium transition-colors">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Menyimpan...' : 'Simpan Barang'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ QUICK MUTASI MODAL (+ / - STOK) ════════ */}
      {showMutasiModal && mutasiTarget && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {mutasiType === 'in' ? <ArrowDownLeft className="h-5 w-5 text-emerald-600" /> : <ArrowUpRight className="h-5 w-5 text-orange-600" />}
                {mutasiType === 'in' ? 'Tambah Stok Masuk (IN)' : 'Catat Stok Keluar (OUT)'}
              </h3>
              <button onClick={() => setShowMutasiModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900 text-sm">{mutasiTarget.nama_barang}</p>
              <p>Kode: <span className="font-mono text-slate-600 font-semibold">{mutasiTarget.kode}</span> • Rak: <span className="font-semibold text-amber-800">{getLokasiRak(mutasiTarget)}</span></p>
              <p>Stok Tersedia Saat Ini: <strong className="text-purple-700 text-sm">{mutasiTarget.stok_akhir} {mutasiTarget.satuan}</strong></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {mutasiType === 'in' ? 'Jumlah Unit Masuk' : 'Jumlah Unit Keluar'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="1"
                  value={mutasiJumlah}
                  onChange={e => setMutasiJumlah(Math.max(1, +e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan / Catatan Mutasi</label>
                <input
                  type="text"
                  value={mutasiKet}
                  onChange={e => setMutasiKet(e.target.value)}
                  placeholder="Misal: Restock supplier / Diambil bengkel..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowMutasiModal(false)} disabled={savingMutasi}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors">Batal</button>
              <button onClick={handleSaveMutasi} disabled={savingMutasi}
                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mutasiType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                {savingMutasi ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingMutasi ? 'Memproses...' : (mutasiType === 'in' ? 'Simpan Stok Masuk' : 'Simpan Stok Keluar')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ DELETE CONFIRM MODAL ════════ */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hapus Barang Gudang?</h3>
            <p className="text-sm text-slate-600 mb-1">
              <span className="font-semibold text-slate-800">{deleteTarget.nama_barang}</span>
            </p>
            <p className="text-xs text-slate-500 mb-6">Data barang gudang ini akan dihapus permanen.</p>
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

      {/* ════════ IMPORT EXCEL GUDANG MODAL ════════ */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className={`bg-white rounded-2xl w-full shadow-2xl transition-all duration-300 my-4 ${showPreview ? 'max-w-7xl' : 'max-w-lg'} max-h-[95vh] flex flex-col`}>
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 sm:h-5 sm:w-5 text-teal-600" />
                <span className="hidden sm:inline">
                  {showPreview ? `Preview & Edit Stok Gudang (${previewData.length} baris)` : `Import Excel Gudang ke ${activeFolderTitle}`}
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
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-xs text-teal-900 space-y-1.5">
                    <p className="font-bold text-teal-950 mb-1">📋 Format Excel Gudang yang Didukung:</p>
                    <div className="overflow-x-auto my-2">
                      <table className="text-[11px] border border-teal-200 rounded-lg overflow-hidden w-full text-center">
                        <thead className="bg-teal-100 text-teal-900 font-bold">
                          <tr>
                            <th rowSpan={2} className="px-2 py-1 border border-teal-200">NO</th>
                            <th rowSpan={2} className="px-2 py-1 border border-teal-200">TANGGAL PENGAMBILAN</th>
                            <th rowSpan={2} className="px-2 py-1 border border-teal-200">KODE</th>
                            <th rowSpan={2} className="px-2 py-1 border border-teal-200">NAMA BARANG</th>
                            <th rowSpan={2} className="px-2 py-1 border border-teal-200">SATUAN</th>
                            <th colSpan={4} className="px-2 py-1 border border-teal-200">STOK</th>
                          </tr>
                          <tr>
                            <th className="px-2 py-1 border border-teal-200">AWAL</th>
                            <th className="px-2 py-1 border border-teal-200">IN</th>
                            <th className="px-2 py-1 border border-teal-200">OUT</th>
                            <th className="px-2 py-1 border border-teal-200">AKHIR</th>
                          </tr>
                        </thead>
                        <tbody className="text-teal-800 bg-white">
                          <tr>
                            <td className="px-2 py-1 border border-teal-200">1</td>
                            <td className="px-2 py-1 border border-teal-200">08/07/2026</td>
                            <td className="px-2 py-1 border border-teal-200 font-mono text-[10px] text-slate-400">-</td>
                            <td className="px-2 py-1 border border-teal-200 text-left font-semibold">Mesin Pengasah Endmill</td>
                            <td className="px-2 py-1 border border-teal-200 text-slate-400">-</td>
                            <td className="px-2 py-1 border border-teal-200 font-bold text-blue-700">1</td>
                            <td className="px-2 py-1 border border-teal-200 text-slate-400">-</td>
                            <td className="px-2 py-1 border border-teal-200 font-bold text-orange-700">1</td>
                            <td className="px-2 py-1 border border-teal-200 font-bold text-purple-700">0</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[11px] text-teal-700">✓ Target Folder: <strong className="text-teal-900">{activeFolderTitle}</strong></p>
                  </div>

                  {parseError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{parseError}</p>
                    </div>
                  )}

                  <label className="block w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/30 transition-all">
                    <Upload className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <span className="text-sm font-medium text-slate-600">
                      {importFile ? <span className="text-teal-600">{importFile.name}</span> : 'Klik atau drag file Excel Gudang di sini'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">.xlsx, .xls, .csv — maks 5 MB</p>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                  </label>

                  <button onClick={downloadTemplate}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white text-sm rounded-xl hover:bg-teal-700 font-medium transition-colors">
                    <Download className="h-4 w-4" /> Download Template Gudang
                  </button>

                  <button onClick={closeImport} className="w-full py-2.5 bg-slate-100 text-slate-700 text-sm rounded-xl hover:bg-slate-200 font-medium transition-colors">Batal</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 gap-2">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-teal-900">{previewData.length} baris dari Excel</p>
                      <p className="text-[10px] sm:text-xs text-teal-700">{selectedRows.size} dipilih • Target: {activeFolderTitle}</p>
                    </div>
                    <button onClick={toggleAll}
                      className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 transition-colors font-medium whitespace-nowrap">
                      {selectedRows.size === previewData.length ? 'Batal Semua' : 'Pilih Semua'}
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto max-h-[50vh] sm:max-h-[55vh]">
                      <table className="w-full text-xs min-w-[950px]">
                        <thead className="bg-gradient-to-r from-slate-100 to-slate-200 sticky top-0 z-10">
                          <tr>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 w-10 sticky left-0 bg-slate-100 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">
                              <input type="checkbox" checked={selectedRows.size === previewData.length && previewData.length > 0} onChange={toggleAll} className="w-3.5 h-3.5 rounded text-teal-600 cursor-pointer" />
                            </th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600 sticky left-10 bg-slate-100 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">No</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600">Tanggal Pengambilan</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600">Kode Barang</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-left font-bold text-slate-600">Nama Barang</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-center font-bold text-slate-600">Satuan</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-center font-bold text-blue-700">Awal</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-center font-bold text-emerald-700">IN</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-center font-bold text-orange-700">OUT</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-center font-bold text-purple-700">Stok Akhir</th>
                            <th className="px-2 sm:px-3 py-2 sm:py-2.5 text-center font-bold text-slate-600 sticky right-0 bg-slate-100 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">Aksi</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.map((row, idx) => {
                          const isEditing = editingPreviewIdx === idx;
                          const eRow = editingPreviewRow!;
                          return (
                            <tr key={idx} className={`transition-colors ${selectedRows.has(idx) ? 'bg-teal-50/40' : 'hover:bg-slate-50'} ${isEditing ? 'bg-amber-50 ring-2 ring-inset ring-amber-400' : ''}`}>
                              <td className="px-2 sm:px-3 py-2 text-center sticky left-0 bg-white border-r border-slate-100">
                                <input type="checkbox" checked={selectedRows.has(idx)} onChange={() => toggleRow(idx)} className="w-3.5 h-3.5 rounded text-teal-600 cursor-pointer" />
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-slate-500 font-medium sticky left-10 bg-white border-r border-slate-100">{idx + 1}</td>

                              {isEditing ? (
                                <>
                                  <td className="px-2 py-1"><input type="date" value={eRow.tanggal_pengambilan || ''} onChange={e => setEditingPreviewRow(r => r ? { ...r, tanggal_pengambilan: e.target.value } : r)} className="w-28 border border-amber-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1"><input value={eRow.kode} onChange={e => setEditingPreviewRow(r => r ? { ...r, kode: e.target.value } : r)} className="w-24 sm:w-28 border border-amber-300 rounded px-1.5 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1"><input value={eRow.nama_barang} onChange={e => setEditingPreviewRow(r => r ? { ...r, nama_barang: e.target.value } : r)} className="w-40 sm:w-48 border border-amber-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1 text-center"><input value={eRow.satuan} onChange={e => setEditingPreviewRow(r => r ? { ...r, satuan: e.target.value } : r)} className="w-14 sm:w-16 border border-amber-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-400" /></td>
                                  <td className="px-2 py-1 text-center"><input type="number" min="0" value={eRow.stok_awal} onChange={e => setEditingPreviewRow(r => r ? { ...r, stok_awal: +e.target.value } : r)} className="w-12 sm:w-14 border border-blue-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50" /></td>
                                  <td className="px-2 py-1 text-center"><input type="number" min="0" value={eRow.stok_masuk} onChange={e => setEditingPreviewRow(r => r ? { ...r, stok_masuk: +e.target.value } : r)} className="w-12 sm:w-14 border border-emerald-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-emerald-50" /></td>
                                  <td className="px-2 py-1 text-center"><input type="number" min="0" value={eRow.stok_keluar} onChange={e => setEditingPreviewRow(r => r ? { ...r, stok_keluar: +e.target.value } : r)} className="w-12 sm:w-14 border border-orange-300 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-orange-400 bg-orange-50" /></td>
                                  <td className="px-2 py-1 text-center"><span className="w-12 sm:w-14 inline-block text-center px-2 py-1 bg-purple-100 text-purple-700 font-bold rounded">{eRow.stok_awal + eRow.stok_masuk - eRow.stok_keluar}</span></td>
                                  <td className="px-2 py-1 sticky right-0 bg-amber-50 border-l border-slate-100">
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={() => saveEditPreview(idx)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors" title="Simpan"><Save className="h-3 w-3" /></button>
                                      <button onClick={cancelEditPreview} className="p-1 bg-slate-400 text-white rounded hover:bg-slate-500 transition-colors" title="Batal"><X className="h-3 w-3" /></button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-2 sm:px-3 py-2 text-slate-600 whitespace-nowrap font-mono">{fmtDate(row.tanggal_pengambilan)}</td>
                                  <td className="px-2 sm:px-3 py-2 font-mono text-slate-700 font-semibold">{row.kode}</td>
                                  <td className="px-2 sm:px-3 py-2 font-medium text-slate-900">{row.nama_barang}</td>
                                  <td className="px-2 sm:px-3 py-2 text-center text-slate-500">{row.satuan || 'Unit'}</td>
                                  <td className="px-2 sm:px-3 py-2 text-center font-bold text-blue-700">{row.stok_awal}</td>
                                  <td className="px-2 sm:px-3 py-2 text-center font-bold text-emerald-700">+{row.stok_masuk}</td>
                                  <td className="px-2 sm:px-3 py-2 text-center font-bold text-orange-700">-{row.stok_keluar}</td>
                                  <td className="px-2 sm:px-3 py-2 text-center font-bold text-purple-700">{row.stok_akhir}</td>
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
                      className="flex-1 py-2.5 bg-teal-600 text-white text-sm rounded-xl hover:bg-teal-700 disabled:opacity-50 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                      {importing ? <><RefreshCw className="h-4 w-4 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4" /> Import {selectedRows.size} Data Gudang ke {activeFolderTitle}</>}
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
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-teal-600 border-r-emerald-600 animate-spin" />
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
                {importState === 'importing' ? 'Sedang Meng-import Data Gudang...' : 'Import Selesai!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {importState === 'importing'
                  ? `Memproses ${importProgress.current} dari ${importProgress.total} data ke database gudang`
                  : `Semua data gudang telah tersimpan di database.`}
              </p>
            </div>

            {importState === 'importing' && (
              <div className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 h-full rounded-full transition-all duration-300 shadow-sm"
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
