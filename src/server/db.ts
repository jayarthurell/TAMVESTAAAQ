import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  User,
  Subject,
  DigitalBook,
  Announcement,
  Quiz,
  QuizAttempt,
  AttendanceEvent,
  AttendanceRecord,
  PasswordResetRequest,
} from '../types/index.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'tamvesta-data.json');

export interface DatabaseSchema {
  users: User[];
  subjects: Subject[];
  books: DigitalBook[];
  announcements: Announcement[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  attendanceEvents: AttendanceEvent[];
  attendanceRecords: AttendanceRecord[];
  passwordResetRequests: PasswordResetRequest[];
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, chosenSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: chosenSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const newHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(newHash, 'hex'));
}

export function generateQrToken(userId: string, username: string): string {
  const secret = 'TAMVESTA-SECURE-SALT-2026';
  const tokenHash = crypto.createHmac('sha256', secret).update(`${userId}:${username}`).digest('hex').substring(0, 16);
  return `TAMVESTA:STUDENT:${userId}:${tokenHash}`;
}

export function generateRandomQuizToken(): string {
  const prefix = 'TVQ';
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomDigits}`;
}

export function getInitialData(): DatabaseSchema {
  const now = new Date().toISOString();

  // 1. Akun Admin Utama
  const adminPass = hashPassword('TAMVESTA123');
  const adminUser: User = {
    id: 'user_admin_tamansiswa',
    username: 'TAMANSISWA',
    name: 'Administrator Tamansiswa Batam',
    role: 'admin',
    passwordHash: adminPass.hash,
    salt: adminPass.salt,
    mustChangePassword: true, // Wajib ganti password pada login pertama
    isActive: true,
    qrToken: generateQrToken('user_admin_tamansiswa', 'TAMANSISWA'),
    createdAt: now,
    updatedAt: now,
  };

  // 2. Akun Guru Resmi Tamansiswa Batam
  const guru1Pass = hashPassword('GuruTamvesta123');
  const guru1: User = {
    id: 'user_guru_budi',
    username: 'guru.matematika',
    name: 'Budi Santoso, S.Pd.',
    role: 'guru',
    passwordHash: guru1Pass.hash,
    salt: guru1Pass.salt,
    mustChangePassword: false,
    isActive: true,
    qrToken: generateQrToken('user_guru_budi', 'guru.matematika'),
    createdAt: now,
    updatedAt: now,
  };

  const guru2Pass = hashPassword('GuruTamvesta123');
  const guru2: User = {
    id: 'user_guru_siti',
    username: 'guru.bahasa',
    name: 'Dra. Siti Rahmawati, M.Pd.',
    role: 'guru',
    passwordHash: guru2Pass.hash,
    salt: guru2Pass.salt,
    mustChangePassword: false,
    isActive: true,
    qrToken: generateQrToken('user_guru_siti', 'guru.bahasa'),
    createdAt: now,
    updatedAt: now,
  };

  // 3. Akun Pimpinan & Staf Sekolah
  const kepalaPass = hashPassword('KepalaTamvesta123');
  const kepalaUser: User = {
    id: 'user_kepala_sekolah',
    username: 'kepala.sekolah',
    name: 'Drs. Ki H. Hadikusumo, M.M.',
    role: 'kepala_sekolah',
    passwordHash: kepalaPass.hash,
    salt: kepalaPass.salt,
    mustChangePassword: false,
    isActive: true,
    qrToken: generateQrToken('user_kepala_sekolah', 'kepala.sekolah'),
    createdAt: now,
    updatedAt: now,
  };

  const panitiaPass = hashPassword('PanitiaTamvesta123');
  const panitiaUser: User = {
    id: 'user_panitia_osis',
    username: 'panitia.osis',
    name: 'Panitia OSIS Tamansiswa',
    role: 'panitia',
    passwordHash: panitiaPass.hash,
    salt: panitiaPass.salt,
    mustChangePassword: false,
    isActive: true,
    qrToken: generateQrToken('user_panitia_osis', 'panitia.osis'),
    createdAt: now,
    updatedAt: now,
  };

  return {
    users: [adminUser, guru1, guru2, kepalaUser, panitiaUser],
    subjects: [],
    books: [],
    announcements: [],
    quizzes: [],
    quizAttempts: [],
    attendanceEvents: [],
    attendanceRecords: [],
    passwordResetRequests: [],
  };
}

class DatabaseManager {
  private data: DatabaseSchema;
  private isSaving = false;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure admin user always exists
        if (!parsed.users || !parsed.users.some((u: User) => u.username === 'TAMANSISWA')) {
          const initial = getInitialData();
          parsed.users = [...(parsed.users || []), ...initial.users.filter(u => u.username === 'TAMANSISWA')];
        }
        return {
          users: parsed.users || [],
          subjects: parsed.subjects || [],
          books: parsed.books || [],
          announcements: parsed.announcements || [],
          quizzes: parsed.quizzes || [],
          quizAttempts: parsed.quizAttempts || [],
          attendanceEvents: parsed.attendanceEvents || [],
          attendanceRecords: parsed.attendanceRecords || [],
          passwordResetRequests: parsed.passwordResetRequests || [],
        };
      }
    } catch (err) {
      console.error('[DB] Error loading database file, initializing clean database:', err);
    }

    const initial = getInitialData();
    this.saveDataDirect(initial);
    return initial;
  }

  public resetToClean(clearDemoStudents = true) {
    const initial = getInitialData();
    if (clearDemoStudents) {
      this.data.users = initial.users;
    }
    this.data.subjects = [];
    this.data.books = [];
    this.data.announcements = [];
    this.data.quizzes = [];
    this.data.quizAttempts = [];
    this.data.attendanceEvents = [];
    this.data.attendanceRecords = [];
    this.data.passwordResetRequests = [];
    this.save();
  }

  private saveDataDirect(dataToSave: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to save database file:', err);
    }
  }

  private save() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
      this.saveDataDirect(this.data);
    } finally {
      this.isSaving = false;
    }
  }

  // --- Users & Authentication ---
  public findUserByUsername(username: string): User | undefined {
    return this.data.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getAllStudents(): User[] {
    return this.data.users.filter((u) => u.role === 'siswa');
  }

  public getAllUsers(): User[] {
    return this.data.users;
  }

  public getUsers(): User[] {
    return this.data.users;
  }

  public createStudent(userData: {
    name: string;
    username: string;
    password: string;
    nisn?: string;
    kelas?: string;
  }): { success: boolean; user?: User; error?: string } {
    const trimmedUsername = userData.username.trim();
    if (!trimmedUsername) {
      return { success: false, error: 'Username wajib diisi.' };
    }
    if (!userData.name.trim()) {
      return { success: false, error: 'Nama lengkap siswa wajib diisi.' };
    }
    if (!userData.password || userData.password.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter demi keamanan akun.' };
    }

    // Check unique username
    const exists = this.findUserByUsername(trimmedUsername);
    if (exists) {
      return { success: false, error: `Username "${trimmedUsername}" sudah terdaftar. Gunakan username lain.` };
    }

    const now = new Date().toISOString();
    const id = `stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pass = hashPassword(userData.password);
    const qrToken = generateQrToken(id, trimmedUsername);

    const newUser: User = {
      id,
      username: trimmedUsername,
      name: userData.name.trim(),
      role: 'siswa',
      nisn: userData.nisn?.trim() || `006${Math.floor(1000000 + Math.random() * 9000000)}`,
      kelas: userData.kelas?.trim() || 'X Tamansiswa',
      passwordHash: pass.hash,
      salt: pass.salt,
      mustChangePassword: true, // Wajib ganti password pada login pertama
      isActive: true,
      qrToken,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}&backgroundColor=0284c7`,
      createdAt: now,
      updatedAt: now,
    };

    this.data.users.push(newUser);
    this.save();
    return { success: true, user: newUser };
  }

  public toggleUserActive(userId: string): { success: boolean; isActive?: boolean; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };
    if (user.username === 'TAMANSISWA') {
      return { success: false, error: 'Akun Admin Utama TAMANSISWA tidak dapat dinonaktifkan.' };
    }
    user.isActive = !user.isActive;
    user.updatedAt = new Date().toISOString();
    this.save();
    return { success: true, isActive: user.isActive };
  }

  public resetUserPassword(userId: string, newPassword: string): { success: boolean; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password baru minimal 6 karakter.' };
    }
    const hashed = hashPassword(newPassword);
    user.passwordHash = hashed.hash;
    user.salt = hashed.salt;
    user.mustChangePassword = true;
    user.updatedAt = new Date().toISOString();
    this.save();
    return { success: true };
  }

  public changePassword(userId: string, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };
    if (!verifyPassword(oldPassword, user.passwordHash, user.salt)) {
      return { success: false, error: 'Password lama tidak sesuai.' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'Password baru minimal 6 karakter.' };
    }

    const hashed = hashPassword(newPassword);
    user.passwordHash = hashed.hash;
    user.salt = hashed.salt;
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();
    this.save();
    return { success: true };
  }

  // Username modification with 30-day constraint
  public updateUsername(userId: string, newUsername: string): { success: boolean; user?: User; error?: string; daysRemaining?: number } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };

    const trimmed = newUsername.trim().toLowerCase();
    if (trimmed.length < 3) {
      return { success: false, error: 'Username minimal 3 karakter.' };
    }
    if (!/^[a-z0-9._]+$/.test(trimmed)) {
      return { success: false, error: 'Username hanya boleh berisi huruf kecil, angka, titik, atau garis bawah (_).' };
    }

    if (trimmed === user.username.toLowerCase()) {
      return { success: false, error: 'Username baru tidak boleh sama dengan username saat ini.' };
    }

    // Check 30-day restriction
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    if (user.lastUsernameChange) {
      const lastChange = new Date(user.lastUsernameChange).getTime();
      const elapsed = Date.now() - lastChange;
      if (elapsed < THIRTY_DAYS_MS) {
        const daysRemaining = Math.ceil((THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000));
        return {
          success: false,
          error: `Username hanya dapat diubah maksimal 1 kali dalam periode 30 hari. Anda baru dapat mengubahnya kembali dalam ${daysRemaining} hari.`,
          daysRemaining,
        };
      }
    }

    // Check if newUsername is already taken
    const exists = this.findUserByUsername(trimmed);
    if (exists && exists.id !== user.id) {
      return { success: false, error: `Username "${trimmed}" sudah digunakan oleh pengguna lain.` };
    }

    const oldUsername = user.username;
    user.username = trimmed;
    user.lastUsernameChange = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    user.qrToken = generateQrToken(user.id, trimmed);

    if (!user.usernameChangeHistory) {
      user.usernameChangeHistory = [];
    }
    user.usernameChangeHistory.push({
      oldUsername,
      newUsername: trimmed,
      changedAt: user.lastUsernameChange,
    });

    this.save();
    return { success: true, user };
  }

  // Password Reset Requests (for non-admin users)
  public createPasswordResetRequest(userId: string, reason: string): { success: boolean; request?: PasswordResetRequest; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'Pengguna tidak ditemukan.' };

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'Mohon tuliskan alasan atau keterangan permintaan reset password (minimal 5 karakter).' };
    }

    // Check for existing pending request
    const existing = this.data.passwordResetRequests.find(
      (r) => r.userId === userId && r.status === 'pending'
    );
    if (existing) {
      return { success: false, error: 'Anda sudah memiliki permintaan reset password yang sedang menunggu verifikasi Administrator.' };
    }

    const newReq: PasswordResetRequest = {
      id: `pr_${Date.now()}`,
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.data.passwordResetRequests.unshift(newReq);
    this.save();
    return { success: true, request: newReq };
  }

  public getPasswordResetRequests(): PasswordResetRequest[] {
    return this.data.passwordResetRequests;
  }

  public processPasswordResetRequest(
    requestId: string,
    adminUser: User,
    status: 'approved' | 'rejected',
    tempPassword?: string,
    adminNote?: string
  ): { success: boolean; request?: PasswordResetRequest; tempPassword?: string; error?: string } {
    const req = this.data.passwordResetRequests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'Permintaan reset password tidak ditemukan.' };

    const user = this.findUserById(req.userId);
    if (!user) return { success: false, error: 'Pengguna akun tidak ditemukan.' };

    req.status = status;
    req.processedAt = new Date().toISOString();
    req.processedBy = adminUser.name;
    req.adminNote = adminNote || (status === 'approved' ? 'Disetujui oleh Administrator' : 'Ditolak');

    let assignedPassword = tempPassword;
    if (status === 'approved') {
      if (!assignedPassword) {
        assignedPassword = `TAMVESTA${Math.floor(1000 + Math.random() * 9000)}`;
      }
      const hashed = hashPassword(assignedPassword);
      user.passwordHash = hashed.hash;
      user.salt = hashed.salt;
      user.mustChangePassword = true;
      user.updatedAt = new Date().toISOString();
    }

    this.save();
    return { success: true, request: req, tempPassword: assignedPassword };
  }

  // --- Subjects ---
  public getSubjects(): Subject[] {
    return this.data.subjects;
  }

  public findSubjectById(id: string): Subject | undefined {
    return this.data.subjects.find((s) => s.id === id);
  }

  public addSubject(subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Subject {
    const now = new Date().toISOString();
    const newSubject: Subject = {
      ...subject,
      id: `subj_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.subjects.push(newSubject);
    this.save();
    return newSubject;
  }

  public updateSubject(id: string, updates: Partial<Subject>): Subject | null {
    const idx = this.data.subjects.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.data.subjects[idx] = {
      ...this.data.subjects[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.subjects[idx];
  }

  public deleteSubject(id: string): boolean {
    const initialLen = this.data.subjects.length;
    this.data.subjects = this.data.subjects.filter((s) => s.id !== id);
    if (this.data.subjects.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Digital Books ---
  public getBooks(): DigitalBook[] {
    return this.data.books;
  }

  public findBookById(id: string): DigitalBook | undefined {
    return this.data.books.find((b) => b.id === id);
  }

  public addBook(book: Omit<DigitalBook, 'id' | 'createdAt'>): DigitalBook {
    const newBook: DigitalBook = {
      ...book,
      id: `book_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.books.push(newBook);
    this.save();
    return newBook;
  }

  public updateBook(id: string, updates: Partial<DigitalBook>): DigitalBook | null {
    const idx = this.data.books.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this.data.books[idx] = {
      ...this.data.books[idx],
      ...updates,
    };
    this.save();
    return this.data.books[idx];
  }

  public deleteBook(id: string): boolean {
    const initialLen = this.data.books.length;
    this.data.books = this.data.books.filter((b) => b.id !== id);
    if (this.data.books.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Announcements ---
  public getAnnouncements(): Announcement[] {
    return this.data.announcements.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public findAnnouncementById(id: string): Announcement | undefined {
    return this.data.announcements.find((a) => a.id === id);
  }

  public addAnnouncement(ann: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Announcement {
    const now = new Date().toISOString();
    const newAnn: Announcement = {
      ...ann,
      id: `ann_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.announcements.unshift(newAnn);
    this.save();
    return newAnn;
  }

  public updateAnnouncement(id: string, updates: Partial<Announcement>): Announcement | null {
    const idx = this.data.announcements.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.data.announcements[idx] = {
      ...this.data.announcements[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.announcements[idx];
  }

  public deleteAnnouncement(id: string): boolean {
    const initialLen = this.data.announcements.length;
    this.data.announcements = this.data.announcements.filter((a) => a.id !== id);
    if (this.data.announcements.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Quizzes & Tokens ---
  public getQuizzes(): Quiz[] {
    return this.data.quizzes;
  }

  public findQuizById(id: string): Quiz | undefined {
    return this.data.quizzes.find((q) => q.id === id);
  }

  public findQuizByToken(token: string): Quiz | undefined {
    const clean = token.trim().toUpperCase();
    return this.data.quizzes.find((q) => q.token?.toUpperCase() === clean);
  }

  public verifyQuizAccess(payload: {
    token: string;
    studentName?: string;
    password?: string;
  }): { success: boolean; quiz?: Quiz; error?: string } {
    const cleanToken = payload.token ? payload.token.trim().toUpperCase() : '';
    if (!cleanToken) {
      return { success: false, error: 'Token quiz wajib diisi.' };
    }

    const quiz = this.findQuizByToken(cleanToken);
    if (!quiz) {
      return { success: false, error: 'Token quiz tidak ditemukan atau tidak valid. Silakan periksa kembali token yang diberikan oleh Guru.' };
    }

    if (!quiz.isActive || quiz.status === 'inactive') {
      return { success: false, error: 'Quiz ini sedang tidak aktif atau telah ditutup oleh Guru.' };
    }

    if (quiz.password && quiz.password.trim() !== '') {
      if (!payload.password || payload.password !== quiz.password) {
        return { success: false, error: 'Password quiz salah. Silakan hubungi Guru pengampu untuk mendapatkan password yang benar.' };
      }
    }

    return { success: true, quiz };
  }

  public addQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Quiz {
    const cleanToken = quiz.token && quiz.token.trim() !== '' ? quiz.token.trim().toUpperCase() : generateRandomQuizToken();
    const newQuiz: Quiz = {
      ...quiz,
      id: `quiz_${Date.now()}`,
      token: cleanToken,
      sourceType: quiz.sourceType || 'interactive',
      status: quiz.status || (quiz.isActive ? 'active' : 'inactive'),
      createdAt: new Date().toISOString(),
    };
    this.data.quizzes.push(newQuiz);
    this.save();
    return newQuiz;
  }

  public updateQuiz(id: string, updates: Partial<Quiz>): Quiz | null {
    const idx = this.data.quizzes.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    this.data.quizzes[idx] = {
      ...this.data.quizzes[idx],
      ...updates,
      token: updates.token ? updates.token.trim().toUpperCase() : this.data.quizzes[idx].token,
    };
    this.save();
    return this.data.quizzes[idx];
  }

  public deleteQuiz(id: string): boolean {
    const initialLen = this.data.quizzes.length;
    this.data.quizzes = this.data.quizzes.filter((q) => q.id !== id);
    if (this.data.quizzes.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  public submitQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'completedAt'>): QuizAttempt {
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: `att_${Date.now()}`,
      completedAt: new Date().toISOString(),
    };
    this.data.quizAttempts.push(newAttempt);
    this.save();
    return newAttempt;
  }

  public getQuizAttempts(quizId?: string, studentId?: string): QuizAttempt[] {
    let result = this.data.quizAttempts;
    if (quizId) result = result.filter((a) => a.quizId === quizId);
    if (studentId) result = result.filter((a) => a.studentId === studentId);
    return result.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  // --- Attendance Events & Sessions ---
  public getAttendanceEvents(): AttendanceEvent[] {
    return this.data.attendanceEvents;
  }

  public findEventById(id: string): AttendanceEvent | undefined {
    return this.data.attendanceEvents.find((e) => e.id === id);
  }

  public createAttendanceEvent(eventData: Omit<AttendanceEvent, 'id' | 'createdAt'>): AttendanceEvent {
    const newEvent: AttendanceEvent = {
      ...eventData,
      id: `event_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.attendanceEvents.unshift(newEvent);
    this.save();
    return newEvent;
  }

  public updateAttendanceEvent(id: string, updates: Partial<AttendanceEvent>): AttendanceEvent | null {
    const idx = this.data.attendanceEvents.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.data.attendanceEvents[idx] = {
      ...this.data.attendanceEvents[idx],
      ...updates,
    };
    this.save();
    return this.data.attendanceEvents[idx];
  }

  public toggleEventSession(id: string): { success: boolean; isOpen?: boolean; error?: string } {
    const event = this.findEventById(id);
    if (!event) return { success: false, error: 'Kegiatan tidak ditemukan.' };
    event.isOpen = !event.isOpen;
    this.save();
    return { success: true, isOpen: event.isOpen };
  }

  public deleteAttendanceEvent(id: string): boolean {
    const initialLen = this.data.attendanceEvents.length;
    this.data.attendanceEvents = this.data.attendanceEvents.filter((e) => e.id !== id);
    if (this.data.attendanceEvents.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Attendance Records & Scan Verification ---
  public getAttendanceRecords(eventId?: string): AttendanceRecord[] {
    if (eventId) {
      return this.data.attendanceRecords.filter((r) => r.eventId === eventId);
    }
    return this.data.attendanceRecords;
  }

  public processQrScan(payload: {
    eventId: string;
    qrString: string;
    verifiedBy: string;
  }): {
    status: 'SUCCESS' | 'ALREADY_SCANNED' | 'INVALID_QR' | 'ACCOUNT_INACTIVE' | 'SESSION_CLOSED' | 'SERVER_ERROR';
    message: string;
    record?: AttendanceRecord;
    student?: { id: string; name: string; username: string; kelas?: string };
    event?: { id: string; name: string };
    scanTime?: string;
  } {
    const event = this.findEventById(payload.eventId);
    if (!event) {
      return {
        status: 'SERVER_ERROR',
        message: 'Kegiatan tidak ditemukan.',
      };
    }

    if (!event.isOpen) {
      return {
        status: 'SESSION_CLOSED',
        message: `Sesi absensi untuk kegiatan "${event.name}" saat ini sedang DITUTUP.`,
        event: { id: event.id, name: event.name },
      };
    }

    const parts = payload.qrString.trim().split(':');
    let student: User | undefined;

    if (parts.length >= 3 && parts[0] === 'TAMVESTA' && parts[1] === 'STUDENT') {
      const studentId = parts[2];
      student = this.findUserById(studentId);
    } else {
      student = this.findUserByUsername(payload.qrString.trim());
    }

    if (!student) {
      return {
        status: 'INVALID_QR',
        message: 'QR Code tidak terdaftar dalam sistem Tamansiswa Batam.',
        event: { id: event.id, name: event.name },
      };
    }

    if (!student.isActive) {
      return {
        status: 'ACCOUNT_INACTIVE',
        message: `Akun siswa @${student.username} (${student.name}) dalam status NONAKTIF. Hubungi Administrator.`,
        student: { id: student.id, name: student.name, username: student.username, kelas: student.kelas },
        event: { id: event.id, name: event.name },
      };
    }

    const alreadyScanned = this.data.attendanceRecords.some(
      (r) => r.eventId === event.id && r.studentId === student!.id
    );

    if (alreadyScanned) {
      return {
        status: 'ALREADY_SCANNED',
        message: `Siswa ${student.name} (@${student.username}) SUDAH ABSEN sebelumnya pada kegiatan ini.`,
        student: { id: student.id, name: student.name, username: student.username, kelas: student.kelas },
        event: { id: event.id, name: event.name },
      };
    }

    const now = new Date().toISOString();
    const newRecord: AttendanceRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId: event.id,
      eventName: event.name,
      studentId: student.id,
      studentName: student.name,
      username: student.username,
      kelas: student.kelas,
      verifiedAt: now,
      verifiedBy: payload.verifiedBy,
      status: 'TELAH MASUK',
      verificationResult: 'BERHASIL',
    };

    this.data.attendanceRecords.unshift(newRecord);
    this.save();

    return {
      status: 'SUCCESS',
      message: `Presensi Berhasil! Siswa ${student.name} (${student.kelas || 'Siswa'}) tercatat TELAH MASUK.`,
      record: newRecord,
      student: { id: student.id, name: student.name, username: student.username, kelas: student.kelas },
      event: { id: event.id, name: event.name },
      scanTime: now,
    };
  }
}

export const db = new DatabaseManager();
