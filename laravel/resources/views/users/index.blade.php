@extends('layouts.app')

@section('content')
<div class="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Database Pengguna &amp; Hak Akses</h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Daftar pengguna lokal yang terdaftar pada sistem Laravel.</p>
        </div>
        <div class="flex items-center gap-2">
            <a href="{{ route('export.pdf', ['type' => 'users']) }}" target="_blank" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Ekspor PDF</a>
            <a href="{{ route('export.excel', ['type' => 'users']) }}" class="rounded-lg bg-[#1D5497] px-3 py-2 text-xs font-semibold text-white hover:bg-[#17437A] dark:bg-blue-600">Ekspor Excel</a>
        </div>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table class="w-full border-collapse text-left text-xs">
            <thead>
                <tr class="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                    <th class="px-4 py-3">Nama</th>
                    <th class="px-4 py-3">Email</th>
                    <th class="px-4 py-3">Peran</th>
                    <th class="px-4 py-3">Status</th>
                    <th class="px-4 py-3">Login Terakhir</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @foreach ($users as $u)
                    <tr>
                        <td class="px-4 py-3 font-semibold">{{ $u->name }}</td>
                        <td class="px-4 py-3">{{ $u->email }}</td>
                        <td class="px-4 py-3 font-mono">{{ $u->role }}</td>
                        <td class="px-4 py-3 font-semibold {{ $u->status === 'active' ? 'text-emerald-600' : 'text-rose-600' }}">{{ $u->status === 'active' ? 'Aktif' : 'Nonaktif' }}</td>
                        <td class="px-4 py-3 font-mono text-[11px] tabular-nums text-slate-500">{{ $u->last_login_at?->format('d/m/Y H:i') ?? 'Belum pernah' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</div>
@endsection
