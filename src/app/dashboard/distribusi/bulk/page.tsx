'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import {
  Search, Plus, Trash2, Package, Send, ArrowLeft,
  Loader2, CheckCircle2, AlertTriangle, Truck, MapPin,
  ClipboardList, X, RefreshCw, Building2
} from 'lucide-react'

interface Ruangan {
  id: number
  nama_ruangan: string
  kode_ruangan: string
  gedung: {
    nama_gedung: string
  }
}

interface BarangItem {
  id: string
  sarana_prasarana_id?: number
  nama_barang: string
  satuan: string
  jumlah: number
  harga_satuan: number
  kondisi: string
  keterangan: string
  isNew: boolean
}

interface SearchResult {
  id: number
  kode: string
  nama_barang: string
  satuan: string
  stok_akhir: number
  kondisi: string
  nilai_harga_pembelian?: number
  folder_nama: string | null
}

const kondisiOptions = ['Baik', 'Cukup Baik', 'Rusak Ringan', 'Rusak Berat']

const kondisiBadge = (k: string) => {
  if (k === 'Baik') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (k === 'Cukup Baik') return 'bg-sky-100 text-sky-700 border-sky-200'
  if (k === 'Rusak Ringan') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-rose-100 text-rose-700 border-rose-200'
}

export default function BulkDistribusiPage() {
  const router = useRouter()
  const [ruangans, setRuangans] = useState<Ruangan[]>([])
  const [selectedRuangan, setSelectedRuangan] = useState<number | null>(null)
  const [catatanPengiriman, setCatatanPengiriman] = useState('')
  const [items, setItems] = useState<BarangItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRuangan, setLoadingRuangan] = useState(true)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Success state
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchRuangans()
  }, [])

  // Tutup dropdown search saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchRuangans = async () => {
    setLoadingRuangan(true)
    try {
      const response = await axios.get('/api/ruangans')
      const all: Ruangan[] = Array.isArray(response.data)
        ? response.data
        : (response.data?.data ?? [])
      setRuangans(all)
    } catch (error) {
      console.error('Error fetching ruangans:', error)
    } finally {
      setLoadingRuangan(false)
    }
  }

  const searchBarang = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    setIsSearching(true)
    try {
      const response = await axios.get(
        `/api/distribusi-asets/search-barang?q=${encodeURIComponent(query)}`
      )
      const results = Array.isArray(response.data) ? response.data : []
      setSearchResults(results)
      setShowSearchResults(true)
    } catch (error) {
      console.error('Error searching barang:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchBarang(value), 300)
  }

  const addItemFromSearch = (result: SearchResult) => {
    const newItem: BarangItem = {
      id: `item-${Date.now()}`,
      sarana_prasarana_id: result.id,
      nama_barang: result.nama_barang,
      satuan: result.satuan,
      jumlah: 1,
      harga_satuan: Number(result.nilai_harga_pembelian) || 0,
      kondisi: result.kondisi || 'Baik',
      keterangan: result.folder_nama || '',
      isNew: false,
    }
    setItems(prev => [...prev, newItem])
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  const addNewItem = () => {
    const newItem: BarangItem = {
      id: `item-${Date.now()}`,
      nama_barang: '',
      satuan: 'Unit',
      jumlah: 1,
      harga_satuan: 0,
      kondisi: 'Baik',
      keterangan: '',
      isNew: true,
    }
    setItems(prev => [...prev, newItem])
  }

  const updateItem = (id: string, field: keyof BarangItem, value: string | number | boolean) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!selectedRuangan) {
      setErrorMsg('Pilih ruangan tujuan terlebih dahulu!')
      return
    }
    if (items.length === 0) {
      setErrorMsg('Tambahkan minimal 1 barang untuk distribusi!')
      return
    }
    const invalidItems = items.filter(item => !item.nama_barang.trim() || item.jumlah < 1)
    if (invalidItems.length > 0) {
      setErrorMsg('Pastikan semua barang memiliki nama dan jumlah yang valid!')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ruangan_tujuan_id: selectedRuangan,
        catatan_pengiriman: catatanPengiriman,
        items: items.map(item => ({
          sarana_prasarana_id: item.isNew ? null : item.sarana_prasarana_id,
          nama_barang: item.isNew ? item.nama_barang : undefined,
          satuan: item.isNew ? item.satuan : undefined,
          kondisi: item.isNew ? item.kondisi : undefined,
          keterangan: item.keterangan || undefined,
          jumlah: item.jumlah,
          harga_satuan: item.harga_satuan || 0,
        })),
      }

      await axios.post('/api/distribusi-asets/bulk', payload)
      setSubmitted(true)
      setTimeout(() => router.push('/dashboard/distribusi'), 2000)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } }
      setErrorMsg(e?.response?.data?.message || 'Gagal melakukan distribusi bulk')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen
  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Distribusi Berhasil!</h2>
          <p className="text-slate-500 text-sm">Mengalihkan ke halaman distribusi...</p>
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -translate-y-12 translate-x-12" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/20 backdrop-blur-md rounded-2xl ring-1 ring-white/30">
              <Truck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Distribusi Barang Bulk</h1>
              <p className="text-blue-100 text-sm mt-0.5">Kirim banyak barang sekaligus ke ruangan tujuan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-semibold backdrop-blur-sm transition-all border border-white/20"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Terjadi Kesalahan</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
            </div>
            <button type="button" onClick={() => setErrorMsg('')} className="ml-auto text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column — Pengaturan */}
          <div className="space-y-5">
            {/* Pilih Ruangan */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Ruangan Tujuan</h2>
                <span className="text-red-500 text-xs">*</span>
              </div>

              {loadingRuangan ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Memuat ruangan...
                </div>
              ) : (
                <select
                  value={selectedRuangan || ''}
                  onChange={e => setSelectedRuangan(Number(e.target.value) || null)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  required
                >
                  <option value="">-- Pilih Ruangan Tujuan --</option>
                  {ruangans.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.nama_ruangan} ({r.kode_ruangan})
                    </option>
                  ))}
                </select>
              )}

              {selectedRuangan && (() => {
                const r = ruangans.find(ru => ru.id === selectedRuangan)
                return r ? (
                  <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-indigo-800">{r.nama_ruangan}</p>
                      <p className="text-[11px] text-indigo-600">{r.gedung?.nama_gedung || '-'} · {r.kode_ruangan}</p>
                    </div>
                  </div>
                ) : null
              })()}
            </div>

            {/* Catatan */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <ClipboardList className="h-4 w-4 text-amber-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Catatan Pengiriman</h2>
              </div>
              <textarea
                value={catatanPengiriman}
                onChange={e => setCatatanPengiriman(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all resize-none"
                rows={4}
                placeholder="Catatan tambahan untuk pengiriman ini..."
              />
            </div>

            {/* Summary */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Ringkasan</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Total Jenis Barang</span>
                  <span className="font-bold text-lg">{items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Total Unit</span>
                  <span className="font-bold text-lg">{items.reduce((s, i) => s + i.jumlah, 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Barang Baru</span>
                  <span className="text-yellow-300 font-semibold">{items.filter(i => i.isNew).length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Dari Database</span>
                  <span className="text-blue-300 font-semibold">{items.filter(i => !i.isNew).length}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700/80">
                  <span className="text-xs text-slate-300 font-medium">Total Estimasi Nilai:</span>
                  <span className="font-bold text-base text-emerald-400">
                    Rp {items.reduce((s, i) => s + ((i.harga_satuan || 0) * (i.jumlah || 1)), 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || items.length === 0 || !selectedRuangan}
                className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
                ) : (
                  <><Send className="h-4 w-4" /> Kirim {items.length} Barang</>
                )}
              </button>
            </div>
          </div>

          {/* Right Column — Barang */}
          <div className="lg:col-span-2 space-y-5">
            {/* Search Barang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-800">Cari &amp; Tambah Barang</h2>
                <span className="text-xs text-slate-400">dari database sarana &amp; prasarana</span>
              </div>

              <div ref={searchRef} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  placeholder="Ketik nama barang atau kode untuk mencari..."
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  autoComplete="off"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                ) : searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Dropdown results */}
                {showSearchResults && (
                  <div className="absolute z-30 w-full top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">
                          {searchQuery.length < 2 ? 'Ketik minimal 2 karakter' : 'Tidak ada barang ditemukan'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
                          <Search className="h-3 w-3 text-slate-400" />
                          <span className="text-[11px] text-slate-500 font-medium">{searchResults.length} barang ditemukan</span>
                        </div>
                        <ul className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                          {searchResults.map(result => (
                            <li key={result.id}>
                              <button
                                type="button"
                                onClick={() => addItemFromSearch(result)}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 group"
                              >
                                <div className="p-1.5 bg-slate-100 group-hover:bg-blue-100 rounded-lg flex-shrink-0 mt-0.5 transition-colors">
                                  <Package className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-slate-800 truncate">{result.nama_barang}</p>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {result.kode && (
                                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{result.kode}</span>
                                    )}
                                    <span className="text-xs text-slate-500">Stok: <strong>{result.stok_akhir}</strong> {result.satuan}</span>
                                    {result.nilai_harga_pembelian ? (
                                      <span className="text-xs font-bold text-emerald-600">
                                        Rp {Number(result.nilai_harga_pembelian).toLocaleString('id-ID')}
                                      </span>
                                    ) : null}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${kondisiBadge(result.kondisi)}`}>
                                      {result.kondisi}
                                    </span>
                                  </div>
                                  {result.folder_nama && (
                                    <p className="text-[10px] text-blue-600 mt-0.5">📁 {result.folder_nama}</p>
                                  )}
                                </div>
                                <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1 transition-opacity">+ Tambah</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Daftar Barang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <ClipboardList className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Daftar Barang</h2>
                    <p className="text-[11px] text-slate-400">{items.length} item ditambahkan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addNewItem}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Manual
                </button>
              </div>

              {items.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-500 mb-1">Belum Ada Barang</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Gunakan pencarian di atas untuk menambah barang dari database, atau klik "Tambah Manual" untuk input barang baru
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 p-4 space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 transition-all ${item.isNew
                        ? 'bg-yellow-50/50 border-yellow-200'
                        : 'bg-blue-50/30 border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                          {item.isNew ? (
                            <span className="text-[10px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-bold border border-yellow-300">
                              ✏️ Barang Baru
                            </span>
                          ) : (
                            <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-300">
                              🗄️ Dari Database
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus barang ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Nama Barang *</label>
                          <input
                            type="text"
                            value={item.nama_barang}
                            onChange={e => updateItem(item.id, 'nama_barang', e.target.value)}
                            disabled={!item.isNew}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-100 disabled:text-slate-600 transition-all"
                            placeholder="Nama barang..."
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Satuan</label>
                          <input
                            type="text"
                            value={item.satuan}
                            onChange={e => updateItem(item.id, 'satuan', e.target.value)}
                            disabled={!item.isNew}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-100 transition-all"
                            placeholder="Unit, Pcs..."
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-blue-700 mb-1">Jumlah *</label>
                          <input
                            type="number"
                            min="1"
                            value={item.jumlah}
                            onChange={e => updateItem(item.id, 'jumlah', Number(e.target.value))}
                            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold text-blue-800 transition-all"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-emerald-700 mb-1">Harga Satuan (Rp)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.harga_satuan || ''}
                            onChange={e => updateItem(item.id, 'harga_satuan', Number(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-emerald-50/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-semibold text-emerald-800 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Subtotal Nilai</label>
                          <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100 font-bold text-slate-800 truncate">
                            Rp {((item.harga_satuan || 0) * (item.jumlah || 1)).toLocaleString('id-ID')}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Kondisi</label>
                          <select
                            value={item.kondisi}
                            onChange={e => updateItem(item.id, 'kondisi', e.target.value)}
                            disabled={!item.isNew}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-100 transition-all"
                          >
                            {kondisiOptions.map(k => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Keterangan</label>
                          <input
                            type="text"
                            value={item.keterangan}
                            onChange={e => updateItem(item.id, 'keterangan', e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                            placeholder="Keterangan..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
