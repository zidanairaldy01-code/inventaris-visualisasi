<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FotoAset;
use App\Models\Aset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FotoAsetController extends Controller
{
    public function store(Request $request, $aset_id)
    {
        $aset = Aset::findOrFail($aset_id);
        
        $request->validate([
            'foto' => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'keterangan' => 'nullable|string',
            'is_thumbnail' => 'nullable|boolean'
        ]);

        if ($request->hasFile('foto')) {
            $path = $request->file('foto')->store('asets', 'public');
            
            if ($request->is_thumbnail) {
                FotoAset::where('id_aset', $aset->id)->update(['is_thumbnail' => false]);
            }

            $foto = FotoAset::create([
                'id_aset' => $aset->id,
                'nama_file' => $request->file('foto')->getClientOriginalName(),
                'path_file' => $path,
                'keterangan' => $request->keterangan,
                'is_thumbnail' => $request->is_thumbnail ?? false,
                'urutan' => FotoAset::where('id_aset', $aset->id)->count() + 1
            ]);

            return response()->json($foto, 201);
        }

        return response()->json(['message' => 'File tidak ditemukan'], 400);
    }

    public function destroy(string $id)
    {
        $foto = FotoAset::findOrFail($id);
        if (Storage::disk('public')->exists($foto->path_file)) {
            Storage::disk('public')->delete($foto->path_file);
        }
        $foto->delete();
        return response()->json(['message' => 'Foto berhasil dihapus']);
    }
}
