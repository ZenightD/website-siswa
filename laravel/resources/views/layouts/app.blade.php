<!doctype html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Manajemen Sekolah — Proyek Kelas XI RPL')</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = { darkMode: 'class' };
        if (localStorage.getItem('manajemen_sekolah_theme') === 'dark') {
            document.documentElement.classList.add('dark');
        }
    </script>
</head>
<body class="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
    <header class="sticky top-0 z-30 border-b border-slate-800 bg-[#111827] text-white dark:bg-[#090D16]">
        <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
            <a href="{{ route('portal') }}" class="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
                Manajemen Sekolah
            </a>

            <nav class="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
                <a href="{{ route('portal') }}" class="whitespace-nowrap hover:text-white {{ request()->routeIs('portal') ? 'text-white underline underline-offset-8 decoration-2' : '' }}">Beranda</a>
                <a href="{{ route('dashboard') }}" class="whitespace-nowrap hover:text-white {{ request()->routeIs('dashboard') ? 'text-white underline underline-offset-8 decoration-2' : '' }}">Dasbor Aktivitas</a>
                <a href="{{ route('academic.index') }}" class="whitespace-nowrap hover:text-white {{ request()->routeIs('academic.*') ? 'text-white underline underline-offset-8 decoration-2' : '' }}">Data Akademik</a>
                <a href="{{ route('users.index') }}" class="whitespace-nowrap hover:text-white {{ request()->routeIs('users.*') ? 'text-white underline underline-offset-8 decoration-2' : '' }}">Pengguna</a>
            </nav>

            <div class="flex items-center gap-3 shrink-0">
                <button type="button" onclick="toggleTheme()" class="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
                    <span id="theme-label">Mode Gelap</span>
                </button>

                @auth
                    <span class="hidden sm:inline text-xs text-slate-300">{{ auth()->user()->name }}</span>
                    <form method="POST" action="{{ route('logout') }}">
                        @csrf
                        <button type="submit" class="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                            Keluar
                        </button>
                    </form>
                @else
                    <a href="{{ route('login') }}" class="rounded-lg bg-[#1D5497] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-600">
                        Masuk
                    </a>
                @endauth
            </div>
        </div>
    </header>

    <main class="pb-24">
        @if (session('success'))
            <div class="mx-auto mt-4 max-w-6xl px-4 sm:px-6 lg:px-8">
                <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {{ session('success') }}
                </div>
            </div>
        @endif

        @if ($errors->any())
            <div class="mx-auto mt-4 max-w-6xl px-4 sm:px-6 lg:px-8">
                <div class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                    {{ $errors->first() }}
                </div>
            </div>
        @endif

        @yield('content')
    </main>

    <footer class="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        Manajemen Sekolah · Proyek Kelas XI RPL/PPLG · Laravel / PHP
    </footer>

    <!-- UI & Tombol Asisten AI di pojok kanan bawah (Tanpa logika AI backend) -->
    <div class="fixed right-5 bottom-5 z-40 flex flex-col items-end">
        <div id="ai-chatbox-panel" class="hidden mb-3 flex h-[440px] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div class="flex items-center justify-between bg-[#1D5497] px-4 py-3 text-white dark:bg-[#153E75]">
                <div>
                    <h3 class="text-sm font-bold leading-tight">Asisten AI</h3>
                    <p class="text-[11px] text-blue-100">UI Chatbox (Mode Siaga)</p>
                </div>
                <button type="button" onclick="toggleChatbox()" class="rounded-lg px-2 py-1 text-xs text-blue-100 hover:bg-white/15">
                    Tutup
                </button>
            </div>
            <div id="ai-chatbox-messages" class="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 text-xs dark:bg-slate-950/60">
                <div class="max-w-[85%] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    Halo! Ini adalah UI Asisten AI Manajemen Sekolah. Logika AI backend dinonaktifkan sementara.
                </div>
            </div>
            <form onsubmit="handleChatUiSubmit(event)" class="flex items-center gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <input id="ai-chatbox-input" type="text" placeholder="Tulis pesan pada UI chatbox..." class="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <button type="submit" class="rounded-lg bg-[#1D5497] px-3 py-2 text-xs font-semibold text-white hover:bg-[#17437A] dark:bg-blue-600">
                    Kirim
                </button>
            </form>
        </div>

        <button type="button" onclick="toggleChatbox()" class="flex items-center gap-2 rounded-xl bg-[#1D5497] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#17437A] dark:bg-blue-600 dark:hover:bg-blue-500">
            <span>Asisten AI</span>
        </button>
    </div>

    <script>
        function updateThemeLabel() {
            const isDark = document.documentElement.classList.contains('dark');
            const label = document.getElementById('theme-label');
            if (label) label.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
        }
        function toggleTheme() {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('manajemen_sekolah_theme', isDark ? 'dark' : 'light');
            updateThemeLabel();
        }
        function toggleChatbox() {
            const panel = document.getElementById('ai-chatbox-panel');
            if (panel) panel.classList.toggle('hidden');
        }
        function handleChatUiSubmit(e) {
            e.preventDefault();
            const input = document.getElementById('ai-chatbox-input');
            const list = document.getElementById('ai-chatbox-messages');
            const val = (input.value || '').trim();
            if (!val) return;
            const userDiv = document.createElement('div');
            userDiv.className = 'ml-auto max-w-[85%] rounded-xl bg-[#1D5497] px-3.5 py-2.5 text-white';
            userDiv.textContent = val;
            list.appendChild(userDiv);
            const infoDiv = document.createElement('div');
            infoDiv.className = 'max-w-[85%] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
            infoDiv.textContent = 'Pesan diterima pada antarmuka UI. Logika AI saat ini belum dihubungkan.';
            list.appendChild(infoDiv);
            input.value = '';
            list.scrollTop = list.scrollHeight;
        }
        updateThemeLabel();
    </script>
    @stack('scripts')
</body>
</html>
