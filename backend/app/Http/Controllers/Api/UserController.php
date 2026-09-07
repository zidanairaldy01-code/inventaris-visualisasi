<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = User::with('ruangan');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_lengkap', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->latest()->get();

        return response()->json($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_lengkap' => 'required|string|max:255',
            'username'     => 'required|string|max:255|unique:users,username',
            'email'        => 'required|string|email|max:255|unique:users,email',
            'password'     => 'required|string|min:6',
            'role'         => ['required', Rule::in(['super_admin', 'petugas', 'wakasek', 'wakapro'])],
            'ruangan_id'   => 'nullable|exists:ruangans,id',
            'status'       => 'boolean',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['status'] = $request->boolean('status', true);

        if ($validated['role'] !== 'wakapro') {
            $validated['ruangan_id'] = null;
        }

        $user = User::create($validated);
        $user->load('ruangan');

        return response()->json([
            'message' => 'Pengguna berhasil ditambahkan.',
            'data'    => $user,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        $user->load('ruangan');
        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'nama_lengkap' => 'required|string|max:255',
            'username'     => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'email'        => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password'     => 'nullable|string|min:6',
            'role'         => ['required', Rule::in(['super_admin', 'petugas', 'wakasek', 'wakapro'])],
            'ruangan_id'   => 'nullable|exists:ruangans,id',
            'status'       => 'boolean',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        if ($validated['role'] !== 'wakapro') {
            $validated['ruangan_id'] = null;
        }

        $user->update($validated);
        $user->load('ruangan');

        return response()->json([
            'message' => 'Data pengguna berhasil diperbarui.',
            'data'    => $user,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'Anda tidak dapat menghapus akun Anda sendiri.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'Pengguna berhasil dihapus.',
        ]);
    }
}
