<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\History;
use Illuminate\Http\Request;

class HistoryController extends Controller
{
    public function index()
    {
        return response()->json(
            History::with(['aset.ruangan.gedung', 'aset.kategori', 'user'])
                ->orderBy('tanggal', 'desc')
                ->get()
        );
    }

    public function show(string $id)
    {
        $history = History::with(['aset.ruangan.gedung', 'aset.kategori', 'user'])->findOrFail($id);
        return response()->json($history);
    }
}
