'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, History, RotateCcw, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, User, Package, Calendar } from 'lucide-react';
import { PeminjamanItem, PengembalianItem } from '@/types/peminjaman';

interface RiwayatPengembalianModalProps {
  isOpen: boolean;
  onClose: () => void;
  peminjaman: PeminjamanItem | null;
  onOpenReturnModal?: () => void;
}

export default function RiwayatPengembalianModal({
  isOpen,
  onClose,
  peminjaman,
  onOpenReturnModal,
}: RiwayatPengembalianModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || !peminjaman) return null;

  const pengembalians: PengembalianItem[] = peminjaman.pengembalians || [];
  const totalKembali = peminjaman.total_dikembalikan ?? pengembalians.reduce((acc, p) => acc + Number(p.jumlah_kembali), 0);
  const sisaPinjam = peminjaman.sisa_pinjam ?? Math.max(0, peminjaman.jumlah - totalKembali);

  const namaBarang = peminjaman.sarana_prasarana?.nama_barang || peminjaman.aset?.nama_aset || 'Barang';
  const satuan = peminjaman.sarana_prasarana?.satuan || peminjaman.aset?.satuan || 'Unit';

  const getKondisiBadge = (kondisi: string) => {
    switch (kondisi) {
      case 'Baik':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
            Baik
          </span>
        );
      case 'Rusak Ringan':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="h-3 w-3 mr-1 text-amber-600" />
            Rusak Ringan
          </span>
        );
      case 'Rusak Berat':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="h-3 w-3 mr-1 text-rose-600" />
            Rusak Berat
          </span>
        );
      case 'Hilang':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <HelpCircle className="h-3 w-3 mr-1 text-red-600" />
            Hilang
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
            {kondisi}
          </span>
        );
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-linear-to-r from-blue-50 via-indigo-50 to-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Riwayat Pengembalian</h3>
              <p className="text-xs text-slate-500">Daftar pengembalian bertahap untuk transaksi ini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Ringkasan Status */}
        <div className="p-5 pb-3">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center">
                <User className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Peminjam:
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {peminjaman.nama_peminjam} ({peminjaman.role_peminjam})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center">
                <Package className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Barang:
              </span>
              <span className="text-xs font-semibold text-indigo-900">
                {namaBarang}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Total Pinjam</p>
                <p className="text-sm font-extrabold text-slate-800">{peminjaman.jumlah} <span className="text-[10px] font-normal">{satuan}</span></p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Sudah Kembali</p>
                <p className="text-sm font-extrabold text-emerald-600">{totalKembali} <span className="text-[10px] font-normal">{satuan}</span></p>
              </div>
              <div className={`p-2 rounded-lg border ${
                sisaPinjam === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <p className="text-[10px] uppercase font-bold">Sisa Belum Kembali</p>
                <p className="text-sm font-extrabold">{sisaPinjam} <span className="text-[10px] font-normal">{satuan}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* List / Table Riwayat */}
        <div className="p-5 pt-0 overflow-y-auto flex-1">
          <p className="text-xs font-semibold text-slate-700 mb-2.5">
            Log Pengembalian ({pengembalians.length} kali pengembalian):
          </p>

          {pengembalians.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <RotateCcw className="h-6 w-6 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">Belum ada pengembalian</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Seluruh {peminjaman.jumlah} {satuan} masih berada di peminjam.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pengembalians.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors shadow-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                        {pengembalians.length - idx}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {item.jumlah_kembali} {satuan}
                      </span>
                      <span className="text-slate-300">·</span>
                      {getKondisiBadge(item.kondisi)}
                    </div>
                    <span className="text-xs text-slate-500 font-mono flex items-center">
                      <Calendar className="h-3 w-3 mr-1 text-slate-400" />
                      {item.tanggal_kembali}
                    </span>
                  </div>

                  {item.keterangan ? (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="text-slate-400 font-medium">Catatan:</span> {item.keterangan}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">Tidak ada catatan tambahan</p>
                  )}

                  {item.user && (
                    <p className="text-[10px] text-slate-400 mt-2 text-right">
                      Diterima oleh: <strong className="text-slate-600 font-medium">{item.user.nama_lengkap}</strong>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
          <div>
            {sisaPinjam > 0 && onOpenReturnModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReturnModal();
                }}
                className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/80 rounded-xl transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Kembalikan Sisa ({sisaPinjam} {satuan})
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

