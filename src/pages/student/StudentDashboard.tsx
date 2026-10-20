import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Library,
  Bell,
  HelpCircle,
  QrCode,
  Calendar,
  Clock,
  User as UserIcon,
  Award,
  ChevronRight,
  BookCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowLeft,
  Search,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../lib/api.ts';
import type { Subject, DigitalBook, Announcement, Quiz, QuizAttempt } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { StudentProfileModal } from '../../components/StudentProfileModal.tsx';

type MainMenuTab = 'subjects' | 'library' | 'announcements' | 'quiz';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MainMenuTab>('subjects');

  // Data states
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [books, setBooks] = useState<DigitalBook[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Active items
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [readingBook, setReadingBook] = useState<DigitalBook | null>(null);
  const [activeBookPage, setActiveBookPage] = useState(0);

  // Quiz Taking Mode
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizTimeLeft, setQuizTimeLeft] = useState<number>(0);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResultAttempt, setQuizResultAttempt] = useState<QuizAttempt | null>(null);

  // Filters
  const [bookCategory, setBookCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, bks, anns, qzs, atts] = await Promise.all([
        api.getSubjects(),
        api.getBooks(),
        api.getAnnouncements(),
        api.getQuizzes(),
        api.getQuizAttempts(),
      ]);
      setSubjects(subs);
      setBooks(bks);
      setAnnouncements(anns);
      setQuizzes(qzs);
      setAttempts(atts);
    } catch (err) {
      console.error('Error loading student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Timer for Quiz
  useEffect(() => {
    if (!takingQuiz || quizTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setQuizTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [takingQuiz, quizTimeLeft]);

  const handleStartQuiz = (quiz: Quiz) => {
    setTakingQuiz(quiz);
    setQuizAnswers({});
    setQuizTimeLeft(quiz.durationMinutes * 60);
    setQuizResultAttempt(null);
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setQuizAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleFinishQuiz = async () => {
    if (!takingQuiz || submittingQuiz) return;
    setSubmittingQuiz(true);

    const formattedAnswers = takingQuiz.questions.map((q) => ({
      questionId: q.id,
      selectedOption: quizAnswers[q.id] !== undefined ? quizAnswers[q.id] : -1,
    }));

    try {
      const res = await api.submitQuiz(takingQuiz.id, formattedAnswers);
      setQuizResultAttempt(res.attempt);
      setTakingQuiz(null);
      // Reload attempts
      const updatedAttempts = await api.getQuizAttempts();
      setAttempts(updatedAttempts);

      if (res.attempt.passed) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengirimkan quiz.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const filteredBooks = books.filter((b) => {
    const matchCat = bookCategory === 'Semua' || b.category === bookCategory;
    const matchSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const categories = ['Semua', ...Array.from(new Set(books.map((b) => b.category)))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Student Welcome Banner with Personal QR Card Button */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <img
              src={
                user?.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'Siswa')}&backgroundColor=0284c7`
              }
              alt={user?.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-400/50 shadow-md bg-white/10"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  PORTAL SISWA RESMI
                </span>
                {user?.kelas && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                    {user.kelas}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1">
                Selamat Datang, {user?.name}
              </h1>
              <p className="text-xs sm:text-sm text-teal-100 mt-0.5">
                NISN: <span className="font-mono font-bold text-amber-300">{user?.nisn || '0061829101'}</span> • Tamansiswa Batam
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-2.5 px-5 py-3 bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-black/10 transition active:scale-95 group"
            >
              <QrCode className="w-5 h-5 text-emerald-700 group-hover:scale-110 transition-transform" />
              <span>QR Code Absensi Saya</span>
            </button>
          </div>
        </div>
      </div>

      {/* STRICTLY FOUR MAIN MENUS TAB NAVIGATION */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-1.5">
        <button
          onClick={() => {
            setActiveTab('subjects');
            setTakingQuiz(null);
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'subjects'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Mata Pelajaran</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('library');
            setTakingQuiz(null);
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'library'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Library className="w-4 h-4" />
          <span>2. Perpustakaan Digital</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('announcements');
            setTakingQuiz(null);
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'announcements'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>3. Pengumuman Sekolah</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('quiz');
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'quiz'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>4. Quiz</span>
        </button>
      </div>

      {/* TAB 1: MATA PELAJARAN (CARDS WITH PHOTO) */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mata Pelajaran Siswa</h2>
              <p className="text-xs text-slate-500">Daftar mata pelajaran aktif semester ini beserta guru pengampu dan jadwal</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
              Total: {subjects.length} Mapel
            </span>
          </div>

          {subjects.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">Belum Ada Mata Pelajaran</h3>
              <p className="text-xs max-w-sm mx-auto">
                Administrator sekolah belum menambahkan daftar mata pelajaran. Data akan tampil di sini setelah ditambahkan oleh Admin.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {subjects.map((sub) => (
              <div
                key={sub.id}
                onClick={() => setSelectedSubject(sub)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer group flex flex-col"
              >
                {/* Photo / Image */}
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={sub.imageUrl}
                    alt={sub.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-800 backdrop-blur-xs">
                    {sub.code}
                  </span>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider block">
                      {sub.grade}
                    </span>
                    <h3 className="font-bold text-base line-clamp-1 group-hover:text-emerald-300 transition">
                      {sub.name}
                    </h3>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {sub.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="truncate">{sub.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{sub.schedule}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PERPUSTAKAAN DIGITAL */}
      {activeTab === 'library' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Perpustakaan Digital Tamansiswa</h2>
              <p className="text-xs text-slate-500">Akses ribuan koleksi buku digital, karya ilmiah, sastra, dan modul sekolah</p>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul atau penulis..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Categories Pill */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setBookCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  bookCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Book Cards Grid */}
          {filteredBooks.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <Library className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">Belum Ada Buku Digital</h3>
              <p className="text-xs max-w-sm mx-auto">
                Koleksi buku digital perpustakaan belum tersedia atau sedang disiapkan oleh Admin sekolah.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="h-48 rounded-xl overflow-hidden bg-slate-100 mb-3 shadow-inner relative group">
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                        {book.totalPages} Hal
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {book.category}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1 line-clamp-2 leading-snug">
                      {book.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Penulis: {book.author}</p>
                    <p className="text-[11px] text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {book.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setReadingBook(book);
                        setActiveBookPage(0);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                    >
                      <BookCheck className="w-4 h-4" />
                      <span>Baca Buku Digital</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PENGUMUMAN SEKOLAH */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pengumuman Resmi Sekolah</h2>
            <p className="text-xs text-slate-500">Informasi terbaru seputar kegiatan akademik, kesiswaan, dan agenda Tamansiswa Batam</p>
          </div>

          <div className="space-y-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-emerald-300 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        ann.category === 'Penting'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : ann.category === 'Akademik'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {ann.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(ann.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Oleh: <strong className="text-slate-700">{ann.authorName}</strong> ({ann.authorRole})
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2">
                  {ann.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: QUIZ (Interactive taking + History) */}
      {activeTab === 'quiz' && (
        <div className="space-y-6">
          {/* Active Quiz Taking Modal / View */}
          {takingQuiz ? (
            <div className="bg-white rounded-3xl border-2 border-emerald-500 p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                    {takingQuiz.subjectName}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 mt-1">{takingQuiz.title}</h2>
                  <p className="text-xs text-slate-500">Guru: {takingQuiz.teacherName} • Nilai Kelulusan: {takingQuiz.passingScore}</p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl font-mono font-bold text-sm">
                  <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>
                    Sisa Waktu: {Math.floor(quizTimeLeft / 60)}:{(quizTimeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {takingQuiz.questions.map((q, idx) => (
                  <div key={q.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-bold text-slate-800 leading-snug">{q.question}</p>
                    </div>

                    <div className="space-y-2 pl-9">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = quizAnswers[q.id] === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm font-medium transition flex items-center gap-3 ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-500'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Submit Action */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTakingQuiz(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Batal / Keluar
                </button>

                <button
                  type="button"
                  onClick={handleFinishQuiz}
                  disabled={submittingQuiz}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm shadow-lg shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
                >
                  {submittingQuiz ? 'Menilai Jawaban...' : 'Selesaikan & Kumpulkan Quiz'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Quiz Result Modal Banner */}
              {quizResultAttempt && (
                <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-3xl shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-6 h-6 text-emerald-600" />
                      <h3 className="font-extrabold text-base text-emerald-900">
                        Hasil Pengerjaan: {quizResultAttempt.quizTitle}
                      </h3>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black ${
                        quizResultAttempt.passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {quizResultAttempt.passed ? 'LULUS (MEMENUHI KKM)' : 'BELUM MEMENUHI KKM'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center py-2">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Nilai Akhir</p>
                      <p className="text-2xl font-black text-emerald-700">{quizResultAttempt.score}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Jawaban Benar</p>
                      <p className="text-2xl font-black text-slate-800">
                        {quizResultAttempt.correctAnswersCount} / {quizResultAttempt.totalQuestions}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Status Hasil</p>
                      <p className="text-sm font-extrabold mt-1 text-slate-800">
                        {quizResultAttempt.passed ? 'Kompeten' : 'Remedial'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setQuizResultAttempt(null)}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Tutup Ringkasan Hasil
                  </button>
                </div>
              )}

              {/* Available Quizzes */}
              <div>
                <h2 className="text-lg font-bold text-slate-900">Daftar Quiz yang Tersedia</h2>
                <p className="text-xs text-slate-500">Pilih quiz untuk menguji pemahaman materi pelajaran Anda</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes.map((quiz) => {
                  const hasAttempted = attempts.some((a) => a.quizId === quiz.id);
                  const latestScore = attempts.find((a) => a.quizId === quiz.id)?.score;

                  return (
                    <div
                      key={quiz.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                            {quiz.subjectName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            Durasi: {quiz.durationMinutes} Menit
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900">{quiz.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{quiz.description}</p>
                        <p className="text-[11px] text-slate-400 mt-2">
                          Guru: {quiz.teacherName} • KKM: {quiz.passingScore} • {quiz.questions.length} Butir Soal
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        {hasAttempted ? (
                          <div className="text-xs">
                            <span className="text-slate-500">Nilai Terakhir: </span>
                            <span className="font-black text-emerald-700">{latestScore}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Belum dikerjakan</span>
                        )}

                        <button
                          onClick={() => handleStartQuiz(quiz)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
                        >
                          {hasAttempted ? 'Kerjakan Ulang' : 'Mulai Quiz'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quiz History Table */}
              <div className="pt-4 space-y-3">
                <h3 className="font-bold text-sm text-slate-800">Riwayat Nilai & Pengerjaan Quiz Saya</h3>
                {attempts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada riwayat kuis yang diselesaikan.</p>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Nama Quiz</th>
                          <th className="p-3.5">Waktu Selesai</th>
                          <th className="p-3.5 text-center">Soal Benar</th>
                          <th className="p-3.5 text-center">Nilai</th>
                          <th className="p-3.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {attempts.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50">
                            <td className="p-3.5 font-bold text-slate-800">{att.quizTitle}</td>
                            <td className="p-3.5 text-slate-500">
                              {new Date(att.completedAt).toLocaleString('id-ID')}
                            </td>
                            <td className="p-3.5 text-center">
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Subject Detail Modal */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in">
            <div className="h-44 relative">
              <img
                src={selectedSubject.imageUrl}
                alt={selectedSubject.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <span className="text-[10px] font-bold bg-emerald-600 px-2 py-0.5 rounded">
                  {selectedSubject.code}
                </span>
                <h3 className="text-lg font-black mt-1">{selectedSubject.name}</h3>
              </div>
            </div>
            <div className="p-6 space-y-4 text-xs sm:text-sm text-slate-600">
              <p className="leading-relaxed">{selectedSubject.description}</p>
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Guru Pengampu</span>
                  <strong className="text-slate-800">{selectedSubject.teacherName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Jadwal Kelas</span>
                  <strong className="text-slate-800">{selectedSubject.schedule}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Tingkatan</span>
                  <strong className="text-slate-800">{selectedSubject.grade}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Ruangan</span>
                  <strong className="text-slate-800">{selectedSubject.room || 'Ruang Kelas'}</strong>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="px-5 py-2.5 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-900 transition"
                >
                  Tutup Informasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital Book Reader Modal */}
      {readingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Reader Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm line-clamp-1">{readingBook.title}</h3>
                <p className="text-[11px] text-slate-400">Penulis: {readingBook.author}</p>
              </div>
              <button
                onClick={() => setReadingBook(null)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition"
              >
                Tutup Pembaca
              </button>
            </div>

            {/* Reader Pages Content */}
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-amber-50/20 text-slate-800 leading-relaxed font-serif text-sm sm:text-base space-y-4">
              <div className="text-center border-b border-amber-200/50 pb-4 mb-4">
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded">
                  Halaman {activeBookPage + 1} dari {readingBook.content.length}
                </span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs min-h-[300px]">
                <p className="whitespace-pre-line text-slate-800 text-sm sm:text-base leading-loose">
                  {readingBook.content[activeBookPage]}
                </p>
              </div>
            </div>

            {/* Reader Footer Controls */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                disabled={activeBookPage === 0}
                onClick={() => setActiveBookPage((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 bg-slate-100 disabled:opacity-40 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                ← Halaman Sebelumnya
              </button>

              <span className="text-xs text-slate-500 font-mono">
                {activeBookPage + 1} / {readingBook.content.length}
              </span>

              <button
                disabled={activeBookPage >= readingBook.content.length - 1}
                onClick={() => setActiveBookPage((prev) => Math.min(readingBook.content.length - 1, prev + 1))}
                className="px-4 py-2 bg-emerald-600 disabled:opacity-40 rounded-xl text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                Halaman Berikutnya →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Personal QR Code Modal */}
      {user && (
        <StudentProfileModal
          user={user}
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
