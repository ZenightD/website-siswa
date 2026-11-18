import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import {
  buildBackupSnapshot,
  clearChatMessages,
  closeDatabaseCleanly,
  DB_PATH,
  db,
  generateId,
  getDashboardAnalytics,
  getDatabaseStatus,
  hashPassword,
  listActivities,
  listChatMessages,
  listGuru,
  listJurusan,
  listKelas,
  listMataPelajaran,
  listSiswa,
  listUsers,
  recordActivity,
  restoreFromSnapshot,
  sanitizeUser,
  saveChatMessage,
  scheduleBackupSnapshot,
  verifyPassword,
  type BackupSnapshot,
} from './server/db.ts';
import type { ActivityLog, OnlineUser, User, UserRole } from './src/types.ts';

interface AuthedRequest extends Request {
  authUser?: User;
  authToken?: string;
}

interface WsClientMeta {
  clientId: string;
  ws: WebSocket;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  currentModule: string;
  connectedAt: string;
}

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '1mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const wsClients = new Map<string, WsClientMeta>();

function getOnlineUsersSnapshot(): OnlineUser[] {
  const result: OnlineUser[] = [];
  for (const c of wsClients.values()) {
    if (c.ws.readyState === WebSocket.OPEN) {
      result.push({
        clientId: c.clientId,
        userId: c.userId,
        name: c.name,
        email: c.email,
        role: c.role,
        currentModule: c.currentModule,
        connectedAt: c.connectedAt,
      });
    }
  }
  return result;
}

