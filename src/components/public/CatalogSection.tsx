'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  DoorOpen,
  Layers,
  Package,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Sparkles,
  MapPin,
  CheckCircle2,
  Info
} from 'lucide-react';
import axios, { getStorageUrl } from '@/lib/axios';

interface Ruangan {
  id: number;
  nama_ruangan: string;
  lantai: string | number;
  id_gedung: number | null;
  kode_ruangan?: string | null;
  luas_ruangan?: string | number | null;
  deskripsi?: string | null;
  foto_ruangan?: string | null;
  jenis?: string;
  gedung?: {
    id: number;
    nama_gedung: string;
  };
  asets?: Aset[];
}

interface Gedung {
  id: number;
  nama_gedung: string;
  kode_gedung?: string | null;
  jumlah_lantai?: number | null;
  deskripsi?: string | null;
  foto_gedung?: string | null;
  ruangans?: Ruangan[];
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
  const [gedungs, setGedungs] = useState<Gedung[]>([]);
  const [ruangans, setRuangans] = useState<Ruangan[]>([]);
  const [asets, setAsets] = useState<Aset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGedung, setSelectedGedung] = useState<Gedung | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal-specific state
  const [modalFloorFilter, setModalFloorFilter] = useState<string>('all');
  const [modalRoomSearch, setModalRoomSearch] = useState<string>('');
  const [expandedRoomId, setExpandedRoomId] = useState<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      axios.get('/api/gedungs'),
      axios.get('/api/ruangans'),
      axios.get('/api/asets?per_page=all'),
    ])
      .then(([gedungRes, ruanganRes, asetRes]) => {
        const gData: Gedung[] = Array.isArray(gedungRes.data)
          ? gedungRes.data
          : Array.isArray(gedungRes.data?.data)
          ? gedungRes.data.data
          : [];

        const rData: Ruangan[] = Array.isArray(ruanganRes.data)
          ? ruanganRes.data
          : Array.isArray(ruanganRes.data?.data)
          ? ruanganRes.data.data
          : [];

        const aData: Aset[] = Array.isArray(asetRes.data)
          ? asetRes.data
          : Array.isArray(asetRes.data?.data)
          ? asetRes.data.data
          : [];

        setGedungs(gData);
        setRuangans(rData);
        setAsets(aData);
      })
      .catch((err) => {
        console.error('Error fetching catalog data:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Curated fallback building images
  const fallbackBuildingImages = useMemo(
    () => [
      'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    ],
    []
  );

  const getGedungImage = (gedung: Gedung, index: number = 0) => {
    if (gedung.foto_gedung) {
      const url = getStorageUrl(gedung.foto_gedung);
      if (url) return url;
    }
    return fallbackBuildingImages[index % fallbackBuildingImages.length];
  };

  // Default fallback buildings if database has none
  const effectiveGedungs = useMemo(() => {
    if (gedungs.length > 0) return gedungs;

    // If no gedungs in DB, synthesize fallback buildings so the view is always functional
    return [
      {
        id: 1,
        nama_gedung: 'Gedung Utama',
        kode_gedung: 'GD-UTAMA',
        jumlah_lantai: 2,
        deskripsi:
          'Gedung sentral pembelajaran, laboratorium kejuruan, dan pusat administrasi sekolah.',
        foto_gedung: fallbackBuildingImages[0],
      },
      {
        id: 2,
        nama_gedung: 'Gedung Teori & Kelas',
        kode_gedung: 'GD-TEORI',
        jumlah_lantai: 3,
        deskripsi:
          'Gedung sarana ruang kelas teori terpadu dengan fasilitas multimedia modern.',
        foto_gedung: fallbackBuildingImages[1],
      },
      {
        id: 3,
        nama_gedung: 'Gedung Laboratorium & Praktik',
        kode_gedung: 'GD-LAB',
        jumlah_lantai: 2,
        deskripsi:
          'Fasilitas laboratorium komputer, sains, dan bengkel praktik kejuruan terpadu.',
        foto_gedung: fallbackBuildingImages[2],
      },
    ];
  }, [gedungs, fallbackBuildingImages]);

  // Helper to get rooms belonging to a specific Gedung
  const getRoomsForGedung = (gedung: Gedung): Ruangan[] => {
    // 1. Check if gedung has nested ruangans
    if (gedung.ruangans && gedung.ruangans.length > 0) {
      return gedung.ruangans;
    }
    // 2. Find from the ruangans list
    const matched = ruangans.filter((r) => r.id_gedung === gedung.id);
    if (matched.length > 0) return matched;

    // 3. If this is Gedung Utama or the first building and some rooms have no id_gedung, associate them here
    if (gedung.id === 1 || gedung.nama_gedung.toLowerCase().includes('utama')) {
      const unassigned = ruangans.filter((r) => !r.id_gedung);
      return unassigned;
    }

    return [];
  };

  // Helper to count total assets in a building
  const getTotalAssetsForGedung = (gedung: Gedung): number => {
    const rooms = getRoomsForGedung(gedung);
    const roomIds = new Set(rooms.map((r) => r.id));
    return asets.filter((a) => roomIds.has(a.id_ruangan)).length;
  };

  // Filtered gedungs based on search query
  const filteredGedungs = useMemo(() => {
    if (!searchQuery.trim()) return effectiveGedungs;
    const query = searchQuery.toLowerCase();
    return effectiveGedungs.filter(
      (g) =>
        g.nama_gedung.toLowerCase().includes(query) ||
        (g.kode_gedung && g.kode_gedung.toLowerCase().includes(query)) ||
        (g.deskripsi && g.deskripsi.toLowerCase().includes(query))
    );
  }, [effectiveGedungs, searchQuery]);

  // Modal helpers
  const handleOpenModal = (gedung: Gedung) => {
    setSelectedGedung(gedung);
    setModalFloorFilter('all');
    setModalRoomSearch('');
    setExpandedRoomId(null);
    setIsModalOpen(true);
  };

  const selectedGedungRooms = useMemo(() => {
    if (!selectedGedung) return [];
    return getRoomsForGedung(selectedGedung);
  }, [selectedGedung, ruangans]);

  // Floor options in the active modal
  const modalFloorOptions = useMemo(() => {
    const floors = new Set<string>();
    selectedGedungRooms.forEach((r) => {
      if (r.lantai) floors.add(String(r.lantai));
    });
    return Array.from(floors).sort((a, b) => Number(a) - Number(b));
  }, [selectedGedungRooms]);

  // Filtered rooms inside the modal
  const modalFilteredRooms = useMemo(() => {
    return selectedGedungRooms.filter((r) => {
      if (modalFloorFilter !== 'all' && String(r.lantai) !== modalFloorFilter) {
        return false;
      }
      if (modalRoomSearch.trim()) {
        const query = modalRoomSearch.toLowerCase();
        const matchName = r.nama_ruangan.toLowerCase().includes(query);
        const matchCode = r.kode_ruangan?.toLowerCase().includes(query);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [selectedGedungRooms, modalFloorFilter, modalRoomSearch]);

  const getAssetsForRoom = (roomId: number) => {
    return asets.filter((a) => a.id_ruangan === roomId);
  };

  const kondisiColor = (kondisi?: string) => {
    const k = kondisi?.toLowerCase();
    if (k === 'baik') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (k?.includes('rusak berat')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (k?.includes('rusak')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <section id="katalog" className="bg-slate-50/60 py-16 md:py-24 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold tracking-wide uppercase mb-4 shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            Katalog Gedung & Fasilitas
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Daftar Gedung Kampus
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Informasi gedung dan fasilitas SMK PGRI Telagasari. Pilih gedung untuk melihat denah lantai,
            daftar ruangan belajar, dan inventaris fasilitas yang tersedia.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama gedung atau kode gedung..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 text-sm bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 px-2">
            <span>
              Menampilkan <strong className="text-slate-800 font-semibold">{filteredGedungs.length}</strong> gedung
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Reset pencarian
              </button>
            )}
          </div>
        </div>

        {/* Gedung Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs animate-pulse"
              >
                <div className="h-52 bg-slate-200" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-4 bg-slate-100 rounded-md w-full" />
                  <div className="h-10 bg-slate-100 rounded-xl w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredGedungs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto shadow-xs">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500">
              <Building2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Gedung Tidak Ditemukan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Tidak ada gedung yang sesuai dengan kata kunci pencarian &quot;{searchQuery}&quot;.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tampilkan Semua Gedung
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredGedungs.map((gedung, idx) => {
              const rooms = getRoomsForGedung(gedung);
              const totalAssets = getTotalAssetsForGedung(gedung);

              return (
                <div
                  key={gedung.id}
                  onClick={() => handleOpenModal(gedung)}
                  className="group bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-blue-400 hover:-translate-y-1.5 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
                >
                  {/* Image Cover */}
                  <div className="relative h-56 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={getGedungImage(gedung, idx)}
                      alt={gedung.nama_gedung}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackBuildingImages[0];
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

                    {/* Top Floating Badges */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/95 backdrop-blur-md text-blue-700 shadow-sm border border-white/60">
                        <Building2 className="w-3.5 h-3.5" />
                        {gedung.kode_gedung || `GD-0${idx + 1}`}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/70 backdrop-blur-md text-white border border-white/20">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        {gedung.jumlah_lantai || 1} Lantai
                      </span>
                    </div>

                    {/* Bottom Title on Cover */}
                    <div className="absolute bottom-3.5 left-4 right-4">
                      <h3 className="text-xl font-bold text-white tracking-tight leading-snug drop-shadow-md group-hover:text-blue-200 transition-colors">
                        {gedung.nama_gedung}
                      </h3>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                    <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed mb-5">
                      {gedung.deskripsi ||
                        'Fasilitas gedung sekolah untuk kegiatan pembelajaran, praktikum, dan administrasi siswa.'}
                    </p>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                          <DoorOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Ruangan
                          </p>
                          <p className="text-xs font-extrabold text-slate-800">
                            {rooms.length} Ruang
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Inventaris
                          </p>
                          <p className="text-xs font-extrabold text-slate-800">
                            {totalAssets} Unit Aset
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action CTA */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                      <span>Jelajahi Ruangan & Aset</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Detail Gedung
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ──────────────── MODAL CARD (POPUP DETAIL GEDUNG) ──────────────── */}
      {isModalOpen && selectedGedung && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop Blur */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Dialog Card */}
          <div className="relative w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header Banner */}
            <div className="relative h-44 sm:h-52 bg-slate-900 shrink-0 overflow-hidden">
              <img
                src={getGedungImage(selectedGedung, 0)}
                alt={selectedGedung.nama_gedung}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackBuildingImages[0];
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/20 transition-all shadow-md z-10"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Banner Info */}
              <div className="absolute bottom-4 left-5 right-5 sm:left-6 sm:right-6">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white shadow-xs">
                    <Building2 className="w-3 h-3" />
                    {selectedGedung.kode_gedung || 'GD-01'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md text-white border border-white/20">
                    <Layers className="w-3 h-3" />
                    {selectedGedung.jumlah_lantai || 1} Lantai
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md text-white border border-white/20">
                    <DoorOpen className="w-3 h-3" />
                    {selectedGedungRooms.length} Ruangan
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
                  {selectedGedung.nama_gedung}
                </h3>
                {selectedGedung.deskripsi && (
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 line-clamp-2 max-w-2xl">
                    {selectedGedung.deskripsi}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Controls (Floor Filter & Room Search) */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
              {/* Floor Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setModalFloorFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    modalFloorFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  Semua Lantai
                </button>
                {modalFloorOptions.map((floor) => (
                  <button
                    key={floor}
                    onClick={() => setModalFloorFilter(floor)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      modalFloorFilter === floor
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                    }`}
                  >
                    Lantai {floor}
                  </button>
                ))}
              </div>

              {/* Room Search */}
              <div className="relative min-w-[200px] sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari ruangan di gedung ini..."
                  value={modalRoomSearch}
                  onChange={(e) => setModalRoomSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-800"
                />
              </div>
            </div>

            {/* Modal Body: List of Rooms and their Inventory */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {modalFilteredRooms.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <DoorOpen className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Belum Ada Ruangan</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    {modalRoomSearch || modalFloorFilter !== 'all'
                      ? 'Tidak ada ruangan yang cocok dengan filter atau kata kunci yang dipilih.'
                      : 'Belum ada ruangan yang terhubung ke gedung ini dalam sistem inventaris.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modalFilteredRooms.map((room) => {
                    const roomAssets = getAssetsForRoom(room.id);
                    const isExpanded = expandedRoomId === room.id;

                    return (
                      <div
                        key={room.id}
                        className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                          isExpanded
                            ? 'bg-white border-blue-400 shadow-md ring-2 ring-blue-500/10'
                            : 'bg-white border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {/* Room Card Header (Clickable) */}
                        <div
                          onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                          className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
                                isExpanded
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-blue-50 text-blue-600 border-blue-100'
                              }`}
                            >
                              <DoorOpen className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                  {room.nama_ruangan}
                                </h4>
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                  Lt. {room.lantai || '1'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 truncate">
                                {room.kode_ruangan ? `Kode: ${room.kode_ruangan} · ` : ''}
                                {room.luas_ruangan ? `Luas: ${room.luas_ruangan} m² · ` : ''}
                                <span className="text-blue-600 font-semibold">
                                  {roomAssets.length} Aset Terdata
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Accordion Toggle Icon */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-blue-600 hidden sm:inline">
                              {isExpanded ? 'Tutup Aset' : 'Lihat Aset'}
                            </span>
                            <div
                              className={`p-1.5 rounded-lg text-slate-400 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180 bg-blue-50 text-blue-600' : 'bg-slate-100'
                              }`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {/* Room Assets Drawer (Accordion content) */}
                        {isExpanded && (
                          <div className="px-4 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Daftar Inventaris Ruangan ({roomAssets.length})
                              </p>
                              <span className="text-[11px] text-slate-400">
                                {room.nama_ruangan} · Lt. {room.lantai || '1'}
                              </span>
                            </div>

                            {roomAssets.length === 0 ? (
                              <div className="py-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                                <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-semibold text-slate-600">
                                  Belum ada aset tercatat
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Belum ada barang inventaris yang didaftarkan ke ruangan ini.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {roomAssets.map((aset) => {
                                  const thumbnail =
                                    aset.fotos?.find((f) => f.is_thumbnail) || aset.fotos?.[0];

                                  return (
                                    <div
                                      key={aset.id}
                                      className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between"
                                    >
                                      <div>
                                        <div className="relative w-full h-28 bg-slate-100 rounded-lg overflow-hidden mb-2.5">
                                          {thumbnail ? (
                                            <img
                                              src={
                                                getStorageUrl(thumbnail.url_foto) ||
                                                thumbnail.url_foto
                                              }
                                              alt={aset.nama_aset}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).style.display =
                                                  'none';
                                              }}
                                            />
                                          ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                              <Package className="w-7 h-7 mb-1" />
                                              <span className="text-[10px]">Tanpa Foto</span>
                                            </div>
                                          )}
                                          <span
                                            className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-2 py-0.5 rounded-md border ${kondisiColor(
                                              aset.kondisi?.nama_kondisi
                                            )}`}
                                          >
                                            {aset.kondisi?.nama_kondisi || 'Baik'}
                                          </span>
                                        </div>

                                        <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                                          {aset.nama_aset}
                                        </p>
                                        {(aset.merek || aset.tipe) && (
                                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                            {aset.merek}
                                            {aset.tipe ? ` · ${aset.tipe}` : ''}
                                          </p>
                                        )}
                                      </div>

                                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400 truncate max-w-[100px]">
                                          {aset.kategori?.nama_kategori || 'Umum'}
                                        </span>
                                        <span className="font-extrabold text-slate-800">
                                          {aset.jumlah}{' '}
                                          <span className="font-normal text-slate-400">
                                            {aset.satuan || 'Unit'}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Total <strong>{selectedGedungRooms.length} ruangan</strong> di {selectedGedung.nama_gedung}
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
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
