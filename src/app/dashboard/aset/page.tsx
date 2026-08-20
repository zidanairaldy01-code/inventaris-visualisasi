'use client';

import { useState, useEffect, useRef } from 'react';
import axios from '@/lib/axios';
import { Package, Upload, AlertCircle, CheckCircle2, Search, RefreshCw, FileSpreadsheet, Plus, ArrowUpRight, DollarSign, Layers, TrendingUp, Camera } from 'lucide-react';
import AsetFotoModal from '@/components/AsetFotoModal';

interface Aset {
  id: number;
  kode_aset: string | null;
  nama_aset: string;
  jumlah: number;
  satuan: string;
  harga_perolehan: number | null;
  kategori?: { nama_kategori: string };
  ruangan?: { nama_ruangan: string };
  kondisi?: { nama_kondisi: string };
}

const kondisiStyle = (kondisi?: string) => {
  const k = kondisi?.toLowerCase();
  if (k === 'baik') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (k?.includes('rusak berat')) return 'bg-rose-50 text-rose-700 border border-rose-200';
  if (k?.includes('rusak')) return 'bg-red-50 text-red-700 border border-red-200';
  return 'bg-amber-50 text-amber-700 border border-amber-200';
};

const formatRupiah = (n: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
};

const formatRupiahShort = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`;
  return `Rp ${(n / 1_000).toFixed(0)} Rb`;
};

export default function AsetPage() {
  const [asets, setAsets] = useState<Aset[]>([]);
  const [filtered, setFiltered] = useState<Aset[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAset, setSelectedAset] = useState<Aset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchAsets(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(asets.filter(a =>
      a.nama_aset.toLowerCase().includes(q) ||
      (a.kode_aset?.toLowerCase().includes(q)) ||
      a.kategori?.nama_kategori.toLowerCase().includes(q) ||
      a.ruangan?.nama_ruangan.toLowerCase().includes(q)
    ));
  }, [search, asets]);

  const fetchAsets = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const response = await axios.get('/api/asets');
      setAsets(response.data);
      setFiltered(response.data);
    } catch (error) {
      console.error('Failed to fetch asets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    setMessage(null);
    try {
      const response = await axios.post('/api/asets/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage({ type: 'success', text: `Berhasil mengimport ${response.data.imported} aset. Gagal: ${response.data.failed}` });
      fetchAsets(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Terjadi kesalahan saat import.' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Kalkulasi summary dari data yang difilter
  const totalNilai = filtered.reduce((s, a) => s + ((a.jumlah ?? 1) * (a.harga_perolehan ?? 0)), 0);
  const totalUnit = filtered.reduce((s, a) => s + (a.jumlah ?? 0), 0);

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mr-3 shadow-sm shadow-blue-500/20 flex-shrink-0">
              <Package className="h-4 w-4 text-white" />
            </div>
            Data Aset
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-11">Total <span className="font-semibold text-slate-600">{asets.length}</span> jenis aset terdaftar</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={handleImport} />
          <button onClick={() => fetchAsets(true)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shadow-sm">
            {importing ? (
              <span className="flex items-center"><div className="animate-spin mr-2 h-3.5 w-3.5 border-2 border-slate-500 border-t-transparent rounded-full" /> Mengimport...</span>
            ) : (
              <><FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />Import Excel</>
            )}
          </button>
          <button className="flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-blue-500/20">
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Aset
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-sm shadow-blue-500/20">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-4 w-4 text-blue-200" />
            <p className="text-xs font-semibold text-blue-200">Total Nilai Aset</p>
          </div>
          <p className="text-xl font-extrabold">{formatRupiahShort(totalNilai)}</p>
          <p className="text-[11px] text-blue-200 mt-0.5">Dari {filtered.length} jenis yang tampil</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <Layers className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold text-slate-400">Total Unit</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{totalUnit.toLocaleString('id-ID')}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Dari {filtered.length} jenis aset</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-slate-400">Rata-rata Harga</p>
          </div>
          <p className="text-xl font-extrabold text-slate-900">
            {filtered.length > 0 ? formatRupiahShort(totalNilai / filtered.length) : 'Rp 0'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Per jenis aset</p>
        </div>
      </div>

      {/* Notification */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-center border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 mr-3 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />}
          <p className="font-medium text-sm flex-1">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-3 opacity-50 hover:opacity-100 text-lg leading-none">×</button>
        </div>
      )}

      {/* Import Guide */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-white/10 rounded-xl flex-shrink-0 mt-0.5">
              <FileSpreadsheet className="h-4 w-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">Format Import Excel</h4>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['Nama Aset', 'Kategori', 'Ruangan', 'Kondisi', 'Jumlah', 'Satuan', 'Harga Perolehan', 'Kode Aset*'].map(col => (
                  <span key={col} className="px-2 py-0.5 bg-white/15 text-white text-[11px] font-medium rounded-md border border-white/20">{col}</span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center px-4 py-2 bg-white text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm flex-shrink-0">
            <Upload className="h-3.5 w-3.5 mr-2" /> Upload File
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input type="text" placeholder="Cari nama, kode, kategori..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all" />
          </div>
          <span className="text-xs text-slate-400 px-2.5 py-1 bg-slate-100 rounded-lg font-medium">{filtered.length} dari {asets.length} data</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-widest">
                <th className="px-4 py-3.5 font-semibold">#</th>
                <th className="px-4 py-3.5 font-semibold">Kode</th>
                <th className="px-4 py-3.5 font-semibold">Nama Aset</th>
                <th className="px-4 py-3.5 font-semibold">Kategori</th>
                <th className="px-4 py-3.5 font-semibold">Ruangan</th>
                <th className="px-4 py-3.5 font-semibold">Kondisi</th>
                <th className="px-4 py-3.5 font-semibold text-right">Jumlah</th>
                <th className="px-4 py-3.5 font-semibold text-right">Harga Satuan</th>
                <th className="px-4 py-3.5 font-semibold text-right">Total Nilai</th>
                <th className="px-4 py-3.5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td className="px-4 py-4" colSpan={10}><div className="skeleton h-5 rounded-lg w-full" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Package className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-500 text-sm">Tidak ada data aset</p>
                    <p className="text-slate-400 text-xs mt-1">{search ? 'Ubah kata kunci pencarian.' : 'Tambah aset atau import dari Excel.'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((aset, idx) => {
                  const nilaiTotal = (aset.jumlah ?? 1) * (aset.harga_perolehan ?? 0);
                  return (
                    <tr key={aset.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        {aset.kode_aset
                          ? <span className="font-mono text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">{aset.kode_aset}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5"><span className="text-sm font-semibold text-slate-800">{aset.nama_aset}</span></td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium border border-indigo-100">
                          {aset.kategori?.nama_kategori || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{aset.ruangan?.nama_ruangan || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${kondisiStyle(aset.kondisi?.nama_kondisi)}`}>
                          {aset.kondisi?.nama_kondisi || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-bold text-slate-800 text-sm">{aset.jumlah}</span>
                        <span className="text-slate-400 ml-1 text-xs">{aset.satuan}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-slate-500 font-medium">
                        {aset.harga_perolehan ? formatRupiah(aset.harga_perolehan) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`text-xs font-bold ${nilaiTotal > 0 ? 'text-blue-700' : 'text-slate-300'}`}>
                          {nilaiTotal > 0 ? formatRupiahShort(nilaiTotal) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedAset(aset)}
                          className="opacity-0 group-hover:opacity-100 inline-flex items-center px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-all"
                        >
                          <Camera className="h-3 w-3 mr-1" /> Foto
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Footer Total */}
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={6} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Total (ditampilkan)</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-slate-800">{totalUnit.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400 font-medium">—</td>
                  <td className="px-4 py-3 text-right text-sm font-extrabold text-blue-700">{formatRupiahShort(totalNilai)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Foto Modal */}
      {selectedAset && (
        <AsetFotoModal
          aset={selectedAset}
          onClose={() => setSelectedAset(null)}
          onUpdate={() => fetchAsets(true)}
        />
      )}
    </div>
  );
}
