'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios, { getStorageUrl } from '@/lib/axios';
import {
  X, Package, Tag, Layers, DollarSign, Calendar, FileText,
  ChevronLeft, ChevronRight, ImageOff, Loader2, Camera,
  Edit2, Trash2, Star, TrendingUp, Info, Maximize2, AlertCircle
} from 'lucide-react';

interface FotoItem {
  id: number;
  url_foto: string;
  nama_file?: string;
  keterangan?: string | null;
  is_thumbnail?: boolean;
}

interface SaranaPrasaranaItem {
  id: number;
  tanggal_pengambilan: string | null;
  kode: string | null;
  nama_barang: string;
  satuan: string;
  luas_jumlah?: string | null;
  stok_awal: number;
  stok_masuk: number;
  stok_keluar: number;
  stok_akhir: number;
  nilai_harga_pembelian: number;
  nilai_harga_sekarang: number;
  kondisi?: string | null;
  keterangan: string | null;
  id_user: number | null;
  id_folder: number | null;
  user?: { id: number; name: string };
  fotos?: FotoItem[];
  foto_kerusakan?: string | null;
  foto_kerusakan_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Props {
  item: SaranaPrasaranaItem;
  onClose: () => void;
  onEdit: (item: SaranaPrasaranaItem) => void;
  onDelete: (item: SaranaPrasaranaItem) => void;
  onOpenFoto: (item: SaranaPrasaranaItem) => void;
  isSuperAdmin?: boolean;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string | null | undefined) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const kondisiColor = (k?: string | null) => {
  const v = (k || 'baik').toLowerCase();
  if (v.includes('baik')) return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (v.includes('rusak berat')) return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
  if (v.includes('rusak')) return { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' };
  return { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' };
};

export default function SaranaPrasaranaPreviewCard({
  item, onClose, onEdit, onDelete, onOpenFoto, isSuperAdmin
}: Props) {
  const [fotos, setFotos] = useState<FotoItem[]>(() => {
    if (item.fotos && item.fotos.length > 0) return item.fotos;
    if (item.foto_kerusakan_url) {
      return [{
        id: -1,
        url_foto: item.foto_kerusakan_url,
        nama_file: 'Foto Kerusakan',
        keterangan: null,
        is_thumbnail: true,
      }];
    }
    return [];
  });
  const [loadingFoto, setLoadingFoto] = useState(() => !(item.fotos && item.fotos.length > 0));
  const [activeIdx, setActiveIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());
  const [fullscreenFoto, setFullscreenFoto] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setVisible(true), 10);
  }, []);

  // Sinkronisasi state saat item berubah
  useEffect(() => {
    setActiveIdx(0);
    setBrokenUrls(new Set());
    if (item.fotos && item.fotos.length > 0) {
      setFotos(item.fotos);
      setLoadingFoto(false);
      const thumbIdx = item.fotos.findIndex((f) => f.is_thumbnail);
      setActiveIdx(thumbIdx >= 0 ? thumbIdx : 0);
    } else if (item.foto_kerusakan_url) {
      setFotos([{
        id: -1,
        url_foto: item.foto_kerusakan_url,
        nama_file: 'Foto Kerusakan',
        keterangan: null,
        is_thumbnail: true,
      }]);
      setLoadingFoto(false);
    } else {
      setFotos([]);
      setLoadingFoto(true);
    }
  }, [item.id, item.fotos, item.foto_kerusakan_url]);

