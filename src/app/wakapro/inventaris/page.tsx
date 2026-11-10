'use client'

import React, { useState, useEffect, useCallback } from 'react'
import axios from '@/lib/axios'
import {
  Package, Search, CheckCircle2, AlertTriangle, Warehouse,
  FileText, Filter, RefreshCw, Info, Edit, X, Flame,
  Box, Minus, History, ChevronDown, ChevronUp, Loader2
} from 'lucide-react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardDivider, MobileCardActions } from '@/components/MobileCard'
import { useNotification } from '@/hooks/useNotification'
import { showErrorAlert } from '@/utils/errorHandler'

type JenisBarang = 'habis_pakai' | 'tidak_habis_pakai'

interface RiwayatPemakaian {
  id: number
  jumlah_pakai: number
  sisa_sebelumnya: number
  sisa_setelahnya: number
  tanggal_pemakaian: string
  keperluan: string | null
  user?: { nama_lengkap: string }
}

interface InventarisItem {
  id: number
  nomor_surat_jalan: string
  nomor_bast: string | null
  jumlah: number
  sisa_unit: number | null
  jenis_barang: JenisBarang | null
  tanggal_kirim: string
  tanggal_terima: string | null
  catatan_penerimaan: string | null
  sarana_prasarana: {
    id: number
    kode: string
    nama_barang: string
    satuan: string
    kondisi: string
    keterangan: string | null
    nilai_harga_pembelian?: number
    nilai_harga_sekarang?: number
  }
  inventaris_gudang?: {
    id: number
    nama_barang: string
    kode: string
    satuan: string
  } | null
  petugas_pengirim: { nama_lengkap: string }
  riwayat_pemakaian?: RiwayatPemakaian[]
}

interface Summary {
  total_unit: number
  total_jenis: number
  total_nilai: number
  kondisi_baik: number
  kondisi_rusak: number
}

interface Ruangan {
  id: number
  nama_ruangan: string
  kode_ruangan: string
  gedung?: { nama_gedung: string }
}

