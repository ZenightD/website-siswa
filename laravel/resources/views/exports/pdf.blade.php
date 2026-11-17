<!doctype html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }} — Manajemen Sekolah</title>
    <style>
        body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
        .header { background: #1d5497; color: #fff; padding: 16px 20px; border-radius: 8px; margin-bottom: 16px; }
        .header h1 { margin: 0; font-size: 18px; }
        .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }
        .meta { font-size: 11px; color: #475569; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #1d5497; color: #fff; text-align: left; padding: 8px; }
        td { border-bottom: 1px solid #e2e8f0; padding: 7px 8px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .no-print { margin-bottom: 16px; }
        @media print { .no-print { display: none; } body { margin: 0; } }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()" style="padding: 8px 14px; background: #1d5497; color: #fff; border: 0; border-radius: 6px; cursor: pointer;">
            Simpan sebagai PDF / Cetak
        </button>
    </div>

    <div class="header">
        <h1>Manajemen Sekolah — Proyek Kelas XI RPL/PPLG</h1>
        <p>{{ $title }}</p>
    </div>

    <div class="meta">
        Dicetak pada: {{ now()->format('d/m/Y H:i:s') }} · Total baris: {{ count($rows) }}
    </div>

    <table>
        <thead>
            <tr>
                @foreach ($headers as $h)
                    <th>{{ $h }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $row)
                <tr>
                    @foreach ($row as $cell)
                        <td>{{ $cell }}</td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
    </table>

    <script>window.addEventListener('load', function () { window.print(); });</script>
</body>
</html>
