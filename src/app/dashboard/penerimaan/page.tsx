'use client'

import { useState, useEffect } from 'react'
import axios from '@/lib/axios'

interface Distribusi {
  id: number
  nomor_surat_jalan: string
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

export default function PenerimaanPage() {
  const [distribusiList, setDistribusiList] = useState<Distribusi[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Distribusi | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [aksi, setAksi] = useState<'terima' | 'tolak'>('terima')
  const [catatanPenerimaan, setCatatanPenerimaan] = useState('')
  const [kondisiDiterima, setKondisiDiterima] = useState<string>('Baik')
  const [processing, setProcessing] = useState(false)

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
      await axios.post(
        `/api/distribusi-asets/${selectedItem.id}/konfirmasi`,
        {
          aksi,
          catatan_penerimaan: catatanPenerimaan,
          kondisi_diterima: aksi === 'terima' ? kondisiDiterima : undefined,
        }
      )

      alert(
        aksi === 'terima'
          ? '✅ Barang berhasil diterima dan BAST telah diterbitkan!'
          : '❌ Pengiriman barang telah ditolak.'
      )

      setShowModal(false)
      setSelectedItem(null)
      fetchDistribusi() // Refresh list
    } catch (error: any) {
      console.error('Error konfirmasi:', error)
      alert(error.response?.data?.message || 'Gagal melakukan konfirmasi')
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
        </div>

        {/* Table */}
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
        ) : (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {aksi === 'terima' ? '✓ Terima Barang' : '✗ Tolak Barang'}
            </h2>

            <div className="mb-4 p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Barang:</div>
              <div className="font-medium text-gray-800">
                {selectedItem.sarana_prasarana.nama_barang}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                No. Surat Jalan: {selectedItem.nomor_surat_jalan}
              </div>
              <div className="text-sm text-gray-600">
                Jumlah: {selectedItem.jumlah}
              </div>
            </div>

            {aksi === 'terima' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kondisi Barang Saat Diterima
                </label>
                <select
                  value={kondisiDiterima}
                  onChange={(e) => setKondisiDiterima(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500"
                >
                  <option value="Baik">Baik</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan {aksi === 'terima' ? 'Penerimaan' : 'Penolakan'}
              </label>
              <textarea
                value={catatanPenerimaan}
                onChange={(e) => setCatatanPenerimaan(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder={`Masukkan catatan ${
                  aksi === 'terima' ? 'penerimaan' : 'penolakan'
                }...`}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedItem(null)
                }}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleKonfirmasi}
                disabled={processing}
                className={`px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 ${
                  aksi === 'terima'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing
                  ? 'Memproses...'
                  : aksi === 'terima'
                  ? 'Konfirmasi Terima'
                  : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
