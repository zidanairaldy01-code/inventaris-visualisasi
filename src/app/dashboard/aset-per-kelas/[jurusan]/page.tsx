'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from '@/lib/axios';
import { Search, Download, Package, TrendingUp, AlertCircle, Users, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Jurusan {
  id: number;
  kode_jurusan: string;
  nama_jurusan: string;
  deskripsi?: string;
}

interface Kelas {
  id: number;
  id_jurusan: number;
  tingkat: 'X' | 'XI' | 'XII';
  nama_kelas: string;
  tahun_ajaran?: string;
  wali_kelas?: string;
  jumlah_siswa?: number;
}

interface Aset {
  id: number;
  kode_aset: string;
  nama_aset: string;
  merek?: string;
  jumlah: number;
  satuan?: string;
  harga_perolehan: number;
  status_aset?: string;
  kategori?: { nama_kategori: string };
  kondisi?: { nama_kondisi: string };
  ruangan?: {
    nama_ruangan: string;
    kelas?: Kelas;
  };
  sumberDana?: { nama_sumber: string };
}

interface Summary {
  total_aset: number;
  total_nilai: number;
  rata_rata_harga: number;
  aset_dipinjam: number;
  by_kondisi: Record<string, number>;
  by_kategori: Record<string, { total_aset: number; total_nilai: number }>;
}

export default function AsetPerKelasPage() {
  const params = useParams();
  const jurusanKode = (params.jurusan as string)?.toUpperCase();

  const [jurusan, setJurusan] = useState<Jurusan | null>(null);
  const [selectedTingkat, setSelectedTingkat] = useState<'X' | 'XI' | 'XII' | ''>('');
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<number | ''>('');
  const [asets, setAsets] = useState<Aset[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch jurusan data
  useEffect(() => {
    if (jurusanKode) {
      axios.get(`/api/jurusans/kode/${jurusanKode}`)
        .then(res => {
          if (res.data.status === 'success') {
            setJurusan(res.data.data);
          }
        })
        .catch(err => console.error('Failed to fetch jurusan:', err));
    }
  }, [jurusanKode]);

  // Fetch kelas when tingkat is selected
  useEffect(() => {
    if (jurusan && selectedTingkat) {
      axios.get(`/api/jurusans/${jurusan.id}/kelas/${selectedTingkat}`)
        .then(res => {
          if (res.data.status === 'success') {
            setKelasList(res.data.data);
            setSelectedKelas(''); // Reset selected kelas
            setAsets([]); // Reset asets
            setSummary(null); // Reset summary
          }
        })
        .catch(err => console.error('Failed to fetch kelas:', err));
    }
  }, [jurusan, selectedTingkat]);

  // Fetch aset when kelas is selected
  useEffect(() => {
    if (selectedKelas) {
      setLoading(true);
      
      // Fetch aset
      axios.get(`/api/aset-per-kelas/${selectedKelas}`)
        .then(res => {
          if (res.data.status === 'success') {
            setAsets(res.data.data.asets);
          }
        })
        .catch(err => console.error('Failed to fetch asets:', err))
        .finally(() => setLoading(false));

      // Fetch summary
      axios.get(`/api/aset-per-kelas/summary/kelas/${selectedKelas}`)
        .then(res => {
          if (res.data.status === 'success') {
            setSummary(res.data.data.summary);
          }
        })
        .catch(err => console.error('Failed to fetch summary:', err));
    }
  }, [selectedKelas]);

  // Filter asets by search query
  const filteredAsets = asets.filter(aset =>
    aset.nama_aset.toLowerCase().includes(searchQuery.toLowerCase()) ||
    aset.kode_aset.toLowerCase().includes(searchQuery.toLowerCase()) ||
    aset.kategori?.nama_kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Export to Excel
  const handleExport = () => {
    if (filteredAsets.length === 0) return;

    const selectedKelasData = kelasList.find(k => k.id === selectedKelas);
    
    const data = filteredAsets.map(aset => ({
      'Kode Aset': aset.kode_aset,
      'Nama Aset': aset.nama_aset,
      'Merek': aset.merek || '-',
      'Kategori': aset.kategori?.nama_kategori || '-',
      'Jumlah': aset.jumlah,
      'Satuan': aset.satuan || '-',
      'Harga': aset.harga_perolehan,
      'Kondisi': aset.kondisi?.nama_kondisi || '-',
      'Sumber Dana': aset.sumberDana?.nama_sumber || '-',
      'Ruangan': aset.ruangan?.nama_ruangan || '-',
      'Status': aset.status_aset || 'Tersedia'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Aset');
    XLSX.writeFile(wb, `Aset_${jurusan?.kode_jurusan}_${selectedKelasData?.nama_kelas}.xlsx`);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  if (!jurusan) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center text-sm text-slate-400 mb-3">
          <span>Dashboard</span>
          <span className="mx-2">/</span>
          <span>Data Aset Per Kelas</span>
          <span className="mx-2">/</span>
          <span className="text-white">{jurusan.kode_jurusan}</span>
        </div>
        
        {/* Title & Description Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg p-5 shadow-lg">
          <h1 className="text-3xl font-bold text-white mb-2">
            Data Aset Per Kelas - {jurusan.nama_jurusan}
          </h1>
          {jurusan.deskripsi && (
            <p className="text-blue-50 text-sm leading-relaxed">{jurusan.deskripsi}</p>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-white mb-4">Filter Data Aset</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tingkat Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pilih Tingkat
            </label>
            <div className="relative">
              <select
                value={selectedTingkat}
                onChange={(e) => setSelectedTingkat(e.target.value as 'X' | 'XI' | 'XII')}
                className="w-full bg-white text-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="" className="bg-white text-slate-900">-- Pilih Tingkat --</option>
                <option value="X" className="bg-white text-slate-900">Kelas X</option>
                <option value="XI" className="bg-white text-slate-900">Kelas XI</option>
                <option value="XII" className="bg-white text-slate-900">Kelas XII</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 pointer-events-none" />
            </div>
          </div>

          {/* Kelas Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pilih Kelas
            </label>
            <div className="relative">
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(Number(e.target.value))}
                disabled={!selectedTingkat || kelasList.length === 0}
                className="w-full bg-white text-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <option value="" className="bg-white text-slate-900">-- Pilih Kelas --</option>
                {kelasList.map(kelas => (
                  <option key={kelas.id} value={kelas.id} className="bg-white text-slate-900">
                    {kelas.nama_kelas}
                    {kelas.wali_kelas && ` - ${kelas.wali_kelas}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 pointer-events-none" />
            </div>
          </div>

          {/* Info */}
          <div className="flex items-end">
            <div className="w-full bg-blue-900/40 border border-blue-600/50 rounded-lg px-4 py-2.5">
              <p className="text-sm text-blue-200 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                Pilih tingkat dan kelas untuk melihat data aset
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Package className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{summary.total_aset}</p>
            <p className="text-sm text-slate-400">Total Aset</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-emerald-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{formatRupiah(summary.total_nilai)}</p>
            <p className="text-sm text-slate-400">Total Nilai</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{formatRupiah(summary.rata_rata_harga)}</p>
            <p className="text-sm text-slate-400">Rata-rata Harga</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Users className="h-6 w-6 text-orange-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{summary.aset_dipinjam}</p>
            <p className="text-sm text-slate-400">Aset Dipinjam</p>
          </div>
        </div>
      )}

      {/* Table Section */}
      {selectedKelas && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg">
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Data Aset</h2>
              <p className="text-sm text-slate-400 mt-1">
                Menampilkan {filteredAsets.length} dari {asets.length} aset
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari aset..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                />
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={filteredAsets.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredAsets.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Belum ada aset untuk kelas ini</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Kode Aset</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Nama Aset</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Kategori</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Kondisi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Jumlah</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Harga</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Ruangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredAsets.map((aset) => (
                    <tr key={aset.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">{aset.kode_aset}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{aset.nama_aset}</div>
                        {aset.merek && <div className="text-xs text-slate-400">{aset.merek}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{aset.kategori?.nama_kategori || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          aset.kondisi?.nama_kondisi === 'Baik' ? 'bg-emerald-500/20 text-emerald-300' :
                          aset.kondisi?.nama_kondisi === 'Rusak Ringan' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {aset.kondisi?.nama_kondisi || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {aset.jumlah} {aset.satuan || 'unit'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{formatRupiah(aset.harga_perolehan)}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{aset.ruangan?.nama_ruangan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
