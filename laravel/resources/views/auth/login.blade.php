@extends('layouts.app')

@section('content')
<div class="mx-auto max-w-md px-4 py-14">
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 class="text-lg font-bold text-slate-900 dark:text-slate-100">Masuk ke Manajemen Sekolah</h1>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Gunakan akun lokal Anda untuk mengakses dasbor dan data akademik.</p>

        <form method="POST" action="{{ route('login') }}" class="mt-5 space-y-4">
            @csrf
            <div>
                <label class="mb-1 block text-xs font-semibold">Email</label>
                <input type="email" name="email" value="{{ old('email') }}" required class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            </div>
            <div>
                <label class="mb-1 block text-xs font-semibold">Kata Sandi</label>
                <input type="password" name="password" required class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            </div>
            <button type="submit" class="w-full rounded-lg bg-[#1D5497] py-2.5 text-sm font-semibold text-white hover:bg-[#17437A]">
                Masuk
            </button>
        </form>

        <div class="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <p>Akun demo: <code>admin@smk.belajar.id</code> / <code>password123</code></p>
            <p class="mt-2">Belum punya akun? <a href="{{ route('register') }}" class="font-semibold text-[#1D5497] dark:text-blue-400">Daftar di sini</a></p>
        </div>
    </div>
</div>
@endsection
