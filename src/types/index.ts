export type UserRole = 'admin' | 'guru' | 'siswa' | 'kepala_sekolah' | 'panitia';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  mustChangePassword?: boolean;
  isActive: boolean;
  nisn?: string;
  kelas?: string;
  qrToken: string; // Secure unique identification token for attendance
  avatarUrl?: string;
  phone?: string;
  lastUsernameChange?: string; // Catatan waktu perubahan username terakhir (maksimal 1x per 30 hari)
  usernameChangeHistory?: { oldUsername: string; newUsername: string; changedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  adminNote?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  teacherId?: string;
  teacherName: string;
  description: string;
  grade: string;
  schedule: string;
  imageUrl: string;
  room?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalBook {
  id: string;
  title: string;
  author: string;
  category: string;
  coverUrl: string;
  description: string;
  totalPages: number;
  publishedYear: string;
  content: string[]; // Content pages or summary chapters for digital reading
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Penting' | 'Akademik' | 'Kegiatan' | 'Umum';
  authorName: string;
  authorRole: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  token: string; // Token quiz unik yang digenerate sistem atau ditentukan guru
  sourceType: 'interactive' | 'google_forms'; // Tipe sumber kuis: interaktif internal atau link Google Forms
  externalUrl?: string; // Tautan Google Forms / sumber quiz lainnya
  password?: string; // Password quiz jika diatur oleh guru
  scheduleStart?: string;
  scheduleEnd?: string;
  questions: QuizQuestion[];
  isActive: boolean;
  status?: 'active' | 'inactive' | 'scheduled';
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  username: string;
  tokenUsed: string;
  score: number;
  totalQuestions: number;
  correctAnswersCount: number;
  passed: boolean;
  answers: { questionId: string; selectedOption: number; isCorrect: boolean }[];
  completedAt: string;
}

export interface AttendanceEvent {
  id: string;
  name: string;
  category: 'Event Sekolah' | 'Kegiatan OSIS' | 'Rapat OSIS' | 'Lomba Sekolah' | 'Kegiatan Khusus Siswa';
  description: string;
  location: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  isOpen: boolean; // Sesi absensi dibuka atau ditutup
  createdAt: string;
  createdBy: string;
}

export interface AttendanceRecord {
  id: string;
  eventId: string;
  eventName: string;
  studentId: string;
  studentName: string;
  username: string;
  kelas?: string;
  verifiedAt: string;
  verifiedBy: string; // Panitia/Admin yang memindai
  status: 'TELAH MASUK';
  verificationResult: 'BERHASIL';
}

export type ScanVerificationStatus =
  | 'SUCCESS'           // TELAH MASUK — VERIFIKASI BERHASIL
  | 'ALREADY_SCANNED'   // SUDAH ABSEN
  | 'INVALID_QR'        // QR CODE TIDAK VALID
  | 'ACCOUNT_INACTIVE'  // AKUN TIDAK AKTIF
  | 'SESSION_CLOSED'    // SESI ABSENSI DITUTUP
  | 'SERVER_ERROR';     // VERIFIKASI GAGAL — SILAKAN COBA LAGI

export interface ScanResultPayload {
  status: ScanVerificationStatus;
  message: string;
  record?: AttendanceRecord;
  student?: {
    id: string;
    name: string;
    username: string;
    kelas?: string;
  };
  event?: {
    id: string;
    name: string;
  };
  scanTime?: string;
}
