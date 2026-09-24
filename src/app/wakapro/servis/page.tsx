'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Wrench, Plus, Search, RefreshCw, DollarSign, CheckCircle2,
  Clock, X, Trash2, Edit2, Loader2, Camera, ImageOff, ZoomIn,
  Warehouse, AlertTriangle,
} from 'lucide-react';

interface WorkshopRuangan {
  id: number;
  nama_ruangan: string;
  kode_ruangan?: string;
  jenis?: string;
  gedung?: {
    nama_gedung: string;
  };
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
  keterangan?: string | null;
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
  status: 'Selesai' | 'Proses' | 'Batal';
  sarana_prasarana?: {
    id: number;
    kode: string;
    nama_barang: string;
    kondisi: string;
  };
  aset?: {
    id: number;
    kode_aset: string;
    nama_aset: string;
  };
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServisItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    item_key: '',
    sarana_prasarana_id: '',
    id_aset: '',
    jenis_perbaikan: '',
    tanggal_servis: new Date().toISOString().split('T')[0],
    biaya_servis: '',
    teknisi_bengkel: '',
    deskripsi_kerusakan: '',
    status: 'Selesai',
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

  const openAddModal = () => {
    setEditingItem(null);
    setFotoFile(null);
    setFotoPreview(null);
    const firstItem = barangList[0];
    const initialKey = firstItem ? `${firstItem.tipe}-${firstItem.id}` : '';
    setFormData({
      item_key: initialKey,
      sarana_prasarana_id: firstItem?.tipe === 'sarana_prasarana' ? String(firstItem.id) : '',
      id_aset: firstItem?.tipe === 'aset' ? String(firstItem.id) : '',
      jenis_perbaikan: '',
      tanggal_servis: new Date().toISOString().split('T')[0],
      biaya_servis: '',
      teknisi_bengkel: '',
      deskripsi_kerusakan: '',
      status: 'Selesai',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ServisItem) => {
    setEditingItem(item);
    setFotoFile(null);
    setFotoPreview(item.foto_kerusakan_url || null);
    const itemKey = item.sarana_prasarana_id
      ? `sarana_prasarana-${item.sarana_prasarana_id}`
      : item.id_aset
      ? `aset-${item.id_aset}`
      : '';
    setFormData({
      item_key: itemKey,
      sarana_prasarana_id: item.sarana_prasarana_id ? String(item.sarana_prasarana_id) : '',
      id_aset: item.id_aset ? String(item.id_aset) : '',
      jenis_perbaikan: item.jenis_perbaikan,
      tanggal_servis: item.tanggal_servis,
      biaya_servis: String(item.biaya_servis),
      teknisi_bengkel: item.teknisi_bengkel || '',
      deskripsi_kerusakan: item.deskripsi_kerusakan || '',
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const handleItemSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setFormData(prev => ({
        ...prev,
        item_key: '',
        sarana_prasarana_id: '',
        id_aset: '',
      }));
      return;
    }
    const [tipe, idStr] = val.split('-');
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sarana_prasarana_id && !formData.id_aset) {
      alert('Silakan pilih barang / aset di workshop terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (formData.sarana_prasarana_id) {
        fd.append('sarana_prasarana_id', formData.sarana_prasarana_id);
      }
      if (formData.id_aset) {
        fd.append('id_aset', formData.id_aset);
      }
      fd.append('jenis_perbaikan', formData.jenis_perbaikan);
      fd.append('tanggal_servis', formData.tanggal_servis);
      fd.append('biaya_servis', formData.biaya_servis);
      fd.append('teknisi_bengkel', formData.teknisi_bengkel);
      fd.append('deskripsi_kerusakan', formData.deskripsi_kerusakan);
      fd.append('status', formData.status);
      if (fotoFile) fd.append('foto_kerusakan', fotoFile);

      if (editingItem) {
        fd.append('_method', 'PUT');
        await axios.post(`/api/servises/${editingItem.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await axios.post('/api/servises', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setIsModalOpen(false);
      fetchData(true);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Gagal menyimpan data servis. Periksa kembali form Anda.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan servis ini?')) return;
    try {
      await axios.delete(`/api/servises/${id}`);
      fetchData(true);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus data.');
    }
  };

  const filtered = servises.filter(s => {
    const q = search.toLowerCase();
    const namaBarang = (s.sarana_prasarana?.nama_barang || s.aset?.nama_aset || '').toLowerCase();
    const kodeBarang = (s.sarana_prasarana?.kode || s.aset?.kode_aset || '').toLowerCase();
    const matchSearch =
      s.jenis_perbaikan.toLowerCase().includes(q) ||
      namaBarang.includes(q) ||
      kodeBarang.includes(q) ||
      (s.teknisi_bengkel?.toLowerCase().includes(q) ?? false);
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalBiaya = servises.reduce((sum, s) => sum + Number(s.biaya_servis || 0), 0);
  const totalSelesai = servises.filter(s => s.status === 'Selesai').length;
  const totalProses = servises.filter(s => s.status === 'Proses').length;

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Foto Kerusakan"
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain"
          />
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
              <span className="text-xs text-slate-400 font-medium">
                · {ruanganInfo.gedung.nama_gedung}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mr-3 shadow-sm shadow-amber-500/20 flex-shrink-0">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            Servis &amp; Perbaikan Aset Workshop
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-11">
            Pencatatan riwayat pemeliharaan, servis, dan kondisi alat khusus di workshop Anda
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(true)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors" title="Muat Ulang">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openAddModal} className="flex items-center px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-amber-500/20">
            <Plus className="h-4 w-4 mr-1.5" />
            Catat Servis Baru
          </button>
        </div>
      </div>

      {/* Warning jika belum ada ruangan */}
      {ruanganWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-medium">{ruanganWarning}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-sm shadow-amber-500/20">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-4 w-4 text-amber-100" />
            <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider">Total Biaya Perbaikan</p>
          </div>
          <p className="text-2xl font-extrabold">{formatRupiah(totalBiaya)}</p>
          <p className="text-xs text-amber-100 mt-1">Akumulasi pengeluaran servis workshop</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Servis Selesai</p>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{totalSelesai} <span className="text-sm font-normal text-slate-400">kali</span></p>
          <p className="text-xs text-slate-400 mt-1">Barang siap digunakan di bengkel</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dalam Proses</p>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{totalProses} <span className="text-sm font-normal text-slate-400">unit</span></p>
          <p className="text-xs text-slate-400 mt-1">Sedang ditangani teknisi</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari perbaikan, barang workshop, teknisi..."
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
              <option value="Selesai">Status: Selesai</option>
              <option value="Proses">Status: Dalam Proses</option>
              <option value="Batal">Status: Batal</option>
            </select>
            <span className="text-xs text-slate-400 px-2.5 py-1 bg-slate-100 rounded-lg font-medium">
              {filtered.length} riwayat servis
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-widest">
                <th className="px-4 py-3.5 font-semibold">#</th>
                <th className="px-4 py-3.5 font-semibold">Tanggal</th>
                <th className="px-4 py-3.5 font-semibold">Nama Barang</th>
                <th className="px-4 py-3.5 font-semibold">Jenis Perbaikan</th>
                <th className="px-4 py-3.5 font-semibold text-center">Foto</th>
                <th className="px-4 py-3.5 font-semibold text-right">Biaya Servis</th>
                <th className="px-4 py-3.5 font-semibold">Teknisi / Bengkel</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td className="px-4 py-4" colSpan={9}><div className="skeleton h-5 rounded-lg w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Wrench className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-500 text-sm">Belum ada riwayat perbaikan di workshop ini</p>
                    <p className="text-slate-400 text-xs mt-1">Klik tombol &quot;+ Catat Servis Baru&quot; untuk mencatat pemeliharaan alat.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const namaBarang = item.sarana_prasarana?.nama_barang || item.aset?.nama_aset || '—';
                  const kodeBarang = item.sarana_prasarana?.kode || item.aset?.kode_aset || '-';

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
                          <button
                            onClick={() => setLightboxUrl(item.foto_kerusakan_url!)}
                            className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-amber-400 transition group/img mx-auto block"
                            title="Lihat foto kerusakan"
                          >
                            <img src={item.foto_kerusakan_url} alt="Foto" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center">
                              <ZoomIn className="h-3.5 w-3.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mx-auto" title="Tidak ada foto">
                            <ImageOff className="h-3.5 w-3.5 text-slate-300" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-amber-700 text-sm">
                        {formatRupiah(Number(item.biaya_servis))}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{item.teknisi_bengkel || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.status === 'Proses' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button onClick={() => openEditModal(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* Modal Form */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !submitting && setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingItem ? 'Edit Catatan Servis' : 'Catat Servis & Perbaikan Baru'}
                </h3>
                {ruanganInfo && (
                  <p className="text-xs text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                    <Warehouse className="h-3 w-3 text-amber-600" />
                    Workshop: {ruanganInfo.nama_ruangan}
                  </p>
                )}
              </div>
              <button onClick={() => !submitting && setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {/* Pilih Barang Khusus Workshop */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Pilih Barang / Aset di Workshop
                  </label>
                  {ruanganInfo && (
                    <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 flex items-center gap-1">
                      <Warehouse className="h-3 w-3 text-amber-600" />
                      {ruanganInfo.nama_ruangan}
                    </span>
                  )}
                </div>
                <select
                  value={formData.item_key}
                  onChange={handleItemSelectChange}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white font-medium text-slate-800 transition-all"
                >
                  <option value="">-- Pilih Barang di Workshop Anda --</option>
                  {editingItem && formData.item_key && !barangList.some(item => `${item.tipe}-${item.id}` === formData.item_key) && (
                    <option value={formData.item_key}>
                      {editingItem.sarana_prasarana?.nama_barang ?? editingItem.aset?.nama_aset ?? 'Barang Terpilih'} (Sedang Diedit)
                    </option>
                  )}
                  {barangList.map(item => (
                    <option key={`${item.tipe}-${item.id}`} value={`${item.tipe}-${item.id}`}>
                      {item.nama_barang} {item.kode ? `(${item.kode})` : ''} — Kondisi: {item.kondisi} ({item.jumlah} {item.satuan})
                    </option>
                  ))}
                </select>
                {barangList.length === 0 ? (
                  <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    Belum ada barang di workshop Anda. Pastikan aset sudah diterima di menu Penerimaan.
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hanya menampilkan aset yang berada di workshop Anda ({barangList.length} jenis barang).
                  </p>
                )}
              </div>

              {/* Jenis Perbaikan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Perbaikan / Tindakan</label>
                <input
                  type="text"
                  placeholder="Misal: Kalibrasi Sensor, Ganti Mata Pisau, Tune Up Mesin"
                  value={formData.jenis_perbaikan}
                  onChange={e => setFormData({ ...formData, jenis_perbaikan: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Servis</label>
                  <input
                    type="date"
                    value={formData.tanggal_servis}
                    onChange={e => setFormData({ ...formData, tanggal_servis: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Biaya Servis (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.biaya_servis}
                    onChange={e => setFormData({ ...formData, biaya_servis: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teknisi / Nama Bengkel</label>
                  <input
                    type="text"
                    placeholder="Misal: Teknisi Mandiri / CV Mitra Tekno"
                    value={formData.teknisi_bengkel}
                    onChange={e => setFormData({ ...formData, teknisi_bengkel: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Perbaikan</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white font-medium"
                  >
                    <option value="Selesai">Selesai</option>
                    <option value="Proses">Dalam Proses</option>
                    <option value="Batal">Batal</option>
                  </select>
                </div>
              </div>

              {/* Deskripsi Kerusakan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Kerusakan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan detail gejala kerusakan..."
                  value={formData.deskripsi_kerusakan}
                  onChange={e => setFormData({ ...formData, deskripsi_kerusakan: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                />
              </div>

              {/* Foto Kerusakan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-slate-500" />
                  Foto Kerusakan (Opsional)
                </label>
                {fotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={fotoPreview} alt="Preview" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={removeFoto}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl cursor-pointer bg-slate-50 hover:bg-amber-50/30 transition-all group">
                    <Camera className="h-8 w-8 text-slate-300 group-hover:text-amber-400 mb-2 transition-colors" />
                    <span className="text-xs text-slate-400 group-hover:text-amber-500 font-medium transition-colors">Klik untuk upload foto kerusakan</span>
                    <span className="text-[10px] text-slate-300 mt-0.5">JPG, PNG, WebP — Maks. 5MB</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => !submitting && setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || barangList.length === 0}
                  className="flex items-center px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />}
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Servis'}
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
