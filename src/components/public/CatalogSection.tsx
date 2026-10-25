'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Package, X, ChevronRight, Search,
  ChevronDown, RotateCcw, Building2, DoorOpen, Layers3
} from 'lucide-react';
import axios, { getStorageUrl } from '@/lib/axios';

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
      const rData = Array.isArray(ruanganRes.data)
        ? ruanganRes.data
        : (Array.isArray(ruanganRes.data?.data) ? ruanganRes.data.data : []);
      const gData = Array.isArray(gedungRes.data)
        ? gedungRes.data
        : (Array.isArray(gedungRes.data?.data) ? gedungRes.data.data : []);
      setRuangans(rData);
      setGedungs(gData);
      if (gData.length > 0) setActiveGedung(gData[0].id);
    }).catch((err) => {
      console.error('Error fetching catalog data:', err);
      setRuangans([]);
      setGedungs([]);
    });
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

  const safeRuangans = useMemo(() => Array.isArray(ruangans) ? ruangans : [], [ruangans]);
  const safeGedungs = useMemo(() => Array.isArray(gedungs) ? gedungs : [], [gedungs]);

  const kelasOptions = useMemo(() => {
    const set = new Set<string>();
    safeRuangans.forEach(r => {
      const match = r.nama_ruangan?.match(/Kelas\s+(X{1,3}I{0,3}|IV|IX|VI{0,3})/i);
      if (match) set.add(match[1].toUpperCase());
    });
    return Array.from(set).sort();
  }, [safeRuangans]);

  const jurusanOptions = useMemo(() => {
    const set = new Set<string>();
    safeRuangans.forEach(r => {
      const match = r.nama_ruangan?.match(/Kelas\s+(?:X{1,3}I{0,3}|IV|IX|VI{0,3})[-\s]+([A-Z]+)/i);
      if (match) set.add(match[1].toUpperCase());
    });
    return Array.from(set).sort();
  }, [safeRuangans]);

  const filteredRuangans = useMemo(() => {
    return safeRuangans.filter(r => {
      if (activeGedung && r.id_gedung !== activeGedung) return false;
      if (searchQuery && !r.nama_ruangan?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterKelas) {
        const match = r.nama_ruangan?.match(/Kelas\s+(X{1,3}I{0,3}|IV|IX|VI{0,3})/i);
        if (!match || match[1].toUpperCase() !== filterKelas) return false;
      }
      if (filterJurusan) {
        const match = r.nama_ruangan?.match(/Kelas\s+(?:X{1,3}I{0,3}|IV|IX|VI{0,3})[-\s]+([A-Z]+)/i);
        if (!match || match[1].toUpperCase() !== filterJurusan) return false;
      }
      return true;
    });
  }, [safeRuangans, activeGedung, filterKelas, filterJurusan, searchQuery]);

  const hasActiveFilter = !!(filterKelas || filterJurusan || searchQuery);

  const resetFilters = () => {
    setFilterKelas('');
    setFilterJurusan('');
    setSearchQuery('');
  };

  const kondisiColor = (kondisi?: string) => {
    const k = kondisi?.toLowerCase();
    if (k === 'baik') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (k?.includes('rusak')) return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-amber-100 text-amber-700 border border-amber-200';
  };

  const activeGedungName = safeGedungs.find(g => g.id === activeGedung)?.nama_gedung;

  return (
    <section id="katalog" className="bg-gray-50 py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section Header ── */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Katalog Inventaris Aset
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Informasi inventaris dan aset sekolah per ruangan. Pilih ruangan untuk melihat detail daftar barang.
          </p>
        </div>

        {/* ── Gedung Tabs ── */}
        {safeGedungs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveGedung(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeGedung === null
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              <Layers3 className="w-4 h-4" />
              Semua Gedung
            </button>
            {safeGedungs.map(g => (
              <button
                key={g.id}
                onClick={() => setActiveGedung(g.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeGedung === g.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                <Building2 className="w-4 h-4" />
                {g.nama_gedung}
              </button>
            ))}
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-8">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama ruangan..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
              />
            </div>

            {/* Kelas */}
            {kelasOptions.length > 0 && (
              <div className="relative min-w-[150px]">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <select
                  value={filterKelas}
                  onChange={e => { setFilterKelas(e.target.value); setFilterJurusan(''); }}
                  className="appearance-none w-full pl-4 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 cursor-pointer transition-all"
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
                  className="appearance-none w-full pl-4 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 cursor-pointer transition-all"
                >
                  <option value="">Semua Jurusan</option>
                  {jurusanOptions.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Reset */}
            {hasActiveFilter && (
              <button
                onClick={resetFilters}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-red-500 hover:border-red-200 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {/* Result count */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
              <DoorOpen className="w-3.5 h-3.5" />
              {filteredRuangans.length} Ruangan
            </span>
            {activeGedungName && (
              <span className="text-xs text-gray-400">di <strong className="text-gray-600">{activeGedungName}</strong></span>
            )}
            {filterKelas && <span className="text-xs text-gray-400">· Kelas <strong className="text-gray-600">{filterKelas}</strong></span>}
            {filterJurusan && <span className="text-xs text-gray-400">· Jurusan <strong className="text-gray-600">{filterJurusan}</strong></span>}
          </div>
        </div>

        {/* ── Room Grid ── */}
        {filteredRuangans.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl py-20 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold text-sm mb-1">Tidak ada ruangan ditemukan</p>
            <p className="text-xs text-gray-400 mb-4">Coba ubah filter atau kata kunci pencarian</p>
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              Reset semua filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredRuangans.map((ruangan) => (
              <button
                key={ruangan.id}
                onClick={() => handleSelectRuangan(ruangan)}
                className="group bg-white border border-gray-100 rounded-2xl text-left hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/60 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Card top accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 w-full" />

                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
                      <DoorOpen className="w-6 h-6 text-blue-500 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-200 mt-1" />
                  </div>

                  <p className="font-bold text-gray-800 text-sm leading-snug group-hover:text-blue-700 transition-colors mb-2 line-clamp-2">
                    {ruangan.nama_ruangan}
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Building2 className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                    <span className="truncate">{ruangan.gedung?.nama_gedung || 'Gedung Utama'}</span>
                    <span className="text-gray-200">·</span>
                    <span className="shrink-0">Lt. {ruangan.lantai || '1'}</span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <span className="text-[11px] font-semibold text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
                      Lihat inventaris
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Inventory Modal ── */}
      {isModalOpen && selectedRuangan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Panel */}
          <div className="relative w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
            {/* Top accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 shrink-0" />

            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start shrink-0">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-2">
                  <DoorOpen className="w-3.5 h-3.5" />
                  Inventaris Ruangan
                </span>
                <h3 className="text-xl font-extrabold text-gray-900 leading-tight">{selectedRuangan.nama_ruangan}</h3>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {selectedRuangan.gedung?.nama_gedung || 'Gedung Utama'} &nbsp;·&nbsp; Lantai {selectedRuangan.lantai || '1'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mb-4" />
                  <p className="text-sm text-gray-400 font-medium">Memuat data inventaris...</p>
                </div>
              ) : asets.length > 0 ? (
                <>
                  {/* Summary bar */}
                  <div className="flex items-center gap-2 mb-5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                      <Package className="w-3.5 h-3.5" />
                      {asets.length} item tercatat
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {asets.map(aset => {
                      const thumbnail = aset.fotos?.find(f => f.is_thumbnail) || aset.fotos?.[0];
                      return (
                        <div
                          key={aset.id}
                          className="group border border-gray-100 rounded-2xl overflow-hidden bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300"
                        >
                          {/* Image */}
                          <div className="relative w-full h-44 bg-gray-100">
                            {thumbnail ? (
                              <img
                                src={getStorageUrl(thumbnail.url_foto) || thumbnail.url_foto}
                                alt={aset.nama_aset}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                <Package className="w-10 h-10 mb-1" />
                                <p className="text-xs">Belum ada foto</p>
                              </div>
                            )}
                            <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${kondisiColor(aset.kondisi?.nama_kondisi)}`}>
                              {aset.kondisi?.nama_kondisi || 'Baik'}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="p-4">
                            <p className="font-bold text-gray-800 text-sm leading-tight mb-1 group-hover:text-blue-700 transition-colors">
                              {aset.nama_aset}
                            </p>
                            {(aset.merek || aset.tipe) && (
                              <p className="text-xs text-gray-400 mb-3">{aset.merek}{aset.tipe ? ` · ${aset.tipe}` : ''}</p>
                            )}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                                {aset.kategori?.nama_kategori || 'Umum'}
                              </span>
                              <span className="text-sm font-extrabold text-gray-800">
                                {aset.jumlah}{' '}
                                <span className="text-xs font-normal text-gray-400">{aset.satuan}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Package className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="font-bold text-gray-400 text-base mb-1">Belum ada inventaris</p>
                  <p className="text-xs text-gray-300">Belum ada aset yang tercatat di ruangan ini.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
