<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Guru;
use App\Models\Jurusan;
use App\Models\Kelas;
use App\Models\MataPelajaran;
use App\Models\Siswa;
use Illuminate\Http\Request;

class AcademicController extends Controller
{
    public function index(Request $request)
    {
        $tab = $request->query('tab', 'siswa');
        $q = trim((string) $request->query('q', ''));

        $jurusan = Jurusan::when($q && $tab === 'jurusan', fn ($qr) => $qr->where('nama', 'like', "%$q%")->orWhere('kode', 'like', "%$q%"))
            ->orderBy('kode')->get();
        $kelas = Kelas::with('jurusan')
            ->when($q && $tab === 'kelas', fn ($qr) => $qr->where('nama', 'like', "%$q%")->orWhere('wali_kelas', 'like', "%$q%"))
            ->orderBy('tingkat')->orderBy('nama')->get();
        $siswa = Siswa::with('kelas')
            ->when($q && $tab === 'siswa', fn ($qr) => $qr->where('nama', 'like', "%$q%")->orWhere('nis', 'like', "%$q%"))
            ->orderBy('nama')->get();
        $guru = Guru::when($q && $tab === 'guru', fn ($qr) => $qr->where('nama', 'like', "%$q%")->orWhere('bidang_studi', 'like', "%$q%"))
            ->orderBy('nama')->get();
        $mapel = MataPelajaran::with(['jurusan', 'guru'])
            ->when($q && $tab === 'mapel', fn ($qr) => $qr->where('nama', 'like', "%$q%")->orWhere('kode', 'like', "%$q%"))
            ->orderBy('kode')->get();

        $allJurusan = Jurusan::orderBy('kode')->get();
        $allKelas = Kelas::orderBy('nama')->get();
        $allGuru = Guru::orderBy('nama')->get();

        return view('academic.index', compact(
            'tab', 'q', 'jurusan', 'kelas', 'siswa', 'guru', 'mapel',
            'allJurusan', 'allKelas', 'allGuru'
        ));
    }

    public function storeJurusan(Request $request)
    {
        $data = $request->validate([
            'kode' => ['required', 'string', 'max:20', 'unique:jurusan,kode'],
            'nama' => ['required', 'string', 'max:120'],
            'kaprodi' => ['required', 'string', 'max:120'],
            'kuota' => ['required', 'integer', 'min:1'],
            'deskripsi' => ['nullable', 'string'],
        ]);
        $data['kode'] = strtoupper(trim($data['kode']));
        $item = Jurusan::create($data);
        ActivityLog::record('CREATE', 'Jurusan', "Menambahkan jurusan {$item->kode} — {$item->nama}", (string) $item->id, $data, $request);
        return redirect()->route('academic.index', ['tab' => 'jurusan'])->with('success', 'Data jurusan berhasil ditambahkan.');
    }

    public function updateJurusan(Request $request, Jurusan $jurusan)
    {
        $data = $request->validate([
            'kode' => ['required', 'string', 'max:20', 'unique:jurusan,kode,'.$jurusan->id],
            'nama' => ['required', 'string', 'max:120'],
            'kaprodi' => ['required', 'string', 'max:120'],
            'kuota' => ['required', 'integer', 'min:1'],
            'deskripsi' => ['nullable', 'string'],
        ]);
        $data['kode'] = strtoupper(trim($data['kode']));
        $jurusan->update($data);
        ActivityLog::record('UPDATE', 'Jurusan', "Memperbarui jurusan {$jurusan->kode} — {$jurusan->nama}", (string) $jurusan->id, $data, $request);
        return redirect()->route('academic.index', ['tab' => 'jurusan'])->with('success', 'Data jurusan berhasil diperbarui.');
    }

    public function destroyJurusan(Request $request, Jurusan $jurusan)
    {
        $label = "{$jurusan->kode} — {$jurusan->nama}";
        $id = (string) $jurusan->id;
        $jurusan->delete();
        ActivityLog::record('DELETE', 'Jurusan', "Menghapus jurusan {$label}", $id, null, $request);
        return redirect()->route('academic.index', ['tab' => 'jurusan'])->with('success', 'Data jurusan berhasil dihapus.');
    }

