import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  ActivityAction,
  ActivityLog,
  ActivityModule,
  DashboardAnalytics,
  DatabaseStatus,
  Guru,
  Jurusan,
  Kelas,
  MataPelajaran,
  PersistedChatMessage,
  Siswa,
  User,
  UserRole,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DB_PATH = path.join(DATA_DIR, 'manajemen_sekolah.db');
export const BACKUP_PATH = path.join(DATA_DIR, 'backup_snapshot.json');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA busy_timeout = 5000;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA synchronous = FULL;');
try {
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
} catch {
  // Ignore if not previously in WAL mode
}
db.exec('PRAGMA journal_mode = DELETE;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'guru', 'siswa')),
    avatar_color TEXT NOT NULL DEFAULT '#1D5497',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    last_login_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS jurusan (
    id TEXT PRIMARY KEY,
    kode TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    kaprodi TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    kuota INTEGER NOT NULL DEFAULT 36,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS kelas (
    id TEXT PRIMARY KEY,
    nama TEXT UNIQUE NOT NULL,
    tingkat TEXT NOT NULL CHECK(tingkat IN ('X', 'XI', 'XII')),
    jurusan_id TEXT NOT NULL,
    wali_kelas TEXT NOT NULL,
    kapasitas INTEGER NOT NULL DEFAULT 36,
    tahun_ajaran TEXT NOT NULL DEFAULT '2026/2027',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(jurusan_id) REFERENCES jurusan(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS siswa (
    id TEXT PRIMARY KEY,
    nis TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    kelas_id TEXT NOT NULL,
    jenis_kelamin TEXT NOT NULL CHECK(jenis_kelamin IN ('L', 'P')),
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Cuti', 'Lulus')),
    nilai_rata REAL NOT NULL DEFAULT 85.0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS guru (
    id TEXT PRIMARY KEY,
    nip TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    bidang_studi TEXT NOT NULL,
    email TEXT NOT NULL,
    no_telp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Cuti')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id TEXT PRIMARY KEY,
    kode TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    jurusan_id TEXT,
    guru_id TEXT,
    jam_per_minggu INTEGER NOT NULL DEFAULT 4,
    tingkat TEXT NOT NULL DEFAULT 'XI' CHECK(tingkat IN ('X', 'XI', 'XII', 'Semua')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(jurusan_id) REFERENCES jurusan(id) ON DELETE SET NULL,
    FOREIGN KEY(guru_id) REFERENCES guru(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    target_id TEXT,
    description TEXT NOT NULL,
    metadata_json TEXT,
    ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
    user_agent TEXT NOT NULL DEFAULT 'Browser',
    duration_ms INTEGER NOT NULL DEFAULT 12,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_activity_module ON activity_logs(module);
  CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created_at ASC);
`);

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const keyBuf = Buffer.from(key, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function recordActivity(input: {
  user?: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  action: ActivityAction;
  module: ActivityModule;
  targetId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
  createdAt?: string;
}): ActivityLog {
  const id = generateId('act');
  const createdAt = input.createdAt ?? new Date().toISOString();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;
  const userId = input.user?.id ?? null;
  const userName = input.user?.name ?? 'Pengguna Tamu';
  const userEmail = input.user?.email ?? 'guest@local';
  const userRole = input.user?.role ?? 'guest';
  const ipAddress = input.ipAddress ?? '127.0.0.1';
  const userAgent = input.userAgent ?? 'Web Client';
  const durationMs = input.durationMs ?? 8;

  db.prepare(`
    INSERT INTO activity_logs (
      id, user_id, user_name, user_email, user_role, action, module,
      target_id, description, metadata_json, ip_address, user_agent, duration_ms, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    userName,
    userEmail,
    userRole,
    input.action,
    input.module,
    input.targetId ?? null,
    input.description,
    metadataJson,
    ipAddress,
    userAgent,
    durationMs,
    createdAt
  );

  return {
    id,
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    user_role: userRole,
    action: input.action,
    module: input.module,
    target_id: input.targetId ?? null,
    description: input.description,
    metadata_json: metadataJson,
    ip_address: ipAddress,
    user_agent: userAgent,
    duration_ms: durationMs,
    created_at: createdAt,
  };
}

function seedInitialData() {
  const existingUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (existingUsers.cnt > 0) return;

  const now = Date.now();
  const isoAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  const defaultPass = hashPassword('password123');

  const users: Array<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar_color: string;
    last_login_at: string;
  }> = [
    {
      id: 'usr_admin01',
      name: 'Drs. Hendra Wijaya',
      email: 'admin@smk.belajar.id',
      role: 'admin',
      avatar_color: '#1D5497',
      last_login_at: isoAgo(18),
    },
    {
      id: 'usr_guru01',
      name: 'Budi Santoso, S.Kom.',
      email: 'budi.santoso@smk.belajar.id',
      role: 'guru',
      avatar_color: '#0F766E',
      last_login_at: isoAgo(42),
    },
    {
      id: 'usr_siswa01',
      name: 'Zhariif Khayran',
      email: 'zhariif.khayran20@smk.belajar.id',
      role: 'siswa',
      avatar_color: '#4338CA',
      last_login_at: isoAgo(5),
    },
    {
      id: 'usr_guru02',
      name: 'Siti Aminah, M.Pd.',
      email: 'siti.aminah@smk.belajar.id',
      role: 'guru',
      avatar_color: '#B45309',
      last_login_at: isoAgo(135),
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, avatar_color, status, last_login_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `);
  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, defaultPass, u.role, u.avatar_color, u.last_login_at, isoAgo(60 * 24 * 10));
  }

  const jurusanList = [
    {
      id: 'jur_rpl',
      kode: 'RPL/PPLG',
      nama: 'Rekayasa Perangkat Lunak',
      kaprodi: 'Budi Santoso, S.Kom.',
      deskripsi: 'Pengembangan aplikasi web Laravel, mobile, basis data MySQL/SQLite, dan rekayasa perangkat lunak modern.',
      kuota: 108,
    },
    {
      id: 'jur_tkj',
      kode: 'TKJ/TJKT',
      nama: 'Teknik Komputer dan Jaringan',
      kaprodi: 'Rizky Pratama, S.T.',
      deskripsi: 'Administrasi server Linux, routing jaringan enterprise, dan keamanan infrastruktur lokal.',
      kuota: 72,
    },
    {
      id: 'jur_dkv',
      kode: 'DKV',
      nama: 'Desain Komunikasi Visual',
      kaprodi: 'Nadia Kusuma, S.Sn.',
      deskripsi: 'Desain antarmuka UI/UX, tipografi digital, ilustrasi vektor, dan produksi multimedia.',
      kuota: 72,
    },
    {
      id: 'jur_akl',
      kode: 'AKL',
      nama: 'Akuntansi dan Keuangan Lembaga',
      kaprodi: 'Dra. Ratna Dewi',
      deskripsi: 'Sistem informasi akuntansi digital, pelaporan keuangan spreadsheet, dan audit administrasi.',
      kuota: 72,
    },
  ];

  const insertJurusan = db.prepare(`
    INSERT INTO jurusan (id, kode, nama, kaprodi, deskripsi, kuota, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const j of jurusanList) {
    insertJurusan.run(j.id, j.kode, j.nama, j.kaprodi, j.deskripsi, j.kuota, isoAgo(60 * 24 * 7), isoAgo(60 * 24));
  }

  const kelasList = [
    { id: 'kls_11rpl1', nama: 'XI RPL 1', tingkat: 'XI', jurusan_id: 'jur_rpl', wali_kelas: 'Budi Santoso, S.Kom.', kapasitas: 36 },
    { id: 'kls_11rpl2', nama: 'XI RPL 2', tingkat: 'XI', jurusan_id: 'jur_rpl', wali_kelas: 'Ahmad Fauzi, S.Kom.', kapasitas: 36 },
    { id: 'kls_10rpl1', nama: 'X PPLG 1', tingkat: 'X', jurusan_id: 'jur_rpl', wali_kelas: 'Siti Aminah, M.Pd.', kapasitas: 36 },
    { id: 'kls_11tkj1', nama: 'XI TKJ 1', tingkat: 'XI', jurusan_id: 'jur_tkj', wali_kelas: 'Rizky Pratama, S.T.', kapasitas: 36 },
    { id: 'kls_11dkv1', nama: 'XI DKV 1', tingkat: 'XI', jurusan_id: 'jur_dkv', wali_kelas: 'Nadia Kusuma, S.Sn.', kapasitas: 36 },
    { id: 'kls_12rpl1', nama: 'XII RPL 1', tingkat: 'XII', jurusan_id: 'jur_rpl', wali_kelas: 'Drs. Hendra Wijaya', kapasitas: 34 },
  ];

  const insertKelas = db.prepare(`
    INSERT INTO kelas (id, nama, tingkat, jurusan_id, wali_kelas, kapasitas, tahun_ajaran, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, '2026/2027', ?, ?)
  `);
  for (const k of kelasList) {
    insertKelas.run(k.id, k.nama, k.tingkat, k.jurusan_id, k.wali_kelas, k.kapasitas, isoAgo(60 * 24 * 6), isoAgo(60 * 12));
  }

  const guruList = [
    { id: 'gru_01', nip: '198504122010011004', nama: 'Budi Santoso, S.Kom.', bidang_studi: 'Pemrograman Web & Laravel', email: 'budi.santoso@smk.belajar.id', no_telp: '0812-3456-7890', status: 'Aktif' },
    { id: 'gru_02', nip: '198907212014022001', nama: 'Siti Aminah, M.Pd.', bidang_studi: 'Basis Data & SQL', email: 'siti.aminah@smk.belajar.id', no_telp: '0813-4567-8901', status: 'Aktif' },
    { id: 'gru_03', nip: '199103152016031002', nama: 'Ahmad Fauzi, S.Kom.', bidang_studi: 'Pemrograman Berorientasi Objek', email: 'ahmad.fauzi@smk.belajar.id', no_telp: '0815-6789-0123', status: 'Aktif' },
    { id: 'gru_04', nip: '198711082012121003', nama: 'Rizky Pratama, S.T.', bidang_studi: 'Administrasi Infrastruktur Jaringan', email: 'rizky.pratama@smk.belajar.id', no_telp: '0817-8901-2345', status: 'Aktif' },
    { id: 'gru_05', nip: '199305292019032006', nama: 'Nadia Kusuma, S.Sn.', bidang_studi: 'Desain Antarmuka UI/UX', email: 'nadia.kusuma@smk.belajar.id', no_telp: '0818-9012-3456', status: 'Aktif' },
    { id: 'gru_06', nip: '197802142006041008', nama: 'Drs. Hendra Wijaya', bidang_studi: 'Manajemen Proyek Perangkat Lunak', email: 'hendra.wijaya@smk.belajar.id', no_telp: '0811-2233-4455', status: 'Aktif' },
  ];

  const insertGuru = db.prepare(`
    INSERT INTO guru (id, nip, nama, bidang_studi, email, no_telp, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const g of guruList) {
    insertGuru.run(g.id, g.nip, g.nama, g.bidang_studi, g.email, g.no_telp, g.status, isoAgo(60 * 24 * 6), isoAgo(60 * 10));
  }

  const siswaList = [
    { id: 'sis_01', nis: '242511001', nama: 'Zhariif Khayran', kelas_id: 'kls_11rpl1', jenis_kelamin: 'L', email: 'zhariif.khayran20@smk.belajar.id', status: 'Aktif', nilai_rata: 92.4 },
    { id: 'sis_02', nis: '242511002', nama: 'Alya Putri Maharani', kelas_id: 'kls_11rpl1', jenis_kelamin: 'P', email: 'alya.putri@smk.belajar.id', status: 'Aktif', nilai_rata: 90.8 },
    { id: 'sis_03', nis: '242511003', nama: 'Dimas Bagus Prasetyo', kelas_id: 'kls_11rpl1', jenis_kelamin: 'L', email: 'dimas.bagus@smk.belajar.id', status: 'Aktif', nilai_rata: 87.5 },
    { id: 'sis_04', nis: '242511004', nama: 'Nabila Zahra Salsabila', kelas_id: 'kls_11rpl2', jenis_kelamin: 'P', email: 'nabila.zahra@smk.belajar.id', status: 'Aktif', nilai_rata: 91.2 },
    { id: 'sis_05', nis: '242511005', nama: 'Fajar Ramadhan', kelas_id: 'kls_11rpl2', jenis_kelamin: 'L', email: 'fajar.ramadhan@smk.belajar.id', status: 'Aktif', nilai_rata: 85.9 },
    { id: 'sis_06', nis: '242510006', nama: 'Keisha Azzahra', kelas_id: 'kls_10rpl1', jenis_kelamin: 'P', email: 'keisha.azzahra@smk.belajar.id', status: 'Aktif', nilai_rata: 88.6 },
    { id: 'sis_07', nis: '242511007', nama: 'Raka Mahendra', kelas_id: 'kls_11tkj1', jenis_kelamin: 'L', email: 'raka.mahendra@smk.belajar.id', status: 'Aktif', nilai_rata: 86.3 },
    { id: 'sis_08', nis: '242511008', nama: 'Tiara Lestari', kelas_id: 'kls_11dkv1', jenis_kelamin: 'P', email: 'tiara.lestari@smk.belajar.id', status: 'Aktif', nilai_rata: 89.7 },
    { id: 'sis_09', nis: '232412009', nama: 'Bagas Adi Nugroho', kelas_id: 'kls_12rpl1', jenis_kelamin: 'L', email: 'bagas.adi@smk.belajar.id', status: 'Aktif', nilai_rata: 90.1 },
    { id: 'sis_10', nis: '242511010', nama: 'Salsa Bila Rahmawati', kelas_id: 'kls_11rpl1', jenis_kelamin: 'P', email: 'salsa.rahma@smk.belajar.id', status: 'Cuti', nilai_rata: 84.0 },
  ];

  const insertSiswa = db.prepare(`
    INSERT INTO siswa (id, nis, nama, kelas_id, jenis_kelamin, email, status, nilai_rata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of siswaList) {
    insertSiswa.run(s.id, s.nis, s.nama, s.kelas_id, s.jenis_kelamin, s.email, s.status, s.nilai_rata, isoAgo(60 * 24 * 5), isoAgo(60 * 6));
  }

  const mapelList = [
    { id: 'mpl_01', kode: 'PWL-11', nama: 'Pemrograman Web & Blade Laravel', jurusan_id: 'jur_rpl', guru_id: 'gru_01', jam_per_minggu: 8, tingkat: 'XI' },
    { id: 'mpl_02', kode: 'BDS-11', nama: 'Basis Data Relasional (MySQL/SQLite)', jurusan_id: 'jur_rpl', guru_id: 'gru_02', jam_per_minggu: 6, tingkat: 'XI' },
    { id: 'mpl_03', kode: 'PBO-11', nama: 'Pemrograman Berorientasi Objek', jurusan_id: 'jur_rpl', guru_id: 'gru_03', jam_per_minggu: 6, tingkat: 'XI' },
    { id: 'mpl_04', kode: 'AIJ-11', nama: 'Administrasi Infrastruktur Jaringan', jurusan_id: 'jur_tkj', guru_id: 'gru_04', jam_per_minggu: 6, tingkat: 'XI' },
    { id: 'mpl_05', kode: 'UIX-11', nama: 'Desain Antarmuka & Pengalaman Pengguna', jurusan_id: 'jur_dkv', guru_id: 'gru_05', jam_per_minggu: 4, tingkat: 'XI' },
    { id: 'mpl_06', kode: 'MPJ-12', nama: 'Manajemen Proyek Perangkat Lunak', jurusan_id: 'jur_rpl', guru_id: 'gru_06', jam_per_minggu: 4, tingkat: 'XII' },
  ];

  const insertMapel = db.prepare(`
    INSERT INTO mata_pelajaran (id, kode, nama, jurusan_id, guru_id, jam_per_minggu, tingkat, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const m of mapelList) {
    insertMapel.run(m.id, m.kode, m.nama, m.jurusan_id, m.guru_id, m.jam_per_minggu, m.tingkat, isoAgo(60 * 24 * 4), isoAgo(60 * 5));
  }

  const seededActivities: Array<{
    userIdx: number;
    action: ActivityAction;
    module: ActivityModule;
    targetId: string;
    description: string;
    minutesAgo: number;
    durationMs: number;
    metadata: Record<string, unknown>;
  }> = [
    {
      userIdx: 0,
      action: 'LOGIN',
      module: 'Auth',
      targetId: 'usr_admin01',
      description: 'Masuk ke sistem sebagai Administrator Sekolah',
      minutesAgo: 280,
      durationMs: 24,
      metadata: { method: 'password', sessionCreated: true },
    },
    {
      userIdx: 0,
      action: 'CREATE',
      module: 'Jurusan',
      targetId: 'jur_rpl',
      description: 'Memperbarui kuota jurusan RPL/PPLG menjadi 108 siswa',
      minutesAgo: 245,
      durationMs: 14,
      metadata: { kode: 'RPL/PPLG', kuota: 108 },
    },
    {
      userIdx: 1,
      action: 'LOGIN',
      module: 'Auth',
      targetId: 'usr_guru01',
      description: 'Guru Pemrograman Web masuk ke portal akademik',
      minutesAgo: 210,
      durationMs: 19,
      metadata: { method: 'password', role: 'guru' },
    },
    {
      userIdx: 1,
      action: 'UPDATE',
      module: 'Mata Pelajaran',
      targetId: 'mpl_01',
      description: 'Menyesuaikan jam pelajaran Pemrograman Web & Blade Laravel (8 JP)',
      minutesAgo: 185,
      durationMs: 11,
      metadata: { kode: 'PWL-11', jam_per_minggu: 8 },
    },
    {
      userIdx: 3,
      action: 'LOGIN',
      module: 'Auth',
      targetId: 'usr_guru02',
      description: 'Masuk ke modul Basis Data Relasional',
      minutesAgo: 135,
      durationMs: 22,
      metadata: { role: 'guru' },
    },
    {
      userIdx: 3,
      action: 'CREATE',
      module: 'Siswa',
      targetId: 'sis_06',
      description: 'Menambahkan data siswa baru Keisha Azzahra (X PPLG 1)',
      minutesAgo: 112,
      durationMs: 16,
      metadata: { nis: '242510006', kelas: 'X PPLG 1' },
    },
    {
      userIdx: 1,
      action: 'EXPORT',
      module: 'Laporan',
      targetId: 'report_siswa_xlsx',
      description: 'Mengekspor rekap data siswa XI RPL 1 ke format Excel (.xlsx)',
      minutesAgo: 88,
      durationMs: 42,
      metadata: { format: 'XLSX', totalRows: 10 },
    },
    {
      userIdx: 0,
      action: 'UPDATE',
      module: 'Kelas',
      targetId: 'kls_11rpl1',
      description: 'Sinkronisasi wali kelas XI RPL 1 dengan Budi Santoso, S.Kom.',
      minutesAgo: 64,
      durationMs: 13,
      metadata: { kelas: 'XI RPL 1', kapasitas: 36 },
    },
    {
      userIdx: 2,
      action: 'LOGIN',
      module: 'Auth',
      targetId: 'usr_siswa01',
      description: 'Siswa Zhariif Khayran masuk untuk memantau proyek XI RPL/PPLG',
      minutesAgo: 35,
      durationMs: 18,
      metadata: { kelas: 'XI RPL 1', role: 'siswa' },
    },
    {
      userIdx: 2,
      action: 'AI_CHAT',
      module: 'Asisten AI',
      targetId: 'chat_01',
      description: 'Berkonsultasi dengan Asisten AI tentang relasi tabel Kelas dan Jurusan',
      minutesAgo: 21,
      durationMs: 680,
      metadata: { model: 'gemini-4-hydrogen', topic: 'Relasi Database' },
    },
    {
      userIdx: 0,
      action: 'EXPORT',
      module: 'Laporan',
      targetId: 'report_activity_pdf',
      description: 'Mengunduh laporan aktivitas pengguna harian dalam format PDF',
      minutesAgo: 12,
      durationMs: 55,
      metadata: { format: 'PDF', scope: 'Activity Logs' },
    },
    {
      userIdx: 0,
      action: 'VIEW',
      module: 'Dashboard',
      targetId: 'dash_main',
      description: 'Memeriksa grafik aktivitas pengguna dan status sinkronisasi lokal',
      minutesAgo: 4,
      durationMs: 9,
      metadata: { view: 'analytics' },
    },
  ];

  // Add a few historical logs across past 5 days for rich 7-day trend chart
  for (let d = 1; d <= 5; d++) {
    const dayMins = d * 24 * 60 + 120;
    const countForDay = 3 + (d % 3);
    for (let k = 0; k < countForDay; k++) {
      const u = users[(d + k) % users.length];
      recordActivity({
        user: u,
        action: (['LOGIN', 'CREATE', 'UPDATE', 'EXPORT', 'VIEW'] as ActivityAction[])[(d + k) % 5],
        module: (['Siswa', 'Kelas', 'Jurusan', 'Guru', 'Dashboard'] as ActivityModule[])[(d + k) % 5],
        targetId: `hist_${d}_${k}`,
        description: `Sinkronisasi data akademik harian (${u.name})`,
        metadata: { historical: true, dayOffset: d },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Local Server Sync)',
        durationMs: 12 + k * 4,
        createdAt: isoAgo(dayMins + k * 35),
      });
    }
  }

  for (const item of seededActivities) {
    recordActivity({
      user: users[item.userIdx],
      action: item.action,
      module: item.module,
      targetId: item.targetId,
      description: item.description,
      metadata: item.metadata,
      ipAddress: '127.0.0.1',
      userAgent: 'Chrome/132.0 (Manajemen Sekolah Client)',
      durationMs: item.durationMs,
      createdAt: isoAgo(item.minutesAgo),
    });
  }
}

export interface BackupSnapshot {
  version: number;
  exported_at: string;
  data: {
    users: Record<string, unknown>[];
    jurusan: Record<string, unknown>[];
    kelas: Record<string, unknown>[];
    siswa: Record<string, unknown>[];
    guru: Record<string, unknown>[];
    mata_pelajaran: Record<string, unknown>[];
    activity_logs: Record<string, unknown>[];
    chat_messages: Record<string, unknown>[];
  };
}

let lastSavedAt = new Date().toISOString();
let backupTimer: NodeJS.Timeout | null = null;

export function buildBackupSnapshot(includeSecrets = true): BackupSnapshot {
  const userCols = includeSecrets
    ? 'id, name, email, password_hash, role, avatar_color, status, last_login_at, created_at'
    : 'id, name, email, role, avatar_color, status, last_login_at, created_at';
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    data: {
      users: db.prepare(`SELECT ${userCols} FROM users`).all() as Record<string, unknown>[],
      jurusan: db.prepare('SELECT * FROM jurusan').all() as Record<string, unknown>[],
      kelas: db.prepare('SELECT * FROM kelas').all() as Record<string, unknown>[],
      siswa: db.prepare('SELECT * FROM siswa').all() as Record<string, unknown>[],
      guru: db.prepare('SELECT * FROM guru').all() as Record<string, unknown>[],
      mata_pelajaran: db.prepare('SELECT * FROM mata_pelajaran').all() as Record<string, unknown>[],
      activity_logs: db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 1000').all() as Record<string, unknown>[],
      chat_messages: db.prepare('SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT 500').all() as Record<string, unknown>[],
    },
  };
}

export function saveBackupSnapshot(): void {
  try {
    const snapshot = buildBackupSnapshot(true);
    const tmpPath = `${BACKUP_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf8');
    fs.renameSync(tmpPath, BACKUP_PATH);
    lastSavedAt = snapshot.exported_at;
  } catch {
    // Non-fatal backup write failure
  }
}

export function scheduleBackupSnapshot(): void {
  lastSavedAt = new Date().toISOString();
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    saveBackupSnapshot();
    backupTimer = null;
  }, 400);
}

export function restoreFromSnapshot(snapshot: BackupSnapshot): { restoredRows: number } {
  const d = snapshot?.data;
  if (!d || !Array.isArray(d.users) || !Array.isArray(d.jurusan)) {
    throw new Error('Format file cadangan JSON tidak valid.');
  }

  let restoredRows = 0;
  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec('DELETE FROM chat_messages;');
    db.exec('DELETE FROM activity_logs;');
    db.exec('DELETE FROM mata_pelajaran;');
    db.exec('DELETE FROM siswa;');
    db.exec('DELETE FROM guru;');
    db.exec('DELETE FROM kelas;');
    db.exec('DELETE FROM jurusan;');

    const defaultPass = hashPassword('password123');
    if (d.users.length > 0) {
      db.exec('DELETE FROM users;');
      const insU = db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, avatar_color, status, last_login_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of d.users) {
        insU.run(
          String(u.id),
          String(u.name),
          String(u.email),
          u.password_hash ? String(u.password_hash) : defaultPass,
          String(u.role || 'siswa'),
          String(u.avatar_color || '#1D5497'),
          String(u.status || 'active'),
          u.last_login_at ? String(u.last_login_at) : null,
          String(u.created_at || new Date().toISOString())
        );
        restoredRows++;
      }
    }

    const insJ = db.prepare(`
      INSERT INTO jurusan (id, kode, nama, kaprodi, deskripsi, kuota, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const j of d.jurusan) {
      insJ.run(
        String(j.id),
        String(j.kode),
        String(j.nama),
        String(j.kaprodi),
        String(j.deskripsi ?? ''),
        Number(j.kuota ?? 36),
        String(j.created_at || new Date().toISOString()),
        String(j.updated_at || new Date().toISOString())
      );
      restoredRows++;
    }

    const insK = db.prepare(`
      INSERT INTO kelas (id, nama, tingkat, jurusan_id, wali_kelas, kapasitas, tahun_ajaran, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const k of d.kelas ?? []) {
      insK.run(
        String(k.id),
        String(k.nama),
        String(k.tingkat || 'XI'),
        String(k.jurusan_id),
        String(k.wali_kelas),
        Number(k.kapasitas ?? 36),
        String(k.tahun_ajaran || '2026/2027'),
        String(k.created_at || new Date().toISOString()),
        String(k.updated_at || new Date().toISOString())
      );
      restoredRows++;
    }

    const insG = db.prepare(`
      INSERT INTO guru (id, nip, nama, bidang_studi, email, no_telp, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const g of d.guru ?? []) {
      insG.run(
        String(g.id),
        String(g.nip),
        String(g.nama),
        String(g.bidang_studi),
        String(g.email),
        String(g.no_telp ?? '-'),
        String(g.status || 'Aktif'),
        String(g.created_at || new Date().toISOString()),
        String(g.updated_at || new Date().toISOString())
      );
      restoredRows++;
    }

    const insS = db.prepare(`
      INSERT INTO siswa (id, nis, nama, kelas_id, jenis_kelamin, email, status, nilai_rata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of d.siswa ?? []) {
      insS.run(
        String(s.id),
        String(s.nis),
        String(s.nama),
        String(s.kelas_id),
        String(s.jenis_kelamin || 'L'),
        String(s.email),
        String(s.status || 'Aktif'),
        Number(s.nilai_rata ?? 85),
        String(s.created_at || new Date().toISOString()),
        String(s.updated_at || new Date().toISOString())
      );
      restoredRows++;
    }

    const insM = db.prepare(`
      INSERT INTO mata_pelajaran (id, kode, nama, jurusan_id, guru_id, jam_per_minggu, tingkat, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of d.mata_pelajaran ?? []) {
      insM.run(
        String(m.id),
        String(m.kode),
        String(m.nama),
        m.jurusan_id ? String(m.jurusan_id) : null,
        m.guru_id ? String(m.guru_id) : null,
        Number(m.jam_per_minggu ?? 4),
        String(m.tingkat || 'XI'),
        String(m.created_at || new Date().toISOString()),
        String(m.updated_at || new Date().toISOString())
      );
      restoredRows++;
    }

    const insA = db.prepare(`
      INSERT INTO activity_logs (id, user_id, user_name, user_email, user_role, action, module, target_id, description, metadata_json, ip_address, user_agent, duration_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const a of d.activity_logs ?? []) {
      insA.run(
        String(a.id),
        a.user_id ? String(a.user_id) : null,
        String(a.user_name),
        String(a.user_email),
        String(a.user_role),
        String(a.action),
        String(a.module),
        a.target_id ? String(a.target_id) : null,
        String(a.description),
        a.metadata_json ? String(a.metadata_json) : null,
        String(a.ip_address || '127.0.0.1'),
        String(a.user_agent || 'Backup Restore'),
        Number(a.duration_ms ?? 10),
        String(a.created_at || new Date().toISOString())
      );
      restoredRows++;
    }

    const insC = db.prepare(`
      INSERT INTO chat_messages (id, user_id, role, text, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const c of d.chat_messages ?? []) {
      insC.run(
        String(c.id),
        c.user_id ? String(c.user_id) : null,
        String(c.role),
        String(c.text),
        String(c.created_at || new Date().toISOString())
      );
      restoredRows++;
    }

    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('COMMIT;');
    saveBackupSnapshot();
    return { restoredRows };
  } catch (err) {
    db.exec('ROLLBACK;');
    db.exec('PRAGMA foreign_keys = ON;');
    throw err;
  }
}

function initializeDatabase() {
  // Remove leftover test record if created during prior diagnostic checks
  db.prepare("DELETE FROM jurusan WHERE kode = 'TEST1'").run();

  const existingUsers = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (existingUsers.cnt === 0) {
    if (fs.existsSync(BACKUP_PATH)) {
      try {
        const raw = fs.readFileSync(BACKUP_PATH, 'utf8');
        const parsed = JSON.parse(raw) as BackupSnapshot;
        restoreFromSnapshot(parsed);
        return;
      } catch {
        // Fall through to seed if snapshot is unreadable
      }
    }
    seedInitialData();
    saveBackupSnapshot();
  } else if (!fs.existsSync(BACKUP_PATH)) {
    saveBackupSnapshot();
  }
}

initializeDatabase();

export function getDatabaseStatus(): DatabaseStatus {
  const countOf = (table: string) =>
    (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c;

  const journalRow = db.prepare('PRAGMA journal_mode;').get() as Record<string, unknown>;
  const syncRow = db.prepare('PRAGMA synchronous;').get() as Record<string, unknown>;
  const dbStat = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : null;
  const backupStat = fs.existsSync(BACKUP_PATH) ? fs.statSync(BACKUP_PATH) : null;

  return {
    engine: 'SQLite 3 (node:sqlite)',
    fileName: 'data/manajemen_sekolah.db',
    fileSizeBytes: dbStat?.size ?? 0,
    journalMode: String(Object.values(journalRow)[0] ?? 'delete').toUpperCase(),
    synchronousMode: String(Object.values(syncRow)[0] ?? '2') === '2' ? 'FULL' : 'NORMAL',
    lastSavedAt,
    backupExists: Boolean(backupStat),
    backupSizeBytes: backupStat?.size ?? 0,
    tables: {
      users: countOf('users'),
      sessions: countOf('sessions'),
      jurusan: countOf('jurusan'),
      kelas: countOf('kelas'),
      siswa: countOf('siswa'),
      guru: countOf('guru'),
      mata_pelajaran: countOf('mata_pelajaran'),
      activity_logs: countOf('activity_logs'),
      chat_messages: countOf('chat_messages'),
    },
  };
}

export function listChatMessages(userId: string | null): PersistedChatMessage[] {
  if (userId) {
    return db
      .prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 80')
      .all(userId) as unknown as PersistedChatMessage[];
  }
  return db
    .prepare('SELECT * FROM chat_messages WHERE user_id IS NULL ORDER BY created_at ASC LIMIT 80')
    .all() as unknown as PersistedChatMessage[];
}

export function saveChatMessage(input: {
  userId: string | null;
  role: 'user' | 'assistant';
  text: string;
}): PersistedChatMessage {
  const id = generateId('msg');
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO chat_messages (id, user_id, role, text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, input.userId, input.role, input.text, createdAt);
  scheduleBackupSnapshot();
  return {
    id,
    user_id: input.userId,
    role: input.role,
    text: input.text,
    created_at: createdAt,
  };
}

export function clearChatMessages(userId: string | null): void {
  if (userId) {
    db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
  } else {
    db.prepare('DELETE FROM chat_messages WHERE user_id IS NULL').run();
  }
  scheduleBackupSnapshot();
}

export function closeDatabaseCleanly(): void {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }
  saveBackupSnapshot();
  try {
    db.close();
  } catch {
    // Already closed
  }
}

export function sanitizeUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    role: row.role as UserRole,
    avatar_color: String(row.avatar_color),
    status: (row.status as 'active' | 'inactive') ?? 'active',
    last_login_at: row.last_login_at ? String(row.last_login_at) : null,
    created_at: String(row.created_at),
  };
}

export function listJurusan(): Jurusan[] {
  return db.prepare('SELECT * FROM jurusan ORDER BY kode ASC').all() as unknown as Jurusan[];
}

export function listKelas(): Kelas[] {
  return db
    .prepare(`
      SELECT k.*, j.nama AS jurusan_nama, j.kode AS jurusan_kode
      FROM kelas k
      LEFT JOIN jurusan j ON j.id = k.jurusan_id
      ORDER BY k.tingkat ASC, k.nama ASC
    `)
    .all() as unknown as Kelas[];
}

export function listSiswa(): Siswa[] {
  return db
    .prepare(`
      SELECT s.*, k.nama AS kelas_nama
      FROM siswa s
      LEFT JOIN kelas k ON k.id = s.kelas_id
      ORDER BY s.nama ASC
    `)
    .all() as unknown as Siswa[];
}

export function listGuru(): Guru[] {
  return db.prepare('SELECT * FROM guru ORDER BY nama ASC').all() as unknown as Guru[];
}

export function listMataPelajaran(): MataPelajaran[] {
  return db
    .prepare(`
      SELECT m.*, j.nama AS jurusan_nama, g.nama AS guru_nama
      FROM mata_pelajaran m
      LEFT JOIN jurusan j ON j.id = m.jurusan_id
      LEFT JOIN guru g ON g.id = m.guru_id
      ORDER BY m.kode ASC
    `)
    .all() as unknown as MataPelajaran[];
}

export function listUsers(): User[] {
  const rows = db.prepare('SELECT id, name, email, role, avatar_color, status, last_login_at, created_at FROM users ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map(sanitizeUser);
}

export function listActivities(filters?: {
  module?: string;
  action?: string;
  userId?: string;
  q?: string;
  limit?: number;
}): ActivityLog[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.module && filters.module !== 'ALL') {
    clauses.push('module = ?');
    params.push(filters.module);
  }
  if (filters?.action && filters.action !== 'ALL') {
    clauses.push('action = ?');
    params.push(filters.action);
  }
  if (filters?.userId && filters.userId !== 'ALL') {
    clauses.push('user_id = ?');
    params.push(filters.userId);
  }
  if (filters?.q && filters.q.trim() !== '') {
    const q = `%${filters.q.trim()}%`;
    clauses.push('(user_name LIKE ? OR user_email LIKE ? OR description LIKE ? OR module LIKE ? OR action LIKE ?)');
    params.push(q, q, q, q, q);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(Math.max(filters?.limit ?? 150, 1), 500);
  params.push(limit);

  return db
    .prepare(`SELECT * FROM activity_logs ${where} ORDER BY created_at DESC LIMIT ?`)
    .all(...params) as unknown as ActivityLog[];
}

export function getDashboardAnalytics(): DashboardAnalytics {
  const countOf = (table: string) =>
    (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c;

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const todayCount = (
    db.prepare(`SELECT COUNT(*) as c FROM activity_logs WHERE created_at LIKE ?`).get(`${todayPrefix}%`) as { c: number }
  ).c;

  // Last 24h grouped into 8 3-hour buckets or recent hours
  const allRecent = db
    .prepare(`SELECT created_at, module, action FROM activity_logs ORDER BY created_at DESC LIMIT 500`)
    .all() as Array<{ created_at: string; module: string; action: string }>;

  const hourBuckets = new Map<string, number>();
  const nowDate = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(nowDate.getTime() - i * 3600_000);
    const label = `${String(d.getHours()).padStart(2, '0')}:00`;
    hourBuckets.set(label, 0);
  }
  for (const row of allRecent) {
    const d = new Date(row.created_at);
    if (nowDate.getTime() - d.getTime() <= 12 * 3600_000) {
      const label = `${String(d.getHours()).padStart(2, '0')}:00`;
      if (hourBuckets.has(label)) {
        hourBuckets.set(label, (hourBuckets.get(label) ?? 0) + 1);
      }
    }
  }

  // Last 7 days
  const dayBuckets = new Map<string, { label: string; count: number }>();
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(nowDate.getTime() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    const label = `${dayNames[d.getDay()]} ${d.getDate()}`;
    dayBuckets.set(key, { label, count: 0 });
  }
  for (const row of allRecent) {
    const key = row.created_at.slice(0, 10);
    const entry = dayBuckets.get(key);
    if (entry) entry.count += 1;
  }

  const byModuleRows = db
    .prepare(`SELECT module, COUNT(*) as count FROM activity_logs GROUP BY module ORDER BY count DESC`)
    .all() as Array<{ module: string; count: number }>;

  const byActionRows = db
    .prepare(`SELECT action, COUNT(*) as count FROM activity_logs GROUP BY action ORDER BY count DESC`)
    .all() as Array<{ action: string; count: number }>;

  return {
    counts: {
      jurusan: countOf('jurusan'),
      kelas: countOf('kelas'),
      siswa: countOf('siswa'),
      guru: countOf('guru'),
      mata_pelajaran: countOf('mata_pelajaran'),
      users: countOf('users'),
      total_activities: countOf('activity_logs'),
      today_activities: todayCount,
    },
    hourlyActivity: Array.from(hourBuckets.entries()).map(([hour, count]) => ({ hour, count })),
    dailyActivity: Array.from(dayBuckets.entries()).map(([date, v]) => ({ date, label: v.label, count: v.count })),
    byModule: byModuleRows,
    byAction: byActionRows,
  };
}
