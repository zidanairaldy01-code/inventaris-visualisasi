'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  sarana_prasarana: {
    nama_barang: string
    kode: string
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
  wakapro_penerima: {
    nama_lengkap: string
  } | null
}

export default function DistribusiPage() {
  const router = useRouter()
  const [distribusiList, setDistribusiList] = useState<Distribusi[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    fetchDistribusi()
  }, [filterStatus])

  const fetchDistribusi = async () => {
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
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      menunggu_konfirmasi: 'bg-yellow-100 text-yellow-800',
      diterima: 'bg-green-100 text-green-800',
      ditolak: 'bg-red-100 text-red-800',
    }
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      menunggu_konfirmasi: 'Menunggu Konfirmasi',
      diterima: 'Diterima',
      ditolak: 'Ditolak',
    }
    return labels[status as keyof typeof labels] || status
  }

  const filteredList = distribusiList.filter((item) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      item.nomor_surat_jalan.toLowerCase().includes(searchLower) ||
      item.sarana_prasarana.nama_barang.toLowerCase().includes(searchLower) ||
      item.ruangan_tujuan.nama_ruangan.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Distribusi Aset ke Workshop
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Kelola pengiriman aset ke workshop dengan surat jalan & BAST
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nomor surat jalan, barang, atau ruangan..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="menunggu_konfirmasi">Menunggu Konfirmasi</option>
              <option value="diterima">Diterima</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            <p className="mt-2 text-gray-600">Memuat data...</p>
          </div>
        ) : filteredList.length === 0 ? (
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
                    Tujuan
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Tanggal Kirim
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    BAST
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item) => (
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
                    <td className="px-4 py-3 text-sm">{item.jumlah}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-800">
                        {item.ruangan_tujuan.nama_ruangan}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.ruangan_tujuan.gedung.nama_gedung}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(item.tanggal_kirim).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.nomor_bast ? (
                        <span className="text-green-600 font-medium">
                          {item.nomor_bast}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary */}
        {!loading && filteredList.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {filteredList.length}
                </div>
                <div className="text-sm text-gray-600">Total Distribusi</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {
                    filteredList.filter((d) => d.status === 'menunggu_konfirmasi')
                      .length
                  }
                </div>
                <div className="text-sm text-gray-600">Menunggu Konfirmasi</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredList.filter((d) => d.status === 'diterima').length}
                </div>
                <div className="text-sm text-gray-600">Diterima</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
