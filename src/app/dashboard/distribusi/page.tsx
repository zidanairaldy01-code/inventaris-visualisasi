'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import { showErrorAlert } from '@/utils/errorHandler'
import {
  generateSuratJalan,
  generateBast,
  generateSuratJalanBulk,
  type SuratJalanBulkApiResponse,
} from '@/lib/printDokumen'
import {
  Truck,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  X,
  Loader2,
  Eye,
  Printer,
  FileCheck2,
  Warehouse,
  Building2,
  Calendar,
  RefreshCw,
  Plus,
  FileText,
  User,
  Layers,
} from 'lucide-react'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Ruangan {
  id: number
  nama_ruangan: string
  gedung?: {
    nama_gedung: string
  } | null
}

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
  sarana_prasarana: {
    nama_barang: string
    kode: string
    kondisi?: string
    satuan?: string
  }
  ruangan_tujuan: {
    id?: number
    nama_ruangan: string
    gedung?: { nama_gedung: string } | null
  }
  petugas_pengirim: { nama_lengkap: string }
  wakapro_penerima: { nama_lengkap: string } | null
}

export default function DistribusiPage() {
  const router = useRouter()

  const [distribusiList, setDistribusiList] = useState<Distribusi[]>([])
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<'semua' | 'menunggu' | 'diterima' | 'ditolak'>('semua')
  const [selectedRuanganId, setSelectedRuanganId] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Detail Modal & Lightbox
  const [detailItem, setDetailItem] = useState<Distribusi | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Print Loading States
  const [printingSjId, setPrintingSjId] = useState<number | null>(null)
  const [printingBastId, setPrintingBastId] = useState<number | null>(null)
  const [printingBulk, setPrintingBulk] = useState<string | null>(null)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchDistribusi(), fetchRuangans()])
    } finally {
      setLoading(false)
    }
  }

  const fetchDistribusi = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    try {
      const { data } = await axios.get('/api/distribusi-asets')
      setDistribusiList(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching distribusi:', err)
      showErrorAlert(err, 'Gagal Mengambil Data Distribusi')
    } finally {
      if (isManualRefresh) setRefreshing(false)
    }
  }

  const fetchRuangans = async () => {
    try {
      const res = await axios.get('/api/ruangans')
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? []
      setRuanganList(data)
    } catch (err) {
      console.error('Error fetching ruangans:', err)
    }
  }

  // ── Print Handlers ──────────────────────────────────────────────────────────

  const handleCetakSuratJalan = useCallback(async (id: number) => {
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
  }, [])

  const handleCetakBast = useCallback(async (id: number) => {
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
      showErrorAlert(err, 'Gagal Mengambil Data Surat Jalan Massal')
    } finally {
      setPrintingBulk(null)
    }
  }, [])

  // ── Status Helpers ──────────────────────────────────────────────────────────

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

  // ── Counts per Status ───────────────────────────────────────────────────────

  const counts = useMemo(() => {
    return {
      total: distribusiList.length,
      menunggu: distribusiList.filter(d => d.status === 'menunggu_konfirmasi').length,
      diterima: distribusiList.filter(d => d.status === 'diterima').length,
      ditolak: distribusiList.filter(d => d.status === 'ditolak').length,
    }
  }, [distribusiList])

  // ── Filtered List ───────────────────────────────────────────────────────────

  const filteredList = useMemo(() => {
    return distribusiList.filter(item => {
      // Tab filter
      if (activeTab === 'menunggu' && item.status !== 'menunggu_konfirmasi') return false
      if (activeTab === 'diterima' && item.status !== 'diterima') return false
      if (activeTab === 'ditolak' && item.status !== 'ditolak') return false

      // Ruangan filter
      if (selectedRuanganId !== 'all') {
        const itemRuanganId = item.ruangan_tujuan?.id?.toString()
        if (itemRuanganId && itemRuanganId !== selectedRuanganId) {
          return false
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const sjMatch = item.nomor_surat_jalan?.toLowerCase().includes(q)
        const pengirimanMatch = item.nomor_pengiriman?.toLowerCase().includes(q)
        const bastMatch = item.nomor_bast?.toLowerCase().includes(q)
        const barangMatch = item.sarana_prasarana?.nama_barang?.toLowerCase().includes(q)
        const kodeMatch = item.sarana_prasarana?.kode?.toLowerCase().includes(q)
        const ruangMatch = item.ruangan_tujuan?.nama_ruangan?.toLowerCase().includes(q)
        const pengirimMatch = item.petugas_pengirim?.nama_lengkap?.toLowerCase().includes(q)
        const penerimaMatch = item.wakapro_penerima?.nama_lengkap?.toLowerCase().includes(q)

        return (
          sjMatch ||
          pengirimanMatch ||
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Lightbox Foto Kerusakan */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
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
            alt="Foto Bukti"
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain border border-white/20"
          />
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center mr-3 shadow-sm shadow-blue-500/20 shrink-0 text-white">
              <Truck className="h-4.5 w-4.5" />
            </div>
            Distribusi Aset &amp; Riwayat BAST
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-12">
            Pencatatan dan pemantauan pengiriman aset ke workshop dengan Surat Jalan serta riwayat serah terima BAST
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDistribusi(true)}
            disabled={refreshing || loading}
            title="Segarkan data"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors shadow-2xs"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => router.push('/dashboard/distribusi/bulk')}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs shadow-sm shadow-blue-500/20 transition-all"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Buat Distribusi Baru
          </button>
        </div>
      </div>

      {/* ─── Summary Stats Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 md:gap-4">
        {/* Total Distribusi */}
        <div
          onClick={() => setActiveTab('semua')}
          className={`bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition ${
            activeTab === 'semua' ? 'border-blue-400 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <p className="text-xs font-medium text-slate-500">Total Distribusi</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{counts.total}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
        </div>

        {/* Menunggu Konfirmasi */}
        <div
          onClick={() => setActiveTab('menunggu')}
          className={`bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition bg-linear-to-br from-white to-amber-50/30 ${
            activeTab === 'menunggu' ? 'border-amber-400 ring-2 ring-amber-500/10' : 'border-amber-200/80 hover:border-amber-300'
          }`}
        >
          <div>
            <p className="text-xs font-medium text-amber-700">Menunggu Konfirmasi</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{counts.menunggu}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Sudah Diterima */}
        <div
          onClick={() => setActiveTab('diterima')}
          className={`bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition bg-linear-to-br from-white to-emerald-50/30 ${
            activeTab === 'diterima' ? 'border-emerald-400 ring-2 ring-emerald-500/10' : 'border-emerald-200/80 hover:border-emerald-300'
          }`}
        >
          <div>
            <p className="text-xs font-medium text-emerald-700">Sudah Diterima (BAST)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{counts.diterima}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Ditolak */}
        <div
          onClick={() => setActiveTab('ditolak')}
          className={`bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between cursor-pointer transition bg-linear-to-br from-white to-rose-50/30 ${
            activeTab === 'ditolak' ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-rose-200/80 hover:border-rose-300'
          }`}
        >
          <div>
            <p className="text-xs font-medium text-rose-700">Ditolak Workshop</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{counts.ditolak}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <XCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ─── Main Content Box (Standard Table) ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Controls: Tabs, Ruangan Filter & Search Input */}
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
                  onChange={e => setSelectedRuanganId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="all">Semua Ruangan / Workshop</option>
                  {ruanganList.map(r => (
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
                  placeholder="Cari SJ, BAST, barang, pengirim..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
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
            <p className="text-sm font-medium text-slate-600">Memuat data distribusi &amp; riwayat BAST...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Truck className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-slate-800">Tidak ada data distribusi ditemukan</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || selectedRuanganId !== 'all' || activeTab !== 'semua'
                ? 'Coba ubah filter ruangan atau kata kunci pencarian Anda.'
                : 'Belum ada data distribusi pengiriman aset ke workshop.'}
            </p>
            {!searchTerm && selectedRuanganId === 'all' && activeTab === 'semua' && (
              <button
                onClick={() => router.push('/dashboard/distribusi/bulk')}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                + Buat Distribusi Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3">No. Surat Jalan &amp; BAST</th>
                  <th className="px-4 py-3">Barang &amp; Spesifikasi</th>
                  <th className="px-4 py-3">Workshop Tujuan</th>
                  <th className="px-4 py-3 text-center">Jumlah</th>
                  <th className="px-4 py-3">Petugas Pengirim</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Penerima (Waka)</th>
                  <th className="px-4 py-3 text-center">Aksi &amp; Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {filteredList.map(item => {
                  const statusInfo = getStatusBadge(item.status)
                  const StatusIcon = statusInfo.icon
                  const isPrintingSj = printingSjId === item.id
                  const isPrintingBast = printingBastId === item.id

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                      {/* No. Dokumen (Surat Jalan & BAST) */}
                      <td className="px-4 py-3.5 align-middle">
                        <div className="font-mono font-bold text-blue-600 flex items-center gap-1.5">
                          {item.nomor_surat_jalan}
                          {item.nomor_pengiriman && (
                            <span
                              title={`Bagian dari Pengiriman Massal: ${item.nomor_pengiriman}`}
                              className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-sans"
                            >
                              Bulk
                            </span>
                          )}
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
                        <div
                          className="font-semibold text-slate-900 truncate"
                          title={item.sarana_prasarana?.nama_barang}
                        >
                          {item.sarana_prasarana?.nama_barang || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.sarana_prasarana?.kode || '-'}
                        </div>
                        {item.sarana_prasarana?.kondisi && (
                          <div className="mt-1">
                            <span
                              className={`inline-block px-1.5 py-0.5 text-[10px] rounded font-medium ${
                                item.sarana_prasarana.kondisi === 'Baik'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              Kondisi: {item.sarana_prasarana.kondisi}
                            </span>
                          </div>
                        )}
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

                      {/* Status */}
                      <td className="px-4 py-3.5 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeCls}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotCls}`} />
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Penerima (Wakapro) */}
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

                      {/* Aksi & Cetak */}
                      <td className="px-4 py-3.5 align-middle text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Tombol Detail */}
                          <button
                            onClick={() => setDetailItem(item)}
                            title="Lihat Detail Distribusi"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            <span>Detail</span>
                          </button>

                          {/* Cetak Surat Jalan (Otomatis cetak Massal jika bulk, atau Satuan) */}
                          <button
                            onClick={() => {
                              if (item.nomor_pengiriman) {
                                handleCetakSuratJalanBulk(item.nomor_pengiriman)
                              } else {
                                handleCetakSuratJalan(item.id)
                              }
                            }}
                            disabled={
                              item.nomor_pengiriman
                                ? printingBulk === item.nomor_pengiriman
                                : printingSjId === item.id
                            }
                            title={
                              item.nomor_pengiriman
                                ? `Cetak Surat Jalan Pengiriman Massal (${item.nomor_pengiriman})`
                                : 'Cetak Surat Jalan'
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition border border-transparent hover:border-blue-200 disabled:opacity-50"
                          >
                            {(item.nomor_pengiriman ? printingBulk === item.nomor_pengiriman : printingSjId === item.id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : item.nomor_pengiriman ? (
                              <Layers className="h-3.5 w-3.5" />
                            ) : (
                              <Printer className="h-3.5 w-3.5" />
                            )}
                            <span>{item.nomor_pengiriman ? 'SJ Bulk' : 'SJ'}</span>
                          </button>

                          {/* Cetak BAST jika sudah disetujui & nomor BAST sudah terbit */}
                          {item.status === 'diterima' && item.nomor_bast && (
                            <button
                              onClick={() => handleCetakBast(item.id)}
                              disabled={printingBastId === item.id}
                              title="Cetak Berita Acara Serah Terima (BAST)"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200 disabled:opacity-50"
                            >
                              {printingBastId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileCheck2 className="h-3.5 w-3.5" />
                              )}
                              <span>BAST</span>
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

      {/* ─── Detail Modal ─── */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Detail Riwayat Pengiriman &amp; BAST
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Informasi pengiriman aset ke workshop
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Nomor Surat Jalan
                  </span>
                  <span className="font-mono font-bold text-blue-600">
                    {detailItem.nomor_surat_jalan}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Nomor BAST
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {detailItem.nomor_bast || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${
                      getStatusBadge(detailItem.status).badgeCls
                    }`}
                  >
                    {getStatusBadge(detailItem.status).label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Ruangan Tujuan
                  </span>
                  <span className="font-bold text-slate-800">
                    {detailItem.ruangan_tujuan?.nama_ruangan || '-'}
                    {detailItem.ruangan_tujuan?.gedung?.nama_gedung
                      ? ` (${detailItem.ruangan_tujuan.gedung.nama_gedung})`
                      : ''}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Nama Barang:</span>
                  <span className="font-bold text-slate-900">
                    {detailItem.sarana_prasarana?.nama_barang}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Kode Barang:</span>
                  <span className="font-mono text-slate-700">
                    {detailItem.sarana_prasarana?.kode}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Jumlah Unit:</span>
                  <span className="font-bold text-slate-900">
                    {detailItem.jumlah} {detailItem.sarana_prasarana?.satuan || 'Unit'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Petugas Pengirim:</span>
                  <span className="font-medium text-slate-800">
                    {detailItem.petugas_pengirim?.nama_lengkap || '-'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Wakapro Penerima:</span>
                  <span className="font-semibold text-blue-700">
                    {detailItem.wakapro_penerima?.nama_lengkap || 'Belum Dikonfirmasi'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Tanggal Kirim:</span>
                  <span>{formatTanggal(detailItem.tanggal_kirim)}</span>
                </div>
                {detailItem.tanggal_terima && (
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Tanggal Diterima:</span>
                    <span className="font-bold text-emerald-700">
                      {formatTanggal(detailItem.tanggal_terima)}
                    </span>
                  </div>
                )}
                {detailItem.catatan_pengiriman && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Catatan Pengiriman:</span>
                    <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-200">
                      {detailItem.catatan_pengiriman}
                    </p>
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
                    <span className="text-slate-500 block mb-1">Foto Bukti saat Tiba di Workshop:</span>
                    <img
                      src={detailItem.foto_kerusakan_url}
                      alt="Bukti Foto"
                      onClick={() => setLightboxUrl(detailItem.foto_kerusakan_url || null)}
                      className="w-full h-36 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCetakSuratJalan(detailItem.id)}
                  disabled={printingSjId === detailItem.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {printingSjId === detailItem.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Printer className="h-3.5 w-3.5" />
                  )}
                  Cetak Surat Jalan
                </button>

                {detailItem.nomor_pengiriman && (
                  <button
                    onClick={() => handleCetakSuratJalanBulk(detailItem.nomor_pengiriman!)}
                    disabled={printingBulk === detailItem.nomor_pengiriman}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {printingBulk === detailItem.nomor_pengiriman ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Layers className="h-3.5 w-3.5" />
                    )}
                    Cetak SJ Massal
                  </button>
                )}

                {detailItem.status === 'diterima' && detailItem.nomor_bast && (
                  <button
                    onClick={() => handleCetakBast(detailItem.id)}
                    disabled={printingBastId === detailItem.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {printingBastId === detailItem.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileCheck2 className="h-3.5 w-3.5" />
                    )}
                    Cetak BAST
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
