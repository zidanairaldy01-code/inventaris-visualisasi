'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, Map, Tag, Briefcase, FileText,
  Settings, LogOut, Package, ChevronRight, Wrench, Handshake,
  BarChart3, ChevronDown, ClipboardList, X,
} from 'lucide-react';
import Cookies from 'js-cookie';
import axios from '@/lib/axios';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Dashboard',          href: '/dashboard',                  icon: LayoutDashboard, group: 'main' },
  { name: 'Sarana & Prasarana', href: '/dashboard/sarana-prasarana', icon: Package,         group: 'main' },
  { name: 'Inventaris',         href: '/dashboard/inventaris',       icon: ClipboardList,   group: 'main' },
  { name: 'Peminjaman Aset',    href: '/dashboard/peminjaman',       icon: Handshake,       group: 'main' },
  { name: 'Servis & Perbaikan', href: '/dashboard/servis',           icon: Wrench,          group: 'main' },
  { name: 'Master Gedung',      href: '/dashboard/gedung',           icon: Building2,       group: 'master' },
  { name: 'Ruangan Workshop',   href: '/dashboard/ruangan',          icon: Map,             group: 'master' },
  { name: 'Kategori',           href: '/dashboard/kategori',         icon: Tag,             group: 'master' },
  { name: 'Sumber Dana',        href: '/dashboard/sumber-dana',      icon: Briefcase,       group: 'master' },
  { name: 'Kondisi Aset',       href: '/dashboard/kondisi',          icon: Settings,        group: 'master' },
  { name: 'Riwayat/History',    href: '/dashboard/history',          icon: FileText,        group: 'laporan' },
  { name: 'Laporan',            href: '/dashboard/laporan',          icon: BarChart3,       group: 'laporan' },
];

const groups = [
  { key: 'main',    label: 'Menu Utama' },
  { key: 'master',  label: 'Data Master' },
  { key: 'laporan', label: 'Laporan' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isInventarisOpen, setIsInventarisOpen] = useState(false);

  useEffect(() => {
    if (pathname?.includes('/inventaris')) {
      setIsInventarisOpen(true);
    }
  }, [pathname]);

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
      <div className="hidden lg:flex flex-col w-64 sidebar-gradient shadow-2xl z-20 relative overflow-hidden">
        <SidebarContent
          pathname={pathname}
          isInventarisOpen={isInventarisOpen}
          setIsInventarisOpen={setIsInventarisOpen}
          handleLogout={handleLogout}
          onLinkClick={() => {}}
        />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 sidebar-gradient shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent
          pathname={pathname}
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
  isInventarisOpen,
  setIsInventarisOpen,
  handleLogout,
  onLinkClick,
}: {
  pathname: string | null;
  isInventarisOpen: boolean;
  setIsInventarisOpen: (open: boolean) => void;
  handleLogout: () => void;
  onLinkClick: () => void;
}) {
  return (
    <>
      {/* Decorative glows */}
      <div className="absolute top-20 left-4 w-24 h-24 bg-blue-600 rounded-full opacity-10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-40 right-4 w-20 h-20 bg-purple-600 rounded-full opacity-10 blur-2xl pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center h-16 px-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src="http://localhost:8000/storage/img/pgri-telagasari.jpg"
              alt="Logo SMK PGRI Telagasari"
              className="w-9 h-9 rounded-xl object-cover shadow-lg ring-2 ring-white/10"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">SIM Aset</span>
            <p className="text-[10px] text-slate-400 -mt-0.5">SMK PGRI Telagasari</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {groups.map((group) => {
          const items = navigation.filter((n) => n.group === group.key);
          return (
            <div key={group.key}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-2">
                {group.label}
              </p>
              <nav className="space-y-0.5">
                {items.map((item) => {
                  if (item.name === 'Inventaris') {
                    const isInvActive = pathname?.includes('/dashboard/inventaris');
                    return (
                      <div key="inventaris-dropdown" className="space-y-0.5">
                        <button
                          onClick={() => setIsInventarisOpen(!isInventarisOpen)}
                          className={`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative ${
                            isInvActive
                              ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/20 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                          }`}
                        >
                          {isInvActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full" />
                          )}
                          <ClipboardList className={`flex-shrink-0 mr-3 h-4 w-4 transition-all duration-200 ${isInvActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                          <span className="truncate flex-1 text-left">Inventaris</span>
                          <ChevronDown className={`h-3.5 w-3.5 ml-1 flex-shrink-0 transition-transform duration-200 ${isInventarisOpen ? 'rotate-180' : ''} ${isInvActive ? 'text-blue-400' : 'text-slate-500'}`} />
                        </button>

                        {isInventarisOpen && (
                          <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700/50 pl-2">
                            {[
                              { label: 'Rekap Belanja', href: '/dashboard/inventaris/rekap-belanja', dot: 'bg-indigo-400' },
                              { label: 'Daftar Belanja', href: '/dashboard/inventaris/belanja',      dot: 'bg-teal-400'   },
                              { label: 'Gudang',         href: '/dashboard/inventaris/gudang',       dot: 'bg-emerald-400'},
                            ].map((sub) => (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={onLinkClick}
                                className={`group flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                                  pathname === sub.href || (sub.href === '/dashboard/inventaris/rekap-belanja' && pathname === '/dashboard/inventaris')
                                    ? 'bg-blue-600/20 text-blue-300 font-semibold'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                              >
                                <span className="truncate flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${sub.dot} inline-block`} />
                                  {sub.label}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onLinkClick}
                      className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/20 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full" />
                      )}
                      <item.icon className={`flex-shrink-0 mr-3 h-4 w-4 transition-all duration-200 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className="truncate flex-1">{item.name}</span>
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-400 ml-1 flex-shrink-0" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-white/5 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-slate-400 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
        >
          <LogOut className="flex-shrink-0 mr-3 h-4 w-4 group-hover:text-red-400 transition-colors" />
          Keluar Sistem
        </button>
      </div>
    </>
  );
}
