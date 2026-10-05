'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import {
  generateSuratJalan,
  generateBast,
  generateSuratJalanBulk,
  type SuratJalanBulkApiResponse,
} from '@/lib/printDokumen'
import {
  Printer,
  FileCheck2,
  Loader2,
  Truck,
  Package,
  CheckCircle2,
  Ban,
  Clock,
  AlertTriangle,
  Eye,
  X,
  Search,
  Calendar,
  User,
  FileText
} from 'lucide-react'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Distribusi {
  id: number
  nomor_surat_jalan: string
  nomor_pengiriman: string | null
  nomor_bast: string | null
  jumlah: number
  harga_satuan?: number
  total_harga?: number
  tanggal_kirim: string
  tanggal_terima: string | null
  status: string
  catatan_pengiriman: string | null
  catatan_penerimaan?: string | null
  foto_kerusakan_url?: string | null
  sarana_prasarana: { nama_barang: string; kode: string; kondisi?: string; satuan?: string }
  ruangan_tujuan: { nama_ruangan: string; gedung?: { nama_gedung: string } | null }
  petugas_pengirim: { nama_lengkap: string }
  wakapro_penerima: { nama_lengkap: string } | null
}

/** Grup lokal — dibentuk di frontend dari flat array API */
interface DistribusiGrup {
  type: 'bulk' | 'single'
  nomor_pengiriman: string | null
  /** Key unik untuk accordion (nomor_pengiriman atau "single-{id}") */
  key: string
  tanggal_kirim: string
  ruangan_tujuan: Distribusi['ruangan_tujuan']
  petugas_pengirim: Distribusi['petugas_pengirim']
  catatan_pengiriman: string | null
  /** Status dominan: menunggu_konfirmasi > sebagian > diterima/ditolak */
  status: string
  items: Distribusi[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
  const m: Record<string, string> = {
    menunggu_konfirmasi: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    diterima:            'bg-green-100 text-green-800 border-green-200',
    ditolak:             'bg-red-100 text-red-800 border-red-200',
    sebagian:            'bg-amber-100 text-amber-800 border-amber-200',
  }
  return m[status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
}

const getStatusLabel = (status: string) => {
  const m: Record<string, string> = {
    menunggu_konfirmasi: 'Menunggu',
    diterima:            'Diterima (BAST)',
    ditolak:             'Ditolak',
    sebagian:            'Sebagian',
  }
  return m[status] ?? status
}

const getStatusIcon = (status: string) => {
  if (status === 'diterima') return <CheckCircle2 className="h-3 w-3" />
  if (status === 'ditolak')  return <Ban className="h-3 w-3" />
  if (status === 'sebagian') return <AlertTriangle className="h-3 w-3" />
  return <Clock className="h-3 w-3" />
}

/** Hitung status grup dari daftar status item */
function resolveGrupStatus(statuses: string[]): string {
  const uniq = [...new Set(statuses)]
  if (uniq.length === 1) return uniq[0]
  if (uniq.includes('menunggu_konfirmasi')) return 'menunggu_konfirmasi'
  return 'sebagian'
}

/** Group flat array ke DistribusiGrup[] */
function groupDistribusi(flat: Distribusi[]): DistribusiGrup[] {
  const bulkMap = new Map<string, DistribusiGrup>()
  const result: DistribusiGrup[] = []

  for (const item of flat) {
    if (item.nomor_pengiriman) {
      const existing = bulkMap.get(item.nomor_pengiriman)
      if (existing) {
        existing.items.push(item)
        existing.status = resolveGrupStatus(existing.items.map(i => i.status))
      } else {
        const grup: DistribusiGrup = {
          type: 'bulk',
          nomor_pengiriman: item.nomor_pengiriman,
          key: item.nomor_pengiriman,
          tanggal_kirim: item.tanggal_kirim,
          ruangan_tujuan: item.ruangan_tujuan,
          petugas_pengirim: item.petugas_pengirim,
          catatan_pengiriman: item.catatan_pengiriman,
          status: item.status,
          items: [item],
        }
        bulkMap.set(item.nomor_pengiriman, grup)
        result.push(grup)
      }
    } else {
      result.push({
        type: 'single',
        nomor_pengiriman: null,
        key: `single-${item.id}`,
        tanggal_kirim: item.tanggal_kirim,
        ruangan_tujuan: item.ruangan_tujuan,
        petugas_pengirim: item.petugas_pengirim,
        catatan_pengiriman: item.catatan_pengiriman,
        status: item.status,
        items: [item],
      })
    }
  }

  return result
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

export default function DistribusiPage() {
  const router = useRouter()

  const [flatList, setFlatList]     = useState<Distribusi[]>([])
  const [loading, setLoading]       = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Accordion
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  // Detail & Lightbox state
  const [detailItem, setDetailItem]     = useState<Distribusi | null>(null)
  const [lightboxUrl, setLightboxUrl]   = useState<string | null>(null)

  // Print state
  const [printingId, setPrintingId]     = useState<number | null>(null)
  const [printingBastId, setPrintingBastId] = useState<number | null>(null)
  const [printingBulk, setPrintingBulk] = useState<string | null>(null)

  useEffect(() => { fetchDistribusi() }, [filterStatus])

  const fetchDistribusi = async () => {
    setLoading(true)
    try {
      const url = filterStatus
        ? `/api/distribusi-asets?status=${filterStatus}`
        : '/api/distribusi-asets'
      const { data } = await axios.get(url)
      setFlatList(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching distribusi:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Print handlers ────────────────────────────────────────────────────────

  const handleCetakSuratJalan = useCallback(async (id: number) => {
    setPrintingId(id)
    try {
      const { data } = await axios.get(`/api/distribusi-asets/${id}/surat-jalan`)
      generateSuratJalan(data)
    } catch (err) {
      console.error('Gagal cetak surat jalan:', err)
      alert('Gagal mengambil data surat jalan.')
    } finally {
      setPrintingId(null)
    }
  }, [])

  const handleCetakBast = useCallback(async (id: number) => {
    setPrintingBastId(id)
    try {
      const { data } = await axios.get(`/api/distribusi-asets/${id}/bast`)
      generateBast(data)
    } catch (err) {
      console.error('Gagal cetak BAST:', err)
      alert('Gagal mengambil data BAST.')
    } finally {
      setPrintingBastId(null)
    }
  }, [])

  const handleCetakSuratJalanBulk = useCallback(async (nomorPengiriman: string) => {
    setPrintingBulk(nomorPengiriman)
    try {
      const { data } = await axios.get(
        `/api/distribusi-asets/bulk/${encodeURIComponent(nomorPengiriman)}/surat-jalan`
      )
      generateSuratJalanBulk(data as SuratJalanBulkApiResponse)
    } catch (err) {
      console.error('Gagal cetak surat jalan bulk:', err)
      alert('Gagal mengambil data surat jalan bulk.')
    } finally {
      setPrintingBulk(null)
    }
  }, [])

  const toggleKey = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Filter pencarian
  const filteredFlat = flatList.filter(item => {
    const q = searchTerm.toLowerCase()
    return (
      item.nomor_surat_jalan.toLowerCase().includes(q) ||
      (item.nomor_pengiriman && item.nomor_pengiriman.toLowerCase().includes(q)) ||
      (item.nomor_bast && item.nomor_bast.toLowerCase().includes(q)) ||
      item.sarana_prasarana.nama_barang.toLowerCase().includes(q) ||
      (item.sarana_prasarana.kode && item.sarana_prasarana.kode.toLowerCase().includes(q)) ||
      (item.ruangan_tujuan?.nama_ruangan && item.ruangan_tujuan.nama_ruangan.toLowerCase().includes(q))
    )
  })

  const grupList = groupDistribusi(filteredFlat)

  const totalMenunggu = flatList.filter(i => i.status === 'menunggu_konfirmasi').length
  const totalDiterima = flatList.filter(i => i.status === 'diterima').length
  const totalDitolak  = flatList.filter(i => i.status === 'ditolak').length

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Foto Kerusakan"
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain"
          />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                <Truck className="h-5 w-5" />
              </div>
              Distribusi Aset &amp; Riwayat BAST
            </h1>
            <p className="text-sm text-slate-500 mt-1 ml-11">
              Pantau pengiriman aset ke workshop dengan Surat Jalan serta riwayat penerimaan Berita Acara Serah Terima (BAST)
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/distribusi/bulk')}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xs shadow-sm shadow-blue-500/20 flex items-center gap-2 transition"
          >
            <Package className="h-4 w-4" />
            Distribusi Bulk Baru
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pengiriman</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{flatList.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-amber-200">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Menunggu Konfirmasi</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">{totalMenunggu}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-200">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Sudah Diterima (BAST)</p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1">{totalDiterima}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-rose-200">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Ditolak</p>
            <p className="text-2xl font-extrabold text-rose-700 mt-1">{totalDitolak}</p>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setFilterStatus('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterStatus === '' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({flatList.length})
            </button>
            <button
              onClick={() => setFilterStatus('menunggu_konfirmasi')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === 'menunggu_konfirmasi' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="h-3 w-3" />
              Menunggu ({totalMenunggu})
            </button>
            <button
              onClick={() => setFilterStatus('diterima')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === 'diterima' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              Sudah BAST ({totalDiterima})
            </button>
            <button
              onClick={() => setFilterStatus('ditolak')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === 'ditolak' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Ban className="h-3 w-3" />
              Ditolak ({totalDitolak})
            </button>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari SJ, BAST, barang, ruangan..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            <p className="mt-2 text-xs text-slate-500">Memuat riwayat pengiriman &amp; BAST...</p>
          </div>
        ) : grupList.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Truck className="h-12 w-12 opacity-20 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">Tidak ada data distribusi</p>
            <button
              onClick={() => router.push('/dashboard/distribusi/bulk')}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
            >
              Buat Distribusi Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {grupList.map(grup => {
              const isOpen   = expandedKeys.has(grup.key)
              const isBulk   = grup.type === 'bulk'
              const totalUnit = grup.items.reduce((s, i) => s + i.jumlah, 0)

              const borderClass =
                grup.status === 'diterima'            ? 'border-green-300' :
                grup.status === 'ditolak'             ? 'border-red-300' :
                grup.status === 'sebagian'            ? 'border-amber-300' :
                grup.status === 'menunggu_konfirmasi' ? 'border-yellow-300' :
                'border-gray-200'

              const headerBg =
                grup.status === 'diterima'            ? 'bg-green-50' :
                grup.status === 'ditolak'             ? 'bg-red-50' :
                grup.status === 'sebagian'            ? 'bg-amber-50' :
                grup.status === 'menunggu_konfirmasi' ? 'bg-yellow-50' :
                'bg-gray-50'

              return (
                <div key={grup.key} className={`rounded-xl border-2 ${borderClass} overflow-hidden shadow-sm`}>

                  {/* ── Header accordion ── */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleKey(grup.key)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleKey(grup.key) } }}
                    className={`w-full ${headerBg} px-4 py-3 flex items-center justify-between gap-3 hover:brightness-95 transition-all text-left cursor-pointer`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                      {/* Tipe badge */}
                      {isBulk ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 flex-shrink-0">
                          <Truck className="h-2.5 w-2.5" /> Bulk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                          <Package className="h-2.5 w-2.5" /> Single
                        </span>
                      )}

                      {/* Nomor */}
                      <span className="font-mono text-sm font-bold text-slate-800">
                        {isBulk ? grup.nomor_pengiriman : grup.items[0]?.nomor_surat_jalan}
                      </span>

                      {/* Ringkasan */}
                      <span className="text-xs text-slate-500">
                        {isBulk
                          ? `${grup.items.length} jenis · ${totalUnit} unit`
                          : grup.items[0]?.sarana_prasarana.nama_barang}
                      </span>

                      {/* Ruangan */}
                      <span className="text-xs text-indigo-600 font-medium hidden sm:inline">
                        → {grup.ruangan_tujuan?.nama_ruangan || '-'}
                      </span>

                      {/* Status */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${getStatusBadge(grup.status)}`}>
                        {getStatusIcon(grup.status)} {getStatusLabel(grup.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Tanggal + pengirim */}
                      <div className="hidden sm:flex flex-col items-end text-right">
                        <span className="text-xs text-slate-500">
                          {new Date(grup.tanggal_kirim).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-slate-400">{grup.petugas_pengirim?.nama_lengkap}</span>
                      </div>

                      {/* Cetak SJ Bulk */}
                      {isBulk && grup.nomor_pengiriman && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleCetakSuratJalanBulk(grup.nomor_pengiriman!) }}
                          disabled={printingBulk === grup.nomor_pengiriman}
                          title="Cetak Surat Jalan Bulk"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {printingBulk === grup.nomor_pengiriman
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Printer className="h-3 w-3" />}
                          SJ Bulk
                        </button>
                      )}

                      {/* Chevron */}
                      <svg
                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* ── Detail items ── */}
                  {isOpen && (
                    <div className="border-t border-slate-100">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500 uppercase tracking-wide">
                              <th className="px-4 py-2.5 text-left font-semibold">No. Surat Jalan</th>
                              <th className="px-4 py-2.5 text-left font-semibold">Barang</th>
                              <th className="px-4 py-2.5 text-center font-semibold">Jml</th>
                              <th className="px-4 py-2.5 text-left font-semibold">Tgl Kirim</th>
                              <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                              <th className="px-4 py-2.5 text-left font-semibold">No. BAST</th>
                              <th className="px-4 py-2.5 text-right font-semibold">Aksi &amp; Cetak</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {grup.items.map(item => {
                              const isPrinting  = printingId === item.id
                              const isPrintingBast = printingBastId === item.id
                              const isDiterima  = item.status === 'diterima'
                              return (
                                <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${
                                  isDiterima ? 'border-l-4 border-l-green-400' :
                                  item.status === 'ditolak' ? 'border-l-4 border-l-red-400' :
                                  'border-l-4 border-l-yellow-400'
                                }`}>
                                  <td className="px-4 py-2.5 font-mono text-blue-600 font-semibold text-xs whitespace-nowrap">
                                    {item.nomor_surat_jalan}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="font-semibold text-slate-800">{item.sarana_prasarana.nama_barang}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{item.sarana_prasarana.kode}</div>
                                  </td>
                                  <td className="px-4 py-2.5 text-center font-bold">{item.jumlah}</td>
                                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                                    {new Date(item.tanggal_kirim).toLocaleDateString('id-ID')}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(item.status)}`}>
                                      {getStatusIcon(item.status)} {getStatusLabel(item.status)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {item.nomor_bast
                                      ? <span className="font-mono text-green-600 font-semibold text-xs">{item.nomor_bast}</span>
                                      : <span className="text-slate-300 text-xs">—</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                      {/* Cetak SJ per item (single) */}
                                      {!isBulk && (
                                        <button
                                          onClick={() => handleCetakSuratJalan(item.id)}
                                          disabled={isPrinting}
                                          title="Cetak Surat Jalan"
                                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                                        >
                                          {isPrinting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                                          SJ
                                        </button>
                                      )}
                                      {/* Cetak BAST jika sudah diterima */}
                                      {isDiterima && (
                                        <button
                                          onClick={() => handleCetakBast(item.id)}
                                          disabled={isPrintingBast}
                                          title="Cetak BAST"
                                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                                        >
                                          {isPrintingBast ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCheck2 className="h-3 w-3" />}
                                          BAST
                                        </button>
                                      )}
                                      {/* Detail */}
                                      <button
                                        onClick={() => setDetailItem(item)}
                                        title="Lihat Detail BAST"
                                        className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs transition"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          {/* Footer total jika bulk */}
                          {isBulk && (
                            <tfoot>
                              <tr className="bg-slate-50 border-t-2 border-slate-200">
                                <td colSpan={2} className="px-4 py-2 text-xs font-bold text-slate-500 text-right">TOTAL</td>
                                <td className="px-4 py-2 text-center font-extrabold text-slate-800">{totalUnit}</td>
                                <td colSpan={4} />
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Detail Riwayat Pengiriman &amp; BAST</h3>
                  <p className="text-[11px] text-slate-500">Informasi pengiriman ke workshop</p>
                </div>
              </div>
              <button onClick={() => setDetailItem(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Nomor Surat Jalan</span>
                  <span className="font-mono font-bold text-blue-600">{detailItem.nomor_surat_jalan}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Nomor BAST</span>
                  <span className="font-mono font-bold text-emerald-700">{detailItem.nomor_bast || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getStatusBadge(detailItem.status)}`}>
                    {getStatusLabel(detailItem.status)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Ruangan Tujuan</span>
                  <span className="font-bold text-slate-800">
                    {detailItem.ruangan_tujuan?.nama_ruangan || '-'}
                    {detailItem.ruangan_tujuan?.gedung?.nama_gedung ? ` (${detailItem.ruangan_tujuan.gedung.nama_gedung})` : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Nama Barang:</span>
                  <span className="font-bold text-slate-900">{detailItem.sarana_prasarana.nama_barang}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Kode Barang:</span>
                  <span className="font-mono text-slate-700">{detailItem.sarana_prasarana.kode}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Jumlah Unit:</span>
                  <span className="font-bold text-slate-900">{detailItem.jumlah} {detailItem.sarana_prasarana.satuan || 'Unit'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Petugas Pengirim:</span>
                  <span className="font-medium text-slate-800">{detailItem.petugas_pengirim?.nama_lengkap}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Wakapro Penerima:</span>
                  <span className="font-semibold text-blue-700">{detailItem.wakapro_penerima?.nama_lengkap || 'Belum Dikonfirmasi'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Tanggal Kirim:</span>
                  <span>{new Date(detailItem.tanggal_kirim).toLocaleDateString('id-ID')}</span>
                </div>
                {detailItem.tanggal_terima && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Tanggal Diterima:</span>
                    <span className="font-bold text-emerald-700">{new Date(detailItem.tanggal_terima).toLocaleDateString('id-ID')}</span>
                  </div>
                )}
                {detailItem.catatan_penerimaan && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Catatan Penerimaan (Wakapro):</span>
                    <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-200">
                      {detailItem.catatan_penerimaan}
                    </p>
                  </div>
                )}
                {detailItem.foto_kerusakan_url && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Foto Bukti Kerusakan saat Tiba:</span>
                    <img
                      src={detailItem.foto_kerusakan_url}
                      alt="Kerusakan"
                      onClick={() => setLightboxUrl(detailItem.foto_kerusakan_url || null)}
                      className="w-full h-36 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end">
              {detailItem.status === 'diterima' && (
                <button
                  onClick={() => handleCetakBast(detailItem.id)}
                  disabled={printingBastId === detailItem.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Cetak BAST
                </button>
              )}
              <button
                onClick={() => handleCetakSuratJalan(detailItem.id)}
                disabled={printingId === detailItem.id}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Surat Jalan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
