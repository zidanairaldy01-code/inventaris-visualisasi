'use client';

import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import { Package, Map, Building2, FileText, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    aset: 0,
    ruangan: 0,
    gedung: 0,
    kategori: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [asetRes, ruanganRes, gedungRes, kategoriRes] = await Promise.all([
          axios.get('/api/asets'),
          axios.get('/api/ruangans'),
          axios.get('/api/gedungs'),
          axios.get('/api/kategoris')
        ]);
        
        setStats({
          aset: asetRes.data.length || 0,
          ruangan: ruanganRes.data.length || 0,
          gedung: gedungRes.data.length || 0,
          kategori: kategoriRes.data.length || 0,
        });
      } catch (err) {
        console.error("Gagal memuat statistik", err);
      }
    };
    
    fetchStats();
  }, []);

  const statCards = [
    { name: 'Total Aset Terdaftar', value: stats.aset, icon: Package, color: 'bg-blue-500', href: '/dashboard/aset' },
    { name: 'Total Ruangan', value: stats.ruangan, icon: Map, color: 'bg-emerald-500', href: '/dashboard/ruangan' },
    { name: 'Total Gedung', value: stats.gedung, icon: Building2, color: 'bg-purple-500', href: '/dashboard/gedung' },
    { name: 'Kategori Aset', value: stats.kategori, icon: FileText, color: 'bg-orange-500', href: '/dashboard/kategori' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ikhtisar Sistem</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => (
          <Link key={item.name} href={item.href} className="block group">
            <div className="bg-white overflow-hidden rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center transition-all duration-200 hover:shadow-lg hover:border-slate-300 hover:-translate-y-1 cursor-pointer">
              <div className={`p-4 rounded-xl ${item.color} bg-opacity-10 mr-5 group-hover:scale-110 transition-transform`}>
                <item.icon className={`h-8 w-8 ${item.color.replace('bg-', 'text-')}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 truncate">{item.name}</p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">{item.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <AlertCircle className="h-6 w-6 mr-2 text-blue-500" />
            Pusat Informasi
          </h3>
          <p className="mt-4 text-slate-600 text-sm leading-relaxed">
            Selamat datang di Sistem Manajemen Aset Digital <strong className="text-blue-600">SMK PGRI Telagasari</strong>. 
            Melalui panel ini, Anda dapat mengelola seluruh pendataan aset sekolah secara terpusat.
          </p>
          <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Langkah Penggunaan Awal:</p>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 shrink-0">1</div> 
                Lengkapi Data Master (Gedung, Ruangan, Kategori) terlebih dahulu.
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 shrink-0">2</div> 
                Lakukan registrasi penambahan Aset Fisik pada menu Data Aset.
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3 shrink-0">3</div> 
                Sistem akan secara otomatis mencatat setiap riwayat perpindahan barang.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
