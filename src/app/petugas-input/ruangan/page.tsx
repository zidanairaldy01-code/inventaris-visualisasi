'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Map, Search, Plus, Edit2, Trash2, RefreshCw,
  MapPin, Layers, X, Save, AlertTriangle, Building2,
  Package, Eye, Info, ArrowLeft, ChevronRight, DollarSign,
  Tag, CheckCircle2, Wrench
} from 'lucide-react';
import Toast from '@/components/Toast';

/* ─────────────────────── Types ─────────────────────── */
interface Ruangan {
  id: number;
  id_gedung: number | null;
  nama_ruangan: string;
  jenis?: string;
  kode_ruangan: string | null;
  lantai: number | null;
  luas_ruangan: number | null;
  deskripsi: string | null;
  foto_ruangan: string | null;
  asets_count?: number;
  gedung?: {
    id: number;
    nama_gedung: string;
    kode_gedung: string | null;
  } | null;
  created_at?: string;
}

interface Gedung {
  id: number;
  nama_gedung: string;
  kode_gedung: string | null;
}

interface Kondisi {
  id: number;
  nama_kondisi: string;
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
  deskripsi: string | null;
  status_aset?: string;
  kategori?: { id: number; nama_kategori: string };
  kondisi?: { id: number; nama_kondisi: string };
  created_at?: string;
}

interface RuanganFormData {
  id_gedung: string;
  nama_ruangan: string;
  kode_ruangan: string;
  lantai: string;
  luas_ruangan: string;
  deskripsi: string;
}

interface AsetFormData {
  nama_aset: string;
  kode_aset: string;
  merek: string;
  tipe: string;
  warna: string;
  jumlah: string;
  satuan: string;
  harga_perolehan: string;
  id_kondisi: string;
  deskripsi: string;
}

