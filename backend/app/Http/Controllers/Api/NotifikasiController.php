<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notifikasi;
use Illuminate\Http\Request;

class NotifikasiController extends Controller
{
    /**
     * Get list of notifications and unread count scoped to the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $limit = $request->query('limit', 20);
        $unreadOnly = $request->boolean('unread_only', false);

        $query = Notifikasi::forUser($user)->orderBy('created_at', 'desc');

        if ($unreadOnly) {
            $query->where('is_read', false);
        }

        $notifications = $query->take($limit)->get();
        $unreadCount = Notifikasi::forUser($user)->where('is_read', false)->count();

        return response()->json([
            'status'       => 'success',
            'unread_count' => $unreadCount,
            'data'         => $notifications,
        ]);
    }

    /**
     * Mark a specific notification as read (scoped to the user).
     */
    public function markRead(Request $request, string $id)
    {
        $user = $request->user();
        $notifikasi = Notifikasi::forUser($user)->findOrFail($id);
        $notifikasi->update(['is_read' => true]);

        $unreadCount = Notifikasi::forUser($user)->where('is_read', false)->count();

        return response()->json([
            'status'       => 'success',
            'message'      => 'Notifikasi telah ditandai sudah dibaca',
            'unread_count' => $unreadCount,
            'data'         => $notifikasi,
        ]);
    }

    /**
     * Mark all unread notifications as read (scoped to the user).
     */
    public function markAllRead(Request $request)
    {
        $user = $request->user();
        Notifikasi::forUser($user)->where('is_read', false)->update(['is_read' => true]);

        return response()->json([
            'status'       => 'success',
            'message'      => 'Semua notifikasi telah ditandai sudah dibaca',
            'unread_count' => 0,
        ]);
    }

    /**
     * Delete a notification (scoped to the user).
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $notifikasi = Notifikasi::forUser($user)->findOrFail($id);
        $notifikasi->delete();

        $unreadCount = Notifikasi::forUser($user)->where('is_read', false)->count();

        return response()->json([
            'status'       => 'success',
            'message'      => 'Notifikasi berhasil dihapus',
            'unread_count' => $unreadCount,
        ]);
    }
}