function broadcastWs(type: string, payload: unknown) {
  const message = JSON.stringify({ type, payload });
  for (const client of wsClients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}

function broadcastPresence() {
  broadcastWs('presence:update', getOnlineUsersSnapshot());
}

function emitActivityAndSync(log: ActivityLog, syncModule?: string) {
  scheduleBackupSnapshot();
  broadcastWs('activity:created', log);
  if (syncModule) {
    broadcastWs('data:synced', {
      module: syncModule,
      action: log.action,
      timestamp: log.created_at,
    });
  }
}

function getUserByToken(token: string | undefined): User | null {
  if (!token) return null;
  const row = db
    .prepare(`
      SELECT u.id, u.name, u.email, u.role, u.avatar_color, u.status, u.last_login_at, u.created_at, s.expires_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
    `)
    .get(token) as (Record<string, unknown> & { expires_at: string }) | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  if (row.status !== 'active') return null;
  return sanitizeUser(row);
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return undefined;
}

function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  const user = getUserByToken(token);
  if (user && token) {
    req.authUser = user;
    req.authToken = token;
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const user = getUserByToken(token);
  if (!user || !token) {
    res.status(401).json({ error: 'Sesi login tidak valid atau telah berakhir. Silakan masuk kembali.' });
    return;
  }
  req.authUser = user;
  req.authToken = token;
  next();
}

function getClientMeta(req: Request) {
  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.socket.remoteAddress) || '127.0.0.1';
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 120) : 'Web Client';
  return { ip, ua };
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/ws', `http://localhost:${PORT}`);
  const token = url.searchParams.get('token') || undefined;
  const user = getUserByToken(token);
  const clientId = generateId('ws');

  const meta: WsClientMeta = {
    clientId,
    ws,
    userId: user?.id ?? 'guest',
    name: user?.name ?? 'Pengunjung Tamu',
    email: user?.email ?? 'guest@local',
    role: user?.role ?? 'siswa',
    currentModule: 'Beranda',
    connectedAt: new Date().toISOString(),
  };

  wsClients.set(clientId, meta);
  ws.send(JSON.stringify({ type: 'presence:update', payload: getOnlineUsersSnapshot() }));
  broadcastPresence();

  ws.on('message', (raw) => {
    try {
      const parsed = JSON.parse(raw.toString()) as { type?: string; token?: string; module?: string };
      if (parsed.type === 'presence:auth') {
        const authed = getUserByToken(parsed.token);
        if (authed) {
          meta.userId = authed.id;
          meta.name = authed.name;
          meta.email = authed.email;
          meta.role = authed.role;
          broadcastPresence();
        }
      } else if (parsed.type === 'presence:page' && typeof parsed.module === 'string') {
        meta.currentModule = parsed.module.slice(0, 40);
        broadcastPresence();
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on('close', () => {
    wsClients.delete(clientId);
    broadcastPresence();
  });
});

// ================= AUTH ROUTES =================

app.post('/api/auth/register', (req: Request, res: Response) => {
  const started = Date.now();
  const { name, email, password, role } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
  };

  if (!name || !email || !password || name.trim().length < 2 || password.length < 6) {
    res.status(400).json({ error: 'Nama minimal 2 karakter, email valid, dan kata sandi minimal 6 karakter.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'Email tersebut sudah terdaftar di sistem.' });
    return;
  }

  const validRole: UserRole = role === 'guru' || role === 'admin' || role === 'siswa' ? role : 'siswa';
  const palette = ['#1D5497', '#0F766E', '#4338CA', '#B45309', '#0369A1'];
  const avatarColor = palette[Math.floor(Math.random() * palette.length)];
  const nowIso = new Date().toISOString();
  const id = generateId('usr');
  const passwordHash = hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, avatar_color, status, last_login_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(id, name.trim(), normalizedEmail, passwordHash, validRole, avatarColor, nowIso, nowIso);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
  const { ip, ua } = getClientMeta(req);

  db.prepare(`
    INSERT INTO sessions (token, user_id, device_info, ip_address, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, id, ua, ip, nowIso, expiresAt);

  const user = sanitizeUser(
    db.prepare('SELECT id, name, email, role, avatar_color, status, last_login_at, created_at FROM users WHERE id = ?').get(id) as Record<string, unknown>
  );

  const log = recordActivity({
    user,
    action: 'REGISTER',
    module: 'Auth',
    targetId: user.id,
    description: `Pendaftaran akun baru (${user.name}) dengan peran ${user.role}`,
    metadata: { role: user.role },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });

  emitActivityAndSync(log, 'users');
  res.status(201).json({ token, user });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const started = Date.now();
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normalizedEmail) as (Record<string, unknown> & { password_hash: string; status: string }) | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Email atau kata sandi salah.' });
    return;
  }

  if (row.status !== 'active') {
    res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh administrator.' });
    return;
  }

  const nowIso = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(nowIso, String(row.id));

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600_000).toISOString();
  const { ip, ua } = getClientMeta(req);

  db.prepare(`
    INSERT INTO sessions (token, user_id, device_info, ip_address, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, String(row.id), ua, ip, nowIso, expiresAt);

  const user = sanitizeUser({ ...row, last_login_at: nowIso });
  const log = recordActivity({
    user,
    action: 'LOGIN',
    module: 'Auth',
    targetId: user.id,
    description: `${user.name} masuk ke sistem Manajemen Sekolah`,
    metadata: { role: user.role, sessionExpiresAt: expiresAt },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });

  emitActivityAndSync(log, 'users');
  res.json({ token, user });
});

app.post('/api/auth/logout', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { ip, ua } = getClientMeta(req);
  if (req.authToken) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.authToken);
  }
  const log = recordActivity({
    user: req.authUser,
    action: 'LOGOUT',
    module: 'Auth',
    targetId: req.authUser?.id,
    description: `${req.authUser?.name ?? 'Pengguna'} keluar dari sesi aktif`,
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'users');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ user: req.authUser });
});

// ================= BOOTSTRAP & ANALYTICS =================

app.get('/api/bootstrap', optionalAuth, (req: AuthedRequest, res: Response) => {
  const analytics = getDashboardAnalytics();
  const payload: Record<string, unknown> = {
    analytics,
    jurusan: listJurusan(),
    kelas: listKelas(),
    siswa: listSiswa(),
    guru: listGuru(),
    mata_pelajaran: listMataPelajaran(),
    online_users: getOnlineUsersSnapshot(),
  };

  if (req.authUser) {
    payload.users = listUsers();
    payload.activities = listActivities({ limit: 150 });
    payload.database_status = getDatabaseStatus();
  } else {
    payload.users = [];
    payload.activities = [];
    payload.database_status = null;
  }

  res.json(payload);
});

// ================= LOCAL DATABASE BACKUP & RESTORE =================

app.get('/api/database/status', requireAuth, (_req: AuthedRequest, res: Response) => {
  res.json({ status: getDatabaseStatus() });
});

