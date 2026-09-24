'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import axios from '@/lib/axios';
import {
  X, Upload, Trash2, Star, ImageOff, Loader2, CheckCircle2,
  AlertCircle, Database, Search, RefreshCw, Images
} from 'lucide-react';

interface FotoItem {
  id: number;
  url_foto: string;
  nama_file: string;
  keterangan: string | null;
  is_thumbnail: boolean;
  nama_barang_ref?: string;
  id_sarana_prasarana?: number;
  sarana_prasarana?: { id: number; nama_barang: string };
}

interface Props {
  item: {
    id: number;
    nama_barang: string;
    kode?: string | null;
    fotos?: FotoItem[];
  };
  onClose: () => void;
  onUpdate: () => void;
}

type TabType = 'gallery' | 'shared';

export default function SaranaPrasaranaFotoModal({ item, onClose, onUpdate }: Props) {
  const [fotos, setFotos] = useState<FotoItem[]>(item.fotos || []);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('gallery');

  // Shared photo state
  const [sharedPhotos, setSharedPhotos] = useState<FotoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState(item.nama_barang);
  const [loadingShared, setLoadingShared] = useState(false);
  const [usingShared, setUsingShared] = useState<number | null>(null);
  const [sharedMessage, setSharedMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const refreshFotos = useCallback(async () => {
    try {
      const res = await axios.get(`/api/sarana-prasaranas/${item.id}`);
      const data = res.data?.data || res.data;
      setFotos(data?.fotos || []);
    } catch {
      // silent
    }
  }, [item.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage(null);
    let successCount = 0;
    const existingCount = fotos.length;

    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('foto', file);
      fd.append('is_thumbnail', existingCount === 0 && successCount === 0 ? '1' : '0');
      try {
        await axios.post(`/api/sarana-prasaranas/${item.id}/fotos`, fd);
        successCount++;
      } catch (err) {
        console.error(err);
      }
    }

    await refreshFotos();
    onUpdate();
    setUploading(false);
    setMessage({ type: 'success', text: `${successCount} foto berhasil diunggah.` });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (fotoId: number) => {
    setDeleting(fotoId);
    try {
      await axios.delete(`/api/foto-sarana-prasarana/${fotoId}`);
      await refreshFotos();
      onUpdate();
      setMessage({ type: 'success', text: 'Foto berhasil dihapus.' });
    } catch {
      setMessage({ type: 'error', text: 'Gagal menghapus foto.' });
    } finally {
      setDeleting(null);
    }
  };

  const searchSharedPhotos = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) return;
    setLoadingShared(true);
    setSharedMessage('');
    try {
      const res = await axios.get('/api/foto-sarana-prasarana/search', {
        params: { nama_barang: query, exclude_id: item.id },
      });
      const data: FotoItem[] = res.data?.data || [];
      setSharedPhotos(data);
      if (data.length === 0) {
        setSharedMessage(`Tidak ada foto lain ditemukan untuk "${query}".`);
      }
    } catch {
      setSharedPhotos([]);
      setSharedMessage('Gagal mencari foto.');
    } finally {
      setLoadingShared(false);
    }
  }, [item.id]);

  // Auto-search when switching to shared tab
  useEffect(() => {
    if (activeTab === 'shared') {
      searchSharedPhotos(searchQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleUseSharedPhoto = async (foto: FotoItem) => {
    setUsingShared(foto.id);
    setMessage(null);
    try {
      await axios.post(`/api/sarana-prasaranas/${item.id}/fotos/use-shared`, { foto_id: foto.id });
      await refreshFotos();
      onUpdate();
      setActiveTab('gallery');
      setMessage({ type: 'success', text: `Foto dari "${foto.sarana_prasarana?.nama_barang || foto.nama_barang_ref || 'barang lain'}" berhasil digunakan.` });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ type: 'error', text: e?.response?.data?.message || 'Gagal menggunakan foto.' });
    } finally {
      setUsingShared(null);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Images className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Foto Barang</p>
              <h3 className="text-base font-bold text-slate-800 leading-tight">{item.nama_barang}</h3>
              {item.kode && <p className="text-xs font-mono text-slate-400 mt-0.5">{item.kode}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-5 pt-3 flex-shrink-0 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'gallery'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Images className="h-3.5 w-3.5" />
            Galeri ({fotos.length})
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'shared'
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Gunakan Foto dari Database
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {message && (
            <div className={`p-3 rounded-xl flex items-center text-xs font-medium border gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {message.type === 'success'
                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                : <AlertCircle className="h-4 w-4 flex-shrink-0" />
              }
              {message.text}
            </div>
          )}

          {/* ── TAB: GALLERY ── */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              {/* Upload Zone */}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
                    <p className="text-sm text-blue-600 font-medium">Sedang mengunggah foto...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-sm">Klik untuk upload foto baru</p>
                      <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP – maks. 3MB. Bisa pilih banyak sekaligus.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Foto Grid */}
              {fotos.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                    <ImageOff className="h-7 w-7 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-400 text-sm">Belum ada foto</p>
                  <p className="text-xs text-slate-300 mt-1">Upload foto di atas, atau gunakan foto dari barang serupa via tab &ldquo;Gunakan Foto dari Database&rdquo;.</p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{fotos.length} Foto Tersimpan</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {fotos.map(foto => (
                      <div
                        key={foto.id}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 hover:border-blue-300 transition-colors bg-slate-50 aspect-square"
                      >
                        <img
                          src={foto.url_foto}
                          alt={foto.keterangan || item.nama_barang}
                          className="w-full h-full object-cover cursor-zoom-in"
                          onClick={() => setPreview(foto.url_foto)}
                        />
                        {foto.is_thumbnail && (
                          <div className="absolute top-1.5 left-1.5 bg-amber-400 text-white rounded-md px-1.5 py-0.5 text-[9px] font-bold flex items-center shadow gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-current" /> Utama
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                          <button
                            onClick={() => handleDelete(foto.id)}
                            disabled={deleting === foto.id}
                            className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors disabled:opacity-50"
                            title="Hapus foto"
                          >
                            {deleting === foto.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: SHARED PHOTOS ── */}
          {activeTab === 'shared' && (
            <div className="space-y-4">
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                <p className="text-xs text-violet-700 font-medium">
                  Pilih foto dari barang sejenis yang sudah ada di database. Foto tidak akan disalin — hanya referensinya yang digunakan bersama oleh barang ini.
                </p>
              </div>

              {/* Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchSharedPhotos(searchQuery)}
                    placeholder="Cari nama barang..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  />
                </div>
                <button
                  onClick={() => searchSharedPhotos(searchQuery)}
                  disabled={loadingShared}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-60"
                >
                  {loadingShared ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Cari
                </button>
              </div>

              {/* Results */}
              {loadingShared ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-7 w-7 text-violet-500 animate-spin" />
                </div>
              ) : sharedPhotos.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                    <Database className="h-7 w-7 text-slate-300" />
                  </div>
                  <p className="font-semibold text-slate-400 text-sm">
                    {sharedMessage || 'Ketik nama barang lalu klik Cari'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    {sharedPhotos.length} Foto Ditemukan — Klik foto untuk menggunakannya
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {sharedPhotos.map(foto => (
                      <div
                        key={foto.id}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 hover:border-violet-400 hover:shadow-md transition-all bg-slate-50 aspect-square cursor-pointer"
                        onClick={() => !usingShared && handleUseSharedPhoto(foto)}
                      >
                        <img
                          src={foto.url_foto}
                          alt={foto.nama_barang_ref || foto.nama_file}
                          className="w-full h-full object-cover"
                        />
                        {/* Nama barang asal */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-[10px] text-white font-semibold leading-tight truncate">
                            {foto.sarana_prasarana?.nama_barang || foto.nama_barang_ref}
                          </p>
                        </div>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-violet-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                          {usingShared === foto.id ? (
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-7 w-7 text-white" />
                              <span className="text-[10px] text-white font-bold">Gunakan Foto Ini</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {fotos.length > 0
              ? `${fotos.length} foto tersimpan untuk barang ini`
              : 'Belum ada foto untuk barang ini'
            }
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Full preview */}
      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <img src={preview} className="max-w-4xl max-h-[90vh] rounded-2xl object-contain shadow-2xl" alt="Preview" />
          <button
            className="absolute top-5 right-5 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            onClick={e => { e.stopPropagation(); setPreview(null); }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
