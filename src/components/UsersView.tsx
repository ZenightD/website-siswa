import React, { useState } from 'react';
import { Shield, Download, FileSpreadsheet } from 'lucide-react';
import type { User, UserRole } from '../types';
import { exportToExcel, exportToPdf } from '../utils/exportReport';

interface UsersViewProps {
  users: User[];
  currentUser: User;
  authToken: string;
  onRefreshData: () => Promise<void>;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  currentUser,
  authToken,
  onRefreshData,
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleUpdateUser = async (
    targetId: string,
    patch: { role?: UserRole; status?: 'active' | 'inactive' }
  ) => {
    setUpdatingId(targetId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/users/${targetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data.error || 'Gagal memperbarui akun pengguna.');
      } else {
        await onRefreshData();
      }
    } catch {
      setFeedback('Gagal terhubung ke server lokal.');
    } finally {
      setUpdatingId(null);
    }
  };

  const logExport = async (format: 'PDF' | 'EXCEL') => {
    try {
      await fetch('/api/activities/export-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          format,
          scope: 'Direktori Pengguna Sistem',
          rowCount: users.length,
        }),
      });
    } catch {
      // Non-blocking
    }
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: 'Daftar Pengguna Database Lokal',
      subtitle: 'Akun Terdaftar & Riwayat Masuk Terakhir',
      filename: `pengguna-${new Date().toISOString().slice(0, 10)}`,
      generatedBy: currentUser.name,
      columns: [
        { header: 'Nama', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Peran', key: 'role' },
        { header: 'Status', key: 'status' },
        { header: 'Login Terakhir', key: 'last_login' },
      ],
      rows: users.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status === 'active' ? 'Aktif' : 'Nonaktif',
        last_login: u.last_login_at
          ? new Date(u.last_login_at).toLocaleString('id-ID')
          : 'Belum pernah',
      })),
    });
    logExport('PDF');
  };

  const handleExportExcel = () => {
    exportToExcel({
      sheetName: 'Daftar Pengguna',
      filename: `pengguna-${new Date().toISOString().slice(0, 10)}`,
      columns: [
        { header: 'Nama', key: 'name' },
        { header: 'Email', key: 'email' },
        { header: 'Peran', key: 'role' },
        { header: 'Status', key: 'status' },
        { header: 'Login Terakhir', key: 'last_login' },
      ],
      rows: users.map((u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        last_login: u.last_login_at
          ? new Date(u.last_login_at).toLocaleString('id-ID')
          : 'Belum pernah',
      })),
    });
    logExport('EXCEL');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Database Pengguna &amp; Hak Akses
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola akun terdaftar di server SQLite lokal. Perubahan peran langsung disinkronkan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            Ekspor PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D5497] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#17437A] whitespace-nowrap dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Ekspor Excel
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300">
          {feedback}
        </div>
      )}

      {currentUser.role !== 'admin' && (
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Shield className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            Anda masuk sebagai <strong className="font-semibold">{currentUser.role}</strong>. Hanya
            administrator sekolah yang dapat mengubah peran atau menonaktifkan akun lain.
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                <th className="px-4 py-3">Nama Pengguna</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Login Terakhir</th>
                <th className="px-4 py-3">Terdaftar Sejak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                const canEdit = currentUser.role === 'admin' && !isSelf;
                return (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span
                          style={{ backgroundColor: u.avatar_color }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          {u.name}
                          {isSelf && (
                            <span className="ml-1.5 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              (Anda)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <select
                          aria-label={`Peran ${u.name}`}
                          disabled={updatingId === u.id}
                          value={u.role}
                          onChange={(e) =>
                            handleUpdateUser(u.id, { role: e.target.value as UserRole })
                          }
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <option value="admin">admin</option>
                          <option value="guru">guru</option>
                          <option value="siswa">siswa</option>
                        </select>
                      ) : (
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <button
                          type="button"
                          disabled={updatingId === u.id}
                          onClick={() =>
                            handleUpdateUser(u.id, {
                              status: u.status === 'active' ? 'inactive' : 'active',
                            })
                          }
                          className={`font-semibold underline-offset-2 hover:underline ${
                            u.status === 'active'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </button>
                      ) : (
                        <span
                          className={`font-semibold ${
                            u.status === 'active'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString('id-ID')
                        : 'Belum ada sesi'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