app.get('/api/database/backup-json', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const snapshot = buildBackupSnapshot(req.authUser?.role === 'admin');
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'EXPORT',
    module: 'Laporan',
    targetId: 'database_backup_json',
    description: `Mengunduh cadangan lengkap database lokal (JSON)`,
    metadata: { format: 'JSON', exportedAt: snapshot.exported_at },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="backup-manajemen-sekolah-${new Date().toISOString().slice(0, 10)}.json"`
  );
  res.send(JSON.stringify(snapshot, null, 2));
});

app.get('/api/database/download-sqlite', requireAuth, (req: AuthedRequest, res: Response) => {
  if (req.authUser?.role !== 'admin') {
    res.status(403).json({ error: 'Hanya administrator yang dapat mengunduh file SQLite mentah.' });
    return;
  }
  const started = Date.now();
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'EXPORT',
    module: 'Laporan',
    targetId: 'database_sqlite_file',
    description: `Mengunduh berkas database SQLite lokal (manajemen_sekolah.db)`,
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log);
  res.download(DB_PATH, `manajemen_sekolah-${new Date().toISOString().slice(0, 10)}.db`);
});

app.post('/api/database/restore-json', requireAuth, (req: AuthedRequest, res: Response) => {
  if (req.authUser?.role !== 'admin') {
    res.status(403).json({ error: 'Hanya administrator yang dapat memulihkan database dari cadangan.' });
    return;
  }
  const started = Date.now();
  try {
    const snapshot = req.body as BackupSnapshot;
    const result = restoreFromSnapshot(snapshot);
    const { ip, ua } = getClientMeta(req);
    const log = recordActivity({
      user: req.authUser,
      action: 'UPDATE',
      module: 'Laporan',
      targetId: 'database_restore',
      description: `Memulihkan database lokal dari file cadangan JSON (${result.restoredRows} baris)`,
      metadata: { restoredRows: result.restoredRows },
      ipAddress: ip,
      userAgent: ua,
      durationMs: Date.now() - started,
    });
    emitActivityAndSync(log, 'all');
    res.json({ ok: true, restoredRows: result.restoredRows, status: getDatabaseStatus() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal memulihkan file cadangan.';
    res.status(400).json({ error: msg });
  }
});

app.get('/api/activities', requireAuth, (req: AuthedRequest, res: Response) => {
  const { module, action, userId, q, limit } = req.query as Record<string, string | undefined>;
  const activities = listActivities({
    module,
    action,
    userId,
    q,
    limit: limit ? Number(limit) : 150,
  });
  res.json({ activities, analytics: getDashboardAnalytics() });
});

app.post('/api/activities/export-log', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { format, scope, rowCount } = req.body as { format?: string; scope?: string; rowCount?: number };
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'EXPORT',
    module: 'Laporan',
    targetId: `export_${(format || 'PDF').toLowerCase()}`,
    description: `Mengekspor laporan ${scope || 'Data Sekolah'} ke format ${format || 'PDF'} (${rowCount ?? 0} baris)`,
    metadata: { format, scope, rowCount },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log);
  res.json({ ok: true, log });
});

// ================= USERS MANAGEMENT =================

app.patch('/api/users/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  if (req.authUser?.role !== 'admin') {
    res.status(403).json({ error: 'Hanya administrator yang dapat mengubah peran atau status pengguna.' });
    return;
  }
  const { id } = req.params;
  const { role, status } = req.body as { role?: UserRole; status?: 'active' | 'inactive' };
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    return;
  }

  const nextRole = role && ['admin', 'guru', 'siswa'].includes(role) ? role : (existing.role as UserRole);
  const nextStatus = status && ['active', 'inactive'].includes(status) ? status : (existing.status as 'active' | 'inactive');

  db.prepare('UPDATE users SET role = ?, status = ? WHERE id = ?').run(nextRole, nextStatus, id);
  const updated = sanitizeUser(
    db.prepare('SELECT id, name, email, role, avatar_color, status, last_login_at, created_at FROM users WHERE id = ?').get(id) as Record<string, unknown>
  );

  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'UPDATE',
    module: 'Pengguna',
    targetId: id,
    description: `Memperbarui akun ${updated.name} (peran: ${updated.role}, status: ${updated.status})`,
    metadata: { before: { role: existing.role, status: existing.status }, after: { role: nextRole, status: nextStatus } },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'users');
  res.json({ user: updated });
});

// ================= JURUSAN CRUD =================

app.post('/api/jurusan', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { kode, nama, kaprodi, deskripsi, kuota } = req.body as {
    kode?: string;
    nama?: string;
    kaprodi?: string;
    deskripsi?: string;
    kuota?: number;
  };
  if (!kode || !nama || !kaprodi) {
    res.status(400).json({ error: 'Kode, nama jurusan, dan kaprodi wajib diisi.' });
    return;
  }
  const nowIso = new Date().toISOString();
  const id = generateId('jur');
  try {
    db.prepare(`
      INSERT INTO jurusan (id, kode, nama, kaprodi, deskripsi, kuota, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, kode.trim().toUpperCase(), nama.trim(), kaprodi.trim(), (deskripsi || '').trim(), Number(kuota) || 36, nowIso, nowIso);
  } catch {
    res.status(409).json({ error: 'Kode jurusan sudah digunakan.' });
    return;
  }
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'CREATE',
    module: 'Jurusan',
    targetId: id,
    description: `Menambahkan jurusan baru ${kode.trim().toUpperCase()} — ${nama.trim()}`,
    metadata: { kode, nama, kaprodi, kuota },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'jurusan');
  res.status(201).json({ item: db.prepare('SELECT * FROM jurusan WHERE id = ?').get(id) });
});

