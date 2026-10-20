import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  BookOpen,
  Library,
  Bell,
  HelpCircle,
  QrCode,
  ScanLine,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Key,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Shield,
  Clock,
  Award,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import type {
  User,
  Subject,
  DigitalBook,
  Announcement,
  Quiz,
  QuizAttempt,
  AttendanceEvent,
  PasswordResetRequest,
} from '../../types/index.ts';
import { StudentProfileModal } from '../../components/StudentProfileModal.tsx';

type AdminTab = 'students' | 'subjects' | 'library' | 'announcements' | 'quizzes' | 'events' | 'tickets';

export const AdminDashboard: React.FC<{ onOpenScanner: () => void }> = ({ onOpenScanner }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('students');
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);

  // --- Student Management State ---
  const [students, setStudents] = useState<User[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentNisn, setNewStudentNisn] = useState('');
  const [newStudentKelas, setNewStudentKelas] = useState('');
  const [studentFormSuccess, setStudentFormSuccess] = useState<string | null>(null);
  const [studentFormError, setStudentFormError] = useState<string | null>(null);
  const [studentFormLoading, setStudentFormLoading] = useState(false);

  // Reset password modal for student
  const [resettingStudent, setResettingStudent] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Student QR Preview
  const [previewQrStudent, setPreviewQrStudent] = useState<User | null>(null);

  // --- Subjects State ---
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    teacherName: '',
    description: '',
    grade: 'Kelas X',
    schedule: 'Senin, 08:00 - 09:30 WIB',
    imageUrl: '',
    room: 'Ruang Kelas',
  });

  // --- Books State ---
  const [books, setBooks] = useState<DigitalBook[]>([]);
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<DigitalBook | null>(null);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category: 'Sains & Teknologi',
    coverUrl: '',
    description: '',
    totalPages: 120,
    publishedYear: '2024',
    content: ['BAB I: Pengantar Buku Digital Siswa Tamansiswa Batam.'],
  });

  // --- Announcements State ---
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [annForm, setAnnForm] = useState({
    title: '',
    content: '',
    category: 'Penting' as 'Penting' | 'Akademik' | 'Kegiatan' | 'Umum',
  });

  // --- Quizzes State ---
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: '',
    subjectName: 'Matematika Peminatan',
    description: '',
    durationMinutes: 15,
    passingScore: 75,
    questions: [
      {
        id: 'q_sample_1',
        question: 'Contoh soal pilihan ganda baru?',
        options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
        correctOptionIndex: 0,
        explanation: 'Kunci jawaban dan pembahasan.',
      },
    ],
  });

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        callback(uploadEvent.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const addQuizQuestion = () => {
    setQuizForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q_${Date.now()}_${prev.questions.length + 1}`,
          question: '',
          options: ['', '', '', ''],
          correctOptionIndex: 0,
          explanation: '',
        },
      ],
    }));
  };

  const removeQuizQuestion = (index: number) => {
    if (quizForm.questions.length <= 1) return;
    setQuizForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  // --- Attendance Events State ---
  const [events, setEvents] = useState<(AttendanceEvent & { totalAttendees?: number })[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: '',
    category: 'Event Sekolah' as const,
    description: '',
    location: 'Auditorium Tamansiswa Batam',
    eventDate: new Date().toISOString().slice(0, 10),
    startTime: '08:00',
    endTime: '14:00',
  });

  const loadAllData = async () => {
    try {
      const [stu, subs, bks, anns, qzs, atts, evs] = await Promise.all([
        api.getStudents(),
        api.getSubjects(),
        api.getBooks(),
        api.getAnnouncements(),
        api.getQuizzes(),
        api.getQuizAttempts(),
        api.getAttendanceEvents(),
      ]);
      setStudents(stu);
      setSubjects(subs);
      setBooks(bks);
      setAnnouncements(anns);
      setQuizzes(qzs);
      setQuizAttempts(atts);
      setEvents(evs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // --- 1. STUDENT REGISTRATION & ACTIONS ---
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentFormSuccess(null);
    setStudentFormError(null);
    setStudentFormLoading(true);

    try {
      const res = await api.createStudent({
        name: newStudentName,
        username: newStudentUsername,
        password: newStudentPassword,
        nisn: newStudentNisn,
        kelas: newStudentKelas,
      });

      setStudentFormSuccess(res.message);
      // Reset form
      handleResetStudentForm();
      // Reload students
      const updated = await api.getStudents();
      setStudents(updated);
    } catch (err: any) {
      setStudentFormError(err.message || 'Gagal mendaftarkan akun siswa.');
    } finally {
      setStudentFormLoading(false);
    }
  };

  const handleResetStudentForm = () => {
    setNewStudentName('');
    setNewStudentUsername('');
    setNewStudentPassword('');
    setNewStudentNisn('');
    setNewStudentKelas('');
  };

  const handleToggleStudentActive = async (student: User) => {
    try {
      const res = await api.toggleStudentActive(student.id);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, isActive: res.isActive } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status akun.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingStudent || !resetNewPassword) return;
    setResetSuccess(null);
    setResetError(null);

    try {
      const res = await api.resetStudentPassword(resettingStudent.id, resetNewPassword);
      setResetSuccess(res.message);
      setTimeout(() => {
        setResettingStudent(null);
        setResetNewPassword('');
        setResetSuccess(null);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'Gagal mereset password.');
    }
  };

  // --- 2. SUBJECT ACTIONS ---
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.updateSubject(editingSubject.id, subjectForm);
      } else {
        await api.addSubject(subjectForm);
      }
      setShowSubjectModal(false);
      setEditingSubject(null);
      const updated = await api.getSubjects();
      setSubjects(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan mata pelajaran.');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus mata pelajaran ini?')) return;
    try {
      await api.deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus mata pelajaran.');
    }
  };

  // --- 3. BOOK ACTIONS ---
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await api.updateBook(editingBook.id, bookForm);
      } else {
        await api.addBook(bookForm);
      }
      setShowBookModal(false);
      setEditingBook(null);
      const updated = await api.getBooks();
      setBooks(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan buku digital.');
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus buku ini?')) return;
    try {
      await api.deleteBook(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus buku.');
    }
  };

  // --- 4. ANNOUNCEMENT ACTIONS ---
  const handleSaveAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAnn) {
        await api.updateAnnouncement(editingAnn.id, annForm);
      } else {
        await api.addAnnouncement(annForm);
      }
      setShowAnnModal(false);
      setEditingAnn(null);
      const updated = await api.getAnnouncements();
      setAnnouncements(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengumuman.');
    }
  };

  const handleDeleteAnn = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) return;
    try {
      await api.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus pengumuman.');
    }
  };

  // --- 5. QUIZ ACTIONS ---
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addQuiz({
        title: quizForm.title,
        subjectName: quizForm.subjectName,
        description: quizForm.description,
        durationMinutes: Number(quizForm.durationMinutes),
        passingScore: Number(quizForm.passingScore),
        questions: quizForm.questions,
        isActive: true,
      });
      setShowQuizModal(false);
      const updated = await api.getQuizzes();
      setQuizzes(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan quiz.');
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus quiz ini?')) return;
    try {
      await api.deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus quiz.');
    }
  };

  // --- 6. ATTENDANCE EVENT ACTIONS ---
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAttendanceEvent(eventForm);
      setShowEventModal(false);
      const updated = await api.getAttendanceEvents();
      setEvents(updated);
    } catch (err: any) {
      alert(err.message || 'Gagal membuat kegiatan absensi.');
    }
  };

  const handleToggleEventSession = async (id: string) => {
    try {
      const res = await api.toggleEventSession(id);
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, isOpen: res.isOpen } : e))
      );
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status sesi.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kegiatan ini beserta riwayat absensinya?')) return;
    try {
      await api.deleteAttendanceEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus kegiatan.');
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.username.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.nisn && s.nisn.includes(studentSearch)) ||
      (s.kelas && s.kelas.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-700/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold tracking-wide">
              ADMINISTRATOR UTAMA
            </span>
            <span className="text-xs text-slate-400">TAMANSISWA BATAM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">Dashboard Kontrol Admin</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Kelola akun siswa, kurikulum mapel, perpustakaan digital, pengumuman, quiz, dan absensi QR
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition active:scale-95 group"
          >
            <ScanLine className="w-5 h-5 text-emerald-200 group-hover:scale-110 transition-transform" />
            <span>Buka Website Scanner Laptop</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
            activeTab === 'students' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Akun Siswa</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
            activeTab === 'subjects' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Mata Pelajaran</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
            activeTab === 'library' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Library className="w-4 h-4" />
          <span>Perpustakaan</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
            activeTab === 'announcements' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Pengumuman</span>
        </button>

        <button
          onClick={() => setActiveTab('quizzes')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
            activeTab === 'quizzes' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Quiz & Nilai</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
            activeTab === 'events' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Absensi QR</span>
        </button>
      </div>

      {/* TAB 1: PENDAFTARAN & MANAJEMEN AKUN SISWA (Section 4 Requirements) */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Registration Form Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                MENU KHUSUS PENDAFTARAN
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                Pendaftaran Akun Siswa Baru
              </h2>
              <p className="text-xs text-slate-500">
                Formulir ini khusus untuk mendaftarkan akun Siswa (role otomatis ditetapkan sebagai Siswa). Password akan disimpan dalam bentuk hash aman.
              </p>
            </div>

            {studentFormSuccess && (
              <div className="mb-5 flex items-center gap-2.5 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{studentFormSuccess}</span>
              </div>
            )}

            {studentFormError && (
              <div className="mb-5 flex items-center gap-2.5 p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-xs font-bold">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{studentFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Nama lengkap siswa */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    required
                    placeholder="Contoh: Muhammad Farhan"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  />
                </div>

                {/* 2. Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    2. Username (Unik) *
                  </label>
                  <input
                    type="text"
                    value={newStudentUsername}
                    onChange={(e) => setNewStudentUsername(e.target.value)}
                    required
                    placeholder="Contoh: farhan.siswa"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium font-mono"
                  />
                </div>

                {/* 3. Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    3. Password Awal (Min. 6 Karakter) *
                  </label>
                  <input
                    type="password"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Masukkan password awal untuk siswa"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    *Siswa diwajibkan mengganti password ini saat login pertama kali.
                  </p>
                </div>

                {/* Additional metadata */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      NISN (Opsional)
                    </label>
                    <input
                      type="text"
                      value={newStudentNisn}
                      onChange={(e) => setNewStudentNisn(e.target.value)}
                      placeholder="Contoh: 0061829105"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Kelas
                    </label>
                    <input
                      type="text"
                      value={newStudentKelas}
                      onChange={(e) => setNewStudentKelas(e.target.value)}
                      placeholder="Contoh: X MIPA 1"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: 4. Simpan Akun & 5. Reset Formulir */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetStudentForm}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition"
                >
                  5. Reset Formulir
                </button>

                <button
                  type="submit"
                  disabled={studentFormLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{studentFormLoading ? 'Menyimpan...' : '4. Simpan Akun'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Student Accounts Table & Management */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Daftar Akun Siswa Terdaftar ({students.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Kelola aktivasi akun, lihat kartu QR siswa, dan reset password
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Cari nama, username, atau kelas..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5">Username</th>
                    <th className="p-3.5">Kelas / NISN</th>
                    <th className="p-3.5 text-center">Status Akun</th>
                    <th className="p-3.5 text-center">QR Code</th>
                    <th className="p-3.5 text-center">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                        Tidak ada data siswa ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{stu.name}</div>
                          <div className="text-[10px] text-slate-400">ID: {stu.id}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-700">
                          @{stu.username}
                        </td>
                        <td className="p-3.5">
                          <div>{stu.kelas || '-'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{stu.nisn || '-'}</div>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleStudentActive(stu)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition ${
                              stu.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Klik untuk mengubah status aktif/nonaktif"
                          >
                            {stu.isActive ? 'AKTIF' : 'NONAKTIF'}
                          </button>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => setPreviewQrStudent(stu)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition inline-flex items-center gap-1 font-bold text-[11px]"
                            title="Lihat Kartu & QR Code Siswa"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>Lihat QR</span>
                          </button>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              setResettingStudent(stu);
                              setResetNewPassword('');
                              setResetSuccess(null);
                              setResetError(null);
                            }}
                            className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-600" />
                            <span>Reset Password</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATA PELAJARAN MANAGEMENT */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manajemen Mata Pelajaran</h2>
              <p className="text-xs text-slate-500">Tambah, edit, dan atur kurikulum mata pelajaran siswa</p>
            </div>
            <button
              onClick={() => {
                setEditingSubject(null);
                setSubjectForm({
                  name: '',
                  code: '',
                  teacherName: '',
                  description: '',
                  grade: 'Kelas XII',
                  schedule: 'Senin, 08:00 - 09:30 WIB',
                  imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
                  room: 'Lab Sains',
                });
                setShowSubjectModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mapel Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 relative bg-slate-100">
                    <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white">
                      {sub.code}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-base text-slate-900">{sub.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{sub.description}</p>
                    <p className="text-[11px] text-slate-600">
                      Guru: <strong>{sub.teacherName}</strong>
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setEditingSubject(sub);
                      setSubjectForm({
                        name: sub.name,
                        code: sub.code,
                        teacherName: sub.teacherName,
                        description: sub.description,
                        grade: sub.grade,
                        schedule: sub.schedule,
                        imageUrl: sub.imageUrl,
                        room: sub.room || 'Ruang Kelas',
                      });
                      setShowSubjectModal(true);
                    }}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                    title="Edit Mapel"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(sub.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus Mapel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PERPUSTAKAAN DIGITAL MANAGEMENT */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Katalog Perpustakaan Digital</h2>
              <p className="text-xs text-slate-500">Kelola buku elektronik, karya tulis, dan literatur Tamansiswa</p>
            </div>
            <button
              onClick={() => {
                setEditingBook(null);
                setBookForm({
                  title: '',
                  author: '',
                  category: 'Sejarah & Budaya',
                  coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
                  description: '',
                  totalPages: 100,
                  publishedYear: '2024',
                  content: ['BAB I: Pengantar buku digital.'],
                });
                setShowBookModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Buku Digital</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {books.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 rounded-xl overflow-hidden bg-slate-100 mb-3">
                    <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {b.category}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1 line-clamp-2">{b.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Penulis: {b.author}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingBook(b);
                      setBookForm({
                        title: b.title,
                        author: b.author,
                        category: b.category,
                        coverUrl: b.coverUrl,
                        description: b.description,
                        totalPages: b.totalPages,
                        publishedYear: b.publishedYear,
                        content: b.content,
                      });
                      setShowBookModal(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-slate-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBook(b.id)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PENGUMUMAN MANAGEMENT */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manajemen Pengumuman Sekolah</h2>
              <p className="text-xs text-slate-500">Terbitkan berita dan informasi penting untuk seluruh civitas sekolah</p>
            </div>
            <button
              onClick={() => {
                setEditingAnn(null);
                setAnnForm({
                  title: '',
                  content: '',
                  category: 'Penting',
                });
                setShowAnnModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pengumuman Baru</span>
            </button>
          </div>

          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {ann.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(ann.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900">{ann.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{ann.content}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingAnn(ann);
                      setAnnForm({
                        title: ann.title,
                        content: ann.content,
                        category: ann.category,
                      });
                      setShowAnnModal(true);
                    }}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAnn(ann.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: QUIZZES & HASIL */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manajemen Quiz & Nilai Siswa</h2>
              <p className="text-xs text-slate-500">Kelola bank soal kuis dan pantau hasil evaluasi akademik siswa</p>
            </div>
            <button
              onClick={() => setShowQuizModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Quiz Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                    {q.subjectName}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDeleteQuiz(q.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-base text-slate-900">{q.title}</h3>
                <p className="text-xs text-slate-600">{q.description}</p>
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3 pt-2 border-t border-slate-100">
                  <span>{q.questions.length} Butir Soal</span>
                  <span>Durasi: {q.durationMinutes} mnt</span>
                  <span>KKM: {q.passingScore}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Student Submissions Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Riwayat Penilaian & Pengerjaan Quiz Seluruh Siswa ({quizAttempts.length})
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5">Judul Quiz</th>
                    <th className="p-3.5 text-center">Jawaban Benar</th>
                    <th className="p-3.5 text-center">Nilai</th>
                    <th className="p-3.5 text-center">Status Kelulusan</th>
                    <th className="p-3.5">Waktu Submit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {quizAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                        Belum ada siswa yang mengerjakan quiz.
                      </td>
                    </tr>
                  ) : (
                    quizAttempts.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="p-3.5">
                          <strong>{att.studentName}</strong>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            @{att.username}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-800">{att.quizTitle}</td>
                        <td className="p-3.5 text-center font-mono">
                          {att.correctAnswersCount} / {att.totalQuestions}
                        </td>
                        <td className="p-3.5 text-center font-black text-emerald-700 text-sm">
                          {att.score}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              att.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {att.passed ? 'LULUS' : 'REMEDIAL'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {new Date(att.completedAt).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ABSENSI QR CODE & KEGIATAN */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Pengelolaan Kegiatan & Sesi Absensi QR
              </h2>
              <p className="text-xs text-slate-500">
                Atur event sekolah, kegiatan OSIS, buka/tutup sesi absensi, dan unduh laporan kehadiran
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEventModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kegiatan Baru</span>
              </button>

              <button
                onClick={onOpenScanner}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <ScanLine className="w-4 h-4 text-emerald-400" />
                <span>Buka Scanner Laptop</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {ev.category}
                    </span>
                    <button
                      onClick={() => handleToggleEventSession(ev.id)}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border transition ${
                        ev.isOpen
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                      }`}
                      title="Klik untuk membuka/menutup sesi absensi"
                    >
                      {ev.isOpen ? 'SESI DIBUKA' : 'SESI DITUTUP'}
                    </button>
                  </div>

                  <h3 className="font-black text-base text-slate-900">{ev.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{ev.description}</p>

                  <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                    <p>Lokasi: <strong>{ev.location}</strong></p>
                    <p>Tanggal: <strong>{ev.eventDate}</strong> ({ev.startTime} - {ev.endTime} WIB)</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-400">Total Hadir: </span>
                    <strong className="text-emerald-700 text-sm font-black">
                      {ev.totalAttendees || 0} Siswa
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={api.getExportUrl(ev.id)}
                      download
                      className="p-2 text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                      title="Unduh Laporan CSV"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Kegiatan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD SISWA */}
      {resettingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Reset Password: {resettingStudent.name}
            </h3>
            <p className="text-xs text-slate-500">
              Siswa akan diwajibkan mengganti password baru ini saat login kembali.
            </p>

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">
                {resetSuccess}
              </div>
            )}
            {resetError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru Siswa (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Masukkan password reset"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingStudent(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW STUDENT QR CODE */}
      {previewQrStudent && (
        <StudentProfileModal
          user={previewQrStudent}
          isOpen={true}
          onClose={() => setPreviewQrStudent(null)}
        />
      )}

      {/* MODAL: TAMBAH / EDIT MATA PELAJARAN */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
            </h3>
            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  required
                  placeholder="Contoh: Fisika Terapan"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Mapel</label>
                  <input
                    type="text"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    required
                    placeholder="Contoh: FIS-01"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Guru Pengampu</label>
                  <input
                    type="text"
                    value={subjectForm.teacherName}
                    onChange={(e) => setSubjectForm({ ...subjectForm, teacherName: e.target.value })}
                    placeholder="Nama Guru"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Foto / Gambar Mapel</label>
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                  <input
                    type="url"
                    value={subjectForm.imageUrl}
                    onChange={(e) => setSubjectForm({ ...subjectForm, imageUrl: e.target.value })}
                    placeholder="URL gambar (https://...)"
                    className="flex-1 w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 whitespace-nowrap transition">
                    <span>Unggah File</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileUpload(e, (url) => setSubjectForm({ ...subjectForm, imageUrl: url }))}
                    />
                  </label>
                </div>
                {subjectForm.imageUrl && (
                  <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative mb-1">
                    <img src={subjectForm.imageUrl} alt="Pratinjau Mapel" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Pratinjau Foto
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Mapel</label>
                <textarea
                  rows={2}
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Mata Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT DIGITAL BOOK */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingBook ? 'Edit Buku Digital' : 'Tambah Buku Digital Baru'}
            </h3>
            <form onSubmit={handleSaveBook} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Buku</label>
                <input
                  type="text"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  required
                  placeholder="Judul Buku"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Penulis</label>
                  <input
                    type="text"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    required
                    placeholder="Nama Penulis"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    placeholder="Sains, Sastra, dsb."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sampul Buku Digital</label>
                <div className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                  <input
                    type="url"
                    value={bookForm.coverUrl}
                    onChange={(e) => setBookForm({ ...bookForm, coverUrl: e.target.value })}
                    placeholder="URL sampul (https://...)"
                    className="flex-1 w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 whitespace-nowrap transition">
                    <span>Unggah Sampul</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileUpload(e, (url) => setBookForm({ ...bookForm, coverUrl: url }))}
                    />
                  </label>
                </div>
                {bookForm.coverUrl && (
                  <div className="h-28 w-24 mx-auto rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative mb-1">
                    <img src={bookForm.coverUrl} alt="Pratinjau Sampul" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Buku</label>
                <textarea
                  rows={2}
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Buku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT PENGUMUMAN */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingAnn ? 'Edit Pengumuman' : 'Buat Pengumuman Sekolah'}
            </h3>
            <form onSubmit={handleSaveAnn} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  required
                  placeholder="Judul Pengumuman"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={annForm.category}
                  onChange={(e) => setAnnForm({ ...annForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Penting">Penting</option>
                  <option value="Akademik">Akademik</option>
                  <option value="Kegiatan">Kegiatan</option>
                  <option value="Umum">Umum</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Isi Pengumuman</label>
                <textarea
                  rows={4}
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  required
                  placeholder="Tuliskan isi pengumuman secara rinci..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Terbitkan Pengumuman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH EVENT ABSENSI BARU */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Buat Kegiatan / Sesi Absensi Baru
            </h3>
            <form onSubmit={handleSaveEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kegiatan *</label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  required
                  placeholder="Contoh: Rapat OSIS Perdana 2026"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Event Sekolah">Event Sekolah</option>
                    <option value="Kegiatan OSIS">Kegiatan OSIS</option>
                    <option value="Rapat OSIS">Rapat OSIS</option>
                    <option value="Lomba Sekolah">Lomba Sekolah</option>
                    <option value="Kegiatan Khusus Siswa">Kegiatan Khusus Siswa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={eventForm.eventDate}
                    onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="Lokasi kegiatan"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Uraian agenda kegiatan..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Buat Kegiatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH QUIZ BARU */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Buat Quiz Baru</h3>
            <form onSubmit={handleSaveQuiz} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Quiz</label>
                <input
                  type="text"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  required
                  placeholder="Judul Quiz"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={quizForm.subjectName}
                  onChange={(e) => setQuizForm({ ...quizForm, subjectName: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    value={quizForm.durationMinutes}
                    onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nilai KKM</label>
                  <input
                    type="number"
                    value={quizForm.passingScore}
                    onChange={(e) => setQuizForm({ ...quizForm, passingScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* Dynamic Questions Builder */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Daftar Butir Soal Quiz ({quizForm.questions.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addQuizQuestion}
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Soal</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {quizForm.questions.map((q, qIndex) => (
                    <div key={q.id || qIndex} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">
                          Soal Nomor {qIndex + 1}
                        </span>
                        {quizForm.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuizQuestion(qIndex)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Hapus butir soal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => {
                          const updated = [...quizForm.questions];
                          updated[qIndex].question = e.target.value;
                          setQuizForm({ ...quizForm, questions: updated });
                        }}
                        required
                        placeholder={`Ketik pertanyaan nomor ${qIndex + 1}...`}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                      />

                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] text-slate-500 font-bold">
                          Opsi Pilihan (Pilih tombol bulat di kiri untuk Kunci Jawaban Benar):
                        </p>
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct_${qIndex}`}
                              checked={q.correctOptionIndex === oIndex}
                              onChange={() => {
                                const updated = [...quizForm.questions];
                                updated[qIndex].correctOptionIndex = oIndex;
                                setQuizForm({ ...quizForm, questions: updated });
                              }}
                              className="text-emerald-600 focus:ring-emerald-500"
                              title="Tandai sebagai kunci jawaban benar"
                            />
                            <span className="font-bold text-slate-600 w-4">
                              {String.fromCharCode(65 + oIndex)}.
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...quizForm.questions];
                                updated[qIndex].options[oIndex] = e.target.value;
                                setQuizForm({ ...quizForm, questions: updated });
                              }}
                              required
                              placeholder={`Pilihan ${String.fromCharCode(65 + oIndex)}`}
                              className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Pembahasan / Penjelasan Jawaban (Opsional)
                        </label>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => {
                            const updated = [...quizForm.questions];
                            updated[qIndex].explanation = e.target.value;
                            setQuizForm({ ...quizForm, questions: updated });
                          }}
                          placeholder="Penjelasan pembahasan materi..."
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Quiz & Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
