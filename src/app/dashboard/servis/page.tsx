'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Wrench, Plus, Search, RefreshCw, DollarSign, CheckCircle2,
  Clock, X, Trash2, Edit2, Loader2, Camera, ImageOff, ZoomIn,
} from 'lucide-react';

interface SaranaPrasarana {
  id: number;
  kode: string;
  nama_barang: string;
  kondisi: string;
  id_ruangan?: number;
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
  sarana_prasarana?: SaranaPrasarana;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export default function ServisPage() {
  const [servises, setServises] = useState<ServisItem[]>([]);
  const [saranas, setSaranas] = useState<SaranaPrasarana[]>([]);
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
    sarana_prasarana_id: '',
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
      const [servisRes, saranaRes] = await Promise.all([
        axios.get('/api/servises'),
        axios.get('/api/sarana-prasaranas'),
      ]);
      setServises(servisRes.data);
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
    setFotoFile(null);
    setFotoPreview(null);
    setFormData({
      sarana_prasarana_id: saranas[0]?.id ? String(saranas[0].id) : '',
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
    setFotoFile(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('sarana_prasarana_id', formData.sarana_prasarana_id);
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
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data servis. Periksa kembali form Anda.');
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
    const namaBarang = s.sarana_prasarana?.nama_barang?.toLowerCase() || '';
    const matchSearch =
      s.jenis_perbaikan.toLowerCase().includes(q) ||
      namaBarang.includes(q) ||
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mr-3 shadow-sm shadow-amber-500/20 flex-shrink-0">
              <Wrench className="h-4 w-4 text-white" />
            </div>
            Servis &amp; Perbaikan Aset
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-11">
            Pencatatan riwayat pemeliharaan, perbaikan, dan biaya servis fasilitas sekolah
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(true)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openAddModal} className="flex items-center px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-amber-500/20">
            <Plus className="h-4 w-4 mr-1.5" />
            Catat Servis Baru
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-sm shadow-amber-500/20">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-4 w-4 text-amber-100" />
            <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider">Total Biaya Perbaikan</p>
          </div>
          <p className="text-2xl font-extrabold">{formatRupiah(totalBiaya)}</p>
          <p className="text-xs text-amber-100 mt-1">Akumulasi pengeluaran servis</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Servis Selesai</p>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{totalSelesai} <span className="text-sm font-normal text-slate-400">kali</span></p>
          <p className="text-xs text-slate-400 mt-1">Barang siap digunakan</p>
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
              placeholder="Cari perbaikan, barang, teknisi..."
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
              {filtered.length} data
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
                    <p className="font-semibold text-slate-500 text-sm">Belum ada riwayat perbaikan</p>
                    <p className="text-slate-400 text-xs mt-1">Klik tombol &quot;+ Catat Servis Baru&quot; untuk menambah catatan.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3.5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">{item.tanggal_servis}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-slate-800">{item.sarana_prasarana?.nama_barang || '—'}</p>
                      <p className="text-[11px] text-slate-400">{item.sarana_prasarana?.kode || '-'}</p>
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
                ))
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
              <h3 className="font-bold text-slate-900 text-base">
                {editingItem ? 'Edit Catatan Servis' : 'Catat Servis & Perbaikan Baru'}
              </h3>
              <button onClick={() => !submitting && setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {/* Pilih Barang */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Barang / Aset</label>
                <select
                  value={formData.sarana_prasarana_id}
                  onChange={e => setFormData({ ...formData, sarana_prasarana_id: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                >
                  <option value="">-- Pilih Barang --</option>
                  {saranas.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nama_barang} {s.kode ? `(${s.kode})` : ''} — {s.kondisi}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenis Perbaikan */}
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
                    placeholder="Misal: CV Mitra Tekno"
                    value={formData.teknisi_bengkel}
                    onChange={e => setFormData({ ...formData, teknisi_bengkel: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Perbaikan</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
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
                  disabled={submitting}
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
