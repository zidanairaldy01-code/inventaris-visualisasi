'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import { showErrorAlert } from '@/utils/errorHandler';
import {
  Wrench, Plus, Search, RefreshCw, DollarSign, CheckCircle2,
  Clock, X, Trash2, Edit2, Loader2, Camera, ImageOff, ZoomIn,
  ShieldCheck, AlertTriangle, Ban, FileWarning, SendHorizonal
} from 'lucide-react';

interface ServisItem {
  id: number;
  id_aset: number | null;
  sarana_prasarana_id: number | null;
  jenis_perbaikan: string;
  tanggal_servis: string;
  biaya_servis: number;
  teknisi_bengkel: string | null;
  deskripsi_kerusakan: string | null;
  foto_kerusakan: string | null;
  foto_kerusakan_url: string | null;
  status: 'Menunggu Persetujuan' | 'Proses' | 'Selesai' | 'Batal' | 'Ditolak';
  catatan_wakasek?: string | null;
  catatan_admin?: string | null;
  pelapor?: { nama_lengkap: string; role?: string };
  ruangan?: { nama_ruangan: string };
  approved_by_wakasek?: { nama_lengkap: string };
  verified_by_admin?: { nama_lengkap: string };
  sarana_prasarana?: { id: number; kode: string; nama_barang: string; kondisi: string };
  aset?: { id: number; kode_aset: string; nama_aset: string };
}

