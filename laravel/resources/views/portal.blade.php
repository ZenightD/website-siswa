@extends('layouts.app')

@section('content')
<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <section class="rounded-2xl bg-[#1D5497] p-7 text-white shadow-sm sm:p-10 dark:bg-[#153E75]">
        <div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div class="lg:col-span-7">
                <div class="mb-4 flex flex-wrap items-center gap-3">
                    <span class="inline-block rounded-md bg-[#FACC15] px-3 py-1 text-[11px] font-bold tracking-wide text-slate-900">
                        PROYEK PEMBELAJARAN LARAVEL
                    </span>
                    <span class="text-xs font-medium text-blue-100">Proyek Kelas XI RPL/PPLG</span>
                </div>

                <h1 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Belajar Laravel dari Nol
                </h1>
                <p class="mt-3 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
                    Mari membangun aplikasi manajemen sekolah untuk mengelola data akademik dengan lebih teratur, mudah, dan efisien.
                </p>

                <div class="mt-6 flex flex-wrap items-center gap-3">
                    <a href="#fitur-proyek" class="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">
                        Lihat Fitur Proyek
                    </a>
                    @auth
                        <a href="{{ route('dashboard') }}" class="rounded-lg border border-blue-300/40 bg-blue-900/30 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900/50">
                            Buka Dasbor Aktivitas
                        </a>
                    @else
                        <a href="{{ route('login') }}" class="rounded-lg border border-blue-300/40 bg-blue-900/30 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-900/50">
                            Masuk untuk Kelola Data
                        </a>
                    @endauth
                </div>
            </div>

            <div class="lg:col-span-5">
                <div class="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <h2 class="text-sm font-bold">Target Proyek</h2>
                    <ul class="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <li>• Mengenal Laravel dan Blade</li>
                        <li>• Mengelola data sekolah</li>
                        <li>• Menggunakan database MySQL / SQLite lokal</li>
                        <li>• Membangun aplikasi CRUD real-time</li>
                    </ul>
                </div>
            </div>
        </div>
    </section>

    <section id="fitur-proyek" class="mt-10">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Fitur yang Akan Dibuat</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Berikut modul yang dibangun secara bertahap dan kini aktif berjalan di Laravel/PHP.
        </p>

        @php
            $cards = [
                ['title' => 'Dashboard', 'desc' => 'Melihat ringkasan jumlah siswa, guru, dan kelas serta aktivitas pengguna.', 'meta' => $counts['activities'].' aktivitas', 'url' => route('dashboard')],
                ['title' => 'Data Jurusan', 'desc' => 'Mengelola daftar jurusan yang tersedia di sekolah.', 'meta' => $counts['jurusan'].' jurusan', 'url' => route('academic.index', ['tab' => 'jurusan'])],
                ['title' => 'Data Kelas', 'desc' => 'Mengatur kelas dan hubungan kelas dengan jurusan.', 'meta' => $counts['kelas'].' kelas', 'url' => route('academic.index', ['tab' => 'kelas'])],
                ['title' => 'Data Siswa', 'desc' => 'Menambah, melihat, mengubah, dan menghapus data siswa.', 'meta' => $counts['siswa'].' siswa', 'url' => route('academic.index', ['tab' => 'siswa'])],
                ['title' => 'Data Guru', 'desc' => 'Mengelola informasi guru yang ada di sekolah.', 'meta' => $counts['guru'].' guru', 'url' => route('academic.index', ['tab' => 'guru'])],
                ['title' => 'Mata Pelajaran', 'desc' => 'Mengelola daftar mata pelajaran yang diajarkan di sekolah.', 'meta' => $counts['mapel'].' mapel', 'url' => route('academic.index', ['tab' => 'mapel'])],
            ];
        @endphp

        <div class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @foreach ($cards as $card)
                <a href="{{ $card['url'] }}" class="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900">
                    <div>
                        <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">{{ $card['title'] }}</h3>
                        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ $card['desc'] }}</p>
                    </div>
                    <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                        <span class="font-medium text-slate-600 dark:text-slate-300">Aktif · {{ $card['meta'] }}</span>
                        <span class="font-semibold text-[#1D5497] dark:text-blue-400">Buka →</span>
                    </div>
                </a>
            @endforeach
        </div>
    </section>
</div>
@endsection
