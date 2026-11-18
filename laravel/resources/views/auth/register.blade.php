@extends('layouts.app')

@section('content')
<div class="mx-auto max-w-md px-4 py-14">
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 class="text-lg font-bold text-slate-900 dark:text-slate-100">Daftar Akun Baru</h1>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Buat akun pengguna baru pada database lokal Laravel.</p>

        <form method="POST" action="{{ route('register') }}" class="mt-5 space-y-4">
            @csrf
            <div>
                <label class="mb-1 block text-xs font-semibold">Nama Lengkap</label>
                <input type="text" name="name" value="{{ old('name') }}" required class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            </div>
            <div>
                <label class="mb-1 block text-xs font-semibold">Email</label>
                <input type="email" name="email" value="{{ old('email') }}" required class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            </div>
            <div>
                <label class="mb-1 block text-xs font-semibold">Peran</label>
                <select name="role" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                    <option value="siswa">Siswa</option>
                    <option value="guru">Guru</option>
                    <option value="admin">Administrator</option>
                </select>
            </div>
            <div>
                <label class="mb-1 block text-xs font-semibold">Kata Sandi</label>
                <input type="password" name="password" required minlength="6" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            </div>
            <div>
                <label class="mb-1 block text-xs font-semibold">Konfirmasi Kata Sandi</label>
                <input type="password" name="password_confirmation" required minlength="6" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
            </div>
            <button type="submit" class="w-full rounded-lg bg-[#1D5497] py-2.5 text-sm font-semibold text-white hover:bg-[#17437A]">
                Daftar &amp; Masuk
            </button>
        </form>
    </div>
</div>
@endsection
