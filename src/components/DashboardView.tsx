import React, { useMemo, useState } from 'react';
import {
  Activity,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  Search,
  Users,
  Clock,
  X,
  Wifi,
  WifiOff,
  ChevronRight,
} from 'lucide-react';
import type {
  ActivityAction,
  ActivityLog,
  DashboardAnalytics,
  OnlineUser,
  User,
} from '../types';
import { exportToExcel, exportToPdf } from '../utils/exportReport';

interface DashboardViewProps {
  analytics: DashboardAnalytics | null;
  activities: ActivityLog[];
  onlineUsers: OnlineUser[];
  wsConnected: boolean;
  currentUser: User;
  authToken: string;
}

const ACTION_COLOR_MAP: Record<ActivityAction, string> = {
  LOGIN: 'text-emerald-700 dark:text-emerald-400',
  LOGOUT: 'text-slate-600 dark:text-slate-400',
  REGISTER: 'text-blue-700 dark:text-blue-400',
  CREATE: 'text-indigo-700 dark:text-indigo-400',
  UPDATE: 'text-amber-700 dark:text-amber-400',
  DELETE: 'text-rose-700 dark:text-rose-400',
  VIEW: 'text-slate-600 dark:text-slate-400',
  EXPORT: 'text-teal-700 dark:text-teal-400',
  AI_CHAT: 'text-violet-700 dark:text-violet-400',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  activities,
  onlineUsers,
  wsConnected,
  currentUser,
  authToken,
}) => {
  const [chartRange, setChartRange] = useState<'hourly' | 'daily'>('hourly');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const uniqueModules = useMemo(() => {
    const set = new Set(activities.map((a) => a.module));
    return ['ALL', ...Array.from(set)];
  }, [activities]);

  const uniqueActions = useMemo(() => {
    const set = new Set(activities.map((a) => a.action));
    return ['ALL', ...Array.from(set)];
  }, [activities]);

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities.filter((item) => {
      if (moduleFilter !== 'ALL' && item.module !== moduleFilter) return false;
      if (actionFilter !== 'ALL' && item.action !== actionFilter) return false;
      if (!q) return true;
      return (
        item.user_name.toLowerCase().includes(q) ||
        item.user_email.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.module.toLowerCase().includes(q) ||
        item.action.toLowerCase().includes(q)
      );
    });
  }, [activities, moduleFilter, actionFilter, searchQuery]);

  const chartSeries = useMemo(() => {
    if (!analytics) return [];
    if (chartRange === 'hourly') {
      return analytics.hourlyActivity.map((h) => ({ label: h.hour, value: h.count }));
    }
    return analytics.dailyActivity.map((d) => ({ label: d.label, value: d.count }));
  }, [analytics, chartRange]);

  const maxChartVal = useMemo(
    () => Math.max(1, ...chartSeries.map((c) => c.value)),
    [chartSeries]
  );

  const maxModuleCount = useMemo(
    () => Math.max(1, ...(analytics?.byModule.map((m) => m.count) ?? [1])),
    [analytics]
  );

  const totalAcademicEntities = analytics
    ? analytics.counts.siswa +
      analytics.counts.guru +
      analytics.counts.kelas +
      analytics.counts.jurusan +
      analytics.counts.mata_pelajaran
    : 0;

  const logExportEvent = async (format: 'PDF' | 'EXCEL', rowCount: number) => {
    try {
      await fetch('/api/activities/export-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          format,
          scope: 'Log Aktivitas Pengguna',
          rowCount,
        }),
      });
    } catch {
      // Non-blocking audit log
    }
  };

  const handleExportPdf = () => {
    const rows = filteredActivities.map((a) => ({
      waktu: new Date(a.created_at).toLocaleString('id-ID'),
      pengguna: a.user_name,
      peran: a.user_role,
      aksi: a.action,
      modul: a.module,
      deskripsi: a.description,
      durasi: `${a.duration_ms} ms`,
    }));
    exportToPdf({
      title: 'Laporan Aktivitas Pengguna Terperinci',
      subtitle: `Filter Modul: ${moduleFilter} · Filter Aksi: ${actionFilter}`,
      filename: `laporan-aktivitas-${new Date().toISOString().slice(0, 10)}`,
      generatedBy: currentUser.name,
      columns: [
        { header: 'Waktu', key: 'waktu' },
        { header: 'Pengguna', key: 'pengguna' },
        { header: 'Peran', key: 'peran' },
        { header: 'Aksi', key: 'aksi' },
        { header: 'Modul', key: 'modul' },
        { header: 'Deskripsi Aktivitas', key: 'deskripsi' },
        { header: 'Durasi', key: 'durasi' },
      ],
      rows,
    });
    logExportEvent('PDF', rows.length);
  };

  const handleExportExcel = () => {
    const rows = filteredActivities.map((a) => ({
      waktu: new Date(a.created_at).toLocaleString('id-ID'),
      pengguna: a.user_name,
      email: a.user_email,
      peran: a.user_role,
      aksi: a.action,
      modul: a.module,
      deskripsi: a.description,
      ip: a.ip_address,
      durasi_ms: a.duration_ms,
    }));
    exportToExcel({
      sheetName: 'Aktivitas Pengguna',
      filename: `laporan-aktivitas-${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Waktu', key: 'waktu' },
        { header: 'Nama Pengguna', key: 'pengguna' },
        { header: 'Email', key: 'email' },
        { header: 'Peran', key: 'peran' },
        { header: 'Aksi', key: 'aksi' },
        { header: 'Modul', key: 'modul' },
        { header: 'Deskripsi', key: 'deskripsi' },
        { header: 'Alamat IP', key: 'ip' },
        { header: 'Durasi (ms)', key: 'durasi_ms' },
      ],
      rows,
    });
    logExportEvent('EXCEL', rows.length);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Dasbor Pemantauan Aktivitas Pengguna
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pemantauan interaksi database lokal secara real-time, kehadiran aktif, dan audit log
            mendalam.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {wsConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Sinkronisasi Real-Time Aktif</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Menyambung Ulang...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Aktivitas</span>
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {analytics?.counts.total_activities ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
              {analytics?.counts.today_activities ?? 0}
            </span>{' '}
            aktivitas tercatat hari ini
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Sesi Online Real-Time</span>
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {onlineUsers.length}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Terhubung via WebSocket lokal
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Entitas Data Akademik</span>
            <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {totalAcademicEntities}
          </div>
          <p className="mt-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {analytics?.counts.siswa ?? 0} siswa · {analytics?.counts.guru ?? 0} guru ·{' '}
            {analytics?.counts.kelas ?? 0} kelas
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Pengguna Terdaftar</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {analytics?.counts.users ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            SQLite WAL tersinkron otomatis
          </p>
        </div>
      </div>

      {/* Charts & Online Presence Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Interactive Timeline Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Grafik Tren Aktivitas Pengguna
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arahkan kursor pada batang grafik untuk melihat jumlah kejadian
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setChartRange('hourly')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  chartRange === 'hourly'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                12 Jam Terakhir
              </button>
              <button
                type="button"
                onClick={() => setChartRange('daily')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  chartRange === 'daily'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                7 Hari Terakhir
              </button>
            </div>
          </div>

          <div className="relative h-56 w-full">
            <div className="flex h-48 items-end justify-between gap-1.5 border-b border-slate-200 pb-2 dark:border-slate-800">
              {chartSeries.map((pt, idx) => {
                const heightPct = Math.max(6, Math.round((pt.value / maxChartVal) * 100));
                const isHovered = hoveredIdx === idx;
                return (
                  <div
                    key={pt.label}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  >
                    {isHovered && (
                      <div className="absolute -top-7 z-10 rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white shadow-sm whitespace-nowrap dark:bg-slate-100 dark:text-slate-900">
                        {pt.value} aksi
                      </div>
                    )}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[34px] rounded-t-md transition-colors duration-150 ${
                        pt.value === 0
                          ? 'bg-slate-100 dark:bg-slate-800/70'
                          : isHovered
                          ? 'bg-[#1D5497] dark:bg-blue-400'
                          : 'bg-blue-500/80 dark:bg-blue-500/70'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-1 text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {chartSeries.map((pt) => (
                <span key={pt.label} className="flex-1 truncate text-center">
                  {pt.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Module Breakdown + Real-time Presence */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Interactive Module Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Aktivitas per Modul
              </h2>
              {moduleFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setModuleFilter('ALL')}
                  className="text-xs font-medium text-[#1D5497] hover:underline dark:text-blue-400"
                >
                  Reset Filter
                </button>
              )}
            </div>
            <div className="space-y-2.5">
              {(analytics?.byModule ?? []).slice(0, 6).map((item) => {
                const widthPct = Math.max(8, Math.round((item.count / maxModuleCount) * 100));
                const isSelected = moduleFilter === item.module;
                return (
                  <button
                    key={item.module}
                    type="button"
                    onClick={() =>
                      setModuleFilter((prev) => (prev === item.module ? 'ALL' : item.module))
                    }
                    className={`block w-full rounded-lg p-1.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {item.module}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full rounded-full bg-[#1D5497] dark:bg-blue-500"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Presence List */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Pengguna Aktif Saat Ini
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Diperbarui otomatis saat pengguna berpindah halaman
            </p>
            <div className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
              {onlineUsers.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Belum ada koneksi aktif.
                </p>
              ) : (
                onlineUsers.map((ou) => (
                  <div
                    key={ou.clientId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-800 dark:text-slate-100">
                        {ou.name}
                      </div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {ou.role} · Membuka: {ou.currentModule}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {new Date(ou.connectedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Activity Log Table */}
      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center dark:border-slate-800">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Log Aktivitas Pengguna Terperinci
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan{' '}
              <span className="font-mono font-semibold tabular-nums">
                {filteredActivities.length}
              </span>{' '}
              rekaman aktivitas. Klik baris untuk inspeksi metadata.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari aktivitas..."
                className="w-48 rounded-lg border border-slate-300 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none sm:w-56 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                aria-label="Filter modul"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {uniqueModules.map((m) => (
                  <option key={m} value={m}>
                    {m === 'ALL' ? 'Semua Modul' : m}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter aksi"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {uniqueActions.map((a) => (
                  <option key={a} value={a}>
                    {a === 'ALL' ? 'Semua Aksi' : a}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              Ekspor PDF
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D5497] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#17437A] whitespace-nowrap dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Ekspor Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Modul</th>
                <th className="px-4 py-3">Deskripsi Aktivitas</th>
                <th className="px-4 py-3 text-right">Durasi</th>
                <th className="px-4 py-3 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Tidak ada rekaman aktivitas yang sesuai filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-mono text-[11px] tabular-nums whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {log.user_name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {log.user_role} · {log.user_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`font-mono text-[11px] font-semibold ${
                          ACTION_COLOR_MAP[log.action] ?? 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                      {log.module}
                    </td>
                    <td className="max-w-md px-4 py-3 text-slate-600 dark:text-slate-300">
                      {log.description}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] tabular-nums whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {log.duration_ms} ms
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Activity Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Inspeksi Detail Aktivitas
                </h3>
                <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  ID: {selectedLog.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-6 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Pengguna</span>
                  <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                    {selectedLog.user_name} ({selectedLog.user_role})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Waktu Kejadian</span>
                  <p className="mt-0.5 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {new Date(selectedLog.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Modul &amp; Aksi</span>
                  <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                    {selectedLog.module} · {selectedLog.action}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Alamat IP &amp; Latensi</span>
                  <p className="mt-0.5 font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {selectedLog.ip_address} · {selectedLog.duration_ms} ms
                  </p>
                </div>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400">Deskripsi</span>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200">
                  {selectedLog.description}
                </p>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400">Agen Peramban</span>
                <p className="mt-0.5 truncate font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  {selectedLog.user_agent}
                </p>
              </div>

              {selectedLog.metadata_json && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Payload Metadata</span>
                  <pre className="mt-1 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-slate-900 p-3 font-mono text-[11px] text-slate-100 dark:border-slate-800">
                    {JSON.stringify(JSON.parse(selectedLog.metadata_json), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
