import React, { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AcademicTab,
  Guru,
  Jurusan,
  Kelas,
  MataPelajaran,
  Siswa,
  User,
} from '../types';
import { exportToExcel, exportToPdf, type ExportColumn } from '../utils/exportReport';

interface AcademicViewProps {
  activeTab: AcademicTab;
  onChangeTab: (tab: AcademicTab) => void;
  jurusan: Jurusan[];
  kelas: Kelas[];
  siswa: Siswa[];
  guru: Guru[];
  mataPelajaran: MataPelajaran[];
  authToken: string;
  currentUser: User;
  onRefreshData: () => Promise<void>;
}

const TAB_LABELS: Array<{ id: AcademicTab; label: string }> = [
  { id: 'jurusan', label: 'Data Jurusan' },
  { id: 'kelas', label: 'Data Kelas' },
  { id: 'siswa', label: 'Data Siswa' },
  { id: 'guru', label: 'Data Guru' },
  { id: 'mapel', label: 'Mata Pelajaran' },
];

export const AcademicView: React.FC<AcademicViewProps> = ({
  activeTab,
  onChangeTab,
  jurusan,
  kelas,
  siswa,
  guru,
  mataPelajaran,
  authToken,
  currentUser,
  onRefreshData,
}) => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const apiBase = useMemo(() => {
    switch (activeTab) {
      case 'jurusan':
        return '/api/jurusan';
      case 'kelas':
        return '/api/kelas';
      case 'siswa':
        return '/api/siswa';
      case 'guru':
        return '/api/guru';
      case 'mapel':
        return '/api/mata-pelajaran';
    }
  }, [activeTab]);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (activeTab === 'jurusan') {
      return jurusan.filter(
        (j) =>
          !q ||
          j.kode.toLowerCase().includes(q) ||
          j.nama.toLowerCase().includes(q) ||
          j.kaprodi.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'kelas') {
      return kelas.filter(
        (k) =>
          !q ||
          k.nama.toLowerCase().includes(q) ||
          k.wali_kelas.toLowerCase().includes(q) ||
          (k.jurusan_nama ?? '').toLowerCase().includes(q)
      );
    }
    if (activeTab === 'siswa') {
      return siswa.filter(
        (s) =>
          !q ||
          s.nis.toLowerCase().includes(q) ||
          s.nama.toLowerCase().includes(q) ||
          (s.kelas_nama ?? '').toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'guru') {
      return guru.filter(
        (g) =>
          !q ||
          g.nip.toLowerCase().includes(q) ||
          g.nama.toLowerCase().includes(q) ||
          g.bidang_studi.toLowerCase().includes(q)
      );
    }
    return mataPelajaran.filter(
      (m) =>
        !q ||
        m.kode.toLowerCase().includes(q) ||
        m.nama.toLowerCase().includes(q) ||
        (m.guru_nama ?? '').toLowerCase().includes(q)
    );
  }, [activeTab, jurusan, kelas, siswa, guru, mataPelajaran, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setErrorMsg(null);
    if (activeTab === 'jurusan') {
      setFormState({ kode: '', nama: '', kaprodi: '', deskripsi: '', kuota: 72 });
    } else if (activeTab === 'kelas') {
      setFormState({
        nama: '',
        tingkat: 'XI',
        jurusan_id: jurusan[0]?.id ?? '',
        wali_kelas: guru[0]?.nama ?? '',
        kapasitas: 36,
        tahun_ajaran: '2026/2027',
      });
    } else if (activeTab === 'siswa') {
      setFormState({
        nis: '',
        nama: '',
        kelas_id: kelas[0]?.id ?? '',
        jenis_kelamin: 'L',
        email: '',
        status: 'Aktif',
        nilai_rata: 86,
      });
    } else if (activeTab === 'guru') {
      setFormState({
        nip: '',
        nama: '',
        bidang_studi: '',
        email: '',
        no_telp: '',
        status: 'Aktif',
      });
    } else {
      setFormState({
        kode: '',
        nama: '',
        jurusan_id: jurusan[0]?.id ?? '',
        guru_id: guru[0]?.id ?? '',
        jam_per_minggu: 4,
        tingkat: 'XI',
      });
    }
    setModalOpen(true);
  };

  const openEditModal = (item: Record<string, unknown>) => {
    setEditingId(String(item.id));
    setErrorMsg(null);
    const next: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(item)) {
      if (v !== null && v !== undefined && (typeof v === 'string' || typeof v === 'number')) {
        next[k] = v;
      } else if (v === null) {
        next[k] = '';
      }
    }
    setFormState(next);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const url = editingId ? `${apiBase}/${editingId}` : apiBase;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(formState),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menyimpan data.');
        setSaving(false);
        return;
      }
      await onRefreshData();
      setModalOpen(false);
    } catch {
      setErrorMsg('Gagal terhubung ke server lokal.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        await onRefreshData();
      }
    } catch {
      // Ignore network errors cleanly
    }
  };

  const getExportSpec = (): { title: string; columns: ExportColumn[]; rows: Record<string, unknown>[] } => {
    if (activeTab === 'jurusan') {
      return {
        title: 'Daftar Jurusan Sekolah',
        columns: [
          { header: 'Kode', key: 'kode' },
          { header: 'Nama Jurusan', key: 'nama' },
          { header: 'Kepala Program', key: 'kaprodi' },
          { header: 'Kuota', key: 'kuota' },
          { header: 'Deskripsi', key: 'deskripsi' },
        ],
        rows: filteredData as unknown as Record<string, unknown>[],
      };
    }
    if (activeTab === 'kelas') {
      return {
        title: 'Daftar Kelas Akademik',
        columns: [
          { header: 'Nama Kelas', key: 'nama' },
          { header: 'Tingkat', key: 'tingkat' },
          { header: 'Jurusan', key: 'jurusan_nama' },
          { header: 'Wali Kelas', key: 'wali_kelas' },
          { header: 'Kapasitas', key: 'kapasitas' },
          { header: 'Tahun Ajaran', key: 'tahun_ajaran' },
        ],
        rows: filteredData as unknown as Record<string, unknown>[],
      };
    }
    if (activeTab === 'siswa') {
      return {
        title: 'Daftar Siswa Terdaftar',
        columns: [
          { header: 'NIS', key: 'nis' },
          { header: 'Nama Siswa', key: 'nama' },
          { header: 'Kelas', key: 'kelas_nama' },
          { header: 'L/P', key: 'jenis_kelamin' },
          { header: 'Email', key: 'email' },
          { header: 'Status', key: 'status' },
          { header: 'Rata-rata Nilai', key: 'nilai_rata' },
        ],
        rows: filteredData as unknown as Record<string, unknown>[],
      };
    }
    if (activeTab === 'guru') {
      return {
        title: 'Daftar Tenaga Pengajar (Guru)',
        columns: [
          { header: 'NIP', key: 'nip' },
          { header: 'Nama Guru', key: 'nama' },
          { header: 'Bidang Studi', key: 'bidang_studi' },
          { header: 'Email', key: 'email' },
          { header: 'No. Telepon', key: 'no_telp' },
          { header: 'Status', key: 'status' },
        ],
        rows: filteredData as unknown as Record<string, unknown>[],
      };
    }
    return {
      title: 'Daftar Mata Pelajaran',
      columns: [
        { header: 'Kode', key: 'kode' },
        { header: 'Mata Pelajaran', key: 'nama' },
        { header: 'Jurusan', key: 'jurusan_nama' },
        { header: 'Guru Pengampu', key: 'guru_nama' },
        { header: 'Tingkat', key: 'tingkat' },
        { header: 'Jam/Minggu', key: 'jam_per_minggu' },
      ],
      rows: filteredData as unknown as Record<string, unknown>[],
    };
  };

  const logExport = async (format: 'PDF' | 'EXCEL', scope: string, rowCount: number) => {
    try {
      await fetch('/api/activities/export-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ format, scope, rowCount }),
      });
    } catch {
      // Non-blocking
    }
  };

  const handleExportPdf = () => {
    const spec = getExportSpec();
    exportToPdf({
      title: spec.title,
      subtitle: 'Laporan Resmi Data Akademik Sekolah',
      filename: `${activeTab}-${new Date().toISOString().slice(0, 10)}`,
      generatedBy: currentUser.name,
      columns: spec.columns,
      rows: spec.rows,
    });
    logExport('PDF', spec.title, spec.rows.length);
  };

  const handleExportExcel = () => {
    const spec = getExportSpec();
    exportToExcel({
      sheetName: spec.title,
      filename: `${activeTab}-${new Date().toISOString().slice(0, 10)}`,
      columns: spec.columns,
      rows: spec.rows,
    });
    logExport('EXCEL', spec.title, spec.rows.length);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Pengelolaan Data Akademik (CRUD)
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Seluruh perubahan data langsung tersimpan ke SQLite lokal dan disinkronkan secara
            real-time.
          </p>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              onChangeTab(tab.id);
              setSearch('');
            }}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#1D5497] text-white dark:bg-blue-600'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Data Card */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center dark:border-slate-800">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari data..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none sm:w-64 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Ekspor Excel
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D5497] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#17437A] whitespace-nowrap dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Tambah Data
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                {activeTab === 'jurusan' && (
                  <>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Nama Jurusan</th>
                    <th className="px-4 py-3">Kepala Program</th>
                    <th className="px-4 py-3 text-right">Kuota</th>
                    <th className="px-4 py-3">Deskripsi</th>
                  </>
                )}
                {activeTab === 'kelas' && (
                  <>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Tingkat</th>
                    <th className="px-4 py-3">Jurusan</th>
                    <th className="px-4 py-3">Wali Kelas</th>
                    <th className="px-4 py-3 text-right">Kapasitas</th>
                    <th className="px-4 py-3">Tahun Ajaran</th>
                  </>
                )}
                {activeTab === 'siswa' && (
                  <>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">Nama Siswa</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">L/P</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Nilai Rata</th>
                  </>
                )}
                {activeTab === 'guru' && (
                  <>
                    <th className="px-4 py-3">NIP</th>
                    <th className="px-4 py-3">Nama Guru</th>
                    <th className="px-4 py-3">Bidang Studi</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">No. Telepon</th>
                    <th className="px-4 py-3">Status</th>
                  </>
                )}
                {activeTab === 'mapel' && (
                  <>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Mata Pelajaran</th>
                    <th className="px-4 py-3">Jurusan</th>
                    <th className="px-4 py-3">Guru Pengampu</th>
                    <th className="px-4 py-3">Tingkat</th>
                    <th className="px-4 py-3 text-right">JP / Minggu</th>
                  </>
                )}
                <th className="px-4 py-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Belum ada data yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const rec = row as unknown as Record<string, unknown>;
                  return (
                    <tr
                      key={String(rec.id)}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      {activeTab === 'jurusan' && (
                        <>
                          <td className="px-4 py-3 font-mono font-semibold text-[#1D5497] dark:text-blue-400">
                            {String(rec.kode)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {String(rec.nama)}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {String(rec.kaprodi)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {String(rec.kuota)}
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                            {String(rec.deskripsi)}
                          </td>
                        </>
                      )}

                      {activeTab === 'kelas' && (
                        <>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {String(rec.nama)}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                            {String(rec.tingkat)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {String(rec.jurusan_nama ?? '-')}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {String(rec.wali_kelas)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {String(rec.kapasitas)}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {String(rec.tahun_ajaran)}
                          </td>
                        </>
                      )}

                      {activeTab === 'siswa' && (
                        <>
                          <td className="px-4 py-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {String(rec.nis)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {String(rec.nama)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {String(rec.kelas_nama ?? '-')}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                            {String(rec.jenis_kelamin)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {String(rec.email)}
                          </td>
                          <td className="px-4 py-3 font-medium text-emerald-700 dark:text-emerald-400">
                            {String(rec.status)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                            {Number(rec.nilai_rata).toFixed(1)}
                          </td>
                        </>
                      )}

                      {activeTab === 'guru' && (
                        <>
                          <td className="px-4 py-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {String(rec.nip)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {String(rec.nama)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {String(rec.bidang_studi)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {String(rec.email)}
                          </td>
                          <td className="px-4 py-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {String(rec.no_telp)}
                          </td>
                          <td className="px-4 py-3 font-medium text-emerald-700 dark:text-emerald-400">
                            {String(rec.status)}
                          </td>
                        </>
                      )}

                      {activeTab === 'mapel' && (
                        <>
                          <td className="px-4 py-3 font-mono font-semibold text-[#1D5497] dark:text-blue-400">
                            {String(rec.kode)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            {String(rec.nama)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {String(rec.jurusan_nama ?? 'Umum')}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {String(rec.guru_nama ?? '-')}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                            {String(rec.tingkat)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {String(rec.jam_per_minggu)} JP
                          </td>
                        </>
                      )}

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(rec)}
                            title="Ubah data"
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(String(rec.id))}
                            title="Hapus data"
                            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                {editingId ? 'Perbarui Data' : 'Tambah Data Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 p-6 text-xs">
              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
                  {errorMsg}
                </div>
              )}

              {activeTab === 'jurusan' && (
                <>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Kode Jurusan
                    </label>
                    <input
                      required
                      value={String(formState.kode ?? '')}
                      onChange={(e) => setFormState({ ...formState, kode: e.target.value })}
                      placeholder="Contoh: RPL/PPLG"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Nama Jurusan
                    </label>
                    <input
                      required
                      value={String(formState.nama ?? '')}
                      onChange={(e) => setFormState({ ...formState, nama: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Kepala Program Studi
                    </label>
                    <input
                      required
                      value={String(formState.kaprodi ?? '')}
                      onChange={(e) => setFormState({ ...formState, kaprodi: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Kuota Siswa
                    </label>
                    <input
                      type="number"
                      required
                      value={Number(formState.kuota ?? 36)}
                      onChange={(e) =>
                        setFormState({ ...formState, kuota: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Deskripsi
                    </label>
                    <textarea
                      rows={2}
                      value={String(formState.deskripsi ?? '')}
                      onChange={(e) => setFormState({ ...formState, deskripsi: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </>
              )}

              {activeTab === 'kelas' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Nama Kelas
                      </label>
                      <input
                        required
                        value={String(formState.nama ?? '')}
                        onChange={(e) => setFormState({ ...formState, nama: e.target.value })}
                        placeholder="XI RPL 3"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Tingkat
                      </label>
                      <select
                        value={String(formState.tingkat ?? 'XI')}
                        onChange={(e) => setFormState({ ...formState, tingkat: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="X">X</option>
                        <option value="XI">XI</option>
                        <option value="XII">XII</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Jurusan
                    </label>
                    <select
                      required
                      value={String(formState.jurusan_id ?? '')}
                      onChange={(e) => setFormState({ ...formState, jurusan_id: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {jurusan.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.kode} — {j.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Wali Kelas
                    </label>
                    <input
                      required
                      value={String(formState.wali_kelas ?? '')}
                      onChange={(e) => setFormState({ ...formState, wali_kelas: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Kapasitas
                      </label>
                      <input
                        type="number"
                        required
                        value={Number(formState.kapasitas ?? 36)}
                        onChange={(e) =>
                          setFormState({ ...formState, kapasitas: Number(e.target.value) })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Tahun Ajaran
                      </label>
                      <input
                        required
                        value={String(formState.tahun_ajaran ?? '2026/2027')}
                        onChange={(e) =>
                          setFormState({ ...formState, tahun_ajaran: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'siswa' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        NIS
                      </label>
                      <input
                        required
                        value={String(formState.nis ?? '')}
                        onChange={(e) => setFormState({ ...formState, nis: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Jenis Kelamin
                      </label>
                      <select
                        value={String(formState.jenis_kelamin ?? 'L')}
                        onChange={(e) =>
                          setFormState({ ...formState, jenis_kelamin: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="L">Laki-laki (L)</option>
                        <option value="P">Perempuan (P)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Nama Siswa
                    </label>
                    <input
                      required
                      value={String(formState.nama ?? '')}
                      onChange={(e) => setFormState({ ...formState, nama: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Kelas
                    </label>
                    <select
                      required
                      value={String(formState.kelas_id ?? '')}
                      onChange={(e) => setFormState({ ...formState, kelas_id: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {kelas.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Email Siswa
                    </label>
                    <input
                      type="email"
                      required
                      value={String(formState.email ?? '')}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Status
                      </label>
                      <select
                        value={String(formState.status ?? 'Aktif')}
                        onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Cuti">Cuti</option>
                        <option value="Lulus">Lulus</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Rata-rata Nilai
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={Number(formState.nilai_rata ?? 85)}
                        onChange={(e) =>
                          setFormState({ ...formState, nilai_rata: Number(e.target.value) })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'guru' && (
                <>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      NIP
                    </label>
                    <input
                      required
                      value={String(formState.nip ?? '')}
                      onChange={(e) => setFormState({ ...formState, nip: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Nama Guru
                    </label>
                    <input
                      required
                      value={String(formState.nama ?? '')}
                      onChange={(e) => setFormState({ ...formState, nama: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Bidang Studi
                    </label>
                    <input
                      required
                      value={String(formState.bidang_studi ?? '')}
                      onChange={(e) =>
                        setFormState({ ...formState, bidang_studi: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={String(formState.email ?? '')}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        No. Telepon
                      </label>
                      <input
                        value={String(formState.no_telp ?? '')}
                        onChange={(e) => setFormState({ ...formState, no_telp: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Status
                      </label>
                      <select
                        value={String(formState.status ?? 'Aktif')}
                        onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Cuti">Cuti</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'mapel' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Kode Mapel
                      </label>
                      <input
                        required
                        value={String(formState.kode ?? '')}
                        onChange={(e) => setFormState({ ...formState, kode: e.target.value })}
                        placeholder="PWL-11"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Tingkat
                      </label>
                      <select
                        value={String(formState.tingkat ?? 'XI')}
                        onChange={(e) => setFormState({ ...formState, tingkat: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="X">X</option>
                        <option value="XI">XI</option>
                        <option value="XII">XII</option>
                        <option value="Semua">Semua</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Nama Mata Pelajaran
                    </label>
                    <input
                      required
                      value={String(formState.nama ?? '')}
                      onChange={(e) => setFormState({ ...formState, nama: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                      Jurusan Terkait
                    </label>
                    <select
                      value={String(formState.jurusan_id ?? '')}
                      onChange={(e) => setFormState({ ...formState, jurusan_id: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">Umum (Semua Jurusan)</option>
                      {jurusan.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.kode} — {j.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Guru Pengampu
                      </label>
                      <select
                        value={String(formState.guru_id ?? '')}
                        onChange={(e) => setFormState({ ...formState, guru_id: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="">Belum ditentukan</option>
                        {guru.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
                        Jam / Minggu
                      </label>
                      <input
                        type="number"
                        required
                        value={Number(formState.jam_per_minggu ?? 4)}
                        onChange={(e) =>
                          setFormState({ ...formState, jam_per_minggu: Number(e.target.value) })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#1D5497] px-4 py-2 font-semibold text-white hover:bg-[#17437A] disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
