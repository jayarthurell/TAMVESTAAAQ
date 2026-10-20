import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  Users,
  Award,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  ScanLine,
  Search,
  Key,
  Copy,
  ExternalLink,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Lock,
  Unlock,
  AlertCircle,
  X,
  Share2,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import type { Quiz, QuizAttempt, Subject } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const TeacherDashboard: React.FC<{ onOpenScanner: () => void }> = ({ onOpenScanner }) => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchAttempt, setSearchAttempt] = useState('');
  const [selectedQuizFilter, setSelectedQuizFilter] = useState<string>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Create Quiz Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [quizForm, setQuizForm] = useState({
    title: '',
    subjectName: 'Matematika Peminatan',
    description: '',
    durationMinutes: 15,
    passingScore: 75,
    token: '',
    sourceType: 'interactive' as 'interactive' | 'google_forms',
    externalUrl: '',
    password: '',
    scheduleStart: '',
    scheduleEnd: '',
    questions: [
      {
        id: 'q_guru_1',
        question: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
      },
    ],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [qz, att, sb] = await Promise.all([
        api.getQuizzes(),
        api.getQuizAttempts(),
        api.getSubjects(),
      ]);
      setQuizzes(qz);
      setAttempts(att);
      setSubjects(sb);
      if (sb.length > 0 && !quizForm.subjectName) {
        setQuizForm((prev) => ({ ...prev, subjectName: sb[0].name }));
      }
    } catch (err) {
      console.error('Failed to load teacher dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate Token Otomatis
  const handleGenerateToken = async () => {
    try {
      const res = await api.generateQuizToken();
      setQuizForm((prev) => ({ ...prev, token: res.token }));
    } catch (err) {
      const randomToken = `TVQ-${Math.floor(1000 + Math.random() * 9000)}`;
      setQuizForm((prev) => ({ ...prev, token: randomToken }));
    }
  };

  // Copy Token to Clipboard
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const addQuizQuestion = () => {
    setQuizForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q_guru_${Date.now()}_${prev.questions.length + 1}`,
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

  const handleToggleQuizStatus = async (quiz: Quiz) => {
    try {
      const newStatus = !quiz.isActive;
      await api.updateQuiz(quiz.id, {
        isActive: newStatus,
        status: newStatus ? 'active' : 'inactive',
      });
      setQuizzes((prev) =>
        prev.map((q) => (q.id === quiz.id ? { ...q, isActive: newStatus, status: newStatus ? 'active' : 'inactive' } : q))
      );
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status kuis.');
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm('Hapus quiz ini beserta seluruh token dan riwayatnya?')) return;
    try {
      await api.deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus quiz.');
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.title.trim()) {
      alert('Judul quiz wajib diisi.');
      return;
    }

    if (quizForm.sourceType === 'google_forms' && !quizForm.externalUrl.trim()) {
      alert('Tautan Google Forms wajib diisi.');
      return;
    }

    setCreatingLoading(true);
    try {
      const payload: Partial<Quiz> = {
        title: quizForm.title,
        subjectName: quizForm.subjectName,
        subjectId: subjects.find((s) => s.name === quizForm.subjectName)?.id || 'sub_general',
        description: quizForm.description,
        durationMinutes: Number(quizForm.durationMinutes),
        passingScore: Number(quizForm.passingScore),
        token: quizForm.token || `TVQ-${Math.floor(1000 + Math.random() * 9000)}`,
        sourceType: quizForm.sourceType,
        externalUrl: quizForm.externalUrl,
        password: quizForm.password,
        scheduleStart: quizForm.scheduleStart,
        scheduleEnd: quizForm.scheduleEnd,
        questions: quizForm.sourceType === 'interactive' ? quizForm.questions : [],
        isActive: true,
        status: 'active',
      };

      await api.addQuiz(payload);
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat quiz baru.');
    } finally {
      setCreatingLoading(false);
    }
  };

  const filteredAttempts = attempts.filter((att) => {
    const matchesSearch =
      att.studentName.toLowerCase().includes(searchAttempt.toLowerCase()) ||
      att.username.toLowerCase().includes(searchAttempt.toLowerCase()) ||
      att.quizTitle.toLowerCase().includes(searchAttempt.toLowerCase());
    const matchesQuiz = selectedQuizFilter === 'all' || att.quizId === selectedQuizFilter;
    return matchesSearch && matchesQuiz;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold tracking-wide">
              PORTAL GURU RESMI
            </span>
            <span className="text-xs text-slate-400">TAMANSISWA BATAM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">Dashboard Manajemen Quiz Guru</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Kelola soal kuis, generator token, tautan Google Forms, password kuis, dan pantau hasil evaluasi belajar siswa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              handleGenerateToken();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Quiz & Token Baru</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl font-bold text-xs shadow-md transition"
          >
            <ScanLine className="w-4 h-4 text-emerald-400" />
            <span>Buka Scanner QR</span>
          </button>
        </div>
      </div>

      {/* Grid: Left = Quizzes List with Token Management, Right = Attempts/Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: QUIZ LIST & TOKEN MANAGEMENT (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Daftar Quiz & Token ({quizzes.length})
              </h2>
              <p className="text-xs text-slate-500">
                Kelola status kuis, salin token untuk dibagikan ke siswa
              </p>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 font-bold text-xs animate-pulse">
              Memuat data kuis guru...
            </div>
          ) : quizzes.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">Belum Ada Quiz</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Anda belum membuat quiz. Klik tombol <strong>"Buat Quiz & Token Baru"</strong> untuk mengatur kuis atau memasukkan tautan Google Forms.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                          {quiz.subjectName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            quiz.isActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {quiz.isActive ? 'AKTIF (DIBUKA)' : 'NONAKTIF (DITUTUP)'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {quiz.sourceType === 'google_forms' ? 'Google Forms' : 'Soal Interaktif'}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-900 text-base">{quiz.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleQuizStatus(quiz)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          quiz.isActive
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                        title="Ubah status akses kuis"
                      >
                        {quiz.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{quiz.isActive ? 'Tutup Kuis' : 'Buka Kuis'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Hapus Kuis"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Token & Access Sharing Box */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Token Akses Siswa:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-lg text-blue-900 tracking-wider">
                          {quiz.token}
                        </span>
                        {quiz.password && (
                          <span className="text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                            Password: <strong className="text-slate-700">{quiz.password}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyToken(quiz.token)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                          copiedToken === quiz.token
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
                        }`}
                      >
                        {copiedToken === quiz.token ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Salin Token</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Details metadata */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 pt-1">
                    <div>
                      Durasi: <strong>{quiz.durationMinutes} Menit</strong>
                    </div>
                    <div>
                      KKM / Lulus: <strong>{quiz.passingScore} Poin</strong>
                    </div>
                    <div>
                      Jumlah Soal:{' '}
                      <strong>
                        {quiz.sourceType === 'google_forms' ? 'Google Forms Link' : `${quiz.questions?.length || 0} Butir`}
                      </strong>
                    </div>
                  </div>

                  {quiz.sourceType === 'google_forms' && quiz.externalUrl && (
                    <div className="text-xs text-blue-700 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 flex items-center justify-between">
                      <span className="truncate max-w-sm">{quiz.externalUrl}</span>
                      <a
                        href={quiz.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 font-bold hover:underline shrink-0 flex items-center gap-1 ml-2"
                      >
                        <span>Cek Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: RESULTS & ATTEMPTS (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Hasil Nilai Siswa ({filteredAttempts.length})
              </h2>
              <p className="text-xs text-slate-500">
                Nilai dan catatan waktu pengerjaan quiz
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-4">
            {/* Filter and Search */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchAttempt}
                  onChange={(e) => setSearchAttempt(e.target.value)}
                  placeholder="Cari nama siswa atau username..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <select
                value={selectedQuizFilter}
                onChange={(e) => setSelectedQuizFilter(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
              >
                <option value="all">Semua Quiz Terdaftar</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({q.token})
                  </option>
                ))}
              </select>
            </div>

            {/* Attempts list */}
            {filteredAttempts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Belum ada siswa yang mengerjakan quiz ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto space-y-1">
                {filteredAttempts.map((att) => (
                  <div key={att.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">{att.studentName}</p>
                      <p className="text-[11px] text-slate-500">
                        @{att.username} • <span className="text-blue-700 font-mono font-bold">{att.tokenUsed}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(att.completedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        • {new Date(att.completedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-lg font-black text-slate-900">
                        {att.score}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          att.passed
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {att.passed ? 'LULUS' : 'REMIDI'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: BUAT QUIZ & TOKEN BARU */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Buat Quiz & Atur Token</h3>
                <p className="text-xs text-slate-500">
                  Tentukan mata pelajaran, sumber kuis (Google Forms atau Soal), password, dan token akses
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-4 text-xs">
              {/* Judul & Mata Pelajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Judul Quiz *</label>
                  <input
                    type="text"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    required
                    placeholder="Contoh: Penilaian Harian Bab 2"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran *</label>
                  {subjects.length > 0 ? (
                    <select
                      value={quizForm.subjectName}
                      onChange={(e) => setQuizForm({ ...quizForm, subjectName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={quizForm.subjectName}
                      onChange={(e) => setQuizForm({ ...quizForm, subjectName: e.target.value })}
                      required
                      placeholder="Nama Mapel"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  )}
                </div>
              </div>

              {/* Sumber Quiz: Google Forms ATAU Soal Interaktif */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  Sumber Quiz
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuizForm({ ...quizForm, sourceType: 'interactive' })}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                      quizForm.sourceType === 'interactive'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📝 Soal Interaktif TAMVESTA
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuizForm({ ...quizForm, sourceType: 'google_forms' })}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                      quizForm.sourceType === 'google_forms'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🌐 Tautan Google Forms
                  </button>
                </div>

                {quizForm.sourceType === 'google_forms' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tautan Google Forms Soal Ujian *
                    </label>
                    <input
                      type="url"
                      value={quizForm.externalUrl}
                      onChange={(e) => setQuizForm({ ...quizForm, externalUrl: e.target.value })}
                      required
                      placeholder="https://forms.gle/... atau https://docs.google.com/forms/..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono text-blue-700"
                    />
                  </div>
                )}
              </div>

              {/* Generator Token & Password Quiz */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  Pengaturan Akses & Token Siswa
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Token Akses Quiz *</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={quizForm.token}
                        onChange={(e) => setQuizForm({ ...quizForm, token: e.target.value.toUpperCase() })}
                        required
                        placeholder="TVQ-XXXX"
                        className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono font-black text-blue-800 uppercase tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateToken}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-[11px] whitespace-nowrap transition"
                      >
                        Acak Token
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Password Quiz (Opsional)
                    </label>
                    <input
                      type="text"
                      value={quizForm.password}
                      onChange={(e) => setQuizForm({ ...quizForm, password: e.target.value })}
                      placeholder="Kosongkan jika bebas sandi"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Durasi & KKM */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min="1"
                    value={quizForm.durationMinutes}
                    onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nilai KKM Kelulusan (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={quizForm.passingScore}
                    onChange={(e) => setQuizForm({ ...quizForm, passingScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* If Interactive Source: Questions input */}
              {quizForm.sourceType === 'interactive' && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Daftar Pertanyaan ({quizForm.questions.length} Butir)
                    </span>
                    <button
                      type="button"
                      onClick={addQuizQuestion}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold text-xs transition"
                    >
                      + Tambah Soal
                    </button>
                  </div>

                  <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                    {quizForm.questions.map((q, qIdx) => (
                      <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">Nomor {qIdx + 1}</span>
                          {quizForm.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuizQuestion(qIdx)}
                              className="text-rose-600 hover:text-rose-800"
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
                            updated[qIdx].question = e.target.value;
                            setQuizForm({ ...quizForm, questions: updated });
                          }}
                          required
                          placeholder={`Ketik pertanyaan nomor ${qIdx + 1}...`}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                        />

                        <div className="space-y-1.5">
                          <p className="text-[10px] text-slate-500 font-bold">
                            Opsi Jawaban (Pilih tombol bulat di kiri untuk Kunci Benar):
                          </p>
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct_guru_${qIdx}`}
                                checked={q.correctOptionIndex === oIdx}
                                onChange={() => {
                                  const updated = [...quizForm.questions];
                                  updated[qIdx].correctOptionIndex = oIdx;
                                  setQuizForm({ ...quizForm, questions: updated });
                                }}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <span className="font-bold text-slate-600 w-4">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...quizForm.questions];
                                  updated[qIdx].options[oIdx] = e.target.value;
                                  setQuizForm({ ...quizForm, questions: updated });
                                }}
                                required
                                placeholder={`Opsi ${String.fromCharCode(65 + oIdx)}`}
                                className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {creatingLoading ? 'Menyimpan...' : 'Simpan & Rilis Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
