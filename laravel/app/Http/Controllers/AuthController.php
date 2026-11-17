<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function showLogin()
    {
        return view('auth.login');
    }

    public function login(Request $request)
    {
        $started = microtime(true);
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors([
                'email' => 'Email atau kata sandi salah.',
            ])->onlyInput('email');
        }

        $user = Auth::user();
        if ($user->status !== 'active') {
            Auth::logout();
            return back()->withErrors([
                'email' => 'Akun Anda sedang dinonaktifkan oleh administrator.',
            ]);
        }

        $request->session()->regenerate();
        $user->update(['last_login_at' => now()]);

        $durationMs = (int) round((microtime(true) - $started) * 1000);
        ActivityLog::record(
            'LOGIN',
            'Auth',
            "{$user->name} masuk ke sistem Manajemen Sekolah",
            (string) $user->id,
            ['role' => $user->role],
            $request,
            $user,
            $durationMs
        );

        return redirect()->intended(route('dashboard'));
    }

    public function showRegister()
    {
        return view('auth.register');
    }

    public function register(Request $request)
    {
        $started = microtime(true);
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
            'role' => ['required', 'in:admin,guru,siswa'],
        ]);

        $palette = ['#1D5497', '#0F766E', '#4338CA', '#B45309', '#0369A1'];
        $user = User::create([
            'name' => $validated['name'],
            'email' => strtolower($validated['email']),
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'avatar_color' => $palette[array_rand($palette)],
            'status' => 'active',
            'last_login_at' => now(),
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        $durationMs = (int) round((microtime(true) - $started) * 1000);
        ActivityLog::record(
            'REGISTER',
            'Auth',
            "Pendaftaran akun baru ({$user->name}) dengan peran {$user->role}",
            (string) $user->id,
            ['role' => $user->role],
            $request,
            $user,
            $durationMs
        );

        return redirect()->route('dashboard');
    }

    public function logout(Request $request)
    {
        $user = Auth::user();
        if ($user) {
            ActivityLog::record(
                'LOGOUT',
                'Auth',
                "{$user->name} keluar dari sesi aktif",
                (string) $user->id,
                null,
                $request,
                $user
            );
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('portal');
    }
}
