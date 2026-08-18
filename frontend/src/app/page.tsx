'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck, MapPin, Package, X, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from '@/lib/axios';

export default function LandingPage() {
  const [ruangans, setRuangans] = useState<any[]>([]);
  const [asets, setAsets] = useState<any[]>([]);
  
  // States for interaction
  const [selectedRuangan, setSelectedRuangan] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch ruangans on load
    axios.get('/api/ruangans')
      .then(res => setRuangans(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSelectRuangan = async (ruangan: any) => {
    setSelectedRuangan(ruangan);
    setIsModalOpen(true);
    setIsLoading(true);
    try {
      const res = await axios.get('/api/asets');
      // Filter aset berdasarkan id_ruangan
      const filteredAsets = res.data.filter((a: any) => a.id_ruangan === ruangan.id);
      setAsets(filteredAsets);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Dynamic Background Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[40rem] h-[40rem] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[10%] right-[20%] w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center mt-12 mb-12">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-widest mb-8 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <span className="flex h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
          Katalog Fasilitas Publik
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-500 tracking-tight mb-6 leading-[1.1]">
          Eksplorasi Inventaris <br className="hidden md:block" /> SMK PGRI Telagasari
        </h1>
        
        <p className="text-lg text-slate-400 max-w-2xl mb-12 leading-relaxed font-light">
          Pilih lokasi ruangan di bawah ini untuk meninjau secara transparan daftar aset fisik (seperti komputer lab, peralatan bengkel, dan inventaris kelas).
        </p>

        {/* Room Directory Grid */}
        <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-[2rem] shadow-2xl ring-1 ring-white/5 text-left mb-16">
          <h2 className="text-white text-xl font-bold mb-8 flex items-center">
            <MapPin className="w-5 h-5 mr-3 text-blue-400" />
            Direktori Ruangan Sekolah
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
            {ruangans.length > 0 ? ruangans.map((ruangan) => (
              <button 
                key={ruangan.id}
                onClick={() => handleSelectRuangan(ruangan)}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-blue-600/20 hover:border-blue-500/40 transition-all text-left group hover:scale-[1.02]"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-center mr-4 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-colors shadow-inner">
                    <MapPin className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold group-hover:text-blue-50 transition-colors text-sm md:text-base">{ruangan.nama_ruangan}</p>
                    <p className="text-xs text-slate-500 group-hover:text-blue-200 mt-1">Lantai {ruangan.lantai || 'Utama'}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </button>
            )) : (
              <p className="text-slate-400 col-span-full text-center py-8">Sedang menyinkronkan data ruangan dari database...</p>
            )}
          </div>
        </div>

        {/* Stealth Navigation replacing traditional Navbar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm font-medium border-t border-white/10 pt-10 w-full max-w-md">
          <Link href="/login" className="group flex items-center text-slate-400 hover:text-white transition-colors">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mr-3 group-hover:bg-blue-600/20 group-hover:border-blue-500/40 transition-colors shadow-inner">
              <ShieldCheck className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors" />
            </div>
            <span className="tracking-wide">Masuk Portal Administrator</span>
            <ArrowRight className="ml-2 w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-400" />
          </Link>
        </div>
      </div>

      {/* Glassmorphism Modal for Assets */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-slate-800 flex justify-between items-start bg-slate-900">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-3">
                  Detail Ruangan
                </div>
                <h3 className="text-2xl font-bold text-white flex items-center">
                  {selectedRuangan?.nama_ruangan}
                </h3>
                <p className="text-sm text-slate-400 mt-2">Daftar inventaris yang tercatat di ruangan ini</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors shadow-inner">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-950/50 custom-scrollbar">
              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
              ) : asets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {asets.map(aset => (
                    <div key={aset.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col hover:border-slate-600 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-mono font-medium text-blue-400 text-xs bg-blue-500/10 px-2 py-1 rounded">{aset.kode_aset || 'KODE-PENDING'}</span>
                        <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                          {aset.kondisi?.nama_kondisi || 'Baik'}
                        </span>
                      </div>
                      <p className="text-white font-bold text-lg mb-1 leading-tight">{aset.nama_aset}</p>
                      <p className="text-sm text-slate-500 mb-4 font-medium">{aset.merek || '-'} {aset.tipe ? `(${aset.tipe})` : ''}</p>
                      
                      <div className="mt-auto flex justify-between items-center pt-4 border-t border-slate-800/50">
                        <span className="text-xs text-slate-400 font-medium">Kat: {aset.kategori?.nama_kategori || 'Umum'}</span>
                        <div className="flex items-baseline space-x-1">
                          <span className="text-xl font-black text-white">{aset.jumlah}</span>
                          <span className="text-xs font-medium text-slate-500">{aset.satuan}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-800">
                    <Package className="w-10 h-10 text-slate-600" />
                  </div>
                  <p className="text-lg font-semibold text-slate-300">Ruangan Masih Kosong</p>
                  <p className="text-sm text-slate-500 mt-2">Belum ada aset fisik yang diregistrasikan ke dalam ruangan ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
}
