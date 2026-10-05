'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Package, ChevronDown, Building2 } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Jurusan {
  id: number;
  kode_jurusan: string;
  nama_jurusan: string;
}

interface Kelas {
  id: number;
  id_jurusan: number;
  tingkat: 'X' | 'XI' | 'XII';
  nama_kelas: string;
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
  kategori?: { nama_kategori: string };
  kondisi?: { nama_kondisi: string };
  ruangan?: { nama_ruangan: string };
}

export default function PublicAsetKelasPage() {
  const [jurusans, setJurusans] = useState<Jurusan[]>([]);
  const [selectedJurusan, setSelectedJurusan] = useState<number | ''>('');
  const [selectedTingkat, setSelectedTingkat] = useState<'X' | 'XI' | 'XII' | ''>('');
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<number | ''>('');
  const [asets, setAsets] = useState<Aset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch jurusan list on mount
  useEffect(() => {
    axios.get(`${API_URL}/api/jurusans`)
      .then(res => {
        if (res.data.status === 'success') {
          setJurusans(res.data.data);
        }
      })
      .catch(err => console.error('Failed to fetch jurusans:', err));
  }, []);

  // Fetch kelas when jurusan & tingkat selected
  useEffect(() => {
    if (selectedJurusan && selectedTingkat) {
      axios.get(`${API_URL}/api/jurusans/${selectedJurusan}/kelas/${selectedTingkat}`)
        .then(res => {
          if (res.data.status === 'success') {
            setKelasList(res.data.data);
            setSelectedKelas('');
            setAsets([]);
          }
        })
        .catch(err => console.error('Failed to fetch kelas:', err));
    }
  }, [selectedJurusan, selectedTingkat]);

  // Fetch aset when kelas selected
  useEffect(() => {
    if (selectedKelas) {
      setLoading(true);
      axios.get(`${API_URL}/api/aset-per-kelas/${selectedKelas}`)
        .then(res => {
          if (res.data.status === 'success') {
            setAsets(res.data.data.asets);
          }
        })
        .catch(err => console.error('Failed to fetch asets:', err))
        .finally(() => setLoading(false));
    }
  }, [selectedKelas]);

  // Filter asets by search
  const filteredAsets = asets.filter(aset =>
    aset.nama_aset.toLowerCase().includes(searchQuery.toLowerCase()) ||
    aset.kode_aset.toLowerCase().includes(searchQuery.toLowerCase()) ||
    aset.kategori?.nama_kategori.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const selectedJurusanData = jurusans.find(j => j.id === selectedJurusan);
  const selectedKelasData = kelasList.find(k => k.id === selectedKelas);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="http://localhost:8000/storage/img/pgri-telagasari.jpg" 
                alt="Logo"
                className="w-10 h-10 rounded-xl object-cover shadow-lg"
              />
              <div>
                <h1 className="text-xl font-bold text-white">Data Aset Per Kelas</h1>
                <p className="text-xs text-slate-400">SMK PGRI Telagasari</p>
              </div>
            </div>
            <Link
              href="/public"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Filter Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Filter Data Aset</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Jurusan */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Pilih Jurusan
              </label>
              <div className="relative">
                <select
                  value={selectedJurusan}
                  onChange={(e) => {
                    setSelectedJurusan(Number(e.target.value));
                    setSelectedTingkat('');
                    setSelectedKelas('');
                    setAsets([]);
                  }}
                  className="w-full bg-white text-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="" className="bg-white text-slate-900">-- Pilih Jurusan --</option>
                  {jurusans.map(jurusan => (
                    <option key={jurusan.id} value={jurusan.id} className="bg-white text-slate-900">
                      {jurusan.kode_jurusan} - {jurusan.nama_jurusan}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 pointer-events-none" />
              </div>
            </div>

            {/* Tingkat */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Pilih Tingkat
              </label>
              <div className="relative">
                <select
                  value={selectedTingkat}
                  onChange={(e) => {
                    setSelectedTingkat(e.target.value as 'X' | 'XI' | 'XII');
                    setSelectedKelas('');
                    setAsets([]);
                  }}
                  disabled={!selectedJurusan}
                  className="w-full bg-white text-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <option value="" className="bg-white text-slate-900">-- Pilih Tingkat --</option>
                  <option value="X" className="bg-white text-slate-900">Kelas X</option>
                  <option value="XI" className="bg-white text-slate-900">Kelas XI</option>
                  <option value="XII" className="bg-white text-slate-900">Kelas XII</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 pointer-events-none" />
              </div>
            </div>

            {/* Kelas */}
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
                      {kelas.jumlah_siswa && ` (${kelas.jumlah_siswa} siswa)`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 pointer-events-none" />
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Cari Aset
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari aset..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!selectedKelas}
                  className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        {selectedKelasData && (
          <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-1">
              {selectedJurusanData?.nama_jurusan} - {selectedKelasData.nama_kelas}
            </h3>
            <p className="text-sm text-slate-300">
              Menampilkan {filteredAsets.length} aset
              {selectedKelasData.jumlah_siswa && ` untuk ${selectedKelasData.jumlah_siswa} siswa`}
            </p>
          </div>
        )}

        {/* Table */}
        {selectedKelas && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredAsets.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">
                  {asets.length === 0 
                    ? 'Belum ada aset untuk kelas ini' 
                    : 'Tidak ada aset yang sesuai dengan pencarian'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Kode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Nama Aset</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Kategori</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Kondisi</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Jumlah</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Harga</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Ruangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
