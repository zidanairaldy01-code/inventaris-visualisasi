'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import Cookies from 'js-cookie';
import {
  Bell, Search, UserCircle, ChevronDown, Package, MapPin, Building2,
  X, Loader2, Menu, User, KeyRound, LogOut, ShieldCheck, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  asets: any[];
  ruangans: any[];
  gedungs: any[];
}

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [time, setTime] = useState<string>('');

  // User Dropdown State
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        const matchedAsets = asetRes.data.filter((a: any) =>
          a.nama_aset.toLowerCase().includes(q) ||
          (a.kode_aset && a.kode_aset.toLowerCase().includes(q)) ||
          (a.kategori?.nama_kategori && a.kategori.nama_kategori.toLowerCase().includes(q))
        ).slice(0, 5);

        const matchedRuangans = ruanganRes.data.filter((r: any) =>
          r.nama_ruangan.toLowerCase().includes(q) ||
          (r.gedung?.nama_gedung && r.gedung.nama_gedung.toLowerCase().includes(q))
        ).slice(0, 4);

        const matchedGedungs = gedungRes.data.filter((g: any) =>
          g.nama_gedung.toLowerCase().includes(q)
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
                      Ruangan Workshop ({results.ruangans.length})
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {results.ruangans.map((ruangan) => (
                        <div
                          key={ruangan.id}
                          onClick={() => handleSelectResult('/dashboard/ruangan')}
                          className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50/60 cursor-pointer transition-colors group"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-600">
                              {ruangan.nama_ruangan}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {ruangan.gedung?.nama_gedung || 'Gedung Utama'} · Lt. {ruangan.lantai || '1'}
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

        {/* Notification */}
        <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
          <Bell className="h-4.5 w-4.5" style={{ width: '18px', height: '18px' }} />
          <span className="absolute top-1.5 right-1.5 block h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-white" />
        </button>

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
                  href="/dashboard/profil"
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
                  href="/dashboard/profil?tab=password"
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
