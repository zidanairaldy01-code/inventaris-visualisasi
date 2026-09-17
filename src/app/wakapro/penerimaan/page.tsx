'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import axios from '@/lib/axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useNotification } from '@/hooks/useNotification'
import { generateBast, generateSuratJalanBulk, type SuratJalanBulkApiResponse } from '@/lib/printDokumen'
import {
  MobileCard,
  MobileCardHeader,
  MobileCardRow,
  MobileCardActions,
  MobileCardDivider
} from '@/components/MobileCard'
import {
  Package,
  Truck,
  CheckCircle2,
  X,
  AlertTriangle,
  Clock,
  History,
  ClipboardList,
  Search,
  FileText,
  Ban,
  Download,
  CheckSquare,
  Square,
  Loader2,
  Calendar,
  Filter,
  TrendingUp,
  Printer,
  FileCheck2,
} from 'lucide-react'

// ─── Interfaces ────────────────────────────────────────────────────────────────

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
  catatan_penerimaan: string | null
  sarana_prasarana: {
    nama_barang: string
    kode: string
    kondisi: string
  }
  ruangan_tujuan: {
    nama_ruangan: string
    gedung: {
      nama_gedung: string
    }
  }
  petugas_pengirim: {
    nama_lengkap: string
  }
}

/** Struktur grup yang dikembalikan oleh GET /api/distribusi-asets/riwayat */
interface RiwayatGrup {
  type: 'bulk' | 'single'
  nomor_pengiriman: string | null
  tanggal_kirim: string
  tanggal_terima: string | null
  status: string          // 'diterima' | 'ditolak' | 'sebagian'
  ruangan_tujuan: Distribusi['ruangan_tujuan']
  petugas_pengirim: Distribusi['petugas_pengirim']
  catatan_pengiriman: string | null
  items: Distribusi[]
}

interface LaporanRow extends Record<string, unknown> {
  id: number
}

interface LaporanRingkasan {
  total_diterima: number
  total_ditolak: number
  total_barang: number
}

interface LaporanResponse {
  periode: { dari: string | null; sampai: string | null }
  ringkasan: LaporanRingkasan
  data: LaporanRow[]
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type TabType = 'menunggu' | 'riwayat' | 'laporan'
type RiwayatFilter = 'semua' | 'diterima' | 'ditolak'
type StatusLaporan = 'semua' | 'diterima' | 'ditolak'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]
const firstOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const PRESETS = [
  { label: 'Hari Ini',   getDari: today,        getSampai: today },
  { label: 'Bulan Ini',  getDari: firstOfMonth, getSampai: today },
  { label: 'Tahun Ini',  getDari: () => `${new Date().getFullYear()}-01-01`, getSampai: today },
  { label: 'Semester 1', getDari: () => `${new Date().getFullYear()}-01-01`, getSampai: () => `${new Date().getFullYear()}-06-30` },
  { label: 'Semester 2', getDari: () => `${new Date().getFullYear()}-07-01`, getSampai: () => `${new Date().getFullYear()}-12-31` },
]

const LAPORAN_COLUMNS = [
  { key: 'status',             label: 'Status' },
  { key: 'tanggal_terima',     label: 'Tgl Diproses' },
  { key: 'nomor_surat_jalan',  label: 'No. Surat Jalan' },
  { key: 'nomor_bast',         label: 'No. BAST' },
  { key: 'nama_barang',        label: 'Nama Barang' },
  { key: 'kode_barang',        label: 'Kode' },
  { key: 'jumlah',             label: 'Jml', align: 'right' as const },
  { key: 'kondisi_diterima',   label: 'Kondisi' },
  { key: 'pengirim',           label: 'Pengirim' },
  { key: 'tanggal_kirim',      label: 'Tgl Kirim' },
  { key: 'catatan_penerimaan', label: 'Catatan' },
]

// ─── Komponen Utama ────────────────────────────────────────────────────────────

