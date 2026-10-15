'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import { showErrorAlert } from '@/utils/errorHandler';
import {
  Wrench, Plus, Search, RefreshCw, DollarSign, CheckCircle2,
  Clock, X, Trash2, Edit2, Loader2, Camera, ImageOff, ZoomIn,
  Warehouse, AlertTriangle, SendHorizonal, FileWarning, ChevronRight,
  Ban
} from 'lucide-react';

interface WorkshopRuangan {
  id: number;
  nama_ruangan: string;
  kode_ruangan?: string;
  jenis?: string;
  gedung?: { nama_gedung: string; };
}

interface WorkshopBarang {
  id: number;
  sarana_prasarana_id: number | null;
  id_aset: number | null;
  tipe: 'sarana_prasarana' | 'aset';
  nama_barang: string;
  kode: string;
  kondisi: string;
  jumlah: number;
  satuan: string;
}

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
  pelapor?: { nama_lengkap: string; };
  approved_by_wakasek?: { nama_lengkap: string; };
  sarana_prasarana?: { id: number; kode: string; nama_barang: string; kondisi: string; };
  aset?: { id: number; kode_aset: string; nama_aset: string; };
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  'Menunggu Persetujuan': { label: 'Menunggu ACC Wakasek', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" /> },
  'Proses':              { label: 'Sedang Diservis',     cls: 'bg-blue-50 text-blue-700 border-blue-200',   icon: <Wrench className="h-3 w-3" /> },
  'Selesai':             { label: 'Selesai',              cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  'Batal':               { label: 'Batal',               cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Ban className="h-3 w-3" /> },
  'Ditolak':             { label: 'Ditolak Wakasek',     cls: 'bg-red-50 text-red-700 border-red-200',      icon: <X className="h-3 w-3" /> },
};

export default function ServisPage() {
  const [servises, setServises] = useState<ServisItem[]>([]);
  const [barangList, setBarangList] = useState<WorkshopBarang[]>([]);
  const [ruanganInfo, setRuanganInfo] = useState<WorkshopRuangan | null>(null);
  const [ruanganWarning, setRuanganWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Modal Lapor Kerusakan
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServisItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [hapusFoto, setHapusFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    item_key: '',
    sarana_prasarana_id: '',
    id_aset: '',
    jenis_perbaikan: '',
    tanggal_servis: new Date().toISOString().split('T')[0],
    deskripsi_kerusakan: '',
    kondisi_rusak: 'Rusak Ringan',
  });

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [servisRes, barangRes] = await Promise.all([
        axios.get('/api/servises'),
        axios.get('/api/workshop/pilih-barang'),
      ]);
      setServises(servisRes.data || []);
      setBarangList(barangRes.data?.items || []);
      setRuanganInfo(barangRes.data?.ruangan || null);
      setRuanganWarning(barangRes.data?.warning || null);
    } catch (err) {
      console.error('Failed to fetch servis data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openLaporModal = () => {
    setEditingItem(null);
    setFotoFile(null);
    setFotoPreview(null);
    setHapusFoto(false);
    const firstItem = barangList.find(b => b.kondisi !== 'Baik');
    const initialKey = firstItem ? `${firstItem.tipe}-${firstItem.id}` : (barangList[0] ? `${barangList[0].tipe}-${barangList[0].id}` : '');
    setFormData({
      item_key: initialKey,
      sarana_prasarana_id: firstItem?.tipe === 'sarana_prasarana' ? String(firstItem.id) : (barangList[0]?.tipe === 'sarana_prasarana' ? String(barangList[0].id) : ''),
      id_aset: firstItem?.tipe === 'aset' ? String(firstItem.id) : (barangList[0]?.tipe === 'aset' ? String(barangList[0].id) : ''),
      jenis_perbaikan: '',
      tanggal_servis: new Date().toISOString().split('T')[0],
      deskripsi_kerusakan: '',
      kondisi_rusak: 'Rusak Ringan',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ServisItem) => {
    // Wakapro hanya bisa edit yang masih 'Menunggu Persetujuan'
    if (item.status !== 'Menunggu Persetujuan') return;
    setEditingItem(item);
    setFotoFile(null);
    setFotoPreview(item.foto_kerusakan_url || null);
    setHapusFoto(false);
    const itemKey = item.sarana_prasarana_id
      ? `sarana_prasarana-${item.sarana_prasarana_id}`
      : item.id_aset ? `aset-${item.id_aset}` : '';
    setFormData({
      item_key: itemKey,
      sarana_prasarana_id: item.sarana_prasarana_id ? String(item.sarana_prasarana_id) : '',
      id_aset: item.id_aset ? String(item.id_aset) : '',
      jenis_perbaikan: item.jenis_perbaikan,
      tanggal_servis: item.tanggal_servis,
      deskripsi_kerusakan: item.deskripsi_kerusakan || '',
      kondisi_rusak: 'Rusak Ringan',
    });
    setIsModalOpen(true);
  };

  const handleItemSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setFormData(prev => ({ ...prev, item_key: '', sarana_prasarana_id: '', id_aset: '' }));
      return;
    }
    const parts = val.split('-');
    const tipe = parts[0];
    const idStr = parts.slice(1).join('-');
    setFormData(prev => ({
      ...prev,
      item_key: val,
      sarana_prasarana_id: tipe === 'sarana_prasarana' ? idStr : '',
      id_aset: tipe === 'aset' ? idStr : '',
    }));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const removeFoto = () => {
    setFotoFile(null);
    setFotoPreview(null);
    setHapusFoto(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem && !formData.sarana_prasarana_id && !formData.id_aset) {
      showErrorAlert('Silakan pilih barang/aset di workshop terlebih dahulu.', 'Validasi Form Servis');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (!editingItem) {
        if (formData.sarana_prasarana_id) fd.append('sarana_prasarana_id', formData.sarana_prasarana_id);
        if (formData.id_aset) fd.append('id_aset', formData.id_aset);
      }
      fd.append('jenis_perbaikan', formData.jenis_perbaikan);
      fd.append('tanggal_servis', formData.tanggal_servis);
      fd.append('deskripsi_kerusakan', formData.deskripsi_kerusakan);
      fd.append('kondisi_rusak', formData.kondisi_rusak);
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
    } catch (err: any) {
      showErrorAlert(err, 'Gagal Menyimpan Laporan Servis');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus laporan kerusakan ini? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
      await axios.delete(`/api/servises/${id}`);
      fetchData(true);
    } catch (err) {
      showErrorAlert(err, 'Gagal Menghapus Data Servis');
    }
  };

  const filtered = servises.filter(s => {
    const q = search.toLowerCase();
    const namaBarang = (s.sarana_prasarana?.nama_barang || s.aset?.nama_aset || '').toLowerCase();
    const matchSearch =
      s.jenis_perbaikan.toLowerCase().includes(q) ||
      namaBarang.includes(q) ||
      (s.teknisi_bengkel?.toLowerCase().includes(q) ?? false);
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalBiaya = servises.filter(s => s.status === 'Selesai').reduce((sum, s) => sum + Number(s.biaya_servis || 0), 0);
  const totalMenunggu = servises.filter(s => s.status === 'Menunggu Persetujuan').length;
  const totalProses = servises.filter(s => s.status === 'Proses').length;
  const totalSelesai = servises.filter(s => s.status === 'Selesai').length;

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition" onClick={() => setLightboxUrl(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxUrl} alt="Foto Kerusakan" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain" />
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold flex items-center gap-1">
              <Warehouse className="h-3 w-3 text-amber-600" />
              {ruanganInfo?.nama_ruangan || 'Workshop Jurusan'}
            </span>
            {ruanganInfo?.gedung?.nama_gedung && (
              <span className="text-xs text-slate-400 font-medium">· {ruanganInfo.gedung.nama_gedung}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center mr-3 shadow-sm shadow-amber-500/20 shrink-0">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            Laporan Kerusakan & Pengajuan Servis
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-11">
            Laporkan kerusakan aset workshop & ajukan perbaikan — Wakasek yang menentukan anggaran & persetujuan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(true)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors" title="Muat Ulang">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openLaporModal} className="flex items-center px-4 py-2.5 bg-linear-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-amber-500/20">
            <SendHorizonal className="h-4 w-4 mr-1.5" />
            Lapor Kerusakan Baru
          </button>
        </div>
      </div>

      {/* Warning */}
      {ruanganWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium">{ruanganWarning}</p>
        </div>
      )}

      {/* Menunggu ACC Banner */}
      {totalMenunggu > 0 && (
        <div className="bg-linear-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 animate-pulse">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">{totalMenunggu} Laporan Menunggu Persetujuan Wakasek</p>
            <p className="text-xs text-amber-600 mt-0.5">Laporan dikirim — Wakasek akan meninjau dan menentukan anggaran servis.</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Menunggu ACC</p>
          </div>
          <p className="text-2xl font-extrabold text-amber-800">{totalMenunggu} <span className="text-sm font-normal">pengajuan</span></p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Dalam Servis</p>
          </div>
          <p className="text-2xl font-extrabold text-blue-800">{totalProses} <span className="text-sm font-normal">unit</span></p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Selesai</p>
          </div>
          <p className="text-2xl font-extrabold text-emerald-800">{totalSelesai} <span className="text-sm font-normal">kali</span></p>
        </div>
        <div className="bg-linear-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-sm shadow-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-amber-100" />
            <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider">Total Biaya</p>
          </div>
          <p className="text-lg font-extrabold leading-tight">{formatRupiah(totalBiaya)}</p>
          <p className="text-[11px] text-amber-100 mt-1">Servis yang sudah selesai</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang, jenis perbaikan..."
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
              <option value="Menunggu Persetujuan">Menunggu ACC</option>
              <option value="Proses">Sedang Diservis</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditolak">Ditolak</option>
              <option value="Batal">Batal</option>
            </select>
            <span className="text-xs text-slate-400 px-2.5 py-1 bg-slate-100 rounded-lg font-medium">{filtered.length} laporan</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-widest">
                <th className="px-4 py-3.5 font-semibold">#</th>
                <th className="px-4 py-3.5 font-semibold">Tanggal</th>
                <th className="px-4 py-3.5 font-semibold">Nama Barang</th>
                <th className="px-4 py-3.5 font-semibold">Kerusakan & Perbaikan</th>
                <th className="px-4 py-3.5 font-semibold text-center">Foto</th>
                <th className="px-4 py-3.5 font-semibold text-right">Biaya Servis</th>
                <th className="px-4 py-3.5 font-semibold">Status & Catatan</th>
                <th className="px-4 py-3.5 font-semibold text-right">Aksi</th>
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
                    <p className="font-semibold text-slate-500 text-sm">Belum ada laporan kerusakan</p>
                    <p className="text-slate-400 text-xs mt-1">Klik &quot;Lapor Kerusakan Baru&quot; untuk mengajukan perbaikan aset ke Wakasek.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const namaBarang = item.sarana_prasarana?.nama_barang || item.aset?.nama_aset || '—';
                  const kodeBarang = item.sarana_prasarana?.kode || item.aset?.kode_aset || '-';
                  const statusCfg = STATUS_CONFIG[item.status] || { label: item.status, cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: null };
                  const canEdit = item.status === 'Menunggu Persetujuan';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">{item.tanggal_servis}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-slate-800">{namaBarang}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{kodeBarang}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-slate-700">{item.jenis_perbaikan}</p>
                        {item.deskripsi_kerusakan && (
                          <p className="text-xs text-slate-400 italic mt-0.5 line-clamp-1">{item.deskripsi_kerusakan}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {item.foto_kerusakan_url ? (
                          <button onClick={() => setLightboxUrl(item.foto_kerusakan_url!)} className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-amber-400 transition group/img mx-auto block" title="Lihat foto kerusakan">
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
                      <td className="px-4 py-3.5 text-right">
                        {item.status === 'Menunggu Persetujuan' ? (
                          <span className="text-xs text-amber-600 font-semibold italic">Ditentukan Wakasek</span>
                        ) : (
                          <span className="font-bold text-amber-700 text-sm">{formatRupiah(Number(item.biaya_servis))}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusCfg.cls}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                        {item.catatan_wakasek && (
                          <p className="text-[11px] text-slate-400 mt-1 italic line-clamp-2" title={item.catatan_wakasek}>
                            <span className="font-semibold text-slate-500">Catatan Wakasek:</span> {item.catatan_wakasek}
                          </p>
                        )}
                        {item.teknisi_bengkel && item.status === 'Proses' && (
                          <p className="text-[11px] text-blue-500 mt-0.5 font-medium">{item.teknisi_bengkel}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {canEdit && (
                            <button onClick={() => openEditModal(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit laporan">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canEdit && (
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus laporan">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!canEdit && (
                            <span className="text-[10px] text-slate-300 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 italic">
                              {item.status === 'Selesai' ? 'Arsip' : 'Read-only'}
                            </span>
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

      {/* Modal Form Lapor Kerusakan */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-linear-to-r from-amber-50 to-orange-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <SendHorizonal className="h-4 w-4 text-amber-600" />
                  {editingItem ? 'Edit Laporan Kerusakan' : 'Lapor Kerusakan & Ajukan Servis'}
                </h3>
                <p className="text-xs text-amber-600 mt-0.5">
                  Laporan dikirim ke Wakasek untuk ditinjau dan di-ACC
                </p>
                {ruanganInfo && (
                  <p className="text-xs text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                    <Warehouse className="h-3 w-3" />
                    Workshop: {ruanganInfo.nama_ruangan}
                  </p>
                )}
              </div>
              <button onClick={() => !submitting && setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info Banner */}
            {!editingItem && (
              <div className="px-5 pt-4 pb-0">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Setelah Anda kirim, <strong>Wakasek</strong> akan meninjau laporan ini. Jika disetujui, Wakasek akan menentukan <strong>biaya dan teknisi</strong>. Servis baru berjalan setelah ACC.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {/* Pilih Barang */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Barang / Aset yang Rusak <span className="text-red-500">*</span>
                </label>
                {editingItem ? (
                  <div className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-between">
                    <span className="font-medium">
                      {editingItem.sarana_prasarana?.nama_barang ?? editingItem.aset?.nama_aset ?? 'Barang Terpilih'}
                    </span>
                    <span className="text-[11px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-semibold ml-2 shrink-0">Terkunci</span>
                  </div>
                ) : (
                  <>
                    <select
                      value={formData.item_key}
                      onChange={handleItemSelectChange}
                      required
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white font-medium text-slate-800 transition-all"
                    >
                      <option value="">-- Pilih Barang di Workshop Anda --</option>
                      {barangList.map(b => (
                        <option key={`${b.tipe}-${b.id}`} value={`${b.tipe}-${b.id}`}>
                          {b.nama_barang} {b.kode ? `(${b.kode})` : ''} — Kondisi: {b.kondisi}
                        </option>
                      ))}
                    </select>
                    {barangList.length === 0 && (
                      <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Belum ada barang di workshop. Pastikan sudah diterima di menu Penerimaan.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Kondisi & Jenis */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kerusakan <span className="text-red-500">*</span></label>
                  <select
                    value={formData.kondisi_rusak}
                    onChange={e => setFormData({ ...formData, kondisi_rusak: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white font-medium"
                  >
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                    <option value="Tidak Layak Pakai">Tidak Layak Pakai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Diketahui Rusak</label>
                  <input
                    type="date"
                    value={formData.tanggal_servis}
                    onChange={e => setFormData({ ...formData, tanggal_servis: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis / Tindakan Perbaikan yang Diperlukan <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Misal: Ganti Komponen, Tune Up, Kalibrasi Sensor"
                  value={formData.jenis_perbaikan}
                  onChange={e => setFormData({ ...formData, jenis_perbaikan: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Kerusakan (Opsional)</label>
                <textarea
                  rows={3}
                  placeholder="Deskripsikan gejala kerusakan secara detail agar Wakasek dapat menilai urgensinya..."
                  value={formData.deskripsi_kerusakan}
                  onChange={e => setFormData({ ...formData, deskripsi_kerusakan: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white resize-none"
                />
              </div>

              {/* Foto Bukti Kerusakan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-slate-500" />
                  Foto Bukti Kerusakan <span className="font-normal text-slate-400">(Sangat Disarankan)</span>
                </label>
                {fotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-black group">
                    <img src={fotoPreview} alt="Preview" className="w-full h-48 object-cover opacity-95 group-hover:opacity-80 transition-opacity duration-200" />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/70 to-transparent pointer-events-none" />
                    <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 pointer-events-none">
                      <Camera className="h-3.5 w-3.5 text-white/80" />
                      <span className="text-[11px] text-white/90 font-medium">{fotoFile ? fotoFile.name : 'Foto tersimpan'}</span>
                    </div>
                    <button type="button" onClick={removeFoto} className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1.5 bg-red-500/90 hover:bg-red-600 text-white text-[11px] font-semibold rounded-lg transition-all shadow-lg">
                      <X className="h-3 w-3" /> Hapus
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl cursor-pointer bg-slate-50 hover:bg-amber-50/30 transition-all group">
                    <div className="p-2.5 rounded-full bg-slate-100 group-hover:bg-amber-100 transition-colors mb-2">
                      <Camera className="h-6 w-6 text-slate-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <span className="text-xs text-slate-500 group-hover:text-amber-600 font-semibold transition-colors">Klik untuk upload foto bukti kerusakan</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP — Maks. 5MB</span>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" onChange={handleFotoChange} className="hidden" />
                  </label>
                )}
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button type="button" onClick={() => !submitting && setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={submitting || barangList.length === 0} className="flex items-center px-5 py-2 text-xs font-semibold text-white bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl transition-colors disabled:opacity-50">
                  {submitting && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />}
                  <SendHorizonal className="h-3.5 w-3.5 mr-1.5" />
                  {editingItem ? 'Simpan Perubahan' : 'Kirim Laporan ke Wakasek'}
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
