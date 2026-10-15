'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  Wrench, Search, RefreshCw, DollarSign, CheckCircle2,
  Clock, X, Loader2, Camera, ImageOff, ZoomIn,
  ThumbsUp, ThumbsDown, AlertTriangle, ShieldCheck, Ban, FileWarning
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
  ruangan?: { nama_ruangan: string; gedung?: { nama_gedung: string } };
  approved_by_wakasek?: { nama_lengkap: string };
  sarana_prasarana?: { id: number; kode: string; nama_barang: string; kondisi: string };
  aset?: { id: number; kode_aset: string; nama_aset: string };
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  'Menunggu Persetujuan': { label: 'Menunggu ACC',    cls: 'bg-amber-50 text-amber-700 border-amber-200',     icon: <Clock className="h-3 w-3" /> },
  'Proses':              { label: 'Sedang Diservis', cls: 'bg-blue-50 text-blue-700 border-blue-200',         icon: <Wrench className="h-3 w-3" /> },
  'Selesai':             { label: 'Selesai',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  'Batal':               { label: 'Batal',            cls: 'bg-slate-100 text-slate-500 border-slate-200',     icon: <Ban className="h-3 w-3" /> },
  'Ditolak':             { label: 'Ditolak',          cls: 'bg-red-50 text-red-700 border-red-200',            icon: <X className="h-3 w-3" /> },
};