app.put('/api/jurusan/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { id } = req.params;
  const { kode, nama, kaprodi, deskripsi, kuota } = req.body as {
    kode?: string;
    nama?: string;
    kaprodi?: string;
    deskripsi?: string;
    kuota?: number;
  };
  const existing = db.prepare('SELECT * FROM jurusan WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Jurusan tidak ditemukan.' });
    return;
  }
  const nowIso = new Date().toISOString();
  try {
    db.prepare(`
      UPDATE jurusan SET kode = ?, nama = ?, kaprodi = ?, deskripsi = ?, kuota = ?, updated_at = ?
      WHERE id = ?
    `).run(
      (kode || String(existing.kode)).trim().toUpperCase(),
      (nama || String(existing.nama)).trim(),
      (kaprodi || String(existing.kaprodi)).trim(),
      (deskripsi ?? String(existing.deskripsi)).trim(),
      Number(kuota ?? existing.kuota),
      nowIso,
      id
    );
  } catch {
    res.status(409).json({ error: 'Kode jurusan bentrok dengan data lain.' });
    return;
  }
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'UPDATE',
    module: 'Jurusan',
    targetId: id,
    description: `Memperbarui data jurusan ${nama || existing.nama}`,
    metadata: { kode, nama, kaprodi, kuota },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'jurusan');
  res.json({ item: db.prepare('SELECT * FROM jurusan WHERE id = ?').get(id) });
});

app.delete('/api/jurusan/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM jurusan WHERE id = ?').get(id) as { nama: string; kode: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Jurusan tidak ditemukan.' });
    return;
  }
  db.prepare('DELETE FROM jurusan WHERE id = ?').run(id);
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'DELETE',
    module: 'Jurusan',
    targetId: id,
    description: `Menghapus jurusan ${existing.kode} — ${existing.nama}`,
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'jurusan');
  res.json({ ok: true });
});

// ================= KELAS CRUD =================

