import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LogIn, LogOut, Moon, Sun, Lock } from 'lucide-react';
import { PortalView } from './components/PortalView';
import { DashboardView } from './components/DashboardView';
import { AcademicView } from './components/AcademicView';
import { UsersView } from './components/UsersView';
import { AuthModal } from './components/AuthModal';
import { AiChatbox } from './components/AiChatbox';
import type {
  AcademicTab,
  ActivityLog,
  AppSection,
  DashboardAnalytics,
  Guru,
  Jurusan,
  Kelas,
  MataPelajaran,
  OnlineUser,
  Siswa,
  User,
} from './types';

const TOKEN_STORAGE_KEY = 'manajemen_sekolah_token';
const THEME_STORAGE_KEY = 'manajemen_sekolah_theme';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const [section, setSection] = useState<AppSection>('portal');
  const [academicTab, setAcademicTab] = useState<AcademicTab>('siswa');
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [jurusan, setJurusan] = useState<Jurusan[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [guru, setGuru] = useState<Guru[]>([]);
  const [mataPelajaran, setMataPelajaran] = useState<MataPelajaran[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage failures
    }
  }, [darkMode]);

  const fetchBootstrap = useCallback(async (token: string | null) => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch('/api/bootstrap', { headers });
      if (!res.ok) return;
      const data = await res.json();
      setAnalytics(data.analytics ?? null);
      setJurusan(data.jurusan ?? []);
      setKelas(data.kelas ?? []);
      setSiswa(data.siswa ?? []);
      setGuru(data.guru ?? []);
      setMataPelajaran(data.mata_pelajaran ?? []);
      setUsers(data.users ?? []);
      setActivities(data.activities ?? []);
      setOnlineUsers(data.online_users ?? []);
    } catch {
      // Handled gracefully on retry
    }
  }, []);

  useEffect(() => {
    let active = true;
    const verifyAndLoad = async () => {
      if (authToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (active) setCurrentUser(data.user);
          } else {
            if (active) {
              setAuthToken(null);
              setCurrentUser(null);
              localStorage.removeItem(TOKEN_STORAGE_KEY);
            }
          }
        } catch {
          // Keep state until network recovers
        }
      }
      if (active) {
        await fetchBootstrap(authToken);
      }
    };
    verifyAndLoad();
    return () => {
      active = false;
    };
  }, [authToken, fetchBootstrap]);

  // WebSocket real-time synchronization
  useEffect(() => {
    let closedByCleanup = false;
    let reconnectTimer: number | undefined;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws${
        authToken ? `?token=${encodeURIComponent(authToken)}` : ''
      }`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        const pageLabel =
          section === 'portal'
            ? 'Beranda'
            : section === 'dashboard'
            ? 'Dasbor Aktivitas'
            : section === 'akademik'
            ? `Akademik (${academicTab})`
            : 'Pengguna';
        ws.send(JSON.stringify({ type: 'presence:page', module: pageLabel }));
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as {
            type: string;
            payload: unknown;
          };
          if (msg.type === 'presence:update') {
            setOnlineUsers(msg.payload as OnlineUser[]);
          } else if (msg.type === 'activity:created') {
            const newLog = msg.payload as ActivityLog;
            setActivities((prev) => {
              if (prev.some((a) => a.id === newLog.id)) return prev;
              return [newLog, ...prev].slice(0, 200);
            });
            fetchBootstrap(authToken);
          } else if (msg.type === 'data:synced') {
            fetchBootstrap(authToken);
          }
        } catch {
          // Ignore invalid frames
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByCleanup) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();
    return () => {
      closedByCleanup = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [authToken, fetchBootstrap]);

  // Report active page to WebSocket presence
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const pageLabel =
        section === 'portal'
          ? 'Beranda'
          : section === 'dashboard'
          ? 'Dasbor Aktivitas'
          : section === 'akademik'
          ? `Akademik (${academicTab})`
          : 'Pengguna';
      ws.send(JSON.stringify({ type: 'presence:page', module: pageLabel }));
    }
  }, [section, academicTab]);

  const handleAuthSuccess = (token: string, user: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setAuthToken(token);
    setCurrentUser(user);
    fetchBootstrap(token);
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // Proceed with local sign-out
      }
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
    setSection('portal');
    fetchBootstrap(null);
  };

  const handleNavigate = (targetSection: AppSection, targetTab?: AcademicTab) => {
    if (targetSection !== 'portal' && !currentUser) {
      setAuthModalOpen(true);
      return;
    }
    if (targetTab) {
      setAcademicTab(targetTab);
    }
    setSection(targetSection);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#111827] text-white dark:bg-[#090D16]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Title */}
          <button
            type="button"
            onClick={() => handleNavigate('portal')}
            className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-blue-200 transition-colors"
          >
            Manajemen Sekolah
          </button>

          {/* Zone 2: Concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
            <button
              type="button"
              onClick={() => handleNavigate('portal')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                section === 'portal' ? 'text-white underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('dashboard')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                section === 'dashboard' ? 'text-white underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Dasbor Aktivitas
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('akademik', academicTab)}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                section === 'akademik' ? 'text-white underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Data Akademik
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('pengguna')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                section === 'pengguna' ? 'text-white underline underline-offset-8 decoration-2' : ''
              }`}
            >
              Pengguna
            </button>
          </nav>

          {/* Zone 3: Primary Action + Dark Mode Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setDarkMode((v) => !v)}
              aria-label={darkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
              title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
              className="rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-block max-w-[140px] truncate text-xs font-medium text-slate-200">
                  {currentUser.name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white border border-slate-700 transition-colors hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D5497] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600 whitespace-nowrap shrink-0"
              >
                <LogIn className="h-3.5 w-3.5" />
                Masuk
              </button>
            )}
          </div>
        </div>

        {/* Mobile navigation row */}
        <div className="flex items-center gap-4 overflow-x-auto border-t border-slate-800 px-4 py-2 text-xs font-medium text-slate-300 md:hidden">
          <button
            type="button"
            onClick={() => handleNavigate('portal')}
            className={`whitespace-nowrap shrink-0 ${
              section === 'portal' ? 'text-white font-semibold' : ''
            }`}
          >
            Beranda
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className={`whitespace-nowrap shrink-0 ${
              section === 'dashboard' ? 'text-white font-semibold' : ''
            }`}
          >
            Dasbor Aktivitas
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('akademik', academicTab)}
            className={`whitespace-nowrap shrink-0 ${
              section === 'akademik' ? 'text-white font-semibold' : ''
            }`}
          >
            Data Akademik
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('pengguna')}
            className={`whitespace-nowrap shrink-0 ${
              section === 'pengguna' ? 'text-white font-semibold' : ''
            }`}
          >
            Pengguna
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24">
        {section === 'portal' && (
          <PortalView
            analytics={analytics}
            currentUser={currentUser}
            onNavigateSection={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {section !== 'portal' && !currentUser && (
          <div className="mx-auto max-w-md px-4 py-20 text-center">
            <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1D5497] dark:bg-blue-950/60 dark:text-blue-400">
                <Lock className="h-5 w-5" />
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Autentikasi Diperlukan
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Silakan masuk dengan akun Anda untuk mengakses dasbor aktivitas pengguna, CRUD data
                akademik, dan fitur ekspor laporan.
              </p>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="mt-5 rounded-lg bg-[#1D5497] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#17437A] dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Masuk / Daftar Sekarang
              </button>
            </div>
          </div>
        )}

        {section === 'dashboard' && currentUser && authToken && (
          <DashboardView
            analytics={analytics}
            activities={activities}
            onlineUsers={onlineUsers}
            wsConnected={wsConnected}
            currentUser={currentUser}
            authToken={authToken}
          />
        )}

        {section === 'akademik' && currentUser && authToken && (
          <AcademicView
            activeTab={academicTab}
            onChangeTab={setAcademicTab}
            jurusan={jurusan}
            kelas={kelas}
            siswa={siswa}
            guru={guru}
            mataPelajaran={mataPelajaran}
            authToken={authToken}
            currentUser={currentUser}
            onRefreshData={() => fetchBootstrap(authToken)}
          />
        )}

        {section === 'pengguna' && currentUser && authToken && (
          <UsersView
            users={users}
            currentUser={currentUser}
            authToken={authToken}
            onRefreshData={() => fetchBootstrap(authToken)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="mx-auto max-w-6xl px-4">
          Manajemen Sekolah · Proyek Kelas XI RPL/PPLG · Database SQLite Lokal Tersinkron Real-Time
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Bottom-Right AI Chatbox matching red box annotation */}
      <AiChatbox authToken={authToken} />
    </div>
  );
}