interface SaranaPrasarana {
  id: number;
  kode: string;
  nama_barang: string;
  kondisi: string;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  'Menunggu Persetujuan': { label: 'Menunggu ACC Wakasek', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" /> },
  'Proses':              { label: 'Sedang Diservis',       cls: 'bg-blue-50 text-blue-700 border-blue-200',   icon: <Wrench className="h-3 w-3" /> },
  'Selesai':             { label: 'Selesai',               cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  'Batal':               { label: 'Batal',                 cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Ban className="h-3 w-3" /> },
  'Ditolak':             { label: 'Ditolak Wakasek',       cls: 'bg-red-50 text-red-700 border-red-200',      icon: <X className="h-3 w-3" /> },
};

export default function AdminServisPage() {
  const [servises, setServises] = useState<ServisItem[]>([]);
  const [saranas, setSaranas] = useState<SaranaPrasarana[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Modal Form (Tambah/Edit servis langsung oleh Admin)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServisItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [hapusFoto, setHapusFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal Lapor Kerusakan ke Wakasek
  const [isLaporModalOpen, setIsLaporModalOpen] = useState(false);
  const [laporSubmitting, setLaporSubmitting] = useState(false);
  const [laporFotoFile, setLaporFotoFile] = useState<File | null>(null);
  const [laporFotoPreview, setLaporFotoPreview] = useState<string | null>(null);
  const laporFileInputRef = useRef<HTMLInputElement>(null);
  const [laporFormData, setLaporFormData] = useState({
    sarana_prasarana_id: '',
    jenis_perbaikan: '',
    kondisi_rusak: 'Rusak Ringan',
    tanggal_servis: new Date().toISOString().split('T')[0],
    deskripsi_kerusakan: '',
  });

  // Modal Verifikasi Selesai
  const [selesaiModal, setSelesaiModal] = useState<{ item: ServisItem } | null>(null);
  const [selesaiForm, setSelesaiForm] = useState({ catatan_admin: '', biaya_realisasi: '' });
  const [selesaiSubmitting, setSelesaiSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    sarana_prasarana_id: '',
    jenis_perbaikan: '',
    tanggal_servis: new Date().toISOString().split('T')[0],
    biaya_servis: '',
    teknisi_bengkel: '',
    deskripsi_kerusakan: '',
    status: 'Proses',
  });

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [servisRes, saranaRes] = await Promise.all([
        axios.get('/api/servises'),
        axios.get('/api/sarana-prasaranas'),
      ]);
      setServises(servisRes.data || []);
      setSaranas(saranaRes.data?.data || saranaRes.data || []);
    } catch (err) {
      console.error('Failed to fetch servis data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFotoFile(null); setFotoPreview(null); setHapusFoto(false);
    setFormData({
      sarana_prasarana_id: saranas[0]?.id ? String(saranas[0].id) : '',
      jenis_perbaikan: '',
      tanggal_servis: new Date().toISOString().split('T')[0],
      biaya_servis: '',
      teknisi_bengkel: '',
      deskripsi_kerusakan: '',
      status: 'Proses',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ServisItem) => {
    setEditingItem(item);
    setFotoFile(null); setFotoPreview(item.foto_kerusakan_url || null); setHapusFoto(false);
    setFormData({
      sarana_prasarana_id: item.sarana_prasarana_id ? String(item.sarana_prasarana_id) : '',
      jenis_perbaikan: item.jenis_perbaikan,
      tanggal_servis: item.tanggal_servis,
      biaya_servis: String(item.biaya_servis),
      teknisi_bengkel: item.teknisi_bengkel || '',
      deskripsi_kerusakan: item.deskripsi_kerusakan || '',
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const removeFoto = () => {
    setFotoFile(null); setFotoPreview(null); setHapusFoto(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (!editingItem && formData.sarana_prasarana_id) {
        fd.append('sarana_prasarana_id', formData.sarana_prasarana_id);
      }
      fd.append('jenis_perbaikan', formData.jenis_perbaikan);
      fd.append('tanggal_servis', formData.tanggal_servis);
      fd.append('biaya_servis', formData.biaya_servis);
      fd.append('teknisi_bengkel', formData.teknisi_bengkel);
      fd.append('deskripsi_kerusakan', formData.deskripsi_kerusakan);
      fd.append('status', formData.status);
      if (fotoFile) {
        fd.append('foto_kerusakan', fotoFile);
      } else if (editingItem && hapusFoto) {
        fd.append('hapus_foto', '1');
      }

      if (editingItem) {
        fd.append('_method', 'PUT');
        await axios.post(`/api/servises/${editingItem.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post('/api/servises', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setIsModalOpen(false);
      fetchData(true);
    } catch (err) {
      showErrorAlert(err, 'Gagal Menyimpan Data Servis');
    } finally {
      setSubmitting(false);
    }
  };

  const openLaporModal = () => {
    setLaporFotoFile(null);
    setLaporFotoPreview(null);
    const damagedItem = saranas.find(s => s.kondisi !== 'Baik');
    setLaporFormData({
      sarana_prasarana_id: damagedItem ? String(damagedItem.id) : (saranas[0]?.id ? String(saranas[0].id) : ''),
      jenis_perbaikan: '',
      kondisi_rusak: 'Rusak Ringan',
      tanggal_servis: new Date().toISOString().split('T')[0],
      deskripsi_kerusakan: '',
    });
    setIsLaporModalOpen(true);
  };

  const handleLaporFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLaporFotoFile(file);
    setLaporFotoPreview(URL.createObjectURL(file));
  };

  const removeLaporFoto = () => {
    setLaporFotoFile(null);
    setLaporFotoPreview(null);
    if (laporFileInputRef.current) laporFileInputRef.current.value = '';
  };

  const handleLaporSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!laporFormData.sarana_prasarana_id) {
      showErrorAlert('Pilih sarana prasarana yang diajukan perbaikan.', 'Validasi Form Servis');
      return;
    }
    setLaporSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('sarana_prasarana_id', laporFormData.sarana_prasarana_id);
      fd.append('jenis_perbaikan', laporFormData.jenis_perbaikan);
      fd.append('kondisi_rusak', laporFormData.kondisi_rusak);
      fd.append('tanggal_servis', laporFormData.tanggal_servis);
      fd.append('deskripsi_kerusakan', laporFormData.deskripsi_kerusakan);
      fd.append('status', 'Menunggu Persetujuan');
      fd.append('biaya_servis', '0');
      if (laporFotoFile) {
        fd.append('foto_kerusakan', laporFotoFile);
      }

      await axios.post('/api/servises', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setIsLaporModalOpen(false);
      fetchData(true);
    } catch (err: any) {
      showErrorAlert(err, 'Gagal Mengajukan Perbaikan');
    } finally {
      setLaporSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus catatan servis ini?')) return;
    try {
      await axios.delete(`/api/servises/${id}`);
      fetchData(true);
    } catch (err) {
      showErrorAlert(err, 'Gagal Menghapus Data Servis');
    }
  };

  const handleSelesai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selesaiModal) return;
    setSelesaiSubmitting(true);
    try {
      await axios.post(`/api/servises/${selesaiModal.item.id}/selesai`, {
        catatan_admin: selesaiForm.catatan_admin || null,
        biaya_realisasi: selesaiForm.biaya_realisasi ? Number(selesaiForm.biaya_realisasi) : null,
      });
      setSelesaiModal(null);
      setSelesaiForm({ catatan_admin: '', biaya_realisasi: '' });
      fetchData(true);
    } catch (err: any) {
      showErrorAlert(err, 'Gagal Memverifikasi Servis');
    } finally {
      setSelesaiSubmitting(false);
    }
  };

  const filtered = servises.filter(s => {
    const q = search.toLowerCase();
    const namaBarang = (s.sarana_prasarana?.nama_barang || s.aset?.nama_aset || '').toLowerCase();
    const matchSearch =
      s.jenis_perbaikan.toLowerCase().includes(q) ||
      namaBarang.includes(q) ||
      (s.teknisi_bengkel?.toLowerCase().includes(q) ?? false) ||
      (s.pelapor?.nama_lengkap?.toLowerCase().includes(q) ?? false);
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalBiaya = servises.filter(s => s.status === 'Selesai').reduce((sum, s) => sum + Number(s.biaya_servis || 0), 0);
  const totalSelesai = servises.filter(s => s.status === 'Selesai').length;
  const totalProses = servises.filter(s => s.status === 'Proses').length;
  const totalMenunggu = servises.filter(s => s.status === 'Menunggu Persetujuan').length;

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition" onClick={() => setLightboxUrl(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxUrl} alt="Foto Kerusakan" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mr-3 shadow-sm shadow-amber-500/20 flex-shrink-0">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            Monitoring Servis & Perbaikan Aset
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-11">
            Pantau seluruh alur servis — verifikasi penyelesaian dan kembalikan kondisi aset ke Baik
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => fetchData(true)} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors" title="Muat Ulang">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openAddModal} className="flex items-center px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-all shadow-sm">
            <Plus className="h-4 w-4 mr-1.5 text-slate-500" />
            Input Servis Langsung
          </button>
          <button onClick={openLaporModal} className="flex items-center px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-amber-500/20">
            <SendHorizonal className="h-4 w-4 mr-1.5" />
            Lapor ke Wakasek
          </button>
        </div>
      </div>

      {/* Alert: ada yang perlu diverifikasi */}
      {totalProses > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500 text-white rounded-xl flex-shrink-0 animate-pulse">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-800">{totalProses} Servis Menunggu Verifikasi Penyelesaian dari Anda (Admin)</p>
            <p className="text-xs text-blue-600 mt-0.5">Klik tombol &quot;Verifikasi Selesai&quot; setelah proses perbaikan nyata selesai dilakukan — kondisi barang akan otomatis pulih ke Baik.</p>
          </div>
          <button onClick={() => setStatusFilter('Proses')} className="ml-auto px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors flex-shrink-0">
            Lihat Sekarang
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 cursor-pointer hover:border-amber-400 transition-colors" onClick={() => setStatusFilter('Menunggu Persetujuan')}>
          <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-amber-600" /><p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Menunggu Wakasek</p></div>
          <p className="text-3xl font-extrabold text-amber-800">{totalMenunggu}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setStatusFilter('Proses')}>
          <div className="flex items-center gap-2 mb-2"><Wrench className="h-4 w-4 text-blue-600" /><p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Sedang Diservis</p></div>
          <p className="text-3xl font-extrabold text-blue-800">{totalProses}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 cursor-pointer hover:border-emerald-400 transition-colors" onClick={() => setStatusFilter('Selesai')}>
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Selesai</p></div>
          <p className="text-3xl font-extrabold text-emerald-800">{totalSelesai}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-sm shadow-amber-500/20">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-amber-100" /><p className="text-xs font-semibold text-amber-100 uppercase tracking-wider">Total Biaya</p></div>
          <p className="text-lg font-extrabold leading-tight">{formatRupiah(totalBiaya)}</p>
          <p className="text-[11px] text-amber-100 mt-1">Servis selesai saja</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang, perbaikan, pelapor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="Menunggu Persetujuan">Menunggu ACC Wakasek</option>
              <option value="Proses">Sedang Diservis</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditolak">Ditolak Wakasek</option>
              <option value="Batal">Batal</option>
            </select>
            <span className="text-xs text-slate-400 px-2.5 py-1 bg-slate-100 rounded-lg font-medium">{filtered.length} data</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-widest">
                <th className="px-4 py-3.5 font-semibold">#</th>
                <th className="px-4 py-3.5 font-semibold">Barang / Aset</th>
                <th className="px-4 py-3.5 font-semibold">Kerusakan & Tindakan</th>
                <th className="px-4 py-3.5 font-semibold text-center">Foto</th>
                <th className="px-4 py-3.5 font-semibold">Pelapor → Wakasek</th>
                <th className="px-4 py-3.5 font-semibold text-right">Biaya Servis</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold text-center">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td className="px-4 py-4" colSpan={8}><div className="h-5 bg-slate-100 rounded-lg animate-pulse w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <FileWarning className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-500 text-sm">Belum ada data servis</p>
                    <p className="text-slate-400 text-xs mt-1">Laporan dari Wakapro akan muncul di sini setelah dikirim.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const namaBarang = item.sarana_prasarana?.nama_barang || item.aset?.nama_aset || '—';
                  const kodeBarang = item.sarana_prasarana?.kode || item.aset?.kode_aset || '-';
                  const statusCfg = STATUS_CONFIG[item.status] || { label: item.status, cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: null };
                  const canVerify = item.status === 'Proses';

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors group ${canVerify ? 'bg-blue-50/10' : ''}`}>
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-slate-800">{namaBarang}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{kodeBarang}</p>
                        {item.ruangan && <p className="text-[11px] text-slate-400 mt-0.5">{item.ruangan.nama_ruangan}</p>}
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.tanggal_servis}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-slate-700">{item.jenis_perbaikan}</p>
                        {item.deskripsi_kerusakan && (
                          <p className="text-xs text-slate-400 italic mt-0.5 line-clamp-2">{item.deskripsi_kerusakan}</p>
                        )}
                        {item.teknisi_bengkel && (
                          <p className="text-[11px] text-blue-600 mt-0.5 font-medium">Teknisi: {item.teknisi_bengkel}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {item.foto_kerusakan_url ? (
                          <button onClick={() => setLightboxUrl(item.foto_kerusakan_url!)} className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-amber-400 transition group/img mx-auto block">
                            <img src={item.foto_kerusakan_url} alt="Foto" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center">
                              <ZoomIn className="h-3.5 w-3.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mx-auto">
                            <ImageOff className="h-3.5 w-3.5 text-slate-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-slate-800">{item.pelapor?.nama_lengkap || '—'}</p>
                          {item.pelapor?.role && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.pelapor.role === 'super_admin' ? 'bg-amber-100 text-amber-800' :
                              item.pelapor.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {item.pelapor.role === 'super_admin' ? 'Super Admin' : item.pelapor.role === 'admin' ? 'Admin' : 'Wakapro'}
                            </span>
                          )}
                        </div>
                        {item.approved_by_wakasek && (
                          <p className="text-[11px] text-violet-600 mt-0.5 font-medium">
                            ✓ Wakasek: {item.approved_by_wakasek.nama_lengkap}
                          </p>
                        )}
                        {item.verified_by_admin && (
                          <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                            ✓ Admin: {item.verified_by_admin.nama_lengkap}
                          </p>
                        )}
                        {item.catatan_wakasek && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">"{item.catatan_wakasek}"</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {item.status === 'Menunggu Persetujuan' ? (
                          <span className="text-xs text-amber-500 italic">Belum ditentukan</span>
                        ) : (
                          <span className="font-bold text-amber-700 text-sm">{formatRupiah(Number(item.biaya_servis))}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusCfg.cls}`}>
                          {statusCfg.icon}{statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {canVerify && (
                            <button
                              onClick={() => { setSelesaiModal({ item }); setSelesaiForm({ catatan_admin: '', biaya_realisasi: String(item.biaya_servis || '') }); }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm whitespace-nowrap"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Verifikasi Selesai
                            </button>
                          )}
                          {!canVerify && (
                            <>
                              <button onClick={() => openEditModal(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Verifikasi Selesai */}
      {selesaiModal && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !selesaiSubmitting && setSelesaiModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Verifikasi Servis Selesai
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                  {selesaiModal.item.sarana_prasarana?.nama_barang || selesaiModal.item.aset?.nama_aset}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{selesaiModal.item.jenis_perbaikan}</p>
              </div>
              <button onClick={() => !selesaiSubmitting && setSelesaiModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSelesai} className="p-5 space-y-4">
              {/* Info biaya yang disetujui Wakasek */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[11px] text-slate-500 font-medium">Anggaran yang disetujui Wakasek:</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">{formatRupiah(Number(selesaiModal.item.biaya_servis))}</p>
                {selesaiModal.item.teknisi_bengkel && (
                  <p className="text-[11px] text-slate-500 mt-0.5">Teknisi: {selesaiModal.item.teknisi_bengkel}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biaya Realisasi (Rp) <span className="text-slate-400 font-normal">— Opsional, jika berbeda dari anggaran</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder={String(selesaiModal.item.biaya_servis || '')}
                  value={selesaiForm.biaya_realisasi}
                  onChange={e => setSelesaiForm({ ...selesaiForm, biaya_realisasi: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Admin (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan penutup atau keterangan hasil servis..."
                  value={selesaiForm.catatan_admin}
                  onChange={e => setSelesaiForm({ ...selesaiForm, catatan_admin: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white resize-none"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700">
                  Tindakan ini akan mengubah status servis menjadi <strong>Selesai</strong> dan kondisi aset secara otomatis kembali menjadi <strong>Baik</strong>. Notifikasi akan dikirim ke Wakapro dan Wakasek.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => !selesaiSubmitting && setSelesaiModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Batal</button>
                <button type="submit" disabled={selesaiSubmitting} className="flex items-center px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50">
                  {selesaiSubmitting && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />}
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                  Konfirmasi Selesai & Pulihkan Aset
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Form (Input Servis Manual Admin) */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !submitting && setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingItem ? 'Edit Catatan Servis' : 'Input Servis Manual (Admin)'}
              </h3>
              <button onClick={() => !submitting && setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Barang / Aset</label>
                {editingItem ? (
                  <div className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-between">
                    <span className="font-medium">
                      {editingItem.sarana_prasarana?.nama_barang || editingItem.aset?.nama_aset || 'Aset / Barang'}
                    </span>
                    <span className="text-[11px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-semibold ml-2 shrink-0">Terkunci</span>
                  </div>
                ) : (
                  <select
                    value={formData.sarana_prasarana_id}
                    onChange={e => setFormData({ ...formData, sarana_prasarana_id: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                  >
                    <option value="">-- Pilih Barang --</option>
                    {saranas.map(s => (
                      <option key={s.id} value={s.id}>{s.nama_barang} {s.kode ? `(${s.kode})` : ''} — {s.kondisi}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Perbaikan / Tindakan</label>
                <input
                  type="text"
                  placeholder="Misal: Ganti Lampu Proyektor, Isi Freon AC"
                  value={formData.jenis_perbaikan}
                  onChange={e => setFormData({ ...formData, jenis_perbaikan: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Servis</label>
                  <input type="date" value={formData.tanggal_servis} onChange={e => setFormData({ ...formData, tanggal_servis: e.target.value })} required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Biaya Servis (Rp)</label>
                  <input type="number" min="0" placeholder="0" value={formData.biaya_servis} onChange={e => setFormData({ ...formData, biaya_servis: e.target.value })} required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teknisi / Bengkel</label>
                  <input type="text" placeholder="CV Mitra Tekno" value={formData.teknisi_bengkel} onChange={e => setFormData({ ...formData, teknisi_bengkel: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white">
                    <option value="Proses">Sedang Diservis</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Batal">Batal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Kerusakan (Opsional)</label>
                <textarea rows={2} placeholder="Catatan detail..." value={formData.deskripsi_kerusakan} onChange={e => setFormData({ ...formData, deskripsi_kerusakan: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white" />
              </div>

              {/* Foto Kerusakan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-slate-500" />
                  Foto Kerusakan <span className="font-normal text-slate-400">(Opsional)</span>
                </label>
                {fotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-black group">
                    <img src={fotoPreview} alt="Preview" className="w-full h-40 object-cover opacity-95 group-hover:opacity-80 transition-opacity" />
                    <button type="button" onClick={removeFoto} className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1.5 bg-red-500/90 hover:bg-red-600 text-white text-[11px] font-semibold rounded-lg transition-all shadow-lg">
                      <X className="h-3 w-3" /> Hapus
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl cursor-pointer bg-slate-50 hover:bg-amber-50/30 transition-all group">
                    <Camera className="h-6 w-6 text-slate-400 group-hover:text-amber-500 transition-colors mb-1" />
                    <span className="text-xs text-slate-500 group-hover:text-amber-600 font-semibold">Klik untuk upload foto</span>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" onChange={handleFotoChange} className="hidden" />
                  </label>
                )}
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button type="button" onClick={() => !submitting && setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="flex items-center px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50">
                  {submitting && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />}
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Servis'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Form: Lapor Kerusakan ke Wakasek */}
      {isLaporModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !laporSubmitting && setIsLaporModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <SendHorizonal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Lapor Kerusakan ke Wakasek</h3>
                  <p className="text-xs text-slate-500">Ajukan perbaikan sarana prasarana untuk persetujuan anggaran Wakasek</p>
                </div>
              </div>
              <button onClick={() => !laporSubmitting && setIsLaporModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLaporSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Sarana Prasarana</label>
                <select
                  value={laporFormData.sarana_prasarana_id}
                  onChange={e => setLaporFormData({ ...laporFormData, sarana_prasarana_id: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                >
                  <option value="">-- Pilih Barang Sarana Prasarana --</option>
                  {saranas.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nama_barang} {s.kode ? `(${s.kode})` : ''} — Kondisi: {s.kondisi}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kerusakan</label>
                  <select
                    value={laporFormData.kondisi_rusak}
                    onChange={e => setLaporFormData({ ...laporFormData, kondisi_rusak: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                  >
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                    <option value="Tidak Layak Pakai">Tidak Layak Pakai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pelaporan</label>
                  <input
                    type="date"
                    value={laporFormData.tanggal_servis}
                    onChange={e => setLaporFormData({ ...laporFormData, tanggal_servis: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Perbaikan / Permohonan</label>
                <input
                  type="text"
                  placeholder="Misal: Perbaikan Mesin CNC, Penggantian Komponen, Servis Rutin AC"
                  value={laporFormData.jenis_perbaikan}
                  onChange={e => setLaporFormData({ ...laporFormData, jenis_perbaikan: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Kerusakan / Kendala (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan detail kerusakan atau kendala barang..."
                  value={laporFormData.deskripsi_kerusakan}
                  onChange={e => setLaporFormData({ ...laporFormData, deskripsi_kerusakan: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white resize-none"
                />
              </div>

              {/* Upload Foto Kerusakan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-slate-500" />
                  Foto Bukti Kerusakan <span className="font-normal text-slate-400">(Opsional)</span>
                </label>
                {laporFotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-black group">
                    <img src={laporFotoPreview} alt="Preview" className="w-full h-36 object-cover opacity-95 group-hover:opacity-80 transition-opacity" />
                    <button type="button" onClick={removeLaporFoto} className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1.5 bg-red-500/90 hover:bg-red-600 text-white text-[11px] font-semibold rounded-lg transition-all shadow-lg">
                      <X className="h-3 w-3" /> Hapus
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl cursor-pointer bg-slate-50 hover:bg-amber-50/30 transition-all group">
                    <Camera className="h-5 w-5 text-slate-400 group-hover:text-amber-500 transition-colors mb-1" />
                    <span className="text-xs text-slate-500 group-hover:text-amber-600 font-semibold">Upload Foto Kerusakan</span>
                    <input ref={laporFileInputRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" onChange={handleLaporFotoChange} className="hidden" />
                  </label>
                )}
              </div>

              {/* Notice Box Alur Workflow */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-0.5">
                  <p className="font-semibold">Alur Persetujuan ke Wakasek:</p>
                  <p className="text-amber-700 leading-relaxed">
                    Pengajuan ini berstatus <strong>Menunggu Persetujuan</strong>. Wakasek akan menentukan alokasi biaya servis & teknisi bengkel. Setelah dikerjakan, Anda dapat memverifikasi selesai untuk memulihkan aset menjadi <strong>Baik</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => !laporSubmitting && setIsLaporModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">
                  Batal
                </button>
                <button type="submit" disabled={laporSubmitting} className="flex items-center px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl disabled:opacity-50 shadow-sm">
                  {laporSubmitting && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />}
                  <SendHorizonal className="h-3.5 w-3.5 mr-1.5" />
                  Kirim Pengajuan ke Wakasek
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
