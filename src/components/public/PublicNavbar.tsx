'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useState } from 'react';

export default function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <img 
              src="/img/pgri-telagasari.jpg" 
              alt="Logo SMK PGRI Telagasari"
              className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-gray-100 flex-shrink-0"
            />
            <div>
              <p className="font-bold text-gray-800 text-sm leading-tight">SMK PGRI Telagasari</p>
              <p className="text-[10px] text-gray-400 leading-tight">Sistem Inventaris Aset</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#beranda" className="hover:text-blue-600 transition-colors">Beranda</a>
            <a href="#berita" className="hover:text-blue-600 transition-colors">Berita</a>
            <a href="#workshop" className="hover:text-blue-600 transition-colors">Workshop</a>
            <a href="#tentang" className="hover:text-blue-600 transition-colors">Tentang</a>
            <a href="#katalog" className="hover:text-blue-600 transition-colors">Katalog Aset</a>
          </nav>

          {/* Login Button */}
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Login</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col gap-3 text-sm font-medium text-gray-600">
              <a href="#beranda" className="hover:text-blue-600 transition-colors py-2">Beranda</a>
              <a href="#berita" className="hover:text-blue-600 transition-colors py-2">Berita</a>
              <a href="#workshop" className="hover:text-blue-600 transition-colors py-2">Workshop</a>
              <a href="#tentang" className="hover:text-blue-600 transition-colors py-2">Tentang</a>
              <a href="#katalog" className="hover:text-blue-600 transition-colors py-2">Katalog Aset</a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
