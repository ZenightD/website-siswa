@extends('layouts.app')

@section('content')
<div class="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Pengelolaan Data Akademik (CRUD)</h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola Jurusan, Kelas, Siswa, Guru, dan Mata Pelajaran dengan Laravel Eloquent.</p>
        </div>
        <div class="flex items-center gap-2">
            <a href="{{ route('export.pdf', ['type' => $tab]) }}" target="_blank" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Ekspor PDF</a>
            <a href="{{ route('export.excel', ['type' => $tab]) }}" class="rounded-lg bg-[#1D5497] px-3 py-2 text-xs font-semibold text-white hover:bg-[#17437A] dark:bg-blue-600">Ekspor Excel</a>
        </div>
    </div>

    <div class="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        @foreach (['jurusan' => 'Data Jurusan', 'kelas' => 'Data Kelas', 'siswa' => 'Data Siswa', 'guru' => 'Data Guru', 'mapel' => 'Mata Pelajaran'] as $key => $label)
            <a href="{{ route('academic.index', ['tab' => $key]) }}" class="rounded-lg px-3.5 py-2 text-xs font-semibold {{ $tab === $key ? 'bg-[#1D5497] text-white dark:bg-blue-600' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800' }}">
                {{ $label }}
            </a>
        @endforeach
    </div>

    <!-- Form Tambah Cepat sesuai Tab Aktif -->
    <div class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 class="mb-3 text-sm font-bold">Tambah Data Baru ({{ ucfirst($tab) }})</h2>

        @if ($tab === 'jurusan')
            <form method="POST" action="{{ route('jurusan.store') }}" class="grid grid-cols-1 gap-3 sm:grid-cols-5">
                @csrf
                <input name="kode" required placeholder="Kode (RPL/PPLG)" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input name="nama" required placeholder="Nama Jurusan" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input name="kaprodi" required placeholder="Kaprodi" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input name="kuota" type="number" value="72" required placeholder="Kuota" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <button type="submit" class="rounded-lg bg-[#1D5497] px-4 py-2 text-xs font-semibold text-white">Simpan</button>
            </form>
        @elseif ($tab === 'kelas')
            <form method="POST" action="{{ route('kelas.store') }}" class="grid grid-cols-1 gap-3 sm:grid-cols-6">
                @csrf
                <input name="nama" required placeholder="Nama (XI RPL 3)" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <select name="tingkat" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                    <option value="X">X</option><option value="XI" selected>XI</option><option value="XII">XII</option>
                </select>
                <select name="jurusan_id" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                    @foreach ($allJurusan as $j)
                        <option value="{{ $j->id }}">{{ $j->kode }}</option>
                    @endforeach
                </select>
                <input name="wali_kelas" required placeholder="Wali Kelas" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input name="kapasitas" type="number" value="36" required class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input type="hidden" name="tahun_ajaran" value="2026/2027">
                <button type="submit" class="rounded-lg bg-[#1D5497] px-4 py-2 text-xs font-semibold text-white">Simpan</button>
            </form>
        @elseif ($tab === 'siswa')
            <form method="POST" action="{{ route('siswa.store') }}" class="grid grid-cols-1 gap-3 sm:grid-cols-6">
                @csrf
                <input name="nis" required placeholder="NIS" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input name="nama" required placeholder="Nama Siswa" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <select name="kelas_id" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                    @foreach ($allKelas as $k)
                        <option value="{{ $k->id }}">{{ $k->nama }}</option>
                    @endforeach
                </select>
                <input name="email" type="email" required placeholder="Email" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <select name="jenis_kelamin" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                    <option value="L">L</option><option value="P">P</option>
                </select>
                <input type="hidden" name="status" value="Aktif">
                <input type="hidden" name="nilai_rata" value="88">
                <button type="submit" class="rounded-lg bg-[#1D5497] px-4 py-2 text-xs font-semibold text-white">Simpan</button>
            </form>
        @elseif ($tab === 'guru')
            <form method="POST" action="{{ route('guru.store') }}" class="grid grid-cols-1 gap-3 sm:grid-cols-6">
                @csrf
                <input name="nip" required placeholder="NIP" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input name="nama" required placeholder="Nama Guru" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input name="bidang_studi" required placeholder="Bidang Studi" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input name="email" type="email" required placeholder="Email" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input name="no_telp" placeholder="No. Telepon" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input type="hidden" name="status" value="Aktif">
                <button type="submit" class="rounded-lg bg-[#1D5497] px-4 py-2 text-xs font-semibold text-white">Simpan</button>
            </form>
        @else
            <form method="POST" action="{{ route('mapel.store') }}" class="grid grid-cols-1 gap-3 sm:grid-cols-6">
                @csrf
                <input name="kode" required placeholder="Kode (PWL-11)" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input name="nama" required placeholder="Nama Mapel" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <select name="jurusan_id" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                    <option value="">Umum</option>
                    @foreach ($allJurusan as $j)
                        <option value="{{ $j->id }}">{{ $j->kode }}</option>
                    @endforeach
                </select>
                <select name="guru_id" class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                    @foreach ($allGuru as $g)
                        <option value="{{ $g->id }}">{{ $g->nama }}</option>
                    @endforeach
                </select>
                <input name="jam_per_minggu" type="number" value="4" required class="rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input type="hidden" name="tingkat" value="XI">
                <button type="submit" class="rounded-lg bg-[#1D5497] px-4 py-2 text-xs font-semibold text-white">Simpan</button>
            </form>
        @endif
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table class="w-full border-collapse text-left text-xs">
            <thead>
                <tr class="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                    @if ($tab === 'jurusan')
                        <th class="px-4 py-3">Kode</th><th class="px-4 py-3">Nama</th><th class="px-4 py-3">Kaprodi</th><th class="px-4 py-3 text-right">Kuota</th>
                    @elseif ($tab === 'kelas')
                        <th class="px-4 py-3">Kelas</th><th class="px-4 py-3">Tingkat</th><th class="px-4 py-3">Jurusan</th><th class="px-4 py-3">Wali Kelas</th><th class="px-4 py-3 text-right">Kapasitas</th>
                    @elseif ($tab === 'siswa')
                        <th class="px-4 py-3">NIS</th><th class="px-4 py-3">Nama</th><th class="px-4 py-3">Kelas</th><th class="px-4 py-3">Email</th><th class="px-4 py-3">Status</th>
                    @elseif ($tab === 'guru')
                        <th class="px-4 py-3">NIP</th><th class="px-4 py-3">Nama</th><th class="px-4 py-3">Bidang Studi</th><th class="px-4 py-3">Email</th><th class="px-4 py-3">Status</th>
                    @else
                        <th class="px-4 py-3">Kode</th><th class="px-4 py-3">Mata Pelajaran</th><th class="px-4 py-3">Jurusan</th><th class="px-4 py-3">Guru</th><th class="px-4 py-3 text-right">JP</th>
                    @endif
                    <th class="px-4 py-3 text-right">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @if ($tab === 'jurusan')
                    @foreach ($jurusan as $item)
                        <tr>
                            <td class="px-4 py-3 font-mono font-semibold">{{ $item->kode }}</td>
                            <td class="px-4 py-3 font-semibold">{{ $item->nama }}</td>
                            <td class="px-4 py-3">{{ $item->kaprodi }}</td>
                            <td class="px-4 py-3 text-right font-mono tabular-nums">{{ $item->kuota }}</td>
                            <td class="px-4 py-3 text-right">
                                <form method="POST" action="{{ route('jurusan.destroy', $item) }}" class="inline">
                                    @csrf @method('DELETE')
                                    <button type="submit" class="text-rose-600 hover:underline">Hapus</button>
                                </form>
                            </td>
                        </tr>
                    @endforeach
                @elseif ($tab === 'kelas')
                    @foreach ($kelas as $item)
                        <tr>
                            <td class="px-4 py-3 font-semibold">{{ $item->nama }}</td>
                            <td class="px-4 py-3 font-mono">{{ $item->tingkat }}</td>
                            <td class="px-4 py-3">{{ $item->jurusan?->nama ?? '-' }}</td>
                            <td class="px-4 py-3">{{ $item->wali_kelas }}</td>
                            <td class="px-4 py-3 text-right font-mono tabular-nums">{{ $item->kapasitas }}</td>
                            <td class="px-4 py-3 text-right">
                                <form method="POST" action="{{ route('kelas.destroy', $item) }}" class="inline">
                                    @csrf @method('DELETE')
                                    <button type="submit" class="text-rose-600 hover:underline">Hapus</button>
                                </form>
                            </td>
                        </tr>
                    @endforeach
                @elseif ($tab === 'siswa')
                    @foreach ($siswa as $item)
                        <tr>
                            <td class="px-4 py-3 font-mono tabular-nums">{{ $item->nis }}</td>
                            <td class="px-4 py-3 font-semibold">{{ $item->nama }}</td>
                            <td class="px-4 py-3">{{ $item->kelas?->nama ?? '-' }}</td>
                            <td class="px-4 py-3">{{ $item->email }}</td>
                            <td class="px-4 py-3 text-emerald-600 font-medium">{{ $item->status }}</td>
                            <td class="px-4 py-3 text-right">
                                <form method="POST" action="{{ route('siswa.destroy', $item) }}" class="inline">
                                    @csrf @method('DELETE')
                                    <button type="submit" class="text-rose-600 hover:underline">Hapus</button>
                                </form>
                            </td>
                        </tr>
                    @endforeach
                @elseif ($tab === 'guru')
                    @foreach ($guru as $item)
                        <tr>
                            <td class="px-4 py-3 font-mono tabular-nums">{{ $item->nip }}</td>
                            <td class="px-4 py-3 font-semibold">{{ $item->nama }}</td>
                            <td class="px-4 py-3">{{ $item->bidang_studi }}</td>
                            <td class="px-4 py-3">{{ $item->email }}</td>
                            <td class="px-4 py-3 text-emerald-600 font-medium">{{ $item->status }}</td>
                            <td class="px-4 py-3 text-right">
                                <form method="POST" action="{{ route('guru.destroy', $item) }}" class="inline">
                                    @csrf @method('DELETE')
                                    <button type="submit" class="text-rose-600 hover:underline">Hapus</button>
                                </form>
                            </td>
                        </tr>
                    @endforeach
                @else
                    @foreach ($mapel as $item)
                        <tr>
                            <td class="px-4 py-3 font-mono font-semibold">{{ $item->kode }}</td>
                            <td class="px-4 py-3 font-semibold">{{ $item->nama }}</td>
                            <td class="px-4 py-3">{{ $item->jurusan?->nama ?? 'Umum' }}</td>
                            <td class="px-4 py-3">{{ $item->guru?->nama ?? '-' }}</td>
                            <td class="px-4 py-3 text-right font-mono tabular-nums">{{ $item->jam_per_minggu }} JP</td>
                            <td class="px-4 py-3 text-right">
                                <form method="POST" action="{{ route('mapel.destroy', $item) }}" class="inline">
                                    @csrf @method('DELETE')
                                    <button type="submit" class="text-rose-600 hover:underline">Hapus</button>
                                </form>
                            </td>
                        </tr>
                    @endforeach
                @endif
            </tbody>
        </table>
    </div>
</div>
@endsection
