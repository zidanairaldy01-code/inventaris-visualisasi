'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from '@/lib/axios'
import { 
  Package, Truck, CheckCircle2, Clock, XCircle, Plus, 
  Search, ChevronDown, X, AlertCircle, Send, 
  Banknote, MapPin, User, Calendar, Hash, RefreshCw,
  FileText, Filter
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
  nomor_bast: string | null
  jumlah: number
  harga_satuan: number
  total_harga: number
  tanggal_kirim: string
  tanggal_terima: string | null
  status: string
  catatan_pengiriman: string | null
  sarana_prasarana: {
    nama_barang: string
    kode: string
  }
  ruangan_tujuan: {
    nama_ruangan: string
    gedung: { nama_gedung: string }
  }
  petugas_pengirim: { nama_lengkap: string }
  wakapro_penerima: { nama_lengkap: string } | null
}

export default function DistribusiPage() {
  const [distribusiList, setDistribusiList] = useState<Distribusi[]>([])
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm, setShowForm] = useState(false)

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
      const url = filterStatus
        ? `/api/distribusi-asets?status=${filterStatus}`
        : '/api/distribusi-asets'
      const response = await axios.get(url)
      setDistribusiList(response.data)
    } catch (error) {
      console.error('Error fetching distribusi:', error)
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  const fetchRuangan = async () => {
    try {
      const res = await axios.get('/api/ruangans')
      // Try to get wakapro info for each ruangan
      setRuanganList(res.data)
    } catch (e) {
      console.error('Gagal memuat ruangan', e)
    }
  }

  useEffect(() => {
    fetchDistribusi()
  }, [fetchDistribusi])

  useEffect(() => {
    fetchRuangan()
  }, [])

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

  const totalHitungan = formJumlah && formHarga ? Number(formJumlah) * Number(formHarga) : 0

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
        label: 'Diterima',
        cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      ditolak: {
        label: 'Ditolak',
        cls: 'bg-red-50 text-red-700 border border-red-200',
        icon: <XCircle className="h-3 w-3" />,
      },
    }
    return map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700', icon: null }
  }

  const filteredList = distribusiList.filter((item) => {
    const q = searchTerm.toLowerCase()
    return (
      item.nomor_surat_jalan.toLowerCase().includes(q) ||
      item.sarana_prasarana.nama_barang.toLowerCase().includes(q) ||
      item.ruangan_tujuan.nama_ruangan.toLowerCase().includes(q)
    )
  })

  const stats = {
    total: distribusiList.length,
    menunggu: distribusiList.filter((d) => d.status === 'menunggu_konfirmasi').length,
    diterima: distribusiList.filter((d) => d.status === 'diterima').length,
    totalNilai: distribusiList.reduce((sum, d) => sum + (d.total_harga || 0), 0),
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 animate-fadeIn">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-5 w-5 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">Distribusi Aset ke Workshop</h1>
            </div>
            <p className="text-xs text-slate-500">Kirim barang ke wakapro workshop dengan Surat Jalan & BAST resmi. Harga otomatis tercatat di inventaris wakapro.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchDistribusi}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-medium transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={() => {
                setShowForm(!showForm)
                setFormError('')
                setFormSuccess('')
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Tutup Form' : 'Kirim Barang Baru'}
            </button>
          </div>
        </div>
      </div>

      {/* Global success message */}
      {formSuccess && !showForm && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700 animate-fadeIn">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {formSuccess}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pengiriman', value: stats.total, sub: 'dokumen surat jalan', color: 'text-slate-900' },
          { label: 'Menunggu Konfirmasi', value: stats.menunggu, sub: 'belum di-BAST', color: 'text-amber-600' },
          { label: 'Sudah Diterima', value: stats.diterima, sub: 'BAST terbit', color: 'text-emerald-600' },
          { label: 'Total Nilai Terkirim', value: formatRupiah(stats.totalNilai), sub: 'akumulasi semua pengiriman', color: 'text-blue-600', isText: true },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color} ${s.isText ? 'text-lg' : ''}`}>{s.value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Form Pengiriman Baru */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden animate-fadeIn">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-blue-900">Form Pengiriman Barang Baru</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Pilih Barang */}
              <div className="relative md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  <Package className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
                  Barang / Aset <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formBarangSearch}
                    onChange={(e) => {
                      setFormBarangSearch(e.target.value)
                      if (!e.target.value) { setFormBarang(null); setFormHarga('') }
                    }}
                    onFocus={() => formBarangResults.length > 0 && setShowBarangDropdown(true)}
                    placeholder="Ketik nama atau kode barang..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                  {showBarangDropdown && formBarangResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {formBarangResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectBarang(item)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 text-left transition-colors border-b border-slate-100 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{item.nama_barang}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{item.kode}</span>
                              {' · '}{item.satuan}
                              {item.folder_nama && <span className="ml-1 text-blue-500">📁 {item.folder_nama}</span>}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-xs font-bold text-emerald-700">{formatRupiah(item.nilai_harga_pembelian)}</p>
                            <p className={`text-[10px] mt-0.5 ${item.kondisi === 'Baik' ? 'text-emerald-600' : 'text-amber-600'}`}>{item.kondisi}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formBarang && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-xs text-blue-800 font-medium">
                      Dipilih: <strong>{formBarang.nama_barang}</strong>
                      <span className="ml-1 font-mono text-[10px] bg-blue-100 px-1.5 py-0.5 rounded">{formBarang.kode}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Pilih Wakapro/Ruangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  <MapPin className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
                  Tujuan (Wakapro / Ruangan Workshop) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formRuangan}
                    onChange={(e) => setFormRuangan(e.target.value ? Number(e.target.value) : '')}
                    className="w-full appearance-none px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                    required
                  >
                    <option value="">-- Pilih Workshop Tujuan --</option>
                    {ruanganList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama_ruangan}
                        {r.gedung ? ` — ${r.gedung.nama_gedung}` : ''}
                        {r.kode_ruangan ? ` (${r.kode_ruangan})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Jumlah */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  <Hash className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
                  Jumlah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={formJumlah}
                  onChange={(e) => setFormJumlah(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Masukkan jumlah..."
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  required
                />
              </div>

              {/* Harga Satuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  <Banknote className="inline h-3.5 w-3.5 mr-1 text-slate-400" />
                  Harga Satuan (Rp)
                  <span className="ml-1 text-[10px] text-slate-400 font-normal">— opsional, jika kosong pakai harga barang</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={formHarga}
                  onChange={(e) => setFormHarga(e.target.value ? Number(e.target.value) : '')}
                  placeholder="Masukkan harga satuan..."
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                {formHarga && formJumlah && (
                  <p className="text-xs text-emerald-700 font-bold mt-1.5">
                    Total: {formatRupiah(totalHitungan)} ({formJumlah} × {formatRupiah(formHarga)})
                  </p>
                )}
              </div>

              {/* Catatan */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Catatan Pengiriman
                  <span className="ml-1 text-[10px] text-slate-400 font-normal">— opsional</span>
                </label>
                <textarea
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Masukkan catatan pengiriman jika ada..."
                  rows={2}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                />
              </div>
            </div>

            {/* Preview Summary */}
            {formBarang && formRuangan && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <p className="font-bold text-slate-700 mb-2">📋 Ringkasan Pengiriman:</p>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div><span className="text-slate-400">Barang:</span> <strong>{formBarang.nama_barang}</strong></div>
                  <div><span className="text-slate-400">Tujuan:</span> <strong>{ruanganList.find(r => r.id === formRuangan)?.nama_ruangan}</strong></div>
                  <div><span className="text-slate-400">Jumlah:</span> <strong>{formJumlah || '-'} {formBarang.satuan}</strong></div>
                  <div><span className="text-slate-400">Total Nilai:</span> <strong className="text-emerald-700">{formatRupiah(totalHitungan)}</strong></div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(''); setFormSuccess('') }}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting || !formBarang || !formRuangan}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Kirim Barang & Buat Surat Jalan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari no. surat jalan, barang, atau ruangan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-700"
          >
            <option value="">Semua Status</option>
            <option value="menunggu_konfirmasi">Menunggu Konfirmasi</option>
            <option value="diterima">Diterima</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Memuat data pengiriman...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
            <Truck className="h-12 w-12 opacity-20" />
            <p className="font-semibold text-slate-500">Belum ada data pengiriman</p>
            <p className="text-xs">Klik "Kirim Barang Baru" untuk mulai mengirim aset ke workshop</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">No. Surat Jalan</th>
                  <th className="py-3.5 px-4">Barang</th>
                  <th className="py-3.5 px-4 text-center">Jumlah</th>
                  <th className="py-3.5 px-4 text-right">Harga Satuan</th>
                  <th className="py-3.5 px-4 text-right">Total Nilai</th>
                  <th className="py-3.5 px-4">Tujuan</th>
                  <th className="py-3.5 px-4">Tanggal Kirim</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">No. BAST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => {
                  const st = getStatusInfo(item.status)
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-600 text-[11px]">{item.nomor_surat_jalan}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{item.sarana_prasarana.nama_barang}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sarana_prasarana.kode}</p>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{item.jumlah}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-slate-600">
                          {item.harga_satuan ? formatRupiah(item.harga_satuan) : <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-emerald-700">
                          {item.total_harga ? formatRupiah(item.total_harga) : <span className="text-slate-300">—</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-700">{item.ruangan_tujuan.nama_ruangan}</p>
                        <p className="text-[10px] text-slate-400">{item.ruangan_tujuan.gedung?.nama_gedung}</p>
                        {item.wakapro_penerima && (
                          <p className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />
                            {item.wakapro_penerima.nama_lengkap}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(item.tanggal_kirim).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${st.cls}`}>
                          {st.icon}
                          {st.label}
                        </span>
                        {item.tanggal_terima && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(item.tanggal_terima).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.nomor_bast ? (
                          <div className="flex items-center gap-1 text-emerald-700 font-bold">
                            <FileText className="h-3 w-3" />
                            <span className="text-[10px]">{item.nomor_bast}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between items-center">
              <span>Menampilkan {filteredList.length} dari {distribusiList.length} pengiriman</span>
              <span className="font-bold text-emerald-700">
                Total nilai terlihat: {formatRupiah(filteredList.reduce((s, d) => s + (d.total_harga || 0), 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