/* ─────────────────────── Helpers ─────────────────────── */
const emptyRuanganForm = (): RuanganFormData => ({
  id_gedung: '',
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

const emptyAsetForm = (): AsetFormData => ({
  nama_aset: '',
  kode_aset: '',
  merek: '',
  tipe: '',
  warna: '',
  jumlah: '1',
  satuan: 'Unit',
  harga_perolehan: '',
  id_kondisi: '1',
  deskripsi: '',
});

const formatRupiah = (n: number | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const getImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

/* ══════════════════════ MAIN COMPONENT ══════════════════════ */
export default function RuanganWorkshopPage() {
  const [ruangans, setRuangans] = useState<Ruangan[]>([]);
  const [gedungs, setGedungs] = useState<Gedung[]>([]);
  const [kondisis, setKondisis] = useState<Kondisi[]>(DEFAULT_KONDISIS);
  const [filteredRuangans, setFilteredRuangans] = useState<Ruangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGedung, setSelectedGedung] = useState<string>('all');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ 
    show: false, 
    message: '', 
    type: 'success' 
  });

  // Active workshop room (for managing assets inside workshop)
  const [activeWorkshop, setActiveWorkshop] = useState<Ruangan | null>(null);
  const [workshopAsets, setWorkshopAsets] = useState<Aset[]>([]);
  const [filteredAsets, setFilteredAsets] = useState<Aset[]>([]);
  const [asetSearchQuery, setAsetSearchQuery] = useState('');
  const [loadingAsets, setLoadingAsets] = useState(false);

  // Ruangan CRUD modals
  const [showRuanganModal, setShowRuanganModal] = useState(false);
  const [editRuanganTarget, setEditRuanganTarget] = useState<Ruangan | null>(null);
  const [ruanganForm, setRuanganForm] = useState<RuanganFormData>(emptyRuanganForm());
  const [savingRuangan, setSavingRuangan] = useState(false);
  const [ruanganFoto, setRuanganFoto] = useState<File | null>(null);
  const [ruanganFotoPreview, setRuanganFotoPreview] = useState<string | null>(null);
  const [deleteRuanganTarget, setDeleteRuanganTarget] = useState<Ruangan | null>(null);
  const [deletingRuangan, setDeletingRuangan] = useState(false);
  const [detailRuanganTarget, setDetailRuanganTarget] = useState<Ruangan | null>(null);

  // Aset Workshop CRUD modals
  const [showAsetModal, setShowAsetModal] = useState(false);
  const [editAsetTarget, setEditAsetTarget] = useState<Aset | null>(null);
  const [asetForm, setAsetForm] = useState<AsetFormData>(emptyAsetForm());
  const [savingAset, setSavingAset] = useState(false);
  const [asetFoto, setAsetFoto] = useState<File | null>(null);
  const [asetFotoPreview, setAsetFotoPreview] = useState<string | null>(null);
  const [deleteAsetTarget, setDeleteAsetTarget] = useState<Aset | null>(null);
  const [deletingAset, setDeletingAset] = useState(false);
  const [detailAsetTarget, setDetailAsetTarget] = useState<Aset | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ show: true, message, type });
  }, []);

  /* ── Fetch Ruangan Workshop List ── */
  const fetchRuangans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/ruangans?jenis=workshop');
      setRuangans(res.data);
      setFilteredRuangans(res.data);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data ruangan workshop', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* ── Fetch Gedungs, Kondisis ── */
  const fetchMasters = useCallback(async () => {
    try {
      const [gedungRes, konRes] = await Promise.all([
        axios.get('/api/gedungs'),
        axios.get('/api/kondisis'),
      ]);
      setGedungs(gedungRes.data);
      if (Array.isArray(konRes.data) && konRes.data.length > 0) {
        setKondisis(konRes.data);
      } else {
        setKondisis(DEFAULT_KONDISIS);
      }
    } catch (e) {
      console.error(e);
      setKondisis(DEFAULT_KONDISIS);
    }
  }, []);

  /* ── Fetch Asets for Active Workshop ── */
  const fetchWorkshopAsets = useCallback(async (ruanganId: number) => {
    try {
      setLoadingAsets(true);
      const res = await axios.get(`/api/asets?per_page=all&id_ruangan=${ruanganId}`);
      const data = Array.isArray(res.data) ? res.data : (res.data.data ?? []);
      // Ensure only asets belonging to this ruangan
      const filtered = data.filter((a: Aset) => a.id_ruangan === ruanganId);
      setWorkshopAsets(filtered);
      setFilteredAsets(filtered);
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat daftar aset workshop', 'error');
    } finally {
      setLoadingAsets(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRuangans();
    fetchMasters();
  }, [fetchRuangans, fetchMasters]);

  useEffect(() => {
    if (activeWorkshop) {
      fetchWorkshopAsets(activeWorkshop.id);
    }
  }, [activeWorkshop, fetchWorkshopAsets]);

  /* ── Filter & Search Ruangans ── */
  useEffect(() => {
    let result = ruangans;
    
    if (selectedGedung !== 'all') {
      if (selectedGedung === 'none') {
        result = result.filter(r => !r.id_gedung);
      } else {
        result = result.filter(r => r.id_gedung === parseInt(selectedGedung));
      }
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.nama_ruangan.toLowerCase().includes(q) ||
        r.kode_ruangan?.toLowerCase().includes(q) ||
        r.gedung?.nama_gedung.toLowerCase().includes(q) ||
        (r.lantai?.toString() ?? '').includes(q)
      );
    }
    
    setFilteredRuangans(result);
  }, [ruangans, searchQuery, selectedGedung]);

  /* ── Filter & Search Asets in Active Workshop ── */
  useEffect(() => {
    if (!asetSearchQuery.trim()) {
      setFilteredAsets(workshopAsets);
      return;
    }
    const q = asetSearchQuery.toLowerCase();
    setFilteredAsets(
      workshopAsets.filter(a =>
        a.nama_aset.toLowerCase().includes(q) ||
        a.kode_aset?.toLowerCase().includes(q) ||
        a.merek?.toLowerCase().includes(q) ||
        a.tipe?.toLowerCase().includes(q)
      )
    );
  }, [workshopAsets, asetSearchQuery]);

  /* ── RUANGAN CRUD HANDLERS ── */
  const openCreateRuanganModal = () => {
    setEditRuanganTarget(null);
    setRuanganForm(emptyRuanganForm());
    setRuanganFoto(null);
    setRuanganFotoPreview(null);
    setShowRuanganModal(true);
  };

  const openEditRuanganModal = (r: Ruangan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditRuanganTarget(r);
    setRuanganForm({
      id_gedung: r.id_gedung ? String(r.id_gedung) : '',
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
    if (!ruanganForm.nama_ruangan.trim()) {
      showToast('Nama ruangan workshop wajib diisi', 'error');
      return;
    }

    try {
      setSavingRuangan(true);
      const fd = new FormData();
      if (ruanganForm.id_gedung) fd.append('id_gedung', ruanganForm.id_gedung);
      fd.append('nama_ruangan', ruanganForm.nama_ruangan);
      fd.append('jenis', 'workshop');
      if (ruanganForm.kode_ruangan) fd.append('kode_ruangan', ruanganForm.kode_ruangan);
      if (ruanganForm.lantai) fd.append('lantai', ruanganForm.lantai);
      if (ruanganForm.luas_ruangan) fd.append('luas_ruangan', ruanganForm.luas_ruangan);
      if (ruanganForm.deskripsi) fd.append('deskripsi', ruanganForm.deskripsi);
      if (ruanganFoto) fd.append('foto_ruangan', ruanganFoto);

      if (editRuanganTarget) {
        await axios.post(`/api/ruangans/${editRuanganTarget.id}?_method=PUT`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Ruangan workshop berhasil diperbarui', 'success');
        if (activeWorkshop && activeWorkshop.id === editRuanganTarget.id) {
          setActiveWorkshop(prev => prev ? {
            ...prev,
            nama_ruangan: ruanganForm.nama_ruangan,
            kode_ruangan: ruanganForm.kode_ruangan || null,
            lantai: ruanganForm.lantai ? Number(ruanganForm.lantai) : null,
            luas_ruangan: ruanganForm.luas_ruangan ? Number(ruanganForm.luas_ruangan) : null,
            deskripsi: ruanganForm.deskripsi || null,
            id_gedung: ruanganForm.id_gedung ? Number(ruanganForm.id_gedung) : null
          } : null);
        }
      } else {
        await axios.post('/api/ruangans', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Ruangan workshop baru berhasil ditambahkan', 'success');
      }
      setShowRuanganModal(false);
      fetchRuangans();
    } catch (err) {
      showToast('Gagal menyimpan ruangan workshop', 'error');
    } finally {
      setSavingRuangan(false);
    }
  };

  const handleDeleteRuangan = async () => {
    if (!deleteRuanganTarget) return;
    try {
      setDeletingRuangan(true);
      await axios.delete(`/api/ruangans/${deleteRuanganTarget.id}`);
      showToast('Ruangan workshop berhasil dihapus', 'success');
      setDeleteRuanganTarget(null);
      if (activeWorkshop && activeWorkshop.id === deleteRuanganTarget.id) {
        setActiveWorkshop(null);
      }
      fetchRuangans();
    } catch {
      showToast('Gagal menghapus ruangan workshop', 'error');
    } finally {
      setDeletingRuangan(false);
    }
  };

  const handleRuanganFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRuanganFoto(file);
      setRuanganFotoPreview(URL.createObjectURL(file));
    }
  };

  /* ── ASET WORKSHOP CRUD HANDLERS ── */
  const openCreateAsetModal = () => {
    setEditAsetTarget(null);
    setAsetForm(emptyAsetForm());
    setAsetFoto(null);
    setAsetFotoPreview(null);
    setShowAsetModal(true);
  };

  const openEditAsetModal = (aset: Aset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditAsetTarget(aset);
    setAsetForm({
      nama_aset: aset.nama_aset,
      kode_aset: aset.kode_aset ?? '',
      merek: aset.merek ?? '',
      tipe: aset.tipe ?? '',
      warna: aset.warna ?? '',
      jumlah: String(aset.jumlah ?? 1),
      satuan: aset.satuan || 'Unit',
      harga_perolehan: aset.harga_perolehan ? String(aset.harga_perolehan) : '',
      id_kondisi: aset.id_kondisi ? String(aset.id_kondisi) : (aset.kondisi?.id ? String(aset.kondisi.id) : ''),
      deskripsi: aset.deskripsi ?? '',
    });
    setAsetFoto(null);
    setAsetFotoPreview(aset.foto_thumbnail ? getImageUrl(aset.foto_thumbnail) : null);
    setShowAsetModal(true);
  };

  const handleSaveAset = async () => {
    if (!activeWorkshop) return;
    if (!asetForm.nama_aset.trim()) {
      showToast('Nama aset workshop wajib diisi', 'error');
      return;
    }

    try {
      setSavingAset(true);
      const fd = new FormData();
      fd.append('nama_aset', asetForm.nama_aset);
      if (asetForm.kode_aset) fd.append('kode_aset', asetForm.kode_aset);
      if (asetForm.merek) fd.append('merek', asetForm.merek);
      if (asetForm.tipe) fd.append('tipe', asetForm.tipe);
      if (asetForm.warna) fd.append('warna', asetForm.warna);
      fd.append('jumlah', asetForm.jumlah || '1');
      fd.append('satuan', asetForm.satuan || 'Unit');
      if (asetForm.harga_perolehan) fd.append('harga_perolehan', asetForm.harga_perolehan);
      fd.append('id_kondisi', asetForm.id_kondisi || String(kondisis[0]?.id ?? 1));
      if (asetForm.deskripsi) fd.append('deskripsi', asetForm.deskripsi);
      
      // Tied specifically to active workshop ruangan
      fd.append('id_ruangan', String(activeWorkshop.id));
      fd.append('status_aset', 'aktif');
      fd.append('tahun_perolehan', String(new Date().getFullYear()));

      if (asetFoto) fd.append('foto_thumbnail', asetFoto);

      if (editAsetTarget) {
        await axios.post(`/api/asets/${editAsetTarget.id}?_method=PUT`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Aset workshop berhasil diperbarui', 'success');
      } else {
        await axios.post('/api/asets', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Aset workshop baru berhasil ditambahkan', 'success');
      }

      setShowAsetModal(false);
      fetchWorkshopAsets(activeWorkshop.id);
      fetchRuangans(); // Update asets_count on rooms
    } catch (e) {
      console.error(e);
      showToast('Gagal menyimpan aset workshop', 'error');
    } finally {
      setSavingAset(false);
    }
  };

  const handleDeleteAset = async () => {
    if (!deleteAsetTarget || !activeWorkshop) return;
    try {
      setDeletingAset(true);
      await axios.delete(`/api/asets/${deleteAsetTarget.id}`);
      showToast('Aset workshop berhasil dihapus', 'success');
      setDeleteAsetTarget(null);
      fetchWorkshopAsets(activeWorkshop.id);
      fetchRuangans();
    } catch {
      showToast('Gagal menghapus aset workshop', 'error');
    } finally {
      setDeletingAset(false);
    }
  };

  const handleAsetFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAsetFoto(file);
      setAsetFotoPreview(URL.createObjectURL(file));
    }
  };

  /* ── Active Workshop Stats ── */
  const activeTotalItem = workshopAsets.length;
  const activeTotalUnit = workshopAsets.reduce((sum, a) => sum + (Number(a.jumlah) || 1), 0);
  const activeTotalNilai = workshopAsets.reduce((sum, a) => sum + ((Number(a.jumlah) || 1) * (Number(a.harga_perolehan) || 0)), 0);

  /* ── Overview Statistics ── */
  const totalRuangans = ruangans.length;
  const totalAsetsInWorkshops = ruangans.reduce((sum, r) => sum + (r.asets_count ?? 0), 0);
  const totalGedungsWithWorkshop = new Set(ruangans.map(r => r.id_gedung).filter(Boolean)).size;

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div className="p-6 space-y-6">
      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(t => ({ ...t, show: false }))} />
      )}

      {/* ── Breadcrumb Navigation ── */}
      {activeWorkshop && (
        <div className="flex items-center gap-2 text-sm bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => { setActiveWorkshop(null); setAsetSearchQuery(''); }}
            className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Semua Ruangan Workshop
          </button>
          <ChevronRight className="h-4 w-4 text-slate-400" />
          <span className="text-slate-800 font-bold">{activeWorkshop.nama_ruangan}</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold ml-2">
            Aset Workshop
          </span>
        </div>
      )}

      {/* ── VIEW 1: DAFTAR RUANGAN WORKSHOP ── */}
      {!activeWorkshop && (
        <>
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-12 translate-x-12" />
            <div className="flex items-center justify-between relative z-10 flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl ring-1 ring-white/30">
                  <Wrench className="h-8 w-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Ruangan Workshop</h1>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/20">
                      Terpisah dari Master Gedung
                    </span>
                  </div>
                  <p className="text-emerald-100 text-sm mt-1">
                    Kelola data ruangan workshop dan inventaris aset khusus bengkel/workshop secara mandiri
                  </p>
                </div>
              </div>

              <button
                onClick={openCreateRuanganModal}
                className="px-4 py-2.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              >
                <Plus className="h-4 w-4 text-emerald-600" /> Tambah Ruangan Workshop
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Ruangan Workshop', value: totalRuangans, icon: Map, from: 'from-emerald-500', to: 'to-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', badge: 'Ruang' },
              { label: 'Total Aset Workshop', value: totalAsetsInWorkshops, icon: Package, from: 'from-teal-500', to: 'to-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-900', badge: 'Item' },
              { label: 'Gedung Terkait', value: totalGedungsWithWorkshop, icon: Building2, from: 'from-cyan-500', to: 'to-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-900', badge: 'Lokasi' },
            ].map(({ label, value, icon: Icon, from, to, bg, border, text, badge }) => (
              <div key={label} className={`${bg} border ${border} rounded-xl p-4 shadow-sm relative overflow-hidden`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 bg-gradient-to-br ${from} ${to} rounded-lg`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <p className={`text-[11px] font-semibold ${text} uppercase tracking-wide`}>{label}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 text-slate-700 border border-slate-200">{badge}</span>
                </div>
                <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama ruangan workshop, kode, gedung..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
              
              <select
                value={selectedGedung}
                onChange={e => setSelectedGedung(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 min-w-[200px]"
              >
                <option value="all">Semua Lokasi / Gedung</option>
                <option value="none">Tanpa Gedung / Mandiri</option>
                {gedungs.map(g => (
                  <option key={g.id} value={g.id}>{g.nama_gedung}</option>
                ))}
              </select>

              <button
                onClick={fetchRuangans}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Table of Workshop Rooms */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Ruangan Workshop</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Kode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lokasi / Gedung</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lantai</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Luas</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Aset Workshop</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <RefreshCw className="h-6 w-6 text-slate-400 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Memuat data ruangan workshop...</p>
                      </td>
                    </tr>
                  ) : filteredRuangans.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-700 mb-1">
                          {searchQuery || selectedGedung !== 'all' ? 'Tidak Ada Hasil' : 'Belum Ada Ruangan Workshop'}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          {searchQuery || selectedGedung !== 'all' 
                            ? 'Coba ubah filter atau kata kunci pencarian'
                            : 'Tambahkan ruangan workshop pertama untuk mulai mengelola aset workshop'
                          }
                        </p>
                        {!searchQuery && selectedGedung === 'all' && (
                          <button
                            onClick={openCreateRuanganModal}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold"
                          >
                            <Plus className="h-4 w-4" /> Tambah Ruangan Workshop
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredRuangans.map((r, idx) => (
                      <tr 
                        key={r.id} 
                        onClick={() => setActiveWorkshop(r)}
                        className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 text-sm text-slate-600">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {r.foto_ruangan ? (
                              <img
                                src={getImageUrl(r.foto_ruangan)!}
                                alt={r.nama_ruangan}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                                <Wrench className="h-5 w-5 text-emerald-700" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{r.nama_ruangan}</p>
                              {r.deskripsi && (
                                <p className="text-xs text-slate-500 truncate max-w-xs">{r.deskripsi}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {r.kode_ruangan ? (
                            <span className="font-mono text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
                              {r.kode_ruangan}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {r.gedung?.nama_gedung || <span className="text-xs text-slate-400 italic">Tanpa Gedung</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {r.lantai ? `Lantai ${r.lantai}` : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {r.luas_ruangan ? `${r.luas_ruangan} m²` : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveWorkshop(r); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all"
                            title="Klik untuk kelola aset workshop"
                          >
                            <Package className="h-3.5 w-3.5" />
                            {r.asets_count ?? 0} Aset
                            <ChevronRight className="h-3 w-3 text-emerald-500 ml-0.5" />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setActiveWorkshop(r)}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                              title="Kelola Aset Workshop"
                            >
                              <Package className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDetailRuanganTarget(r)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Detail Info"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => openEditRuanganModal(r, e)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteRuanganTarget(r)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── VIEW 2: DAFTAR ASET DI RUANGAN WORKSHOP TERPILIH ── */}
      {activeWorkshop && (
        <div className="space-y-6 animate-fadeIn">
          {/* Workshop Header Banner */}
          <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-cyan-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-12 translate-x-12" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                {activeWorkshop.foto_ruangan ? (
                  <img
                    src={getImageUrl(activeWorkshop.foto_ruangan)!}
                    alt={activeWorkshop.nama_ruangan}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-lg"
                  />
                ) : (
                  <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl ring-1 ring-white/30">
                    <Wrench className="h-8 w-8 text-white" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{activeWorkshop.nama_ruangan}</h1>
                    {activeWorkshop.kode_ruangan && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm border border-white/20 font-mono">
                        {activeWorkshop.kode_ruangan}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-emerald-100 text-xs mt-1.5 flex-wrap">
                    {activeWorkshop.gedung?.nama_gedung && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {activeWorkshop.gedung.nama_gedung}
                      </span>
                    )}
                    {activeWorkshop.lantai && (
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        Lantai {activeWorkshop.lantai}
                      </span>
                    )}
                    {activeWorkshop.luas_ruangan && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {activeWorkshop.luas_ruangan} m²
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => openEditRuanganModal(activeWorkshop)}
                  className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit Ruangan
                </button>
                <button
                  onClick={openCreateAsetModal}
                  className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Plus className="h-4 w-4 text-emerald-600" /> Tambah Aset Workshop
                </button>
              </div>
            </div>
          </div>

          {/* Workshop Asset Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-emerald-600 text-white rounded-lg">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-emerald-900 uppercase">Jenis Aset Workshop</span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-900">{activeTotalItem} <span className="text-xs font-semibold text-emerald-700">Item</span></p>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-teal-600 text-white rounded-lg">
                  <Layers className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-teal-900 uppercase">Total Unit Fisik</span>
              </div>
              <p className="text-2xl font-extrabold text-teal-900">{activeTotalUnit} <span className="text-xs font-semibold text-teal-700">Unit</span></p>
            </div>

            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 bg-cyan-600 text-white rounded-lg">
                  <DollarSign className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-cyan-900 uppercase">Total Nilai Perolehan</span>
              </div>
              <p className="text-xl font-extrabold text-cyan-900">{formatRupiah(activeTotalNilai)}</p>
            </div>
          </div>

          {/* Action & Filter Bar for Assets */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Cari aset di ${activeWorkshop.nama_ruangan}...`}
                  value={asetSearchQuery}
                  onChange={e => setAsetSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => activeWorkshop && fetchWorkshopAsets(activeWorkshop.id)}
                  disabled={loadingAsets}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingAsets ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={openCreateAsetModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Aset
                </button>
              </div>
            </div>
          </div>

          {/* Grid / Table of Workshop Assets */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-600" />
                  Daftar Aset Khusus {activeWorkshop.nama_ruangan}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menampilkan {filteredAsets.length} dari {workshopAsets.length} aset terdata
                </p>
              </div>
            </div>

            {loadingAsets ? (
              <div className="py-16 text-center">
                <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">Memuat data aset workshop...</p>
              </div>
            ) : filteredAsets.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">
                  {asetSearchQuery ? 'Tidak ada aset yang sesuai pencarian' : `Belum ada aset di ${activeWorkshop.nama_ruangan}`}
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  {asetSearchQuery ? 'Coba ganti kata kunci pencarian' : 'Tambahkan peralatan, mesin, atau aset workshop pertama untuk ruangan ini'}
                </p>
                {!asetSearchQuery && (
                  <button
                    onClick={openCreateAsetModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold"
                  >
                    <Plus className="h-4 w-4" /> Tambah Aset ke Workshop Ini
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-5">
                {filteredAsets.map((aset) => (
                  <div
                    key={aset.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group flex flex-col justify-between"
                  >
                    <div>
                      {/* Photo Thumbnail */}
                      <div className="relative mb-3 rounded-lg overflow-hidden bg-slate-100 aspect-video flex items-center justify-center border border-slate-100">
                        {aset.foto_thumbnail ? (
                          <img
                            src={getImageUrl(aset.foto_thumbnail)!}
                            alt={aset.nama_aset}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-10 w-10 text-slate-300" />
                        )}
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-600/90 text-white text-[10px] font-bold rounded-md backdrop-blur-sm">
                          {aset.jumlah} {aset.satuan}
                        </span>
                      </div>

                      {/* Info */}
                      {aset.kode_aset && (
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded inline-block mb-1">
                          {aset.kode_aset}
                        </span>
                      )}
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1 mb-0.5" title={aset.nama_aset}>
                        {aset.nama_aset}
                      </h3>
                      {aset.merek && (
                        <p className="text-xs text-slate-500 mb-2">{aset.merek} {aset.tipe ? `· ${aset.tipe}` : ''}</p>
                      )}

                      <div className="space-y-1 text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
                        {aset.kondisi?.nama_kondisi && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Kondisi:</span>
                            <span className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${getKondisiBadge(aset.kondisi.nama_kondisi)}`}>
                              {aset.kondisi.nama_kondisi}
                            </span>
                          </div>
                        )}
                        {aset.harga_perolehan && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Harga:</span>
                            <span className="font-bold text-emerald-700">{formatRupiah(aset.harga_perolehan)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setDetailAsetTarget(aset)}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Detail
                      </button>
                      <button
                        onClick={(e) => openEditAsetModal(aset, e)}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
                        title="Edit Aset"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteAsetTarget(aset)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        title="Hapus Aset"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════ MODALS ══════════════════════ */}

      {/* ── Modal 1: Tambah / Edit Ruangan Workshop ── */}
      {showRuanganModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editRuanganTarget ? 'Edit Ruangan Workshop' : 'Tambah Ruangan Workshop'}
                  </h2>
                  <p className="text-xs text-emerald-100 mt-0.5">Khusus data bengkel dan ruang workshop sekolah</p>
                </div>
              </div>
              <button
                onClick={() => setShowRuanganModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Nama Ruangan */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nama Ruangan Workshop <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ruanganForm.nama_ruangan}
                  onChange={e => setRuanganForm(f => ({ ...f, nama_ruangan: e.target.value }))}
                  placeholder="e.g. Workshop Otomotif & Mesin Bubut"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>

              {/* Lokasi / Gedung (Opsional) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Lokasi / Gedung <span className="text-xs text-slate-400 font-normal">(Opsional)</span>
                </label>
                <select
                  value={ruanganForm.id_gedung}
                  onChange={e => setRuanganForm(f => ({ ...f, id_gedung: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                >
                  <option value="">Tanpa Gedung / Mandiri</option>
                  {gedungs.map(g => (
                    <option key={g.id} value={g.id}>{g.nama_gedung}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Workshop tetap independen dan datanya tidak akan bercampur ke Master Gedung.
                </p>
              </div>

              {/* Kode & Lantai */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kode Ruangan</label>
                  <input
                    type="text"
                    value={ruanganForm.kode_ruangan}
                    onChange={e => setRuanganForm(f => ({ ...f, kode_ruangan: e.target.value }))}
                    placeholder="e.g. WSP-01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Lantai</label>
                  <input
                    type="number"
                    value={ruanganForm.lantai}
                    onChange={e => setRuanganForm(f => ({ ...f, lantai: e.target.value }))}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Luas Ruangan */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Luas Ruangan (m²)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ruanganForm.luas_ruangan}
                  onChange={e => setRuanganForm(f => ({ ...f, luas_ruangan: e.target.value }))}
                  placeholder="e.g. 120"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deskripsi</label>
                <textarea
                  value={ruanganForm.deskripsi}
                  onChange={e => setRuanganForm(f => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Fasilitas workshop, peralatan yang tersedia..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
                />
              </div>

              {/* Foto */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Foto Ruangan Workshop</label>
                {ruanganFotoPreview && (
                  <div className="mb-2">
                    <img src={ruanganFotoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-slate-200" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleRuanganFotoChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 p-4 flex gap-3 border-t border-slate-200">
              <button
                onClick={() => setShowRuanganModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveRuangan}
                disabled={savingRuangan}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingRuangan ? 'Menyimpan...' : 'Simpan Ruangan'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal 2: Tambah / Edit Aset Workshop ── */}
      {showAsetModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editAsetTarget ? 'Edit Aset Workshop' : 'Tambah Aset Workshop'}
                  </h2>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Ruangan: {activeWorkshop?.nama_ruangan}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAsetModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Nama Aset */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nama Aset Workshop <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={asetForm.nama_aset}
                  onChange={e => setAsetForm(f => ({ ...f, nama_aset: e.target.value }))}
                  placeholder="e.g. Mesin Bubut Manual Seri 350"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>

              {/* Kode Aset & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kode Aset</label>
                  <input
                    type="text"
                    value={asetForm.kode_aset}
                    onChange={e => setAsetForm(f => ({ ...f, kode_aset: e.target.value }))}
                    placeholder="e.g. AST-WSP-001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Merek & Tipe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Merek</label>
                  <input
                    type="text"
                    value={asetForm.merek}
                    onChange={e => setAsetForm(f => ({ ...f, merek: e.target.value }))}
                    placeholder="e.g. Krisbow, Makita"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipe / Model</label>
                  <input
                    type="text"
                    value={asetForm.tipe}
                    onChange={e => setAsetForm(f => ({ ...f, tipe: e.target.value }))}
                    placeholder="e.g. Heavy Duty 500W"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Jumlah, Satuan & Kondisi */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={asetForm.jumlah}
                    onChange={e => setAsetForm(f => ({ ...f, jumlah: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Satuan</label>
                  <input
                    type="text"
                    value={asetForm.satuan}
                    onChange={e => setAsetForm(f => ({ ...f, satuan: e.target.value }))}
                    placeholder="Unit / Set"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Kondisi</label>
                  <select
                    value={asetForm.id_kondisi}
                    onChange={e => setAsetForm(f => ({ ...f, id_kondisi: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  >
                    <option value="">Pilih Kondisi</option>
                    {kondisis.map(k => (
                      <option key={k.id} value={k.id}>{k.nama_kondisi}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Harga Perolehan & Warna */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Harga Perolehan (Rp)</label>
                  <input
                    type="number"
                    value={asetForm.harga_perolehan}
                    onChange={e => setAsetForm(f => ({ ...f, harga_perolehan: e.target.value }))}
                    placeholder="e.g. 15000000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Warna</label>
                  <input
                    type="text"
                    value={asetForm.warna}
                    onChange={e => setAsetForm(f => ({ ...f, warna: e.target.value }))}
                    placeholder="e.g. Abu-abu / Hijau"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deskripsi / Spesifikasi</label>
                <textarea
                  value={asetForm.deskripsi}
                  onChange={e => setAsetForm(f => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Spesifikasi mesin, nomor seri, kelengkapan..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
                />
              </div>

              {/* Foto Aset */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Foto Aset Workshop</label>
                {asetFotoPreview && (
                  <div className="mb-2">
                    <img src={asetFotoPreview} alt="Preview Aset" className="w-32 h-32 object-cover rounded-lg border border-slate-200" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAsetFotoChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 p-4 flex gap-3 border-t border-slate-200">
              <button
                onClick={() => setShowAsetModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleSaveAset}
                disabled={savingAset}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingAset ? 'Menyimpan...' : 'Simpan Aset'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal 3: Hapus Ruangan Workshop ── */}
      {deleteRuanganTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-50 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Hapus Ruangan Workshop?</h3>
                  <p className="text-sm text-slate-600 mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Nama:</span> {deleteRuanganTarget.nama_ruangan}
                </p>
                {deleteRuanganTarget.asets_count! > 0 && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    Ruangan workshop ini memiliki {deleteRuanganTarget.asets_count} aset terkait
                  </p>
                )}
              </div>
            </div>
            <div className="bg-slate-50 p-4 flex gap-3 border-t border-slate-200 rounded-b-2xl">
              <button
                onClick={() => setDeleteRuanganTarget(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-white transition-colors text-sm font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteRuangan}
                disabled={deletingRuangan}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50"
              >
                {deletingRuangan ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal 4: Hapus Aset Workshop ── */}
      {deleteAsetTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-50 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Hapus Aset Workshop?</h3>
                  <p className="text-sm text-slate-600 mt-0.5">Aset akan dihapus dari ruangan ini</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Nama Aset:</span> {deleteAsetTarget.nama_aset}
                </p>
                {deleteAsetTarget.kode_aset && (
                  <p className="text-xs text-slate-500 mt-0.5">Kode: {deleteAsetTarget.kode_aset}</p>
                )}
              </div>
            </div>
            <div className="bg-slate-50 p-4 flex gap-3 border-t border-slate-200 rounded-b-2xl">
              <button
                onClick={() => setDeleteAsetTarget(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-white transition-colors text-sm font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteAset}
                disabled={deletingAset}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50"
              >
                {deletingAset ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal 5: Detail Ruangan Workshop ── */}
      {detailRuanganTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Wrench className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Detail Ruangan Workshop</h2>
              </div>
              <button
                onClick={() => setDetailRuanganTarget(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {detailRuanganTarget.foto_ruangan && (
                <img
                  src={getImageUrl(detailRuanganTarget.foto_ruangan)!}
                  alt={detailRuanganTarget.nama_ruangan}
                  className="w-full h-48 object-cover rounded-lg border border-slate-200"
                />
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Nama Ruangan</p>
                  <p className="text-sm text-slate-800 font-semibold">{detailRuanganTarget.nama_ruangan}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Kode Ruangan</p>
                  <p className="text-sm text-slate-800">{detailRuanganTarget.kode_ruangan || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Lokasi / Gedung</p>
                  <p className="text-sm text-slate-800">{detailRuanganTarget.gedung?.nama_gedung || 'Tanpa Gedung / Mandiri'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Lantai</p>
                  <p className="text-sm text-slate-800">{detailRuanganTarget.lantai ? `Lantai ${detailRuanganTarget.lantai}` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Luas Ruangan</p>
                  <p className="text-sm text-slate-800">{detailRuanganTarget.luas_ruangan ? `${detailRuanganTarget.luas_ruangan} m²` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Jumlah Aset Workshop</p>
                  <p className="text-sm text-emerald-700 font-bold">{detailRuanganTarget.asets_count ?? 0} item</p>
                </div>
              </div>

              {detailRuanganTarget.deskripsi && (
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Deskripsi</p>
                  <p className="text-sm text-slate-700">{detailRuanganTarget.deskripsi}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 p-4 flex gap-3 border-t border-slate-200">
              <button
                onClick={() => {
                  const target = detailRuanganTarget;
                  setDetailRuanganTarget(null);
                  setActiveWorkshop(target);
                }}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Package className="h-4 w-4" /> Kelola Aset Workshop Ini
              </button>
              <button
                onClick={() => setDetailRuanganTarget(null)}
                className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal 6: Detail Aset Workshop ── */}
      {detailAsetTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Detail Aset Workshop</h2>
              </div>
              <button
                onClick={() => setDetailAsetTarget(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {detailAsetTarget.foto_thumbnail && (
                <img
                  src={getImageUrl(detailAsetTarget.foto_thumbnail)!}
                  alt={detailAsetTarget.nama_aset}
                  className="w-full h-52 object-cover rounded-lg border border-slate-200"
                />
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Nama Aset</p>
                  <p className="text-sm text-slate-900 font-bold">{detailAsetTarget.nama_aset}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Kode Aset</p>
                  <p className="text-sm text-slate-800 font-mono">{detailAsetTarget.kode_aset || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Kondisi</p>
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getKondisiBadge(detailAsetTarget.kondisi?.nama_kondisi)}`}>
                      {detailAsetTarget.kondisi?.nama_kondisi || '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Merek / Tipe</p>
                  <p className="text-sm text-slate-800">{detailAsetTarget.merek || '—'} {detailAsetTarget.tipe ? `/ ${detailAsetTarget.tipe}` : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Warna</p>
                  <p className="text-sm text-slate-800">{detailAsetTarget.warna || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Jumlah</p>
                  <p className="text-sm font-bold text-slate-900">{detailAsetTarget.jumlah} {detailAsetTarget.satuan}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Harga Perolehan</p>
                  <p className="text-sm font-bold text-emerald-700">{formatRupiah(detailAsetTarget.harga_perolehan)}</p>
                </div>
              </div>

              {detailAsetTarget.deskripsi && (
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Deskripsi / Spesifikasi</p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{detailAsetTarget.deskripsi}</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-50 p-4 border-t border-slate-200">
              <button
                onClick={() => setDetailAsetTarget(null)}
                className="w-full px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
