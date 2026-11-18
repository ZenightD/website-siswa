@extends('layouts.app')

@section('content')
<div class="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Dasbor Pemantauan Aktivitas Pengguna</h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Sinkronisasi database lokal real-time via Server-Sent Events (SSE) PHP/Laravel.</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-slate-800 dark:bg-slate-900">
            Status SSE: <span id="sse-status" class="font-semibold text-emerald-600 dark:text-emerald-400">Aktif</span>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div class="text-xs text-slate-500 dark:text-slate-400">Total Aktivitas</div>
            <div id="kpi-total-activities" class="mt-2 text-2xl font-bold tabular-nums">{{ $counts['total_activities'] }}</div>
            <div class="mt-1 text-xs text-slate-500"><span id="kpi-today-activities" class="font-semibold text-emerald-600">{{ $counts['today_activities'] }}</span> hari ini</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div class="text-xs text-slate-500 dark:text-slate-400">Sesi Aktif</div>
            <div class="mt-2 text-2xl font-bold tabular-nums">{{ $onlineSessions->count() }}</div>
            <div class="mt-1 text-xs text-slate-500">15 menit terakhir</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div class="text-xs text-slate-500 dark:text-slate-400">Entitas Akademik</div>
            <div class="mt-2 text-2xl font-bold tabular-nums">{{ $counts['siswa'] + $counts['guru'] + $counts['kelas'] + $counts['jurusan'] + $counts['mapel'] }}</div>
            <div class="mt-1 text-xs text-slate-500">{{ $counts['siswa'] }} siswa · {{ $counts['guru'] }} guru · {{ $counts['kelas'] }} kelas</div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div class="text-xs text-slate-500 dark:text-slate-400">Pengguna Terdaftar</div>
            <div class="mt-2 text-2xl font-bold tabular-nums">{{ $counts['users'] }}</div>
            <div class="mt-1 text-xs text-slate-500">Database lokal aktif</div>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div class="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <h2 class="text-base font-bold">Distribusi Aktivitas per Modul</h2>
            <div class="mt-4 space-y-3">
                @php $maxMod = max(1, $byModule->max('total') ?? 1); @endphp
                @foreach ($byModule as $item)
                    <div>
                        <div class="mb-1 flex justify-between text-xs">
                            <span class="font-medium">{{ $item->module }}</span>
                            <span class="font-mono tabular-nums text-slate-500">{{ $item->total }}</span>
                        </div>
                        <div class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                            <div style="width: {{ max(6, round(($item->total / $maxMod) * 100)) }}%" class="h-full rounded-full bg-[#1D5497] dark:bg-blue-500"></div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 class="text-base font-bold">Pengguna Aktif Terbaru</h2>
            <div class="mt-3 space-y-2 text-xs">
                @forelse ($onlineSessions as $s)
                    <div class="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                        <div>
                            <div class="font-semibold">{{ $s->name }}</div>
                            <div class="text-slate-500">{{ $s->role }} · {{ $s->email }}</div>
                        </div>
                        <span class="font-mono text-slate-500">{{ \Carbon\Carbon::createFromTimestamp($s->last_activity)->format('H:i') }}</span>
                    </div>
                @empty
                    <p class="text-slate-500">Belum ada sesi aktif.</p>
                @endforelse
            </div>
        </div>
    </div>

    <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center dark:border-slate-800">
            <div>
                <h2 class="text-base font-bold">Log Aktivitas Pengguna Terperinci</h2>
                <p class="text-xs text-slate-500">Filter dan ekspor riwayat aktivitas ke PDF atau Excel.</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <form method="GET" action="{{ route('dashboard') }}" class="flex flex-wrap items-center gap-2">
                    <input type="text" name="q" value="{{ $search }}" placeholder="Cari aktivitas..." class="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
                    <select name="module" class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
                        <option value="ALL">Semua Modul</option>
                        @foreach ($modules as $m)
                            <option value="{{ $m }}" @selected($moduleFilter === $m)>{{ $m }}</option>
                        @endforeach
                    </select>
                    <select name="action" class="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
                        <option value="ALL">Semua Aksi</option>
                        @foreach ($actions as $a)
                            <option value="{{ $a }}" @selected($actionFilter === $a)>{{ $a }}</option>
                        @endforeach
                    </select>
                    <button type="submit" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Filter</button>
                </form>

                <a href="{{ route('export.pdf', ['type' => 'activities']) }}" target="_blank" class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Ekspor PDF</a>
                <a href="{{ route('export.excel', ['type' => 'activities']) }}" class="rounded-lg bg-[#1D5497] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#17437A] dark:bg-blue-600">Ekspor Excel</a>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full border-collapse text-left text-xs">
                <thead>
                    <tr class="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                        <th class="px-4 py-3">Waktu</th>
                        <th class="px-4 py-3">Pengguna</th>
                        <th class="px-4 py-3">Aksi</th>
                        <th class="px-4 py-3">Modul</th>
                        <th class="px-4 py-3">Deskripsi</th>
                        <th class="px-4 py-3 text-right">Durasi</th>
                    </tr>
                </thead>
                <tbody id="activity-tbody" class="divide-y divide-slate-100 dark:divide-slate-800">
                    @foreach ($activities as $log)
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td class="px-4 py-3 font-mono text-[11px] tabular-nums whitespace-nowrap text-slate-500">{{ $log->created_at?->format('d M H:i:s') }}</td>
                            <td class="px-4 py-3">
                                <div class="font-semibold">{{ $log->user_name }}</div>
                                <div class="text-[11px] text-slate-500">{{ $log->user_role }} · {{ $log->user_email }}</div>
                            </td>
                            <td class="px-4 py-3 font-mono font-semibold">{{ $log->action }}</td>
                            <td class="px-4 py-3 font-medium">{{ $log->module }}</td>
                            <td class="px-4 py-3">{{ $log->description }}</td>
                            <td class="px-4 py-3 text-right font-mono tabular-nums text-slate-500">{{ $log->duration_ms }} ms</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </section>
