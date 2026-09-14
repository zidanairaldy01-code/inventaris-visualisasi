'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Building2, Search, Plus, Edit2, Trash2, RefreshCw,
  MapPin, Layers, X, Save, AlertTriangle, ChevronLeft,
  ChevronRight, ArrowLeft, Grid,
  List as ListIcon, Package
} from 'lucide-react';
import Toast from '@/components/Toast';

/* ─────────────────────── Types ─────────────────────── */
interface Ruangan {
  id: number;
  id_gedung: number;
  nama_ruangan: string;
  kode_ruangan: string | null;
  lantai: number | null;
  luas_ruangan: number | null;
  deskripsi: string | null;
  foto_ruangan: string | null;
  asets_count?: number;
  created_at?: string;
}

interface Gedung {
  id: number;
  nama_gedung: string;
  kode_gedung: string | null;
  jumlah_lantai: number | null;
  deskripsi: string | null;
  foto_gedung: string | null;
  ruangans?: Ruangan[];
  ruangans_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface Aset {
  id: number;
  kode_aset: string | null;
  nama_aset: string;
  merek: string | null;
  tipe: string | null;
  warna: string | null;
  jumlah: number;
  satuan: string;
  harga_perolehan: number | null;
  id_ruangan: number | null;
  id_kondisi: number | null;
  foto_thumbnail: string | null;
  kategori?: { id: number; nama_kategori: string };
  kondisi?: { id: number; nama_kondisi: string };
}

interface GedungFormData {
  nama_gedung: string;
  kode_gedung: string;
  jumlah_lantai: string;
  deskripsi: string;
}

interface RuanganFormData {
  nama_ruangan: string;
  kode_ruangan: string;
  lantai: string;
  luas_ruangan: string;
  deskripsi: string;
}

interface Summary {
  total_gedung: number;
  total_ruangan: number;
  total_lantai: number;
  total_aset: number;
}

/* ─────────────────────── Helpers ─────────────────────── */
const emptyGedungForm = (): GedungFormData => ({
  nama_gedung: '',
  kode_gedung: '',
  jumlah_lantai: '',
  deskripsi: '',
});

const emptyRuanganForm = (): RuanganFormData => ({
  nama_ruangan: '',
  kode_ruangan: '',
  lantai: '',
  luas_ruangan: '',
  deskripsi: '',
});

const DEFAULT_KONDISIS = [
  { id: 1, nama_kondisi: 'Baik' },
  { id: 2, nama_kondisi: 'Cukup Baik' },
  { id: 3, nama_kondisi: 'Rusak Ringan' },
  { id: 4, nama_kondisi: 'Rusak Berat' },
  { id: 5, nama_kondisi: 'Tidak Layak Pakai' },
];

const getKondisiBadge = (nama?: string) => {
  if (!nama) return 'bg-slate-100 text-slate-600 border border-slate-200';
  const n = nama.toLowerCase();
  if (n === 'baik') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (n === 'cukup baik') return 'bg-sky-50 text-sky-700 border border-sky-200';
  if (n === 'rusak ringan') return 'bg-amber-50 text-amber-700 border border-amber-200';
  if (n === 'rusak berat') return 'bg-rose-50 text-rose-700 border border-rose-200';
  if (n === 'tidak layak pakai') return 'bg-purple-50 text-purple-700 border border-purple-200';
  if (n.includes('rusak')) return 'bg-rose-50 text-rose-700 border border-rose-200';
  return 'bg-slate-50 text-slate-700 border border-slate-200';
};

const getImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};



