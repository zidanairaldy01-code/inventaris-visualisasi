'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Building2, AlertCircle, CheckCircle2, RefreshCw,
  Plus, Edit2, Trash2, X, Loader2, Layers, ChevronDown, ChevronUp, MapPin,
  Package, Eye, Settings, Upload,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface Ruangan {
  id: number;
  id_gedung: number;
  nama_ruangan: string;
  kode_ruangan: string | null;
  lantai: number | null;
  luas_ruangan: number | null;
  deskripsi: string | null;
  foto_ruangan: string | null;
  asets?: Aset[];
}

interface Gedung {
  id: number;
  nama_gedung: string;
  kode_gedung: string | null;
  jumlah_lantai: number | null;
  deskripsi: string | null;
  foto_gedung: string | null;
  ruangans?: Ruangan[];
  created_at?: string;
  updated_at?: string;
}

interface FormData {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyForm = (): FormData => ({
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

const kondisiStyle = (kondisi?: string) => {
  const k = kondisi?.toLowerCase();
  if (k === 'baik') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (k?.includes('rusak berat')) return 'bg-rose-50 text-rose-700 border border-rose-200';
  if (k?.includes('rusak')) return 'bg-red-50 text-red-700 border border-red-200';
  return 'bg-amber-50 text-amber-700 border border-amber-200';
};

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const getImageUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `http://localhost:8000${path}`;
};

// ─── Komponen Input ───────────────────────────────────────────────────────────

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

// ─── Halaman Utama ────────────────────────────────────────────────────────────

export default function GedungPage() {
  const [gedungs, setGedungs] = useState<Gedung[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expandedGedung, setExpandedGedung] = useState<number | null>(null);
  const [expandedRuangan, setExpandedRuangan] = useState<number | null>(null);

  // Form modal gedung
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGedung, setEditingGedung] = useState<Gedung | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [gedungFoto, setGedungFoto] = useState<File | null>(null);
  const [gedungFotoPreview, setGedungFotoPreview] = useState<string | null>(null);

  // Form modal ruangan
  const [showRuanganModal, setShowRuanganModal] = useState(false);
  const [editingRuangan, setEditingRuangan] = useState<Ruangan | null>(null);
  const [selectedGedungForRuangan, setSelectedGedungForRuangan] = useState<number | null>(null);
  const [ruanganFormData, setRuanganFormData] = useState<RuanganFormData>(emptyRuanganForm());
  const [ruanganSubmitting, setRuanganSubmitting] = useState(false);
  const [ruanganFormErrors, setRuanganFormErrors] = useState<Record<string, string>>({});
  const [ruanganFoto, setRuanganFoto] = useState<File | null>(null);
  const [ruanganFotoPreview, setRuanganFotoPreview] = useState<string | null>(null);

  // Aset viewer
  const [viewingAsets, setViewingAsets] = useState<{ ruangan: Ruangan; asets: Aset[] } | null>(null);
  const [editingAsetKondisi, setEditingAsetKondisi] = useState<number | null>(null);
  const [kondisiList, setKondisiList] = useState<{ id: number; nama_kondisi: string }[]>([]);
  const [updatingKondisi, setUpdatingKondisi] = useState(false);

  // CRUD Aset
  const [showAsetFormModal, setShowAsetFormModal] = useState(false);
  const [editingAset, setEditingAset] = useState<Aset | null>(null);
  const [asetFormData, setAsetFormData] = useState({
    nama_aset: '',
    kode_aset: '',
    merek: '',
    tipe: '',
    warna: '',
    jumlah: '1',
    satuan: 'Unit',
    harga_perolehan: '',
    id_kategori: '',
    id_kondisi: '',
    id_ruangan: '',
    deskripsi: '',
  });
  const [asetSubmitting, setAsetSubmitting] = useState(false);
  const [asetFormErrors, setAsetFormErrors] = useState<Record<string, string>>({});
  const [asetFoto, setAsetFoto] = useState<File | null>(null);
  const [asetFotoPreview, setAsetFotoPreview] = useState<string | null>(null);
  
  // Master data untuk dropdown
  const [kategoris, setKategoris] = useState<{ id: number; nama_kategori: string }[]>([]);

  useEffect(() => { 
    setMounted(true);
    fetchGedungs();
    fetchKondisiList();
    fetchKategoris();
  }, []);

  const fetchGedungs = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await axios.get('/api/gedungs');
      setGedungs(res.data);
    } catch (err) {
      console.error('Failed to fetch gedungs:', err);
    }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchKondisiList = async () => {
    try {
      const res = await axios.get('/api/kondisis');
      setKondisiList(res.data);
    } catch (err) {
      console.error('Failed to fetch kondisi:', err);
    }
  };

  const fetchKategoris = async () => {
    try {
      const res = await axios.get('/api/kategoris');
      setKategoris(res.data);
    } catch (err) {
      console.error('Failed to fetch kategoris:', err);
    }
  };

