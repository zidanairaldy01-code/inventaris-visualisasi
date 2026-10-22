'use client'

import { useState, useEffect, useMemo } from 'react'
import axios from '@/lib/axios'
import { showErrorAlert } from '@/utils/errorHandler'
import {
  generateSuratJalan,
  generateBast,
} from '@/lib/printDokumen'
import {
  Inbox,
  Eye,
  Printer,
  FileCheck2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Warehouse,
  Package,
  Building2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  ZoomIn,
  X,
  Loader2,
  Calendar,
  User,
  Info,
} from 'lucide-react'

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
  catatan_penerimaan: string | null
  foto_kerusakan_url?: string | null
  sarana_prasarana: {
    nama_barang: string
    kode: string
    kondisi: string
    satuan?: string
  }
  ruangan_tujuan: {
    id?: number
    nama_ruangan: string
    gedung?: {
      nama_gedung: string
    } | null
  }
  petugas_pengirim: {
    nama_lengkap: string
  }
  wakapro_penerima?: {
    nama_lengkap: string
  } | null
}

interface RuanganItem {
  id: number
  nama_ruangan: string
  gedung?: {
    nama_gedung: string
  } | null
}

type TabKey = 'semua' | 'menunggu' | 'diterima' | 'ditolak'

export default function MonitoringPenerimaanPage() {
  const [distribusiList, setDistribusiList] = useState<Distribusi[]>([])
  const [ruanganList, setRuanganList] = useState<RuanganItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('semua')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRuanganId, setSelectedRuanganId] = useState<string>('all')

  // Modals & previews
  const [detailItem, setDetailItem] = useState<Distribusi | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [printingSjId, setPrintingSjId] = useState<number | null>(null)
  const [printingBastId, setPrintingBastId] = useState<number | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [distRes, ruangRes] = await Promise.all([
        axios.get('/api/distribusi-asets'),
        axios.get('/api/ruangans').catch(() => ({ data: [] })),
      ])
      setDistribusiList(Array.isArray(distRes.data) ? distRes.data : [])
      setRuanganList(Array.isArray(ruangRes.data) ? ruangRes.data : [])
    } catch (error) {
      console.error('Error fetching data penerimaan:', error)
      showErrorAlert(error, 'Gagal Memuat Data Monitoring')
    } finally {
      setLoading(false)
    }
  }

  const handleCetakSuratJalan = async (id: number) => {
    setPrintingSjId(id)
    try {
      const { data } = await axios.get(`/api/distribusi-asets/${id}/surat-jalan`)
      generateSuratJalan(data)
    } catch (err) {
      console.error('Gagal cetak surat jalan:', err)
      showErrorAlert(err, 'Gagal Mengambil Data Surat Jalan')
    } finally {
      setPrintingSjId(null)
    }
  }

  const handleCetakBast = async (id: number) => {
    setPrintingBastId(id)
    try {
      const { data } = await axios.get(`/api/distribusi-asets/${id}/bast`)
      generateBast(data)
    } catch (err) {
      console.error('Gagal cetak BAST:', err)
      showErrorAlert(err, 'Gagal Mengambil Data BAST')
    } finally {
      setPrintingBastId(null)
    }
  }

  // Filtered list
  const filteredList = useMemo(() => {
    return distribusiList.filter((item) => {
      // Tab filter
      if (activeTab === 'menunggu' && item.status !== 'menunggu_konfirmasi') return false
      if (activeTab === 'diterima' && item.status !== 'diterima') return false
      if (activeTab === 'ditolak' && item.status !== 'ditolak') return false

      // Ruangan filter
      if (selectedRuanganId !== 'all') {
        const itemRuangId = item.ruangan_tujuan?.id?.toString()
        if (itemRuangId && itemRuangId !== selectedRuanganId) return false
      }

      // Search filter
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase()
        const sjMatch = item.nomor_surat_jalan?.toLowerCase().includes(q)
        const bastMatch = item.nomor_bast?.toLowerCase().includes(q)
        const barangMatch = item.sarana_prasarana?.nama_barang?.toLowerCase().includes(q)
        const kodeMatch = item.sarana_prasarana?.kode?.toLowerCase().includes(q)
        const ruangMatch = item.ruangan_tujuan?.nama_ruangan?.toLowerCase().includes(q)
        const pengirimMatch = item.petugas_pengirim?.nama_lengkap?.toLowerCase().includes(q)
        const penerimaMatch = item.wakapro_penerima?.nama_lengkap?.toLowerCase().includes(q)

        return (
          sjMatch ||
          bastMatch ||
          barangMatch ||
          kodeMatch ||
          ruangMatch ||
          pengirimMatch ||
          penerimaMatch
        )
      }

      return true
    })
  }, [distribusiList, activeTab, selectedRuanganId, searchTerm])

  // Count per tab
  const counts = useMemo(() => {
    return {
      total: distribusiList.length,
      menunggu: distribusiList.filter((d) => d.status === 'menunggu_konfirmasi').length,
      diterima: distribusiList.filter((d) => d.status === 'diterima').length,
      ditolak: distribusiList.filter((d) => d.status === 'ditolak').length,
    }
  }, [distribusiList])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'diterima':
        return {
          label: 'Diterima (BAST Sah)',
          badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotCls: 'bg-emerald-500',
          icon: CheckCircle2,
        }
      case 'ditolak':
        return {
          label: 'Ditolak',
          badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
          dotCls: 'bg-rose-500',
          icon: XCircle,
        }
      default:
        return {
          label: 'Menunggu Konfirmasi',
          badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
          dotCls: 'bg-amber-500 animate-pulse',
          icon: Clock,
        }
    }
  }

  const formatTanggal = (dateString?: string | null) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Monitoring Penerimaan Barang
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Mode Monitoring Admin
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Pantau verifikasi fisik barang dan penerbitan BAST oleh Waka Program di seluruh ruangan / workshop.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchInitialData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition shadow-sm disabled:opacity-50 self-start md:self-center"
        >
          <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </button>
      </div>

      {/* Info Banner: Penegasan Hak Akses Monitoring */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-xl p-4 text-sm text-blue-900 flex items-start gap-3 shadow-sm">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">
            Akses Monitoring Khusus Administrator
          </p>
          <p className="text-xs md:text-sm text-blue-800 leading-relaxed">
            Sesuai Standar Operasional Prosedur (SOP), konfirmasi penerimaan fisik dan penandatanganan dokumen BAST dilakukan secara mandiri oleh masing-masing <strong>Waka Program / Kepala Workshop</strong> saat barang tiba. Admin berperan memantau progres, melacak kendala, serta mengunduh dokumen arsip resmi.
          </p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        {/* Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Distribusi</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{counts.total}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
        </div>

        {/* Menunggu Konfirmasi */}
        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-amber-50/30">
          <div>
            <p className="text-xs font-medium text-amber-700">Menunggu Konfirmasi</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{counts.menunggu}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Diterima */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/30">
          <div>
            <p className="text-xs font-medium text-emerald-700">Sudah Diterima (BAST)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{counts.diterima}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Ditolak */}
        <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-rose-50/30">
          <div>
            <p className="text-xs font-medium text-rose-700">Ditolak Workshop</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{counts.ditolak}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <XCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Controls: Tab & Search & Ruangan */}
        <div className="p-4 border-b border-slate-200 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto">
              <button
                onClick={() => setActiveTab('semua')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                  activeTab === 'semua'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({counts.total})
              </button>
              <button
                onClick={() => setActiveTab('menunggu')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                  activeTab === 'menunggu'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Menunggu Konfirmasi ({counts.menunggu})
              </button>
              <button
                onClick={() => setActiveTab('diterima')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                  activeTab === 'diterima'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Diterima / BAST ({counts.diterima})
              </button>
              <button
                onClick={() => setActiveTab('ditolak')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                  activeTab === 'ditolak'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ditolak ({counts.ditolak})
              </button>
            </div>

            {/* Ruangan Filter & Search Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative min-w-[180px]">
                <select
                  value={selectedRuanganId}
                  onChange={(e) => setSelectedRuanganId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="all">Semua Ruangan / Workshop</option>
                  {ruanganList.map((r) => (
                    <option key={r.id} value={r.id.toString()}>
                      {r.nama_ruangan} {r.gedung ? `(${r.gedung.nama_gedung})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari SJ, BAST, barang, penerima..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-8 pr-7 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Table / Loading / Empty */}
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Memuat data monitoring penerimaan...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-slate-800">Tidak ada data distribusi ditemukan</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || selectedRuanganId !== 'all' || activeTab !== 'semua'
                ? 'Coba ubah filter ruangan atau kata kunci pencarian Anda.'
                : 'Belum ada data distribusi pengiriman aset ke workshop.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3">No. Surat Jalan & BAST</th>
                  <th className="px-4 py-3">Barang & Spesifikasi</th>
                  <th className="px-4 py-3">Workshop Tujuan</th>
                  <th className="px-4 py-3 text-center">Jumlah</th>
                  <th className="px-4 py-3">Petugas Pengirim</th>
                  <th className="px-4 py-3">Status Monitoring</th>
                  <th className="px-4 py-3">Penerima (Waka)</th>
                  <th className="px-4 py-3 text-center">Aksi Monitoring</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {filteredList.map((item) => {
                  const statusInfo = getStatusBadge(item.status)
                  const StatusIcon = statusInfo.icon

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* No. Dokumen */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-mono font-bold text-blue-600 flex items-center gap-1.5">
                          {item.nomor_surat_jalan}
                        </div>
                        {item.nomor_bast ? (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                              <FileCheck2 className="h-3 w-3" />
                              {item.nomor_bast}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            BAST belum terbit
                          </div>
                        )}
                      </td>

                      {/* Barang */}
                      <td className="px-4 py-3.5 align-middle max-w-xs">
                        <div className="font-semibold text-slate-900 truncate" title={item.sarana_prasarana?.nama_barang}>
                          {item.sarana_prasarana?.nama_barang || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.sarana_prasarana?.kode || '-'}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] rounded font-medium ${
                              item.sarana_prasarana?.kondisi === 'Baik'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            Kondisi Kirim: {item.sarana_prasarana?.kondisi || 'Baik'}
                          </span>
                        </div>
                      </td>

                      {/* Workshop Tujuan */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                          <Warehouse className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.ruangan_tujuan?.nama_ruangan || '-'}</span>
                        </div>
                        {item.ruangan_tujuan?.gedung?.nama_gedung && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            <span>{item.ruangan_tujuan.gedung.nama_gedung}</span>
                          </div>
                        )}
                      </td>

                      {/* Jumlah */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.jumlah}
                        </span>
                        <span className="text-[11px] text-slate-500 ml-1">
                          {item.sarana_prasarana?.satuan || 'Unit'}
                        </span>
                      </td>

                      {/* Petugas Pengirim */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-medium text-slate-800">
                          {item.petugas_pengirim?.nama_lengkap || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{formatTanggal(item.tanggal_kirim)}</span>
                        </div>
                      </td>

                      {/* Status Monitoring */}
                      <td className="px-4 py-3.5 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeCls}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotCls}`} />
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Penerima */}
                      <td className="px-4 py-3.5 align-middle">
                        {item.wakapro_penerima ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {item.wakapro_penerima.nama_lengkap}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {formatTanggal(item.tanggal_terima)}
                            </div>
                          </div>
                        ) : item.status === 'ditolak' ? (
                          <span className="text-rose-600 text-[11px] font-medium">
                            Ditolak oleh Workshop
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            Belum dikonfirmasi
                          </span>
                        )}
                      </td>

                      {/* Aksi Monitoring (NO TERIMA / TOLAK BUTTONS) */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Tombol Detail */}
                          <button
                            onClick={() => setDetailItem(item)}
                            title="Lihat Detail Penerimaan"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            <span>Detail</span>
                          </button>

                          {/* Cetak Surat Jalan */}
                          <button
                            onClick={() => handleCetakSuratJalan(item.id)}
                            disabled={printingSjId === item.id}
                            title="Cetak Surat Jalan (PDF)"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-200"
                          >
                            {printingSjId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Printer className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Cetak BAST jika sudah diterima */}
                          {item.status === 'diterima' && (
                            <button
                              onClick={() => handleCetakBast(item.id)}
                              disabled={printingBastId === item.id}
                              title="Cetak BAST (PDF)"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition border border-transparent hover:border-emerald-200"
                            >
                              {printingBastId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileCheck2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Penerimaan */}
      {detailItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Detail Distribusi & Serah Terima
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {detailItem.nomor_surat_jalan}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Status Header Badge */}
              <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <span className="text-[11px] text-slate-500 block">Status Dokumen:</span>
                  <div className="mt-1">
                    {(() => {
                      const st = getStatusBadge(detailItem.status)
                      const StIcon = st.icon
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${st.badgeCls}`}>
                          <StIcon className="h-3.5 w-3.5" />
                          {st.label}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {detailItem.nomor_bast && (
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Nomor BAST Resmi:</span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">
                      {detailItem.nomor_bast}
                    </span>
                  </div>
                )}
              </div>

              {/* Grid Info Barang & Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <p className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-blue-600" />
                    Informasi Sarana / Barang
                  </p>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Nama Barang</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {detailItem.sarana_prasarana?.nama_barang}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Kode Aset</span>
                      <span className="font-mono text-slate-700 font-medium">
                        {detailItem.sarana_prasarana?.kode}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Kuantitas</span>
                      <span className="font-bold text-slate-900">
                        {detailItem.jumlah} {detailItem.sarana_prasarana?.satuan || 'Unit'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Kondisi Pengiriman</span>
                    <span className="font-medium text-slate-800">
                      {detailItem.sarana_prasarana?.kondisi || 'Baik'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <p className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                    <Warehouse className="h-3.5 w-3.5 text-blue-600" />
                    Tujuan & Lokasi Penempatan
                  </p>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Ruangan / Workshop</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      {detailItem.ruangan_tujuan?.nama_ruangan}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Gedung</span>
                    <span className="font-medium text-slate-800">
                      {detailItem.ruangan_tujuan?.gedung?.nama_gedung || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline / Pihak Terlibat */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <p className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  Pihak Terkait & Waktu Pelaksanaan
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Petugas Pengirim (Logistik)</span>
                    <span className="font-semibold text-slate-900">
                      {detailItem.petugas_pengirim?.nama_lengkap || '-'}
                    </span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      Kirim: {formatTanggal(detailItem.tanggal_kirim)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] block">Waka Program (Penerima Workshop)</span>
                    <span className="font-semibold text-slate-900">
                      {detailItem.wakapro_penerima?.nama_lengkap || 'Belum Dikonfirmasi'}
                    </span>
                    <span className="text-slate-500 block text-[11px] mt-0.5">
                      {detailItem.tanggal_terima ? `Diterima: ${formatTanggal(detailItem.tanggal_terima)}` : 'Menunggu kedatangan & cek fisik'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catatan Pengiriman & Penerimaan */}
              <div className="space-y-3">
                {detailItem.catatan_pengiriman && (
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1">
                      Catatan Pengiriman:
                    </span>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                      {detailItem.catatan_pengiriman}
                    </div>
                  </div>
                )}

                {detailItem.catatan_penerimaan && (
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1">
                      Catatan Konfirmasi Penerima:
                    </span>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                      {detailItem.catatan_penerimaan}
                    </div>
                  </div>
                )}

                {detailItem.foto_kerusakan_url && (
                  <div>
                    <span className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Foto Bukti Fisik Kerusakan saat Diterima:
                    </span>
                    <div className="relative group inline-block">
                      <img
                        src={detailItem.foto_kerusakan_url}
                        alt="Bukti Kerusakan"
                        onClick={() => setLightboxUrl(detailItem.foto_kerusakan_url || null)}
                        className="h-36 w-56 object-cover rounded-xl border border-slate-300 cursor-pointer group-hover:opacity-90 transition shadow-sm"
                      />
                      <div
                        onClick={() => setLightboxUrl(detailItem.foto_kerusakan_url || null)}
                        className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition gap-1 text-xs font-semibold"
                      >
                        <ZoomIn className="h-4 w-4" />
                        Perbesar Foto
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 italic">
                *Admin hanya memantau proses & mencetak berkas
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCetakSuratJalan(detailItem.id)}
                  disabled={printingSjId === detailItem.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {printingSjId === detailItem.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Printer className="h-3.5 w-3.5" />
                  )}
                  Cetak Surat Jalan
                </button>

                {detailItem.status === 'diterima' && (
                  <button
                    onClick={() => handleCetakBast(detailItem.id)}
                    disabled={printingBastId === detailItem.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50"
                  >
                    {printingBastId === detailItem.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileCheck2 className="h-3.5 w-3.5" />
                    )}
                    Cetak BAST
                  </button>
                )}

                <button
                  onClick={() => setDetailItem(null)}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={lightboxUrl}
              alt="Bukti Kerusakan Penuh"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white text-slate-800 flex items-center justify-center shadow-lg hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
