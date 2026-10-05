'use client';

import Link from 'next/link';
import { MapPin, Phone, Mail, Share2 } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img 
                src="/img/pgri-telagasari.jpg" 
                alt="Logo SMK PGRI Telagasari"
                className="w-10 h-10 rounded-lg object-cover ring-2 ring-white/20"
              />
              <span className="font-bold text-white text-lg">SMK PGRI<br/>Telagasari</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Sistem Informasi Manajemen Aset Sekolah untuk transparansi pengelolaan inventaris dan fasilitas.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-white mb-4">Tautan Cepat</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#beranda" className="hover:text-white transition-colors">Beranda</a>
              </li>
              <li>
                <a href="#berita" className="hover:text-white transition-colors">Berita</a>
              </li>
              <li>
                <a href="#workshop" className="hover:text-white transition-colors">Workshop</a>
              </li>
              <li>
                <a href="#tentang" className="hover:text-white transition-colors">Tentang Sekolah</a>
              </li>
              <li>
                <a href="#katalog" className="hover:text-white transition-colors">Katalog Aset</a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-bold text-white mb-4">Hubungi Kami</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                <span>Jl. Raya Telagasari No. 123<br />Telagasari, Karawang 41383</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0 text-blue-400" />
                <span>(0267) 123-4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0 text-blue-400" />
                <span>info@smkpgritelagasari.sch.id</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-bold text-white mb-4">Media Sosial</h3>
            <p className="text-sm text-gray-400 mb-4">
              Ikuti kami untuk update terbaru
            </p>
            <div className="flex gap-3">
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors"
                title="Facebook"
              >
                <Share2 className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 hover:bg-pink-600 rounded-lg flex items-center justify-center transition-colors"
                title="Instagram"
              >
                <Share2 className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 hover:bg-blue-400 rounded-lg flex items-center justify-center transition-colors"
                title="Twitter"
              >
                <Share2 className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors"
                title="YouTube"
              >
                <Share2 className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} SMK PGRI Telagasari. Hak cipta dilindungi.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/login" className="hover:text-white transition-colors">
              Portal Admin
            </Link>
            <a href="#" className="hover:text-white transition-colors">
              Kebijakan Privasi
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Syarat & Ketentuan
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
