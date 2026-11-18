# Manajemen Sekolah — Proyek Kelas XI RPL/PPLG (Laravel / PHP)

Folder `laravel/` ini berisi implementasi penuh berbasis **PHP 8.2+ & Laravel 11** yang dapat dijalankan secara lokal menggunakan Laragon, XAMPP, atau PHP CLI.

## Fitur yang Tersedia
1. **Sistem Login & Registrasi** (`AuthController`) dengan hashing kata sandi Bcrypt dan sesi database.
2. **Database Lokal Real-Time** (SQLite / MySQL) dengan sinkronisasi pemantauan aktivitas via **Server-Sent Events (SSE)** di `/dashboard/stream`.
3. **Dasbor Interaktif** (`DashboardController`) untuk memantau aktivitas pengguna, sesi aktif, distribusi modul, dan log terperinci.
4. **CRUD Lengkap**: Data Jurusan, Data Kelas, Data Siswa, Data Guru, dan Mata Pelajaran (`AcademicController`).
5. **Ekspor Laporan PDF & Excel** (`ExportController`) ke format `.xls` (SpreadsheetML) dan laporan PDF siap cetak.
6. **Mode Terang & Mode Gelap** dengan penyimpanan preferensi di `localStorage`.
7. **UI & Tombol Asisten AI** di pojok kanan bawah (`layouts/app.blade.php`) — tampilan antarmuka siap pakai tanpa logika AI backend.

## Cara Menjalankan di Komputer Lokal (PHP + Composer)
```bash
cd laravel
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed
php artisan serve
```

Lalu buka `http://127.0.0.1:8000` di browser Anda.

### Akun Demo
- **Admin**: `admin@smk.belajar.id` / `password123`
- **Guru**: `budi.santoso@smk.belajar.id` / `password123`
- **Siswa**: `zhariif.khayran20@smk.belajar.id` / `password123`
