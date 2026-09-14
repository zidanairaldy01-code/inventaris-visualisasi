'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Briefcase, Search, Plus, Edit2, Trash2, RefreshCw,
  X, Save, AlertTriangle, ChevronLeft, ChevronRight,
  Wallet, ClipboardList, Package, CheckCircle2,
  Folder, FolderOpen, ArrowLeft, Grid, List as ListIcon,
  HardDrive, FolderPlus, Layers, TrendingUp, ChevronRight as ChevronRightIcon,
  CheckSquare
} from 'lucide-react';
import Toast from '@/components/Toast';

/* ─────────────────────── Types ─────────────────────── */
interface CustomFolder {
  id: number;
  nama_folder: string;
  keterangan?: string;
  warna?: string;
  items_count?: number;
  id_sumber_dana?: number | null;
  created_at?: string;
}

interface SumberDana {
  id: number;
  nama_sumber: string;
  jenis_sumber: string | null;
  keterangan: string | null;
  asets_count: number;
  daftar_belanjas_count: number;
  folder_inventaris_count: number;
  total_belanja?: number | null;
  total_unit?: number | null;
  folder_inventaris?: CustomFolder[];
  created_at: string;
}

interface BelanjaItem {
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
  id_sumber_dana: number | null;
  folder?: CustomFolder | null;
  sumber_dana?: SumberDana | null;
  created_at: string;
}

type FormData = {
  nama_sumber: string;
  jenis_sumber: string;
  keterangan: string;
  folder_ids: number[];
};

const emptyForm = (): FormData => ({
  nama_sumber: '',
  jenis_sumber: '',
  keterangan: '',
  folder_ids: [],
});

const JENIS_OPTIONS = [
  'BOS',
  'Dana Sekolah',
  'APBD',
  'APBN',
  'Hibah',
  'Komite',
  'Lainnya',
];

const jenisBadgeColor: Record<string, string> = {
  BOS:          'bg-blue-100 text-blue-700 border border-blue-200',
  'Dana Sekolah': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  APBD:         'bg-purple-100 text-purple-700 border border-purple-200',
  APBN:         'bg-indigo-100 text-indigo-700 border border-indigo-200',
  Hibah:        'bg-amber-100 text-amber-700 border border-amber-200',
  Komite:       'bg-teal-100 text-teal-700 border border-teal-200',
  Lainnya:      'bg-slate-100 text-slate-600 border border-slate-200',
};

const jenisFolderBg: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  BOS:          { bg: 'bg-blue-50/90 hover:bg-blue-100/90', border: 'border-blue-200', text: 'text-blue-900', iconBg: 'bg-blue-600' },
  'Dana Sekolah': { bg: 'bg-emerald-50/90 hover:bg-emerald-100/90', border: 'border-emerald-200', text: 'text-emerald-900', iconBg: 'bg-emerald-600' },
  APBD:         { bg: 'bg-purple-50/90 hover:bg-purple-100/90', border: 'border-purple-200', text: 'text-purple-900', iconBg: 'bg-purple-600' },
  APBN:         { bg: 'bg-indigo-50/90 hover:bg-indigo-100/90', border: 'border-indigo-200', text: 'text-indigo-900', iconBg: 'bg-indigo-600' },
  Hibah:        { bg: 'bg-amber-50/90 hover:bg-amber-100/90', border: 'border-amber-200', text: 'text-amber-900', iconBg: 'bg-amber-600' },
  Komite:       { bg: 'bg-teal-50/90 hover:bg-teal-100/90', border: 'border-teal-200', text: 'text-teal-900', iconBg: 'bg-teal-600' },
  Lainnya:      { bg: 'bg-slate-50/90 hover:bg-slate-100/90', border: 'border-slate-200', text: 'text-slate-900', iconBg: 'bg-slate-700' },
};

const folderColorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  blue:    { bg: 'bg-blue-50 hover:bg-blue-100/80',    border: 'border-blue-200',    text: 'text-blue-800',    iconBg: 'bg-blue-600' },
  indigo:  { bg: 'bg-indigo-50 hover:bg-indigo-100/80', border: 'border-indigo-200', text: 'text-indigo-800', iconBg: 'bg-indigo-600' },
  purple:  { bg: 'bg-purple-50 hover:bg-purple-100/80', border: 'border-purple-200', text: 'text-purple-800', iconBg: 'bg-purple-600' },
  emerald: { bg: 'bg-emerald-50 hover:bg-emerald-100/80', border: 'border-emerald-200', text: 'text-emerald-800', iconBg: 'bg-emerald-600' },
  amber:   { bg: 'bg-amber-50 hover:bg-amber-100/80',  border: 'border-amber-200',   text: 'text-amber-800',   iconBg: 'bg-amber-600' },
  rose:    { bg: 'bg-rose-50 hover:bg-rose-100/80',   border: 'border-rose-200',    text: 'text-rose-800',    iconBg: 'bg-rose-600' },
};

const getJenisBadge = (jenis: string | null) => {
  const key = jenis ?? 'Lainnya';
  return jenisBadgeColor[key] ?? jenisBadgeColor['Lainnya'];
};

