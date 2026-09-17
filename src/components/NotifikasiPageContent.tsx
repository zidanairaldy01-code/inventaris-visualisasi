'use client'

import { useState, useEffect, useCallback } from 'react'
import axios from '@/lib/axios'
import {
  Bell, BellOff, Check, CheckCheck, Trash2,
  AlertTriangle, Info, PackageCheck, Wrench,
  Loader2, RefreshCw, Filter, ChevronDown,
  Package, Truck, ClipboardList, ShieldAlert,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotifData {
  distribusi_id?: number
  sarana_prasarana_id?: number
  nama_barang?: string
  kode_barang?: string
  kondisi?: string
  catatan?: string
  ruangan_id?: number
  nama_ruangan?: string
  nama_gedung?: string
  wakapro_id?: number
  wakapro_nama?: string
  link_url?: string
}

interface Notifikasi {
  id: number
  target_role: string
  target_user_id: number | null
  target_ruangan_id: number | null
  tipe: string
  judul: string
  pesan: string
  data: NotifData | null
  is_read: boolean
  created_at: string
  updated_at: string
}

interface ApiResponse {
  status: string
  unread_count: number
  data: Notifikasi[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'unread' | 'read'

function getIconForTipe(tipe: string, kondisi?: string): React.ReactNode {
  const isSevere = kondisi?.toLowerCase().includes('berat') || kondisi?.toLowerCase().includes('tidak layak')
  if (tipe.includes('distribusi') || tipe.includes('pengiriman')) return <Truck className="h-4 w-4" />
  if (tipe.includes('kerusakan') || tipe.includes('kondisi')) {
    return isSevere
      ? <ShieldAlert className="h-4 w-4" />
      : <AlertTriangle className="h-4 w-4" />
  }
  if (tipe.includes('servis') || tipe.includes('perbaikan')) return <Wrench className="h-4 w-4" />
  if (tipe.includes('inventaris') || tipe.includes('barang')) return <Package className="h-4 w-4" />
  if (tipe.includes('peminjaman')) return <ClipboardList className="h-4 w-4" />
  if (tipe.includes('penerimaan') || tipe.includes('bast')) return <PackageCheck className="h-4 w-4" />
  return <Info className="h-4 w-4" />
}

function getColorForTipe(tipe: string, kondisi?: string): string {
  const isSevere = kondisi?.toLowerCase().includes('berat') || kondisi?.toLowerCase().includes('tidak layak')
  if (tipe.includes('distribusi') || tipe.includes('pengiriman')) return 'text-blue-600 bg-blue-100'
  if (tipe.includes('kerusakan') || tipe.includes('kondisi')) {
    return isSevere ? 'text-red-600 bg-red-100' : 'text-amber-600 bg-amber-100'
  }
  if (tipe.includes('servis') || tipe.includes('perbaikan')) return 'text-purple-600 bg-purple-100'
  if (tipe.includes('inventaris') || tipe.includes('barang')) return 'text-emerald-600 bg-emerald-100'
  if (tipe.includes('peminjaman')) return 'text-indigo-600 bg-indigo-100'
  if (tipe.includes('penerimaan') || tipe.includes('bast')) return 'text-teal-600 bg-teal-100'
  return 'text-slate-600 bg-slate-100'
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay === 1) return 'Kemarin'
  if (diffDay < 7) return `${diffDay} hari lalu`
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotifikasiPageContent() {
  const [notifikasi, setNotifikasi] = useState<Notifikasi[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [markingId, setMarkingId] = useState<number | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  // ── Fetch ──
  const fetchNotifikasi = useCallback(async (showRefreshSpin = false) => {
    if (showRefreshSpin) setRefreshing(true)
    try {
      const res = await axios.get<ApiResponse>('/api/notifikasis?limit=200')
      setNotifikasi(res.data.data ?? [])
      setUnreadCount(res.data.unread_count ?? 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchNotifikasi() }, [fetchNotifikasi])

  // ── Mark read single ──
  const handleMarkRead = async (id: number) => {
    setMarkingId(id)
    try {
      const res = await axios.put<{ unread_count: number; data: Notifikasi }>(`/api/notifikasis/${id}/read`)
      setUnreadCount(res.data.unread_count)
      setNotifikasi(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {
      // silent
    } finally {
      setMarkingId(null)
    }
  }

  // ── Mark all read ──
  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await axios.put('/api/notifikasis/read-all')
      setUnreadCount(0)
      setNotifikasi(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {
      // silent
    } finally {
      setMarkingAll(false)
    }
  }

  // ── Delete ──
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(id)
    try {
      const res = await axios.delete<{ unread_count: number }>(`/api/notifikasis/${id}`)
      setUnreadCount(res.data.unread_count)
      setNotifikasi(prev => prev.filter(n => n.id !== id))
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  // ── Filtered list ──
  const filtered = notifikasi.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read') return n.is_read
    return true
  })

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const filterLabel: Record<FilterType, string> = {
    all: 'Semua',
    unread: 'Belum Dibaca',
    read: 'Sudah Dibaca',
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Riwayat Notifikasi
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unreadCount > 0
              ? <span className="text-amber-600 font-semibold">{unreadCount} belum dibaca</span>
              : 'Semua notifikasi sudah dibaca'}
            {' '}· {notifikasi.length} total
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => fetchNotifikasi(true)}
            disabled={refreshing}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            title="Muat ulang"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Tandai Semua Dibaca
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm">
        <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'unread', 'read'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1) }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filterLabel[f]}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">
          {filtered.length} notifikasi
        </span>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Memuat notifikasi…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-xl border border-slate-200">
          <BellOff className="h-10 w-10 text-slate-300" />
          <p className="text-slate-500 font-medium">
            {filter === 'unread' ? 'Tidak ada notifikasi yang belum dibaca' : 'Belum ada notifikasi'}
          </p>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-xs text-blue-600 hover:underline"
            >
              Tampilkan semua
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map(notif => {
            const iconColor = getColorForTipe(notif.tipe, notif.data?.kondisi)
            const isDeleting = deletingId === notif.id
            const isMarking = markingId === notif.id

            return (
              <div
                key={notif.id}
                className={`group relative flex gap-4 px-4 py-4 rounded-xl border transition-all ${
                  notif.is_read
                    ? 'bg-white border-slate-200'
                    : 'bg-amber-50/60 border-amber-200 border-l-4 border-l-amber-500'
                }`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${iconColor}`}>
                  {getIconForTipe(notif.tipe, notif.data?.kondisi)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${notif.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-800'}`}>
                      {notif.judul}
                    </p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5" title={formatFullDate(notif.created_at)}>
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {notif.pesan}
                  </p>

                  {/* Extra data tags */}
                  {notif.data && (notif.data.nama_barang || notif.data.nama_ruangan) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {notif.data.nama_barang && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          <Package className="h-2.5 w-2.5" /> {notif.data.nama_barang}
                        </span>
                      )}
                      {notif.data.nama_ruangan && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600">
                          {notif.data.nama_ruangan}
                          {notif.data.nama_gedung ? ` · ${notif.data.nama_gedung}` : ''}
                        </span>
                      )}
                      {notif.data.kondisi && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {notif.data.kondisi}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tipe badge */}
                  <div className="flex items-center mt-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                      {notif.tipe.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Actions (visible on hover) */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      disabled={isMarking}
                      title="Tandai sudah dibaca"
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                    >
                      {isMarking
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Check className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={e => handleDelete(notif.id, e)}
                    disabled={isDeleting}
                    title="Hapus notifikasi"
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {isDeleting
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Unread dot */}
                {!notif.is_read && (
                  <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Sebelumnya
          </button>
          <span className="text-xs text-slate-500">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Berikutnya →
          </button>
        </div>
      )}
    </div>
  )
}
