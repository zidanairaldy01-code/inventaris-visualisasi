'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  X, Package, Tag, Layers, DollarSign, TrendingUp, CalendarDays,
  ImageOff, ChevronLeft, ChevronRight, ZoomIn, Folder, FileText,
  BadgeCheck, AlertTriangle, AlertCircle, ShieldAlert, Ban, Loader2,
} from 'lucide-react';

interface FotoItem {
  id: number;
  url_foto: string;
  nama_file: string;
  keterangan: string | null;
  is_thumbnail: boolean;
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
  id_folder: number | null;
  user?: { id: number; name: string };
  fotos?: FotoItem[];
  created_at?: string;
  updated_at?: string;
}

interface Props {
  item: SaranaPrasaranaItem;
  folderName?: string;
  onClose: () => void;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const formatDate = (d: string | null | undefined) => {
  if (!d) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d));
  } catch { return d; }
};

const kondisiConfig = (k?: string | null) => {
  if (!k) return { color: 'bg-slate-100 text-slate-600', icon: BadgeCheck };
  const l = k.toLowerCase();
  if (l === 'baik') return { color: 'bg-emerald-100 text-emerald-700', icon: BadgeCheck };
  if (l === 'cukup baik') return { color: 'bg-sky-100 text-sky-700', icon: BadgeCheck };
  if (l === 'rusak ringan') return { color: 'bg-amber-100 text-amber-700', icon: AlertTriangle };
  if (l === 'rusak berat') return { color: 'bg-rose-100 text-rose-700', icon: AlertCircle };
  if (l === 'tidak layak pakai') return { color: 'bg-purple-100 text-purple-700', icon: Ban };
  if (l.includes('rusak')) return { color: 'bg-rose-100 text-rose-700', icon: ShieldAlert };
  return { color: 'bg-slate-100 text-slate-600', icon: BadgeCheck };
};

