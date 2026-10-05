'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from '@/lib/axios'
import {
  generateSuratJalan,
  generateBast,
} from '@/lib/printDokumen'
import { 
  Package, Truck, CheckCircle2, Clock, XCircle, Plus, 
  Search, ChevronDown, X, AlertCircle, Send, 
  Banknote, MapPin, User, Calendar, Hash, RefreshCw,
  FileText, Filter, Printer, Eye, Loader2, Camera
} from 'lucide-react'

interface Ruangan {
  id: number
  nama_ruangan: string
  kode_ruangan?: string
  gedung?: { nama_gedung: string }
  wakapro?: { nama_lengkap: string }
}

interface BarangItem {
  id: number
  kode: string
  nama_barang: string
  satuan: string
  stok_akhir: number
  kondisi: string
  nilai_harga_pembelian: number
  folder_nama?: string
}

interface Distribusi {
  id: number
  nomor_surat_jalan: string
  nomor_pengiriman?: string | null
  nomor_bast: string | null
  jumlah: number
  harga_satuan: number
  total_harga: number
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
    nama_ruangan: string
    gedung?: { nama_gedung: string } | null
  }
  petugas_pengirim: { nama_lengkap: string }
  wakapro_penerima: { nama_lengkap: string } | null
}

type TabKey = 'semua' | 'menunggu' | 'diterima' | 'ditolak'