    public function storeKelas(Request $request)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:60', 'unique:kelas,nama'],
            'tingkat' => ['required', 'in:X,XI,XII'],
            'jurusan_id' => ['required', 'exists:jurusan,id'],
            'wali_kelas' => ['required', 'string', 'max:120'],
            'kapasitas' => ['required', 'integer', 'min:1'],
            'tahun_ajaran' => ['required', 'string', 'max:20'],
        ]);
        $item = Kelas::create($data);
        ActivityLog::record('CREATE', 'Kelas', "Menambahkan kelas {$item->nama}", (string) $item->id, $data, $request);
        return redirect()->route('academic.index', ['tab' => 'kelas'])->with('success', 'Data kelas berhasil ditambahkan.');
    }

    public function updateKelas(Request $request, Kelas $kelas)
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:60', 'unique:kelas,nama,'.$kelas->id],
            'tingkat' => ['required', 'in:X,XI,XII'],
            'jurusan_id' => ['required', 'exists:jurusan,id'],
            'wali_kelas' => ['required', 'string', 'max:120'],
            'kapasitas' => ['required', 'integer', 'min:1'],
            'tahun_ajaran' => ['required', 'string', 'max:20'],
        ]);
        $kelas->update($data);
        ActivityLog::record('UPDATE', 'Kelas', "Memperbarui kelas {$kelas->nama}", (string) $kelas->id, $data, $request);
        return redirect()->route('academic.index', ['tab' => 'kelas'])->with('success', 'Data kelas berhasil diperbarui.');
    }

    public function destroyKelas(Request $request, Kelas $kelas)
    {
        $nama = $kelas->nama;
        $id = (string) $kelas->id;
        $kelas->delete();
        ActivityLog::record('DELETE', 'Kelas', "Menghapus kelas {$nama}", $id, null, $request);
        return redirect()->route('academic.index', ['tab' => 'kelas'])->with('success', 'Data kelas berhasil dihapus.');
    }

    public function storeSiswa(Request $request)
    {
        $data = $request->validate([
            'nis' => ['required', 'string', 'max:30', 'unique:siswa,nis'],
            'nama' => ['required', 'string', 'max:120'],
            'kelas_id' => ['required', 'exists:kelas,id'],
            'jenis_kelamin' => ['required', 'in:L,P'],
            'email' => ['required', 'email'],
            'status' => ['required', 'in:Aktif,Cuti,Lulus'],
            'nilai_rata' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);
        $item = Siswa::create($data);
        ActivityLog::record('CREATE', 'Siswa', "Menambahkan siswa {$item->nama} (NIS: {$item->nis})", (string) $item->id, $data, $request);
        return redirect()->route('academic.index', ['tab' => 'siswa'])->with('success', 'Data siswa berhasil ditambahkan.');
    }

    public function updateSiswa(Request $request, Siswa $siswa)
    {
        $data = $request->validate([
            'nis' => ['required', 'string', 'max:30', 'unique:siswa,nis,'.$siswa->id],
            'nama' => ['required', 'string', 'max:120'],
            'kelas_id' => ['required', 'exists:kelas,id'],
            'jenis_kelamin' => ['required', 'in:L,P'],
            'email' => ['required', 'email'],
            'status' => ['required', 'in:Aktif,Cuti,Lulus'],
            'nilai_rata' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);
        $siswa->update($data);
        ActivityLog::record('UPDATE', 'Siswa', "Memperbarui data siswa {$siswa->nama}", (string) $siswa->id, $data, $request);
        return redirect()->route('academic.index', ['tab' => 'siswa'])->with('success', 'Data siswa berhasil diperbarui.');
    }

    public function destroySiswa(Request $request, Siswa $siswa)
    {
        $label = "{$siswa->nama} ({$siswa->nis})";
        $id = (string) $siswa->id;
        $siswa->delete();
        ActivityLog::record('DELETE', 'Siswa', "Menghapus siswa {$label}", $id, null, $request);
        return redirect()->route('academic.index', ['tab' => 'siswa'])->with('success', 'Data siswa berhasil dihapus.');
    }

    public function storeGuru(Request $request)
    {
        $data = $request->validate([
            'nip' => ['required', 'string', 'max:30', 'unique:guru,nip'],
            'nama' => ['required', 'string', 'max:120'],
            'bidang_studi' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email'],
            'no_telp' => ['nullable', 'string', 'max:30'],
            'status' => ['required', 'in:Aktif,Cuti'],
        ]);
        $data['no_telp'] = $data['no_telp'] ?: '-';
        $item = Guru::create($data);
        ActivityLog::record('CREATE', 'Guru', "Menambahkan guru {$item->nama}", (string) $item->id, $data, $request);
        return redirect()->route('academic.index', ['tab' => 'guru'])->with('success', 'Data guru berhasil ditambahkan.');
    }

    public function updateGuru(Request $request, Guru $guru)
    {
        $data = $request->validate([
            'nip' => ['required', 'string', 'max:30', 'unique:guru,nip,'.$guru->id],
            'nama' => ['required', 'string', 'max:120'],
            'bidang_studi' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email'],
            'no_telp' => ['nullable', 'string', 'max:30'],
            'status' => ['required', 'in:Aktif,Cuti'],
        ]);
        $guru->update($data);
        ActivityLog::record('UPDATE', 'Guru', "Memperbarui guru {$guru->nama}", (string) $guru->id, $data, $request);
        return redirect()->route('academic.index', ['tab' => 'guru'])->with('success', 'Data guru berhasil diperbarui.');
    }

    public function destroyGuru(Request $request, Guru $guru)
    {
        $nama = $guru->nama;
        $id = (string) $guru->id;
        $guru->delete();
        ActivityLog::record('DELETE', 'Guru', "Menghapus guru {$nama}", $id, null, $request);
        return redirect()->route('academic.index', ['tab' => 'guru'])->with('success', 'Data guru berhasil dihapus.');
    }

    public function storeMapel(Request $request)
    {
        $data = $request->validate([
            'kode' => ['required', 'string', 'max:20', 'unique:mata_pelajaran,kode'],
            'nama' => ['required', 'string', 'max:140'],
            'jurusan_id' => ['nullable', 'exists:jurusan,id'],
            'guru_id' => ['nullable', 'exists:guru,id'],
            'jam_per_minggu' => ['required', 'integer', 'min:1'],
            'tingkat' => ['required', 'in:X,XI,XII,Semua'],
        ]);
        $data['kode'] = strtoupper(trim($data['kode']));
        $item = MataPelajaran::create($data);
        ActivityLog::record('CREATE', 'Mata Pelajaran', "Menambahkan mata pelajaran {$item->kode} — {$item->nama}", (string) $item->id, $data, $request);
        return redirect()->route('academic.index', ['tab' => 'mapel'])->with('success', 'Mata pelajaran berhasil ditambahkan.');
    }

    public function updateMapel(Request $request, MataPelajaran $mapel)
    {
        $data = $request->validate([
            'kode' => ['required', 'string', 'max:20', 'unique:mata_pelajaran,kode,'.$mapel->id],
            'nama' => ['required', 'string', 'max:140'],
            'jurusan_id' => ['nullable', 'exists:jurusan,id'],
            'guru_id' => ['nullable', 'exists:guru,id'],
            'jam_per_minggu' => ['required', 'integer', 'min:1'],
            'tingkat' => ['required', 'in:X,XI,XII,Semua'],
        ]);
        $data['kode'] = strtoupper(trim($data['kode']));
        $mapel->update($data);
        ActivityLog::record('UPDATE', 'Mata Pelajaran', "Memperbarui mata pelajaran {$mapel->nama}", (string) $mapel->id, $data, $request);
        return redirect()->route('academic.index', ['tab' => 'mapel'])->with('success', 'Mata pelajaran berhasil diperbarui.');
    }

    public function destroyMapel(Request $request, MataPelajaran $mapel)
    {
        $label = "{$mapel->kode} — {$mapel->nama}";
        $id = (string) $mapel->id;
        $mapel->delete();
        ActivityLog::record('DELETE', 'Mata Pelajaran', "Menghapus mata pelajaran {$label}", $id, null, $request);
        return redirect()->route('academic.index', ['tab' => 'mapel'])->with('success', 'Mata pelajaran berhasil dihapus.');
    }
}
