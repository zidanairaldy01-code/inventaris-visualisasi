'use client';

import { MapPin, Phone, Mail } from 'lucide-react';

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


          {/* Social Media */}
          <div>
            <h3 className="font-bold text-white mb-4">Media Sosial</h3>
            <p className="text-sm text-gray-400 mb-4">
              Ikuti kami untuk update terbaru
            </p>
            <div className="flex flex-wrap gap-3">
              {/* WhatsApp */}
              <a 
                href="https://wa.me/6281234567890" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-[#25D366] text-gray-300 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/25 border border-gray-700/60"
                title="WhatsApp SMK PGRI Telagasari"
                aria-label="WhatsApp"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.769.814 2.79.815 3.18 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.766-5.767-5.766zm3.385 8.163c-.14.394-.712.727-1.025.77-.313.044-.724.06-2.125-.515-1.791-.735-2.946-2.55-3.035-2.67-.09-.12-1.39-1.85-1.39-3.528 0-1.678.878-2.504 1.189-2.846.31-.342.678-.427.904-.427.226 0 .452.002.65.011.209.01.488-.079.764.584.283.678.96 2.344 1.045 2.515.085.17.142.37.028.598-.113.228-.17.37-.34.568-.17.199-.357.444-.51.597-.17.17-.347.355-.149.696.198.341.879 1.446 1.884 2.342 1.294 1.152 2.385 1.509 2.725 1.679.34.17.538.142.736-.086.198-.227.848-.992 1.074-1.332.227-.34.453-.284.764-.17.311.114 1.977.933 2.316 1.103.34.17.566.255.65.397.085.142.085.823-.056 1.217zM12.012 2c-5.518 0-9.995 4.477-9.995 9.995 0 1.763.459 3.483 1.332 5.001L2 22l5.167-1.32c1.47.802 3.13 1.226 4.845 1.226 5.517 0 9.995-4.478 9.995-9.996C22.007 6.477 17.53 2 12.012 2z" />
                </svg>
              </a>

              {/* Instagram */}
              <a 
                href="https://www.instagram.com/smk.pgritelagasari?utm_source=ig_web_button_share_sheet&rpxt=ZDNlZDc0MzIxNw==" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-linear-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-600 text-gray-300 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-pink-500/25 border border-gray-700/60"
                title="Instagram SMK PGRI Telagasari"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* Facebook */}
              <a 
                href="https://www.facebook.com/profile.php?id=100057499147753&locale=id_ID" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-[#1877F2] text-gray-300 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/25 border border-gray-700/60"
                title="Facebook SMK PGRI Telagasari"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              {/* YouTube */}
              <a 
                href="https://www.youtube.com/@smk.pgritelagasari" 
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 hover:bg-[#FF0000] text-gray-300 hover:text-white rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/25 border border-gray-700/60"
                title="YouTube SMK PGRI Telagasari"
                aria-label="YouTube"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
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
