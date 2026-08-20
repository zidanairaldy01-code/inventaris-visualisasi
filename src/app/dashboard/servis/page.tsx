'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { Wrench, Plus, Search, RefreshCw, DollarSign, CheckCircle2, Clock, AlertCircle, X, Trash2, Edit2, Loader2 } from 'lucide-react';

interface Aset {
  id: number;
  kode_aset: string | null;
  nama_aset: string;
  ruangan?: { nama_ruangan: string };
}

interface ServisItem {
  id: number;
  id_aset: number;
  jenis_perbaikan: string;
  tanggal_servis: string;
  biaya_servis: number;
  teknisi_bengkel: string | null;
  deskripsi_kerusakan: string | null;
  status: 'Selesai' | 'Proses' | 'Batal';
  aset?: Aset;
}

const formatRupiah = (n: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
};

export default function ServisPage() {
  const [servises, setServises] = useState<ServisItem[]>([]);
  const [asets, setAsets] = useState<Aset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServisItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id_aset: '',
    jenis_perbaikan: '',
    tanggal_servis: new Date().toISOString().split('T')[0],
    biaya_servis: '',
    teknisi_bengkel: '',
    deskripsi_kerusakan: '',
    status: 'Selesai',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [servisRes, asetRes] = await Promise.all([
        axios.get('/api/servises'),
        axios.get('/api/asets'),
      ]);
      setServises(servisRes.data);
      setAsets(asetRes.data);
    } catch (err) {
      console.error('Failed to fetch servis data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      id_aset: asets[0]?.id ? String(asets[0].id) : '',
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
    setFormData({
      id_aset: String(item.id_aset),
      jenis_perbaikan: item.jenis_perbaikan,
      tanggal_servis: item.tanggal_servis,
      biaya_servis: String(item.biaya_servis),
      teknisi_bengkel: item.teknisi_bengkel || '',
      deskripsi_kerusakan: item.deskripsi_kerusakan || '',
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        id_aset: Number(formData.id_aset),
        jenis_perbaikan: formData.jenis_perbaikan,
        tanggal_servis: formData.tanggal_servis,
        biaya_servis: Number(formData.biaya_servis),
        teknisi_bengkel: formData.teknisi_bengkel || null,
        deskripsi_kerusakan: formData.deskripsi_kerusakan || null,
        status: formData.status,
      };

      if (editingItem) {
        await axios.put(`/api/servises/${editingItem.id}`, payload);
      } else {
        await axios.post('/api/servises', payload);
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

  // Filtered List
  const filtered = servises.filter(s => {
    const q = search.toLowerCase();
    const matchSearch =
      s.jenis_perbaikan.toLowerCase().includes(q) ||
      s.aset?.nama_aset.toLowerCase().includes(q) ||
      s.teknisi_bengkel?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalBiaya = servises.reduce((sum, s) => sum + Number(s.biaya_servis || 0), 0);
  const totalSelesai = servises.filter(s => s.status === 'Selesai').length;
  const totalProses = servises.filter(s => s.status === 'Proses').length;

  return (
    <div className="space-y-6 animate-fadeInUp">
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
          <button
            onClick={() => fetchData(true)}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-amber-500/20"
          >
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
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari perbaikan, aset, teknisi..."
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-widest">
                <th className="px-4 py-3.5 font-semibold">#</th>
                <th className="px-4 py-3.5 font-semibold">Tanggal</th>
                <th className="px-4 py-3.5 font-semibold">Nama Aset</th>
                <th className="px-4 py-3.5 font-semibold">Jenis Perbaikan</th>
                <th className="px-4 py-3.5 font-semibold text-right">Biaya Servis</th>
                <th className="px-4 py-3.5 font-semibold">Teknisi / Bengkel</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td className="px-4 py-4" colSpan={8}><div className="skeleton h-5 rounded-lg w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Wrench className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-500 text-sm">Belum ada riwayat perbaikan</p>
                    <p className="text-slate-400 text-xs mt-1">Klik tombol "+ Catat Servis Baru" untuk menambah catatan.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3.5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">{item.tanggal_servis}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-slate-800">{item.aset?.nama_aset || 'Aset Dihapus'}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.aset?.kode_aset || '-'} · {item.aset?.ruangan?.nama_ruangan || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-slate-700">{item.jenis_perbaikan}</p>
                      {item.deskripsi_kerusakan && (
                        <p className="text-xs text-slate-400 italic mt-0.5 line-clamp-1">{item.deskripsi_kerusakan}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-amber-700 text-sm">
                      {formatRupiah(Number(item.biaya_servis))}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {item.teknisi_bengkel || '—'}
                    </td>
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
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus"
                        >
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingItem ? 'Edit Catatan Servis' : 'Catat Servis & Perbaikan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Aset</label>
                <select
                  value={formData.id_aset}
                  onChange={e => setFormData({ ...formData, id_aset: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white"
                >
                  {asets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nama_aset} {a.kode_aset ? `(${a.kode_aset})` : ''} - {a.ruangan?.nama_ruangan || 'Tanpa Ruang'}
                    </option>
                  ))}
                </select>
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

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
        </div>
      )}
    </div>
  );
}