app.post('/api/kelas', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { nama, tingkat, jurusan_id, wali_kelas, kapasitas, tahun_ajaran } = req.body as {
    nama?: string;
    tingkat?: 'X' | 'XI' | 'XII';
    jurusan_id?: string;
    wali_kelas?: string;
    kapasitas?: number;
    tahun_ajaran?: string;
  };
  if (!nama || !tingkat || !jurusan_id || !wali_kelas) {
    res.status(400).json({ error: 'Nama kelas, tingkat, jurusan, dan wali kelas wajib diisi.' });
    return;
  }
  const nowIso = new Date().toISOString();
  const id = generateId('kls');
  try {
    db.prepare(`
      INSERT INTO kelas (id, nama, tingkat, jurusan_id, wali_kelas, kapasitas, tahun_ajaran, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, nama.trim(), tingkat, jurusan_id, wali_kelas.trim(), Number(kapasitas) || 36, (tahun_ajaran || '2026/2027').trim(), nowIso, nowIso);
  } catch {
    res.status(409).json({ error: 'Nama kelas sudah ada atau jurusan tidak valid.' });
    return;
  }
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'CREATE',
    module: 'Kelas',
    targetId: id,
    description: `Menambahkan kelas baru ${nama.trim()} (Wali: ${wali_kelas.trim()})`,
    metadata: { nama, tingkat, jurusan_id, wali_kelas },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'kelas');
  res.status(201).json({ ok: true });
});

app.put('/api/kelas/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { id } = req.params;
  const { nama, tingkat, jurusan_id, wali_kelas, kapasitas, tahun_ajaran } = req.body as {
    nama?: string;
    tingkat?: 'X' | 'XI' | 'XII';
    jurusan_id?: string;
    wali_kelas?: string;
    kapasitas?: number;
    tahun_ajaran?: string;
  };
  const existing = db.prepare('SELECT * FROM kelas WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    return;
  }
  const nowIso = new Date().toISOString();
  try {
    db.prepare(`
      UPDATE kelas SET nama = ?, tingkat = ?, jurusan_id = ?, wali_kelas = ?, kapasitas = ?, tahun_ajaran = ?, updated_at = ?
      WHERE id = ?
    `).run(
      (nama || String(existing.nama)).trim(),
      tingkat || String(existing.tingkat),
      jurusan_id || String(existing.jurusan_id),
      (wali_kelas || String(existing.wali_kelas)).trim(),
      Number(kapasitas ?? existing.kapasitas),
      (tahun_ajaran || String(existing.tahun_ajaran)).trim(),
      nowIso,
      id
    );
  } catch {
    res.status(409).json({ error: 'Gagal memperbarui kelas, periksa duplikasi nama.' });
    return;
  }
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'UPDATE',
    module: 'Kelas',
    targetId: id,
    description: `Memperbarui data kelas ${nama || existing.nama}`,
    metadata: { nama, tingkat, wali_kelas },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'kelas');
  res.json({ ok: true });
});

app.delete('/api/kelas/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { id } = req.params;
  const existing = db.prepare('SELECT nama FROM kelas WHERE id = ?').get(id) as { nama: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Kelas tidak ditemukan.' });
    return;
  }
  db.prepare('DELETE FROM kelas WHERE id = ?').run(id);
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'DELETE',
    module: 'Kelas',
    targetId: id,
    description: `Menghapus kelas ${existing.nama}`,
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'kelas');
  res.json({ ok: true });
});

// ================= SISWA CRUD =================

app.post('/api/siswa', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { nis, nama, kelas_id, jenis_kelamin, email, status, nilai_rata } = req.body as {
    nis?: string;
    nama?: string;
    kelas_id?: string;
    jenis_kelamin?: 'L' | 'P';
    email?: string;
    status?: 'Aktif' | 'Cuti' | 'Lulus';
    nilai_rata?: number;
  };
  if (!nis || !nama || !kelas_id || !email) {
    res.status(400).json({ error: 'NIS, nama siswa, kelas, dan email wajib diisi.' });
    return;
  }
  const nowIso = new Date().toISOString();
  const id = generateId('sis');
  try {
    db.prepare(`
      INSERT INTO siswa (id, nis, nama, kelas_id, jenis_kelamin, email, status, nilai_rata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      nis.trim(),
      nama.trim(),
      kelas_id,
      jenis_kelamin === 'P' ? 'P' : 'L',
      email.trim().toLowerCase(),
      status || 'Aktif',
      Number(nilai_rata) || 85,
      nowIso,
      nowIso
    );
  } catch {
    res.status(409).json({ error: 'NIS sudah terdaftar atau kelas tidak valid.' });
    return;
  }
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'CREATE',
    module: 'Siswa',
    targetId: id,
    description: `Menambahkan siswa ${nama.trim()} (NIS: ${nis.trim()})`,
    metadata: { nis, nama, kelas_id, status },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'siswa');
  res.status(201).json({ ok: true });
});

app.put('/api/siswa/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { id } = req.params;
  const { nis, nama, kelas_id, jenis_kelamin, email, status, nilai_rata } = req.body as {
    nis?: string;
    nama?: string;
    kelas_id?: string;
    jenis_kelamin?: 'L' | 'P';
    email?: string;
    status?: 'Aktif' | 'Cuti' | 'Lulus';
    nilai_rata?: number;
  };
  const existing = db.prepare('SELECT * FROM siswa WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    return;
  }
  const nowIso = new Date().toISOString();
  try {
    db.prepare(`
      UPDATE siswa SET nis = ?, nama = ?, kelas_id = ?, jenis_kelamin = ?, email = ?, status = ?, nilai_rata = ?, updated_at = ?
      WHERE id = ?
    `).run(
      (nis || String(existing.nis)).trim(),
      (nama || String(existing.nama)).trim(),
      kelas_id || String(existing.kelas_id),
      jenis_kelamin || String(existing.jenis_kelamin),
      (email || String(existing.email)).trim().toLowerCase(),
      status || String(existing.status),
      Number(nilai_rata ?? existing.nilai_rata),
      nowIso,
      id
    );
  } catch {
    res.status(409).json({ error: 'NIS bentrok dengan siswa lain.' });
    return;
  }
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'UPDATE',
    module: 'Siswa',
    targetId: id,
    description: `Memperbarui data siswa ${nama || existing.nama}`,
    metadata: { nis, status, nilai_rata },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'siswa');
  res.json({ ok: true });
});

