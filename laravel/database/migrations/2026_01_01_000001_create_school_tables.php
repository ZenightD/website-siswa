<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jurusan', function (Blueprint $table) {
            $table->id();
            $table->string('kode')->unique();
            $table->string('nama');
            $table->string('kaprodi');
            $table->text('deskripsi')->nullable();
            $table->integer('kuota')->default(36);
            $table->timestamps();
        });

        Schema::create('kelas', function (Blueprint $table) {
            $table->id();
            $table->string('nama')->unique();
            $table->enum('tingkat', ['X', 'XI', 'XII'])->default('XI');
            $table->foreignId('jurusan_id')->constrained('jurusan')->cascadeOnDelete();
            $table->string('wali_kelas');
            $table->integer('kapasitas')->default(36);
            $table->string('tahun_ajaran')->default('2026/2027');
            $table->timestamps();
        });

        Schema::create('guru', function (Blueprint $table) {
            $table->id();
            $table->string('nip')->unique();
            $table->string('nama');
            $table->string('bidang_studi');
            $table->string('email');
            $table->string('no_telp')->default('-');
            $table->enum('status', ['Aktif', 'Cuti'])->default('Aktif');
            $table->timestamps();
        });

        Schema::create('siswa', function (Blueprint $table) {
            $table->id();
            $table->string('nis')->unique();
            $table->string('nama');
            $table->foreignId('kelas_id')->constrained('kelas')->cascadeOnDelete();
            $table->enum('jenis_kelamin', ['L', 'P'])->default('L');
            $table->string('email');
            $table->enum('status', ['Aktif', 'Cuti', 'Lulus'])->default('Aktif');
            $table->decimal('nilai_rata', 5, 2)->default(85.00);
            $table->timestamps();
        });

        Schema::create('mata_pelajaran', function (Blueprint $table) {
            $table->id();
            $table->string('kode')->unique();
            $table->string('nama');
            $table->foreignId('jurusan_id')->nullable()->constrained('jurusan')->nullOnDelete();
            $table->foreignId('guru_id')->nullable()->constrained('guru')->nullOnDelete();
            $table->integer('jam_per_minggu')->default(4);
            $table->enum('tingkat', ['X', 'XI', 'XII', 'Semua'])->default('XI');
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name');
            $table->string('user_email');
            $table->string('user_role');
            $table->string('action');
            $table->string('module');
            $table->string('target_id')->nullable();
            $table->text('description');
            $table->json('metadata_json')->nullable();
            $table->string('ip_address')->default('127.0.0.1');
            $table->string('user_agent')->default('Web Client');
            $table->integer('duration_ms')->default(10);
            $table->timestamps();

            $table->index(['created_at', 'module', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('mata_pelajaran');
        Schema::dropIfExists('siswa');
        Schema::dropIfExists('guru');
        Schema::dropIfExists('kelas');
        Schema::dropIfExists('jurusan');
    }
};