export default function WakasekServisPage() {
  const [servises, setServises] = useState<ServisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Menunggu Persetujuan');
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Modal ACC
  const [accModal, setAccModal] = useState<{ item: ServisItem } | null>(null);
  const [tolakModal, setTolakModal] = useState<{ item: ServisItem } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [accForm, setAccForm] = useState({ biaya_servis: '', teknisi_bengkel: '', catatan_wakasek: '' });
  const [tolakForm, setTolakForm] = useState({ catatan_wakasek: '' });

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await axios.get('/api/servises');
      setServises(res.data || []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accModal) return;
    if (!accForm.biaya_servis) { alert('Masukkan estimasi biaya servis.'); return; }
    setSubmitting(true);
    try {
      await axios.post(`/api/servises/${accModal.item.id}/acc`, {
        biaya_servis: Number(accForm.biaya_servis),
        teknisi_bengkel: accForm.teknisi_bengkel || null,
        catatan_wakasek: accForm.catatan_wakasek || null,
      });
      setAccModal(null);
      setAccForm({ biaya_servis: '', teknisi_bengkel: '', catatan_wakasek: '' });
      fetchData(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyetujui servis.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTolak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tolakModal) return;
    if (!tolakForm.catatan_wakasek) { alert('Alasan penolakan wajib diisi.'); return; }
    setSubmitting(true);
    try {
      await axios.post(`/api/servises/${tolakModal.item.id}/tolak`, {
        catatan_wakasek: tolakForm.catatan_wakasek,
      });
      setTolakModal(null);
      setTolakForm({ catatan_wakasek: '' });
      fetchData(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menolak pengajuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = servises.filter(s => {
    const q = search.toLowerCase();
    const namaBarang = (s.sarana_prasarana?.nama_barang || s.aset?.nama_aset || '').toLowerCase();
    const matchSearch = s.jenis_perbaikan.toLowerCase().includes(q) || namaBarang.includes(q) || (s.pelapor?.nama_lengkap?.toLowerCase().includes(q) ?? false);
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalMenunggu = servises.filter(s => s.status === 'Menunggu Persetujuan').length;
  const totalProses = servises.filter(s => s.status === 'Proses').length;
  const totalSelesai = servises.filter(s => s.status === 'Selesai').length;
  const totalBiayaProses = servises.filter(s => s.status === 'Proses').reduce((sum, s) => sum + Number(s.biaya_servis || 0), 0);

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white" onClick={() => setLightboxUrl(null)}>
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxUrl} alt="Foto Kerusakan" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shadow-sm shadow-violet-500/20 shrink-0">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            Persetujuan Servis Aset
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-11">
            Tinjau pengajuan kerusakan dari Wakapro — ACC dan tentukan anggaran, atau tolak jika tidak sesuai
          </p>
        </div>
        <button onClick={() => fetchData(true)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors self-start sm:self-auto" title="Muat Ulang">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Alert Menunggu */}
      {totalMenunggu > 0 && (
        <div className="bg-linear-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 animate-bounce">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800">{totalMenunggu} Pengajuan Servis Menunggu Persetujuan Anda</p>
            <p className="text-xs text-amber-600 mt-0.5">Wakapro menunggu ACC anggaran dari Anda agar proses servis dapat dimulai.</p>
          </div>
          <button onClick={() => setStatusFilter('Menunggu Persetujuan')} className="ml-auto px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors shrink-0">
            Tinjau Sekarang
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 cursor-pointer hover:border-amber-400 transition-colors" onClick={() => setStatusFilter('Menunggu Persetujuan')}>
          <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-amber-600" /><p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Menunggu ACC</p></div>
          <p className="text-3xl font-extrabold text-amber-800">{totalMenunggu}</p>
          <p className="text-xs text-amber-600 mt-1">Klik untuk filter</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setStatusFilter('Proses')}>
          <div className="flex items-center gap-2 mb-2"><Wrench className="h-4 w-4 text-blue-600" /><p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Sedang Diservis</p></div>
          <p className="text-3xl font-extrabold text-blue-800">{totalProses}</p>
          <p className="text-xs text-blue-600 mt-1">Menunggu selesai</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 cursor-pointer hover:border-emerald-400 transition-colors" onClick={() => setStatusFilter('Selesai')}>
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Selesai</p></div>
          <p className="text-3xl font-extrabold text-emerald-800">{totalSelesai}</p>
          <p className="text-xs text-emerald-600 mt-1">Sudah diverifikasi Admin</p>
        </div>
        <div className="bg-linear-to-br from-violet-500 to-purple-600 rounded-2xl p-4 text-white shadow-sm shadow-violet-500/20">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-violet-100" /><p className="text-xs font-semibold text-violet-100 uppercase tracking-wider">Anggaran Proses</p></div>
          <p className="text-lg font-extrabold leading-tight">{formatRupiah(totalBiayaProses)}</p>
          <p className="text-[11px] text-violet-100 mt-1">Total anggaran yang disetujui</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang, Wakapro, jenis perbaikan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="Menunggu Persetujuan">Menunggu ACC</option>
              <option value="Proses">Sedang Diservis</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditolak">Ditolak</option>
            </select>
            <span className="text-xs text-slate-400 px-2.5 py-1 bg-slate-100 rounded-lg font-medium">{filtered.length} laporan</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-widest">
                <th className="px-4 py-3.5 font-semibold">#</th>
                <th className="px-4 py-3.5 font-semibold">Barang & Workshop</th>
                <th className="px-4 py-3.5 font-semibold">Kerusakan & Perbaikan</th>
                <th className="px-4 py-3.5 font-semibold text-center">Foto</th>
                <th className="px-4 py-3.5 font-semibold">Pelapor (Wakapro)</th>
                <th className="px-4 py-3.5 font-semibold text-right">Biaya Servis</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold text-center">Aksi Wakasek</th>
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
                    <p className="font-semibold text-slate-500 text-sm">
                      {statusFilter === 'Menunggu Persetujuan' ? 'Tidak ada pengajuan yang menunggu ACC' : 'Tidak ada data servis'}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">Laporan kerusakan dari Wakapro akan muncul di sini.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const namaBarang = item.sarana_prasarana?.nama_barang || item.aset?.nama_aset || '—';
                  const kodeBarang = item.sarana_prasarana?.kode || item.aset?.kode_aset || '-';
                  const statusCfg = STATUS_CONFIG[item.status] || { label: item.status, cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: null };
                  const canAcc = item.status === 'Menunggu Persetujuan';

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors group ${canAcc ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-slate-800">{namaBarang}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{kodeBarang}</p>
                        {item.ruangan && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.ruangan.nama_ruangan}</p>
                        )}
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.tanggal_servis}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-slate-700">{item.jenis_perbaikan}</p>
                        {item.deskripsi_kerusakan && (
                          <p className="text-xs text-slate-400 italic mt-0.5 line-clamp-2">{item.deskripsi_kerusakan}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {item.foto_kerusakan_url ? (
                          <button onClick={() => setLightboxUrl(item.foto_kerusakan_url!)} className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-violet-400 transition group/img mx-auto block">
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
                          <span className="text-sm font-semibold text-slate-800">{item.pelapor?.nama_lengkap || '—'}</span>
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
                        {item.approved_by_wakasek && !canAcc && (
                          <p className="text-[11px] text-violet-600 mt-1 font-medium">
                            ✓ ACC: {item.approved_by_wakasek.nama_lengkap}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {canAcc ? (
                          <span className="text-xs text-amber-500 font-semibold italic">Belum ditentukan</span>
                        ) : (
                          <span className="font-bold text-violet-700 text-sm">{formatRupiah(Number(item.biaya_servis))}</span>
                        )}
                        {item.teknisi_bengkel && !canAcc && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.teknisi_bengkel}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusCfg.cls}`}>
                          {statusCfg.icon}{statusCfg.label}
                        </span>
                        {item.catatan_wakasek && (
                          <p className="text-[11px] text-slate-400 mt-1 italic line-clamp-2">
                            <span className="font-semibold text-slate-500">Catatan:</span> {item.catatan_wakasek}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {canAcc ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setAccModal({ item }); setAccForm({ biaya_servis: '', teknisi_bengkel: '', catatan_wakasek: '' }); }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                            >
                              <ThumbsUp className="h-3 w-3" /> ACC
                            </button>
                            <button
                              onClick={() => { setTolakModal({ item }); setTolakForm({ catatan_wakasek: '' }); }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-colors border border-red-200"
                            >
                              <ThumbsDown className="h-3 w-3" /> Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-300 italic">
                            {item.status === 'Selesai' ? '✓ Diverifikasi Admin' : item.status === 'Proses' ? 'Menunggu Admin' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ACC */}
      {accModal && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setAccModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-emerald-100 bg-linear-to-r from-emerald-50 to-teal-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-emerald-600" />
                  Setujui Pengajuan Servis
                </h3>
                <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                  {accModal.item.sarana_prasarana?.nama_barang || accModal.item.aset?.nama_aset}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Kerusakan: {accModal.item.jenis_perbaikan}</p>
              </div>
              <button onClick={() => !submitting && setAccModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAcc} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimasi Biaya Servis (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Contoh: 500000"
                  value={accForm.biaya_servis}
                  onChange={e => setAccForm({ ...accForm, biaya_servis: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">Anggaran yang Anda setujui untuk perbaikan aset ini.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Teknisi / Bengkel (Opsional)</label>
                <input
                  type="text"
                  placeholder="Nama teknisi atau bengkel yang akan mengerjakan"
                  value={accForm.teknisi_bengkel}
                  onChange={e => setAccForm({ ...accForm, teknisi_bengkel: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan untuk Wakapro & Admin (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Instruksi tambahan atau catatan persetujuan..."
                  value={accForm.catatan_wakasek}
                  onChange={e => setAccForm({ ...accForm, catatan_wakasek: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white resize-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => !submitting && setAccModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="flex items-center px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50">
                  {submitting && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />}
                  <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />
                  ACC & Mulai Servis
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Tolak */}
      {tolakModal && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setTolakModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-red-100 bg-linear-to-r from-red-50 to-rose-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                  Tolak Pengajuan Servis
                </h3>
                <p className="text-xs text-red-700 mt-0.5 font-medium">
                  {tolakModal.item.sarana_prasarana?.nama_barang || tolakModal.item.aset?.nama_aset}
                </p>
              </div>
              <button onClick={() => !submitting && setTolakModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleTolak} className="p-5 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                <strong>Perhatian:</strong> Pengajuan ditolak akan dikembalikan ke Wakapro dengan alasan. Wakapro dapat mengajukan ulang jika diperlukan.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan alasan penolakan kepada Wakapro..."
                  value={tolakForm.catatan_wakasek}
                  onChange={e => setTolakForm({ catatan_wakasek: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 focus:bg-white resize-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => !submitting && setTolakModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Batal</button>
                <button type="submit" disabled={submitting} className="flex items-center px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50">
                  {submitting && <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />}
                  <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
                  Tolak Pengajuan
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