/* ══════════════════════ MAIN COMPONENT ══════════════════════ */
export default function GedungDrivePage() {
  const [gedungs, setGedungs] = useState<Gedung[]>([]);
  const [ruangans, setRuangans] = useState<Ruangan[]>([]);
  const [filtered, setFiltered] = useState<Ruangan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });

  // Navigation: 3-level hierarchy
  const [activeGedungId, setActiveGedungId] = useState<number | null>(null);
  const [activeRuanganId, setActiveRuanganId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'gedungs' | 'all'>('gedungs');

  // Pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;
  
  // Aset list for active ruangan
  const [asets, setAsets] = useState<Aset[]>([]);
  const [filteredAsets, setFilteredAsets] = useState<Aset[]>([]);

  // Gedung CRUD modal
  const [showGedungModal, setShowGedungModal] = useState(false);
  const [editGedungTarget, setEditGedungTarget] = useState<Gedung | null>(null);
  const [gedungForm, setGedungForm] = useState<GedungFormData>(emptyGedungForm());
  const [savingGedung, setSavingGedung] = useState(false);
  const [gedungFoto, setGedungFoto] = useState<File | null>(null);
  const [gedungFotoPreview, setGedungFotoPreview] = useState<string | null>(null);
  const [deleteGedungTarget, setDeleteGedungTarget] = useState<Gedung | null>(null);
  const [deletingGedung, setDeletingGedung] = useState(false);

  // Ruangan CRUD modal
  const [showRuanganModal, setShowRuanganModal] = useState(false);
  const [editRuanganTarget, setEditRuanganTarget] = useState<Ruangan | null>(null);
  const [ruanganForm, setRuanganForm] = useState<RuanganFormData>(emptyRuanganForm());
  const [savingRuangan, setSavingRuangan] = useState(false);
  const [ruanganFoto, setRuanganFoto] = useState<File | null>(null);
  const [ruanganFotoPreview, setRuanganFotoPreview] = useState<string | null>(null);
  const [deleteRuanganTarget, setDeleteRuanganTarget] = useState<Ruangan | null>(null);
  const [deletingRuangan, setDeletingRuangan] = useState(false);

  // Aset CRUD
  const [showAsetModal, setShowAsetModal] = useState(false);
  const [editAsetTarget, setEditAsetTarget] = useState<Aset | null>(null);
  const [asetForm, setAsetForm] = useState({
    nama_aset: '',
    kode_aset: '',
    merek: '',
    tipe: '',
    warna: '',
    jumlah: '1',
    satuan: 'Unit',
    harga_perolehan: '',
    id_kondisi: '',
    deskripsi: '',
  });
  const [savingAset, setSavingAset] = useState(false);
  const [asetFoto, setAsetFoto] = useState<File | null>(null);
  const [asetFotoPreview, setAsetFotoPreview] = useState<string | null>(null);
  const [deleteAsetTarget, setDeleteAsetTarget] = useState<Aset | null>(null);
  const [deletingAset, setDeletingAset] = useState(false);
  
  // Master data
  const [kondisiList, setKondisiList] = useState<{ id: number; nama_kondisi: string }[]>(DEFAULT_KONDISIS);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ show: true, message, type });
  }, []);

  /* ── Fetch Gedungs List ── */
  const fetchGedungs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/gedungs');
      setGedungs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch Ruangans by Gedung ── */
  const fetchRuangans = useCallback(async (gedungId: number | null = activeGedungId) => {
    try {
      setLoading(true);
      let url = '/api/ruangans?jenis=gedung';
      if (typeof gedungId === 'number' && gedungId > 0) {
        url += `&id_gedung=${gedungId}`;
      }
      const res = await axios.get(url);
      setRuangans(res.data);
      setFiltered(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeGedungId]);

  const fetchSummary = useCallback(async () => {
    try {
      const totalGedung = gedungs.length;
      const totalRuangan = gedungs.reduce((sum, g) => sum + (g.ruangans?.length ?? 0), 0);
      const totalLantai = gedungs.reduce((sum, g) => sum + (g.jumlah_lantai ?? 0), 0);
      
      setSummary({
        total_gedung: totalGedung,
        total_ruangan: totalRuangan,
        total_lantai: totalLantai,
        total_aset: 0,
      });
    } catch (e) {
      console.error(e);
    }
  }, [gedungs]);

  /* ── Fetch Asets by Ruangan ── */
  const fetchAsets = useCallback(async (ruanganId: number | null = activeRuanganId) => {
    if (!ruanganId) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/asets?per_page=all&id_ruangan=${ruanganId}`);
      const rawData = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      const filtered = (rawData as Aset[]).filter(a => a.id_ruangan === ruanganId);
      setAsets(filtered);
      setFilteredAsets(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeRuanganId]);

  const fetchKondisiList = useCallback(async () => {
    try {
      const res = await axios.get('/api/kondisis');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setKondisiList(res.data);
      } else {
        setKondisiList(DEFAULT_KONDISIS);
      }
    } catch {
      setKondisiList(DEFAULT_KONDISIS);
    }
  }, []);

  useEffect(() => {
    fetchGedungs();
    fetchKondisiList();
  }, [fetchGedungs, fetchKondisiList]);

  useEffect(() => {
    if (activeGedungId !== null && activeRuanganId === null) {
      fetchRuangans(activeGedungId);
    }
  }, [activeGedungId, activeRuanganId, fetchRuangans]);

  useEffect(() => {
    if (activeRuanganId !== null) {
      fetchAsets(activeRuanganId);
    }
  }, [activeRuanganId, fetchAsets]);

  useEffect(() => {
    fetchSummary();
  }, [gedungs, fetchSummary]);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    if (activeRuanganId !== null) {
      // Filter asets
      setFilteredAsets(asets.filter(a =>
        a.nama_aset.toLowerCase().includes(q) ||
        a.kode_aset?.toLowerCase().includes(q) ||
        a.merek?.toLowerCase().includes(q)
      ));
    } else {
      // Filter ruangans
      setFiltered(ruangans.filter(r =>
        r.nama_ruangan.toLowerCase().includes(q) ||
        r.kode_ruangan?.toLowerCase().includes(q) ||
        (r.lantai?.toString() ?? '').includes(q)
      ));
    }
    setPage(1);
  }, [searchQuery, ruangans, asets, activeRuanganId]);

  /* ── Get Active Objects ── */
  const activeGedungObj = gedungs.find(g => g.id === activeGedungId);
  const activeGedungTitle = activeGedungObj ? activeGedungObj.nama_gedung : 'Semua Gedung';
  const activeRuanganObj = ruangans.find(r => r.id === activeRuanganId);
  const activeRuanganTitle = activeRuanganObj ? activeRuanganObj.nama_ruangan : '';
  
  // Handler untuk klik ruangan
  const handleRuanganClick = (ruangan: Ruangan) => {
    setActiveRuanganId(ruangan.id);
    setSearchQuery('');
  };
  
  // Handler untuk kembali
  const handleBackToGedungs = () => {
    setActiveGedungId(null);
    setActiveRuanganId(null);
    setViewMode('gedungs');
    setSearchQuery('');
  };
  
  const handleBackToRuangans = () => {
    setActiveRuanganId(null);
    setSearchQuery('');
  };

  /* ── GEDUNG CRUD HANDLERS ── */
  const openCreateGedung = () => {
    setEditGedungTarget(null);
    setGedungForm(emptyGedungForm());
    setGedungFoto(null);
    setGedungFotoPreview(null);
    setShowGedungModal(true);
  };

  const openEditGedung = (g: Gedung, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditGedungTarget(g);
    setGedungForm({
      nama_gedung: g.nama_gedung,
      kode_gedung: g.kode_gedung ?? '',
      jumlah_lantai: g.jumlah_lantai ? String(g.jumlah_lantai) : '',
      deskripsi: g.deskripsi ?? '',
    });
    setGedungFoto(null);
    setGedungFotoPreview(g.foto_gedung ? getImageUrl(g.foto_gedung) : null);
    setShowGedungModal(true);
  };

  const handleSaveGedung = async () => {
    if (!gedungForm.nama_gedung.trim()) { showToast('Nama gedung wajib diisi', 'error'); return; }
    try {
      setSavingGedung(true);
      const formData = new FormData();
      formData.append('nama_gedung', gedungForm.nama_gedung);
      if (gedungForm.kode_gedung) formData.append('kode_gedung', gedungForm.kode_gedung);
      if (gedungForm.jumlah_lantai) formData.append('jumlah_lantai', gedungForm.jumlah_lantai);
      if (gedungForm.deskripsi) formData.append('deskripsi', gedungForm.deskripsi);
      if (gedungFoto) formData.append('foto_gedung', gedungFoto);

      if (editGedungTarget) {
        await axios.post(`/api/gedungs/${editGedungTarget.id}?_method=PUT`, formData);
        showToast('Gedung berhasil diperbarui', 'success');
      } else {
        await axios.post('/api/gedungs', formData);
        showToast('Gedung baru berhasil dibuat', 'success');
      }
      setShowGedungModal(false);
      fetchGedungs();
    } catch {
      showToast('Gagal menyimpan gedung', 'error');
    } finally { setSavingGedung(false); }
  };

  const handleDeleteGedung = async () => {
    if (!deleteGedungTarget) return;
    try {
      setDeletingGedung(true);
      await axios.delete(`/api/gedungs/${deleteGedungTarget.id}`);
      showToast('Gedung berhasil dihapus', 'success');
      setDeleteGedungTarget(null);
      if (activeGedungId === deleteGedungTarget.id) setActiveGedungId(null);
      fetchGedungs();
    } catch {
      showToast('Gagal menghapus gedung', 'error');
    } finally { setDeletingGedung(false); }
  };

  /* ── RUANGAN CRUD HANDLERS ── */
  const openCreateRuangan = () => {
    if (!activeGedungId) {
      showToast('Pilih gedung terlebih dahulu', 'warning');
      return;
    }
    setEditRuanganTarget(null);
    setRuanganForm(emptyRuanganForm());
    setRuanganFoto(null);
    setRuanganFotoPreview(null);
    setShowRuanganModal(true);
  };

  const openEditRuangan = (r: Ruangan) => {
    setEditRuanganTarget(r);
    setRuanganForm({
      nama_ruangan: r.nama_ruangan,
      kode_ruangan: r.kode_ruangan ?? '',
      lantai: r.lantai ? String(r.lantai) : '',
      luas_ruangan: r.luas_ruangan ? String(r.luas_ruangan) : '',
      deskripsi: r.deskripsi ?? '',
    });
    setRuanganFoto(null);
    setRuanganFotoPreview(r.foto_ruangan ? getImageUrl(r.foto_ruangan) : null);
    setShowRuanganModal(true);
  };

  const handleSaveRuangan = async () => {
    if (!ruanganForm.nama_ruangan.trim()) { showToast('Nama ruangan wajib diisi', 'error'); return; }
    if (!activeGedungId && !editRuanganTarget) {
      showToast('Pilih gedung terlebih dahulu', 'error');
      return;
    }
    try {
      setSavingRuangan(true);
      const formData = new FormData();
      const gedungId = editRuanganTarget?.id_gedung ?? activeGedungId;
      formData.append('id_gedung', String(gedungId));
      formData.append('nama_ruangan', ruanganForm.nama_ruangan);
      formData.append('jenis', 'gedung');
      if (ruanganForm.kode_ruangan) formData.append('kode_ruangan', ruanganForm.kode_ruangan);
      if (ruanganForm.lantai) formData.append('lantai', ruanganForm.lantai);
      if (ruanganForm.luas_ruangan) formData.append('luas_ruangan', ruanganForm.luas_ruangan);
      if (ruanganForm.deskripsi) formData.append('deskripsi', ruanganForm.deskripsi);
      if (ruanganFoto) formData.append('foto_ruangan', ruanganFoto);

      if (editRuanganTarget) {
        await axios.post(`/api/ruangans/${editRuanganTarget.id}?_method=PUT`, formData);
        showToast('Ruangan berhasil diperbarui', 'success');
      } else {
        await axios.post('/api/ruangans', formData);
        showToast('Ruangan baru berhasil dibuat', 'success');
      }
      setShowRuanganModal(false);
      fetchRuangans(); fetchGedungs();
    } catch {
      showToast('Gagal menyimpan ruangan', 'error');
    } finally { setSavingRuangan(false); }
  };

  const handleDeleteRuangan = async () => {
    if (!deleteRuanganTarget) return;
    try {
      setDeletingRuangan(true);
      await axios.delete(`/api/ruangans/${deleteRuanganTarget.id}`);
      showToast('Ruangan berhasil dihapus', 'success');
      setDeleteRuanganTarget(null);
      fetchRuangans(); fetchGedungs();
    } catch {
      showToast('Gagal menghapus ruangan', 'error');
    } finally { setDeletingRuangan(false); }
  };

  /* ── ASET CRUD HANDLERS ── */
  const openCreateAset = () => {
    if (!activeRuanganId) {
      showToast('Pilih ruangan terlebih dahulu', 'warning');
      return;
    }
    setEditAsetTarget(null);
    setAsetForm({
      nama_aset: '',
      kode_aset: '',
      merek: '',
      tipe: '',
      warna: '',
      jumlah: '1',
      satuan: 'Unit',
      harga_perolehan: '',
      id_kondisi: String(kondisiList[0]?.id ?? 1),
      deskripsi: '',
    });
    setAsetFoto(null);
    setAsetFotoPreview(null);
    setShowAsetModal(true);
  };

  const openEditAset = (a: Aset) => {
    setEditAsetTarget(a);
    setAsetForm({
      nama_aset: a.nama_aset,
      kode_aset: a.kode_aset ?? '',
      merek: a.merek ?? '',
      tipe: a.tipe ?? '',
      warna: a.warna ?? '',
      jumlah: String(a.jumlah),
      satuan: a.satuan,
      harga_perolehan: a.harga_perolehan ? String(a.harga_perolehan) : '',
      id_kondisi: String(a.kondisi?.id ?? ''),
      deskripsi: '',
    });
    setAsetFoto(null);
    setAsetFotoPreview(a.foto_thumbnail ? getImageUrl(a.foto_thumbnail) : null);
    setShowAsetModal(true);
  };

  const handleSaveAset = async () => {
    if (!asetForm.nama_aset.trim()) { showToast('Nama aset wajib diisi', 'error'); return; }
    const ruanganId = editAsetTarget?.id_ruangan ?? activeRuanganId;
    if (!ruanganId) {
      showToast('Pilih ruangan terlebih dahulu', 'error');
      return;
    }
    try {
      setSavingAset(true);
      const formData = new FormData();
      formData.append('nama_aset', asetForm.nama_aset.trim());
      if (asetForm.kode_aset) formData.append('kode_aset', asetForm.kode_aset.trim());
      if (asetForm.merek) formData.append('merek', asetForm.merek.trim());
      if (asetForm.tipe) formData.append('tipe', asetForm.tipe.trim());
      if (asetForm.warna) formData.append('warna', asetForm.warna.trim());
      formData.append('jumlah', asetForm.jumlah || '1');
      formData.append('satuan', asetForm.satuan || 'Unit');
      if (asetForm.harga_perolehan) formData.append('harga_perolehan', asetForm.harga_perolehan);
      
      const chosenKondisi = asetForm.id_kondisi ? asetForm.id_kondisi : String(kondisiList[0]?.id ?? 1);
      formData.append('id_kondisi', chosenKondisi);
      formData.append('id_ruangan', String(ruanganId));
      if (asetForm.deskripsi) formData.append('deskripsi', asetForm.deskripsi.trim());
      formData.append('tahun_perolehan', String(new Date().getFullYear()));
      formData.append('status_aset', 'aktif');
      if (asetFoto) formData.append('foto_thumbnail', asetFoto);

      if (editAsetTarget) {
        await axios.post(`/api/asets/${editAsetTarget.id}?_method=PUT`, formData);
        showToast('Aset berhasil diperbarui', 'success');
      } else {
        await axios.post('/api/asets', formData);
        showToast('Aset baru berhasil dibuat', 'success');
      }
      setShowAsetModal(false);
      fetchAsets(); fetchRuangans(); fetchGedungs();
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } };
      if (e?.response?.status === 401) {
        showToast('Sesi login telah berakhir. Silakan login kembali.', 'error');
        return;
      }
      const errMsg = e?.response?.data?.message ||
        (e?.response?.data?.errors ? Object.values(e.response.data.errors).flat().join(', ') : 'Gagal menyimpan aset');
      showToast(errMsg, 'error');
    } finally { setSavingAset(false); }
  };

  const handleDeleteAset = async () => {
    if (!deleteAsetTarget) return;
    try {
      setDeletingAset(true);
      await axios.delete(`/api/asets/${deleteAsetTarget.id}`);
      showToast('Aset berhasil dihapus', 'success');
      setDeleteAsetTarget(null);
      fetchAsets(); fetchRuangans(); fetchGedungs();
    } catch {
      showToast('Gagal menghapus aset', 'error');
    } finally { setDeletingAset(false); }
  };

  /* ── Pagination ── */
  const totalPages = activeRuanganId !== null 
    ? Math.ceil(filteredAsets.length / PER_PAGE)
    : Math.ceil(filtered.length / PER_PAGE);
  const paged = activeRuanganId !== null
    ? filteredAsets.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    : filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Master Gedung</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/20">
                  Drive System
                </span>
              </div>
              <p className="text-blue-100 text-sm mt-1">Kelola gedung dan ruangan secara terstruktur ala folder drive</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeGedungId === null && (
              <button
                onClick={openCreateGedung}
                className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <Plus className="h-4 w-4 text-indigo-600" /> + Tambah Gedung
              </button>
            )}
            <button
              onClick={() => { setActiveGedungId(null); setViewMode('gedungs'); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeGedungId === null && viewMode === 'gedungs'
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              <Grid className="h-4 w-4" /> Daftar Gedung
            </button>
            <button
              onClick={() => { setActiveGedungId(null); setViewMode('all'); }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeGedungId === null && viewMode === 'all'
                  ? 'bg-white text-indigo-700 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              <ListIcon className="h-4 w-4" /> Semua Ruangan
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 flex-wrap">
          <button
            onClick={handleBackToGedungs}
            className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-700"
          >
            <Building2 className="h-4 w-4 text-indigo-600" />
            <span>Master Gedung</span>
          </button>

          {activeGedungId !== null && (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <button
                onClick={handleBackToRuangans}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  activeRuanganId === null
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span>{activeGedungTitle}</span>
              </button>
            </>
          )}

          {activeRuanganId !== null && (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg text-indigo-700 font-bold">
                <MapPin className="h-4 w-4 text-indigo-600" />
                <span>{activeRuanganTitle}</span>
              </div>
            </>
          )}
        </div>

        {(activeGedungId !== null || activeRuanganId !== null) && (
          <button
            onClick={activeRuanganId !== null ? handleBackToRuangans : handleBackToGedungs}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-xs font-semibold"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Gedung', value: summary.total_gedung, icon: Building2, from: 'from-indigo-500', to: 'to-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900' },
            { label: 'Total Ruangan', value: summary.total_ruangan, icon: MapPin, from: 'from-blue-500', to: 'to-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
            { label: 'Total Lantai', value: summary.total_lantai, icon: Layers, from: 'from-emerald-500', to: 'to-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900' },
            { label: 'Total Aset', value: summary.total_aset, icon: Package, from: 'from-purple-500', to: 'to-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' },
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

      {/* ════════ TAMPILAN GEDUNG GRID (Root View) ════════ */}
      {activeGedungId === null && viewMode === 'gedungs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Daftar Gedung ({gedungs.length})
            </h2>
            <button
              onClick={openCreateGedung}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> + Tambah Gedung
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl mb-3" />
                  <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : gedungs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">Belum Ada Gedung</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Tambahkan gedung pertama untuk mulai mengelola ruangan dan aset.
              </p>
              <button
                onClick={openCreateGedung}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="h-4 w-4" /> Tambah Gedung Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gedungs.map((g, idx) => {
                const ruanganCount = g.ruangans?.length ?? g.ruangans_count ?? 0;
                const gradients = [
                  { gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
                  { gradient: 'from-violet-600 to-purple-600', bg: 'bg-violet-50', iconColor: 'text-violet-600' },
                  { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
                  { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', iconColor: 'text-amber-600' },
                  { gradient: 'from-rose-500 to-red-500', bg: 'bg-rose-50', iconColor: 'text-rose-600' },
                  { gradient: 'from-cyan-500 to-teal-500', bg: 'bg-cyan-50', iconColor: 'text-cyan-600' },
                ];
                const color = gradients[idx % gradients.length];

                return (
                  <div
                    key={g.id}
                    onClick={() => setActiveGedungId(g.id)}
                    className="relative bg-white overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 cursor-pointer flex flex-col justify-between group"
                  >
                    {/* Gradient strip top — muncul saat hover, sama persis dengan dashboard */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${color.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-3 rounded-2xl ${color.bg} group-hover:scale-110 transition-transform duration-300`}>
                          {g.foto_gedung ? (
                            <img src={getImageUrl(g.foto_gedung) || ''} alt={g.nama_gedung} className="w-5 h-5 object-cover rounded" />
                          ) : (
                            <Building2 className={`h-5 w-5 ${color.iconColor}`} />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${color.bg} ${color.iconColor} border border-slate-100`}>
                            Gedung
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                            <button
                              onClick={(e) => openEditGedung(g, e)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                              title="Edit Gedung"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteGedungTarget(g); }}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg"
                              title="Hapus Gedung"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-slate-500 mb-1">{g.kode_gedung ?? 'Tanpa Kode'}</p>
                      <p className="text-lg font-black text-slate-900 tracking-tight mb-1 line-clamp-1">{g.nama_gedung}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{g.deskripsi ?? `${ruanganCount} ruangan · ${g.jumlah_lantai ?? 0} lantai`}</p>
                    </div>

                    {/* Footer — sama dengan dashboard */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {ruanganCount} Ruangan
                        <Layers className="h-3 w-3 ml-1" />
                        {g.jumlah_lantai ?? 0} Lantai
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════ TAMPILAN TABEL RUANGAN (Inside Gedung View / All Mode) ════════ */}
      {(activeGedungId !== null || viewMode === 'all') && activeRuanganId === null && (
        <>
          {/* Actions Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text" placeholder={`Cari ruangan di ${activeGedungTitle}...`}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => fetchRuangans()} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors" title="Refresh">
                  <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
                {activeGedungId && (
                  <button onClick={openCreateRuangan}
                    className="flex items-center gap-2 px-3 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm">
                    <Plus className="h-4 w-4" /><span className="hidden sm:inline">Tambah Ruangan</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card Grid Ruangan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-500" />
                Daftar Ruangan — {activeGedungTitle}
                <span className="text-xs font-normal text-slate-400">
                  ({filtered.length}{searchQuery ? ` dari ${ruangans.length}` : ''} ruangan)
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                    <div className="w-10 h-10 bg-slate-200 rounded-2xl mb-3" />
                    <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                    <div className="h-5 bg-slate-200 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2 mt-4 pt-3 border-t border-slate-100" />
                  </div>
                ))}
              </div>
            ) : paged.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700 mb-1">
                  {searchQuery ? 'Tidak ada ruangan sesuai pencarian' : `Belum ada ruangan di ${activeGedungTitle}`}
                </h3>
                {activeGedungId && !searchQuery && (
                  <button onClick={openCreateRuangan}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-semibold shadow-sm transition-colors">
                    <Plus className="h-4 w-4" /> Tambah Ruangan ke Gedung Ini
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(paged as Ruangan[]).map((r, i) => {
                    const ruanganGradients = [
                      { gradient: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
                      { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
                      { gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', iconColor: 'text-violet-600' },
                      { gradient: 'from-amber-500 to-orange-400', bg: 'bg-amber-50', iconColor: 'text-amber-600' },
                      { gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', iconColor: 'text-rose-600' },
                      { gradient: 'from-cyan-500 to-sky-500', bg: 'bg-cyan-50', iconColor: 'text-cyan-600' },
                    ];
                    const color = ruanganGradients[((page - 1) * PER_PAGE + i) % ruanganGradients.length];

                    return (
                      <div
                        key={r.id}
                        onClick={() => handleRuanganClick(r)}
                        className="relative bg-white overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 cursor-pointer flex flex-col justify-between group"
                      >
                        {/* Gradient strip top */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${color.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className={`p-3 rounded-2xl ${color.bg} group-hover:scale-110 transition-transform duration-300`}>
                              {r.foto_ruangan ? (
                                <img src={getImageUrl(r.foto_ruangan) || ''} alt={r.nama_ruangan} className="w-5 h-5 object-cover rounded" />
                              ) : (
                                <MapPin className={`h-5 w-5 ${color.iconColor}`} />
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${color.bg} ${color.iconColor} border border-slate-100`}>
                                Lantai {r.lantai ?? '-'}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditRuangan(r); }}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                                  title="Edit Ruangan"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteRuanganTarget(r); }}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg"
                                  title="Hapus Ruangan"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {r.kode_ruangan && (
                            <p className="text-xs font-semibold text-slate-500 mb-1 font-mono">{r.kode_ruangan}</p>
                          )}
                          <p className="text-lg font-black text-slate-900 tracking-tight mb-1 line-clamp-1">{r.nama_ruangan}</p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {r.deskripsi ?? `${r.luas_ruangan ? `${r.luas_ruangan} m²` : 'Luas belum diisi'}`}
                          </p>
                          {viewMode === 'all' && (
                            <p className="text-[10px] text-indigo-500 font-semibold mt-1 line-clamp-1">
                              {gedungs.find(g => g.id === r.id_gedung)?.nama_gedung ?? ''}
                            </p>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors">
                          <span className="flex items-center gap-1.5">
                            <Package className="h-3 w-3" />
                            {r.asets_count ?? 0} Aset
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
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
              </>
            )}
          </div>
        </>
      )}

      {/* ════════ TAMPILAN GRID/TABLE ASET (Inside Ruangan View) ════════ */}
      {activeRuanganId !== null && (
        <>
          {/* Actions Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text" 
                  placeholder={`Cari aset di ${activeRuanganTitle}...`}
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  onClick={() => fetchAsets()} 
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors" 
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button 
                  onClick={openCreateAset}
                  className="flex items-center gap-2 px-3 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Tambah Aset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grid Aset */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Package className="h-4 w-4 text-indigo-600" />
                  Daftar Aset — {activeRuanganTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {filteredAsets.length} aset {searchQuery ? `(dari ${asets.length})` : ''}
                </p>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                </div>
              ) : paged.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-slate-600 font-medium">
                    {searchQuery ? 'Tidak ada aset sesuai pencarian' : `Belum ada aset di ${activeRuanganTitle}`}
                  </h3>
                  {!searchQuery && (
                    <button 
                      onClick={openCreateAset}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" /> Tambah Aset ke Ruangan Ini
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(paged as Aset[]).map((aset) => (
                    <div 
                      key={aset.id} 
                      className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
                    >
                      {/* Foto Aset */}
                      <div className="relative mb-3 rounded-lg overflow-hidden bg-slate-100 aspect-square">
                        {aset.foto_thumbnail ? (
                          <img 
                            src={getImageUrl(aset.foto_thumbnail) || ''} 
                            alt={aset.nama_aset}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-slate-300" />
                          </div>
                        )}
                        
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditAset(aset)}
                            className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Edit Aset"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteAsetTarget(aset)}
                            className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Hapus Aset"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Info Aset */}
                      <div>
                        {aset.kode_aset && (
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono mb-1">
                            {aset.kode_aset}
                          </span>
                        )}
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-2 mb-1">
                          {aset.nama_aset}
                        </h3>
                        
                        {aset.merek && (
                          <p className="text-xs text-slate-500 mb-2">
                            {aset.merek}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                              {aset.jumlah} {aset.satuan}
                            </span>
                          </div>
                          
                          {aset.kondisi && (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getKondisiBadge(aset.kondisi.nama_kondisi)}`}>
                              {aset.kondisi.nama_kondisi}
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Halaman {page} dari {totalPages}</span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))} 
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-slate-600" />
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════ GEDUNG CREATE / EDIT MODAL ════════ */}
      {showGedungModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                {editGedungTarget ? 'Edit Gedung' : 'Tambah Gedung Baru'}
              </h3>
              <button onClick={() => setShowGedungModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Gedung <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={gedungForm.nama_gedung}
                  onChange={e => setGedungForm(f => ({ ...f, nama_gedung: e.target.value }))}
                  placeholder="Misal: Gedung A, Gedung Administrasi..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Gedung</label>
                  <input
                    type="text"
                    value={gedungForm.kode_gedung}
                    onChange={e => setGedungForm(f => ({ ...f, kode_gedung: e.target.value }))}
                    placeholder="GD-A"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Lantai</label>
                  <input
                    type="number"
                    value={gedungForm.jumlah_lantai}
                    onChange={e => setGedungForm(f => ({ ...f, jumlah_lantai: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={gedungForm.deskripsi}
                  onChange={e => setGedungForm(f => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Deskripsi singkat gedung..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Foto Gedung</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setGedungFoto(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setGedungFotoPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                  />
                  {gedungFotoPreview && (
                    <img src={gedungFotoPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowGedungModal(false)}
                  disabled={savingGedung}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveGedung}
                  disabled={savingGedung}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {savingGedung ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingGedung ? 'Simpan...' : 'Simpan Gedung'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ DELETE GEDUNG CONFIRM MODAL ════════ */}
      {deleteGedungTarget && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hapus Gedung Ini?</h3>
            <p className="text-sm text-slate-600 mb-1">
              <span className="font-semibold text-slate-800">{deleteGedungTarget.nama_gedung}</span>
            </p>
            <p className="text-xs text-slate-500 mb-6">Ruangan dan aset di dalamnya tidak akan terhapus, tetapi perlu dikelola ulang.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteGedungTarget(null)} disabled={deletingGedung}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors">Batal</button>
              <button onClick={handleDeleteGedung} disabled={deletingGedung}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {deletingGedung ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletingGedung ? 'Hapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ RUANGAN CREATE / EDIT MODAL ════════ */}
      {showRuanganModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-600" />
                {editRuanganTarget ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}
              </h3>
              <button onClick={() => setShowRuanganModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ruangan <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={ruanganForm.nama_ruangan}
                  onChange={e => setRuanganForm(f => ({ ...f, nama_ruangan: e.target.value }))}
                  placeholder="Misal: Lab Komputer, Ruang Guru..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Ruangan</label>
                  <input
                    type="text"
                    value={ruanganForm.kode_ruangan}
                    onChange={e => setRuanganForm(f => ({ ...f, kode_ruangan: e.target.value }))}
                    placeholder="R-01"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lantai</label>
                  <input
                    type="number"
                    value={ruanganForm.lantai}
                    onChange={e => setRuanganForm(f => ({ ...f, lantai: e.target.value }))}
                    placeholder="1"
                    min="0"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Luas Ruangan (m²)</label>
                <input
                  type="number"
                  value={ruanganForm.luas_ruangan}
                  onChange={e => setRuanganForm(f => ({ ...f, luas_ruangan: e.target.value }))}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={ruanganForm.deskripsi}
                  onChange={e => setRuanganForm(f => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Deskripsi singkat ruangan..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Foto Ruangan</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setRuanganFoto(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setRuanganFotoPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                  />
                  {ruanganFotoPreview && (
                    <img src={ruanganFotoPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRuanganModal(false)}
                  disabled={savingRuangan}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveRuangan}
                  disabled={savingRuangan}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {savingRuangan ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingRuangan ? 'Simpan...' : 'Simpan Ruangan'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ DELETE RUANGAN CONFIRM MODAL ════════ */}
      {deleteRuanganTarget && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hapus Ruangan Ini?</h3>
            <p className="text-sm text-slate-600 mb-1">
              <span className="font-semibold text-slate-800">{deleteRuanganTarget.nama_ruangan}</span>
            </p>
            <p className="text-xs text-slate-500 mb-6">Aset di ruangan ini tidak akan terhapus, tetapi perlu dikelola ulang.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteRuanganTarget(null)} disabled={deletingRuangan}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors">Batal</button>
              <button onClick={handleDeleteRuangan} disabled={deletingRuangan}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {deletingRuangan ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletingRuangan ? 'Hapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ ASET CREATE / EDIT MODAL ════════ */}
      {showAsetModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                {editAsetTarget ? 'Edit Aset' : 'Tambah Aset Baru'}
              </h3>
              <button onClick={() => setShowAsetModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Aset <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={asetForm.nama_aset}
                    onChange={e => setAsetForm(f => ({ ...f, nama_aset: e.target.value }))}
                    placeholder="Contoh: Kursi Kuliah, Meja Guru, Proyektor..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Aset</label>
                  <input
                    type="text"
                    value={asetForm.kode_aset}
                    onChange={e => setAsetForm(f => ({ ...f, kode_aset: e.target.value }))}
                    placeholder="AST-001"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Merek</label>
                  <input
                    type="text"
                    value={asetForm.merek}
                    onChange={e => setAsetForm(f => ({ ...f, merek: e.target.value }))}
                    placeholder="Merek aset"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe</label>
                  <input
                    type="text"
                    value={asetForm.tipe}
                    onChange={e => setAsetForm(f => ({ ...f, tipe: e.target.value }))}
                    placeholder="Tipe aset"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Warna</label>
                  <input
                    type="text"
                    value={asetForm.warna}
                    onChange={e => setAsetForm(f => ({ ...f, warna: e.target.value }))}
                    placeholder="Warna aset"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah</label>
                  <input
                    type="number"
                    value={asetForm.jumlah}
                    onChange={e => setAsetForm(f => ({ ...f, jumlah: e.target.value }))}
                    min="1"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={asetForm.satuan}
                    onChange={e => setAsetForm(f => ({ ...f, satuan: e.target.value }))}
                    placeholder="Unit, Pcs, Set..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Perolehan</label>
                  <input
                    type="number"
                    value={asetForm.harga_perolehan}
                    onChange={e => setAsetForm(f => ({ ...f, harga_perolehan: e.target.value }))}
                    placeholder="0"
                    min="0"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kondisi</label>
                  <select
                    value={asetForm.id_kondisi}
                    onChange={e => setAsetForm(f => ({ ...f, id_kondisi: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Pilih Kondisi</option>
                    {kondisiList.map(k => (
                      <option key={k.id} value={k.id}>{k.nama_kondisi}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
                  <textarea
                    value={asetForm.deskripsi}
                    onChange={e => setAsetForm(f => ({ ...f, deskripsi: e.target.value }))}
                    placeholder="Deskripsi aset..."
                    rows={2}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Foto Aset</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAsetFoto(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setAsetFotoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                    />
                    {asetFotoPreview && (
                      <img 
                        src={asetFotoPreview} 
                        alt="Preview" 
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200" 
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowAsetModal(false)}
                disabled={savingAset}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveAset}
                disabled={savingAset}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {savingAset ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingAset ? 'Simpan...' : 'Simpan Aset'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ════════ DELETE ASET CONFIRM MODAL ════════ */}
      {deleteAsetTarget && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Hapus Aset Ini?</h3>
            <p className="text-sm text-slate-600 mb-1">
              <span className="font-semibold text-slate-800">{deleteAsetTarget.nama_aset}</span>
            </p>
            <p className="text-xs text-slate-500 mb-6">Data aset akan dihapus permanen dari sistem.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteAsetTarget(null)} 
                disabled={deletingAset}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleDeleteAset} 
                disabled={deletingAset}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deletingAset ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletingAset ? 'Hapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
