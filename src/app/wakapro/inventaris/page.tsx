'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from '@/lib/axios'
import {
  Package, Search, CheckCircle2, AlertTriangle, Warehouse,
  FileText, Filter, RefreshCw, Info, Edit, X
} from 'lucide-react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MobileCard, MobileCardHeader, MobileCardRow, MobileCardDivider, MobileCardActions } from '@/components/MobileCard'
import { useNotification } from '@/hooks/useNotification'

interface InventarisItem {
  id: number
  nomor_surat_jalan: string
  nomor_bast: string | null
  jumlah: number
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
  petugas_pengirim: {
    nama_lengkap: string
  }
}

interface Summary {
  total_unit: number
  total_jenis: number
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
  const [summary, setSummary] = useState<Summary>({ total_unit: 0, total_jenis: 0, kondisi_baik: 0, kondisi_rusak: 0 })
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

  const fetchInventaris = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterKondisi) params.set('kondisi', filterKondisi)

      const res = await axios.get(`/api/workshop/inventaris?${params.toString()}`)
      setItems(res.data.items ?? [])
      setSummary(res.data.summary ?? { total_unit: 0, total_jenis: 0, kondisi_baik: 0, kondisi_rusak: 0 })
      setRuangan(res.data.ruangan ?? null)
      setWarning(res.data.warning ?? null)
    } catch (err) {
      console.error('Gagal memuat inventaris workshop:', err)
    } finally {
      setLoading(false)
    }
  }, [search, filterKondisi])

  useEffect(() => {
    fetchInventaris()
  }, [fetchInventaris])

  const openEditModal = (item: InventarisItem) => {
    setEditingItem(item)
    setSelectedKondisi(item.sarana_prasarana.kondisi)
    setCatatan(item.sarana_prasarana.keterangan || '')
    setShowEditModal(true)
  }

  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingItem(null)
    setSelectedKondisi('')
    setCatatan('')
  }

  const handleUpdateKondisi = async () => {
    if (!editingItem || !selectedKondisi) return

    setSubmitting(true)
    try {
      await axios.put(`/api/workshop/inventaris/${editingItem.id}/kondisi`, {
        kondisi: selectedKondisi,
        catatan: catatan.trim() || null,
      })

      const isDamaged = ['Rusak Ringan', 'Rusak Berat', 'Tidak Layak Pakai'].includes(selectedKondisi);
      success(isDamaged 
        ? 'Kondisi aset berhasil diperbarui & laporan kerusakan dikirimkan ke Admin' 
        : 'Kondisi aset berhasil diperbarui'
      )
      closeEditModal()
      fetchInventaris() // Refresh data
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memperbarui kondisi aset'
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const formatRupiah = (amount: number | undefined | null) => {
    if (!amount || amount === 0) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const kesiapanPersen = summary.total_unit > 0
    ? Math.round((summary.kondisi_baik / summary.total_unit) * 100)
    : 100

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
                ? <>Aset aktif di <span className="font-semibold text-slate-700">{ruangan.nama_ruangan}</span> {ruangan.gedung ? `— ${ruangan.gedung.nama_gedung}` : ''}</>
                : 'Daftar seluruh aset yang sudah diterima melalui distribusi dan BAST resmi'}
            </p>
          </div>
          <button
            onClick={fetchInventaris}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Warning jika belum assign ruangan */}
      {warning && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <span>{warning}</span>
        </div>
      )}

      {/* Keterangan sumber data */}
      <div className="flex items-start gap-2.5 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <span>
          Inventaris ini hanya menampilkan barang yang sudah melalui proses{' '}
          <strong>Distribusi → Konfirmasi Penerimaan → BAST</strong> ke workshop Anda.
          Barang yang masih menunggu konfirmasi tidak akan muncul di sini.
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Total Unit</p>
          {loading ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse" /> : (
            <p className="text-2xl font-black text-slate-900">{summary.total_unit.toLocaleString('id-ID')}</p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">{summary.total_jenis} jenis barang</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Kondisi Baik</p>
          {loading ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse" /> : (
            <p className="text-2xl font-black text-emerald-600">{summary.kondisi_baik.toLocaleString('id-ID')}</p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">unit siap pakai</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Perlu Servis</p>
          {loading ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse" /> : (
            <p className="text-2xl font-black text-rose-600">{summary.kondisi_rusak.toLocaleString('id-ID')}</p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">unit rusak / perlu perbaikan</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-1">Kesiapan</p>
          {loading ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse" /> : (
            <p className="text-2xl font-black text-indigo-600">{kesiapanPersen}%</p>
          )}
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${kesiapanPersen}%` }} />
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama barang atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={filterKondisi}
            onChange={(e) => setFilterKondisi(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-medium text-slate-700"
          >
            <option value="">Semua Kondisi</option>
            <option value="Baik">Baik</option>
            <option value="Rusak Ringan">Rusak Ringan</option>
            <option value="Rusak Berat">Rusak Berat</option>
          </select>
        </div>
      </div>

      {/* Tabel / Mobile Cards */}
      {isMobile ? (
        /* Mobile Card View */
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">Belum ada aset yang masuk</p>
              <p className="text-xs mt-1 text-slate-400">
                Aset akan muncul setelah dikonfirmasi
              </p>
            </div>
          ) : (
            <>
              {items.map((item) => (
                <MobileCard key={item.id}>
                  <MobileCardHeader
                    title={item.sarana_prasarana.nama_barang}
                    subtitle={item.sarana_prasarana.kode}
                    badge={
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${getKondisiBadge(item.sarana_prasarana.kondisi)}`}>
                        {item.sarana_prasarana.kondisi === 'Baik'
                          ? <CheckCircle2 className="h-2.5 w-2.5" />
                          : <AlertTriangle className="h-2.5 w-2.5" />}
                        {item.sarana_prasarana.kondisi}
                      </span>
                    }
                    icon={<Package className="h-4 w-4 text-indigo-600" />}
                  />
                  
                  <div className="space-y-2">
                    <MobileCardRow
                      label="Jumlah"
                      value={
                        <span className="font-extrabold text-slate-900">
                          {item.jumlah} {item.sarana_prasarana.satuan || 'Unit'}
                        </span>
                      }
                    />
                    <MobileCardRow
                      label="Harga Pembelian"
                      value={
                        <span className="font-bold text-emerald-700">
                          {formatRupiah(item.sarana_prasarana.nilai_harga_pembelian)}
                        </span>
                      }
                    />
                    <MobileCardRow
                      label="Tanggal Kirim"
                      value={new Date(item.tanggal_kirim).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    />
                    <MobileCardRow
                      label="Tanggal Terima"
                      value={
                        item.tanggal_terima
                          ? new Date(item.tanggal_terima).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-'
                      }
                    />
                    <MobileCardRow
                      label="No. BAST"
                      value={
                        item.nomor_bast ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1 justify-end">
                            <FileText className="h-3 w-3" />
                            {item.nomor_bast}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )
                      }
                    />
                    <MobileCardRow
                      label="Surat Jalan"
                      value={item.nomor_surat_jalan}
                    />
                    <MobileCardRow
                      label="Pengirim"
                      value={item.petugas_pengirim.nama_lengkap}
                    />
                    {item.sarana_prasarana.keterangan && (
                      <>
                        <MobileCardDivider />
                        <div className="text-xs text-slate-500 italic">
                          {item.sarana_prasarana.keterangan}
                        </div>
                      </>
                    )}
                  </div>

                  <MobileCardActions>
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit Kondisi
                    </button>
                  </MobileCardActions>
                </MobileCard>
              ))}
              <div className="text-center text-xs text-slate-400 py-2">
                {items.length} item aset
              </div>
            </>
          )}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Barang</th>
                  <th className="py-3.5 px-4">Kode</th>
                  <th className="py-3.5 px-4 text-right">Harga</th>
                  <th className="py-3.5 px-4 text-center">Jumlah</th>
                  <th className="py-3.5 px-4 text-center">Kondisi</th>
                  <th className="py-3.5 px-4">Tanggal Kirim</th>
                  <th className="py-3.5 px-4">Tanggal Terima</th>
                  <th className="py-3.5 px-4">No. BAST</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={9} className="py-3 px-4">
                        <div className="h-5 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold">Belum ada aset yang masuk ke workshop ini</p>
                      <p className="text-[11px] mt-1 text-slate-400">
                        Aset akan muncul setelah admin/petugas mendistribusikan dan Anda mengkonfirmasi penerimaan
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{item.sarana_prasarana.nama_barang}</p>
                        {item.sarana_prasarana.keterangan && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {item.sarana_prasarana.keterangan}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                          {item.sarana_prasarana.kode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-emerald-700">
                          {formatRupiah(item.sarana_prasarana.nilai_harga_pembelian)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-extrabold text-slate-900">
                          {item.jumlah} <span className="text-slate-400 font-normal">{item.sarana_prasarana.satuan || 'Unit'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${getKondisiBadge(item.sarana_prasarana.kondisi)}`}>
                          {item.sarana_prasarana.kondisi === 'Baik'
                            ? <CheckCircle2 className="h-3 w-3" />
                            : <AlertTriangle className="h-3 w-3" />}
                          {item.sarana_prasarana.kondisi}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(item.tanggal_kirim).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {item.tanggal_terima
                          ? new Date(item.tanggal_terima).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.nomor_bast ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <FileText className="h-3.5 w-3.5 text-emerald-500" />
                            {item.nomor_bast}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                        <p className="text-[11px] text-slate-400 mt-0.5">SJ: {item.nomor_surat_jalan}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all"
                          title="Edit Kondisi"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && items.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-400">
              Menampilkan {items.length} item aset yang sudah diterima di workshop ini
            </div>
          )}
        </div>
      )}
      
      {/* Modal Edit Kondisi */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slideIn">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Kondisi Aset</h2>
                <p className="text-xs text-slate-500 mt-0.5">{editingItem.sarana_prasarana.nama_barang}</p>
              </div>
              <button
                onClick={closeEditModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={submitting}
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Info Barang */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">Kode Barang</p>
                    <p className="font-mono text-xs font-bold text-slate-700">{editingItem.sarana_prasarana.kode}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">Jumlah</p>
                    <p className="text-xs font-bold text-slate-900">{editingItem.jumlah} {editingItem.sarana_prasarana.satuan}</p>
                  </div>
                </div>
              </div>

              {/* Kondisi Saat Ini */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kondisi Saat Ini
                </label>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${getKondisiBadge(editingItem.sarana_prasarana.kondisi)}`}>
                    {editingItem.sarana_prasarana.kondisi === 'Baik'
                      ? <CheckCircle2 className="h-3.5 w-3.5" />
                      : <AlertTriangle className="h-3.5 w-3.5" />}
                    {editingItem.sarana_prasarana.kondisi}
                  </span>
                </div>
              </div>

              {/* Ubah Kondisi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Ubah Kondisi <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedKondisi}
                  onChange={(e) => setSelectedKondisi(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-medium"
                  disabled={submitting}
                >
                  <option value="">-- Pilih Kondisi --</option>
                  <option value="Baik">Baik</option>
                  <option value="Cukup Baik">Cukup Baik</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                  <option value="Tidak Layak Pakai">Tidak Layak Pakai</option>
                </select>
              </div>

              {/* Banner Info Notifikasi Otomatis ke Admin jika Rusak */}
              {['Rusak Ringan', 'Rusak Berat', 'Tidak Layak Pakai'].includes(selectedKondisi) && (
                <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 animate-fadeIn">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900">Notifikasi Otomatis ke Administrator</p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      Laporan kerusakan aset ini akan langsung dikirimkan ke panel Admin beserta nama workshop ({ruangan?.nama_ruangan || 'Workshop'}).
                    </p>
                  </div>
                </div>
              )}

              {/* Catatan / Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Catatan / Keterangan
                </label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Jelaskan kondisi atau kerusakan yang terjadi..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
                  disabled={submitting}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {catatan.length}/500 karakter
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                onClick={handleUpdateKondisi}
                disabled={!selectedKondisi || submitting}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