export default function PenerimaanPage() {
  const isMobile = useIsMobile()
  const { success, error: showError } = useNotification()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('menunggu')

  // Menunggu konfirmasi
  const [distribusiList, setDistribusiList] = useState<Distribusi[]>([])
  const [loading, setLoading] = useState(true)

  // Riwayat — sekarang berisi grup (bulk/single)
  const [riwayatList, setRiwayatList] = useState<RiwayatGrup[]>([])
  const [riwayatLoading, setRiwayatLoading] = useState(false)
  const [riwayatFilter, setRiwayatFilter] = useState<RiwayatFilter>('semua')
  const [searchRiwayat, setSearchRiwayat] = useState('')
  // Set nomor_pengiriman atau nomor_surat_jalan (single) yang sedang dibuka di accordion
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Modal konfirmasi
  const [selectedItem, setSelectedItem] = useState<Distribusi | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [aksi, setAksi] = useState<'terima' | 'tolak'>('terima')
  const [catatanPenerimaan, setCatatanPenerimaan] = useState('')
  const [kondisiDiterima, setKondisiDiterima] = useState<string>('Baik')
  const [processing, setProcessing] = useState(false)

  // ── Print state ───────────────────────────────────────────────────────────
  const [printingId, setPrintingId] = useState<number | null>(null)

  const handleCetakBast = useCallback(async (id: number) => {
    setPrintingId(id)
    try {
      const { data } = await axios.get(`/api/distribusi-asets/${id}/bast`)
      generateBast(data)
    } catch (err) {
      console.error('Gagal mencetak BAST:', err)
      showError('Gagal mengambil data BAST. Silakan coba lagi.')
    } finally {
      setPrintingId(null)
    }
  }, [showError])

  // Cetak Surat Jalan Bulk untuk seluruh batch
  const [printingBulk, setPrintingBulk] = useState<string | null>(null)
  const handleCetakSuratJalanBulk = useCallback(async (nomorPengiriman: string) => {
    setPrintingBulk(nomorPengiriman)
    try {
      const { data } = await axios.get(
        `/api/distribusi-asets/bulk/${encodeURIComponent(nomorPengiriman)}/surat-jalan`
      )
      generateSuratJalanBulk(data as SuratJalanBulkApiResponse)
    } catch (err) {
      console.error('Gagal mencetak surat jalan bulk:', err)
      showError('Gagal mengambil data surat jalan. Silakan coba lagi.')
    } finally {
      setPrintingBulk(null)
    }
  }, [showError])

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // ── Laporan state ─────────────────────────────────────────────────────────
  const [laporanDari, setLaporanDari] = useState(firstOfMonth())
  const [laporanSampai, setLaporanSampai] = useState(today())
  const [laporanStatus, setLaporanStatus] = useState<StatusLaporan>('semua')
  const [laporanSearch, setLaporanSearch] = useState('')
  const [laporanLoading, setLaporanLoading] = useState(false)
  const [laporanError, setLaporanError] = useState('')
  const [laporanResult, setLaporanResult] = useState<LaporanResponse | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchDistribusi()
    fetchRiwayat()
  }, [])

  const fetchDistribusi = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/distribusi-asets?status=menunggu_konfirmasi')
      setDistribusiList(response.data)
    } catch (error) {
      console.error('Error fetching distribusi:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRiwayat = useCallback(async () => {
    setRiwayatLoading(true)
    try {
      const params = new URLSearchParams()
      if (riwayatFilter !== 'semua') params.set('status', riwayatFilter)
      if (searchRiwayat.trim()) params.set('search', searchRiwayat.trim())
      const response = await axios.get(`/api/distribusi-asets/riwayat?${params.toString()}`)
      setRiwayatList(response.data)
    } catch (error) {
      console.error('Error fetching riwayat:', error)
    } finally {
      setRiwayatLoading(false)
    }
  }, [riwayatFilter, searchRiwayat])

  useEffect(() => {
    if (activeTab === 'riwayat') {
      fetchRiwayat()
    }
  }, [activeTab, riwayatFilter, fetchRiwayat])

  const handleOpenModal = (item: Distribusi, action: 'terima' | 'tolak') => {
    setSelectedItem(item)
    setAksi(action)
    setKondisiDiterima(item.sarana_prasarana.kondisi || 'Baik')
    setCatatanPenerimaan(
      action === 'terima'
        ? 'Barang telah diperiksa fisik dan diterima dalam kondisi baik.'
        : 'Ditolak karena tidak sesuai dengan surat jalan.'
    )
    setShowModal(true)
  }

  const handleKonfirmasi = async () => {
    if (!selectedItem) return
    setProcessing(true)
    try {
      await axios.post(`/api/distribusi-asets/${selectedItem.id}/konfirmasi`, {
        aksi,
        catatan_penerimaan: catatanPenerimaan,
        kondisi_diterima: aksi === 'terima' ? kondisiDiterima : undefined,
      })
      if (aksi === 'terima') {
        success('Barang berhasil diterima dan BAST telah diterbitkan')
      } else {
        success('Pengiriman barang telah ditolak')
      }
      setShowModal(false)
      setSelectedItem(null)
      fetchDistribusi()
      fetchRiwayat()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      const msg = err?.response?.data?.message || 'Terjadi kesalahan saat konfirmasi'
      showError(msg)
    } finally {
      setProcessing(false)
    }
  }

  const handleSearchRiwayat = (e: React.FormEvent) => {
    e.preventDefault()
    fetchRiwayat()
  }

  // ── Laporan handlers ──────────────────────────────────────────────────────

  const handleGenerateLaporan = async () => {
    setLaporanError('')
    setLaporanResult(null)
    setLaporanSearch('')
    setSelectedIds(new Set())
    setLaporanLoading(true)
    try {
      const params: Record<string, string> = {
        dari: laporanDari,
        sampai: laporanSampai,
      }
      if (laporanStatus !== 'semua') params.status = laporanStatus
      const res = await axios.get('/api/laporan/penerimaan', { params })
      setLaporanResult(res.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const msg = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(', ')
        : err?.response?.data?.message || 'Gagal mengambil data laporan.'
      setLaporanError(msg)
    } finally {
      setLaporanLoading(false)
    }
  }

  const laporanFiltered = useMemo(() =>
    (laporanResult?.data ?? []).filter(row =>
      laporanSearch === '' ||
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(laporanSearch.toLowerCase()))
    ),
    [laporanResult, laporanSearch]
  )

  const isAllSelected = laporanFiltered.length > 0 && laporanFiltered.every(r => selectedIds.has(r.id))
  const isSomeSelected = laporanFiltered.some(r => selectedIds.has(r.id))

  const toggleAll = () => {
    if (isAllSelected) {
      const next = new Set(selectedIds)
      laporanFiltered.forEach(r => next.delete(r.id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      laporanFiltered.forEach(r => next.add(r.id))
      setSelectedIds(next)
    }
  }

  const toggleRow = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleExport = (onlySelected = false) => {
    if (!laporanResult) return
    const dataToExport = onlySelected && selectedIds.size > 0
      ? laporanFiltered.filter(r => selectedIds.has(r.id))
      : laporanFiltered

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // ── Header ───────────────────────────────────────────────────────────────
    doc.setFillColor(15, 118, 110) // teal-700
    doc.rect(0, 0, 297, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('LAPORAN PENERIMAAN BARANG WORKSHOP', 148.5, 10, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const periodeText = laporanDari && laporanSampai
      ? `Periode: ${laporanDari} s/d ${laporanSampai}`
      : 'Semua Periode'
    const statusText = laporanStatus === 'semua' ? 'Status: Semua'
      : laporanStatus === 'diterima' ? 'Status: Diterima'
      : 'Status: Ditolak'
    doc.text(`${periodeText}   |   ${statusText}   |   ${onlySelected ? selectedIds.size + ' data terpilih' : dataToExport.length + ' data'}`, 148.5, 17, { align: 'center' })

    // ── Ringkasan ─────────────────────────────────────────────────────────────
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('RINGKASAN', 14, 30)
    doc.setFont('helvetica', 'normal')
    const ring = laporanResult.ringkasan
    const cards = [
      { label: 'Total Diterima', value: String(ring.total_diterima), color: [5, 150, 105] as [number,number,number] },
      { label: 'Total Ditolak',  value: String(ring.total_ditolak),  color: [220, 38, 38] as [number,number,number] },
      { label: 'Total Barang',   value: String(ring.total_barang),   color: [37, 99, 235] as [number,number,number] },
    ]
    cards.forEach((card, i) => {
      const x = 14 + i * 50
      doc.setFillColor(...card.color)
      doc.roundedRect(x, 33, 44, 14, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(card.value, x + 22, 41, { align: 'center' })
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(card.label, x + 22, 44.5, { align: 'center' })
    })

    // ── Tabel ─────────────────────────────────────────────────────────────────
    doc.setTextColor(30, 30, 30)
    autoTable(doc, {
      startY: 52,
      head: [LAPORAN_COLUMNS.map(c => c.label)],
      body: dataToExport.map(row =>
        LAPORAN_COLUMNS.map(c => {
          const v = row[c.key]
          if (v === null || v === undefined) return ''
          if (c.key === 'status') return String(v) === 'diterima' ? '✓ Diterima' : '✗ Ditolak'
          return String(v)
        })
      ),
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [15, 118, 110],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center' },  // Status
        1: { cellWidth: 22 },                    // Tgl Diproses
        2: { cellWidth: 28 },                    // No. Surat Jalan
        3: { cellWidth: 28 },                    // No. BAST
        4: { cellWidth: 40 },                    // Nama Barang
        5: { cellWidth: 22 },                    // Kode
        6: { cellWidth: 12, halign: 'center' },  // Jml
        7: { cellWidth: 20 },                    // Kondisi
        8: { cellWidth: 30 },                    // Pengirim
        9: { cellWidth: 22 },                    // Tgl Kirim
        10: { cellWidth: 35 },                   // Catatan
      },
      didDrawCell: (data) => {
        // Warna teks status
        if (data.section === 'body' && data.column.index === 0) {
          const val = String(data.cell.raw ?? '')
          if (val.includes('Diterima')) {
            doc.setTextColor(5, 150, 105)
          } else if (val.includes('Ditolak')) {
            doc.setTextColor(220, 38, 38)
          }
        }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          data.cell.styles.fontStyle = 'bold'
        }
      },
      margin: { left: 14, right: 14 },
    })

    // ── Footer ─────────────────────────────────────────────────────────────────
    const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}   |   Halaman ${i} dari ${pageCount}`,
        148.5,
        205,
        { align: 'center' }
      )
    }

    const suffix = onlySelected ? `_${selectedIds.size}terpilih` : ''
    doc.save(`laporan_penerimaan_${laporanDari || 'semua'}_sd_${laporanSampai || 'semua'}${suffix}.pdf`)
  }

  // ── Renderers status / label ──────────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    if (status === 'diterima') return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    if (status === 'ditolak') return 'bg-red-100 text-red-800 border border-red-200'
    return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
  }

  const getStatusLabel = (status: string) => {
    if (status === 'diterima') return 'Diterima'
    if (status === 'ditolak') return 'Ditolak'
    return 'Menunggu'
  }

  const getStatusIcon = (status: string) => {
    if (status === 'diterima') return <CheckCircle2 className="h-3 w-3" />
    if (status === 'ditolak') return <Ban className="h-3 w-3" />
    return <Clock className="h-3 w-3" />
  }

  const formatTanggal = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const renderLaporanCell = (key: string, val: unknown) => {
    if (val === null || val === undefined || val === '') return <span className="text-slate-300">—</span>
    if (key === 'status') {
      const v = String(val)
      if (v === 'diterima') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-2.5 w-2.5" /> Diterima
        </span>
      )
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
          <Ban className="h-2.5 w-2.5" /> Ditolak
        </span>
      )
    }
    if (key === 'kondisi_diterima') {
      const k = String(val).toLowerCase()
      const cls = k === 'baik'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : k.includes('rusak')
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
      return <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cls}`}>{String(val)}</span>
    }
    if (key === 'nomor_surat_jalan' || key === 'nomor_bast' || key === 'kode_barang') {
      return <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{String(val)}</span>
    }
    return <span className="text-xs">{String(val)}</span>
  }

  // Stats ringkas — hitung dari semua item dalam semua grup
  const riwayatDiterima = riwayatList.reduce((s, g) => s + g.items.filter(i => i.status === 'diterima').length, 0)
  const riwayatDitolak  = riwayatList.reduce((s, g) => s + g.items.filter(i => i.status === 'ditolak').length, 0)

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow p-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Penerimaan Barang Workshop</h1>
          <p className="text-sm text-gray-600 mt-1">
            Konfirmasi penerimaan barang, lihat riwayat, dan buat laporan
          </p>
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div className="text-xs text-yellow-700 font-medium">Menunggu Konfirmasi</div>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{distribusiList.length}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div className="text-xs text-emerald-700 font-medium">Total Diterima</div>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{riwayatDiterima}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Ban className="h-4 w-4 text-red-500" />
              <div className="text-xs text-red-700 font-medium">Total Ditolak</div>
            </div>
            <div className="text-2xl font-bold text-red-600">{riwayatDitolak}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-5 gap-1">
          <button
            onClick={() => setActiveTab('menunggu')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'menunggu'
                ? 'border-yellow-500 text-yellow-700 bg-yellow-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Menunggu Konfirmasi
            {distribusiList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500 text-white">
                {distribusiList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'riwayat'
                ? 'border-blue-500 text-blue-700 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <History className="h-4 w-4" />
            Riwayat
            {riwayatList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                {riwayatList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('laporan')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'laporan'
                ? 'border-teal-500 text-teal-700 bg-teal-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText className="h-4 w-4" />
            Laporan
          </button>
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* TAB: MENUNGGU KONFIRMASI                     */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === 'menunggu' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                <p className="mt-2 text-gray-600">Memuat data...</p>
              </div>
            ) : distribusiList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-300 mb-3" />
                <p className="text-lg font-medium">Tidak ada barang yang perlu dikonfirmasi</p>
                <p className="text-sm mt-1">Semua pengiriman sudah diproses</p>
              </div>
            ) : isMobile ? (
              /* Mobile Card View — Menunggu */
              <div className="space-y-3">
                {distribusiList.map((item) => (
                  <MobileCard key={item.id}>
                    <MobileCardHeader
                      title={item.sarana_prasarana.nama_barang}
                      subtitle={item.sarana_prasarana.kode}
                      badge={
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            item.sarana_prasarana.kondisi === 'Baik'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-red-100 text-red-700 border border-red-200'
                          }`}
                        >
                          {item.sarana_prasarana.kondisi === 'Baik' ? (
                            <CheckCircle2 className="h-2.5 w-2.5" />
                          ) : (
                            <AlertTriangle className="h-2.5 w-2.5" />
                          )}
                          {item.sarana_prasarana.kondisi}
                        </span>
                      }
                      icon={<Package className="h-4 w-4 text-blue-600" />}
                    />
                    <div className="space-y-2">
                      <MobileCardRow
                        label="Surat Jalan"
                        value={
                          <span className="font-mono text-blue-600 font-bold flex items-center gap-1 justify-end">
                            <Truck className="h-3 w-3" />
                            {item.nomor_surat_jalan}
                          </span>
                        }
                      />
                      <MobileCardRow
                        label="Jumlah"
                        value={<span className="font-extrabold text-slate-900">{item.jumlah} Unit</span>}
                      />
                      <MobileCardRow label="Pengirim" value={item.petugas_pengirim.nama_lengkap} />
                      <MobileCardRow
                        label="Tanggal Kirim"
                        value={new Date(item.tanggal_kirim).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      />
                      {item.catatan_pengiriman && (
                        <>
                          <MobileCardDivider />
                          <div className="text-xs text-slate-500 italic">
                            <span className="font-semibold text-slate-600">Catatan: </span>
                            {item.catatan_pengiriman}
                          </div>
                        </>
                      )}
                    </div>
                    <MobileCardActions>
                      <button
                        onClick={() => handleOpenModal(item, 'terima')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all text-xs font-bold shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Terima
                      </button>
                      <button
                        onClick={() => handleOpenModal(item, 'tolak')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all text-xs font-bold shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" /> Tolak
                      </button>
                    </MobileCardActions>
                  </MobileCard>
                ))}
              </div>
            ) : (
              /* Desktop Table View — Menunggu */
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">No. Surat Jalan</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Barang</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Jumlah</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Kondisi</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Dikirim Oleh</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tanggal Kirim</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distribusiList.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">{item.nomor_surat_jalan}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-800">{item.sarana_prasarana.nama_barang}</div>
                          <div className="text-xs text-gray-500">{item.sarana_prasarana.kode}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">{item.jumlah}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.sarana_prasarana.kondisi === 'Baik' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.sarana_prasarana.kondisi}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.petugas_pengirim.nama_lengkap}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(item.tanggal_kirim).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenModal(item, 'terima')}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-medium"
                            >
                              ✓ Terima
                            </button>
                            <button
                              onClick={() => handleOpenModal(item, 'tolak')}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
                            >
                              ✗ Tolak
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB: RIWAYAT                                */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === 'riwayat' && (
          <>
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
                {(['semua', 'diterima', 'ditolak'] as RiwayatFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setRiwayatFilter(f)}
                    className={`px-4 py-2 transition-colors capitalize ${
                      riwayatFilter === f
                        ? f === 'diterima' ? 'bg-emerald-600 text-white'
                          : f === 'ditolak' ? 'bg-red-600 text-white'
                          : 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {f === 'semua' ? 'Semua' : f === 'diterima' ? '✓ Diterima' : '✗ Ditolak'}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSearchRiwayat} className="flex gap-2 flex-1 sm:max-w-xs">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari barang / no. surat jalan / no. pengiriman..."
                    value={searchRiwayat}
                    onChange={(e) => setSearchRiwayat(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Cari
                </button>
              </form>
            </div>

            {riwayatLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                <p className="mt-2 text-gray-600">Memuat riwayat...</p>
              </div>
            ) : riwayatList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-medium">Belum ada riwayat</p>
                <p className="text-sm mt-1">Riwayat akan muncul setelah Anda memproses penerimaan barang</p>
              </div>
            ) : (
              /* ── Grouped Accordion View ── */
              <div className="space-y-3">
                {riwayatList.map((grup, grupIdx) => {
                  // Key unik per grup
                  const grupKey = grup.nomor_pengiriman ?? `single-${grup.items[0]?.id ?? grupIdx}`
                  const isOpen  = expandedGroups.has(grupKey)
                  const isBulk  = grup.type === 'bulk'
                  const totalUnit = grup.items.reduce((s, i) => s + i.jumlah, 0)

                  // Warna border & badge berdasarkan status grup
                  const grupBorderClass =
                    grup.status === 'diterima' ? 'border-emerald-300' :
                    grup.status === 'ditolak'  ? 'border-red-300' :
                    grup.status === 'sebagian' ? 'border-amber-300' :
                    'border-gray-200'

                  const grupBgClass =
                    grup.status === 'diterima' ? 'bg-emerald-50' :
                    grup.status === 'ditolak'  ? 'bg-red-50' :
                    grup.status === 'sebagian' ? 'bg-amber-50' :
                    'bg-gray-50'

                  return (
                    <div
                      key={grupKey}
                      className={`rounded-xl border-2 ${grupBorderClass} overflow-hidden shadow-sm`}
                    >
                      {/* ── Header grup (klik untuk buka/tutup) ── */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(grupKey)}
                        className={`w-full ${grupBgClass} px-4 py-3 flex items-center justify-between gap-3 hover:brightness-95 transition-all text-left`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-wrap">
                          {/* Badge tipe pengiriman */}
                          {isBulk ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 flex-shrink-0">
                              <Truck className="h-2.5 w-2.5" /> Bulk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                              <Package className="h-2.5 w-2.5" /> Single
                            </span>
                          )}

                          {/* Nomor pengiriman / surat jalan */}
                          <span className="font-mono text-sm font-bold text-slate-800">
                            {isBulk ? grup.nomor_pengiriman : grup.items[0]?.nomor_surat_jalan}
                          </span>

                          {/* Nama barang (untuk single) atau jumlah jenis (untuk bulk) */}
                          {isBulk ? (
                            <span className="text-xs text-slate-600">
                              {grup.items.length} jenis barang · {totalUnit} unit
                            </span>
                          ) : (
                            <span className="text-xs text-slate-600 truncate max-w-[180px]">
                              {grup.items[0]?.sarana_prasarana.nama_barang}
                            </span>
                          )}

                          {/* Status badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${
                            grup.status === 'diterima' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            grup.status === 'ditolak'  ? 'bg-red-100 text-red-700 border-red-200' :
                            grup.status === 'sebagian' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {grup.status === 'diterima' ? <><CheckCircle2 className="h-2.5 w-2.5" /> Diterima</> :
                             grup.status === 'ditolak'  ? <><Ban className="h-2.5 w-2.5" /> Ditolak</> :
                             grup.status === 'sebagian' ? <><AlertTriangle className="h-2.5 w-2.5" /> Sebagian</> :
                             <><Clock className="h-2.5 w-2.5" /> Proses</>}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Info tanggal & pengirim */}
                          <div className="hidden sm:flex flex-col items-end text-right">
                            <span className="text-xs text-slate-500">
                              {new Date(grup.tanggal_kirim).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-slate-400">{grup.petugas_pengirim?.nama_lengkap}</span>
                          </div>

                          {/* Cetak Surat Jalan Bulk */}
                          {isBulk && grup.nomor_pengiriman && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleCetakSuratJalanBulk(grup.nomor_pengiriman!) }}
                              disabled={printingBulk === grup.nomor_pengiriman}
                              title="Cetak Surat Jalan Bulk"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
                      </button>

                      {/* ── Isi accordion ── */}
                      {isOpen && (
                        <div className="border-t border-slate-100 bg-white">
                          {/* Mobile card view */}
                          {isMobile ? (
                            <div className="p-3 space-y-3">
                              {grup.items.map((item) => (
                                <MobileCard key={item.id}>
                                  <MobileCardHeader
                                    title={item.sarana_prasarana.nama_barang}
                                    subtitle={item.sarana_prasarana.kode}
                                    badge={
                                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${getStatusBadge(item.status)}`}>
                                        {getStatusIcon(item.status)}
                                        {getStatusLabel(item.status)}
                                      </span>
                                    }
                                    icon={<Package className="h-4 w-4 text-slate-500" />}
                                  />
                                  <div className="space-y-2">
                                    <MobileCardRow
                                      label="Surat Jalan"
                                      value={<span className="font-mono text-blue-600 font-bold text-xs">{item.nomor_surat_jalan}</span>}
                                    />
                                    {item.nomor_bast && (
                                      <MobileCardRow
                                        label="No. BAST"
                                        value={<span className="font-mono text-emerald-600 font-bold text-xs">{item.nomor_bast}</span>}
                                      />
                                    )}
                                    <MobileCardRow label="Jumlah" value={<span className="font-extrabold">{item.jumlah} Unit</span>} />
                                    <MobileCardRow
                                      label="Tgl Diproses"
                                      value={item.tanggal_terima
                                        ? new Date(item.tanggal_terima).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                        : '-'}
                                    />
                                    {item.catatan_penerimaan && (
                                      <>
                                        <MobileCardDivider />
                                        <div className="text-xs italic text-slate-500">
                                          <span className="font-semibold">Catatan: </span>{item.catatan_penerimaan}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  {item.status === 'diterima' && (
                                    <MobileCardActions>
                                      <button
                                        onClick={() => handleCetakBast(item.id)}
                                        disabled={printingId === item.id}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition-all text-xs font-bold shadow-sm disabled:opacity-50"
                                      >
                                        {printingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck2 className="h-3.5 w-3.5" />}
                                        Cetak BAST
                                      </button>
                                    </MobileCardActions>
                                  )}
                                </MobileCard>
                              ))}
                            </div>
                          ) : (
                            /* Desktop table view dalam accordion */
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                                    <th className="px-4 py-2 text-left font-semibold">No. Surat Jalan</th>
                                    <th className="px-4 py-2 text-left font-semibold">No. BAST</th>
                                    <th className="px-4 py-2 text-left font-semibold">Nama Barang</th>
                                    <th className="px-4 py-2 text-center font-semibold">Jml</th>
                                    <th className="px-4 py-2 text-left font-semibold">Kondisi</th>
                                    <th className="px-4 py-2 text-left font-semibold">Tgl Diproses</th>
                                    <th className="px-4 py-2 text-left font-semibold">Catatan</th>
                                    <th className="px-4 py-2 text-left font-semibold">Cetak</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {grup.items.map((item) => (
                                    <tr
                                      key={item.id}
                                      className={`hover:bg-slate-50 transition-colors ${
                                        item.status === 'diterima' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-red-400'
                                      }`}
                                    >
                                      <td className="px-4 py-2.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${getStatusBadge(item.status)}`}>
                                          {getStatusIcon(item.status)} {getStatusLabel(item.status)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 font-mono text-blue-600 font-semibold text-xs whitespace-nowrap">
                                        {item.nomor_surat_jalan}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        {item.nomor_bast
                                          ? <span className="font-mono text-emerald-600 font-semibold text-xs">{item.nomor_bast}</span>
                                          : <span className="text-slate-300 text-xs">—</span>}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <div className="font-medium text-slate-800">{item.sarana_prasarana.nama_barang}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{item.sarana_prasarana.kode}</div>
                                      </td>
                                      <td className="px-4 py-2.5 text-center font-bold">{item.jumlah}</td>
                                      <td className="px-4 py-2.5">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                          item.sarana_prasarana.kondisi === 'Baik'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-red-50 text-red-700'
                                        }`}>
                                          {item.sarana_prasarana.kondisi}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                                        <span className={`font-medium ${item.status === 'diterima' ? 'text-emerald-600' : 'text-red-600'}`}>
                                          {item.tanggal_terima
                                            ? new Date(item.tanggal_terima).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : '—'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[160px]">
                                        {item.catatan_penerimaan
                                          ? <span className="italic line-clamp-2" title={item.catatan_penerimaan}>{item.catatan_penerimaan}</span>
                                          : <span className="text-slate-300">—</span>}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        {item.status === 'diterima' ? (
                                          <button
                                            onClick={() => handleCetakBast(item.id)}
                                            disabled={printingId === item.id}
                                            title="Cetak BAST"
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                          >
                                            {printingId === item.id
                                              ? <Loader2 className="h-3 w-3 animate-spin" />
                                              : <FileCheck2 className="h-3 w-3" />}
                                            BAST
                                          </button>
                                        ) : (
                                          <span className="text-slate-300 text-xs">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                {/* Footer total jika bulk */}
                                {isBulk && (
                                  <tfoot>
                                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                                      <td colSpan={4} className="px-4 py-2 text-xs font-bold text-slate-500 text-right">TOTAL</td>
                                      <td className="px-4 py-2 text-center font-extrabold text-slate-800">{totalUnit}</td>
                                      <td colSpan={4} />
                                    </tr>
                                  </tfoot>
                                )}
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════ */}

        {/* TAB: LAPORAN                                 */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === 'laporan' && (
          <div className="space-y-5">

            {/* Panel Filter */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">

              {/* Filter Status */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> Filter Status
                </p>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-semibold w-fit bg-white">
                  {(['semua', 'diterima', 'ditolak'] as StatusLaporan[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setLaporanStatus(s)}
                      className={`px-5 py-2 transition-all ${
                        laporanStatus === s
                          ? s === 'diterima' ? 'bg-emerald-600 text-white'
                            : s === 'ditolak' ? 'bg-red-600 text-white'
                            : 'bg-slate-700 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s === 'semua' ? 'Semua' : s === 'diterima' ? '✓ Diterima' : '✗ Ditolak'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rentang Tanggal */}
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Rentang Tanggal Diproses
                </p>
                {/* Preset Cepat */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => { setLaporanDari(p.getDari()); setLaporanSampai(p.getSampai()) }}
                      className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Dari Tanggal</label>
                    <input
                      type="date"
                      value={laporanDari}
                      onChange={e => setLaporanDari(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={laporanSampai}
                      onChange={e => setLaporanSampai(e.target.value)}
                      min={laporanDari}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Tombol Generate */}
              <button
                onClick={handleGenerateLaporan}
                disabled={laporanLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {laporanLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Memuat Data...</>
                  : <><TrendingUp className="h-4 w-4" /> Generate Laporan</>
                }
              </button>
            </div>

            {/* Error */}
            {laporanError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {laporanError}
              </div>
            )}

            {/* Hasil */}
            {laporanResult && (
              <div className="space-y-4">

                {/* Ringkasan Statistik */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">Total Diterima</span>
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-700">{laporanResult.ringkasan.total_diterima}</div>
                    <div className="text-[10px] text-emerald-500 mt-0.5">pengiriman diterima</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Ban className="h-4 w-4 text-red-500" />
                      <span className="text-xs font-semibold text-red-700">Total Ditolak</span>
                    </div>
                    <div className="text-2xl font-extrabold text-red-700">{laporanResult.ringkasan.total_ditolak}</div>
                    <div className="text-[10px] text-red-500 mt-0.5">pengiriman ditolak</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-semibold text-blue-700">Total Barang</span>
                    </div>
                    <div className="text-2xl font-extrabold text-blue-700">{laporanResult.ringkasan.total_barang}</div>
                    <div className="text-[10px] text-blue-500 mt-0.5">unit barang masuk</div>
                  </div>
                </div>

                {/* Banner seleksi */}
                {selectedIds.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-xl">
                    <div className="flex items-center gap-2 text-sm text-teal-700 font-semibold">
                      <CheckSquare className="h-4 w-4" />
                      {selectedIds.size} baris dipilih
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium underline underline-offset-2"
                      >
                        Hapus Pilihan
                      </button>
                      <button
                        onClick={() => handleExport(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        PDF {selectedIds.size} Data
                      </button>
                    </div>
                  </div>
                )}

                {/* Tabel Data */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter data..."
                        value={laporanSearch}
                        onChange={e => setLaporanSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleAll}
                        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                      >
                        {isAllSelected
                          ? <><CheckSquare className="h-3.5 w-3.5 text-teal-600" /> Batalkan Semua</>
                          : <><Square className="h-3.5 w-3.5" /> Pilih Semua</>
                        }
                      </button>
                      <span className="text-xs text-slate-400 px-2.5 py-1 bg-slate-100 rounded-lg font-medium">
                        {laporanFiltered.length} data
                      </span>
                      <button
                        onClick={() => handleExport(false)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" /> Unduh PDF
                      </button>
                    </div>
                  </div>

                  {/* Tabel */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[10px] uppercase tracking-widest">
                          <th className="px-4 py-3 w-10">
                            <button onClick={toggleAll} className="flex items-center justify-center">
                              {isAllSelected
                                ? <CheckSquare className="h-4 w-4 text-teal-600" />
                                : isSomeSelected
                                ? <div className="h-4 w-4 border-2 border-teal-400 rounded bg-teal-50 flex items-center justify-center">
                                    <div className="h-1.5 w-2.5 bg-teal-500 rounded-sm" />
                                  </div>
                                : <Square className="h-4 w-4 text-slate-300" />
                              }
                            </button>
                          </th>
                          <th className="px-3 py-3 w-8 font-semibold">#</th>
                          {LAPORAN_COLUMNS.map(c => (
                            <th key={c.key} className={`px-3 py-3 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {laporanFiltered.length === 0 ? (
                          <tr>
                            <td colSpan={LAPORAN_COLUMNS.length + 2} className="py-12 text-center text-sm text-slate-400">
                              Tidak ada data dalam periode ini.
                            </td>
                          </tr>
                        ) : (
                          laporanFiltered.map((row, idx) => {
                            const isSelected = selectedIds.has(row.id)
                            return (
                              <tr
                                key={row.id}
                                onClick={() => toggleRow(row.id)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected ? 'bg-teal-50/60 hover:bg-teal-50' : 'hover:bg-slate-50/80'
                                }`}
                              >
                                <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleRow(row.id) }}>
                                  {isSelected
                                    ? <CheckSquare className="h-4 w-4 text-teal-600" />
                                    : <Square className="h-4 w-4 text-slate-300" />
                                  }
                                </td>
                                <td className="px-3 py-3 text-xs text-slate-400 font-medium">{idx + 1}</td>
                                {LAPORAN_COLUMNS.map(c => (
                                  <td key={c.key} className={`px-3 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                                    {renderLaporanCell(c.key, row[c.key])}
                                  </td>
                                ))}
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer hint */}
                  <div className="px-4 py-3 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-xs text-slate-400">Klik baris untuk memilih • Unduh PDF data terpilih</p>
                    <span className="text-xs font-medium text-slate-500">{selectedIds.size} / {laporanFiltered.length} dipilih</span>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!laporanResult && !laporanLoading && !laporanError && (
              <div className="text-center py-16 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <p className="font-semibold text-slate-600 text-sm">Atur filter dan klik &quot;Generate Laporan&quot;</p>
                <p className="text-slate-400 text-xs mt-1">Pilih rentang tanggal dan status penerimaan</p>
                <p className="text-teal-500 text-xs mt-3 flex items-center justify-center gap-1.5 font-medium">
                  <CheckSquare className="h-3.5 w-3.5" />
                  Centang baris data untuk export selektif
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slideIn">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${aksi === 'terima' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {aksi === 'terima'
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    : <X className="h-5 w-5 text-red-600" />
                  }
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {aksi === 'terima' ? 'Terima Barang' : 'Tolak Barang'}
                </h2>
              </div>
              <button
                onClick={() => { setShowModal(false); setSelectedItem(null) }}
                disabled={processing}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Nama Barang</p>
                <p className="font-bold text-slate-900 mb-3">{selectedItem.sarana_prasarana.nama_barang}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">No. Surat Jalan</p>
                    <p className="text-xs font-semibold text-slate-700">{selectedItem.nomor_surat_jalan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jumlah</p>
                    <p className="text-xs font-semibold text-slate-700">{selectedItem.jumlah} unit</p>
                  </div>
                </div>
              </div>

              {aksi === 'terima' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Kondisi Barang Saat Diterima <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={kondisiDiterima}
                    onChange={(e) => setKondisiDiterima(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 font-medium"
                    disabled={processing}
                  >
                    <option value="Baik">Baik</option>
                    <option value="Cukup Baik">Cukup Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Catatan {aksi === 'terima' ? 'Penerimaan' : 'Penolakan'}
                </label>
                <textarea
                  value={catatanPenerimaan}
                  onChange={(e) => setCatatanPenerimaan(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                  rows={3}
                  placeholder={`Masukkan catatan ${aksi === 'terima' ? 'penerimaan' : 'penolakan'}...`}
                  disabled={processing}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => { setShowModal(false); setSelectedItem(null) }}
                disabled={processing}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleKonfirmasi}
                disabled={processing}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                  aksi === 'terima' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? 'Memproses...' : aksi === 'terima' ? 'Terima Barang' : 'Tolak Barang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}