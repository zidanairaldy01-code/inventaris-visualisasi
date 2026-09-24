<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Servis;
use App\Models\History;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ServisController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Servis::with(['aset.ruangan', 'aset.kategori', 'saranaPrasarana']);

        // Jika user adalah wakapro, hanya tampilkan servis aset milik workshopnya
        if ($user && $user->role === 'wakapro') {
            if (!$user->ruangan_id) {
                return response()->json([]);
            }

            $saranaIds = \App\Models\DistribusiAset::where('ruangan_tujuan_id', $user->ruangan_id)
                ->where('status', 'diterima')
                ->pluck('sarana_prasarana_id')
                ->toArray();

            $query->where(function ($q) use ($user, $saranaIds) {
                $q->whereIn('sarana_prasarana_id', $saranaIds)
                  ->orWhereHas('aset', function ($qa) use ($user) {
                      $qa->where('id_ruangan', $user->ruangan_id);
                  });
            });
        }

        $servises = $query->orderBy('tanggal_servis', 'desc')->get();
            
        return response()->json($servises);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'id_aset'              => 'nullable|exists:asets,id',
            'sarana_prasarana_id'  => 'nullable|exists:sarana_prasaranas,id',
            'jenis_perbaikan'      => 'required|string|max:255',
            'tanggal_servis'      => 'required|date',
            'biaya_servis'        => 'required|numeric|min:0',
            'teknisi_bengkel'     => 'nullable|string|max:255',
            'deskripsi_kerusakan' => 'nullable|string',
            'foto_kerusakan'      => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'status'              => 'required|in:Selesai,Proses,Batal',
        ]);

        if (empty($validated['id_aset']) && empty($validated['sarana_prasarana_id'])) {
            return response()->json([
                'message' => 'Pilih salah satu aset atau sarana prasarana yang diservis.'
            ], 422);
        }

        // Validasi kepemilikan aset workshop untuk wakapro
        if ($user && $user->role === 'wakapro') {
            if (!$user->ruangan_id) {
                return response()->json(['message' => 'Akun Anda belum terhubung ke ruangan workshop manapun.'], 403);
            }

            if (!empty($validated['sarana_prasarana_id'])) {
                $isAllowed = \App\Models\DistribusiAset::where('ruangan_tujuan_id', $user->ruangan_id)
                    ->where('sarana_prasarana_id', $validated['sarana_prasarana_id'])
                    ->where('status', 'diterima')
                    ->exists();
                if (!$isAllowed) {
                    return response()->json(['message' => 'Barang ini bukan milik workshop Anda.'], 403);
                }
            }

            if (!empty($validated['id_aset'])) {
                $isAllowed = \App\Models\Aset::where('id', $validated['id_aset'])
                    ->where('id_ruangan', $user->ruangan_id)
                    ->exists();
                if (!$isAllowed) {
                    return response()->json(['message' => 'Aset ini bukan milik workshop Anda.'], 403);
                }
            }
        }

        if ($request->hasFile('foto_kerusakan')) {
            $path = $request->file('foto_kerusakan')->store('servis/kerusakan', 'public');
            $validated['foto_kerusakan'] = $path;
        }

        $servis = Servis::create($validated);
        $servis->load(['aset.ruangan', 'aset.kategori', 'saranaPrasarana']);

        // Update kondisi pada sarana prasarana jika ada
        if ($servis->sarana_prasarana_id) {
            $sarana = \App\Models\SaranaPrasarana::find($servis->sarana_prasarana_id);
            if ($sarana) {
                if ($servis->status === 'Selesai') {
                    $sarana->update(['kondisi' => 'Baik']);
                } else if ($servis->status === 'Proses') {
                    $sarana->update([
                        'kondisi' => 'Rusak Ringan',
                        'foto_kerusakan' => $servis->foto_kerusakan ?? $sarana->foto_kerusakan,
                    ]);
                }
            }
        }

        // Update kondisi pada aset fisik jika ada
        if ($servis->id_aset) {
            $kondisiTarget = $servis->status === 'Selesai' ? 'Baik' : ($servis->status === 'Proses' ? 'Rusak Ringan' : null);
            if ($kondisiTarget) {
                $k = \App\Models\Kondisi::where('nama_kondisi', $kondisiTarget)->first();
                if ($k) {
                    \App\Models\Aset::where('id', $servis->id_aset)->update(['id_kondisi' => $k->id]);
                }
            }
        }

        // Create history
        try {
            $namaBarang = $servis->saranaPrasarana?->nama_barang ?? $servis->aset?->nama_aset ?? 'Aset';
            History::create([
                'id_aset' => $validated['id_aset'] ?? null,
                'id_user' => $request->user()?->id,
                'aksi' => 'SERVIS',
                'keterangan' => "Aset {$namaBarang} diservis: {$validated['jenis_perbaikan']}. " . 
                               ($validated['teknisi_bengkel'] ? "Teknisi: {$validated['teknisi_bengkel']}. " : "") .
                               "Biaya: Rp " . number_format($validated['biaya_servis'], 0, ',', '.'),
                'tanggal' => now()
            ]);
        } catch (\Exception $e) {
            // Abaikan jika history log gagal
        }

        return response()->json($servis, 201);
    }

    public function show($id)
    {
        $servis = Servis::with(['aset.ruangan', 'aset.kategori', 'saranaPrasarana'])->findOrFail($id);
        return response()->json($servis);
    }

    public function update(Request $request, $servis)
    {
        $servis = Servis::findOrFail($servis);

        $validated = $request->validate([
            'id_aset'              => 'sometimes|nullable|exists:asets,id',
            'sarana_prasarana_id'  => 'sometimes|nullable|exists:sarana_prasaranas,id',
            'jenis_perbaikan'      => 'sometimes|required|string|max:255',
            'tanggal_servis'      => 'sometimes|required|date',
            'biaya_servis'        => 'sometimes|required|numeric|min:0',
            'teknisi_bengkel'     => 'nullable|string|max:255',
            'deskripsi_kerusakan' => 'nullable|string',
            'foto_kerusakan'      => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'status'              => 'sometimes|required|in:Selesai,Proses,Batal',
        ]);

        if ($request->hasFile('foto_kerusakan')) {
            if ($servis->foto_kerusakan) {
                Storage::disk('public')->delete($servis->foto_kerusakan);
            }
            $path = $request->file('foto_kerusakan')->store('servis/kerusakan', 'public');
            $validated['foto_kerusakan'] = $path;
        }

        // Check if status changed to "Selesai"
        $statusBerubah = isset($validated['status']) && 
                        $validated['status'] === 'Selesai' && 
                        $servis->status !== 'Selesai';

        $servis->update($validated);
        $servis->load(['aset.ruangan', 'aset.kategori', 'saranaPrasarana']);

        // Update kondisi sarana prasarana
        if ($servis->sarana_prasarana_id) {
            $sarana = \App\Models\SaranaPrasarana::find($servis->sarana_prasarana_id);
            if ($sarana) {
                if ($servis->status === 'Selesai') {
                    $sarana->update(['kondisi' => 'Baik']);
                }
            }
        }

        // Update kondisi aset fisik jika ada
        if ($servis->id_aset && $servis->status === 'Selesai') {
            $kondisiBaik = \App\Models\Kondisi::where('nama_kondisi', 'Baik')->first();
            if ($kondisiBaik) {
                \App\Models\Aset::where('id', $servis->id_aset)->update(['id_kondisi' => $kondisiBaik->id]);
            }
        }

        // Create history when servis finished
        if ($statusBerubah) {
            $namaBarang = $servis->saranaPrasarana?->nama_barang ?? $servis->aset?->nama_aset ?? 'Aset';
            History::create([
                'id_aset' => $servis->id_aset,
                'id_user' => $request->user()?->id,
                'aksi' => 'SELESAI SERVIS',
                'keterangan' => "Servis {$namaBarang} ({$servis->jenis_perbaikan}) telah selesai. Aset kembali normal.",
                'tanggal' => now()
            ]);
        }

        return response()->json($servis);
    }

    public function destroy($id)
    {
        $servis = Servis::findOrFail($id);
        if ($servis->foto_kerusakan) {
            Storage::disk('public')->delete($servis->foto_kerusakan);
        }
        $servis->delete();

        return response()->json(['message' => 'Data servis berhasil dihapus']);
    }
}