</div>
@endsection

@push('scripts')
<script>
    (function () {
        if (!window.EventSource) return;
        const es = new EventSource("{{ route('dashboard.stream') }}");
        const statusEl = document.getElementById('sse-status');
        es.addEventListener('sync', function (evt) {
            const data = JSON.parse(evt.data);
            const totalEl = document.getElementById('kpi-total-activities');
            const todayEl = document.getElementById('kpi-today-activities');
            if (totalEl) totalEl.textContent = data.total_activities;
            if (todayEl) todayEl.textContent = data.today_activities;
            const tbody = document.getElementById('activity-tbody');
            if (tbody && Array.isArray(data.logs)) {
                data.logs.forEach(function (log) {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/40';
                    tr.innerHTML =
                        '<td class="px-4 py-3 font-mono text-[11px] whitespace-nowrap text-slate-500">Baru saja</td>' +
                        '<td class="px-4 py-3"><div class="font-semibold">' + (log.user_name || '') + '</div><div class="text-[11px] text-slate-500">' + (log.user_role || '') + ' · ' + (log.user_email || '') + '</div></td>' +
                        '<td class="px-4 py-3 font-mono font-semibold">' + (log.action || '') + '</td>' +
                        '<td class="px-4 py-3 font-medium">' + (log.module || '') + '</td>' +
                        '<td class="px-4 py-3">' + (log.description || '') + '</td>' +
                        '<td class="px-4 py-3 text-right font-mono text-slate-500">' + (log.duration_ms || 0) + ' ms</td>';
                    tbody.prepend(tr);
                });
            }
        });
        es.onerror = function () {
            if (statusEl) statusEl.textContent = 'Menyambung ulang...';
        };
        es.onopen = function () {
            if (statusEl) statusEl.textContent = 'Aktif Real-Time';
        };
    })();
</script>
@endpush
