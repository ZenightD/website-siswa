<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    public function index()
    {
        $users = User::orderByDesc('created_at')->get();
        return view('users.index', compact('users'));
    }

    public function update(Request $request, User $user)
    {
        if (Auth::user()?->role !== 'admin') {
            return back()->withErrors(['role' => 'Hanya administrator yang dapat mengubah hak akses pengguna.']);
        }

        $validated = $request->validate([
            'role' => ['sometimes', 'in:admin,guru,siswa'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        $before = ['role' => $user->role, 'status' => $user->status];
        $user->update($validated);

        ActivityLog::record(
            'UPDATE',
            'Pengguna',
            "Memperbarui akun {$user->name} (peran: {$user->role}, status: {$user->status})",
            (string) $user->id,
            ['before' => $before, 'after' => $validated],
            $request
        );

        return back()->with('success', "Akun {$user->name} berhasil diperbarui.");
    }
}