app.delete('/api/siswa/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { id } = req.params;
  const existing = db.prepare('SELECT nama, nis FROM siswa WHERE id = ?').get(id) as { nama: string; nis: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Siswa tidak ditemukan.' });
    return;
  }
  db.prepare('DELETE FROM siswa WHERE id = ?').run(id);
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'DELETE',
    module: 'Siswa',
    targetId: id,
    description: `Menghapus data siswa ${existing.nama} (NIS: ${existing.nis})`,
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'siswa');
  res.json({ ok: true });
});

// ================= GURU CRUD =================

app.post('/api/guru', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { nip, nama, bidang_studi, email, no_telp, status } = req.body as {
    nip?: string;
    nama?: string;
    bidang_studi?: string;
    email?: string;
    no_telp?: string;
    status?: 'Aktif' | 'Cuti';
  };
  if (!nip || !nama || !bidang_studi || !email) {
    res.status(400).json({ error: 'NIP, nama guru, bidang studi, dan email wajib diisi.' });
    return;
  }
  const nowIso = new Date().toISOString();
  const id = generateId('gru');
  try {
    db.prepare(`
      INSERT INTO guru (id, nip, nama, bidang_studi, email, no_telp, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, nip.trim(), nama.trim(), bidang_studi.trim(), email.trim().toLowerCase(), (no_telp || '-').trim(), status || 'Aktif', nowIso, nowIso);
  } catch {
    res.status(409).json({ error: 'NIP guru sudah terdaftar.' });
    return;
  }
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'CREATE',
    module: 'Guru',
    targetId: id,
    description: `Menambahkan data guru ${nama.trim()} (${bidang_studi.trim()})`,
    metadata: { nip, nama, bidang_studi },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'guru');
  res.status(201).json({ ok: true });
});

app.put('/api/guru/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { id } = req.params;
  const { nip, nama, bidang_studi, email, no_telp, status } = req.body as {
    nip?: string;
    nama?: string;
    bidang_studi?: string;
    email?: string;
    no_telp?: string;
    status?: 'Aktif' | 'Cuti';
  };
  const existing = db.prepare('SELECT * FROM guru WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Guru tidak ditemukan.' });
    return;
  }
  const nowIso = new Date().toISOString();
  try {
    db.prepare(`
      UPDATE guru SET nip = ?, nama = ?, bidang_studi = ?, email = ?, no_telp = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(
      (nip || String(existing.nip)).trim(),
      (nama || String(existing.nama)).trim(),
      (bidang_studi || String(existing.bidang_studi)).trim(),
      (email || String(existing.email)).trim().toLowerCase(),
      (no_telp ?? String(existing.no_telp)).trim(),
      status || String(existing.status),
      nowIso,
      id
    );
  } catch {
    res.status(409).json({ error: 'NIP bentrok dengan guru lain.' });
    return;
  }
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'UPDATE',
    module: 'Guru',
    targetId: id,
    description: `Memperbarui informasi guru ${nama || existing.nama}`,
    metadata: { nip, bidang_studi, status },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'guru');
  res.json({ ok: true });
});

app.delete('/api/guru/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { id } = req.params;
  const existing = db.prepare('SELECT nama, nip FROM guru WHERE id = ?').get(id) as { nama: string; nip: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Guru tidak ditemukan.' });
    return;
  }
  db.prepare('DELETE FROM guru WHERE id = ?').run(id);
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'DELETE',
    module: 'Guru',
    targetId: id,
    description: `Menghapus data guru ${existing.nama}`,
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'guru');
  res.json({ ok: true });
});

// ================= MATA PELAJARAN CRUD =================

