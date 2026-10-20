import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, verifyPassword, generateRandomQuizToken } from './src/server/db.ts';
import {
  createSessionToken,
  authMiddleware,
  requireRole,
  type AuthenticatedRequest,
} from './src/server/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to sanitize user object (remove hash & salt)
function sanitizeUser(user: any) {
  if (!user) return null;
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

// -------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }

  const user = db.findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Username atau password tidak ditemukan.' });
  }

  if (!user.isActive) {
    return res.status(403).json({
      error: 'Akun Anda dinonaktifkan oleh Administrator. Silakan hubungi bagian tata usaha sekolah.',
    });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Username atau password tidak sesuai.' });
  }

  const token = createSessionToken(user.id);
  return res.json({
    token,
    user: sanitizeUser(user),
    mustChangePassword: !!user.mustChangePassword,
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  return res.json({
    user: sanitizeUser(req.user),
    mustChangePassword: !!req.user?.mustChangePassword,
  });
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Password lama dan password baru wajib diisi.' });
  }

  const result = db.changePassword(req.user!.id, oldPassword, newPassword);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const updatedUser = db.findUserById(req.user!.id);
  return res.json({
    message: 'Password berhasil diperbarui!',
    user: sanitizeUser(updatedUser),
  });
});

// PUT /api/auth/username (Maksimal 1 kali dalam 30 hari)
app.put('/api/auth/username', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { newUsername } = req.body;
  if (!newUsername) {
    return res.status(400).json({ error: 'Username baru wajib diisi.' });
  }

  const result = db.updateUsername(req.user!.id, newUsername);
  if (!result.success) {
    return res.status(400).json({
      error: result.error,
      daysRemaining: result.daysRemaining,
    });
  }

  const newToken = createSessionToken(result.user!.id);
  return res.json({
    message: 'Username berhasil diperbarui!',
    user: sanitizeUser(result.user),
    token: newToken,
  });
});

// POST /api/auth/password-reset-request (Permintaan reset password diajukan ke admin)
app.post('/api/auth/password-reset-request', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { reason } = req.body;
  const result = db.createPasswordResetRequest(req.user!.id, reason);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json({
    message: 'Permintaan reset password berhasil diajukan kepada Administrator.',
    request: result.request,
  });
});

// GET /api/admin/password-reset-requests (Admin only)
app.get('/api/admin/password-reset-requests', authMiddleware, requireRole(['admin', 'kepala_sekolah']), (req, res) => {
  const requests = db.getPasswordResetRequests();
  return res.json(requests);
});

// POST /api/admin/password-reset-requests/:id/process (Admin approves/rejects request)
app.post('/api/admin/password-reset-requests/:id/process', authMiddleware, requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, tempPassword, adminNote } = req.body;
  if (!status || (status !== 'approved' && status !== 'rejected')) {
    return res.status(400).json({ error: 'Status harus "approved" atau "rejected".' });
  }

  const result = db.processPasswordResetRequest(id, req.user!, status, tempPassword, adminNote);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  return res.json({
    message: status === 'approved' ? 'Permintaan disetujui & password baru diatur!' : 'Permintaan telah ditolak.',
    request: result.request,
    tempPassword: result.tempPassword,
  });
});

// -------------------------------------------------------------
// 2. ADMIN: STUDENT REGISTRATION & MANAGEMENT
// -------------------------------------------------------------

// GET /api/admin/students
app.get('/api/admin/students', authMiddleware, requireRole(['admin', 'kepala_sekolah']), (req, res) => {
  const students = db.getUsers().filter((u) => u.role === 'siswa');
  return res.json(students.map(sanitizeUser));
});

// POST /api/admin/students (Pendaftaran Akun Siswa oleh Admin)
app.post('/api/admin/students', authMiddleware, requireRole(['admin']), (req, res) => {
  const { name, username, password, nisn, kelas } = req.body;
  const result = db.createStudent({ name, username, password, nisn, kelas });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json({
    message: 'Akun siswa berhasil didaftarkan!',
    student: sanitizeUser(result.user),
  });
});