  // ── Buka modal tambah ─────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingGedung(null);
    setFormData(emptyForm());
    setFormErrors({});
    setGedungFoto(null);
    setGedungFotoPreview(null);
    setShowFormModal(true);
  };

  // ── Buka modal edit ───────────────────────────────────────────────────────
  const openEditModal = (gedung: Gedung) => {
    setEditingGedung(gedung);
    setFormData({
      nama_gedung: gedung.nama_gedung,
      kode_gedung: gedung.kode_gedung ?? '',
      jumlah_lantai: gedung.jumlah_lantai ? String(gedung.jumlah_lantai) : '',
      deskripsi: gedung.deskripsi ?? '',
    });
    setFormErrors({});
    setGedungFoto(null);
    setGedungFotoPreview(gedung.foto_gedung ? getImageUrl(gedung.foto_gedung) : null);
    setShowFormModal(true);
  };

  // ── Submit form ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('nama_gedung', formData.nama_gedung);
      if (formData.kode_gedung) formDataToSend.append('kode_gedung', formData.kode_gedung);
      if (formData.jumlah_lantai) formDataToSend.append('jumlah_lantai', formData.jumlah_lantai);
      if (formData.deskripsi) formDataToSend.append('deskripsi', formData.deskripsi);
      if (gedungFoto) formDataToSend.append('foto_gedung', gedungFoto);

      if (editingGedung) {
        await axios.post(`/api/gedungs/${editingGedung.id}?_method=PUT`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage({ type: 'success', text: `Gedung "${formData.nama_gedung}" berhasil diperbarui.` });
      } else {
        await axios.post('/api/gedungs', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage({ type: 'success', text: `Gedung "${formData.nama_gedung}" berhasil ditambahkan.` });
      }
      setShowFormModal(false);
      fetchGedungs(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (e?.response?.data?.errors) {
        const errs: Record<string, string> = {};
        Object.entries(e.response.data.errors).forEach(([k, v]) => { errs[k] = v[0]; });
        setFormErrors(errs);
      } else {
        setMessage({ type: 'error', text: e?.response?.data?.message || 'Gagal menyimpan data.' });
        setShowFormModal(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Hapus gedung ──────────────────────────────────────────────────────────
  const handleDelete = async (gedung: Gedung) => {
    if (!confirm(`Hapus gedung "${gedung.nama_gedung}"?\n\nPerhatian: Ruangan yang terkait dengan gedung ini mungkin akan terpengaruh.`)) return;
    try {
      await axios.delete(`/api/gedungs/${gedung.id}`);
      setMessage({ type: 'success', text: `Gedung "${gedung.nama_gedung}" berhasil dihapus.` });
      fetchGedungs(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Gagal menghapus gedung.' });
    }
  };

  const set = (k: keyof FormData, v: string) => setFormData(prev => ({ ...prev, [k]: v }));

  // ── Ruangan Functions ─────────────────────────────────────────────────────
  const openAddRuanganModal = (gedungId: number) => {
    setSelectedGedungForRuangan(gedungId);
    setEditingRuangan(null);
    setRuanganFormData(emptyRuanganForm());
    setRuanganFormErrors({});
    setRuanganFoto(null);
    setRuanganFotoPreview(null);
    setShowRuanganModal(true);
  };

  const openEditRuanganModal = (ruangan: Ruangan) => {
    setSelectedGedungForRuangan(ruangan.id_gedung);
    setEditingRuangan(ruangan);
    setRuanganFormData({
      nama_ruangan: ruangan.nama_ruangan,
      kode_ruangan: ruangan.kode_ruangan ?? '',
      lantai: ruangan.lantai ? String(ruangan.lantai) : '',
      luas_ruangan: ruangan.luas_ruangan ? String(ruangan.luas_ruangan) : '',
      deskripsi: ruangan.deskripsi ?? '',
    });
    setRuanganFormErrors({});
    setRuanganFoto(null);
    setRuanganFotoPreview(ruangan.foto_ruangan ? getImageUrl(ruangan.foto_ruangan) : null);
    setShowRuanganModal(true);
  };

  const handleRuanganSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRuanganFormErrors({});
    setRuanganSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('id_gedung', String(selectedGedungForRuangan));
      formDataToSend.append('nama_ruangan', ruanganFormData.nama_ruangan);
      if (ruanganFormData.kode_ruangan) formDataToSend.append('kode_ruangan', ruanganFormData.kode_ruangan);
      if (ruanganFormData.lantai) formDataToSend.append('lantai', ruanganFormData.lantai);
      if (ruanganFormData.luas_ruangan) formDataToSend.append('luas_ruangan', ruanganFormData.luas_ruangan);
      if (ruanganFormData.deskripsi) formDataToSend.append('deskripsi', ruanganFormData.deskripsi);
      if (ruanganFoto) formDataToSend.append('foto_ruangan', ruanganFoto);

      if (editingRuangan) {
        await axios.post(`/api/ruangans/${editingRuangan.id}?_method=PUT`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage({ type: 'success', text: `Ruangan "${ruanganFormData.nama_ruangan}" berhasil diperbarui.` });
      } else {
        await axios.post('/api/ruangans', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage({ type: 'success', text: `Ruangan "${ruanganFormData.nama_ruangan}" berhasil ditambahkan.` });
      }
      setShowRuanganModal(false);
      fetchGedungs(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (e?.response?.data?.errors) {
        const errs: Record<string, string> = {};
        Object.entries(e.response.data.errors).forEach(([k, v]) => { errs[k] = v[0]; });
        setRuanganFormErrors(errs);
      } else {
        setMessage({ type: 'error', text: e?.response?.data?.message || 'Gagal menyimpan data ruangan.' });
        setShowRuanganModal(false);
      }
    } finally {
      setRuanganSubmitting(false);
    }
  };

  const handleDeleteRuangan = async (ruangan: Ruangan) => {
    if (!confirm(`Hapus ruangan "${ruangan.nama_ruangan}"?\n\nPerhatian: Aset yang terkait dengan ruangan ini mungkin akan terpengaruh.`)) return;
    try {
      await axios.delete(`/api/ruangans/${ruangan.id}`);
      setMessage({ type: 'success', text: `Ruangan "${ruangan.nama_ruangan}" berhasil dihapus.` });
      fetchGedungs(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Gagal menghapus ruangan.' });
    }
  };

  const setRuangan = (k: keyof RuanganFormData, v: string) => setRuanganFormData(prev => ({ ...prev, [k]: v }));

  // ── Aset Functions ────────────────────────────────────────────────────────
  const viewAsets = async (ruangan: Ruangan) => {
    try {
      // Fetch aset by ruangan
      const res = await axios.get(`/api/asets`);
      const allAsets = res.data as Aset[];
      const asetsByRuangan = allAsets.filter(a => a.id_ruangan === ruangan.id);
      setViewingAsets({ ruangan, asets: asetsByRuangan });
    } catch (err) {
      console.error('Failed to fetch asets:', err);
      setMessage({ type: 'error', text: 'Gagal memuat data aset.' });
    }
  };

  const handleUpdateKondisi = async (asetId: number, kondisiId: number) => {
    setUpdatingKondisi(true);
    try {
      const aset = viewingAsets?.asets.find(a => a.id === asetId);
      if (!aset) return;

      await axios.put(`/api/asets/${asetId}`, {
        ...aset,
        id_kondisi: kondisiId,
        id_kategori: aset.kategori?.id,
        id_ruangan: aset.id_ruangan,
      });

      setMessage({ type: 'success', text: 'Kondisi aset berhasil diperbarui.' });
      setEditingAsetKondisi(null);
      
      // Refresh data
      if (viewingAsets) {
        await viewAsets(viewingAsets.ruangan);
      }
      fetchGedungs(true);
    } catch (err) {
      console.error('Failed to update kondisi:', err);
      setMessage({ type: 'error', text: 'Gagal memperbarui kondisi aset.' });
    } finally {
      setUpdatingKondisi(false);
    }
  };

  const toggleRuangan = (id: number) => {
    setExpandedRuangan(expandedRuangan === id ? null : id);
  };

  // ── CRUD Aset Functions ──────────────────────────────────────────────────
  const openAddAsetModal = (ruangan: Ruangan) => {
    setEditingAset(null);
    setAsetFormData({
      nama_aset: '',
      kode_aset: '',
      merek: '',
      tipe: '',
      warna: '',
      jumlah: '1',
      satuan: 'Unit',
      harga_perolehan: '',
      id_kategori: '',
      id_kondisi: '',
      id_ruangan: String(ruangan.id),
      deskripsi: '',
    });
    setAsetFormErrors({});
    setAsetFoto(null);
    setAsetFotoPreview(null);
    setShowAsetFormModal(true);
  };

  const openEditAsetModal = (aset: Aset) => {
    setEditingAset(aset);
    setAsetFormData({
      nama_aset: aset.nama_aset,
      kode_aset: aset.kode_aset ?? '',
      merek: aset.merek ?? '',
      tipe: aset.tipe ?? '',
      warna: aset.warna ?? '',
      jumlah: String(aset.jumlah),
      satuan: aset.satuan,
      harga_perolehan: aset.harga_perolehan ? String(aset.harga_perolehan) : '',
      id_kategori: String(aset.kategori?.id ?? ''),
      id_kondisi: String(aset.kondisi?.id ?? ''),
      id_ruangan: String(aset.id_ruangan ?? ''),
      deskripsi: '',
    });
    setAsetFormErrors({});
    setAsetFoto(null);
    setAsetFotoPreview(aset.foto_thumbnail ? getImageUrl(aset.foto_thumbnail) : null);
    setShowAsetFormModal(true);
  };

  const handleAsetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAsetFormErrors({});
    setAsetSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('nama_aset', asetFormData.nama_aset);
      if (asetFormData.kode_aset) formDataToSend.append('kode_aset', asetFormData.kode_aset);
      if (asetFormData.merek) formDataToSend.append('merek', asetFormData.merek);
      if (asetFormData.tipe) formDataToSend.append('tipe', asetFormData.tipe);
      if (asetFormData.warna) formDataToSend.append('warna', asetFormData.warna);
      formDataToSend.append('jumlah', asetFormData.jumlah);
      formDataToSend.append('satuan', asetFormData.satuan);
      if (asetFormData.harga_perolehan) formDataToSend.append('harga_perolehan', asetFormData.harga_perolehan);
      formDataToSend.append('id_kategori', asetFormData.id_kategori);
      formDataToSend.append('id_kondisi', asetFormData.id_kondisi);
      formDataToSend.append('id_ruangan', asetFormData.id_ruangan);
      if (asetFormData.deskripsi) formDataToSend.append('deskripsi', asetFormData.deskripsi);
      formDataToSend.append('tahun_perolehan', String(new Date().getFullYear()));
      formDataToSend.append('status_aset', 'aktif');
      if (asetFoto) formDataToSend.append('foto_thumbnail', asetFoto);

      if (editingAset) {
        await axios.post(`/api/asets/${editingAset.id}?_method=PUT`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage({ type: 'success', text: `Aset "${asetFormData.nama_aset}" berhasil diperbarui.` });
      } else {
        await axios.post('/api/asets', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage({ type: 'success', text: `Aset "${asetFormData.nama_aset}" berhasil ditambahkan.` });
      }
      setShowAsetFormModal(false);
      
      // Refresh data
      if (viewingAsets) {
        await viewAsets(viewingAsets.ruangan);
      }
      fetchGedungs(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      if (e?.response?.data?.errors) {
        const errs: Record<string, string> = {};
        Object.entries(e.response.data.errors).forEach(([k, v]) => { errs[k] = v[0]; });
        setAsetFormErrors(errs);
      } else {
        setMessage({ type: 'error', text: e?.response?.data?.message || 'Gagal menyimpan data aset.' });
        setShowAsetFormModal(false);
      }
    } finally {
      setAsetSubmitting(false);
    }
  };

  const handleDeleteAset = async (aset: Aset) => {
    if (!confirm(`Hapus aset "${aset.nama_aset}"?`)) return;
    try {
      await axios.delete(`/api/asets/${aset.id}`);
      setMessage({ type: 'success', text: `Aset "${aset.nama_aset}" berhasil dihapus.` });
      
      // Refresh data
      if (viewingAsets) {
        await viewAsets(viewingAsets.ruangan);
      }
      fetchGedungs(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Gagal menghapus aset.' });
    }
  };

  const setAset = (k: keyof typeof asetFormData, v: string) => setAsetFormData(prev => ({ ...prev, [k]: v }));

  // Toggle expanded gedung
  const toggleGedung = (id: number) => {
    setExpandedGedung(expandedGedung === id ? null : id);
  };

  // Kalkulasi summary
  const totalLantai = gedungs.reduce((s, g) => s + (g.jumlah_lantai ?? 0), 0);
  const totalRuangan = gedungs.reduce((s, g) => s + (g.ruangans?.length ?? 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fadeInUp">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mr-3 shadow-sm shadow-blue-500/20 flex-shrink-0">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            Master Gedung
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-11">
            Total <span className="font-semibold text-slate-600">{gedungs.length}</span> gedung terdaftar
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fetchGedungs(true)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openAddModal}
            className="flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-blue-500/20">
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Gedung
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-sm shadow-blue-500/20">
          <div className="flex items-center space-x-2 mb-2">
            <Building2 className="h-4 w-4 text-blue-200" />
            <p className="text-xs font-semibold text-blue-200">Total Gedung</p>
          </div>
          <p className="text-2xl font-extrabold">{gedungs.length}</p>
          <p className="text-[11px] text-blue-200 mt-0.5">Gedung yang terdaftar</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Layers className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-400">Total Lantai</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalLantai}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Dari {gedungs.length} gedung</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-slate-400">Total Ruangan</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalRuangan}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Di semua gedung</p>
        </div>
      </div>

      {/* Notification */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-center border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message.type === 'success'
            ? <CheckCircle2 className="h-5 w-5 mr-3 flex-shrink-0" />
            : <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />}
          <p className="font-medium text-sm flex-1">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-3 opacity-50 hover:opacity-100 text-lg leading-none">×</button>
        </div>
      )}

      {/* Gedung Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="skeleton h-48 rounded-xl w-full mb-4" />
              <div className="skeleton h-6 rounded-lg w-3/4 mb-2" />
              <div className="skeleton h-4 rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      ) : gedungs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-500 text-sm">Tidak ada data gedung</p>
          <p className="text-slate-400 text-xs mt-1">Tambah gedung untuk memulai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gedungs.map((gedung) => {
            const isExpanded = expandedGedung === gedung.id;
            const ruanganCount = gedung.ruangans?.length ?? 0;
            
            return (
              <div key={gedung.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                {/* Foto Gedung */}
                <div 
                  className="relative h-48 bg-gradient-to-br from-blue-600 to-indigo-600 cursor-pointer overflow-hidden"
                  onClick={() => toggleGedung(gedung.id)}
                >
                  {/* Foto atau Placeholder */}
                  {gedung.foto_gedung ? (
                    <img 
                      src={getImageUrl(gedung.foto_gedung) || ''} 
                      alt={gedung.nama_gedung}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Building2 className="h-20 w-20 text-white/20" />
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {gedung.kode_gedung && (
                          <span className="inline-block px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-xs font-mono mb-1">
                            {gedung.kode_gedung}
                          </span>
                        )}
                        <h3 className="font-bold text-lg leading-tight">{gedung.nama_gedung}</h3>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(gedung);
                          }}
                          className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(gedung);
                          }}
                          className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-red-500/80 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Click indicator */}
                  <div className="absolute top-4 right-4">
                    <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-white" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {gedung.jumlah_lantai !== null && (
                        <div className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          <span>{gedung.jumlah_lantai} Lantai</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{ruanganCount} Ruangan</span>
                      </div>
                    </div>
                  </div>

                  {gedung.deskripsi && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {gedung.deskripsi}
                    </p>
                  )}

                  {/* Dropdown Ruangan */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 animate-fadeInUp">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold text-slate-600 flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1" />
                          Daftar Ruangan ({ruanganCount})
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddRuanganModal(gedung.id);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Tambah Ruangan
                        </button>
                      </div>
                      {ruanganCount === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">Belum ada ruangan di gedung ini</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                          {gedung.ruangans?.map((ruangan) => {
                            const isRuanganExpanded = expandedRuangan === ruangan.id;
                            const jumlahAset = ruangan.asets?.length ?? 0;
                            
                            return (
                              <div
                                key={ruangan.id}
                                className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all bg-white"
                              >
                                {/* Card Ruangan dengan Foto */}
                                <div
                                  className="relative h-32 bg-gradient-to-br from-emerald-500 to-teal-600 cursor-pointer overflow-hidden group"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewAsets(ruangan);
                                  }}
                                >
                                  {/* Foto atau Placeholder */}
                                  {ruangan.foto_ruangan ? (
                                    <img 
                                      src={getImageUrl(ruangan.foto_ruangan) || ''} 
                                      alt={ruangan.nama_ruangan}
                                      className="absolute inset-0 w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <MapPin className="h-12 w-12 text-white/20" />
                                    </div>
                                  )}
                                  {/* Overlay gradient */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                  
                                  {/* Click overlay hint */}
                                  <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                                      <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        Klik untuk melihat detail aset
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Info overlay */}
                                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        {ruangan.kode_ruangan && (
                                          <span className="inline-block px-1.5 py-0.5 bg-white/20 backdrop-blur-sm rounded text-[10px] font-mono mb-1">
                                            {ruangan.kode_ruangan}
                                          </span>
                                        )}
                                        <h5 className="font-semibold text-sm leading-tight truncate">
                                          {ruangan.nama_ruangan}
                                        </h5>
                                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                                          {ruangan.lantai !== null && (
                                            <span className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
                                              Lt. {ruangan.lantai}
                                            </span>
                                          )}
                                          {ruangan.luas_ruangan !== null && (
                                            <span className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
                                              {ruangan.luas_ruangan} m²
                                            </span>
                                          )}
                                          <span className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                            <Package className="h-2.5 w-2.5" />
                                            {jumlahAset} Aset
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action buttons */}
                                  <div className="absolute top-2 right-2 flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditRuanganModal(ruangan);
                                      }}
                                      className="p-1 rounded-md bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                                      title="Edit Ruangan"
                                    >
                                      <Edit2 className="h-3 w-3 text-white" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteRuangan(ruangan);
                                      }}
                                      className="p-1 rounded-md bg-white/10 backdrop-blur-sm hover:bg-red-500/80 transition-colors"
                                      title="Hapus"
                                    >
                                      <Trash2 className="h-3 w-3 text-white" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Tambah / Edit Gedung ───────────────────────────────────────── */}
      {showFormModal && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFormModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    {editingGedung ? 'Edit Data Gedung' : 'Tambah Gedung Baru'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingGedung ? `ID: ${editingGedung.id}` : 'Isi data gedung di bawah ini'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowFormModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form body — scrollable */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">

              {/* Upload Foto Gedung */}
              <FormField label="Foto Gedung">
                <div className="space-y-2">
                  {gedungFotoPreview && (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200">
                      <img src={gedungFotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setGedungFoto(null);
                          setGedungFotoPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setGedungFoto(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setGedungFotoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="gedung-foto-input"
                    />
                    <label
                      htmlFor="gedung-foto-input"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors text-sm font-medium"
                    >
                      <Upload className="h-4 w-4" />
                      {gedungFotoPreview ? 'Ganti Foto' : 'Upload Foto'}
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">JPG, PNG - Maks. 2MB</p>
                </div>
              </FormField>

              {/* Nama Gedung */}
              <FormField label="Nama Gedung" required>
                <input type="text" value={formData.nama_gedung} onChange={e => set('nama_gedung', e.target.value)}
                  required placeholder="Contoh: Gedung Utama" className={inputCls} />
                {formErrors.nama_gedung && <p className="text-red-500 text-xs mt-1">{formErrors.nama_gedung}</p>}
              </FormField>

              {/* Kode Gedung & Jumlah Lantai */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Kode Gedung">
                  <input type="text" value={formData.kode_gedung} onChange={e => set('kode_gedung', e.target.value)}
                    placeholder="Contoh: GD-A" className={inputCls} />
                  {formErrors.kode_gedung && <p className="text-red-500 text-xs mt-1">{formErrors.kode_gedung}</p>}
                </FormField>
                <FormField label="Jumlah Lantai">
                  <input type="number" min="0" value={formData.jumlah_lantai}
                    onChange={e => set('jumlah_lantai', e.target.value)}
                    placeholder="0" className={inputCls} />
                  {formErrors.jumlah_lantai && <p className="text-red-500 text-xs mt-1">{formErrors.jumlah_lantai}</p>}
                </FormField>
              </div>

              {/* Deskripsi */}
              <FormField label="Deskripsi">
                <textarea value={formData.deskripsi} onChange={e => set('deskripsi', e.target.value)}
                  placeholder="Deskripsi singkat tentang gedung..." rows={3}
                  className={inputCls} />
                {formErrors.deskripsi && <p className="text-red-500 text-xs mt-1">{formErrors.deskripsi}</p>}
              </FormField>

            </form>

            {/* Footer modal — tombol */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button type="button" onClick={() => setShowFormModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                Batal
              </button>
              <button type="submit" onClick={handleSubmit} disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  editingGedung ? 'Perbarui' : 'Simpan'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Tambah / Edit Ruangan ──────────────────────────────────────── */}
      {showRuanganModal && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRuanganModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    {editingRuangan ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingRuangan ? `ID: ${editingRuangan.id}` : 'Isi data ruangan di bawah ini'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowRuanganModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleRuanganSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">

              {/* Upload Foto Ruangan */}
              <FormField label="Foto Ruangan">
                <div className="space-y-2">
                  {ruanganFotoPreview && (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200">
                      <img src={ruanganFotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setRuanganFoto(null);
                          setRuanganFotoPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setRuanganFoto(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setRuanganFotoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="ruangan-foto-input"
                    />
                    <label
                      htmlFor="ruangan-foto-input"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors text-sm font-medium"
                    >
                      <Upload className="h-4 w-4" />
                      {ruanganFotoPreview ? 'Ganti Foto' : 'Upload Foto'}
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">JPG, PNG - Maks. 2MB</p>
                </div>
              </FormField>

              {/* Nama Ruangan */}
              <FormField label="Nama Ruangan" required>
                <input type="text" value={ruanganFormData.nama_ruangan} onChange={e => setRuangan('nama_ruangan', e.target.value)}
                  required placeholder="Contoh: Kelas X RPL 1" className={inputCls} />
                {ruanganFormErrors.nama_ruangan && <p className="text-red-500 text-xs mt-1">{ruanganFormErrors.nama_ruangan}</p>}
              </FormField>

              {/* Kode Ruangan & Lantai */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Kode Ruangan">
                  <input type="text" value={ruanganFormData.kode_ruangan} onChange={e => setRuangan('kode_ruangan', e.target.value)}
                    placeholder="Contoh: R-101" className={inputCls} />
                  {ruanganFormErrors.kode_ruangan && <p className="text-red-500 text-xs mt-1">{ruanganFormErrors.kode_ruangan}</p>}
                </FormField>
                <FormField label="Lantai">
                  <input type="text" value={ruanganFormData.lantai}
                    onChange={e => setRuangan('lantai', e.target.value)}
                    placeholder="1 / 2 / 3" className={inputCls} />
                  {ruanganFormErrors.lantai && <p className="text-red-500 text-xs mt-1">{ruanganFormErrors.lantai}</p>}
                </FormField>
              </div>

              {/* Luas Ruangan */}
              <FormField label="Luas Ruangan (m²)">
                <input type="text" value={ruanganFormData.luas_ruangan}
                  onChange={e => setRuangan('luas_ruangan', e.target.value)}
                  placeholder="Contoh: 56" className={inputCls} />
                {ruanganFormErrors.luas_ruangan && <p className="text-red-500 text-xs mt-1">{ruanganFormErrors.luas_ruangan}</p>}
              </FormField>

              {/* Deskripsi */}
              <FormField label="Deskripsi">
                <textarea value={ruanganFormData.deskripsi} onChange={e => setRuangan('deskripsi', e.target.value)}
                  placeholder="Deskripsi singkat tentang ruangan..." rows={3}
                  className={inputCls} />
                {ruanganFormErrors.deskripsi && <p className="text-red-500 text-xs mt-1">{ruanganFormErrors.deskripsi}</p>}
              </FormField>

            </form>

            {/* Footer modal */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button type="button" onClick={() => setShowRuanganModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                Batal
              </button>
              <button type="submit" onClick={handleRuanganSubmit} disabled={ruanganSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                {ruanganSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  editingRuangan ? 'Perbarui' : 'Simpan'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Lihat Aset di Ruangan ──────────────────────────────────────── */}
      {viewingAsets && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => {
            setViewingAsets(null);
            setEditingAsetKondisi(null);
          }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-sm">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">
                    {viewingAsets.ruangan.nama_ruangan}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    {viewingAsets.ruangan.kode_ruangan && (
                      <span className="font-mono">{viewingAsets.ruangan.kode_ruangan}</span>
                    )}
                    {viewingAsets.ruangan.lantai && (
                      <span>Lantai {viewingAsets.ruangan.lantai}</span>
                    )}
                    {viewingAsets.ruangan.luas_ruangan && (
                      <span>{viewingAsets.ruangan.luas_ruangan} m²</span>
                    )}
                    <span className="font-semibold">• {viewingAsets.asets.length} Aset</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAddAsetModal(viewingAsets.ruangan)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Aset
                </button>
                <button onClick={() => {
                  setViewingAsets(null);
                  setEditingAsetKondisi(null);
                }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Body - Grid Aset dengan Foto */}
            <div className="overflow-y-auto flex-1 p-6">
              {viewingAsets.asets.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Package className="h-10 w-10 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-500 text-sm">Belum ada aset di ruangan ini</p>
                  <p className="text-slate-400 text-xs mt-1">Tambahkan aset melalui menu Data Aset</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {viewingAsets.asets.map((aset) => (
                    <div key={aset.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
                      {/* Foto Aset */}
                      <div className="relative h-40 bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden group/foto">
                        {/* Foto atau Placeholder */}
                        {aset.foto_thumbnail ? (
                          <img 
                            src={getImageUrl(aset.foto_thumbnail) || ''} 
                            alt={aset.nama_aset}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Package className="h-16 w-16 text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        {/* Kode Aset */}
                        {aset.kode_aset && (
                          <div className="absolute top-2 left-2">
                            <span className="inline-block px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-[10px] font-mono font-semibold text-slate-800">
                              {aset.kode_aset}
                            </span>
                          </div>
                        )}

                        {/* Kategori Badge */}
                        {aset.kategori && (
                          <div className="absolute top-2 right-2">
                            <span className="inline-block px-2 py-0.5 bg-indigo-500/90 backdrop-blur-sm rounded text-[10px] font-semibold text-white">
                              {aset.kategori.nama_kategori}
                            </span>
                          </div>
                        )}

                        {/* Action Buttons - Muncul saat hover */}
                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover/foto:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditAsetModal(aset)}
                            className="p-1.5 rounded-lg bg-white/90 hover:bg-amber-100 text-amber-600 transition-colors shadow-lg"
                            title="Edit Aset"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAset(aset)}
                            className="p-1.5 rounded-lg bg-white/90 hover:bg-red-100 text-red-600 transition-colors shadow-lg"
                            title="Hapus Aset"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Info Aset */}
                      <div className="p-4">
                        {/* Nama & Merek */}
                        <div className="mb-3">
                          <h3 className="font-bold text-slate-800 text-sm mb-0.5 line-clamp-2">
                            {aset.nama_aset}
                          </h3>
                          {aset.merek && (
                            <p className="text-xs text-slate-500">
                              {aset.merek}{aset.tipe ? ` • ${aset.tipe}` : ''}
                            </p>
                          )}
                        </div>

                        {/* Jumlah */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                          <span className="text-xs text-slate-500">Jumlah</span>
                          <span className="text-sm font-bold text-slate-800">
                            {aset.jumlah} <span className="text-xs font-normal text-slate-400">{aset.satuan}</span>
                          </span>
                        </div>

                        {/* Kondisi - Editable */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">Kondisi</span>
                            {editingAsetKondisi === aset.id ? (
                              <button
                                onClick={() => setEditingAsetKondisi(null)}
                                className="text-[10px] text-slate-400 hover:text-slate-600"
                              >
                                Batal
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingAsetKondisi(aset.id)}
                                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                              >
                                <Settings className="h-3 w-3" />
                                Ubah
                              </button>
                            )}
                          </div>
                          
                          {editingAsetKondisi === aset.id ? (
                            <div className="space-y-1.5">
                              {kondisiList.map((kondisi) => (
                                <button
                                  key={kondisi.id}
                                  onClick={() => handleUpdateKondisi(aset.id, kondisi.id)}
                                  disabled={updatingKondisi}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    aset.kondisi?.id === kondisi.id
                                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                  } ${kondisiStyle(kondisi.nama_kondisi)} disabled:opacity-50`}
                                >
                                  {updatingKondisi && aset.kondisi?.id === kondisi.id ? (
                                    <span className="flex items-center gap-2">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Menyimpan...
                                    </span>
                                  ) : (
                                    kondisi.nama_kondisi
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className={`px-3 py-2 rounded-lg text-xs font-semibold ${kondisiStyle(aset.kondisi?.nama_kondisi)}`}>
                              {aset.kondisi?.nama_kondisi || 'Tidak diketahui'}
                            </div>
                          )}
                        </div>

                        {/* Harga */}
                        {aset.harga_perolehan && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Harga</span>
                            <span className="text-xs font-bold text-emerald-600">
                              {formatRupiah(aset.harga_perolehan)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50">
              <div className="text-xs text-slate-500">
                <p>💡 <span className="font-semibold">Tips:</span> Klik tombol <span className="font-semibold">"Ubah"</span> pada setiap aset untuk mengubah kondisinya</p>
              </div>
              <button type="button" onClick={() => {
                setViewingAsets(null);
                setEditingAsetKondisi(null);
              }}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all shadow-sm">
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Tambah / Edit Aset ─────────────────────────────────────────── */}
      {showAsetFormModal && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAsetFormModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    {editingAset ? 'Edit Data Aset' : 'Tambah Aset Baru'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingAset ? `ID: ${editingAset.id}` : 'Isi data aset di bawah ini'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAsetFormModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleAsetSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">

              {/* Upload Foto Aset */}
              <FormField label="Foto Aset">
                <div className="space-y-2">
                  {asetFotoPreview && (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200">
                      <img src={asetFotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setAsetFoto(null);
                          setAsetFotoPreview(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAsetFoto(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setAsetFotoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="aset-foto-input"
                    />
                    <label
                      htmlFor="aset-foto-input"
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors text-sm font-medium"
                    >
                      <Upload className="h-4 w-4" />
                      {asetFotoPreview ? 'Ganti Foto' : 'Upload Foto'}
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">JPG, PNG - Maks. 2MB</p>
                </div>
              </FormField>

              {/* Nama & Kode */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Nama Aset" required>
                  <input type="text" value={asetFormData.nama_aset} onChange={e => setAset('nama_aset', e.target.value)}
                    required placeholder="Nama lengkap aset" className={inputCls} />
                  {asetFormErrors.nama_aset && <p className="text-red-500 text-xs mt-1">{asetFormErrors.nama_aset}</p>}
                </FormField>
                <FormField label="Kode Aset">
                  <input type="text" value={asetFormData.kode_aset} onChange={e => setAset('kode_aset', e.target.value)}
                    placeholder="AST-001" className={inputCls} />
                </FormField>
              </div>

              {/* Kategori & Kondisi */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Kategori" required>
                  <select value={asetFormData.id_kategori} onChange={e => setAset('id_kategori', e.target.value)} required className={inputCls}>
                    <option value="">Pilih kategori</option>
                    {kategoris.map(k => <option key={k.id} value={k.id}>{k.nama_kategori}</option>)}
                  </select>
                  {asetFormErrors.id_kategori && <p className="text-red-500 text-xs mt-1">{asetFormErrors.id_kategori}</p>}
                </FormField>
                <FormField label="Kondisi" required>
                  <select value={asetFormData.id_kondisi} onChange={e => setAset('id_kondisi', e.target.value)} required className={inputCls}>
                    <option value="">Pilih kondisi</option>
                    {kondisiList.map(k => <option key={k.id} value={k.id}>{k.nama_kondisi}</option>)}
                  </select>
                  {asetFormErrors.id_kondisi && <p className="text-red-500 text-xs mt-1">{asetFormErrors.id_kondisi}</p>}
                </FormField>
              </div>

              {/* Merek & Tipe */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Merek">
                  <input type="text" value={asetFormData.merek} onChange={e => setAset('merek', e.target.value)}
                    placeholder="Contoh: Chitose" className={inputCls} />
                </FormField>
                <FormField label="Tipe">
                  <input type="text" value={asetFormData.tipe} onChange={e => setAset('tipe', e.target.value)}
                    placeholder="Contoh: Type-A" className={inputCls} />
                </FormField>
              </div>

              {/* Jumlah, Satuan, Warna */}
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Jumlah" required>
                  <input type="number" min="1" value={asetFormData.jumlah} onChange={e => setAset('jumlah', e.target.value)}
                    required className={inputCls} />
                </FormField>
                <FormField label="Satuan" required>
                  <input type="text" value={asetFormData.satuan} onChange={e => setAset('satuan', e.target.value)}
                    required placeholder="Unit / Buah" className={inputCls} />
                </FormField>
                <FormField label="Warna">
                  <input type="text" value={asetFormData.warna} onChange={e => setAset('warna', e.target.value)}
                    placeholder="Hitam" className={inputCls} />
                </FormField>
              </div>

              {/* Harga */}
              <FormField label="Harga Perolehan (Rp)">
                <input type="number" min="0" value={asetFormData.harga_perolehan}
                  onChange={e => setAset('harga_perolehan', e.target.value)}
                  placeholder="500000" className={inputCls} />
              </FormField>

              {/* Deskripsi */}
              <FormField label="Deskripsi">
                <textarea value={asetFormData.deskripsi} onChange={e => setAset('deskripsi', e.target.value)}
                  placeholder="Deskripsi singkat tentang aset..." rows={3}
                  className={inputCls} />
              </FormField>

            </form>

            {/* Footer modal */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button type="button" onClick={() => setShowAsetFormModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                Batal
              </button>
              <button type="submit" onClick={handleAsetSubmit} disabled={asetSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                {asetSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  editingAset ? 'Perbarui' : 'Simpan'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
