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
} from 'lucide-react'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Distribusi {
  id: number
  nomor_surat_jalan: string
  nomor_pengiriman: string | null
  nomor_bast: string | null
  jumlah: number
  tanggal_kirim: string
  tanggal_terima: string | null
  status: string
  catatan_pengiriman: string | null
  sarana_prasarana: { nama_barang: string; kode: string }
  ruangan_tujuan: { nama_ruangan: string; gedung: { nama_gedung: string } }
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
    diterima:            'Diterima',
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

  // Print state
  const [printingId, setPrintingId]     = useState<number | null>(null)
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
    setPrintingId(id)
    try {
      const { data } = await axios.get(`/api/distribusi-asets/${id}/bast`)
      generateBast(data)
    } catch (err) {
      console.error('Gagal cetak BAST:', err)
      alert('Gagal mengambil data BAST.')
    } finally {
      setPrintingId(null)
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

  // ── Filter & group ────────────────────────────────────────────────────────

  const filtered = flatList.filter(item => {
    const q = searchTerm.toLowerCase()
    return (
      item.nomor_surat_jalan.toLowerCase().includes(q) ||
      (item.nomor_pengiriman ?? '').toLowerCase().includes(q) ||
      item.sarana_prasarana.nama_barang.toLowerCase().includes(q) ||
      item.ruangan_tujuan.nama_ruangan.toLowerCase().includes(q)
    )
  })

  const grupList = groupDistribusi(filtered)

  // Summary counts (dari flat list asli)
  const totalMenunggu = flatList.filter(d => d.status === 'menunggu_konfirmasi').length
  const totalDiterima = flatList.filter(d => d.status === 'diterima').length

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Distribusi Aset ke Workshop</h1>
            <p className="text-sm text-gray-600 mt-1">
              Kelola pengiriman aset ke workshop dengan surat jalan &amp; BAST
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard/distribusi/bulk')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
          >
            📦 Distribusi Bulk
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cari</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari no. surat jalan, no. pengiriman, barang, atau ruangan..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter Status</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="menunggu_konfirmasi">Menunggu Konfirmasi</option>
              <option value="diterima">Diterima</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            <p className="mt-2 text-gray-600">Memuat data...</p>
          </div>
        ) : grupList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Tidak ada data distribusi</p>
            <button
              onClick={() => router.push('/dashboard/distribusi/bulk')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                        → {grup.ruangan_tujuan.nama_ruangan}
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
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                              <th className="px-4 py-2 text-left font-semibold">No. Surat Jalan</th>
                              <th className="px-4 py-2 text-left font-semibold">Barang</th>
                              <th className="px-4 py-2 text-center font-semibold">Jml</th>
                              <th className="px-4 py-2 text-left font-semibold">Tgl Kirim</th>
                              <th className="px-4 py-2 text-left font-semibold">Status</th>
                              <th className="px-4 py-2 text-left font-semibold">No. BAST</th>
                              <th className="px-4 py-2 text-left font-semibold">Cetak</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {grup.items.map(item => {
                              const isPrinting  = printingId === item.id
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
                                    <div className="font-medium text-slate-800">{item.sarana_prasarana.nama_barang}</div>
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
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
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
                                          disabled={isPrinting}
                                          title="Cetak BAST"
                                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                                        >
                                          {isPrinting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileCheck2 className="h-3 w-3" />}
                                          BAST
                                        </button>
                                      )}
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

        {/* Summary */}
        {!loading && flatList.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800">{flatList.length}</div>
                <div className="text-sm text-gray-600">Total Item</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{totalMenunggu}</div>
                <div className="text-sm text-gray-600">Menunggu Konfirmasi</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{totalDiterima}</div>
                <div className="text-sm text-gray-600">Diterima</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
