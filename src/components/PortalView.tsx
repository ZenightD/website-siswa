import React from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  GraduationCap,
  School,
  Users,
  ArrowRight,
} from 'lucide-react';
import type { AcademicTab, AppSection, DashboardAnalytics, User } from '../types';

interface PortalViewProps {
  analytics: DashboardAnalytics | null;
  currentUser: User | null;
  onNavigateSection: (section: AppSection, academicTab?: AcademicTab) => void;
  onOpenAuth: () => void;
}

export const PortalView: React.FC<PortalViewProps> = ({
  analytics,
  currentUser,
  onNavigateSection,
  onOpenAuth,
}) => {
  const scrollToFeatures = () => {
    const el = document.getElementById('fitur-proyek');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const modules: Array<{
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    iconBg: string;
    countLabel: string;
    statusLabel: string;
    onClick: () => void;
  }> = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Melihat ringkasan jumlah siswa, guru, dan kelas serta aktivitas pengguna.',
      icon: <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60',
      countLabel: `${analytics?.counts.total_activities ?? 0} aktivitas`,
      statusLabel: 'Aktif Real-Time',
      onClick: () => (currentUser ? onNavigateSection('dashboard') : onOpenAuth()),
    },
    {
      id: 'jurusan',
      title: 'Data Jurusan',
      description: 'Mengelola daftar jurusan yang tersedia di sekolah.',
      icon: <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-300" />,
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      countLabel: `${analytics?.counts.jurusan ?? 0} jurusan`,
      statusLabel: 'Aktif · CRUD',
      onClick: () => (currentUser ? onNavigateSection('akademik', 'jurusan') : onOpenAuth()),
    },
    {
      id: 'kelas',
      title: 'Data Kelas',
      description: 'Mengatur kelas dan hubungan kelas dengan jurusan.',
      icon: <School className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60',
      countLabel: `${analytics?.counts.kelas ?? 0} kelas`,
      statusLabel: 'Aktif · CRUD',
      onClick: () => (currentUser ? onNavigateSection('akademik', 'kelas') : onOpenAuth()),
    },
    {
      id: 'siswa',
      title: 'Data Siswa',
      description: 'Menambah, melihat, mengubah, dan menghapus data siswa.',
      icon: <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60',
      countLabel: `${analytics?.counts.siswa ?? 0} siswa`,
      statusLabel: 'Aktif · CRUD',
      onClick: () => (currentUser ? onNavigateSection('akademik', 'siswa') : onOpenAuth()),
    },
    {
      id: 'guru',
      title: 'Data Guru',
      description: 'Mengelola informasi guru yang ada di sekolah.',
      icon: <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      countLabel: `${analytics?.counts.guru ?? 0} guru`,
      statusLabel: 'Aktif · CRUD',
      onClick: () => (currentUser ? onNavigateSection('akademik', 'guru') : onOpenAuth()),
    },
    {
      id: 'mapel',
      title: 'Mata Pelajaran',
      description: 'Mengelola daftar mata pelajaran yang diajarkan di sekolah.',
      icon: <BookOpen className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
      iconBg: 'bg-rose-50 dark:bg-rose-950/60',
      countLabel: `${analytics?.counts.mata_pelajaran ?? 0} mapel`,
      statusLabel: 'Aktif · CRUD',
      onClick: () => (currentUser ? onNavigateSection('akademik', 'mapel') : onOpenAuth()),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Banner matching reference screenshot */}
      <section className="rounded-2xl bg-[#1D5497] p-7 text-white shadow-sm sm:p-10 dark:bg-[#153E75]">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="inline-block rounded-md bg-[#FACC15] px-3 py-1 text-[11px] font-bold tracking-wide text-slate-900">
                PROYEK PEMBELAJARAN LARAVEL
              </span>
              <span className="text-xs font-medium text-blue-100/90">
                Proyek Kelas XI RPL/PPLG
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
              Belajar Laravel dari Nol
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">
              Mari membangun aplikasi manajemen sekolah untuk mengelola data akademik dengan lebih
              teratur, mudah, dan efisien.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToFeatures}
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-xs transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap"
              >
                Lihat Fitur Proyek
              </button>
              {!currentUser ? (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-300/40 bg-blue-900/30 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-900/50 whitespace-nowrap"
                >
                  Masuk untuk Kelola Data
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateSection('dashboard')}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-300/40 bg-blue-900/30 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-900/50 whitespace-nowrap"
                >
                  Buka Dasbor Aktivitas
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200/80 bg-white p-6 text-slate-900 shadow-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Target Proyek
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-700 dark:bg-slate-300" />
                  <span>Mengenal Laravel dan Blade</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-700 dark:bg-slate-300" />
                  <span>Mengelola data sekolah</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-700 dark:bg-slate-300" />
                  <span>Menggunakan database lokal &amp; MySQL</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-700 dark:bg-slate-300" />
                  <span>Membangun aplikasi CRUD real-time</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Modules Grid */}
      <section id="fitur-proyek" className="mt-10 scroll-mt-20">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Fitur yang Akan Dibuat
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Berikut modul yang dibangun secara bertahap dan kini tersinkronisasi real-time di
              server lokal. Klik kartu modul untuk membukanya.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={mod.onClick}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
            >
              <div>
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${mod.iconBg}`}
                >
                  {mod.icon}
                </div>
                <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-[#1D5497] dark:text-slate-100 dark:group-hover:text-blue-400">
                  {mod.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {mod.description}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs dark:border-slate-800">
                <div className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
                  <span>{mod.statusLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400">
                    {mod.countLabel}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 font-semibold text-[#1D5497] opacity-80 transition-opacity group-hover:opacity-100 dark:text-blue-400">
                  Buka
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