app.post('/api/mata-pelajaran', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { kode, nama, jurusan_id, guru_id, jam_per_minggu, tingkat } = req.body as {
    kode?: string;
    nama?: string;
    jurusan_id?: string | null;
    guru_id?: string | null;
    jam_per_minggu?: number;
    tingkat?: 'X' | 'XI' | 'XII' | 'Semua';
  };
  if (!kode || !nama) {
    res.status(400).json({ error: 'Kode dan nama mata pelajaran wajib diisi.' });
    return;
  }
  const nowIso = new Date().toISOString();
  const id = generateId('mpl');
  try {
    db.prepare(`
      INSERT INTO mata_pelajaran (id, kode, nama, jurusan_id, guru_id, jam_per_minggu, tingkat, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, kode.trim().toUpperCase(), nama.trim(), jurusan_id || null, guru_id || null, Number(jam_per_minggu) || 4, tingkat || 'XI', nowIso, nowIso);
  } catch {
    res.status(409).json({ error: 'Kode mata pelajaran sudah digunakan.' });
    return;
  }
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'CREATE',
    module: 'Mata Pelajaran',
    targetId: id,
    description: `Menambahkan mata pelajaran ${kode.trim().toUpperCase()} — ${nama.trim()}`,
    metadata: { kode, nama, jam_per_minggu, tingkat },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'mata_pelajaran');
  res.status(201).json({ ok: true });
});

app.put('/api/mata-pelajaran/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { id } = req.params;
  const { kode, nama, jurusan_id, guru_id, jam_per_minggu, tingkat } = req.body as {
    kode?: string;
    nama?: string;
    jurusan_id?: string | null;
    guru_id?: string | null;
    jam_per_minggu?: number;
    tingkat?: 'X' | 'XI' | 'XII' | 'Semua';
  };
  const existing = db.prepare('SELECT * FROM mata_pelajaran WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
    return;
  }
  const nowIso = new Date().toISOString();
  try {
    db.prepare(`
      UPDATE mata_pelajaran SET kode = ?, nama = ?, jurusan_id = ?, guru_id = ?, jam_per_minggu = ?, tingkat = ?, updated_at = ?
      WHERE id = ?
    `).run(
      (kode || String(existing.kode)).trim().toUpperCase(),
      (nama || String(existing.nama)).trim(),
      jurusan_id === '' ? null : (jurusan_id ?? (existing.jurusan_id ? String(existing.jurusan_id) : null)),
      guru_id === '' ? null : (guru_id ?? (existing.guru_id ? String(existing.guru_id) : null)),
      Number(jam_per_minggu ?? existing.jam_per_minggu),
      tingkat || String(existing.tingkat),
      nowIso,
      id
    );
  } catch {
    res.status(409).json({ error: 'Kode mata pelajaran bentrok dengan data lain.' });
    return;
  }
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'UPDATE',
    module: 'Mata Pelajaran',
    targetId: id,
    description: `Memperbarui mata pelajaran ${nama || existing.nama}`,
    metadata: { kode, jam_per_minggu, tingkat },
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'mata_pelajaran');
  res.json({ ok: true });
});

app.delete('/api/mata-pelajaran/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { id } = req.params;
  const existing = db.prepare('SELECT kode, nama FROM mata_pelajaran WHERE id = ?').get(id) as { kode: string; nama: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
    return;
  }
  db.prepare('DELETE FROM mata_pelajaran WHERE id = ?').run(id);
  const { ip, ua } = getClientMeta(req);
  const log = recordActivity({
    user: req.authUser,
    action: 'DELETE',
    module: 'Mata Pelajaran',
    targetId: id,
    description: `Menghapus mata pelajaran ${existing.kode} — ${existing.nama}`,
    ipAddress: ip,
    userAgent: ua,
    durationMs: Date.now() - started,
  });
  emitActivityAndSync(log, 'mata_pelajaran');
  res.json({ ok: true });
});

// ================= GEMINI AI CHATBOX ENDPOINT =================

app.get('/api/chat/history', optionalAuth, (req: AuthedRequest, res: Response) => {
  const messages = listChatMessages(req.authUser?.id ?? null);
  res.json({ messages });
});

app.delete('/api/chat/history', optionalAuth, (req: AuthedRequest, res: Response) => {
  clearChatMessages(req.authUser?.id ?? null);
  res.json({ ok: true });
});

app.post('/api/chat', optionalAuth, async (req: AuthedRequest, res: Response) => {
  const started = Date.now();
  const { message, history } = req.body as {
    message?: string;
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  };

  if (!message || !message.trim()) {
    res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: 'GEMINI_API_KEY belum dikonfigurasi di server. Silakan periksa panel Settings > Secrets.',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const analytics = getDashboardAnalytics();
    const recentJurusan = listJurusan().map((j) => `${j.kode} (${j.nama})`).join(', ');
    const recentKelas = listKelas().map((k) => k.nama).join(', ');

    const systemInstruction = `Anda adalah Asisten Manajemen Sekolah yang responsif, ramah, dan terstruktur untuk aplikasi "Manajemen Sekolah — Proyek Kelas XI RPL/PPLG".
Jawablah selalu dalam bahasa Indonesia yang jelas, ringkas, dan praktis.

Konteks Data Real-Time Sekolah Saat Ini:
- Jumlah Jurusan: ${analytics.counts.jurusan} (${recentJurusan})
- Jumlah Kelas: ${analytics.counts.kelas} (${recentKelas})
- Jumlah Siswa: ${analytics.counts.siswa}
- Jumlah Guru: ${analytics.counts.guru}
- Jumlah Mata Pelajaran: ${analytics.counts.mata_pelajaran}
- Jumlah Pengguna Terdaftar: ${analytics.counts.users}
- Total Log Aktivitas: ${analytics.counts.total_activities} (${analytics.counts.today_activities} aktivitas hari ini)
- Pengguna aktif saat ini: ${req.authUser ? `${req.authUser.name} (${req.authUser.role})` : 'Pengunjung (belum login)'}

Kemampuan Aplikasi yang dapat Anda bantu jelaskan:
1. Sistem Login & Registrasi berbasis akun lokal dengan peran Admin, Guru, dan Siswa.
2. Sinkronisasi database SQLite lokal secara real-time melalui WebSocket ke semua klien yang terhubung.
3. Dasbor Interaktif untuk memantau aktivitas pengguna secara terperinci (grafik per jam/7 hari, kehadiran online, log detail).
4. Modul CRUD Lengkap: Data Jurusan, Data Kelas, Data Siswa, Data Guru, dan Mata Pelajaran.
5. Ekspor laporan ke format PDF dan Excel (.xlsx) dari Dasbor maupun tabel data akademik.
6. Dukungan Mode Terang dan Mode Gelap.
7. Konsep pembelajaran Laravel, Blade, relasi database MySQL/SQLite, dan CRUD untuk siswa XI RPL/PPLG.

Berikan jawaban yang terfokus maksimal 3-5 paragraf pendek atau poin ringkas.`;

    const recentTurns = Array.isArray(history) ? history.slice(-6) : [];
    const promptWithContext = recentTurns.length > 0
      ? `Riwayat percakapan singkat:\n${recentTurns
          .map((t) => `${t.role === 'user' ? 'Pengguna' : 'Asisten'}: ${t.text}`)
          .join('\n')}\n\nPertanyaan terbaru Pengguna: ${message.trim()}`
      : message.trim();

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptWithContext,
      config: {
        systemInstruction,
      },
    });

    const replyText = response.text?.trim();
    if (!replyText) {
      res.status(502).json({ error: 'Asisten AI tidak mengembalikan teks jawaban.' });
      return;
    }

    saveChatMessage({
      userId: req.authUser?.id ?? null,
      role: 'user',
      text: message.trim(),
    });
    saveChatMessage({
      userId: req.authUser?.id ?? null,
      role: 'assistant',
      text: replyText,
    });

    const { ip, ua } = getClientMeta(req);
    const log = recordActivity({
      user: req.authUser ?? null,
      action: 'AI_CHAT',
      module: 'Asisten AI',
      targetId: 'gemini-4-hydrogen',
      description: `Mengajukan pertanyaan ke Asisten AI: "${message.trim().slice(0, 70)}${message.trim().length > 70 ? '...' : ''}"`,
      metadata: { model: 'gemini-4-hydrogen', promptLength: message.trim().length },
      ipAddress: ip,
      userAgent: ua,
      durationMs: Date.now() - started,
    });
    emitActivityAndSync(log);

    res.json({ reply: replyText });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Gagal menghubungi layanan AI.';
    res.status(500).json({ error: `Kesalahan layanan AI: ${errorMessage}` });
  }
});

// ================= VITE / STATIC FRONTEND =================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Manajemen Sekolah server running on http://localhost:${PORT}`);
  });
}

const handleShutdown = () => {
  closeDatabaseCleanly();
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1500);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

startServer();
