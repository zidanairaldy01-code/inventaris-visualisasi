'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { Search, History as HistoryIcon, TrendingUp, TrendingDown, Package, AlertCircle, Calendar } from 'lucide-react';

interface Aset {
  id: number;
  kode_aset: string;
  nama_aset: string;
  kategori?: { nama_kategori: string };
  ruangan?: { nama_ruangan: string };
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface History {
  id: number;
  id_aset: number;
  id_user?: number;
  aksi: string;
  keterangan: string;
  tanggal: string;
  created_at: string;
  aset?: Aset;
  user?: User;
}

export default function HistoryPage() {
  const [histories, setHistories] = useState<History[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAksi, setFilterAksi] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistories();
  }, []);

  const fetchHistories = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/histories');
      setHistories(res.data);
    } catch (error) {
      console.error('Failed to fetch histories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter histories
  const filteredHistories = histories.filter(history => {
    const matchSearch = 
      history.aset?.nama_aset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      history.aset?.kode_aset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      history.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      history.aksi.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchAksi = filterAksi === '' || history.aksi === filterAksi;
    
    return matchSearch && matchAksi;
  });

  // Get unique aksi for filter
  const uniqueAksi = Array.from(new Set(histories.map(h => h.aksi)));

  // Count by aksi
  const countByAksi = histories.reduce((acc, h) => {
    acc[h.aksi] = (acc[h.aksi] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getAksiIcon = (aksi: string) => {
    switch (aksi) {
      case 'PENAMBAHAN':
      case 'PENGEMBALIAN':
      case 'SELESAI SERVIS':
        return <TrendingUp className="h-5 w-5 text-emerald-600" />;
      case 'PEMINJAMAN':
      case 'SERVIS':
        return <TrendingDown className="h-5 w-5 text-orange-600" />;
      case 'MUTASI':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'UBAH KONDISI':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'PENGHAPUSAN':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <HistoryIcon className="h-5 w-5 text-slate-600" />;
    }
  };

  const getAksiBadgeColor = (aksi: string) => {
    switch (aksi) {
      case 'PENAMBAHAN':
      case 'PENGEMBALIAN':
      case 'SELESAI SERVIS':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'PEMINJAMAN':
      case 'SERVIS':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'MUTASI':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'UBAH KONDISI':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'PENGHAPUSAN':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-lg p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-lg">
            <HistoryIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Riwayat/History Aset</h1>
            <p className="text-indigo-100 text-sm mt-1">Lacak semua pergerakan dan perubahan aset</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <HistoryIcon className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">{histories.length}</p>
          <p className="text-sm text-slate-600">Total Riwayat</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">
            {(countByAksi['PENAMBAHAN'] || 0) + (countByAksi['PENGEMBALIAN'] || 0) + (countByAksi['SELESAI SERVIS'] || 0)}
          </p>
          <p className="text-sm text-slate-600">Barang Masuk</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">
            {(countByAksi['PEMINJAMAN'] || 0) + (countByAksi['SERVIS'] || 0)}
          </p>
          <p className="text-sm text-slate-600">Barang Keluar</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mb-1">
            {(countByAksi['MUTASI'] || 0) + (countByAksi['UBAH KONDISI'] || 0)}
          </p>
          <p className="text-sm text-slate-600">Perubahan</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari aset, aksi, atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
            />
          </div>

          {/* Filter Aksi */}
          <div>
            <select
              value={filterAksi}
              onChange={(e) => setFilterAksi(e.target.value)}
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Aksi</option>
              {uniqueAksi.map(aksi => (
                <option key={aksi} value={aksi}>{aksi} ({countByAksi[aksi]})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* History Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-md">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Timeline Riwayat</h2>
          <p className="text-sm text-slate-600 mt-1">
            Menampilkan {filteredHistories.length} dari {histories.length} riwayat
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredHistories.length === 0 ? (
            <div className="text-center py-12">
              <HistoryIcon className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">
                {searchQuery || filterAksi ? 'Tidak ada riwayat yang sesuai dengan filter' : 'Belum ada riwayat'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistories.map((history) => (
                <div
                  key={history.id}
                  className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                      {getAksiIcon(history.aksi)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getAksiBadgeColor(history.aksi)}`}>
                            {history.aksi}
                          </span>
                          <span className="text-sm text-slate-600 font-mono">
                            {history.aset?.kode_aset}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 mb-1">
                          {history.aset?.nama_aset}
                        </h3>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {history.keterangan}
                        </p>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(history.tanggal)}</span>
                      </div>
                      {history.user && (
                        <div className="flex items-center gap-1">
                          <span>oleh</span>
                          <span className="font-medium text-slate-700">{history.user.name}</span>
                        </div>
                      )}
                      {history.aset?.ruangan && (
                        <div className="flex items-center gap-1">
                          <span>di</span>
                          <span className="font-medium text-slate-700">{history.aset.ruangan.nama_ruangan}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
