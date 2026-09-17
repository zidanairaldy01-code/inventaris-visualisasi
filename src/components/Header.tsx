'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from '@/lib/axios';
import Cookies from 'js-cookie';
import {
  Bell, Search, UserCircle, ChevronDown, Package, MapPin, Building2,
  X, Loader2, Menu, User, KeyRound, LogOut, ShieldCheck, ChevronRight,
  AlertTriangle, CheckCheck, CheckCircle2, Clock, Trash2, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  asets: any[];
  ruangans: any[];
  gedungs: any[];
}

interface NotifikasiItem {
  id: number;
  tipe: string;
  judul: string;
  pesan: string;
  data?: {
    distribusi_id?: number;
    sarana_prasarana_id?: number;
    nama_barang?: string;
    kode_barang?: string;
    kondisi?: string;
    catatan?: string;
    ruangan_id?: number;
    nama_ruangan?: string;
    nama_gedung?: string;
    wakapro_id?: number;
    wakapro_nama?: string;
    link_url?: string;
  };
  is_read: boolean;
  created_at: string;
}

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [time, setTime] = useState<string>('');

  // User Dropdown State
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Notification States
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotifikasiItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Search States
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult>({ asets: [], ruangans: [], gedungs: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios.get('/api/user')
      .then(res => setUser(res.data))
      .catch(() => { });

    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current && !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        userMenuRef.current && !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
      if (
        notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifikasis?limit=15');
      if (res.data?.status === 'success') {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markNotificationRead = async (id: number) => {
    try {
      await axios.put(`/api/notifikasis/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await axios.put('/api/notifikasis/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/notifikasis/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
    } catch (e) {
      console.error(e);
    } finally {
      Cookies.remove('auth_token');
      window.location.href = '/login';
    }
  };

  // Live Search Logic with Debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults({ asets: [], ruangans: [], gedungs: [] });
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const [asetRes, ruanganRes, gedungRes] = await Promise.all([
          axios.get('/api/asets'),
          axios.get('/api/ruangans'),
          axios.get('/api/gedungs'),
        ]);

        const q = query.toLowerCase();
        const rawAsets = Array.isArray(asetRes.data) ? asetRes.data : (asetRes.data?.data ?? []);
        const matchedAsets = rawAsets.filter((a: any) =>
          a.nama_aset?.toLowerCase().includes(q) ||
          (a.kode_aset && a.kode_aset.toLowerCase().includes(q)) ||
          (a.kategori?.nama_kategori && a.kategori.nama_kategori.toLowerCase().includes(q))
        ).slice(0, 5);

        const rawRuangans = Array.isArray(ruanganRes.data) ? ruanganRes.data : (ruanganRes.data?.data ?? []);
        const matchedRuangans = rawRuangans.filter((r: any) =>
          r.nama_ruangan?.toLowerCase().includes(q) ||
          (r.gedung?.nama_gedung && r.gedung.nama_gedung.toLowerCase().includes(q))
        ).slice(0, 4);

        const rawGedungs = Array.isArray(gedungRes.data) ? gedungRes.data : (gedungRes.data?.data ?? []);
        const matchedGedungs = rawGedungs.filter((g: any) =>
          g.nama_gedung?.toLowerCase().includes(q)
        ).slice(0, 3);

        setResults({ asets: matchedAsets, ruangans: matchedRuangans, gedungs: matchedGedungs });
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (path: string) => {
    setShowDropdown(false);
    setQuery('');
    router.push(path);
  };

  // Helper: Detect role from pathname untuk profil link yang tepat
  const getProfilUrl = (pathname: string | null): string => {
    if (!pathname) return '/dashboard/profil';
    if (pathname.startsWith('/petugas-input')) return '/petugas-input/profil';
    if (pathname.startsWith('/wakapro')) return '/wakapro/profil';
    if (pathname.startsWith('/wakasek')) return '/wakasek/profil';
    return '/dashboard/profil';
  };

  const profilBaseUrl = getProfilUrl(pathname);
  const hasResults = results.asets.length > 0 || results.ruangans.length > 0 || results.gedungs.length > 0;
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <header className="flex-shrink-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-6 z-30 shadow-sm">
      {/* Left: Hamburger Menu (Mobile) + Date & Greeting */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Hamburger menu - only visible on mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden md:block">
          <p className="text-xs text-slate-400 font-medium">{today}</p>
          <p className="text-sm font-semibold text-slate-700 -mt-0.5">
            Selamat datang, <span className="text-blue-600">{user?.nama_lengkap?.split(' ')[0] || 'Admin'}</span> 👋
          </p>
        </div>
        
        {/* Mobile: Just show short greeting */}
        <div className="md:hidden">
          <p className="text-sm font-semibold text-slate-700">
            Halo, <span className="text-blue-600">{user?.nama_lengkap?.split(' ')[0] || 'Admin'}</span>
          </p>
        </div>
      </div>

      {/* Center: Search with Live Dropdown - Hidden on small mobile */}
      <div className="flex-1 max-w-md mx-3 sm:mx-6 relative hidden sm:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5 text-slate-400" />
            )}
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query.trim()) setShowDropdown(true); }}
            className="block w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-sm leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            placeholder="Cari aset, ruangan..."
          />
          {query ? (
            <button
              onClick={() => { setQuery(''); setShowDropdown(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1 px-1.5 py-0.5 bg-slate-200 rounded text-[10px] text-slate-500 font-mono">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto animate-fadeInUp"
          >
            {isSearching ? (
              <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span>Mencari data inventaris...</span>
              </div>
            ) : !hasResults ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Tidak ada hasil ditemukan untuk "<strong className="text-slate-600">{query}</strong>"
              </div>
            ) : (
              <div className="p-2 space-y-3">
                {/* Section: Aset */}
                {results.asets.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                      <Package className="h-3 w-3 mr-1.5 text-blue-500" />
                      Sarana &amp; Prasarana ({results.asets.length})
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {results.asets.map((aset) => (
                        <div
                          key={aset.id}
                          onClick={() => handleSelectResult('/dashboard/sarana-prasarana')}
                          className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50/60 cursor-pointer transition-colors group"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600">
                              {aset.nama_aset}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {aset.kode_aset || 'Tanpa Kode'} · {aset.ruangan?.nama_ruangan || 'Tanpa Ruang'}
                            </p>
                          </div>
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {aset.jumlah} {aset.satuan}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: Ruangan */}
                {results.ruangans.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                      <MapPin className="h-3 w-3 mr-1.5 text-emerald-500" />
                      Data Ruangan ({results.ruangans.length})
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {results.ruangans.map((ruangan) => (
                        <div
                          key={ruangan.id}
                          onClick={() => handleSelectResult(ruangan.jenis === 'workshop' ? '/dashboard/ruangan' : '/dashboard/gedung')}
                          className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50/60 cursor-pointer transition-colors group"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-600">
                                {ruangan.nama_ruangan}
                              </p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                ruangan.jenis === 'workshop' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {ruangan.jenis === 'workshop' ? 'Workshop' : 'Gedung'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              {ruangan.gedung?.nama_gedung || (ruangan.jenis === 'workshop' ? 'Mandiri' : 'Gedung Utama')} · Lt. {ruangan.lantai || '1'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: Gedung */}
                {results.gedungs.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                      <Building2 className="h-3 w-3 mr-1.5 text-violet-500" />
                      Data Gedung ({results.gedungs.length})
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {results.gedungs.map((gedung) => (
                        <div
                          key={gedung.id}
                          onClick={() => handleSelectResult('/dashboard/gedung')}
                          className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-violet-50/60 cursor-pointer transition-colors group"
                        >
                          <p className="text-xs font-semibold text-slate-800 group-hover:text-violet-600">
                            {gedung.nama_gedung}
                          </p>
                          <span className="text-[10px] text-slate-400">{gedung.jumlah_lantai} Lantai</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        {/* Live indicator - Hide on mobile */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-100 mr-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-emerald-600">{time} WIB</span>
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              if (!notifOpen) fetchNotifications();
            }}
            className={`relative p-2 rounded-xl transition-all ${
              notifOpen ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
            }`}
            title="Pemberitahuan Kerusakan Aset Workshop"
          >
            <Bell className={`h-4.5 w-4.5 transition-transform ${unreadCount > 0 ? 'text-amber-500' : ''}`} style={{ width: '18px', height: '18px' }} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-[18px] items-center justify-center px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${
                    user?.role === 'wakapro'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {user?.role === 'wakapro' ? <Bell className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">
                      {user?.role === 'wakapro' ? 'Pemberitahuan Workshop' : 'Laporan Kerusakan Aset'}
                    </h4>
                    <p className="text-[10px] text-slate-300">
                      {user?.role === 'wakapro' ? 'Notifikasi Khusus Workshop Anda' : 'Notifikasi dari Wakapro Workshop'}
                    </p>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] text-indigo-200 hover:text-white flex items-center gap-1 font-semibold transition-colors bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg"
                    title="Tandai semua sudah dibaca"
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span>Tandai dibaca</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center space-y-2">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      {user?.role === 'wakapro' ? 'Tidak Ada Notifikasi Baru' : 'Tidak Ada Laporan Baru'}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      {user?.role === 'wakapro'
                        ? 'Belum ada pengiriman aset baru maupun pemberitahuan khusus untuk workshop Anda.'
                        : 'Semua aset di seluruh workshop terpantau aman dan belum ada laporan kerusakan dari Wakapro.'}
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const kondisi = notif.data?.kondisi || '';
                    const isDamageNotif = notif.tipe === 'kerusakan_aset_workshop';
                    const isSevere = kondisi.toLowerCase().includes('berat') || kondisi.toLowerCase().includes('tidak layak');

                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (!notif.is_read) markNotificationRead(notif.id);
                          setNotifOpen(false);
                          if (notif.data?.link_url) {
                            router.push(notif.data.link_url);
                          }
                          // Jika tidak ada link_url, tidak redirect — user tetap di halaman yang sama
                        }}
                        className={`p-3.5 transition-all cursor-pointer hover:bg-slate-50 relative group flex gap-3 items-start ${
                          !notif.is_read ? 'bg-amber-50/40 border-l-4 border-l-amber-500' : 'border-l-4 border-l-transparent'
                        }`}
                      >
                        {/* Icon */}
                        <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                          isDamageNotif
                            ? isSevere ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {isDamageNotif ? <AlertTriangle className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {notif.data?.nama_barang || notif.judul}
                            </span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(notif.created_at)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 mb-1 leading-snug">
                            {notif.pesan}
                          </p>

                          {/* Lokasi Workshop / Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {notif.data?.nama_ruangan && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {notif.data.nama_ruangan}
                              </span>
                            )}
                            {kondisi && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                isSevere 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {kondisi}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                            {notif.data?.wakapro_nama ? (
                              <span>Pelapor: <strong className="text-slate-600 font-semibold">{notif.data.wakapro_nama}</strong></span>
                            ) : (
                              <span>Sistem Notifikasi Terpadu</span>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => deleteNotification(notif.id, e)}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100"
                                title="Hapus notifikasi"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                {user?.role === 'wakapro' ? (
                  <>
                    <Link
                      href="/wakapro/notifikasi"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50/50"
                    >
                      <span>Lihat Semua Notifikasi</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Link
                      href="/wakapro/inventaris"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Inventaris Workshop
                    </Link>
                  </>
                ) : pathname?.startsWith('/petugas-input') ? (
                  <>
                    <Link
                      href="/petugas-input/notifikasi"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50/50"
                    >
                      <span>Lihat Semua Notifikasi</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Link
                      href="/petugas-input/distribusi"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Distribusi
                    </Link>
                  </>
                ) : pathname?.startsWith('/wakasek') ? (
                  <>
                    <Link
                      href="/wakasek/notifikasi"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50/50"
                    >
                      <span>Lihat Semua Notifikasi</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Link
                      href="/wakasek/kondisi"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Kondisi Aset
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard/notifikasi"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50/50"
                    >
                      <span>Lihat Semua Notifikasi</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Link
                      href="/dashboard/kondisi"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Monitoring Kondisi Aset
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile dropdown container */}
        <div className="relative" ref={userMenuRef}>
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`flex items-center border border-slate-200 pl-2 pr-2 sm:pr-3 py-1.5 space-x-2 sm:space-x-2.5 cursor-pointer hover:bg-slate-50 rounded-xl transition-all ml-1 ${
              userMenuOpen ? 'bg-slate-100 ring-2 ring-blue-500/20 border-blue-300' : ''
            }`}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {user?.nama_lengkap?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="hidden md:block text-sm text-left">
              <div className="font-semibold text-slate-800 text-xs leading-tight">{user?.nama_lengkap || 'Memuat...'}</div>
              <div className="text-[10px] text-slate-400 capitalize leading-tight">{user?.role || 'Admin'}</div>
            </div>
            <ChevronDown className={`h-3 w-3 text-slate-400 flex-shrink-0 hidden sm:block transition-transform duration-200 ${userMenuOpen ? 'rotate-180 text-blue-600' : ''}`} />
          </div>

          {/* Profile Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* User Summary Header */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md">
                    {user?.nama_lengkap?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{user?.nama_lengkap || 'Pengguna'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email || `@${user?.username}` || 'admin@smkpgri.sch.id'}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 capitalize">
                        <ShieldCheck className="w-3 h-3 mr-0.5" />
                        {user?.role || 'admin'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Links */}
              <div className="p-1.5 space-y-0.5">
                <Link
                  href={profilBaseUrl}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors group"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                      <User className="h-4 w-4" />
                    </div>
                    <span>Profil Saya</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  href={`${profilBaseUrl}?tab=password`}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors group"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <span>Ubah Password</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              </div>

              <div className="border-t border-slate-100 p-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors group"
                >
                  <div className="p-1.5 rounded-lg bg-red-50 text-red-600 group-hover:bg-red-100 transition-colors">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span>Keluar Sistem</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
