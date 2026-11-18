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
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $moduleFilter = $request->query('module', 'ALL');
        $actionFilter = $request->query('action', 'ALL');
        $search = trim((string) $request->query('q', ''));

        $query = ActivityLog::query()->orderByDesc('created_at');
        if ($moduleFilter !== 'ALL') {
            $query->where('module', $moduleFilter);
        }
        if ($actionFilter !== 'ALL') {
            $query->where('action', $actionFilter);
        }
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                  ->orWhere('user_email', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('module', 'like', "%{$search}%");
            });
        }

        $activities = $query->limit(150)->get();

        $counts = [
            'jurusan' => Jurusan::count(),
            'kelas' => Kelas::count(),
            'siswa' => Siswa::count(),
            'guru' => Guru::count(),
            'mapel' => MataPelajaran::count(),
            'users' => User::count(),
            'total_activities' => ActivityLog::count(),
            'today_activities' => ActivityLog::whereDate('created_at', today())->count(),
        ];

        $byModule = ActivityLog::select('module', DB::raw('COUNT(*) as total'))
            ->groupBy('module')
            ->orderByDesc('total')
            ->get();

        // Active sessions in last 15 minutes from sessions table
        $onlineSessions = DB::table('sessions')
            ->join('users', 'users.id', '=', 'sessions.user_id')
            ->where('sessions.last_activity', '>=', now()->subMinutes(15)->timestamp)
            ->select('users.name', 'users.email', 'users.role', 'sessions.last_activity')
            ->orderByDesc('sessions.last_activity')
            ->get();

        $modules = ActivityLog::distinct()->pluck('module');
        $actions = ActivityLog::distinct()->pluck('action');

        return view('dashboard', compact(
            'activities',
            'counts',
            'byModule',
            'onlineSessions',
            'modules',
            'actions',
            'moduleFilter',
            'actionFilter',
            'search'
        ));
    }

    /**
     * Real-time Server-Sent Events (SSE) stream untuk sinkronisasi database lokal secara real-time di PHP/Laravel.
     */
    public function stream()
    {
        return response()->stream(function () {
            $lastId = (int) (ActivityLog::max('id') ?? 0);
            $start = time();

            while (time() - $start < 25) {
                if (connection_aborted()) {
                    break;
                }

                $newLogs = ActivityLog::where('id', '>', $lastId)
                    ->orderBy('id', 'asc')
                    ->get();

                if ($newLogs->isNotEmpty()) {
                    $lastId = (int) $newLogs->last()->id;
                    $payload = [
                        'logs' => $newLogs,
                        'total_activities' => ActivityLog::count(),
                        'today_activities' => ActivityLog::whereDate('created_at', today())->count(),
                    ];
                    echo "event: sync\n";
                    echo 'data: '.json_encode($payload)."\n\n";
                } else {
                    echo ": heartbeat\n\n";
                }

                @ob_flush();
                @flush();
                sleep(2);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