export default function InventarisWorkshopPage() {
  const isMobile = useIsMobile()
  const { success, error: showError } = useNotification()
  const [items, setItems] = useState<InventarisItem[]>([])
  const [summary, setSummary] = useState<Summary>({ total_unit: 0, total_jenis: 0, total_nilai: 0, kondisi_baik: 0, kondisi_rusak: 0 })
  const [ruangan, setRuangan] = useState<Ruangan | null>(null)
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterKondisi, setFilterKondisi] = useState('')

  // Modal Edit Kondisi
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventarisItem | null>(null)
  const [selectedKondisi, setSelectedKondisi] = useState('')
  const [catatan, setCatatan] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Modal Pakai Barang (Habis Pakai)
  const [showPakaiModal, setShowPakaiModal] = useState(false)
  const [pakaiItem, setPakaiItem] = useState<InventarisItem | null>(null)
  const [jumlahPakai, setJumlahPakai] = useState(1)
  const [keperluanPakai, setKeperluanPakai] = useState('')
  const [tanggalPakai, setTanggalPakai] = useState(() => new Date().toISOString().split('T')[0])
  const [submittingPakai, setSubmittingPakai] = useState(false)

  // Riwayat Pemakaian (expand per baris)
  const [expandedRiwayat, setExpandedRiwayat] = useState<number | null>(null)
  const [riwayatData, setRiwayatData] = useState<Record<number, RiwayatPemakaian[]>>({})
  const [loadingRiwayat, setLoadingRiwayat] = useState<number | null>(null)

  const fetchInventaris = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterKondisi) params.set('kondisi', filterKondisi)

      const res = await axios.get(`/api/workshop/inventaris?${params.toString()}`)
      setItems(res.data.items ?? [])
      setSummary(res.data.summary ?? { total_unit: 0, total_jenis: 0, total_nilai: 0, kondisi_baik: 0, kondisi_rusak: 0 })
      setRuangan(res.data.ruangan ?? null)
      setWarning(res.data.warning ?? null)
    } catch (err) {
      console.error('Gagal memuat inventaris workshop:', err)
    } finally {
      setLoading(false)
    }
  }, [search, filterKondisi])

  useEffect(() => { fetchInventaris() }, [fetchInventaris])

  // ── Edit Kondisi ──
  const openEditModal = (item: InventarisItem) => {
    setEditingItem(item)
    setSelectedKondisi(item.sarana_prasarana.kondisi)
    setCatatan(item.sarana_prasarana.keterangan || '')
    setShowEditModal(true)
  }
  const closeEditModal = () => { setShowEditModal(false); setEditingItem(null); setSelectedKondisi(''); setCatatan('') }

  const handleUpdateKondisi = async () => {
    if (!editingItem || !selectedKondisi) return
    setSubmitting(true)
    try {
      await axios.put(`/api/workshop/inventaris/${editingItem.id}/kondisi`, {
        kondisi: selectedKondisi,
        catatan: catatan.trim() || null,
      })
      const isDamaged = ['Rusak Ringan', 'Rusak Berat', 'Tidak Layak Pakai'].includes(selectedKondisi)
      success(isDamaged ? 'Kondisi aset diperbarui & laporan kerusakan dikirimkan ke Admin' : 'Kondisi aset berhasil diperbarui')
      closeEditModal()
      fetchInventaris()
    } catch (err: unknown) {
      showErrorAlert(err, 'Gagal Memperbarui Kondisi Aset')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Pakai Barang Habis Pakai ──
  const openPakaiModal = (item: InventarisItem) => {
    setPakaiItem(item)
    setJumlahPakai(1)
    setKeperluanPakai('')
    setTanggalPakai(new Date().toISOString().split('T')[0])
    setShowPakaiModal(true)
  }
  const closePakaiModal = () => { setShowPakaiModal(false); setPakaiItem(null) }

  const handlePakaiBarang = async () => {
    if (!pakaiItem) return
    setSubmittingPakai(true)
    try {
      await axios.post(`/api/workshop/inventaris/${pakaiItem.id}/pakai`, {
        jumlah_pakai: jumlahPakai,
        keperluan: keperluanPakai.trim() || null,
        tanggal_pemakaian: tanggalPakai,
      })
      const namaBarang = pakaiItem.inventaris_gudang?.nama_barang ?? pakaiItem.sarana_prasarana.nama_barang
      success(`Berhasil mencatat pemakaian ${jumlahPakai} unit ${namaBarang}`)
      closePakaiModal()
      fetchInventaris()
      // Reset riwayat cache agar reload saat expand
      setRiwayatData(prev => { const n = { ...prev }; delete n[pakaiItem.id]; return n })
    } catch (err: unknown) {
      showErrorAlert(err, 'Gagal Mencatat Pemakaian Barang')
    } finally {
      setSubmittingPakai(false)
    }
  }

  // ── Riwayat Pemakaian Toggle ──
  const toggleRiwayat = async (itemId: number) => {
    if (expandedRiwayat === itemId) { setExpandedRiwayat(null); return }
    setExpandedRiwayat(itemId)
    if (!riwayatData[itemId]) {
      setLoadingRiwayat(itemId)
      try {
        const res = await axios.get(`/api/workshop/inventaris/${itemId}/riwayat-pemakaian`)
        setRiwayatData(prev => ({ ...prev, [itemId]: res.data.riwayat ?? [] }))
      } catch {
        setRiwayatData(prev => ({ ...prev, [itemId]: [] }))
      } finally {
        setLoadingRiwayat(null)
      }
    }
  }

  // ── Helpers ──
  const getNamaBarang = (item: InventarisItem) =>
    item.inventaris_gudang?.nama_barang ?? item.sarana_prasarana.nama_barang
  const getKode = (item: InventarisItem) =>
    item.inventaris_gudang?.kode ?? item.sarana_prasarana.kode
  const getSatuan = (item: InventarisItem) =>
    item.inventaris_gudang?.satuan ?? item.sarana_prasarana.satuan ?? 'Unit'
  const getSisaUnit = (item: InventarisItem) =>
    item.sisa_unit !== null ? item.sisa_unit : item.jumlah
  const isHabisPakai = (item: InventarisItem) => item.jenis_barang === 'habis_pakai'

  const formatRupiah = (amount: number | undefined | null) => {
    if (!amount || amount === 0) return '-'
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
  }

  const kesiapanPersen = summary.total_unit > 0 ? Math.round((summary.kondisi_baik / summary.total_unit) * 100) : 100

  const getKondisiBadge = (kondisi: string) => {
    if (kondisi === 'Baik') return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    if (kondisi === 'Rusak Ringan') return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
    return 'bg-red-50 text-red-700 border border-red-200'
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Warehouse className="h-5 w-5 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900">Inventaris Workshop Saya</h1>
            </div>
            <p className="text-xs text-slate-500">
              {ruangan
                ? <><span>Aset aktif di </span><span className="font-semibold text-slate-700">{ruangan.nama_ruangan}</span>{ruangan.gedung ? ` — ${ruangan.gedung.nama_gedung}` : ''}</>
                : 'Daftar seluruh aset yang sudah diterima melalui distribusi dan BAST resmi'}
            </p>
          </div>
          <button onClick={fetchInventaris} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {warning && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <span>{warning}</span>
        </div>
      )}

      <div className="flex items-start gap-2.5 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <span>
          Inventaris ini hanya menampilkan barang yang sudah melalui proses{' '}
          <strong>Distribusi → Konfirmasi Penerimaan → BAST</strong> ke workshop Anda.
          Barang <strong className="text-orange-700">🔥 Habis Pakai</strong> dapat dikurangi unitnya secara mandiri.
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Total Unit (Sisa)</p>
          {loading ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse" /> : (
            <p className="text-2xl font-black text-slate-900">{summary.total_unit.toLocaleString('id-ID')}</p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">{summary.total_jenis} jenis barang</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Total Nilai Aset</p>
          {loading ? <div className="h-7 w-24 bg-slate-100 rounded animate-pulse" /> : (
            <p className="text-base font-black text-emerald-700 leading-tight">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(summary.total_nilai ?? 0)}
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">akumulasi dari distribusi BAST</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Kondisi Baik</p>
          {loading ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse" /> : (
            <p className="text-2xl font-black text-blue-600">{summary.kondisi_baik.toLocaleString('id-ID')}</p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">unit siap pakai</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Kesiapan</p>
          {loading ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse" /> : (
            <p className="text-2xl font-black text-indigo-600">{kesiapanPersen}%</p>
          )}
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${kesiapanPersen}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{summary.kondisi_rusak} unit perlu servis</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input type="text" placeholder="Cari nama barang atau kode..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select value={filterKondisi} onChange={e => setFilterKondisi(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all">
            <option value="">Semua Kondisi</option>
            <option value="Baik">Baik</option>
            <option value="Cukup Baik">Cukup Baik</option>
            <option value="Rusak Ringan">Rusak Ringan</option>
            <option value="Rusak Berat">Rusak Berat</option>
          </select>
        </div>
      </div>

      {/* Tabel Desktop */}
      {!isMobile && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Barang</th>
                  <th className="py-3.5 px-4">Kode</th>
                  <th className="py-3.5 px-4 text-center">Jenis</th>
                  <th className="py-3.5 px-4 text-center">Jumlah / Sisa</th>
                  <th className="py-3.5 px-4 text-center">Kondisi</th>
                  <th className="py-3.5 px-4">No. BAST</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="py-3 px-4">
                        <div className="h-5 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold">Belum ada aset yang masuk ke workshop ini</p>
                    </td>
                  </tr>
                ) : items.map(item => {
                  const namaBarang = getNamaBarang(item)
                  const kode = getKode(item)
                  const satuan = getSatuan(item)
                  const sisaUnit = getSisaUnit(item)
                  const habis = isHabisPakai(item)
                  const isExpanded = expandedRiwayat === item.id

                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${sisaUnit === 0 && habis ? 'opacity-60' : ''}`}>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{namaBarang}</p>
                          {item.inventaris_gudang && (
                            <p className="text-[10px] text-orange-600 mt-0.5">📦 Dari Inventaris Gudang</p>
                          )}
                          <p className="text-[11px] text-slate-400 mt-0.5">Dikirim oleh: {item.petugas_pengirim?.nama_lengkap}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">{kode}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {habis ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                              <Flame className="h-2.5 w-2.5" /> Habis Pakai
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                              <Box className="h-2.5 w-2.5" /> Aset Tetap
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {habis ? (
                            <div>
                              <p className="font-extrabold text-slate-900">
                                <span className={sisaUnit === 0 ? 'text-red-600' : 'text-emerald-700'}>{sisaUnit}</span>
                                <span className="text-slate-400 font-normal text-[10px]"> / {item.jumlah} {satuan}</span>
                              </p>
                              <p className="text-[9px] text-slate-400">sisa / total</p>
                              {sisaUnit === 0 && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">HABIS</span>}
                            </div>
                          ) : (
                            <span className="font-extrabold text-slate-900">
                              {item.jumlah} <span className="text-slate-400 font-normal">{satuan}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${getKondisiBadge(item.sarana_prasarana.kondisi)}`}>
                            {item.sarana_prasarana.kondisi === 'Baik' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            {item.sarana_prasarana.kondisi}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.nomor_bast ? (
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                              <FileText className="h-3.5 w-3.5 text-emerald-500" />
                              {item.nomor_bast}
                            </div>
                          ) : <span className="text-slate-400">-</span>}
                          <p className="text-[11px] text-slate-400 mt-0.5">SJ: {item.nomor_surat_jalan}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 justify-center flex-wrap">
                            {/* Tombol Edit Kondisi (selalu ada) */}
                            <button onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all"
                              title="Edit Kondisi">
                              <Edit className="h-3 w-3" /> Kondisi
                            </button>

                            {/* Tombol Pakai Barang (hanya Habis Pakai & sisa > 0) */}
                            {habis && (
                              <button onClick={() => openPakaiModal(item)}
                                disabled={sisaUnit === 0}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-bold transition-all"
                                title="Kurangi / Gunakan Unit">
                                <Minus className="h-3 w-3" /> Gunakan
                              </button>
                            )}

                            {/* Tombol Riwayat Pemakaian (hanya Habis Pakai) */}
                            {habis && (
                              <button onClick={() => toggleRiwayat(item.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all border border-slate-200"
                                title="Lihat Riwayat Pemakaian">
                                <History className="h-3 w-3" />
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Row Riwayat Pemakaian (expand) */}
                      {habis && isExpanded && (
                        <tr key={`riwayat-${item.id}`}>
                          <td colSpan={7} className="bg-orange-50/60 border-t border-orange-100 px-6 py-4">
                            <div className="flex items-center gap-2 mb-3">
                              <History className="h-3.5 w-3.5 text-orange-600" />
                              <p className="text-xs font-bold text-orange-700">Riwayat Pemakaian: {namaBarang}</p>
                            </div>
                            {loadingRiwayat === item.id ? (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat riwayat...
                              </div>
                            ) : (riwayatData[item.id] ?? []).length === 0 ? (
                              <p className="text-xs text-slate-400 italic">Belum ada riwayat pemakaian.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-[11px] text-left">
                                  <thead>
                                    <tr className="text-slate-500 font-semibold">
                                      <th className="pb-2 pr-4">Tanggal</th>
                                      <th className="pb-2 pr-4 text-center">Pakai</th>
                                      <th className="pb-2 pr-4 text-center">Sisa Sesudah</th>
                                      <th className="pb-2 pr-4">Keperluan</th>
                                      <th className="pb-2">Dicatat Oleh</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-orange-100">
                                    {(riwayatData[item.id] ?? []).map(r => (
                                      <tr key={r.id} className="text-slate-700">
                                        <td className="py-1.5 pr-4 font-medium">
                                          {new Date(r.tanggal_pemakaian).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="py-1.5 pr-4 text-center font-bold text-orange-700">-{r.jumlah_pakai} {satuan}</td>
                                        <td className="py-1.5 pr-4 text-center font-semibold">{r.sisa_setelahnya} {satuan}</td>
                                        <td className="py-1.5 pr-4">{r.keperluan || <span className="text-slate-400 italic">-</span>}</td>
                                        <td className="py-1.5">{r.user?.nama_lengkap || <span className="text-slate-400">-</span>}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Cards */}
      {isMobile && (
        <div className="space-y-3">
          {loading ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          )) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <Package className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="font-semibold text-slate-500 text-sm">Belum ada aset</p>
            </div>
          ) : items.map(item => {
            const namaBarang = getNamaBarang(item)
            const kode = getKode(item)
            const satuan = getSatuan(item)
            const sisaUnit = getSisaUnit(item)
            const habis = isHabisPakai(item)

            return (
              <MobileCard key={item.id}>
                <MobileCardHeader
                  title={namaBarang}
                  badge={
                    habis ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                        🔥 Habis Pakai
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                        🏷️ Aset Tetap
                      </span>
                    )
                  }
                />
                <MobileCardRow label="Kode" value={kode} />
                <MobileCardRow label="Kondisi" value={item.sarana_prasarana.kondisi} />
                {habis ? (
                  <MobileCardRow label="Sisa Unit" value={`${sisaUnit} / ${item.jumlah} ${satuan}`} />
                ) : (
                  <MobileCardRow label="Jumlah" value={`${item.jumlah} ${satuan}`} />
                )}
                <MobileCardRow label="No. BAST" value={item.nomor_bast || '-'} />
                <MobileCardDivider />
                <MobileCardActions>
                  <button onClick={() => openEditModal(item)}
                    className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
                    <Edit className="h-3 w-3" /> Kondisi
                  </button>
                  {habis && (
                    <button onClick={() => openPakaiModal(item)} disabled={sisaUnit === 0}
                      className="flex items-center gap-1 px-3 py-2 bg-orange-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold">
                      <Minus className="h-3 w-3" /> Gunakan
                    </button>
                  )}
                </MobileCardActions>
              </MobileCard>
            )
          })}
        </div>
      )}

      {/* ── Modal Edit Kondisi ── */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit className="h-4 w-4 text-indigo-600" /> Edit Kondisi Aset
              </h3>
              <button onClick={closeEditModal} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Barang</p>
                <p className="text-sm font-bold text-slate-800">{getNamaBarang(editingItem)}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kondisi Baru</label>
                <select value={selectedKondisi} onChange={e => setSelectedKondisi(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  {['Baik', 'Cukup Baik', 'Rusak Ringan', 'Rusak Berat', 'Tidak Layak Pakai'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan</label>
                <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="Deskripsi kerusakan atau catatan kondisi..." />
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={closeEditModal} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={handleUpdateKondisi} disabled={submitting}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5">
                {submitting ? <><Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...</> : 'Simpan Kondisi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Pakai Barang ── */}
      {showPakaiModal && pakaiItem && (() => {
        const namaBarang = getNamaBarang(pakaiItem)
        const satuan = getSatuan(pakaiItem)
        const sisaUnit = getSisaUnit(pakaiItem)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" /> Catat Pemakaian Barang
                </h3>
                <button onClick={closePakaiModal} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <p className="text-xs text-orange-600 font-medium">{namaBarang}</p>
                  <p className="text-sm font-bold text-orange-800 mt-0.5">
                    Sisa tersedia: <span className="text-lg">{sisaUnit}</span> {satuan}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Jumlah yang Digunakan <span className="text-red-500">*</span>
                  </label>
                  <input type="number" min={1} max={sisaUnit} value={jumlahPakai}
                    onChange={e => setJumlahPakai(Math.min(sisaUnit, Math.max(1, Number(e.target.value))))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all font-bold text-orange-800" />
                  {jumlahPakai > 0 && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Sisa setelah pemakaian: <strong className="text-orange-700">{sisaUnit - jumlahPakai} {satuan}</strong>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tanggal Pemakaian</label>
                  <input type="date" value={tanggalPakai} onChange={e => setTanggalPakai(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Keperluan / Catatan</label>
                  <textarea value={keperluanPakai} onChange={e => setKeperluanPakai(e.target.value)} rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all resize-none"
                    placeholder="Contoh: Digunakan untuk ujian praktik kelas XI TKJ semester ganjil" />
                </div>
              </div>
              <div className="flex gap-3 p-5 pt-0">
                <button onClick={closePakaiModal} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">
                  Batal
                </button>
                <button onClick={handlePakaiBarang} disabled={submittingPakai || jumlahPakai < 1 || jumlahPakai > sisaUnit}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5">
                  {submittingPakai ? <><Loader2 className="h-3 w-3 animate-spin" /> Menyimpan...</> : <><Minus className="h-3 w-3" /> Konfirmasi Pemakaian</>}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