export default function PetugasDistribusiPage() {
  const [distribusiList, setDistribusiList] = useState<Distribusi[]>([])
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('semua')
  const [showForm, setShowForm] = useState(false)

  // Print & Detail state
  const [printingId, setPrintingId] = useState<number | null>(null)
  const [printingBastId, setPrintingBastId] = useState<number | null>(null)
  const [detailItem, setDetailItem] = useState<Distribusi | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Form state
  const [formRuangan, setFormRuangan] = useState<number | ''>('')
  const [formBarang, setFormBarang] = useState<BarangItem | null>(null)
  const [formBarangSearch, setFormBarangSearch] = useState('')
  const [formBarangResults, setFormBarangResults] = useState<BarangItem[]>([])
  const [showBarangDropdown, setShowBarangDropdown] = useState(false)
  const [formJumlah, setFormJumlah] = useState<number | ''>(1)
  const [formHarga, setFormHarga] = useState<number | ''>('')
  const [formCatatan, setFormCatatan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const fetchDistribusi = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/distribusi-asets')
      setDistribusiList(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching distribusi:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRuangan = async () => {
    try {
      const res = await axios.get('/api/ruangans')
      setRuanganList(res.data)
    } catch (e) {
      console.error('Gagal memuat ruangan', e)
    }
  }

  useEffect(() => {
    fetchDistribusi()
    fetchRuangan()
  }, [fetchDistribusi])

  // Debounced search barang
  useEffect(() => {
    if (!formBarangSearch.trim()) {
      setFormBarangResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/distribusi-asets/search-barang?q=${encodeURIComponent(formBarangSearch)}`)
        setFormBarangResults(res.data)
        setShowBarangDropdown(true)
      } catch (e) {
        console.error('Gagal mencari barang', e)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [formBarangSearch])

  const handleSelectBarang = (item: BarangItem) => {
    setFormBarang(item)
    setFormBarangSearch(item.nama_barang)
    setFormHarga(item.nilai_harga_pembelian || '')
    setShowBarangDropdown(false)
  }

  const formatRupiah = (amount: number | '' | null | undefined) => {
    if (!amount) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(amount))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!formBarang) return setFormError('Pilih barang terlebih dahulu.')
    if (!formRuangan) return setFormError('Pilih wakapro/ruangan tujuan.')
    if (!formJumlah || Number(formJumlah) < 1) return setFormError('Jumlah harus minimal 1.')

    setSubmitting(true)
    try {
      await axios.post('/api/distribusi-asets', {
        sarana_prasarana_id: formBarang.id,
        ruangan_tujuan_id: formRuangan,
        jumlah: formJumlah,
        harga_satuan: formHarga || 0,
        catatan_pengiriman: formCatatan || null,
      })

      setFormSuccess('Pengiriman berhasil dicatat! Surat Jalan telah dibuat.')
      setFormBarang(null)
      setFormBarangSearch('')
      setFormRuangan('')
      setFormJumlah(1)
      setFormHarga('')
      setFormCatatan('')
      setShowForm(false)
      fetchDistribusi()
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Terjadi kesalahan saat mengirim'
      setFormError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
      menunggu_konfirmasi: {
        label: 'Menunggu Konfirmasi',
        cls: 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: <Clock className="h-3 w-3" />,
      },
      diterima: {
        label: 'Diterima (BAST Selesai)',
        cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      ditolak: {
        label: 'Ditolak',
        cls: 'bg-red-50 text-red-700 border border-red-200',
        icon: <XCircle className="h-3 w-3" />,
      },
    }
    return map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700 border-gray-200', icon: null }
  }

  const countMenunggu = distribusiList.filter(d => d.status === 'menunggu_konfirmasi').length
  const countDiterima = distribusiList.filter(d => d.status === 'diterima').length
  const countDitolak = distribusiList.filter(d => d.status === 'ditolak').length

  const filteredList = distribusiList.filter((item) => {
    // Filter tab
    if (activeTab === 'menunggu' && item.status !== 'menunggu_konfirmasi') return false
    if (activeTab === 'diterima' && item.status !== 'diterima') return false
    if (activeTab === 'ditolak' && item.status !== 'ditolak') return false

    // Filter search
    const q = searchTerm.toLowerCase()
    return (
      item.nomor_surat_jalan.toLowerCase().includes(q) ||
      (item.nomor_bast && item.nomor_bast.toLowerCase().includes(q)) ||
      item.sarana_prasarana.nama_barang.toLowerCase().includes(q) ||
      (item.sarana_prasarana.kode && item.sarana_prasarana.kode.toLowerCase().includes(q)) ||
      (item.ruangan_tujuan?.nama_ruangan && item.ruangan_tujuan.nama_ruangan.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6 p-2 sm:p-4 animate-fadeIn">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Truck className="h-5 w-5" />
            </div>
            Pengiriman &amp; Riwayat BAST
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-11">
            Kirimkan barang/sarana prasarana ke workshop dan pantau riwayat konfirmasi BAST dari Wakapro
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDistribusi}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setFormError(''); setFormSuccess('') }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            Kirim Barang Baru
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {formSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          {formSuccess}
        </div>
      )}
      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          {formError}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Pengiriman</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{distribusiList.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Surat jalan diterbitkan</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Menunggu Konfirmasi</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">{countMenunggu}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Belum BAST di bengkel</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Sudah Diterima (BAST)</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{countDiterima}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Resmi serah terima</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Nilai Barang</p>
          <p className="text-lg font-extrabold text-slate-900 mt-1">
            {formatRupiah(distribusiList.reduce((s, d) => s + (d.total_harga || 0), 0))}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Akumulasi pengiriman</p>
        </div>
      </div>

      {/* Form Kirim Barang */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-sm space-y-4 animate-scaleIn">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              Formulir Pengiriman Barang ke Workshop
            </h3>
            <button onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Autocomplete Cari Barang */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Sarana &amp; Prasarana *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ketik nama atau kode barang..."
                    value={formBarangSearch}
                    onChange={(e) => {
                      setFormBarangSearch(e.target.value)
                      if (!e.target.value.trim()) setFormBarang(null)
                    }}
                    onFocus={() => { if (formBarangResults.length > 0) setShowBarangDropdown(true) }}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    required
                  />
                </div>

                {showBarangDropdown && formBarangResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {formBarangResults.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBarang(b)}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 text-xs"
                      >
                        <div className="font-bold text-slate-800">{b.nama_barang}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {b.kode} · Stok: {b.stok_akhir} {b.satuan} · {formatRupiah(b.nilai_harga_pembelian)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {formBarang && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    ✓ Terpilih: {formBarang.nama_barang} (Stok: {formBarang.stok_akhir} {formBarang.satuan})
                  </p>
                )}
              </div>

              {/* Ruangan Workshop Tujuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ruangan / Workshop Tujuan *
                </label>
                <select
                  value={formRuangan}
                  onChange={(e) => setFormRuangan(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  required
                >
                  <option value="">-- Pilih Ruangan Workshop --</option>
                  {ruanganList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama_ruangan} ({r.gedung?.nama_gedung || 'Gedung'}) {r.wakapro ? `— Wakapro: ${r.wakapro.nama_lengkap}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Unit *</label>
                <input
                  type="number"
                  min="1"
                  value={formJumlah}
                  onChange={(e) => setFormJumlah(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Harga Satuan (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={formHarga}
                  onChange={(e) => setFormHarga(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Nilai</label>
                <div className="px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                  {formatRupiah((Number(formJumlah) || 0) * (Number(formHarga) || 0))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Pengiriman (Opsional)</label>
              <textarea
                rows={2}
                value={formCatatan}
                onChange={(e) => setFormCatatan(e.target.value)}
                placeholder="Misal: Dikirimkan untuk kebutuhan praktik semester ganjil..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Kirim &amp; Terbitkan Surat Jalan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Navigation Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setActiveTab('semua')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'semua' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({distribusiList.length})
          </button>
          <button
            onClick={() => setActiveTab('menunggu')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'menunggu' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="h-3 w-3" />
            Menunggu Konfirmasi
            {countMenunggu > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'menunggu' ? 'bg-white text-amber-600' : 'bg-amber-200 text-amber-800'
              }`}>
                {countMenunggu}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('diterima')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'diterima' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Sudah Diterima (BAST)
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              activeTab === 'diterima' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {countDiterima}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ditolak')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'ditolak' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <XCircle className="h-3 w-3" />
            Ditolak ({countDitolak})
          </button>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari barang, no SJ, no BAST, ruangan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white"
          />
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Memuat riwayat pengiriman &amp; BAST...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
            <Truck className="h-12 w-12 opacity-20" />
            <p className="font-bold text-slate-700 text-sm">Tidak ada riwayat pengiriman yang cocok</p>
            <p className="text-xs">Klik &quot;Kirim Barang Baru&quot; untuk mulai mengirim aset ke workshop</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Surat Jalan &amp; BAST</th>
                  <th className="py-3 px-4">Barang</th>
                  <th className="py-3 px-4 text-center">Jumlah</th>
                  <th className="py-3 px-4 text-right">Total Nilai</th>
                  <th className="py-3 px-4">Tujuan &amp; Penerima</th>
                  <th className="py-3 px-4">Tanggal Kirim</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi &amp; Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => {
                  const st = getStatusInfo(item.status)
                  const isDiterima = item.status === 'diterima'
                  const isPrintingSJ = printingId === item.id
                  const isPrintingBast = printingBastId === item.id

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Surat Jalan & BAST */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-600 block flex items-center gap-1">
                          <Truck className="h-3 w-3 text-blue-500" />
                          {item.nomor_surat_jalan}
                        </span>
                        {item.nomor_bast ? (
                          <span className="font-mono font-bold text-emerald-700 flex items-center gap-1 mt-1">
                            <FileText className="h-3 w-3 text-emerald-600" />
                            {item.nomor_bast}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 mt-0.5 block italic">Belum BAST</span>
                        )}
                      </td>

                      {/* Barang */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{item.sarana_prasarana.nama_barang}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sarana_prasarana.kode}</p>
                      </td>

                      {/* Jumlah */}
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{item.jumlah} Unit</td>

                      {/* Nilai */}
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        {item.total_harga ? formatRupiah(item.total_harga) : <span className="text-slate-300 font-normal">—</span>}
                      </td>

                      {/* Tujuan & Penerima */}
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{item.ruangan_tujuan.nama_ruangan}</p>
                        <p className="text-[10px] text-slate-400">{item.ruangan_tujuan.gedung?.nama_gedung}</p>
                        {item.wakapro_penerima && (
                          <p className="text-[10px] text-blue-600 mt-0.5 flex items-center gap-1 font-medium">
                            <User className="h-2.5 w-2.5" />
                            Penerima: {item.wakapro_penerima.nama_lengkap}
                          </p>
                        )}
                      </td>

                      {/* Tanggal Kirim */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(item.tanggal_kirim).toLocaleDateString('id-ID')}
                        </div>
                        {item.tanggal_terima && (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            Diterima: {new Date(item.tanggal_terima).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${st.cls}`}>
                          {st.icon}
                          {st.label}
                        </span>
                      </td>

                      {/* Aksi & Cetak */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Cetak SJ */}
                          <button
                            onClick={() => handleCetakSuratJalan(item.id)}
                            disabled={isPrintingSJ}
                            title="Cetak Surat Jalan"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold transition disabled:opacity-50"
                          >
                            {isPrintingSJ ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                            SJ
                          </button>

                          {/* Cetak BAST jika sudah diterima */}
                          {isDiterima && (
                            <button
                              onClick={() => handleCetakBast(item.id)}
                              disabled={isPrintingBast}
                              title="Cetak Berita Acara Serah Terima (BAST)"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition disabled:opacity-50"
                            >
                              {isPrintingBast ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3" />}
                              BAST
                            </button>
                          )}

                          {/* Lihat Detail */}
                          <button
                            onClick={() => setDetailItem(item)}
                            title="Lihat Detail Riwayat"
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
            </table>

            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
              <span>Menampilkan {filteredList.length} dari {distribusiList.length} riwayat</span>
              <span className="font-bold text-emerald-700">
                Total nilai terlihat: {formatRupiah(filteredList.reduce((s, d) => s + (d.total_harga || 0), 0))}
              </span>
            </div>
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
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${getStatusInfo(detailItem.status).cls}`}>
                    {getStatusInfo(detailItem.status).label}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Nilai</span>
                  <span className="font-bold text-emerald-700">{formatRupiah(detailItem.total_harga)}</span>
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
                  <span className="font-bold text-slate-900">{detailItem.jumlah} Unit</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Ruangan Workshop:</span>
                  <span className="font-semibold text-slate-800">{detailItem.ruangan_tujuan.nama_ruangan} ({detailItem.ruangan_tujuan.gedung?.nama_gedung})</span>
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
                    <span className="text-slate-500 block mb-1">Catatan dari Wakapro:</span>
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
