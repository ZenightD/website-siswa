export type UserRole = 'admin' | 'guru' | 'siswa';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_color: string;
  status: 'active' | 'inactive';
  last_login_at: string | null;
  created_at: string;
}

export interface Jurusan {
  id: string;
  kode: string;
  nama: string;
  kaprodi: string;
  deskripsi: string;
  kuota: number;
  created_at: string;
  updated_at: string;
}

export interface Kelas {
  id: string;
  nama: string;
  tingkat: 'X' | 'XI' | 'XII';
  jurusan_id: string;
  jurusan_nama?: string;
  jurusan_kode?: string;
  wali_kelas: string;
  kapasitas: number;
  tahun_ajaran: string;
  created_at: string;
  updated_at: string;
}

export interface Siswa {
  id: string;
  nis: string;
  nama: string;
  kelas_id: string;
  kelas_nama?: string;
  jenis_kelamin: 'L' | 'P';
  email: string;
  status: 'Aktif' | 'Cuti' | 'Lulus';
  nilai_rata: number;
  created_at: string;
  updated_at: string;
}

export interface Guru {
  id: string;
  nip: string;
  nama: string;
  bidang_studi: string;
  email: string;
  no_telp: string;
  status: 'Aktif' | 'Cuti';
  created_at: string;
  updated_at: string;
}

export interface MataPelajaran {
  id: string;
  kode: string;
  nama: string;
  jurusan_id: string | null;
  jurusan_nama?: string | null;
  guru_id: string | null;
  guru_nama?: string | null;
  jam_per_minggu: number;
  tingkat: 'X' | 'XI' | 'XII' | 'Semua';
  created_at: string;
  updated_at: string;
}

export type ActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'EXPORT'
  | 'AI_CHAT';

export type ActivityModule =
  | 'Auth'
  | 'Dashboard'
  | 'Jurusan'
  | 'Kelas'
  | 'Siswa'
  | 'Guru'
  | 'Mata Pelajaran'
  | 'Pengguna'
  | 'Laporan'
  | 'Asisten AI';

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string;
  user_role: string;
  action: ActivityAction;
  module: ActivityModule;
  target_id: string | null;
  description: string;
  metadata_json: string | null;
  ip_address: string;
  user_agent: string;
  duration_ms: number;
  created_at: string;
}

export interface OnlineUser {
  clientId: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  currentModule: string;
  connectedAt: string;
}

export interface DashboardAnalytics {
  counts: {
    jurusan: number;
    kelas: number;
    siswa: number;
    guru: number;
    mata_pelajaran: number;
    users: number;
    total_activities: number;
    today_activities: number;
  };
  hourlyActivity: Array<{ hour: string; count: number }>;
  dailyActivity: Array<{ date: string; label: string; count: number }>;
  byModule: Array<{ module: string; count: number }>;
  byAction: Array<{ action: string; count: number }>;
}

export type AppSection = 'portal' | 'dashboard' | 'akademik' | 'pengguna';
export type AcademicTab = 'jurusan' | 'kelas' | 'siswa' | 'guru' | 'mapel';

export interface DatabaseStatus {
  engine: string;
  fileName: string;
  fileSizeBytes: number;
  journalMode: string;
  synchronousMode: string;
  lastSavedAt: string;
  backupExists: boolean;
  backupSizeBytes: number;
  tables: {
    users: number;
    sessions: number;
    jurusan: number;
    kelas: number;
    siswa: number;
    guru: number;
    mata_pelajaran: number;
    activity_logs: number;
    chat_messages: number;
  };
}

export interface PersistedChatMessage {
  id: string;
  user_id: string | null;
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
}
