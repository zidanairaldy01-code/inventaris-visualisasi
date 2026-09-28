'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapPin, Package, X, ChevronRight, Search, ChevronDown, RotateCcw, Building2 } from 'lucide-react';
import axios from '@/lib/axios';

interface Ruangan {
  id: number;
  nama_ruangan: string;
  lantai: string;
  id_gedung: number;
  gedung?: {
    id: number;
    nama_gedung: string;
  };
}

interface Gedung {
  id: number;
  nama_gedung: string;
}

interface Aset {
  id: number;
  nama_aset: string;
  kode_aset?: string;
  merek?: string;
  tipe?: string;
  jumlah: number;
  satuan: string;
  id_ruangan: number;
  kategori?: {
    nama_kategori: string;
  };
  kondisi?: {
    nama_kondisi: string;
  };
  fotos?: Array<{
    url_foto: string;
    is_thumbnail: boolean;
  }>;
}

export default function CatalogSection() {
  const [ruangans, setRuangans] = useState<Ruangan[]>([]);
  const [asets, setAsets] = useState<Aset[]>([]);
  const [gedungs, setGedungs] = useState<Gedung[]>([]);
  const [selectedRuangan, setSelectedRuangan] = useState<Ruangan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeGedung, setActiveGedung] = useState<number | null>(null);
  const [filterKelas, setFilterKelas] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get('/api/ruangans'),
      axios.get('/api/gedungs'),
    ]).then(([ruanganRes, gedungRes]) => {
      setRuangans(ruanganRes.data);
      setGedungs(gedungRes.data);
      if (gedungRes.data.length > 0) setActiveGedung(gedungRes.data[0].id);
    }).catch(console.error);
  }, []);

  const handleSelectRuangan = async (ruangan: Ruangan) => {
    setSelectedRuangan(ruangan);
    setIsModalOpen(true);
    setIsLoading(true);
    try {
      const res = await axios.get('/api/asets?per_page=all');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setAsets(data.filter((a: Aset) => a.id_ruangan === ruangan.id));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const kelasOptions = useMemo(() => {
    const set = new Set<string>();
    ruangans.forEach(r => {
      const match = r.nama_ruangan.match(/Kelas\s+(X{1,3}I{0,3}|IV|IX|VI{0,3})/i);
      if (match) set.add(match[1].toUpperCase());
    });
    return Array.from(set).sort();
  }, [ruangans]);

  const jurusanOptions = useMemo(() => {
    const set = new Set<string>();
    ruangans.forEach(r => {
      const match = r.nama_ruangan.match(/Kelas\s+(?:X{1,3}I{0,3}|IV|IX|VI{0,3})[-\s]+([A-Z]+)/i);
      if (match) set.add(match[1].toUpperCase());
    });
    return Array.from(set).sort();
  }, [ruangans]);

  const filteredRuangans = useMemo(() => {
    return ruangans.filter(r => {
      if (activeGedung && r.id_gedung !== activeGedung) return false;
      if (searchQuery && !r.nama_ruangan.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterKelas) {
        const match = r.nama_ruangan.match(/Kelas\s+(X{1,3}I{0,3}|IV|IX|VI{0,3})/i);
        if (!match || match[1].toUpperCase() !== filterKelas) return false;
      }
      if (filterJurusan) {
        const match = r.nama_ruangan.match(/Kelas\s+(?:X{1,3}I{0,3}|IV|IX|VI{0,3})[-\s]+([A-Z]+)/i);
        if (!match || match[1].toUpperCase() !== filterJurusan) return false;
      }
      return true;
    });
  }, [ruangans, activeGedung, filterKelas, filterJurusan, searchQuery]);

  const hasActiveFilter = !!(filterKelas || filterJurusan || searchQuery);

  const resetFilters = () => {
    setFilterKelas('');
    setFilterJurusan('');
    setSearchQuery('');
  };

  const kondisiColor = (kondisi?: string) => {
    const k = kondisi?.toLowerCase();
    if (k === 'baik') return 'bg-green-100 text-green-700';
    if (k?.includes('rusak')) return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <section id="katalog" className="bg-gray-50 py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Katalog Inventaris Aset
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Informasi inventaris dan aset sekolah per ruangan. Pilih ruangan untuk melihat detail daftar barang
          </p>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Pencarian & Filter</p>
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama ruangan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
              />
            </div>

            {/* Gedung */}
            <div className="relative min-w-[200px]">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select
                value={activeGedung ?? ''}
                onChange={e => setActiveGedung(e.target.value ? Number(e.target.value) : null)}
                className="appearance-none w-full pl-9 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 cursor-pointer"
              >
                <option value="">Semua Gedung</option>
                {gedungs.map(g => (
                  <option key={g.id} value={g.id}>{g.nama_gedung}</option>
                ))}
              </select>
            </div>

            {/* Kelas */}
            {kelasOptions.length > 0 && (
              <div className="relative min-w-[150px]">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <select
                  value={filterKelas}
                  onChange={e => { setFilterKelas(e.target.value); setFilterJurusan(''); }}
                  className="appearance-none w-full pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 cursor-pointer"
                >
                  <option value="">Semua Kelas</option>
                  {kelasOptions.map(k => (
                    <option key={k} value={k}>Kelas {k}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Jurusan */}
            {jurusanOptions.length > 0 && (
              <div className="relative min-w-[150px]">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <select
                  value={filterJurusan}
                  onChange={e => setFilterJurusan(e.target.value)}
                  className="appearance-none w-full pl-3 pr-8 py-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 cursor-pointer"
                >
                  <option value="">Semua Jurusan</option>
                  {jurusanOptions.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            )}

            {hasActiveFilter && (
              <button
                onClick={resetFilters}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {/* Hasil filter */}
          <p className="text-xs text-gray-400 mt-4">
            Menampilkan <strong className="text-gray-600">{filteredRuangans.length}</strong> dari {ruangans.length} ruangan
            {filterKelas && <span className="ml-1">· Kelas <strong>{filterKelas}</strong></span>}
            {filterJurusan && <span className="ml-1">· Jurusan <strong>{filterJurusan}</strong></span>}
            {activeGedung && <span className="ml-1">· <strong>{gedungs.find(g => g.id === activeGedung)?.nama_gedung}</strong></span>}
          </p>
        </div>

        {/* Room Grid */}
        {filteredRuangans.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
            <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-sm">Tidak ada ruangan yang sesuai filter.</p>
            <button onClick={resetFilters} className="mt-3 text-xs text-blue-600 hover:underline">Reset filter</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredRuangans.map((ruangan) => (
              <button
                key={ruangan.id}
                onClick={() => handleSelectRuangan(ruangan)}
                className="bg-white border border-gray-200 rounded-xl text-left hover:border-blue-400 hover:shadow-lg transition-all duration-200 group overflow-hidden"
              >
                <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600 w-full" />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <p className="font-semibold text-gray-800 text-sm leading-snug group-hover:text-blue-700 transition-colors mb-2">
                    {ruangan.nama_ruangan}
                  </p>
                  <p className="text-xs text-gray-400">
                    {ruangan.gedung?.nama_gedung || 'Gedung Utama'} · Lt. {ruangan.lantai || '1'}
                  </p>
                  <p className="text-[11px] text-blue-600 font-medium mt-3 group-hover:underline">
                    Lihat inventaris →
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedRuangan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full sm:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Inventaris Ruangan</p>
                <h3 className="text-xl font-bold text-gray-900">{selectedRuangan.nama_ruangan}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedRuangan.gedung?.nama_gedung || 'Gedung Utama'} · Lantai {selectedRuangan.lantai || '1'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-3" />
                  <p className="text-sm text-gray-400">Memuat data...</p>
                </div>
              ) : asets.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {asets.map(aset => {
                    const thumbnail = aset.fotos?.find(f => f.is_thumbnail) || aset.fotos?.[0];
                    return (
                      <div key={aset.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-blue-300 hover:shadow-md transition-all">
                        <div className="relative w-full h-40 bg-gray-100">
                          {thumbnail ? (
                            <img src={thumbnail.url_foto} alt={aset.nama_aset} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                              <Package className="w-10 h-10 mb-1" />
                              <p className="text-xs">Belum ada foto</p>
                            </div>
                          )}
                          <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded ${kondisiColor(aset.kondisi?.nama_kondisi)}`}>
                            {aset.kondisi?.nama_kondisi || 'Baik'}
                          </span>
                        </div>
                        <div className="p-4">
                          <p className="font-semibold text-gray-800 text-sm leading-tight mb-1">{aset.nama_aset}</p>
                          {(aset.merek || aset.tipe) && (
                            <p className="text-xs text-gray-400 mb-3">{aset.merek}{aset.tipe ? ` · ${aset.tipe}` : ''}</p>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-400">{aset.kategori?.nama_kategori || 'Umum'}</span>
                            <span className="text-sm font-bold text-gray-700">{aset.jumlah} <span className="text-xs font-normal text-gray-400">{aset.satuan}</span></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-semibold text-gray-400">Belum ada inventaris</p>
                  <p className="text-xs text-gray-300 mt-1">Belum ada aset yang tercatat di ruangan ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
