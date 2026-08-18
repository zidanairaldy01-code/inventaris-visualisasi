'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, Map, Tag, Briefcase, FileText, Settings, LogOut, Package } from 'lucide-react';
import Cookies from 'js-cookie';
import axios from '@/lib/axios';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Data Aset', href: '/dashboard/aset', icon: Package },
  { name: 'Master Gedung', href: '/dashboard/gedung', icon: Building2 },
  { name: 'Master Ruangan', href: '/dashboard/ruangan', icon: Map },
  { name: 'Kategori', href: '/dashboard/kategori', icon: Tag },
  { name: 'Sumber Dana', href: '/dashboard/sumber-dana', icon: Briefcase },
  { name: 'Kondisi Aset', href: '/dashboard/kondisi', icon: Settings },
  { name: 'Riwayat/History', href: '/dashboard/history', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

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

  return (
    <div className="flex flex-col w-64 bg-slate-900 border-r border-slate-800 shadow-xl z-20">
      <div className="flex items-center justify-center h-16 bg-slate-950/50 border-b border-slate-800 px-6">
        <span className="text-xl font-bold text-white tracking-tight flex items-center">
          <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
            <Package className="w-5 h-5 text-white" />
          </span>
          SIM Aset
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-6">
        <div className="px-4 mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Navigasi Utama</p>
        </div>
        <nav className="px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600/15 text-blue-400' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }
                `}
              >
                <item.icon
                  className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 transition-colors ${
                    isActive ? 'text-blue-500' : 'text-slate-500 group-hover:text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
        >
          <LogOut className="flex-shrink-0 -ml-1 mr-3 h-5 w-5" />
          Keluar Sistem
        </button>
      </div>
    </div>
  );
}
