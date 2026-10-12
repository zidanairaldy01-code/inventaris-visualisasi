'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Package, Building2, Users, DollarSign } from 'lucide-react';

interface Stats {
  total_item: number;
  total_unit: number;
  total_nilai: number;
  total_ruangan?: number;
}

interface HeroSectionProps {
  stats: Stats | null;
}

export default function HeroSection({ stats }: HeroSectionProps) {
  const formatRupiahShort = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} M`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Jt`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)} Rb`;
    return n.toLocaleString('id-ID');
  };

  const formatRupiahFull = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <section id="beranda" className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <BookOpen className="w-4 h-4" />
            Portal Informasi Publik
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Sistem Inventaris Aset
            <br />
            <span className="text-blue-200">SMK PGRI Telagasari</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto mb-8">
            Transparansi pengelolaan aset dan fasilitas sekolah. Informasi workshop, kelas, dan inventaris yang dapat diakses secara real-time.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#katalog"
              className="w-full sm:w-auto bg-white text-blue-700 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
            >
              Lihat Katalog Aset
            </a>
            <a
              href="#tentang"
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/20 transition-all"
            >
              Tentang Sekolah
            </a>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 text-center transition-all hover:bg-white/15">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold mb-1">{(stats.total_item || 0).toLocaleString('id-ID')}</p>
              <p className="text-sm text-blue-200">Jenis Aset</p>
              <p className="text-[11px] text-blue-200/70 mt-1 font-medium">Sarana Prasarana</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 text-center transition-all hover:bg-white/15">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold mb-1">{(stats.total_unit || 0).toLocaleString('id-ID')}</p>
              <p className="text-sm text-blue-200">Total Unit</p>
              <p className="text-[11px] text-blue-200/70 mt-1 font-medium">Barang Fisik</p>
            </div>

            <div
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 text-center transition-all hover:bg-white/15 cursor-default group"
              title={formatRupiahFull(stats.total_nilai)}
            >
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold mb-1">Rp {formatRupiahShort(stats.total_nilai || 0)}</p>
              <p className="text-sm text-blue-200">Nilai Aset</p>
              <p className="text-[11px] text-blue-200/90 mt-1 font-medium tracking-tight truncate" title={formatRupiahFull(stats.total_nilai)}>
                {formatRupiahFull(stats.total_nilai)}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-5 text-center transition-all hover:bg-white/15">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold mb-1">{stats.total_ruangan || 0}</p>
              <p className="text-sm text-blue-200">Ruangan</p>
              <p className="text-[11px] text-blue-200/70 mt-1 font-medium">Fasilitas Sekolah</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