const getFolderColor = (jenis: string | null) => {
  const key = jenis ?? 'Lainnya';
  return jenisFolderBg[key] ?? jenisFolderBg['Lainnya'];
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

const getItemJumlah = (item: BelanjaItem): number =>
  Number(item.jumlah) || Number(item.volume) * Number(item.tarif_harga) || 0;

/* ══════════════════════ MAIN COMPONENT ══════════════════════ */
export default function SumberDanaPage() {
  const [data, setData] = useState<SumberDana[]>([]);
  const [availableFolders, setAvailableFolders] = useState<CustomFolder[]>([]);
  const [filtered, setFiltered] = useState<SumberDana[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'drive' | 'table'>('drive');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({
    show: false, message: '', type: 'success',
  });

  // Navigation State
  const [activeSumberDanaId, setActiveSumberDanaId] = useState<number | null>(null);
  const [activeBelanjaFolderId, setActiveBelanjaFolderId] = useState<number | null | -1>(null);

  // Sub-data for active Sumber Dana
  const [subFolders, setSubFolders] = useState<CustomFolder[]>([]);
  const [subItems, setSubItems] = useState<BelanjaItem[]>([]);
  const [subLoading, setSubLoading] = useState(false);

  // Pagination for tables
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SumberDana | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<SumberDana | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ show: true, message, type });
  }, []);

  /* ── Fetch Master Sumber Dana List ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/sumber-danas');
      const list: SumberDana[] = Array.isArray(res.data)
        ? res.data
        : (res.data.data ?? []);
      setData(list);
      setFiltered(list);
    } catch {
      showToast('Gagal memuat data sumber dana', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* ── Fetch Available Belanja Folders for Dropdown ── */
  const fetchAvailableFolders = useCallback(async () => {
    try {
      const res = await axios.get('/api/folder-inventaris?jenis=inventaris-belanja');
      if (res.data.status === 'success') {
        setAvailableFolders(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAvailableFolders();
  }, [fetchData, fetchAvailableFolders]);

  /* ── Fetch sub folders and items for active Sumber Dana ── */
  const fetchSubData = useCallback(async (sumberId: number) => {
    try {
      setSubLoading(true);
      const resFolders = await axios.get(`/api/folder-inventaris?jenis=inventaris-belanja&id_sumber_dana=${sumberId}`);
      if (resFolders.data.status === 'success') {
        setSubFolders(resFolders.data.data);
      }

      const resItems = await axios.get(`/api/daftar-belanja?id_sumber_dana=${sumberId}`);
      if (resItems.data.status === 'success') {
        setSubItems(resItems.data.data);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data isi sumber dana', 'error');
    } finally {
      setSubLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeSumberDanaId !== null) {
      fetchSubData(activeSumberDanaId);
    }
  }, [activeSumberDanaId, fetchSubData]);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFiltered(
      data.filter(s =>
        s.nama_sumber.toLowerCase().includes(q) ||
        (s.jenis_sumber ?? '').toLowerCase().includes(q) ||
        (s.keterangan ?? '').toLowerCase().includes(q),
      ),
    );
    setPage(1);
  }, [searchQuery, data]);

  /* ── Summary ── */
  const totalBarang  = data.reduce((s, d) => s + (d.daftar_belanjas_count ?? 0), 0);
  const totalUnit    = data.reduce((s, d) => s + (Number(d.total_unit) || 0), 0);
  const totalFolderBelanja = data.reduce((s, d) => s + (d.folder_inventaris_count ?? 0), 0);
  const totalNilaiPembelanjaan = data.reduce((s, d) => s + Number(d.total_belanja ?? 0), 0);

  /* ── Active Objects ── */
  const activeSumberDanaObj = data.find(s => s.id === activeSumberDanaId);
  const activeBelanjaFolderObj = subFolders.find(f => f.id === activeBelanjaFolderId);

  /* ── CRUD Handlers ── */
  const openAdd = () => {
    setEditTarget(null);
    setFormData(emptyForm());
    setShowFormModal(true);
  };

  const openEdit = (item: SumberDana, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditTarget(item);

    const linkedFolderIds = (item.folder_inventaris || [])
      .map(f => f.id)
      .concat(availableFolders.filter(f => f.id_sumber_dana === item.id).map(f => f.id));
    const uniqueFolderIds = Array.from(new Set(linkedFolderIds));

    setFormData({
      nama_sumber:  item.nama_sumber,
      jenis_sumber: item.jenis_sumber ?? '',
      keterangan:   item.keterangan ?? '',
      folder_ids:   uniqueFolderIds,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.nama_sumber.trim()) {
      showToast('Nama sumber dana wajib diisi', 'error');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        nama_sumber:  formData.nama_sumber.trim(),
        jenis_sumber: formData.jenis_sumber || null,
        keterangan:   formData.keterangan || null,
        folder_ids:   formData.folder_ids,
      };
      if (editTarget) {
        await axios.put(`/api/sumber-danas/${editTarget.id}`, payload);
        showToast('Sumber dana berhasil diperbarui', 'success');
      } else {
        await axios.post('/api/sumber-danas', payload);
        showToast('Sumber dana berhasil ditambahkan', 'success');
      }
      setShowFormModal(false);
      fetchData();
      fetchAvailableFolders();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal menyimpan sumber dana';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await axios.delete(`/api/sumber-danas/${deleteTarget.id}`);
      showToast('Sumber dana berhasil dihapus', 'success');
      setDeleteTarget(null);
      if (activeSumberDanaId === deleteTarget.id) {
        setActiveSumberDanaId(null);
      }
      fetchData();
      fetchAvailableFolders();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal menghapus sumber dana';
      showToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Pagination ── */
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Items filtering for sub-view inside active Sumber Dana
  const displayedSubItems = activeBelanjaFolderId === null
    ? subItems
    : (activeBelanjaFolderId === -1
        ? subItems.filter(i => !i.id_folder)
        : subItems.filter(i => i.id_folder === activeBelanjaFolderId));

  const totalSubJumlah = displayedSubItems.reduce((acc, item) => acc + getItemJumlah(item), 0);

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="p-6 space-y-6">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(t => ({ ...t, show: false }))}
        />
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-12 translate-x-12" />
        <div className="flex items-center justify-between relative z-10 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl ring-1 ring-white/30">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Sumber Dana Drive</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/20">
                  Modul Pendanaan
                </span>
              </div>
              <p className="text-emerald-100 text-sm mt-1">
                Jelajahi folder dan barang inventaris belanja berdasarkan kategori Sumber Dana (BOS, APBD, Komite, dll)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveSumberDanaId(null); setViewMode('drive'); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeSumberDanaId === null && viewMode === 'drive'
                  ? 'bg-white text-emerald-800 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              <Grid className="h-4 w-4" /> Drive Folders
            </button>
            <button
              onClick={() => { setActiveSumberDanaId(null); setViewMode('table'); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-800 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              <ListIcon className="h-4 w-4" /> Data Master Tabel
            </button>
            <button
              onClick={openAdd}
              className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> + Tambah Sumber Dana
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 flex-wrap">
          <button
            onClick={() => { setActiveSumberDanaId(null); setActiveBelanjaFolderId(null); }}
            className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-700"
          >
            <HardDrive className="h-4 w-4 text-emerald-600" />
            <span>Sumber Dana Drive</span>
          </button>

          {activeSumberDanaId !== null && activeSumberDanaObj && (
            <>
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
              <button
                onClick={() => setActiveBelanjaFolderId(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  activeBelanjaFolderId === null
                    ? 'bg-emerald-100 border border-emerald-200 text-emerald-800'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Wallet className="h-4 w-4 text-emerald-600" />
                <span>{activeSumberDanaObj.nama_sumber}</span>
              </button>
            </>
          )}

          {activeBelanjaFolderId !== null && (
            <>
              <ChevronRightIcon className="h-4 w-4 text-slate-400" />
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg text-indigo-700 font-bold">
                <FolderOpen className="h-4 w-4 text-indigo-600" />
                <span>
                  {activeBelanjaFolderId === -1
                    ? 'Barang Tanpa Folder'
                    : (activeBelanjaFolderObj?.nama_folder || 'Folder Belanja')}
                </span>
              </div>
            </>
          )}
        </div>

        {activeSumberDanaId !== null && (
          <button
            onClick={() => {
              if (activeBelanjaFolderId !== null) {
                setActiveBelanjaFolderId(null);
              } else {
                setActiveSumberDanaId(null);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Sumber Dana', value: `${data.length} Sumber`,
            icon: Briefcase, from: 'from-emerald-500', to: 'to-emerald-700',
            bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900',
          },
          {
            label: 'Total Jenis Barang', value: `${totalBarang} Jenis`,
            icon: ClipboardList, from: 'from-indigo-500', to: 'to-indigo-700',
            bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900',
          },
          {
            label: 'Total Unit Barang', value: `${totalUnit} Unit`,
            icon: Package, from: 'from-blue-500', to: 'to-blue-700',
            bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900',
          },
          {
            label: 'Total Pembelanjaan', value: formatRupiahShort(totalNilaiPembelanjaan),
            icon: TrendingUp, from: 'from-teal-500', to: 'to-teal-700',
            bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-900',
          },
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

      {/* ════════════ ROOT LEVEL: SUMBER DANA FOLDER GRID VIEW ════════════ */}
      {activeSumberDanaId === null && viewMode === 'drive' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Folder className="h-5 w-5 text-emerald-600 fill-emerald-600/20" />
              Folder Sumber Dana ({filtered.length})
            </h2>

            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari sumber dana (BOS, APBD, dll)..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-500">Memuat folder sumber dana...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <FolderPlus className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">Belum Ada Folder Sumber Dana</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Tambahkan sumber dana seperti BOS, APBD, Dana Sekolah untuk mulai mengelompokkan belanja.
              </p>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" /> Tambah Sumber Dana Baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(sumber => {
                const color = getFolderColor(sumber.jenis_sumber);
                const nominalBelanja = Number(sumber.total_belanja ?? 0);

                return (
                  <div
                    key={sumber.id}
                    onClick={() => setActiveSumberDanaId(sumber.id)}
                    className={`${color.bg} border ${color.border} rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group relative overflow-hidden`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-3 ${color.iconBg} rounded-xl text-white shadow-md group-hover:scale-110 transition-transform`}>
                        <FolderOpen className="h-6 w-6" />
                      </div>
                      <div className="flex items-center gap-1">
                        {sumber.jenis_sumber && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getJenisBadge(sumber.jenis_sumber)}`}>
                            {sumber.jenis_sumber}
                          </span>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-1">
                          <button
                            onClick={(e) => openEdit(sumber, e)}
                            className="p-1.5 bg-white/80 hover:bg-white text-slate-600 rounded-lg shadow-sm"
                            title="Edit Sumber Dana"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(sumber); }}
                            className="p-1.5 bg-white/80 hover:bg-white text-rose-600 rounded-lg shadow-sm"
                            title="Hapus Sumber Dana"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className={`font-bold text-base ${color.text} group-hover:underline line-clamp-1`}>
                        {sumber.nama_sumber}
                      </h3>
                      {sumber.keterangan ? (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{sumber.keterangan}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Kategori Sumber Dana</p>
                      )}

                      <div className="mt-4 space-y-1.5 pt-3 border-t border-black/5">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <ClipboardList className="h-3.5 w-3.5 text-indigo-600" /> Jenis Barang:
                          </span>
                          <span className="font-bold text-indigo-800 bg-indigo-100/60 px-2 py-0.5 rounded">
                            {sumber.daftar_belanjas_count ?? 0} jenis ({sumber.folder_inventaris_count ?? 0} folder)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5 text-blue-600" /> Jumlah Unit:
                          </span>
                          <span className="font-bold text-blue-800 bg-blue-100/60 px-2 py-0.5 rounded">
                            {sumber.total_unit ?? 0} unit
                          </span>
                        </div>

                        {/* Total Nominal Jumlah Belanja */}
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-900 bg-emerald-100/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/80 mt-1">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-700" /> Total Belanja:
                          </span>
                          <span>{formatRupiahShort(nominalBelanja)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════ INSIDE SELECTED SUMBER DANA VIEW ════════════ */}
      {activeSumberDanaId !== null && activeSumberDanaObj && (
        <div className="space-y-6">
          {/* Top Banner Info for active Sumber Dana */}
          <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-100 rounded-2xl border border-teal-200">
                <Wallet className="h-7 w-7 text-teal-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{activeSumberDanaObj.nama_sumber}</h2>
                  {activeSumberDanaObj.jenis_sumber && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getJenisBadge(activeSumberDanaObj.jenis_sumber)}`}>
                      {activeSumberDanaObj.jenis_sumber}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {activeSumberDanaObj.keterangan || 'Menampilkan folder belanja dan data barang yang didanai oleh sumber ini.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-teal-50 border border-teal-200/80 px-4 py-3 rounded-xl">
              <div>
                <p className="text-[10px] uppercase tracking-wide font-bold text-teal-800">Total Pembelanjaan</p>
                <p className="text-lg font-extrabold text-teal-900">{formatRupiah(totalSubJumlah)}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-teal-600 ml-2" />
            </div>
          </div>

          {subLoading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-slate-500">Memuat isi folder {activeSumberDanaObj.nama_sumber}...</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: Folder Belanja terhubung ke Sumber Dana ini */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Folder className="h-4 w-4 text-amber-500" />
                    Folder Belanja Terhubung ({subFolders.length})
                  </h3>
                </div>

                {subFolders.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    Belum ada folder belanja khusus yang dihubungkan ke sumber dana ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {subFolders.map(f => {
                      const colorKey = f.warna || 'blue';
                      const color = folderColorMap[colorKey] || folderColorMap.blue;
                      const fItems = subItems.filter(i => i.id_folder === f.id);
                      const fTotal = fItems.reduce((acc, i) => acc + getItemJumlah(i), 0);

                      return (
                        <div
                          key={f.id}
                          onClick={() => setActiveBelanjaFolderId(f.id)}
                          className={`${color.bg} border ${color.border} rounded-xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md group`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 ${color.iconBg} rounded-lg text-white shadow-sm group-hover:scale-105 transition-transform`}>
                              <FolderOpen className="h-5 w-5" />
                            </div>
                            <div className="overflow-hidden flex-1">
                              <h4 className={`font-bold text-sm ${color.text} truncate group-hover:underline`}>
                                {f.nama_folder}
                              </h4>
                              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1">
                                <span>{f.items_count ?? fItems.length} item</span>
                                <span className="font-bold text-emerald-800">{formatRupiahShort(fTotal)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: Tabel Barang Belanja Terhubung */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-emerald-600" />
                      Daftar Barang Belanja — {activeSumberDanaObj.nama_sumber}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {displayedSubItems.length} item terdaftar untuk sumber dana ini
                    </p>
                  </div>
                </div>

                {displayedSubItems.length === 0 ? (
                  <div className="p-12 text-center">
                    <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Belum Ada Barang Belanja</p>
                    <p className="text-xs text-slate-400 mt-1">Belum ada barang di daftar belanja yang diset ke sumber dana ini.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">No. Urut</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Folder</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Kode Rekening</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Kode Program</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Uraian</th>
                          <th className="px-4 py-3 text-xs font-bold text-blue-700 uppercase tracking-wider text-center">Volume</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Satuan</th>
                          <th className="px-4 py-3 text-xs font-bold text-emerald-700 uppercase tracking-wider text-right">Tarif Harga</th>
                          <th className="px-4 py-3 text-xs font-bold text-indigo-700 uppercase tracking-wider text-right">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedSubItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-teal-50/40 transition-colors">
                            <td className="px-4 py-3 text-xs text-slate-500">{item.no_urut ?? idx + 1}</td>
                            <td className="px-4 py-3 text-xs font-medium text-slate-700">
                              {item.folder ? (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-semibold border border-indigo-100 flex items-center gap-1 w-fit text-[11px]">
                                  <Folder className="h-3 w-3" /> {item.folder.nama_folder}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[11px]">Tanpa Folder</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs bg-slate-100 text-indigo-700 border border-slate-200 px-2 py-0.5 rounded font-semibold">{item.kode_rekening || '-'}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-xs font-mono whitespace-nowrap">{item.kode_program || '-'}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{item.uraian}</div>
                              {item.keterangan && <div className="text-xs text-slate-400 truncate max-w-[250px]">{item.keterangan}</div>}
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-blue-700 text-xs">{item.volume}</td>
                            <td className="px-4 py-3 text-center text-xs text-slate-600">{item.satuan}</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-700 text-xs whitespace-nowrap">
                              {formatRupiah(Number(item.tarif_harga))}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-indigo-700 text-xs whitespace-nowrap">
                              {formatRupiah(getItemJumlah(item))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════ MASTER DATA TABLE MODE ════════════ */}
      {viewMode === 'table' && activeSumberDanaId === null && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama, jenis, atau keterangan..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-slate-500">Memuat data sumber dana...</p>
              </div>
            ) : paged.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700 mb-1">
                  {searchQuery ? 'Tidak Ada Hasil' : 'Belum Ada Sumber Dana'}
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  {searchQuery
                    ? `Tidak ditemukan hasil untuk "${searchQuery}"`
                    : 'Tambahkan sumber dana pertama untuk mulai mengelola pendanaan.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Tambah Sekarang
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">No</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Sumber Dana</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jenis</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Keterangan</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-indigo-700 uppercase tracking-wider">Jenis Barang</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Jumlah Unit</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-teal-700 uppercase tracking-wider">Total Belanja</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paged.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-xs font-medium">
                          {(page - 1) * PER_PAGE + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            onClick={() => { setActiveSumberDanaId(item.id); setViewMode('drive'); }}
                            className="flex items-center gap-2.5 cursor-pointer hover:underline text-emerald-800"
                          >
                            <div className="p-1.5 bg-emerald-100 rounded-lg flex-shrink-0">
                              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            <span className="font-semibold text-slate-800">{item.nama_sumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.jenis_sumber ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getJenisBadge(item.jenis_sumber)}`}>
                              {item.jenis_sumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[250px] truncate">
                          {item.keterangan || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                            item.daftar_belanjas_count > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {item.daftar_belanjas_count} jenis
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                            (item.total_unit ?? 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {item.total_unit ?? 0} unit
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                            {formatRupiahShort(Number(item.total_belanja ?? 0))}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Menampilkan {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} dari {filtered.length} data
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | '...')[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...' ? (
                        <span key={`dot-${i}`} className="px-2 text-slate-400 text-xs">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={`min-w-[28px] h-7 text-xs font-medium rounded-lg transition-colors ${
                            page === p
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FORM MODAL (TAMBAH / EDIT SUMBER DANA) ── */}
      {showFormModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  {editTarget ? 'Edit Sumber Dana' : 'Tambah Sumber Dana'}
                </h3>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Nama Sumber */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Sumber Dana <span className="text-rose-500">*</span>
                </label>
                <input
                  value={formData.nama_sumber}
                  onChange={e => setFormData(f => ({ ...f, nama_sumber: e.target.value }))}
                  placeholder="Contoh: BOS (Bantuan Operasional Sekolah)"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Jenis Sumber */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jenis Sumber
                </label>
                <select
                  value={formData.jenis_sumber}
                  onChange={e => setFormData(f => ({ ...f, jenis_sumber: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">-- Pilih Jenis --</option>
                  {JENIS_OPTIONS.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              {/* Selection of Belanja Folders / Files */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-emerald-800">
                    <Folder className="h-4 w-4 text-emerald-600" /> Pilih Folder / File Daftar Belanja
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-200">
                    {formData.folder_ids.length} dipilih
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Centang folder belanja di bawah ini agar otomatis masuk dan terhubung ke sumber dana ini:
                </p>
                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1.5">
                  {availableFolders.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada folder belanja terdaftar</p>
                  ) : (
                    availableFolders.map(folder => {
                      const isChecked = formData.folder_ids.includes(folder.id);

                      return (
                        <label
                          key={folder.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 font-semibold shadow-sm'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setFormData(f => ({ ...f, folder_ids: [...f.folder_ids, folder.id] }));
                                } else {
                                  setFormData(f => ({ ...f, folder_ids: f.folder_ids.filter(id => id !== folder.id) }));
                                }
                              }}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="truncate font-medium">📁 {folder.nama_folder}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                            {folder.items_count ?? 0} item
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Keterangan
                </label>
                <textarea
                  value={formData.keterangan}
                  onChange={e => setFormData(f => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Deskripsi singkat tentang sumber dana ini..."
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
              >
                {saving ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {editTarget ? 'Perbarui' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteTarget && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-rose-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Hapus Sumber Dana?</h3>
              <p className="text-sm text-slate-500 mb-1">
                Anda akan menghapus:
              </p>
              <p className="text-sm font-semibold text-slate-700 mb-3">
                &ldquo;{deleteTarget.nama_sumber}&rdquo;
              </p>
              {(deleteTarget.asets_count > 0 || deleteTarget.daftar_belanjas_count > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-left">
                  <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Sumber dana ini masih digunakan:</p>
                  {deleteTarget.asets_count > 0 && (
                    <p className="text-xs text-amber-600">• {deleteTarget.asets_count} aset terhubung</p>
                  )}
                  {deleteTarget.daftar_belanjas_count > 0 && (
                    <p className="text-xs text-amber-600">• {deleteTarget.daftar_belanjas_count} daftar belanja terhubung</p>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
