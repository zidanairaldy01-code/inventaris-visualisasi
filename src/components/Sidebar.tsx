'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, Warehouse,
  LogOut, Package, ChevronRight, Wrench, Handshake,
  BarChart3, ChevronDown, ClipboardList, X, Wallet,
  SlidersHorizontal, History, User, Users, Truck, Inbox
} from 'lucide-react';
import Cookies from 'js-cookie';
import axios from '@/lib/axios';
import { useState, useEffect } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  group: string;
  badge?: string;
  badgeColor?: string;
  roles?: string[];
}

const groups = [
  { key: 'main',        label: 'Menu Utama' },
  { key: 'distribusi',  label: 'Distribusi & Serah Terima' },
  { key: 'inventaris',  label: 'Inventaris & Pengadaan' },
  { key: 'layanan',     label: 'Sirkulasi & Layanan' },
  { key: 'master',      label: 'Data Master' },
  { key: 'laporan',     label: 'Laporan & Pengaturan' },
];

const navigation: NavItem[] = [
  // Menu Utama
  { name: 'Dashboard',          href: '/dashboard',                  icon: LayoutDashboard,    group: 'main' },

  // Distribusi & Serah Terima
  { name: 'Distribusi & BAST',  href: '/dashboard/distribusi',       icon: Truck,              group: 'distribusi', roles: ['super_admin', 'petugas'] },
  { name: 'Penerimaan Barang',  href: '/dashboard/penerimaan',       icon: Inbox,              group: 'distribusi', roles: ['super_admin', 'wakapro'] },

  // Inventaris & Pengadaan
  { name: 'Sarana & Prasarana', href: '/dashboard/sarana-prasarana', icon: Package,            group: 'inventaris', roles: ['super_admin', 'petugas', 'wakasek'] },
  { name: 'Inventaris',         href: '/dashboard/inventaris',       icon: ClipboardList,      group: 'inventaris', roles: ['super_admin', 'petugas', 'wakasek'] },
  { name: 'Sumber Dana',        href: '/dashboard/sumber-dana',      icon: Wallet,             group: 'inventaris', roles: ['super_admin', 'petugas', 'wakasek'] },

  // Sirkulasi & Layanan
  { name: 'Peminjaman Aset',    href: '/dashboard/peminjaman',       icon: Handshake,          group: 'layanan' },
  { name: 'Servis & Perbaikan', href: '/dashboard/servis',           icon: Wrench,             group: 'layanan' },

  // Data Master
  { name: 'Master Gedung',      href: '/dashboard/gedung',           icon: Building2,          group: 'master',     roles: ['super_admin', 'petugas'] },
  { name: 'Ruangan Workshop',   href: '/dashboard/ruangan',          icon: Warehouse,          group: 'master',     roles: ['super_admin', 'petugas'] },
  { name: 'Kondisi Aset',       href: '/dashboard/kondisi',          icon: SlidersHorizontal,  group: 'master' },

  // Laporan & Pengaturan
  { name: 'Riwayat Aktivitas',  href: '/dashboard/history',          icon: History,            group: 'laporan',    roles: ['super_admin', 'petugas', 'wakasek'] },
  { name: 'Laporan',            href: '/dashboard/laporan',          icon: BarChart3,          group: 'laporan' },
  { name: 'Kelola Pengguna',    href: '/dashboard/users',            icon: Users,              group: 'laporan',    roles: ['super_admin'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isInventarisOpen, setIsInventarisOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (pathname?.includes('/inventaris')) {
      setIsInventarisOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    axios.get('/api/user')
      .then(res => setUser(res.data))
      .catch(() => {});
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

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 sidebar-gradient shadow-2xl z-20 relative overflow-hidden h-screen border-r border-slate-800/60">
        <SidebarContent
          pathname={pathname}
          user={user}
          isInventarisOpen={isInventarisOpen}
          setIsInventarisOpen={setIsInventarisOpen}
          handleLogout={handleLogout}
          onLinkClick={() => {}}
        />
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 sidebar-gradient shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden h-screen flex flex-col border-r border-slate-800/60 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-30"
          aria-label="Tutup menu"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent
          pathname={pathname}
          user={user}
          isInventarisOpen={isInventarisOpen}
          setIsInventarisOpen={setIsInventarisOpen}
          handleLogout={handleLogout}
          onLinkClick={handleLinkClick}
        />
      </div>
    </>
  );
}

function SidebarContent({
  pathname,
  user,
  isInventarisOpen,
  setIsInventarisOpen,
  handleLogout,
  onLinkClick,
}: {
  pathname: string | null;
  user: any;
  isInventarisOpen: boolean;
  setIsInventarisOpen: (open: boolean) => void;
  handleLogout: () => void;
  onLinkClick: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Subtle Background Glows */}
      <div className="absolute top-12 left-2 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-28 right-2 w-28 h-28 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Brand Logo Header ── */}
      <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between flex-shrink-0 relative z-10">
        <Link href="/dashboard" onClick={onLinkClick} className="flex items-center gap-3 group">
          <div className="relative flex-shrink-0">
            <img
              src="http://localhost:8000/storage/img/pgri-telagasari.jpg"
              alt="Logo SMK PGRI Telagasari"
              className="w-9 h-9 rounded-xl object-cover shadow-md ring-2 ring-white/15 group-hover:ring-blue-500/50 transition-all"
              onError={(e) => {
                // Fallback avatar if local image not found
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">SMK</div>';
              }}
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                SIM ASET
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
              SMK PGRI Telagasari
            </p>
          </div>
        </Link>
      </div>

      {/* ── Kondisi Aset Widget ── */}
      <div className="border-t border-white/5 px-0 py-2 relative z-10">
      </div>

      {/* ── Main Navigation List ── */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4 relative z-10 scrollbar-none">
        {groups.map((group) => {
          const userRole = user?.role || 'petugas';
          const items = navigation.filter((n) => {
            if (n.group !== group.key) return false;
            if (n.roles && !n.roles.includes(userRole)) return false;
            return true;
          });
          if (items.length === 0) return null;

          return (
            <div key={group.key} className="space-y-1">
              <div className="px-3 pt-1 pb-1">
                <p className="text-[10px] font-bold text-slate-400/90 uppercase tracking-widest">
                  {group.label}
                </p>
              </div>

              <nav className="space-y-0.5">
                {items.map((item) => {
                  // Special handle for Inventaris dropdown
                  if (item.name === 'Inventaris') {
                    const isInvActive = pathname?.includes('/dashboard/inventaris');

                    return (
                      <div key="inventaris-dropdown" className="space-y-0.5">
                        <button
                          onClick={() => setIsInventarisOpen(!isInventarisOpen)}
                          className={`group flex items-center w-full px-3 py-2 text-xs font-medium rounded-xl transition-all duration-200 relative ${
                            isInvActive
                              ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/20 text-white shadow-sm font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          {isInvActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full" />
                          )}
                          <ClipboardList
                            className={`flex-shrink-0 mr-2.5 h-4 w-4 transition-all duration-200 ${
                              isInvActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                            }`}
                          />
                          <span className="truncate flex-1 text-left">Inventaris</span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 ml-1 flex-shrink-0 transition-transform duration-200 ${
                              isInventarisOpen ? 'rotate-180' : ''
                            } ${isInvActive ? 'text-blue-400' : 'text-slate-500'}`}
                          />
                        </button>

                        {isInventarisOpen && (
                          <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700/60 pl-2">
                            {[
                              { label: 'Rekap Belanja', href: '/dashboard/inventaris/rekap-belanja', dot: 'bg-indigo-400' },
                              { label: 'Daftar Belanja', href: '/dashboard/inventaris/belanja',      dot: 'bg-teal-400' },
                              { label: 'Inventaris Gudang', href: '/dashboard/inventaris/gudang',   dot: 'bg-amber-400' },
                            ].map((sub) => {
                              const isSubActive =
                                pathname === sub.href ||
                                (sub.href === '/dashboard/inventaris/rekap-belanja' && pathname === '/dashboard/inventaris');

                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={onLinkClick}
                                  className={`group flex items-center px-2.5 py-1.5 text-xs rounded-lg transition-all duration-150 ${
                                    isSubActive
                                      ? 'bg-blue-600/25 text-blue-300 font-semibold'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                  }`}
                                >
                                  <span className="truncate flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${sub.dot} inline-block flex-shrink-0`} />
                                    {sub.label}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname?.startsWith(item.href));

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onLinkClick}
                      className={`group flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-all duration-200 relative ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/20 text-white shadow-sm font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full" />
                      )}
                      <Icon
                        className={`flex-shrink-0 mr-2.5 h-4 w-4 transition-all duration-200 ${
                          isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                        }`}
                      />
                      <span className="truncate flex-1">{item.name}</span>
                      {isActive && (
                        <ChevronRight className="h-3 w-3 text-blue-400 ml-1 flex-shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* ── Footer: Profile & Logout ── */}
      <div className="p-3 border-t border-white/5 flex-shrink-0 space-y-1.5 bg-slate-950/40 relative z-10">
        {/* User Card */}
        <Link
          href="/dashboard/profil"
          onClick={onLinkClick}
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow flex-shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
          </div>
          <div className="truncate flex-1">
            <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
              {user?.nama_lengkap || user?.name || 'Administrator'}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                {user?.role ? user.role.replace('_', ' ') : 'Petugas'}
              </span>
              {user?.ruangan && (
                <span className="text-[9px] text-slate-400 truncate">
                  • {user.ruangan.nama_ruangan}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-2.5 py-1.5 text-xs font-semibold text-slate-400 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
        >
          <LogOut className="flex-shrink-0 mr-2.5 h-3.5 w-3.5 group-hover:text-red-400 transition-colors" />
          <span>Keluar Sistem</span>
        </button>
      </div>
    </div>
  );
}
