<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Peminjaman;
use App\Models\Aset;
use App\Models\SaranaPrasarana;
use App\Models\DistribusiAset;
use App\Models\History;
use Illuminate\Http\Request;

class PeminjamanController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Peminjaman::with(['aset.ruangan', 'aset.kategori', 'saranaPrasarana.folder'])
            ->orderBy('created_at', 'desc');

        // Jika wakapro, batasi hanya peminjaman dari aset atau sarana prasarana di ruangan workshop-nya
        if ($user && $user->role === 'wakapro') {
            if ($user->ruangan_id) {
                $query->where(function ($q) use ($user) {
                    $q->whereHas('aset', function ($qa) use ($user) {
                        $qa->where('id_ruangan', $user->ruangan_id);
                    })->orWhereHas('saranaPrasarana.distribusiAset', function ($qd) use ($user) {
                        $qd->where('ruangan_tujuan_id', $user->ruangan_id)
                           ->where('status', 'diterima');
                    });
                });
            } else {
                // Belum di-assign ke ruangan — kembalikan kosong
                return response()->json([]);
            }
        }

        $peminjamans = $query->get();

        return response()->json($peminjamans);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'id_aset'                 => 'nullable|exists:asets,id',
            'sarana_prasarana_id'     => 'nullable|exists:sarana_prasaranas,id',
            'nama_peminjam'           => 'required|string|max:255',
            'role_peminjam'           => 'required|string|max:100',
            'jumlah'                  => 'required|integer|min:1',
            'tanggal_pinjam'          => 'required|date',
            'tanggal_kembali_rencana' => 'nullable|date',
            'keperluan'               => 'nullable|string',
            'status'                  => 'nullable|in:Dipinjam,Dikembalikan,Terlambat',
        ]);

        if (empty($validated['id_aset']) && empty($validated['sarana_prasarana_id'])) {
            return response()->json([
                'message' => 'Barang yang dipinjam wajib dipilih.'
            ], 422);
        }

        // Jika wakapro, pastikan barang yang dipinjamkan berasal dari workshopnya sendiri
        $user = $request->user();
        if ($user && $user->role === 'wakapro' && $user->ruangan_id) {
            $valid = false;
            if (!empty($validated['id_aset'])) {
                $aset = Aset::find($validated['id_aset']);
                if ($aset && (int) $aset->id_ruangan === (int) $user->ruangan_id) {
                    $valid = true;
                }
            } elseif (!empty($validated['sarana_prasarana_id'])) {
                $exists = DistribusiAset::where('sarana_prasarana_id', $validated['sarana_prasarana_id'])
                    ->where('ruangan_tujuan_id', $user->ruangan_id)
                    ->where('status', 'diterima')
                    ->exists();
                if ($exists) {
                    $valid = true;
                }
            }

            if (!$valid) {
                return response()->json([
                    'message' => 'Anda hanya dapat meminjamkan barang yang berada di workshop Anda.'
                ], 403);
            }
        }

        $peminjaman = Peminjaman::create($validated);
        $peminjaman->load(['aset.ruangan', 'aset.kategori', 'saranaPrasarana.folder']);

        $namaBarang = $peminjaman->saranaPrasarana?->nama_barang 
            ?? $peminjaman->aset?->nama_aset 
            ?? 'Barang';

        // Create history - BARANG KELUAR
        History::create([
            'id_aset'    => $validated['id_aset'] ?? null,
            'id_user'    => $request->user()?->id,
            'aksi'       => 'PEMINJAMAN',
            'keterangan' => "{$namaBarang} dipinjam oleh {$validated['nama_peminjam']} ({$validated['role_peminjam']}) sejumlah {$validated['jumlah']} unit. Keperluan: " . ($validated['keperluan'] ?? '-'),
            'tanggal'    => now()
        ]);

        return response()->json($peminjaman, 201);
    }

    public function show($id)
    {
        $peminjaman = Peminjaman::with(['aset.ruangan', 'aset.kategori', 'saranaPrasarana.folder'])->findOrFail($id);
        return response()->json($peminjaman);
    }

    public function update(Request $request, $id)
    {
        $peminjaman = Peminjaman::findOrFail($id);

        $validated = $request->validate([
            'id_aset'                 => 'nullable|exists:asets,id',
            'sarana_prasarana_id'     => 'nullable|exists:sarana_prasaranas,id',
            'nama_peminjam'           => 'sometimes|required|string|max:255',
            'role_peminjam'           => 'sometimes|required|string|max:100',
            'jumlah'                  => 'sometimes|required|integer|min:1',
            'tanggal_pinjam'          => 'sometimes|required|date',
            'tanggal_kembali_rencana' => 'nullable|date',
            'tanggal_kembali_aktual'  => 'nullable|date',
            'keperluan'               => 'nullable|string',
            'status'                  => 'sometimes|required|in:Dipinjam,Dikembalikan,Terlambat',
        ]);

        // Check if status changed to "Dikembalikan" - BARANG MASUK
        $statusBerubah = isset($validated['status']) && 
                        $validated['status'] === 'Dikembalikan' && 
                        $peminjaman->status !== 'Dikembalikan';

        if (isset($validated['status']) && $validated['status'] === 'Dikembalikan' && !$peminjaman->tanggal_kembali_aktual) {
            $validated['tanggal_kembali_aktual'] = now()->toDateString();
        }

        $peminjaman->update($validated);
        $peminjaman->load(['aset.ruangan', 'aset.kategori', 'saranaPrasarana.folder']);

        // Create history when returned
        if ($statusBerubah) {
            $namaBarang = $peminjaman->saranaPrasarana?->nama_barang 
                ?? $peminjaman->aset?->nama_aset 
                ?? 'Barang';

            History::create([
                'id_aset'    => $peminjaman->id_aset,
                'id_user'    => $request->user()?->id,
                'aksi'       => 'PENGEMBALIAN',
                'keterangan' => "{$namaBarang} dikembalikan oleh {$peminjaman->nama_peminjam} sejumlah {$peminjaman->jumlah} unit pada " . ($validated['tanggal_kembali_aktual'] ?? now()->toDateString()),
                'tanggal'    => now()
            ]);
        }

        return response()->json($peminjaman);
    }

    public function destroy($id)
    {
        $peminjaman = Peminjaman::findOrFail($id);
        $peminjaman->delete();

        return response()->json(['message' => 'Data peminjaman berhasil dihapus']);
    }
}