// PATCH /api/admin/students/:id/toggle-active
app.patch('/api/admin/students/:id/toggle-active', authMiddleware, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const result = db.toggleUserActive(id);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  return res.json({
    message: `Status akun siswa berhasil ${result.isActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
    isActive: result.isActive,
  });
});

// POST /api/admin/students/:id/reset-password
app.post('/api/admin/students/:id/reset-password', authMiddleware, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const result = db.resetUserPassword(id, newPassword);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  return res.json({ message: 'Password akun siswa berhasil direset. Siswa wajib mengganti password saat login berikutnya.' });
});

// -------------------------------------------------------------
// 3. MATA PELAJARAN (SUBJECTS)
// -------------------------------------------------------------

// GET /api/subjects
app.get('/api/subjects', authMiddleware, (req, res) => {
  const subjects = db.getSubjects();
  return res.json(subjects);
});

// POST /api/subjects (Admin only)
app.post('/api/subjects', authMiddleware, requireRole(['admin']), (req, res) => {
  const { name, code, teacherName, description, grade, schedule, imageUrl, room } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Nama dan kode mata pelajaran wajib diisi.' });
  }
  const newSub = db.addSubject({
    name,
    code,
    teacherName: teacherName || 'Guru Pengampu',
    description: description || '',
    grade: grade || 'Semua Tingkat',
    schedule: schedule || 'Sesuai Jadwal',
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    room: room || 'Ruang Kelas',
  });
  return res.status(201).json(newSub);
});

// PUT /api/subjects/:id
app.put('/api/subjects/:id', authMiddleware, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const updated = db.updateSubject(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
  }
  return res.json(updated);
});

// DELETE /api/subjects/:id
app.delete('/api/subjects/:id', authMiddleware, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const ok = db.deleteSubject(id);
  if (!ok) {
    return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });
  }
  return res.json({ message: 'Mata pelajaran berhasil dihapus.' });
});

// -------------------------------------------------------------
// 4. PERPUSTAKAAN DIGITAL (BOOKS)
// -------------------------------------------------------------

// GET /api/books
app.get('/api/books', authMiddleware, (req, res) => {
  const books = db.getBooks();
  return res.json(books);
});

// POST /api/books (Admin only)
app.post('/api/books', authMiddleware, requireRole(['admin']), (req, res) => {
  const { title, author, category, coverUrl, description, totalPages, publishedYear, content } = req.body;
  if (!title || !author) {
    return res.status(400).json({ error: 'Judul dan penulis buku wajib diisi.' });
  }
  const newBook = db.addBook({
    title,
    author,
    category: category || 'Umum',
    coverUrl: coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    description: description || '',
    totalPages: Number(totalPages) || 120,
    publishedYear: publishedYear || '2024',
    content: Array.isArray(content) && content.length > 0 ? content : [
      'BAB I: Pengantar dan Latar Belakang Topik Buku Digital Tamansiswa Batam.',
      'BAB II: Uraian Konsep Dasar dan Diskusi Materi.',
      'BAB III: Studi Kasus, Penerapan Praktis, dan Kesimpulan Akademik.',
    ],
  });
  return res.status(201).json(newBook);
});

// PUT /api/books/:id
app.put('/api/books/:id', authMiddleware, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const updated = db.updateBook(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Buku digital tidak ditemukan.' });
  }
  return res.json(updated);
});

// DELETE /api/books/:id
app.delete('/api/books/:id', authMiddleware, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const ok = db.deleteBook(id);
  if (!ok) {
    return res.status(404).json({ error: 'Buku tidak ditemukan.' });
  }
  return res.json({ message: 'Buku berhasil dihapus dari katalog.' });
});

// -------------------------------------------------------------
// 5. PENGUMUMAN SEKOLAH (ANNOUNCEMENTS)
// -------------------------------------------------------------

// GET /api/announcements
app.get('/api/announcements', authMiddleware, (req, res) => {
  const announcements = db.getAnnouncements();
  return res.json(announcements);
});

// POST /api/announcements (Admin only)
app.post('/api/announcements', authMiddleware, requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi.' });
  }
  const newAnn = db.addAnnouncement({
    title,
    content,
    category: category || 'Penting',
    authorName: req.user?.name || 'Administrator Tamansiswa',
    authorRole: req.user?.role === 'admin' ? 'Admin Sekolah' : 'Pihak Sekolah',
    isPublished: true,
  });
  return res.status(201).json(newAnn);
});

// PUT /api/announcements/:id
app.put('/api/announcements/:id', authMiddleware, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const updated = db.updateAnnouncement(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Pengumuman tidak ditemukan.' });
  }
  return res.json(updated);
});

// DELETE /api/announcements/:id
app.delete('/api/announcements/:id', authMiddleware, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const ok = db.deleteAnnouncement(id);
  if (!ok) {
    return res.status(404).json({ error: 'Pengumuman tidak ditemukan.' });
  }
  return res.json({ message: 'Pengumuman berhasil dihapus.' });
});

// -------------------------------------------------------------
// 6. QUIZ & EXAMS (ADMIN, GURU, SISWA)
// -------------------------------------------------------------

// GET /api/quizzes
app.get('/api/quizzes', authMiddleware, (req: AuthenticatedRequest, res) => {
  const quizzes = db.getQuizzes();
  if (req.user?.role === 'siswa') {
    // Only return active quizzes for students
    return res.json(quizzes.filter((q) => q.isActive));
  }
  return res.json(quizzes);
});

// GET /api/quizzes/:id
app.get('/api/quizzes/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const quiz = db.findQuizById(id);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz tidak ditemukan.' });
  }
  return res.json(quiz);
});

// POST /api/quizzes/verify-token (Siswa memasukkan nama dan token untuk akses kuis)
app.post('/api/quizzes/verify-token', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { token, studentName, password } = req.body;
  const result = db.verifyQuizAccess({ token, studentName, password });
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  return res.json({
    success: true,
    quiz: result.quiz,
  });
});

// POST /api/quizzes/generate-token (Guru/Admin generate token otomatis)
app.post('/api/quizzes/generate-token', authMiddleware, requireRole(['admin', 'guru']), (req, res) => {
  const token = generateRandomQuizToken();
  return res.json({ token });
});

// POST /api/quizzes (Admin & Guru)
app.post('/api/quizzes', authMiddleware, requireRole(['admin', 'guru']), (req: AuthenticatedRequest, res) => {
  const {
    title,
    subjectId,
    subjectName,
    description,
    durationMinutes,
    passingScore,
    questions,
    isActive,
    token,
    sourceType,
    externalUrl,
    password,
    scheduleStart,
    scheduleEnd,
    status,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Judul kuis wajib diisi.' });
  }

  const isGoogleForms = sourceType === 'google_forms';
  if (isGoogleForms && !externalUrl) {
    return res.status(400).json({ error: 'Tautan Google Forms atau sumber quiz eksternal wajib diisi.' });
  }

  if (!isGoogleForms && (!questions || !Array.isArray(questions) || questions.length === 0)) {
    return res.status(400).json({ error: 'Untuk kuis interaktif, minimal 1 butir pertanyaan wajib diisi.' });
  }

  const newQuiz = db.addQuiz({
    title,
    subjectId: subjectId || 'sub_general',
    subjectName: subjectName || 'Umum',
    teacherName: req.user?.name || 'Guru Pengampu',
    description: description || '',
    durationMinutes: Number(durationMinutes) || 15,
    passingScore: Number(passingScore) || 70,
    questions: Array.isArray(questions) ? questions : [],
    isActive: isActive !== false,
    token: token || generateRandomQuizToken(),
    sourceType: isGoogleForms ? 'google_forms' : 'interactive',
    externalUrl: externalUrl || '',
    password: password || '',
    scheduleStart: scheduleStart || '',
    scheduleEnd: scheduleEnd || '',
    status: status || (isActive !== false ? 'active' : 'inactive'),
  });

  return res.status(201).json(newQuiz);
});

// PUT /api/quizzes/:id (Admin & Guru)
app.put('/api/quizzes/:id', authMiddleware, requireRole(['admin', 'guru']), (req, res) => {
  const { id } = req.params;
  const updated = db.updateQuiz(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Quiz tidak ditemukan.' });
  }
  return res.json(updated);
});

// DELETE /api/quizzes/:id (Admin & Guru)
app.delete('/api/quizzes/:id', authMiddleware, requireRole(['admin', 'guru']), (req, res) => {
  const { id } = req.params;
  const ok = db.deleteQuiz(id);
  if (!ok) {
    return res.status(404).json({ error: 'Quiz tidak ditemukan.' });
  }
  return res.json({ message: 'Quiz berhasil dihapus.' });
});

// POST /api/quizzes/:id/submit (Siswa mengerjakan quiz & auto-grading)
app.post('/api/quizzes/:id/submit', authMiddleware, requireRole(['siswa', 'admin', 'guru']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { answers, tokenUsed } = req.body; // array of { questionId, selectedOption }

  const quiz = db.findQuizById(id);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz tidak ditemukan.' });
  }

  let correctCount = 0;
  let totalQuestions = quiz.questions?.length || 0;
  let score = 100;
  let passed = true;
  let detailedAnswers: { questionId: string; selectedOption: number; isCorrect: boolean }[] = [];

  if (quiz.sourceType === 'interactive' && Array.isArray(quiz.questions) && quiz.questions.length > 0) {
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'Format jawaban tidak valid.' });
    }

    detailedAnswers = quiz.questions.map((q) => {
      const studentAns = answers.find((a: any) => a.questionId === q.id);
      const selected = studentAns !== undefined ? studentAns.selectedOption : -1;
      const isCorrect = selected === q.correctOptionIndex;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        selectedOption: selected,
        isCorrect,
      };
    });

    score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    passed = score >= quiz.passingScore;
  }

  const attempt = db.submitQuizAttempt({
    quizId: quiz.id,
    quizTitle: quiz.title,
    studentId: req.user!.id,
    studentName: req.user!.name,
    username: req.user!.username,
    tokenUsed: tokenUsed || quiz.token,
    score,
    totalQuestions,
    correctAnswersCount: correctCount,
    passed,
    answers: detailedAnswers,
  });

  return res.json({
    message: 'Quiz berhasil diselesaikan!',
    attempt,
  });
});

// GET /api/quiz-attempts
app.get('/api/quiz-attempts', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { quizId, studentId } = req.query;
  if (req.user?.role === 'siswa') {
    // Siswa only sees their own attempts
    const attempts = db.getQuizAttempts(quizId as string, req.user.id);
    return res.json(attempts);
  }
  // Admin & Guru can see all attempts or filter by quizId
  const attempts = db.getQuizAttempts(quizId as string, studentId as string);
  return res.json(attempts);
});

// -------------------------------------------------------------
// 7. ABSENSI QR CODE (EVENT & OSIS)
// -------------------------------------------------------------

// GET /api/attendance/events
app.get('/api/attendance/events', authMiddleware, (req, res) => {
  const events = db.getAttendanceEvents();
  const records = db.getAttendanceRecords();

  // Attach live attendance counts to each event
  const eventsWithCount = events.map((e) => {
    const attendees = records.filter((r) => r.eventId === e.id);
    return {
      ...e,
      totalAttendees: attendees.length,
    };
  });

  return res.json(eventsWithCount);
});

// POST /api/attendance/events (Admin & Panitia)
app.post('/api/attendance/events', authMiddleware, requireRole(['admin', 'panitia']), (req: AuthenticatedRequest, res) => {
  const { name, category, description, location, eventDate, startTime, endTime } = req.body;
  if (!name || !eventDate) {
    return res.status(400).json({ error: 'Nama kegiatan dan tanggal kegiatan wajib diisi.' });
  }

  const newEvent = db.createAttendanceEvent({
    name,
    category: category || 'Event Sekolah',
    description: description || '',
    location: location || 'Tamansiswa Batam',
    eventDate,
    startTime: startTime || '08:00',
    endTime: endTime || '14:00',
    isOpen: true,
    createdBy: req.user!.id,
  });

  return res.status(201).json(newEvent);
});

// PATCH /api/attendance/events/:id/toggle-session (Buka / Tutup Sesi)
app.patch('/api/attendance/events/:id/toggle-session', authMiddleware, requireRole(['admin', 'panitia']), (req, res) => {
  const { id } = req.params;
  const result = db.toggleEventSession(id);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  return res.json({
    message: `Sesi absensi kegiatan berhasil ${result.isOpen ? 'DIBUKA' : 'DITUTUP'}.`,
    isOpen: result.isOpen,
  });
});

// DELETE /api/attendance/events/:id
app.delete('/api/attendance/events/:id', authMiddleware, requireRole(['admin', 'panitia']), (req, res) => {
  const { id } = req.params;
  const ok = db.deleteAttendanceEvent(id);
  if (!ok) {
    return res.status(404).json({ error: 'Kegiatan tidak ditemukan.' });
  }
  return res.json({ message: 'Kegiatan berhasil dihapus.' });
});

// POST /api/attendance/scan (Panitia Laptop Scan Webhook)
app.post('/api/attendance/scan', authMiddleware, requireRole(['admin', 'panitia', 'guru']), (req: AuthenticatedRequest, res) => {
  const { qrData, eventId } = req.body;
  if (!qrData || !eventId) {
    return res.status(400).json({
      status: 'SERVER_ERROR',
      message: 'Parameter QR Code dan ID Kegiatan wajib dikirimkan.',
      scanTime: new Date().toISOString(),
    });
  }

  const scanResult = db.processQrScan({
    qrData,
    eventId,
    scannedByUsername: req.user!.username,
  });

  // Return appropriate HTTP status code based on verification
  if (scanResult.status === 'SUCCESS') {
    return res.status(200).json(scanResult);
  } else if (scanResult.status === 'ALREADY_SCANNED') {
    return res.status(200).json(scanResult);
  } else if (scanResult.status === 'INVALID_QR') {
    return res.status(200).json(scanResult);
  } else if (scanResult.status === 'ACCOUNT_INACTIVE') {
    return res.status(200).json(scanResult);
  } else if (scanResult.status === 'SESSION_CLOSED') {
    return res.status(200).json(scanResult);
  } else {
    return res.status(500).json(scanResult);
  }
});

// GET /api/attendance/records (List kehadiran per event)
app.get('/api/attendance/records', authMiddleware, (req, res) => {
  const { eventId } = req.query;
  const records = db.getAttendanceRecords(eventId as string);
  return res.json(records);
});

// GET /api/attendance/export/:eventId (Unduh Laporan CSV)
app.get('/api/attendance/export/:eventId', authMiddleware, requireRole(['admin', 'panitia', 'kepala_sekolah', 'guru']), (req, res) => {
  const { eventId } = req.params;
  const event = db.findEventById(eventId);
  if (!event) {
    return res.status(404).json({ error: 'Kegiatan tidak ditemukan.' });
  }

  const records = db.getAttendanceRecords(eventId);

  // Generate CSV Header & rows
  const header = ['No', 'ID Absensi', 'NISN / Username', 'Nama Lengkap Siswa', 'Kelas', 'Nama Kegiatan', 'Waktu Masuk (WIB)', 'Status', 'Verifikasi', 'Petugas Pemindai'];
  const rows = records.map((r, i) => [
    i + 1,
    `"${r.id}"`,
    `"${r.username}"`,
    `"${r.studentName}"`,
    `"${r.kelas || '-'}"`,
    `"${r.eventName}"`,
    `"${new Date(r.verifiedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}"`,
    `"${r.status}"`,
    `"${r.verificationResult}"`,
    `"${r.verifiedBy}"`,
  ]);

  const csvContent = [header.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Laporan_Absensi_${event.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv"`
  );
  return res.send('\uFEFF' + csvContent); // Add UTF-8 BOM for Excel compatibility
});

// -------------------------------------------------------------
// VITE INTEGRATION & STATIC SERVING
// -------------------------------------------------------------
async function setupVite() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    // Production static serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TAMVESTA] Server running at http://0.0.0.0:${PORT}`);
    console.log(`[TAMVESTA] Admin Username: TAMANSISWA | Password: TAMVESTA123`);
  });
}

setupVite().catch((err) => {
  console.error('[TAMVESTA] Failed to start server:', err);
});