  useEffect(() => {
    let isMounted = true;
    const fetchFotos = async () => {
      try {
        const res = await axios.get(`/api/sarana-prasaranas/${item.id}`);
        const data = res.data?.data || res.data;
        let fotoList: FotoItem[] = data?.fotos || [];

        // Fallback 1: Jika tidak ada foto gallery, gunakan foto_kerusakan_url jika ada
        if (fotoList.length === 0 && (data?.foto_kerusakan_url || item.foto_kerusakan_url)) {
          fotoList = [{
            id: -1,
            url_foto: (data?.foto_kerusakan_url || item.foto_kerusakan_url) as string,
            nama_file: 'Foto Barang',
            keterangan: null,
            is_thumbnail: true,
          }];
        }

        // Fallback 2: Jika masih kosong, cari foto shared berdasarkan nama barang yang sama
        if (fotoList.length === 0 && item.nama_barang) {
          try {
            const sharedRes = await axios.get(`/api/foto-sarana-prasarana/search?nama_barang=${encodeURIComponent(item.nama_barang)}`);
            const sharedData = sharedRes.data?.data || sharedRes.data;
            if (Array.isArray(sharedData) && sharedData.length > 0) {
              fotoList = sharedData;
            }
          } catch {
            // silent ignore
          }
        }

        if (isMounted) {
          setFotos(fotoList);
          const thumbIdx = fotoList.findIndex((f) => f.is_thumbnail);
          setActiveIdx(thumbIdx >= 0 ? thumbIdx : 0);
        }
      } catch {
        // Tetap pertahankan foto awal jika request gagal
      } finally {
        if (isMounted) {
          setLoadingFoto(false);
        }
      }
    };
    fetchFotos();

    return () => {
      isMounted = false;
    };
  }, [item.id, item.nama_barang]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  if (!mounted) return null;

  const kCls = kondisiColor(item.kondisi);
  const selisihHarga = (item.nilai_harga_sekarang || 0) - (item.nilai_harga_pembelian || 0);
  const activeFoto = fotos[activeIdx];

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 350ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={handleClose}
      />

      {/* Bottom-center slide-up card */}
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col rounded-t-3xl"
        style={{
          transform: visible
            ? 'translate(-50%, 0)'
            : 'translate(-50%, 100%)',
          transition: visible
            ? 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
          maxHeight: '82vh',
        }}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-3 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 bg-indigo-50 rounded-lg">
                  <Package className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Detail Barang</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 leading-tight line-clamp-2">{item.nama_barang}</h2>
              {item.kode && (
                <p className="text-xs font-mono text-slate-400 mt-1">{item.kode}</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${kCls.bg} ${kCls.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${kCls.dot}`} />
              {item.kondisi || 'Baik'}
            </span>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{item.satuan}</span>
          </div>
        </div>

        <div className="border-t border-slate-100 mx-5" />

        {/* Foto Carousel */}
        <div className="flex-shrink-0 px-5 pt-4 relative z-10">
          <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
            {loadingFoto ? (
              <div className="h-48 flex items-center justify-center bg-slate-50">
                <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
              </div>
            ) : fotos.length === 0 ? (
              <div
                className="h-48 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-indigo-50 transition-colors group"
                onClick={() => onOpenFoto(item)}
              >
                <div className="w-12 h-12 bg-slate-200 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center mb-2 transition-colors">
                  <ImageOff className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <p className="text-xs text-slate-400 group-hover:text-indigo-500 transition-colors font-medium">Belum ada foto — klik untuk upload</p>
              </div>
            ) : (() => {
              const currentFotoUrl = activeFoto?.url_foto ? getStorageUrl(activeFoto.url_foto) : '';
              const isCurrentBroken = currentFotoUrl ? brokenUrls.has(currentFotoUrl) : true;

              return (
                <div className="relative h-48 bg-slate-900 group">
                  {!isCurrentBroken && currentFotoUrl ? (
                    <img
                      src={currentFotoUrl}
                      alt={activeFoto?.keterangan || item.nama_barang}
                      className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                      onClick={() => setFullscreenFoto(currentFotoUrl)}
                      onError={() => {
                        setBrokenUrls(prev => new Set(prev).add(currentFotoUrl));
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-slate-800 text-slate-300">
                      <ImageOff className="h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-xs font-medium text-slate-300 mb-1">
                        {isCurrentBroken ? 'Foto tidak dapat dimuat' : 'Foto belum tersedia'}
                      </p>
                      <button
                        onClick={() => onOpenFoto(item)}
                        className="mt-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-colors"
                      >
                        Unggah / Ganti Foto
                      </button>
                    </div>
                  )}

                  {activeFoto?.is_thumbnail && !isCurrentBroken && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400 text-white px-2 py-0.5 rounded-md text-[9px] font-bold shadow">
                      <Star className="h-2.5 w-2.5 fill-current" /> Utama
                    </div>
                  )}

                  {!isCurrentBroken && currentFotoUrl && (
                    <button
                      onClick={() => setFullscreenFoto(currentFotoUrl)}
                      className="absolute bottom-2 right-2 p-1.5 bg-black/50 hover:bg-black/75 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Perbesar Foto"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {fotos.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveIdx(i => (i - 1 + fotos.length) % fotos.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/70 rounded-full text-white transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setActiveIdx(i => (i + 1) % fotos.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/70 rounded-full text-white transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                        {fotos.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveIdx(i)}
                            className={`h-1.5 rounded-full transition-all ${i === activeIdx ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeIdx + 1}/{fotos.length}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Thumbnail strip */}
          {fotos.length > 1 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {fotos.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setActiveIdx(i)}
                  className={`flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                    i === activeIdx ? 'border-indigo-500 scale-105 shadow-sm' : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={getStorageUrl(f.url_foto)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Info */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {/* Harga Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3 w-3 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Harga Beli</p>
              </div>
              <p className="text-sm font-bold text-slate-700 truncate">{formatRupiah(item.nilai_harga_pembelian || 0)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Harga Kini</p>
              </div>
              <p className="text-sm font-bold text-emerald-700 truncate">{formatRupiah(item.nilai_harga_sekarang || 0)}</p>
            </div>
          </div>

          {selisihHarga !== 0 && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
              selisihHarga > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <TrendingUp className={`h-3.5 w-3.5 ${selisihHarga < 0 ? 'rotate-180' : ''}`} />
              {selisihHarga > 0 ? '+' : ''}{formatRupiah(selisihHarga)} dari harga pembelian
            </div>
          )}

          {/* Detail rows */}
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Layers className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jumlah / Luas</p>
                <p className="text-sm font-semibold text-slate-700">
                  {item.luas_jumlah || `${item.stok_akhir || 0} ${item.satuan}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Tag className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Stok Awal / Masuk / Keluar</p>
                <p className="text-sm font-semibold text-slate-700">
                  {item.stok_awal} / {item.stok_masuk} / {item.stok_keluar}
                </p>
              </div>
            </div>

            {item.tanggal_pengambilan && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tanggal Pengambilan</p>
                  <p className="text-sm font-semibold text-slate-700">{formatDate(item.tanggal_pengambilan)}</p>
                </div>
              </div>
            )}

            {item.keterangan && (
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Keterangan</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.keterangan}</p>
                </div>
              </div>
            )}

            {item.updated_at && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Info className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Terakhir diperbarui</p>
                  <p className="text-xs text-slate-500">{formatDate(item.updated_at)}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { handleClose(); setTimeout(() => onOpenFoto(item), 300); }}
              className="flex flex-col items-center gap-1.5 py-2.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all group"
            >
              <Camera className="h-4 w-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
              <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-600 transition-colors">Foto</span>
            </button>
            <button
              onClick={() => { handleClose(); setTimeout(() => onEdit(item), 300); }}
              className="flex flex-col items-center gap-1.5 py-2.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl transition-all group"
            >
              <Edit2 className="h-4 w-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
              <span className="text-[10px] font-bold text-slate-500 group-hover:text-amber-600 transition-colors">Edit</span>
            </button>
            {isSuperAdmin ? (
              <button
                onClick={() => { handleClose(); setTimeout(() => onDelete(item), 300); }}
                className="flex flex-col items-center gap-1.5 py-2.5 bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 rounded-xl transition-all group"
              >
                <Trash2 className="h-4 w-4 text-slate-500 group-hover:text-rose-600 transition-colors" />
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-rose-600 transition-colors">Hapus</span>
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="flex flex-col items-center gap-1.5 py-2.5 bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-100 rounded-xl transition-all group"
              >
                <X className="h-4 w-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-700 transition-colors">Tutup</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Zoom Lightbox */}
      {fullscreenFoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullscreenFoto(null)}
        >
          <button
            onClick={() => setFullscreenFoto(null)}
            className="absolute top-5 right-5 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
            title="Tutup"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={fullscreenFoto}
            alt={item.nama_barang}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
