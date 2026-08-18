'use client';

import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import { Bell, Search, UserCircle } from 'lucide-react';

export default function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/user')
      .then(res => setUser(res.data))
      .catch(() => {});
  }, []);

  return (
    <header className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
      <div className="flex-1 flex items-center">
        <div className="w-full max-w-md relative hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
            placeholder="Cari aset atau inventaris..."
          />
        </div>
      </div>
      
      <div className="ml-4 flex items-center space-x-4">
        <button className="text-slate-400 hover:text-slate-500 relative p-1 rounded-full hover:bg-slate-100 transition-colors">
          <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          <Bell className="h-5 w-5" />
        </button>
        
        <div className="flex items-center border-l border-slate-200 pl-4 space-x-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
          <UserCircle className="h-8 w-8 text-slate-300" />
          <div className="hidden sm:block text-sm text-left">
            <div className="font-semibold text-slate-700">{user?.nama_lengkap || 'Memuat...'}</div>
            <div className="text-xs text-slate-500 capitalize">{user?.role || 'Admin'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
