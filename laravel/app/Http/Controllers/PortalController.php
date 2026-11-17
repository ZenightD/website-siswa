<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Guru;
use App\Models\Jurusan;
use App\Models\Kelas;
use App\Models\MataPelajaran;
use App\Models\Siswa;

class PortalController extends Controller
{
    public function index()
    {
        $counts = [
            'jurusan' => Jurusan::count(),
            'kelas' => Kelas::count(),
            'siswa' => Siswa::count(),
            'guru' => Guru::count(),
            'mapel' => MataPelajaran::count(),
            'activities' => ActivityLog::count(),
        ];

        return view('portal', compact('counts'));
    }
}
