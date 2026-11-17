<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Guru;
use App\Models\Jurusan;
use App\Models\Kelas;
use App\Models\MataPelajaran;
use App\Models\Siswa;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (User::count() > 0) {
            return;
        }

        $password = Hash::make('password123');

        $admin = User::create([
            'name' => 'Drs. Hendra Wijaya',
            'email' => 'admin@smk.belajar.id',
            'password' => $password,
            'role' => 'admin',
            'avatar_color' => '#1D5497',
            'status' => 'active',
            'last_login_at' => now()->subMinutes(15),
        ]);

        $guruUser = User::create([
            'name' => 'Budi Santoso, S.Kom.',
            'email' => 'budi.santoso@smk.belajar.id',
            'password' => $password,
            'role' => 'guru',
            'avatar_color' => '#0F766E',
            'status' => 'active',
            'last_login_at' => now()->subMinutes(40),
        ]);

        $siswaUser = User::create([
            'name' => 'Zhariif Khayran',
            'email' => 'zhariif.khayran20@smk.belajar.id',
            'password' => $password,
            'role' => 'siswa',
            'avatar_color' => '#4338CA',
            'status' => 'active',
            'last_login_at' => now()->subMinutes(5),
        ]);

        $rpl = Jurusan::create([
            'kode' => 'RPL/PPLG',
            'nama' => 'Rekayasa Perangkat Lunak',
            'kaprodi' => 'Budi Santoso, S.Kom.',
            'deskripsi' => 'Pengembangan aplikasi web Laravel, Blade, basis data MySQL/SQLite, dan CRUD.',
            'kuota' => 108,
        ]);

        $tkj = Jurusan::create([
            'kode' => 'TKJ/TJKT',
            'nama' => 'Teknik Komputer dan Jaringan',
            'kaprodi' => 'Rizky Pratama, S.T.',
            'deskripsi' => 'Administrasi server Linux, routing jaringan enterprise, dan keamanan lokal.',
            'kuota' => 72,
        ]);

        $dkv = Jurusan::create([
            'kode' => 'DKV',
            'nama' => 'Desain Komunikasi Visual',
            'kaprodi' => 'Nadia Kusuma, S.Sn.',
            'deskripsi' => 'Desain antarmuka UI/UX, tipografi digital, dan produksi multimedia.',
            'kuota' => 72,
        ]);

        $k11rpl1 = Kelas::create([
            'nama' => 'XI RPL 1',
            'tingkat' => 'XI',
            'jurusan_id' => $rpl->id,
            'wali_kelas' => 'Budi Santoso, S.Kom.',
            'kapasitas' => 36,
            'tahun_ajaran' => '2026/2027',
        ]);

        $k11rpl2 = Kelas::create([
            'nama' => 'XI RPL 2',
            'tingkat' => 'XI',
            'jurusan_id' => $rpl->id,
            'wali_kelas' => 'Ahmad Fauzi, S.Kom.',
            'kapasitas' => 36,
            'tahun_ajaran' => '2026/2027',
        ]);

        Kelas::create([
            'nama' => 'XI TKJ 1',
            'tingkat' => 'XI',
            'jurusan_id' => $tkj->id,
            'wali_kelas' => 'Rizky Pratama, S.T.',
            'kapasitas' => 36,
            'tahun_ajaran' => '2026/2027',
        ]);

        Kelas::create([
            'nama' => 'XI DKV 1',
            'tingkat' => 'XI',
            'jurusan_id' => $dkv->id,
            'wali_kelas' => 'Nadia Kusuma, S.Sn.',
            'kapasitas' => 36,
            'tahun_ajaran' => '2026/2027',
        ]);

        $g1 = Guru::create([
            'nip' => '198504122010011004',
            'nama' => 'Budi Santoso, S.Kom.',
            'bidang_studi' => 'Pemrograman Web & Laravel',
            'email' => 'budi.santoso@smk.belajar.id',
            'no_telp' => '0812-3456-7890',
            'status' => 'Aktif',
        ]);

        $g2 = Guru::create([
            'nip' => '198907212014022001',
            'nama' => 'Siti Aminah, M.Pd.',
            'bidang_studi' => 'Basis Data & MySQL',
            'email' => 'siti.aminah@smk.belajar.id',
            'no_telp' => '0813-4567-8901',
            'status' => 'Aktif',
        ]);

        Siswa::create([
            'nis' => '242511001',
            'nama' => 'Zhariif Khayran',
            'kelas_id' => $k11rpl1->id,
            'jenis_kelamin' => 'L',
            'email' => 'zhariif.khayran20@smk.belajar.id',
            'status' => 'Aktif',
            'nilai_rata' => 92.4,
        ]);

        Siswa::create([
            'nis' => '242511002',
            'nama' => 'Alya Putri Maharani',
            'kelas_id' => $k11rpl1->id,
            'jenis_kelamin' => 'P',
            'email' => 'alya.putri@smk.belajar.id',
            'status' => 'Aktif',
            'nilai_rata' => 90.8,
        ]);

        Siswa::create([
            'nis' => '242511003',
            'nama' => 'Dimas Bagus Prasetyo',
            'kelas_id' => $k11rpl2->id,
            'jenis_kelamin' => 'L',
            'email' => 'dimas.bagus@smk.belajar.id',
            'status' => 'Aktif',
            'nilai_rata' => 87.5,
        ]);

        MataPelajaran::create([
            'kode' => 'PWL-11',
            'nama' => 'Pemrograman Web & Blade Laravel',
            'jurusan_id' => $rpl->id,
            'guru_id' => $g1->id,
            'jam_per_minggu' => 8,
            'tingkat' => 'XI',
        ]);

        MataPelajaran::create([
            'kode' => 'BDS-11',
            'nama' => 'Basis Data Relasional MySQL',
            'jurusan_id' => $rpl->id,
            'guru_id' => $g2->id,
            'jam_per_minggu' => 6,
            'tingkat' => 'XI',
        ]);

        ActivityLog::record('LOGIN', 'Auth', 'Administrator masuk ke sistem Laravel Manajemen Sekolah', (string) $admin->id, ['role' => 'admin'], null, $admin, 18);
        ActivityLog::record('UPDATE', 'Mata Pelajaran', 'Memperbarui jam pelajaran Pemrograman Web & Blade Laravel', '1', ['kode' => 'PWL-11'], null, $guruUser, 14);
        ActivityLog::record('CREATE', 'Siswa', 'Menambahkan data siswa Zhariif Khayran (XI RPL 1)', '1', ['nis' => '242511001'], null, $admin, 16);
        ActivityLog::record('LOGIN', 'Auth', 'Siswa Zhariif Khayran masuk ke portal proyek XI RPL', (string) $siswaUser->id, ['role' => 'siswa'], null, $siswaUser, 12);
    }
}
