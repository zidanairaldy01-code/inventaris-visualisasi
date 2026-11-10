'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import {
  Search, Plus, Trash2, Package, Send, ArrowLeft,
  Loader2, CheckCircle2, AlertTriangle, Truck, MapPin,
  ClipboardList, X, Building2, Warehouse,
  Box, Flame
} from 'lucide-react'

interface Ruangan {
  id: number
  nama_ruangan: string
  kode_ruangan: string
  jenis?: string
  gedung: { nama_gedung: string }
}

type JenisBarang = 'habis_pakai' | 'tidak_habis_pakai'

interface BarangItem {
  id: string
  sarana_prasarana_id?: number
  inventaris_gudang_id?: number
  source: 'sarpras' | 'gudang' | 'baru'
  nama_barang: string
  satuan: string
  jumlah: number
  stok_gudang?: number
  harga_satuan: number
  kondisi: string
  keterangan: string
  jenis_barang: JenisBarang
  isNew: boolean
}

interface SearchResult {
  id: string
  source: 'gudang' | 'sarpras'
  sarana_prasarana_id?: number
  inventaris_gudang_id?: number
  kode: string
  nama_barang: string
  satuan: string
  stok_akhir: number
  kondisi: string
  nilai_harga_pembelian?: number
  folder_nama: string | null
  jenis_barang: JenisBarang
}

const kondisiOptions = ['Baik', 'Cukup Baik', 'Rusak Ringan', 'Rusak Berat']

const jenisBadge = (j: JenisBarang) =>
  j === 'habis_pakai'
    ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-indigo-100 text-indigo-700 border-indigo-200'

const jenisLabel = (j: JenisBarang) =>
  j === 'habis_pakai' ? '🔥 Habis Pakai' : '🏷️ Aset Tetap'

