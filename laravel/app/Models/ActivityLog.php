<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    protected $fillable = [
        'user_id',
        'user_name',
        'user_email',
        'user_role',
        'action',
        'module',
        'target_id',
        'description',
        'metadata_json',
        'ip_address',
        'user_agent',
        'duration_ms',
    ];

    protected function casts(): array
    {
        return [
            'metadata_json' => 'array',
        ];
    }

    public static function record(
        string $action,
        string $module,
        string $description,
        ?string $targetId = null,
        ?array $metadata = null,
        ?Request $request = null,
        ?User $userOverride = null,
        int $durationMs = 12
    ): self {
        $user = $userOverride ?? Auth::user();
        $req = $request ?? request();

        return self::create([
            'user_id' => $user?->id,
            'user_name' => $user?->name ?? 'Pengguna Tamu',
            'user_email' => $user?->email ?? 'guest@local',
            'user_role' => $user?->role ?? 'guest',
            'action' => $action,
            'module' => $module,
            'target_id' => $targetId,
            'description' => $description,
            'metadata_json' => $metadata,
            'ip_address' => $req?->ip() ?? '127.0.0.1',
            'user_agent' => substr((string) ($req?->userAgent() ?? 'Web Client'), 0, 120),
            'duration_ms' => $durationMs,
        ]);
    }
}