export default function SaranaPrasaranaDetailModal({ item, folderName, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fotos, setFotos] = useState<FotoItem[]>(item.fotos || []);
  const [loadingFotos, setLoadingFotos] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [fullPreview, setFullPreview] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted) {
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    }
  }, [mounted]);

  const fetchFotos = useCallback(async () => {
    if ((item.fotos?.length ?? 0) > 0) {
      setFotos(item.fotos!);
      return;
    }
    setLoadingFotos(true);
    try {
      const res = await axios.get(`/api/sarana-prasaranas/${item.id}`);
      const data = res.data?.data || res.data;
      setFotos(data?.fotos || []);
    } catch { }
    finally { setLoadingFotos(false); }
  }, [item.id, item.fotos]);

  useEffect(() => { fetchFotos(); }, [fetchFotos]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 350);
  };

  const prevPhoto = useCallback(() => setActivePhotoIdx(i => (i - 1 + fotos.length) % fotos.length), [fotos.length]);
  const nextPhoto = useCallback(() => setActivePhotoIdx(i => (i + 1) % fotos.length), [fotos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (fullPreview) { setFullPreview(null); return; } handleClose(); }
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const kd = kondisiConfig(item.kondisi);
  const KondisiIcon = kd.icon;
  const activePhoto = fotos[activePhotoIdx];
  const depreciasi = item.nilai_harga_pembelian > 0
    ? Math.round(((item.nilai_harga_pembelian - item.nilai_harga_sekarang) / item.nilai_harga_pembelian) * 100)
    : 0;

  if (!mounted) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 350ms ease' }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl w-full max-w-3xl mx-auto max-h-[92vh] flex flex-col"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 350ms cubic-bezier(0.4,0,0.2,1)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-3 pt-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-indigo-50 rounded-2xl shrink-0">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Detail Sarana &amp; Prasarana</p>
              <h2 className="text-base font-bold text-slate-900 leading-snug">{item.nama_barang}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {item.kode && <span className="text-xs font-mono text-slate-400">{item.kode}</span>}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${kd.color}`}>
                  <KondisiIcon className="h-3 w-3" />
                  {item.kondisi || 'Baik'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0 ml-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 px-5 pb-6">

            {/* LEFT: Foto */}
            <div className="lg:w-72 shrink-0">
              {loadingFotos ? (
                <div className="aspect-video lg:aspect-square rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                </div>
              ) : fotos.length === 0 ? (
                <div className="aspect-video lg:aspect-square rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <ImageOff className="h-10 w-10 text-slate-300" />
                  <p className="text-xs font-medium">Belum ada foto</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    className="relative aspect-video lg:aspect-square rounded-2xl overflow-hidden bg-slate-100 cursor-zoom-in group shadow-md"
                    onClick={() => setFullPreview(activePhoto.url_foto)}
                  >
                    <img
                      src={activePhoto.url_foto}
                      alt={activePhoto.keterangan || item.nama_barang}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ZoomIn className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                    {fotos.length > 1 && (
                      <>
                        <button onClick={e => { e.stopPropagation(); prevPhoto(); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-xl transition-colors">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); nextPhoto(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-xl transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {fotos.map((_, idx) => (
                            <button key={idx} onClick={e => { e.stopPropagation(); setActivePhotoIdx(idx); }} className={`h-1.5 rounded-full transition-all ${idx === activePhotoIdx ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`} />
                          ))}
                        </div>
                      </>
                    )}
                    {activePhoto.is_thumbnail && (
                      <div className="absolute top-2 left-2 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow">? Utama</div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      {activePhotoIdx + 1} / {fotos.length}
                    </div>
                  </div>
                  {fotos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {fotos.map((f, idx) => (
                        <button key={f.id} onClick={() => setActivePhotoIdx(idx)} className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${idx === activePhotoIdx ? 'border-indigo-500 shadow-md' : 'border-slate-200 hover:border-indigo-300'}`}>
                          <img src={f.url_foto} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Detail */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Luas / Jumlah</span>
                  </div>
                  <p className="text-base font-bold text-slate-900">
                    {item.luas_jumlah || (item.stok_akhir ? `${item.stok_akhir} ${item.satuan}` : '-')}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Tag className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Satuan</span>
                  </div>
                  <p className="text-base font-bold text-slate-900">{item.satuan || '-'}</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-3.5 border border-blue-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Harga Pembelian</span>
                  </div>
                  <p className="text-sm font-bold text-blue-700 truncate">{formatRupiah(item.nilai_harga_pembelian)}</p>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Harga Sekarang</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-700 truncate">{formatRupiah(item.nilai_harga_sekarang)}</p>
                </div>
              </div>

              {/* Stok */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Stok Awal', value: item.stok_awal, color: 'text-slate-700' },
                  { label: 'Stok Masuk', value: item.stok_masuk, color: 'text-emerald-600' },
                  { label: 'Stok Keluar', value: item.stok_keluar, color: 'text-rose-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className={`text-lg font-black mt-0.5 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Depresiasi */}
              {item.nilai_harga_pembelian > 0 && (
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Penyusutan Nilai</span>
                    <span className={`text-xs font-bold ${depreciasi > 50 ? 'text-rose-600' : depreciasi > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {depreciasi}% turun
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${depreciasi > 50 ? 'bg-rose-500' : depreciasi > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(depreciasi, 100)}%`, transition: 'width 0.7s ease' }}
                    />
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="space-y-2">
                {item.tanggal_pengambilan && (
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium">Tanggal Pengambilan:</span>
                    <span className="font-semibold">{formatDate(item.tanggal_pengambilan)}</span>
                  </div>
                )}
                {folderName && (
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 bg-indigo-50 rounded-xl px-3.5 py-2.5 border border-indigo-100">
                    <Folder className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span className="font-medium">Folder:</span>
                    <span className="font-semibold text-indigo-700">{folderName}</span>
                  </div>
                )}
                {item.keterangan && (
                  <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-amber-50 rounded-xl px-3.5 py-2.5 border border-amber-100">
                    <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium block mb-0.5">Keterangan:</span>
                      <span className="text-slate-700 leading-relaxed">{item.keterangan}</span>
                    </div>
                  </div>
                )}
                {item.user?.name && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
                    <span>Dicatat oleh:</span>
                    <span className="font-semibold text-slate-600">{item.user.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {fotos.length > 0 ? `${fotos.length} foto` : 'Belum ada foto'} &bull; Stok akhir: <strong className="text-slate-700">{item.stok_akhir} {item.satuan}</strong>
          </p>
          <button onClick={handleClose} className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
            Tutup
          </button>
        </div>
      </div>

      {/* Full Lightbox */}
      {fullPreview && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-black/90" onClick={() => setFullPreview(null)}>
          <img src={fullPreview} className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl" alt="Preview" />
          <button className="absolute top-4 right-4 p-2.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors" onClick={e => { e.stopPropagation(); setFullPreview(null); }}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
