'use client'

import { useState, useEffect, useRef } from 'react'
import axios from '@/lib/axios'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useNotification } from '@/hooks/useNotification'
import {
  MobileCard,
  MobileCardHeader,
  MobileCardRow,
  MobileCardActions,
  MobileCardDivider
} from '@/components/MobileCard'
import {
  Package, Truck, CheckCircle2, X, AlertTriangle,
  Camera, ImageOff, ZoomIn, AlertCircle
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
    foto_kerusakan_url: string | null
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

export default function PenerimaanPage() {
  const isMobile = useIsMobile()
  const { success, error: showError } = useNotification()
  const [distribusiList, setDistribusiList] = useState<Distribusi[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Distribusi | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [aksi, setAksi] = useState<'terima' | 'tolak'>('terima')
  const [catatanPenerimaan, setCatatanPenerimaan] = useState('')
  const [kondisiDiterima, setKondisiDiterima] = useState<string>('Baik')
  const [processing, setProcessing] = useState(false)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
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
      const response = await axios.get(
        '/api/distribusi-asets?status=menunggu_konfirmasi'
      )
      setDistribusiList(response.data)
    } catch (error) {
      console.error('Error fetching distribusi:', error)
    } finally {
      setLoading(false)
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
        success('Barang berhasil diterima dan BAST telah diterbitkan')
      } else {
        success('Pengiriman barang telah ditolak')
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
    const badges = {
      menunggu_konfirmasi: 'bg-yellow-100 text-yellow-800',
      diterima: 'bg-green-100 text-green-800',
      ditolak: 'bg-red-100 text-red-800',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-6">
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Penerimaan Barang Workshop
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Konfirmasi penerimaan barang yang dikirim ke workshop Anda
          </p>
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {distribusiList.length}
            </div>
            <div className="text-sm text-yellow-700">Menunggu Konfirmasi</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {distribusiList.reduce((s, d) => s + d.jumlah, 0)}
            </div>
            <div className="text-sm text-blue-700">Total Unit Menunggu</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="text-lg font-bold text-emerald-700">
              {formatRupiah(distribusiList.reduce((s, d) => s + (d.total_harga || 0), 0))}
            </div>
            <div className="text-sm text-emerald-700">Estimasi Total Nilai Diterima</div>
          </div>
        </div>

        {/* Table / Mobile Cards */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            <p className="mt-2 text-gray-600">Memuat data...</p>
          </div>
        ) : distribusiList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">✅ Tidak ada barang yang perlu dikonfirmasi</p>
            <p className="text-sm mt-2">Semua pengiriman sudah diproses</p>
          </div>
        ) : isMobile ? (
          /* Mobile Card View */
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
                  {item.total_harga > 0 && (
                    <MobileCardRow
                      label="Nilai Barang"
                      value={
                        <span className="font-bold text-emerald-700">
                          {formatRupiah(item.total_harga)}
                        </span>
                      }
                    />
                  )}
                  <MobileCardRow
                    label="Pengirim"
                    value={item.petugas_pengirim.nama_lengkap}
                  />
                  <MobileCardRow
                    label="Tanggal Kirim"
                    value={new Date(item.tanggal_kirim).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
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
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Terima
                  </button>
                  <button
                    onClick={() => handleOpenModal(item, 'tolak')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all text-xs font-bold shadow-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                    Tolak
                  </button>
                </MobileCardActions>
              </MobileCard>
            ))}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    No. Surat Jalan
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Barang
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Jumlah
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Kondisi
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Nilai Barang
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Dikirim Oleh
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Tanggal Kirim
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {distribusiList.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {item.nomor_surat_jalan}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-800">
                        {item.sarana_prasarana.nama_barang}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.sarana_prasarana.kode}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {item.jumlah}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          item.sarana_prasarana.kondisi === 'Baik'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.sarana_prasarana.kondisi}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-bold text-emerald-700 text-xs">
                        {formatRupiah(item.total_harga)}
                      </div>
                      {item.harga_satuan > 0 && (
                        <div className="text-[11px] text-gray-400">
                          {formatRupiah(item.harga_satuan)}/unit
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.petugas_pengirim.nama_lengkap}
                    </td>
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
      </div>

      {/* Modal Konfirmasi */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slideIn max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${aksi === 'terima' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {aksi === 'terima' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <X className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {aksi === 'terima' ? 'Terima Barang' : 'Tolak Barang'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedItem(null)
                }}
                disabled={processing}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Info Barang */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Nama Barang</p>
                <p className="font-bold text-slate-900 mb-3">
                  {selectedItem.sarana_prasarana.nama_barang}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">No. Surat Jalan</p>
                    <p className="text-xs font-semibold text-slate-700">{selectedItem.nomor_surat_jalan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jumlah</p>
                    <p className="text-xs font-semibold text-slate-700">{selectedItem.jumlah} unit</p>
                  </div>
                  {selectedItem.total_harga > 0 && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">Harga Satuan</p>
                        <p className="text-xs font-semibold text-emerald-700">{formatRupiah(selectedItem.harga_satuan)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total Nilai Barang</p>
                        <p className="text-xs font-bold text-emerald-700">{formatRupiah(selectedItem.total_harga)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Kondisi (only for terima) */}
              {aksi === 'terima' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Kondisi Barang Saat Diterima <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={kondisiDiterima}
                    onChange={(e) => {
                      setKondisiDiterima(e.target.value)
                      // Reset foto jika kondisi berubah ke Baik
                      if (!isKondisiRusak(e.target.value)) {
                        setFotoFile(null)
                        setFotoPreview(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }
                    }}
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

              {/* Foto Kerusakan — WAJIB jika kondisi rusak */}
              {aksi === 'terima' && isKondisiRusak(kondisiDiterima) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-rose-500" />
                    Foto Kerusakan Barang
                    <span className="text-rose-500">* Wajib</span>
                  </label>

                  {/* Alert info */}
                  <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl mb-3">
                    <AlertCircle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-rose-700">
                      Barang dengan kondisi <strong>{kondisiDiterima}</strong> wajib disertai foto bukti kerusakan sebelum konfirmasi penerimaan.
                    </p>
                  </div>

                  {fotoPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={fotoPreview} alt="Preview" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={removeFoto}
                        disabled={processing}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(fotoPreview)}
                        className="absolute bottom-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all group ${processing ? 'opacity-50 cursor-not-allowed' : 'border-rose-300 hover:border-rose-400 bg-rose-50/50 hover:bg-rose-50'}`}>
                      <Camera className="h-8 w-8 text-rose-300 group-hover:text-rose-400 mb-2 transition-colors" />
                      <span className="text-xs text-rose-400 group-hover:text-rose-500 font-semibold transition-colors">Klik untuk upload foto kerusakan</span>
                      <span className="text-[10px] text-rose-300 mt-0.5">JPG, PNG, WebP — Maks. 5MB</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        onChange={handleFotoChange}
                        disabled={processing}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Catatan */}
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
                onClick={() => {
                  setShowModal(false)
                  setSelectedItem(null)
                }}
                disabled={processing}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleKonfirmasi}
                disabled={processing || (aksi === 'terima' && isKondisiRusak(kondisiDiterima) && !fotoFile)}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  aksi === 'terima'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Memproses...
                  </span>
                ) : aksi === 'terima' ? (
                  isKondisiRusak(kondisiDiterima) && !fotoFile
                    ? '⚠ Upload Foto Dulu'
                    : '✓ Konfirmasi Terima'
                ) : (
                  '✗ Tolak Pengiriman'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}