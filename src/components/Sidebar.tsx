'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, Warehouse,
  LogOut, Package, ChevronRight, Wrench, Handshake,
  BarChart3, ChevronDown, ClipboardList, X, Wallet,
  SlidersHorizontal, History, User, Users, Truck, Inbox, Bell
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
  dynamicHref?: boolean;
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
  // Menu Utama - This will be overridden based on role in render
  { name: 'Dashboard',          href: '/dashboard',                  icon: LayoutDashboard,    group: 'main', dynamicHref: true },

  // Distribusi & Serah Terima
  { name: 'Distribusi & BAST',    href: '/dashboard/distribusi',          icon: Truck,              group: 'distribusi', roles: ['super_admin', 'petugas'], dynamicHref: true },
  { name: 'Penerimaan Barang',    href: '/dashboard/penerimaan',          icon: Inbox,              group: 'distribusi', roles: ['super_admin', 'wakapro'], dynamicHref: true },

  // Inventaris & Pengadaan
  { name: 'Inventaris Workshop',  href: '/wakapro/inventaris',            icon: Warehouse,          group: 'inventaris', roles: ['wakapro'] },
  { name: 'Sarana & Prasarana',   href: '/dashboard/sarana-prasarana',    icon: Package,            group: 'inventaris', roles: ['super_admin', 'petugas', 'wakasek'], dynamicHref: true },
  { name: 'Inventaris',           href: '/dashboard/inventaris',          icon: ClipboardList,      group: 'inventaris', roles: ['super_admin', 'petugas', 'wakasek'], dynamicHref: true },
  { name: 'Sumber Dana',          href: '/dashboard/sumber-dana',         icon: Wallet,             group: 'inventaris', roles: ['super_admin', 'petugas', 'wakasek'], dynamicHref: true },

  // Sirkulasi & Layanan
  { name: 'Peminjaman Aset',    href: '/dashboard/peminjaman',       icon: Handshake,          group: 'layanan', dynamicHref: true },
  { name: 'Servis & Perbaikan', href: '/dashboard/servis',           icon: Wrench,             group: 'layanan', dynamicHref: true },
  { name: 'Monitoring Kondisi', href: '/wakapro/kondisi',            icon: SlidersHorizontal,  group: 'layanan', roles: ['wakapro'] },

  // Data Master
  { name: 'Master Gedung',      href: '/dashboard/gedung',           icon: Building2,          group: 'master',     roles: ['super_admin', 'petugas'], dynamicHref: true },
  { name: 'Ruangan Workshop',   href: '/dashboard/ruangan',          icon: Warehouse,          group: 'master',     roles: ['super_admin', 'petugas'], dynamicHref: true },
  { name: 'Kondisi Aset',       href: '/dashboard/kondisi',          icon: SlidersHorizontal,  group: 'master', roles: ['super_admin', 'petugas', 'wakasek'], dynamicHref: true },

  // Laporan & Pengaturan
  { name: 'Riwayat Aktivitas',  href: '/dashboard/history',          icon: History,            group: 'laporan',    roles: ['super_admin', 'petugas', 'wakasek'], dynamicHref: true },
  { name: 'Laporan',            href: '/dashboard/laporan',          icon: BarChart3,          group: 'laporan', dynamicHref: true },
  { name: 'Kelola Pengguna',    href: '/dashboard/users',            icon: Users,              group: 'laporan',    roles: ['super_admin'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper function: Transform href based on role
function getHrefForRole(href: string, role: string, isDynamic?: boolean): string {
  if (!isDynamic) {
    return href;
  }

  // For Dashboard link, redirect to role-specific dashboard
  if (href === '/dashboard' || href === '/dashboard/') {
    if (role === 'petugas') return '/petugas-input';
    if (role === 'wakapro') return '/wakapro';
    if (role === 'wakasek') return '/wakasek';
    return href; // super_admin stays at /dashboard
  }

  // For wakapro role, map all accessible routes to /wakapro/...
  if (role === 'wakapro') {
    if (href === '/dashboard/penerimaan') return '/wakapro/penerimaan';
    if (href === '/dashboard/peminjaman') return '/wakapro/peminjaman';
    if (href === '/dashboard/servis') return '/wakapro/servis';
    if (href === '/dashboard/kondisi') return '/wakapro/kondisi';
    if (href === '/dashboard/laporan') return '/wakapro/laporan';
    if (href === '/dashboard/notifikasi') return '/wakapro/notifikasi';
  }

  // For petugas role, map all accessible routes to /petugas-input/...
  if (role === 'petugas') {
    if (href === '/dashboard/distribusi') return '/petugas-input/distribusi';
    if (href === '/dashboard/sarana-prasarana') return '/petugas-input/sarana-prasarana';
    if (href === '/dashboard/inventaris') return '/petugas-input/inventaris';
    if (href === '/dashboard/sumber-dana') return '/petugas-input/sumber-dana';
    if (href === '/dashboard/peminjaman') return '/petugas-input/peminjaman';
    if (href === '/dashboard/servis') return '/petugas-input/servis';
    if (href === '/dashboard/gedung') return '/petugas-input/gedung';
    if (href === '/dashboard/ruangan') return '/petugas-input/ruangan';
    if (href === '/dashboard/kondisi') return '/petugas-input/kondisi';
    if (href === '/dashboard/history') return '/petugas-input/history';
    if (href === '/dashboard/laporan') return '/petugas-input/laporan';
    if (href === '/dashboard/notifikasi') return '/petugas-input/notifikasi';
  }

  // For wakasek role, map all accessible routes to /wakasek/...
  if (role === 'wakasek') {
    if (href === '/dashboard/sarana-prasarana') return '/wakasek/sarana-prasarana';
    if (href === '/dashboard/inventaris') return '/wakasek/inventaris';
    if (href === '/dashboard/sumber-dana') return '/wakasek/sumber-dana';
    if (href === '/dashboard/peminjaman') return '/wakasek/peminjaman';
    if (href === '/dashboard/servis') return '/wakasek/servis';
    if (href === '/dashboard/kondisi') return '/wakasek/kondisi';
    if (href === '/dashboard/history') return '/wakasek/history';
    if (href === '/dashboard/laporan') return '/wakasek/laporan';
    if (href === '/dashboard/notifikasi') return '/wakasek/notifikasi';
  }

  return href; // super_admin stays at /dashboard/...
}

// Helper: Get base path prefix for a given role
function getBasePath(role: string): string {
  if (role === 'petugas') return '/petugas-input';
  if (role === 'wakapro') return '/wakapro';
  if (role === 'wakasek') return '/wakasek';
  return '/dashboard';
}

// Helper: Detect role from pathname
function detectRoleFromPathname(pathname: string | null): string {
  if (!pathname) return 'super_admin';
  
  if (pathname.startsWith('/petugas-input')) return 'petugas';
  if (pathname.startsWith('/wakapro')) return 'wakapro';
  if (pathname.startsWith('/wakasek')) return 'wakasek';
  
  return 'super_admin';
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isInventarisOpen, setIsInventarisOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [roleFromPath, setRoleFromPath] = useState<string>('super_admin');

  // Detect role immediately from pathname
  useEffect(() => {
    const detectedRole = detectRoleFromPathname(pathname);
    setRoleFromPath(detectedRole);
    
    if (pathname?.includes('/inventaris')) {
      setIsInventarisOpen(true);
    }
  }, [pathname]);

  // Fetch user info (for display only, role already known from pathname)
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
      localStorage.removeItem('auth_last_active');
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
          roleFromPath={roleFromPath}
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
          roleFromPath={roleFromPath}
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
  roleFromPath,
  isInventarisOpen,
  setIsInventarisOpen,
  handleLogout,
  onLinkClick,
}: {
  pathname: string | null;
  user: any;
  roleFromPath: string;
  isInventarisOpen: boolean;
  setIsInventarisOpen: (open: boolean) => void;
  handleLogout: () => void;
  onLinkClick: () => void;
}) {
  const formatRole = (role?: string) => {
    if (!role) return 'Petugas';
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'petugas') return 'Petugas Input';
    if (role === 'wakapro') return 'Waka Program';
    if (role === 'wakasek') return 'Waka Sarpras';
    return role.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const currentBasePath = getBasePath(roleFromPath);

  return (
    <div className="flex flex-col h-full select-none">
      {/* Subtle Background Glows */}
      <div className="absolute top-12 left-2 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-28 right-2 w-28 h-28 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Brand Logo Header ── */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between flex-shrink-0 relative z-10 bg-slate-950/20">
        <Link href={currentBasePath} onClick={onLinkClick} className="flex items-center gap-3 group">
          <div className="relative flex-shrink-0">
            <img
              src="/smk-pgri-telagasari.png"
              alt="Logo SMK PGRI Telagasari"
              className="w-9 h-9 rounded-xl object-cover bg-white p-0.5 shadow-md ring-2 ring-white/10 group-hover:ring-blue-500/40 transition-all shrink-0"
              onError={(e) => {
                e.currentTarget.src = '/img/pgri-telagasari.jpg';
              }}
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                SIM ASET
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
              SMK PGRI Telagasari
            </p>
          </div>
        </Link>
      </div>

      {/* ── Main Navigation List ── */}
      <div className="flex-1 overflow-y-auto py-3 px-3 relative z-10 scrollbar-none">
        <div className="space-y-3">
          {groups.map((group, groupIdx) => {
            const items = navigation.filter((n) => {
              if (n.group !== group.key) return false;
              if (n.roles && !n.roles.includes(roleFromPath)) return false;
              return true;
            });
            if (items.length === 0) return null;

            return (
              <div
                key={group.key}
                className={groupIdx === 0 ? 'space-y-1' : 'space-y-1 pt-3 border-t border-white/[0.07]'}
              >
                <div className="px-2.5 pb-1">
                  <p className="text-[10px] font-bold text-slate-400/80 uppercase tracking-wider">
                    {group.label}
                  </p>
                </div>

                <nav className="space-y-1">
                  {items.map((item) => {
                    // Special handle for Inventaris dropdown
                    if (item.name === 'Inventaris') {
                      const basePath = getBasePath(roleFromPath);
                      const invBase = `${basePath}/inventaris`;
                      const isInvActive = pathname?.includes('/inventaris');

                      const subItems = [
                        { label: 'Rekap Belanja',     href: `${invBase}/rekap-belanja`, dot: 'bg-indigo-400' },
                        { label: 'Daftar Belanja',    href: `${invBase}/belanja`,       dot: 'bg-teal-400' },
                        { label: 'Inventaris Gudang', href: `${invBase}/gudang`,        dot: 'bg-amber-400' },
                      ];

                      return (
                        <div key="inventaris-dropdown" className="space-y-1">
                          <button
                            onClick={() => setIsInventarisOpen(!isInventarisOpen)}
                            className={`group flex items-center justify-between w-full px-3 py-2 text-[13px] rounded-xl transition-all duration-150 select-none cursor-pointer ${
                              isInvActive
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-900/40 ring-1 ring-white/15'
                                : 'text-slate-300/85 hover:text-white hover:bg-white/[0.08] font-medium'
                            }`}
                          >
                            <div className="flex items-center min-w-0">
                              <ClipboardList
                                className={`flex-shrink-0 mr-2.5 h-4 w-4 transition-colors ${
                                  isInvActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                                }`}
                              />
                              <span className="truncate">Inventaris</span>
                            </div>
                            <ChevronDown
                              className={`h-3.5 w-3.5 ml-1.5 flex-shrink-0 transition-transform duration-200 ${
                                isInventarisOpen ? 'rotate-180' : ''
                              } ${isInvActive ? 'text-white/80' : 'text-slate-400'}`}
                            />
                          </button>

                          {isInventarisOpen && (
                            <div className="ml-3 mt-1 space-y-1 border-l-2 border-blue-500/40 pl-2.5 py-0.5">
                              {subItems.map((sub) => {
                                const isSubActive =
                                  pathname === sub.href ||
                                  (sub.href.endsWith('/rekap-belanja') && pathname === invBase);

                                return (
                                  <Link
                                    key={sub.href}
                                    href={sub.href}
                                    onClick={onLinkClick}
                                    className={`group flex items-center px-2.5 py-1.5 text-xs rounded-lg transition-all duration-150 ${
                                      isSubActive
                                        ? 'bg-blue-600/30 text-blue-200 font-semibold border border-blue-400/30 shadow-xs'
                                        : 'text-slate-300/80 hover:text-white hover:bg-white/[0.06]'
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

                    const Icon = item.icon;
                    const finalHref = getHrefForRole(item.href, roleFromPath, item.dynamicHref);

                    const isActive =
                      pathname === finalHref ||
                      (finalHref !== '/dashboard' && finalHref !== '/petugas-input' &&
                       finalHref !== '/wakapro' && finalHref !== '/wakasek' &&
                       pathname?.startsWith(finalHref));

                    return (
                      <Link
                        key={item.name}
                        href={finalHref}
                        onClick={onLinkClick}
                        className={`group flex items-center justify-between px-3 py-2 text-[13px] rounded-xl transition-all duration-150 select-none ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-900/40 ring-1 ring-white/15'
                            : 'text-slate-300/85 hover:text-white hover:bg-white/[0.08] font-medium'
                        }`}
                      >
                        <div className="flex items-center min-w-0">
                          <Icon
                            className={`flex-shrink-0 mr-2.5 h-4 w-4 transition-colors ${
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>
                        {isActive && (
                          <ChevronRight className="h-3.5 w-3.5 text-white/70 ml-1.5 flex-shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer: Profile & Logout ── */}
      <div className="p-3 border-t border-white/10 flex-shrink-0 space-y-2 bg-slate-950/50 relative z-10">
        {/* Helper: Get profil URL based on current role */}
        {(() => {
          const getProfilUrl = (role: string): string => {
            if (role === 'petugas') return '/petugas-input/profil';
            if (role === 'wakapro') return '/wakapro/profil';
            if (role === 'wakasek') return '/wakasek/profil';
            return '/dashboard/profil';
          };
          const profilUrl = getProfilUrl(roleFromPath);

          return (
            <Link
              href={profilUrl}
              onClick={onLinkClick}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0 ring-1 ring-white/20">
                {user?.nama_lengkap ? user.nama_lengkap.charAt(0).toUpperCase() : (user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />)}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  {user?.nama_lengkap || user?.name || 'Administrator'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider">
                    {formatRole(user?.role || roleFromPath)}
                  </span>
                  {user?.ruangan && (
                    <span className="text-[9.5px] text-slate-400 truncate">
                      • {user.ruangan.nama_ruangan}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-3 w-3 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
            </Link>
          );
        })()}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-slate-400 rounded-xl hover:bg-rose-500/15 hover:text-rose-300 transition-all duration-200 group cursor-pointer border border-transparent hover:border-rose-500/20"
        >
          <LogOut className="flex-shrink-0 h-3.5 w-3.5 group-hover:text-rose-400 transition-colors" />
          <span>Keluar Sistem</span>
        </button>
      </div>
    </div>
  );
}