export default function BulkDistribusiPage() {
  const router = useRouter()
  const [ruangans, setRuangans] = useState<Ruangan[]>([])
  const [selectedRuangan, setSelectedRuangan] = useState<number | null>(null)
  const [catatanPengiriman, setCatatanPengiriman] = useState('')
  const [items, setItems] = useState<BarangItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRuangan, setLoadingRuangan] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchSource, setSearchSource] = useState<'all' | 'gudang' | 'sarpras'>('all')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => { fetchRuangans() }, [])

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
      const response = await axios.get('/api/ruangans?jenis=workshop')
      const all: Ruangan[] = Array.isArray(response.data) ? response.data : (response.data?.data ?? [])
      const workshopsOnly = all.filter(r => {
        if (r.jenis && r.jenis !== 'workshop' && r.jenis !== 'bengkel') return false
        const name = (r.nama_ruangan || '').toLowerCase().trim()
        if (name.startsWith('kelas') || name.startsWith('ruang kelas')) return false
        return true
      })
      setRuangans(workshopsOnly)
    } catch (error) {
      console.error('Error fetching ruangans:', error)
    } finally {
      setLoadingRuangan(false)
    }
  }

  const searchBarang = useCallback(async (query: string, source: string) => {
    if (!query || query.length < 2) { setSearchResults([]); setShowSearchResults(false); return }
    setIsSearching(true)
    try {
      const response = await axios.get(`/api/distribusi-asets/search-barang?q=${encodeURIComponent(query)}&source=${source}`)
      setSearchResults(Array.isArray(response.data) ? response.data : [])
      setShowSearchResults(true)
    } catch (error) {
      console.error('Error searching barang:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchBarang(value, searchSource), 300)
  }

  const handleSourceChange = (source: 'all' | 'gudang' | 'sarpras') => {
    setSearchSource(source)
    if (searchQuery.length >= 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => searchBarang(searchQuery, source), 100)
    }
  }

  const addItemFromSearch = (result: SearchResult) => {
    setItems(prev => [...prev, {
      id: `item-${Date.now()}-${Math.random()}`,
      source: result.source,
      sarana_prasarana_id: result.sarana_prasarana_id,
      inventaris_gudang_id: result.inventaris_gudang_id,
      nama_barang: result.nama_barang,
      satuan: result.satuan,
      jumlah: 1,
      stok_gudang: result.source === 'gudang' ? result.stok_akhir : undefined,
      harga_satuan: Number(result.nilai_harga_pembelian) || 0,
      kondisi: result.kondisi || 'Baik',
      keterangan: result.folder_nama || '',
      jenis_barang: result.jenis_barang,
      isNew: false,
    }])
    setSearchQuery(''); setSearchResults([]); setShowSearchResults(false)
  }

  const addNewItem = () => {
    setItems(prev => [...prev, {
      id: `item-${Date.now()}-${Math.random()}`,
      source: 'baru', nama_barang: '', satuan: 'Unit', jumlah: 1,
      harga_satuan: 0, kondisi: 'Baik', keterangan: '',
      jenis_barang: 'tidak_habis_pakai', isNew: true,
    }])
  }

  const updateItem = (id: string, field: keyof BarangItem, value: string | number | boolean) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!selectedRuangan) { setErrorMsg('Pilih ruangan tujuan terlebih dahulu!'); return }
    if (items.length === 0) { setErrorMsg('Tambahkan minimal 1 barang!'); return }
    if (items.some(i => !i.nama_barang.trim() || i.jumlah < 1)) {
      setErrorMsg('Pastikan semua barang memiliki nama dan jumlah yang valid!'); return
    }
    const overStok = items.filter(i => i.source === 'gudang' && i.stok_gudang !== undefined && i.jumlah > i.stok_gudang)
    if (overStok.length > 0) {
      setErrorMsg(`Jumlah melebihi stok gudang: ${overStok.map(i => i.nama_barang).join(', ')}`); return
    }
    setLoading(true)
    try {
      await axios.post('/api/distribusi-asets/bulk', {
        ruangan_tujuan_id: selectedRuangan,
        catatan_pengiriman: catatanPengiriman,
        items: items.map(item => ({
          sarana_prasarana_id: item.source === 'sarpras' ? item.sarana_prasarana_id : null,
          inventaris_gudang_id: item.source === 'gudang' ? item.inventaris_gudang_id : null,
          jenis_barang: item.jenis_barang,
          nama_barang: item.isNew ? item.nama_barang : undefined,
          satuan: item.isNew ? item.satuan : undefined,
          kondisi: item.isNew ? item.kondisi : undefined,
          keterangan: item.keterangan || undefined,
          jumlah: item.jumlah,
          harga_satuan: item.harga_satuan || 0,
        })),
      })
      setSubmitted(true)
      setTimeout(() => router.push('/dashboard/distribusi'), 2000)
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } }
      setErrorMsg(e?.response?.data?.message || 'Gagal melakukan distribusi')
    } finally {
      setLoading(false)
    }
  }

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

  const totalUnit = items.reduce((s, i) => s + i.jumlah, 0)
  const totalNilai = items.reduce((s, i) => s + ((i.harga_satuan || 0) * (i.jumlah || 1)), 0)
  const habisPayCount = items.filter(i => i.jenis_barang === 'habis_pakai').length
  const asetTetapCount = items.filter(i => i.jenis_barang === 'tidak_habis_pakai').length

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => router.back()} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" /> Distribusi Barang ke Workshop
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Distribusikan barang dari Inventaris Gudang atau Sarana &amp; Prasarana ke Workshop Kaprog</p>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="space-y-5">
            {/* Ruangan */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg"><MapPin className="h-4 w-4 text-indigo-600" /></div>
                <h2 className="text-sm font-bold text-slate-800">Workshop Tujuan</h2>
              </div>
              {loadingRuangan ? <div className="h-10 bg-slate-100 rounded-xl animate-pulse" /> : (
                <select value={selectedRuangan ?? ''} onChange={e => setSelectedRuangan(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" required>
                  <option value="">— Pilih Workshop Kaprog —</option>
                  {ruangans.map(r => <option key={r.id} value={r.id}>{r.nama_ruangan} ({r.kode_ruangan})</option>)}
                </select>
              )}
              {selectedRuangan && (() => {
                const r = ruangans.find(ru => ru.id === selectedRuangan)
                return r ? (
                  <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
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
                <div className="p-2 bg-amber-100 rounded-lg"><ClipboardList className="h-4 w-4 text-amber-600" /></div>
                <h2 className="text-sm font-bold text-slate-800">Catatan Pengiriman</h2>
              </div>
              <textarea value={catatanPengiriman} onChange={e => setCatatanPengiriman(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all resize-none"
                rows={4} placeholder="Catatan tambahan untuk pengiriman ini..." />
            </div>

            {/* Summary + Submit */}
            <div className="bg-linear-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Ringkasan</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Total Jenis</span>
                  <span className="font-bold text-lg">{items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Total Unit</span>
                  <span className="font-bold text-lg">{totalUnit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300 flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" /> Habis Pakai</span>
                  <span className="text-orange-300 font-semibold">{habisPayCount} jenis</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300 flex items-center gap-1"><Box className="h-3 w-3 text-indigo-400" /> Aset Tetap</span>
                  <span className="text-indigo-300 font-semibold">{asetTetapCount} jenis</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700/80">
                  <span className="text-xs text-slate-300 font-medium">Estimasi Nilai:</span>
                  <span className="font-bold text-base text-emerald-400">Rp {totalNilai.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <button type="submit" disabled={loading || items.length === 0 || !selectedRuangan}
                className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : <><Send className="h-4 w-4" /> Kirim {items.length} Barang</>}
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Search Barang */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Search className="h-4 w-4 text-blue-600" /></div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Cari &amp; Tambah Barang</h2>
                  <p className="text-[11px] text-slate-400">dari Inventaris Gudang atau Sarana &amp; Prasarana</p>
                </div>
              </div>

              {/* Filter sumber */}
              <div className="flex gap-2 mb-3 flex-wrap">
                {([
                  { key: 'all', label: 'Semua', Icon: Package },
                  { key: 'gudang', label: 'Inventaris Gudang', Icon: Warehouse },
                  { key: 'sarpras', label: 'Sarana & Prasarana', Icon: Box },
                ] as { key: 'all' | 'gudang' | 'sarpras'; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => (
                  <button key={key} type="button" onClick={() => handleSourceChange(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${searchSource === key ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}>
                    <Icon className="h-3 w-3" />{label}
                  </button>
                ))}
              </div>

              <div ref={searchRef} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input type="text" value={searchQuery} onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  placeholder="Ketik nama barang atau kode untuk mencari..."
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  autoComplete="off" />
                {isSearching ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 animate-spin" />
                  : searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}

                {showSearchResults && (
                  <div className="absolute z-30 w-full top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">{searchQuery.length < 2 ? 'Ketik minimal 2 karakter' : 'Tidak ada barang ditemukan'}</p>
                      </div>
                    ) : (
                      <>
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                          <span className="text-[11px] text-slate-500 font-medium">{searchResults.length} barang ditemukan</span>
                        </div>
                        <ul className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                          {searchResults.map(result => (
                            <li key={result.id}>
                              <button type="button" onClick={() => addItemFromSearch(result)}
                                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 group">
                                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors ${result.source === 'gudang' ? 'bg-orange-100 group-hover:bg-orange-200' : 'bg-slate-100 group-hover:bg-blue-100'}`}>
                                  {result.source === 'gudang' ? <Warehouse className="h-3.5 w-3.5 text-orange-600" /> : <Package className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-semibold text-sm text-slate-800 truncate">{result.nama_barang}</p>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${result.source === 'gudang' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                      {result.source === 'gudang' ? '📦 Gudang' : '🗄️ Sarpras'}
                                    </span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${jenisBadge(result.jenis_barang)}`}>{jenisLabel(result.jenis_barang)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {result.kode && <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{result.kode}</span>}
                                    <span className="text-xs text-slate-500">Stok: <strong className={result.stok_akhir <= 0 ? 'text-red-600' : ''}>{result.stok_akhir}</strong> {result.satuan}</span>
                                    {result.nilai_harga_pembelian ? <span className="text-xs font-bold text-emerald-600">Rp {Number(result.nilai_harga_pembelian).toLocaleString('id-ID')}</span> : null}
                                  </div>
                                  {result.folder_nama && <p className="text-[10px] text-blue-600 mt-0.5">📁 {result.folder_nama}</p>}
                                </div>
                                <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 shrink-0 mt-1 transition-opacity">+ Tambah</span>
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
                  <div className="p-2 bg-emerald-100 rounded-lg"><ClipboardList className="h-4 w-4 text-emerald-600" /></div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Daftar Barang</h2>
                    <p className="text-[11px] text-slate-400">{items.length} item</p>
                  </div>
                </div>
                <button type="button" onClick={addNewItem} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">
                  <Plus className="h-3.5 w-3.5" /> Tambah Manual
                </button>
              </div>

              {items.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-500 mb-1">Belum Ada Barang</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">Cari barang dari Gudang/Sarpras di atas, atau tambah manual</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id}
                      className={`rounded-xl border p-4 ${item.source === 'gudang' ? 'bg-orange-50/40 border-orange-200' : item.source === 'sarpras' ? 'bg-blue-50/30 border-blue-200' : 'bg-yellow-50/50 border-yellow-200'}`}>
                      {/* Header item */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-500">#{index + 1}</span>
                          {item.source === 'gudang' && <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-bold border border-orange-300">📦 Inventaris Gudang</span>}
                          {item.source === 'sarpras' && <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold border border-blue-300">🗄️ Sarana &amp; Prasarana</span>}
                          {item.source === 'baru' && <span className="text-[10px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full font-bold border border-yellow-300">✏️ Barang Baru</span>}
                          {item.source === 'gudang' && item.stok_gudang !== undefined && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${item.jumlah > item.stok_gudang ? 'bg-red-100 text-red-700 border-red-300' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              Stok gudang: {item.stok_gudang} {item.satuan}
                            </span>
                          )}
                        </div>
                        <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {/* Nama Barang */}
                        <div className="col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Nama Barang *</label>
                          <input type="text" value={item.nama_barang}
                            onChange={e => updateItem(item.id, 'nama_barang', e.target.value)}
                            disabled={!item.isNew}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-100 disabled:text-slate-600 transition-all"
                            placeholder="Nama barang..." required />
                        </div>

                        {/* ✅ DROPDOWN JENIS BARANG */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            Jenis Barang <span className="text-red-500">*</span>
                          </label>
                          <select value={item.jenis_barang}
                            onChange={e => updateItem(item.id, 'jenis_barang', e.target.value as JenisBarang)}
                            className={`w-full border rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-semibold ${item.jenis_barang === 'habis_pakai' ? 'bg-orange-50 border-orange-300 text-orange-800' : 'bg-indigo-50 border-indigo-300 text-indigo-800'}`}>
                            <option value="tidak_habis_pakai">🏷️ Aset Tetap</option>
                            <option value="habis_pakai">🔥 Habis Pakai</option>
                          </select>
                          <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                            {item.jenis_barang === 'habis_pakai' ? 'Kaprog bisa kurangi unit saat dipakai' : 'Hanya edit kondisi / ajukan servis'}
                          </p>
                        </div>

                        {/* Satuan */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Satuan</label>
                          <input type="text" value={item.satuan}
                            onChange={e => updateItem(item.id, 'satuan', e.target.value)}
                            disabled={!item.isNew}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-100 transition-all"
                            placeholder="Unit, Pcs..." />
                        </div>

                        {/* Jumlah */}
                        <div>
                          <label className="block text-[10px] font-semibold text-blue-700 mb-1">Jumlah *</label>
                          <input type="number" min="1"
                            max={item.source === 'gudang' && item.stok_gudang !== undefined ? item.stok_gudang : undefined}
                            value={item.jumlah}
                            onChange={e => updateItem(item.id, 'jumlah', Number(e.target.value))}
                            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 font-bold transition-all ${item.source === 'gudang' && item.stok_gudang !== undefined && item.jumlah > item.stok_gudang ? 'bg-red-50 border-red-400 text-red-800 focus:ring-red-400' : 'bg-blue-50 border-blue-200 text-blue-800 focus:ring-blue-400'}`}
                            required />
                          {item.source === 'gudang' && item.stok_gudang !== undefined && item.jumlah > item.stok_gudang && (
                            <p className="text-[9px] text-red-600 mt-0.5">⚠ Melebihi stok gudang ({item.stok_gudang})</p>
                          )}
                        </div>

                        {/* Harga Satuan */}
                        <div>
                          <label className="block text-[10px] font-semibold text-emerald-700 mb-1">Harga Satuan (Rp)</label>
                          <input type="number" min="0" value={item.harga_satuan || ''}
                            onChange={e => updateItem(item.id, 'harga_satuan', Number(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-emerald-50/70 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-semibold text-emerald-800 transition-all" />
                        </div>

                        {/* Subtotal */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Subtotal</label>
                          <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-100 font-bold text-slate-800 truncate">
                            Rp {((item.harga_satuan || 0) * (item.jumlah || 1)).toLocaleString('id-ID')}
                          </div>
                        </div>

                        {/* Kondisi (hanya barang baru) */}
                        {item.isNew && (
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">Kondisi</label>
                            <select value={item.kondisi}
                              onChange={e => updateItem(item.id, 'kondisi', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all">
                              {kondisiOptions.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                          </div>
                        )}

                        {/* Keterangan */}
                        <div className={item.isNew ? '' : 'col-span-2'}>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">Keterangan</label>
                          <input type="text" value={item.keterangan}
                            onChange={e => updateItem(item.id, 'keterangan', e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                            placeholder="Keterangan..." />
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
