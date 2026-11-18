<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Guru;
use App\Models\Jurusan;
use App\Models\Kelas;
use App\Models\MataPelajaran;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Http\Request;

class ExportController extends Controller
{
    private function resolveDataset(string $type): array
    {
        return match ($type) {
            'activities' => [
                'title' => 'Laporan Aktivitas Pengguna Terperinci',
                'headers' => ['Waktu', 'Pengguna', 'Email', 'Peran', 'Aksi', 'Modul', 'Deskripsi', 'Durasi (ms)'],
                'rows' => ActivityLog::orderByDesc('created_at')->limit(300)->get()->map(fn ($a) => [
                    $a->created_at?->format('d/m/Y H:i:s'),
                    $a->user_name,
                    $a->user_email,
                    $a->user_role,
                    $a->action,
                    $a->module,
                    $a->description,
                    $a->duration_ms,
                ])->toArray(),
            ],
            'jurusan' => [
                'title' => 'Daftar Jurusan Sekolah',
                'headers' => ['Kode', 'Nama Jurusan', 'Kaprodi', 'Kuota', 'Deskripsi'],
                'rows' => Jurusan::orderBy('kode')->get()->map(fn ($j) => [
                    $j->kode, $j->nama, $j->kaprodi, $j->kuota, $j->deskripsi,
                ])->toArray(),
            ],
            'kelas' => [
                'title' => 'Daftar Kelas Akademik',
                'headers' => ['Nama Kelas', 'Tingkat', 'Jurusan', 'Wali Kelas', 'Kapasitas', 'Tahun Ajaran'],
                'rows' => Kelas::with('jurusan')->orderBy('nama')->get()->map(fn ($k) => [
                    $k->nama, $k->tingkat, $k->jurusan?->nama ?? '-', $k->wali_kelas, $k->kapasitas, $k->tahun_ajaran,
                ])->toArray(),
            ],
            'siswa' => [
                'title' => 'Daftar Siswa Terdaftar',
                'headers' => ['NIS', 'Nama Siswa', 'Kelas', 'L/P', 'Email', 'Status', 'Nilai Rata'],
                'rows' => Siswa::with('kelas')->orderBy('nama')->get()->map(fn ($s) => [
                    $s->nis, $s->nama, $s->kelas?->nama ?? '-', $s->jenis_kelamin, $s->email, $s->status, $s->nilai_rata,
                ])->toArray(),
            ],
            'guru' => [
                'title' => 'Daftar Tenaga Pengajar (Guru)',
                'headers' => ['NIP', 'Nama Guru', 'Bidang Studi', 'Email', 'No. Telepon', 'Status'],
                'rows' => Guru::orderBy('nama')->get()->map(fn ($g) => [
                    $g->nip, $g->nama, $g->bidang_studi, $g->email, $g->no_telp, $g->status,
                ])->toArray(),
            ],
            'mapel' => [
                'title' => 'Daftar Mata Pelajaran',
                'headers' => ['Kode', 'Mata Pelajaran', 'Jurusan', 'Guru Pengampu', 'Tingkat', 'JP/Minggu'],
                'rows' => MataPelajaran::with(['jurusan', 'guru'])->orderBy('kode')->get()->map(fn ($m) => [
                    $m->kode, $m->nama, $m->jurusan?->nama ?? 'Umum', $m->guru?->nama ?? '-', $m->tingkat, $m->jam_per_minggu,
                ])->toArray(),
            ],
            'users' => [
                'title' => 'Direktori Pengguna Sistem',
                'headers' => ['Nama', 'Email', 'Peran', 'Status', 'Login Terakhir'],
                'rows' => User::orderByDesc('created_at')->get()->map(fn ($u) => [
                    $u->name, $u->email, $u->role, $u->status, $u->last_login_at?->format('d/m/Y H:i') ?? 'Belum pernah',
                ])->toArray(),
            ],
            default => abort(404),
        };
    }

    public function exportExcel(Request $request, string $type)
    {
        $dataset = $this->resolveDataset($type);
        ActivityLog::record('EXPORT', 'Laporan', "Mengekspor {$dataset['title']} ke format Excel (.xls)", $type, ['rows' => count($dataset['rows'])], $request);

        $filename = "laporan-{$type}-".now()->format('Y-m-d').'.xls';

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
        $xml .= '<Worksheet ss:Name="Laporan"><Table>';
        $xml .= '<Row>';
        foreach ($dataset['headers'] as $h) {
            $xml .= '<Cell><Data ss:Type="String">'.htmlspecialchars((string) $h, ENT_XML1).'</Data></Cell>';
        }
        $xml .= '</Row>';
        foreach ($dataset['rows'] as $row) {
            $xml .= '<Row>';
            foreach ($row as $cell) {
                $isNum = is_int($cell) || is_float($cell);
                $typeAttr = $isNum ? 'Number' : 'String';
                $xml .= '<Cell><Data ss:Type="'.$typeAttr.'">'.htmlspecialchars((string) $cell, ENT_XML1).'</Data></Cell>';
            }
            $xml .= '</Row>';
        }
        $xml .= '</Table></Worksheet></Workbook>';

        return response($xml, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function exportPdf(Request $request, string $type)
    {
        $dataset = $this->resolveDataset($type);
        ActivityLog::record('EXPORT', 'Laporan', "Mengekspor {$dataset['title']} ke format PDF", $type, ['rows' => count($dataset['rows'])], $request);

        return view('exports.pdf', [
            'title' => $dataset['title'],
            'headers' => $dataset['headers'],
            'rows' => $dataset['rows'],
        ]);
    }
}
