<?php

use App\Http\Controllers\AcademicController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\PortalController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PortalController::class, 'index'])->name('portal');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/stream', [DashboardController::class, 'stream'])->name('dashboard.stream');

    Route::get('/akademik', [AcademicController::class, 'index'])->name('academic.index');

    Route::post('/akademik/jurusan', [AcademicController::class, 'storeJurusan'])->name('jurusan.store');
    Route::put('/akademik/jurusan/{jurusan}', [AcademicController::class, 'updateJurusan'])->name('jurusan.update');
    Route::delete('/akademik/jurusan/{jurusan}', [AcademicController::class, 'destroyJurusan'])->name('jurusan.destroy');

    Route::post('/akademik/kelas', [AcademicController::class, 'storeKelas'])->name('kelas.store');
    Route::put('/akademik/kelas/{kelas}', [AcademicController::class, 'updateKelas'])->name('kelas.update');
    Route::delete('/akademik/kelas/{kelas}', [AcademicController::class, 'destroyKelas'])->name('kelas.destroy');

    Route::post('/akademik/siswa', [AcademicController::class, 'storeSiswa'])->name('siswa.store');
    Route::put('/akademik/siswa/{siswa}', [AcademicController::class, 'updateSiswa'])->name('siswa.update');
    Route::delete('/akademik/siswa/{siswa}', [AcademicController::class, 'destroySiswa'])->name('siswa.destroy');

    Route::post('/akademik/guru', [AcademicController::class, 'storeGuru'])->name('guru.store');
    Route::put('/akademik/guru/{guru}', [AcademicController::class, 'updateGuru'])->name('guru.update');
    Route::delete('/akademik/guru/{guru}', [AcademicController::class, 'destroyGuru'])->name('guru.destroy');

    Route::post('/akademik/mapel', [AcademicController::class, 'storeMapel'])->name('mapel.store');
    Route::put('/akademik/mapel/{mapel}', [AcademicController::class, 'updateMapel'])->name('mapel.update');
    Route::delete('/akademik/mapel/{mapel}', [AcademicController::class, 'destroyMapel'])->name('mapel.destroy');

    Route::get('/pengguna', [UserController::class, 'index'])->name('users.index');
    Route::patch('/pengguna/{user}', [UserController::class, 'update'])->name('users.update');

    Route::get('/export/{type}/excel', [ExportController::class, 'exportExcel'])->name('export.excel');
    Route::get('/export/{type}/pdf', [ExportController::class, 'exportPdf'])->name('export.pdf');
});
