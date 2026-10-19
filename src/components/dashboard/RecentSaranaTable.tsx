'use client';

import Link from 'next/link';
import { Package, ArrowRight, Clock } from 'lucide-react';

const formatRupiah = (n: number | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

interface RecentSaranaTableProps {
  recentSarana: any[];
  loading: boolean;
  viewAllHref: string;
  title?: string;
}

export default function RecentSaranaTable({
  recentSarana = [],
  loading,
  viewAllHref,
  title = 'Aset Sarana Prasarana Terbaru',
}: RecentSaranaTableProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
          <Package className="h-4 w-4 text-indigo-600" />
          {title}
        </h3>
        <Link
          href={viewAllHref}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
        >
          Lihat Semua
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Tabel */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : recentSarana.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
          <Package className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
          Belum ada data sarana prasarana yang tercatat.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Kode &amp; Nama Sarana</th>
                <th className="py-2.5 px-3">Merek / Spek</th>
                <th className="py-2.5 px-3 text-center">Jumlah</th>
                <th className="py-2.5 px-3 text-right">Nilai Pembelian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSarana.slice(0, 5).map((s: any) => {
                const harga = Number(
                  s.nilai_harga_pembelian ?? s.harga_pembelian ?? s.nilai_harga_sekarang ?? 0
                );
                const nama = s.nama_barang || s.nama_sarana || 'Sarana';
                const kode = s.kode || s.kode_sarana || '-';
                const spek = s.spesifikasi || s.merek || s.keterangan || '-';
                const jumlah = s.stok_akhir ?? s.stok_masuk ?? s.stok_awal ?? s.jumlah ?? 1;
                const satuan = s.satuan || 'Unit';

                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{nama}</p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {kode !== '-' ? kode : `ID #${s.id}`}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate" title={spek}>
                      {spek}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {jumlah} {satuan}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                      {harga > 0 ? formatRupiah(harga) : (
                        <span className="text-slate-400 font-medium">Rp 0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
