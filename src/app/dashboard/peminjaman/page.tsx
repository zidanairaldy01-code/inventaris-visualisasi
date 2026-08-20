'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { Handshake, Plus, Search, RefreshCw, CheckCircle2, Clock, X, Trash2, Edit2, Loader2, RotateCcw, User, Laptop } from 'lucide-react';

interface Aset {
  id: number;
  kode_aset: string | null;
  nama_aset: string;
  jumlah: number;
  satuan: string;
  ruangan?: { nama_ruangan: string };
}

interface PeminjamanItem {
  id: number;
  id_aset: number;
  nama_peminjam: string;
  role_peminjam: string;
  jumlah: number;
  tanggal_pinjam: string;
  tanggal_kembali_rencana: string | null;
  tanggal_kembali_aktual: string | null;
  keperluan: string | null;
  status: 'Dipinjam' | 'Dikembalikan' | 'Terlambat';
  aset?: Aset;
}

export default function PeminjamanPage() {
  const [peminjamans, setPeminjamans] = useState<PeminjamanItem[]>([]);
  const [asets, setAsets] = useState<Aset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PeminjamanItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [returningId, setReturningId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    id_aset: '',
    nama_peminjam: '',
    role_peminjam: 'Guru',
    jumlah: '1',
    tanggal_pinjam: new Date().toISOString().split('T')[0],
    tanggal_kembali_rencana: '',
    keperluan: '',
    status: 'Dipinjam',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [peminjamanRes, asetRes] = await Promise.all([
        axios.get('/api/peminjamans'),
        axios.get('/api/asets'),
      ]);
      setPeminjamans(peminjamanRes.data);
      setAsets(asetRes.data);
    } catch (err) {
      console.error('Failed to fetch peminjaman data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      id_aset: asets[0]?.id ? String(asets[0].id) : '',
      nama_peminjam: '',
      role_peminjam: 'Guru',
      jumlah: '1',
      tanggal_pinjam: new Date().toISOString().split('T')[0],
      tanggal_kembali_rencana: '',
      keperluan: '',
      status: 'Dipinjam',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: PeminjamanItem) => {
    setEditingItem(item);
    setFormData({
      id_aset: String(item.id_aset),
      nama_peminjam: item.nama_peminjam,
      role_peminjam: item.role_peminjam,
      jumlah: String(item.jumlah),
      tanggal_pinjam: item.tanggal_pinjam,
      tanggal_kembali_rencana: item.tanggal_kembali_rencana || '',
      keperluan: item.keperluan || '',
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
        nama_peminjam: formData.nama_peminjam,
        role_peminjam: formData.role_peminjam,
        jumlah: Number(formData.jumlah),
        tanggal_pinjam: formData.tanggal_pinjam,
        tanggal_kembali_rencana: formData.tanggal_kembali_rencana || null,
        keperluan: formData.keperluan || null,
        status: formData.status,
      };

      if (editingItem) {
        await axios.put(`/api/peminjamans/${editingItem.id}`, payload);
      } else {
        await axios.post('/api/peminjamans', payload);
      }
      setIsModalOpen(false);
      fetchData(true);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data peminjaman.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (id: number) => {
    if (!confirm('Tandai peminjaman ini sebagai SUDAH DIKEMBALIKAN?')) return;
    setReturningId(id);
    try {
      await axios.put(`/api/peminjamans/${id}`, {
        status: 'Dikembalikan',
        tanggal_kembali_aktual: new Date().toISOString().split('T')[0],
      });
      fetchData(true);
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui status peminjaman.');
    } finally {
      setReturningId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data peminjaman ini?')) return;
    try {
      await axios.delete(`/api/peminjamans/${id}`);
      fetchData(true);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus data.');
    }
  };

  const filtered = peminjamans.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      p.nama_peminjam.toLowerCase().includes(q) ||
      p.aset?.nama_aset.toLowerCase().includes(q) ||
      p.role_peminjam.toLowerCase().includes(q) ||
      p.keperluan?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalDipinjam = peminjamans.filter(p => p.status === 'Dipinjam').length;
  const totalDikembalikan = peminjamans.filter(p => p.status === 'Dikembalikan').length;

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-sm shadow-indigo-500/20 flex-shrink-0">
              <Handshake className="h-4 w-4 text-white" />
            </div>
            Peminjaman Aset (Laptop, Kamera, Dll)
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-11">
            Pencatatan dan pemantauan barang sekolah yang dipinjam oleh Guru, Siswa, maupun Staf
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
            className="flex items-center px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Catat Peminjaman
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-5 text-white shadow-sm shadow-indigo-500/20">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-indigo-100" />
            <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">Sedang Dipinjam</p>
          </div>
          <p className="text-3xl font-extrabold">{totalDipinjam} <span className="text-sm font-normal text-indigo-100">transaksi</span></p>
          <p className="text-xs text-indigo-100 mt-1">Barang berada di luar ruangan</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sudah Dikembalikan</p>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{totalDikembalikan} <span className="text-sm font-normal text-slate-400">transaksi</span></p>
          <p className="text-xs text-slate-400 mt-1">Aset aman tersimpan</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Laptop className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Riwayat Pinjam</p>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{peminjamans.length} <span className="text-sm font-normal text-slate-400">kali</span></p>
          <p className="text-xs text-slate-400 mt-1">Keseluruhan peminjaman</p>
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
              placeholder="Cari peminjam, barang, keperluan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="Dipinjam">Status: Dipinjam</option>
              <option value="Dikembalikan">Status: Dikembalikan</option>
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
                <th className="px-4 py-3.5 font-semibold">Nama Peminjam</th>
                <th className="px-4 py-3.5 font-semibold">Aset yang Dipinjam</th>
                <th className="px-4 py-3.5 font-semibold">Keperluan</th>
                <th className="px-4 py-3.5 font-semibold">Tgl Pinjam</th>
                <th className="px-4 py-3.5 font-semibold">Rencana Kembali</th>
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
                      <Handshake className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-500 text-sm">Belum ada catatan peminjaman</p>
                    <p className="text-slate-400 text-xs mt-1">Klik "+ Catat Peminjaman" untuk mencatat peminjaman barang.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3.5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-slate-800 flex items-center">
                        <User className="h-3.5 w-3.5 text-slate-400 mr-1.5" />
                        {item.nama_peminjam}
                      </p>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {item.role_peminjam}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-indigo-900">{item.aset?.nama_aset || 'Aset Dihapus'}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.jumlah} {item.aset?.satuan || 'Unit'} · {item.aset?.ruangan?.nama_ruangan || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 max-w-xs truncate">
                      {item.keperluan || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">{item.tanggal_pinjam}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                      {item.tanggal_kembali_rencana || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        item.status === 'Dikembalikan'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {item.status === 'Dipinjam' && (
                          <button
                            onClick={() => handleReturn(item.id)}
                            disabled={returningId === item.id}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all disabled:opacity-50"
                          >
                            {returningId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <RotateCcw className="h-3 w-3 mr-1" />
                            )}
                            Kembalikan
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
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
                {editingItem ? 'Edit Peminjaman' : 'Catat Peminjaman Aset Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Aset yang Dipinjam</label>
                <select
                  value={formData.id_aset}
                  onChange={e => setFormData({ ...formData, id_aset: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
                >
                  {asets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.nama_aset} {a.kode_aset ? `(${a.kode_aset})` : ''} - Stok: {a.jumlah} {a.satuan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Peminjam</label>
                  <input
                    type="text"
                    placeholder="Misal: Pak Ahmad / Budi (XII TKJ 1)"
                    value={formData.nama_peminjam}
                    onChange={e => setFormData({ ...formData, nama_peminjam: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status Peminjam</label>
                  <select
                    value={formData.role_peminjam}
                    onChange={e => setFormData({ ...formData, role_peminjam: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
                  >
                    <option value="Guru">Guru</option>
                    <option value="Siswa">Siswa</option>
                    <option value="Staf">Staf</option>
                    <option value="Eksternal">Eksternal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Unit</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.jumlah}
                    onChange={e => setFormData({ ...formData, jumlah: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pinjam</label>
                  <input
                    type="date"
                    value={formData.tanggal_pinjam}
                    onChange={e => setFormData({ ...formData, tanggal_pinjam: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rencana Kembali</label>
                  <input
                    type="date"
                    value={formData.tanggal_kembali_rencana}
                    onChange={e => setFormData({ ...formData, tanggal_kembali_rencana: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keperluan / Tujuan Peminjaman</label>
                <textarea
                  rows={2}
                  placeholder="Misal: Praktik Pembelajaran Komputer di Kelas..."
                  value={formData.keperluan}
                  onChange={e => setFormData({ ...formData, keperluan: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status Peminjaman</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
                >
                  <option value="Dipinjam">Dipinjam</option>
                  <option value="Dikembalikan">Dikembalikan</option>
                </select>
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
                  className="flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />}
                  {editingItem ? 'Simpan Perubahan' : 'Simpan Peminjaman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
