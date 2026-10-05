'use client'

import { useState, useEffect, useRef } from 'react'
import axios from '@/lib/axios'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useNotification } from '@/hooks/useNotification'
import {
  generateSuratJalan,
  generateBast,
} from '@/lib/printDokumen'
import {
  MobileCard,
  MobileCardHeader,
  MobileCardRow,
  MobileCardActions,
  MobileCardDivider
} from '@/components/MobileCard'
import {
  Package, Truck, CheckCircle2, X, AlertTriangle,
  Camera, ZoomIn, AlertCircle, FileText, Printer,
  Search, Clock, XCircle, Info, Calendar, User, Eye, Loader2
} from 'lucide-react'

interface Distribusi {
  id: number
  nomor_surat_jalan: string
  nomor_bast: string | null
  jumlah: number
  harga_satuan: number
  total_harga: number
  tanggal_kirim: string
  tanggal_terima: string | null
  status: string
  catatan_pengiriman: string | null
  catatan_penerimaan: string | null
  foto_kerusakan_url: string | null
  sarana_prasarana: {
    nama_barang: string
    kode: string
    kondisi: string
    satuan?: string
    foto_kerusakan_url: string | null
  }
  ruangan_tujuan: {
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

type TabKey = 'menunggu' | 'diterima' | 'ditolak' | 'semua'

export default function PenerimaanPage() {
  const isMobile = useIsMobile()
  const { success, error: showError } = useNotification()
  const [distribusiList, setDistribusiList] = useState<Distribusi[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('menunggu')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal konfirmasi (terima / tolak)
  const [selectedItem, setSelectedItem] = useState<Distribusi | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [aksi, setAksi] = useState<'terima' | 'tolak'>('terima')
  const [catatanPenerimaan, setCatatanPenerimaan] = useState('')
  const [kondisiDiterima, setKondisiDiterima] = useState<string>('Baik')
  const [processing, setProcessing] = useState(false)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  // Modal detail BAST / Pengiriman
  const [detailItem, setDetailItem] = useState<Distribusi | null>(null)

  // Lightbox & Printing state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [printingId, setPrintingId] = useState<number | null>(null)
  const [printingBastId, setPrintingBastId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isKondisiRusak = (k: string) =>
    k === 'Rusak Ringan' || k === 'Rusak Berat'

  const formatRupiah = (amount: number | null | undefined) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(amount)
  }

  useEffect(() => {
    fetchDistribusi()
  }, [])

  const fetchDistribusi = async () => {
    setLoading(true)
    try {
      // Ambil seluruh pengiriman ke workshop ini (menunggu, diterima, ditolak)
      const response = await axios.get('/api/distribusi-asets')
      setDistribusiList(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching distribusi:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCetakSuratJalan = async (id: number) => {
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
  }

  const handleCetakBast = async (id: number) => {
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
  }

  const handleOpenModal = (item: Distribusi, action: 'terima' | 'tolak') => {
    setSelectedItem(item)
    setAksi(action)
    setKondisiDiterima(item.sarana_prasarana.kondisi || 'Baik')
    setFotoFile(null)
    setFotoPreview(null)
    setCatatanPenerimaan(
      action === 'terima'
        ? 'Barang telah diperiksa fisik dan diterima dalam kondisi baik.'
        : 'Ditolak karena tidak sesuai dengan surat jalan.'
    )
    setShowModal(true)
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const removeFoto = () => {
    setFotoFile(null)
    setFotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleKonfirmasi = async () => {
    if (!selectedItem) return

    if (aksi === 'terima' && isKondisiRusak(kondisiDiterima) && !fotoFile) {
      showError('Wajib upload foto kerusakan barang jika kondisi Rusak Ringan atau Rusak Berat!')
      return
    }

    setProcessing(true)
    try {
      const fd = new FormData()
      fd.append('aksi', aksi)
      fd.append('catatan_penerimaan', catatanPenerimaan)
      if (aksi === 'terima') {
        fd.append('kondisi_diterima', kondisiDiterima)
        if (fotoFile) fd.append('foto_kerusakan', fotoFile)
      }

      await axios.post(
        `/api/distribusi-asets/${selectedItem.id}/konfirmasi`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      if (aksi === 'terima') {
        success('Barang berhasil diterima dan BAST telah diterbitkan.')
        setActiveTab('diterima') // langsung arahkan ke riwayat BAST diterima
      } else {
        success('Pengiriman barang telah ditolak.')
        setActiveTab('ditolak')
      }

      setShowModal(false)
      setSelectedItem(null)
      fetchDistribusi()
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Terjadi kesalahan saat konfirmasi'
      showError(msg)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
      menunggu_konfirmasi: {
        cls: 'bg-amber-100 text-amber-800 border-amber-200',
        label: 'Menunggu Konfirmasi',
        icon: <Clock className="h-3 w-3" />
      },
      diterima: {
        cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        label: 'Diterima (BAST Selesai)',
        icon: <CheckCircle2 className="h-3 w-3" />
      },
      ditolak: {
        cls: 'bg-rose-100 text-rose-800 border-rose-200',
        label: 'Ditolak',
        icon: <XCircle className="h-3 w-3" />
      },
    }
    return badges[status] || {
      cls: 'bg-gray-100 text-gray-800 border-gray-200',
      label: status,
      icon: null
    }
  }

  // Hitung counter tab
  const countMenunggu = distribusiList.filter(d => d.status === 'menunggu_konfirmasi').length
  const countDiterima = distribusiList.filter(d => d.status === 'diterima').length
  const countDitolak = distribusiList.filter(d => d.status === 'ditolak').length

  // Filter berdasarkan Tab dan Search
  const filteredList = distribusiList.filter(item => {
    // Filter tab
    if (activeTab === 'menunggu' && item.status !== 'menunggu_konfirmasi') return false
    if (activeTab === 'diterima' && item.status !== 'diterima') return false
    if (activeTab === 'ditolak' && item.status !== 'ditolak') return false

    // Filter pencarian
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      item.nomor_surat_jalan.toLowerCase().includes(q) ||
      (item.nomor_bast && item.nomor_bast.toLowerCase().includes(q)) ||
      item.sarana_prasarana.nama_barang.toLowerCase().includes(q) ||
      (item.sarana_prasarana.kode && item.sarana_prasarana.kode.toLowerCase().includes(q)) ||
      (item.petugas_pengirim?.nama_lengkap && item.petugas_pengirim.nama_lengkap.toLowerCase().includes(q))
    )
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Lightbox Foto */}
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

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Title */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
                <Truck className="h-5 w-5" />
              </div>
              Penerimaan &amp; Riwayat BAST Workshop
            </h1>
            <p className="text-sm text-slate-500 mt-1 ml-11">
              Periksa fisik kiriman barang dari petugas, sahkan BAST, dan pantau seluruh riwayat barang yang masuk ke workshop Anda
            </p>
          </div>

          <button
            onClick={fetchDistribusi}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all self-start sm:self-auto"
          >
            <Clock className="h-3.5 w-3.5" />
            Refresh Data
          </button>
        </div>

        {/* Summary Stats Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50/50">
          <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Menunggu Konfirmasi</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{countMenunggu} <span className="text-xs font-normal text-slate-500">kiriman</span></p>
              <p className="text-[11px] text-amber-700 mt-0.5">Perlu pemeriksaan fisik di bengkel</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Riwayat BAST Diterima</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{countDiterima} <span className="text-xs font-normal text-slate-500">barang</span></p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Resmi menjadi inventaris workshop</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Nilai Barang Masuk</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {formatRupiah(distribusiList.filter(d => d.status === 'diterima').reduce((s, d) => s + (d.total_harga || 0), 0))}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Akumulasi aset diterima via BAST</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Search Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setActiveTab('menunggu')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'menunggu'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Menunggu Konfirmasi
              {countMenunggu > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'menunggu' ? 'bg-white text-amber-600' : 'bg-amber-200 text-amber-800'
                }`}>
                  {countMenunggu}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('diterima')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'diterima'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Riwayat BAST Diterima
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'diterima' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {countDiterima}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ditolak')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'ditolak'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              Riwayat Ditolak
              {countDitolak > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeTab === 'ditolak' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-800'
                }`}>
                  {countDitolak}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('semua')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'semua'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Riwayat ({distribusiList.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari barang, no SJ, no BAST..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Memuat riwayat pengiriman &amp; BAST...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Package className="h-7 w-7 text-slate-300" />
            </div>
            <p className="font-bold text-slate-700 text-sm">
              {activeTab === 'menunggu'
                ? 'Tidak ada barang yang menunggu konfirmasi saat ini'
                : activeTab === 'diterima'
                ? 'Belum ada riwayat BAST yang disahkan'
                : 'Tidak ada data pengiriman yang ditemukan'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {activeTab === 'menunggu'
                ? 'Semua barang yang dikirimkan oleh admin/petugas telah selesai Anda verifikasi.'
                : 'Data pengiriman barang yang telah diterima atau ditolak akan tersimpan otomatis di sini.'}
            </p>
          </div>
        ) : isMobile ? (
          /* Mobile Card View */
          <div className="p-4 space-y-3">
            {filteredList.map((item) => {
              const st = getStatusBadge(item.status)
              const isMenunggu = item.status === 'menunggu_konfirmasi'
              const isDiterima = item.status === 'diterima'

              return (
                <MobileCard key={item.id}>
                  <MobileCardHeader
                    title={item.sarana_prasarana.nama_barang}
                    subtitle={item.sarana_prasarana.kode}
                    badge={
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${st.cls}`}>
                        {st.icon}
                        {st.label}
                      </span>
                    }
                    icon={<Package className="h-4 w-4 text-indigo-600" />}
                  />

                  <div className="space-y-2 text-xs">
                    <MobileCardRow
                      label="No. Surat Jalan"
                      value={
                        <span className="font-mono text-blue-600 font-bold flex items-center gap-1 justify-end">
                          <Truck className="h-3 w-3" />
                          {item.nomor_surat_jalan}
                        </span>
                      }
                    />
                    {item.nomor_bast && (
                      <MobileCardRow
                        label="No. BAST"
                        value={
                          <span className="font-mono text-emerald-700 font-bold flex items-center gap-1 justify-end">
                            <FileText className="h-3 w-3" />
                            {item.nomor_bast}
                          </span>
                        }
                      />
                    )}
                    <MobileCardRow
                      label="Jumlah"
                      value={<span className="font-extrabold text-slate-900">{item.jumlah} Unit</span>}
                    />
                    <MobileCardRow
                      label="Kondisi Fisik"
                      value={
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.sarana_prasarana.kondisi === 'Baik' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.sarana_prasarana.kondisi}
                        </span>
                      }
                    />
                    <MobileCardRow
                      label="Pengirim"
                      value={item.petugas_pengirim.nama_lengkap}
                    />
                    <MobileCardRow
                      label="Tgl Kirim"
                      value={new Date(item.tanggal_kirim).toLocaleDateString('id-ID')}
                    />
                    {item.tanggal_terima && (
                      <MobileCardRow
                        label="Tgl Diterima"
                        value={
                          <span className="text-emerald-700 font-semibold">
                            {new Date(item.tanggal_terima).toLocaleDateString('id-ID')}
                          </span>
                        }
                      />
                    )}
                    {item.catatan_penerimaan && (
                      <>
                        <MobileCardDivider />
                        <div className="text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-700">Catatan Penerima: </span>
                          {item.catatan_penerimaan}
                        </div>
                      </>
                    )}
                  </div>

                  <MobileCardActions>
                    {isMenunggu ? (
                      <>
                        <button
                          onClick={() => handleOpenModal(item, 'terima')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Terima &amp; Buat BAST
                        </button>
                        <button
                          onClick={() => handleOpenModal(item, 'tolak')}
                          className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold active:scale-95 transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                          Tolak
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex items-center gap-2">
                        {isDiterima && (
                          <button
                            onClick={() => handleCetakBast(item.id)}
                            disabled={printingBastId === item.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all"
                          >
                            {printingBastId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                            Cetak BAST
                          </button>
                        )}
                        <button
                          onClick={() => handleCetakSuratJalan(item.id)}
                          disabled={printingId === item.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
                        >
                          {printingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                          Cetak SJ
                        </button>
                        <button
                          onClick={() => setDetailItem(item)}
                          className="p-2 bg-slate-100 text-slate-600 rounded-xl text-xs hover:bg-slate-200 transition-all"
                          title="Lihat Detail"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </MobileCardActions>
                </MobileCard>
              )
            })}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Surat Jalan &amp; BAST</th>
                  <th className="py-3 px-4">Barang</th>
                  <th className="py-3 px-4 text-center">Jumlah</th>
                  <th className="py-3 px-4">Pengirim &amp; Tanggal</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Kondisi &amp; Catatan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => {
                  const st = getStatusBadge(item.status)
                  const isMenunggu = item.status === 'menunggu_konfirmasi'
                  const isDiterima = item.status === 'diterima'
                  const isPrintingSJ = printingId === item.id
                  const isPrintingBast = printingBastId === item.id

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Surat Jalan & BAST */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-blue-600 flex items-center gap-1">
                          <Truck className="h-3 w-3 text-blue-500" />
                          {item.nomor_surat_jalan}
                        </div>
                        {item.nomor_bast ? (
                          <div className="font-mono font-bold text-emerald-700 flex items-center gap-1 mt-1">
                            <FileText className="h-3 w-3 text-emerald-600" />
                            {item.nomor_bast}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 mt-0.5 block italic">Belum ada BAST</span>
                        )}
                      </td>

                      {/* Barang */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{item.sarana_prasarana.nama_barang}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sarana_prasarana.kode}</p>
                      </td>

                      {/* Jumlah */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-extrabold text-slate-900 text-sm">{item.jumlah}</span>
                        <span className="text-[10px] text-slate-400 block">{item.sarana_prasarana.satuan || 'Unit'}</span>
                      </td>

                      {/* Pengirim & Tanggal */}
                      <td className="py-3 px-4 text-slate-600">
                        <p className="font-medium text-slate-800 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          {item.petugas_pengirim.nama_lengkap}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          Kirim: {new Date(item.tanggal_kirim).toLocaleDateString('id-ID')}
                        </p>
                        {item.tanggal_terima && (
                          <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Terima: {new Date(item.tanggal_terima).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${st.cls}`}>
                          {st.icon}
                          {st.label}
                        </span>
                      </td>

                      {/* Kondisi & Catatan */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.sarana_prasarana.kondisi === 'Baik'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {item.sarana_prasarana.kondisi}
                          </span>
                          {item.foto_kerusakan_url && (
                            <button
                              onClick={() => setLightboxUrl(item.foto_kerusakan_url)}
                              className="text-[10px] text-rose-600 hover:text-rose-700 underline font-semibold flex items-center gap-0.5"
                            >
                              <Camera className="h-2.5 w-2.5" /> Foto
                            </button>
                          )}
                        </div>
                        {item.catatan_penerimaan ? (
                          <p className="text-[11px] text-slate-600 mt-1 truncate" title={item.catatan_penerimaan}>
                            {item.catatan_penerimaan}
                          </p>
                        ) : item.catatan_pengiriman ? (
                          <p className="text-[11px] text-slate-400 mt-1 truncate" title={item.catatan_pengiriman}>
                            {item.catatan_pengiriman}
                          </p>
                        ) : null}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right">
                        {isMenunggu ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenModal(item, 'terima')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                            >
                              Terima BAST
                            </button>
                            <button
                              onClick={() => handleOpenModal(item, 'tolak')}
                              className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all"
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {isDiterima && (
                              <button
                                onClick={() => handleCetakBast(item.id)}
                                disabled={isPrintingBast}
                                title="Cetak Berita Acara Serah Terima (BAST)"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                              >
                                {isPrintingBast ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                                BAST
                              </button>
                            )}
                            <button
                              onClick={() => handleCetakSuratJalan(item.id)}
                              disabled={isPrintingSJ}
                              title="Cetak Surat Jalan"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            >
                              {isPrintingSJ ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                              SJ
                            </button>
                            <button
                              onClick={() => setDetailItem(item)}
                              title="Lihat Detail Riwayat"
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs transition-all"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
              <span>Menampilkan {filteredList.length} dari {distribusiList.length} riwayat pengiriman</span>
              <span className="font-semibold text-slate-600">Workshop Tujuan: {distribusiList[0]?.ruangan_tujuan?.nama_ruangan || '-'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Penerimaan / Penolakan */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${aksi === 'terima' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {aksi === 'terima' ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {aksi === 'terima' ? 'Konfirmasi Penerimaan (BAST)' : 'Tolak Pengiriman Barang'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {aksi === 'terima'
                      ? 'Barang akan resmi masuk ke inventaris workshop Anda'
                      : 'Barang akan dikembalikan ke status ditolak'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowModal(false); setSelectedItem(null) }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Isi Form */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Barang:</span>
                  <span className="font-bold text-slate-800">{selectedItem.sarana_prasarana.nama_barang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">No. Surat Jalan:</span>
                  <span className="font-mono text-blue-600 font-bold">{selectedItem.nomor_surat_jalan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Jumlah Kirim:</span>
                  <span className="font-extrabold text-slate-900">{selectedItem.jumlah} Unit</span>
                </div>
              </div>

              {/* Kondisi saat diterima */}
              {aksi === 'terima' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kondisi Fisik Barang saat Tiba
                  </label>
                  <select
                    value={kondisiDiterima}
                    onChange={(e) => {
                      setKondisiDiterima(e.target.value)
                      if (!isKondisiRusak(e.target.value)) {
                        setFotoFile(null)
                        setFotoPreview(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 font-medium"
                    disabled={processing}
                  >
                    <option value="Baik">Baik</option>
                    <option value="Cukup Baik">Cukup Baik</option>
                    <option value="Rusak Ringan">Rusak Ringan (Wajib Foto)</option>
                    <option value="Rusak Berat">Rusak Berat (Wajib Foto)</option>
                  </select>
                </div>
              )}

              {/* Upload Foto Kerusakan jika kondisi rusak */}
              {aksi === 'terima' && isKondisiRusak(kondisiDiterima) && (
                <div>
                  <label className="block text-xs font-bold text-rose-600 mb-1.5 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    Foto Bukti Kerusakan Barang *
                  </label>
                  {fotoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={fotoPreview} alt="Preview" className="w-full h-36 object-cover" />
                      <button
                        type="button"
                        onClick={removeFoto}
                        className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg shadow"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-rose-300 bg-rose-50/50 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors">
                      <Camera className="h-6 w-6 text-rose-400 mb-1" />
                      <span className="text-xs text-rose-600 font-bold">Upload Foto Kerusakan</span>
                      <span className="text-[10px] text-rose-400">JPG, PNG (Maks 5MB)</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFotoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Catatan Penerimaan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Catatan {aksi === 'terima' ? 'Penerimaan BAST' : 'Penolakan'}
                </label>
                <textarea
                  rows={2}
                  value={catatanPenerimaan}
                  onChange={e => setCatatanPenerimaan(e.target.value)}
                  placeholder="Masukkan catatan..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowModal(false); setSelectedItem(null) }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleKonfirmasi}
                disabled={processing || (aksi === 'terima' && isKondisiRusak(kondisiDiterima) && !fotoFile)}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all disabled:opacity-50 ${
                  aksi === 'terima' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {processing ? 'Memproses...' : aksi === 'terima' ? 'Sahkan BAST' : 'Tolak Pengiriman'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail BAST / Riwayat */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Detail Riwayat Pengiriman &amp; BAST</h3>
                  <p className="text-[11px] text-slate-500">Informasi lengkap serah terima barang workshop</p>
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
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getStatusBadge(detailItem.status).cls}`}>
                    {getStatusBadge(detailItem.status).label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Kondisi Barang</span>
                  <span className="font-bold text-slate-800">{detailItem.sarana_prasarana.kondisi}</span>
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
                  <span className="font-medium text-slate-800">{detailItem.petugas_pengirim.nama_lengkap}</span>
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
                    <span className="text-slate-500 block mb-1">Catatan Penerimaan:</span>
                    <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 border border-slate-200">
                      {detailItem.catatan_penerimaan}
                    </p>
                  </div>
                )}
                {detailItem.foto_kerusakan_url && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-1">Foto Bukti Kerusakan:</span>
                    <img
                      src={detailItem.foto_kerusakan_url}
                      alt="Kerusakan"
                      onClick={() => setLightboxUrl(detailItem.foto_kerusakan_url)}
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