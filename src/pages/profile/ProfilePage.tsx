import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  User as UserIcon,
  Shield,
  Key,
  QrCode as QrIcon,
  Download,
  Printer,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Edit2,
  FileText,
  School,
  Sparkles,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Send,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api, setStoredToken } from '../../lib/api.ts';
import type { PasswordResetRequest } from '../../types/index.ts';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  // QR Code States
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loadingQr, setLoadingQr] = useState<boolean>(true);
  const [isQrZoomed, setIsQrZoomed] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Username edit states
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Password reset request ticket states
  const [showResetRequestModal, setShowResetRequestModal] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setNewUsername(user.username);

    // Generate QR
    setLoadingQr(true);
    const tokenToEncode = user.qrToken || `TAMVESTA:STUDENT:${user.id}:${user.username}`;
    QRCode.toDataURL(tokenToEncode, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        setQrDataUrl(url);
        setLoadingQr(false);
      })
      .catch((err) => {
        console.error('Error generating QR:', err);
        setLoadingQr(false);
      });
  }, [user]);

  if (!user) return null;

  // Calculate days remaining for 30-day username restriction
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  let canChangeUsername = true;
  let daysRemaining = 0;

  if (user.lastUsernameChange) {
    const elapsed = Date.now() - new Date(user.lastUsernameChange).getTime();
    if (elapsed < THIRTY_DAYS_MS) {
      canChangeUsername = false;
      daysRemaining = Math.ceil((THIRTY_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000));
    }
  }

  // Handle Username update
  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSuccess(null);

    if (!newUsername.trim()) {
      setUsernameError('Username baru wajib diisi.');
      return;
    }

    setUsernameLoading(true);
    try {
      const res = await api.updateUsername(newUsername.trim());
      if (res.token) {
        setStoredToken(res.token);
      }
      setUsernameSuccess(res.message);
      setIsEditingUsername(false);
      await refreshUser();
    } catch (err: any) {
      setUsernameError(err.message || 'Gagal memperbarui username.');
    } finally {
      setUsernameLoading(false);
    }
  };

  // Handle Password Reset Request Submission
  const handleSubmitResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError(null);
    setTicketSuccess(null);

    if (!resetReason.trim()) {
      setTicketError('Mohon tuliskan alasan permohonan reset password.');
      return;
    }

    setTicketLoading(true);
    try {
      const res = await api.submitPasswordResetRequest(resetReason.trim());
      setTicketSuccess(res.message);
      setResetReason('');
      setTimeout(() => {
        setShowResetRequestModal(false);
        setTicketSuccess(null);
      }, 2500);
    } catch (err: any) {
      setTicketError(err.message || 'Gagal mengajukan permohonan reset password.');
    } finally {
      setTicketLoading(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_TAMVESTA_${user.username}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-bold text-emerald-300 border border-white/10">
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span>PROFIL AKUN & IDENTITAS RESMI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Profil Pengguna</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Informasi identitas akun, hak akses, kartu QR absensi, serta pengelolaan kredensial terverifikasi.
            </p>
          </div>

          <span className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-black uppercase tracking-wider self-start md:self-auto">
            Peran: {user.role.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Grid: Left = Account Info, Right = QR Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ACCOUNT INFORMATION (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Identity Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-emerald-600" />
              <span>Data Identitas Akun</span>
            </h3>

            {usernameSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{usernameSuccess}</span>
              </div>
            )}

            {usernameError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{usernameError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* 1. NAMA (Read-only, Admin determined) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    Nama Lengkap
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    Ditetapkan oleh Admin (Terkunci)
                  </span>
                </div>
                <p className="text-sm sm:text-base font-black text-slate-900">{user.name}</p>
                <p className="text-[11px] text-slate-400">
                  *Nama pengguna diambil langsung dari ketetapan Administrator sekolah dan tidak dapat diubah mandiri.
                </p>
              </div>

              {/* 2. USERNAME (Editable max once per 30 days) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    Username Akun
                  </span>
                  {canChangeUsername ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Bisa Diubah (1x / 30 Hari)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Terkunci ({daysRemaining} hari lagi)
                    </span>
                  )}
                </div>

                {!isEditingUsername ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm sm:text-base font-mono font-bold text-slate-800">
                      @{user.username}
                    </span>
                    {canChangeUsername ? (
                      <button
                        onClick={() => {
                          setIsEditingUsername(true);
                          setNewUsername(user.username);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs transition"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ubah Username</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Dapat diubah kembali dalam {daysRemaining} hari
                      </span>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleUpdateUsername} className="space-y-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono font-bold text-sm">@</span>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                        placeholder="username.baru"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsEditingUsername(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={usernameLoading}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                      >
                        {usernameLoading ? 'Menyimpan...' : 'Simpan Username'}
                      </button>
                    </div>
                  </form>
                )}

                {user.lastUsernameChange && (
                  <p className="text-[10px] text-slate-400">
                    Terakhir diubah: {new Date(user.lastUsernameChange).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>

              {/* 3. PASSWORD STATUS (Direct change disabled, request to Admin) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    Keamanan Password
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Terenkripsi PBKDF2
                  </span>
                </div>

                <div className="space-y-1 text-slate-600 text-xs leading-relaxed">
                  <p>
                    <strong>Ketentuan Keamanan:</strong> Pengguna tidak dapat mengganti password secara langsung. Permintaan perubahan password harus diajukan kepada Administrator atau bagian tata usaha sekolah untuk diproses melalui prosedur verifikasi yang aman.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetRequestModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-98"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-300" />
                    <span>Ajukan Permintaan Reset / Ganti Password ke Admin</span>
                  </button>
                </div>
              </div>

              {/* Kelas & NISN if available */}
              {(user.kelas || user.nisn) && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  {user.kelas && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Kelas</span>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">{user.kelas}</p>
                    </div>
                  )}
                  {user.nisn && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">NISN</span>
                      <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{user.nisn}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: OFFICIAL QR CARD (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Kartu QR Code Pribadi</h3>
                <p className="text-[11px] text-slate-400">Gunakan untuk absensi event & OSIS</p>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                TERVERIFIKASI
              </span>
            </div>

            {/* QR Card Container */}
            <div
              ref={printAreaRef}
              id="student-card-print"
              className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border-2 border-dashed border-emerald-300 p-5 shadow-xs relative overflow-hidden"
            >
              <div className="flex items-center gap-2 text-left mb-3">
                <School className="w-4 h-4 text-emerald-700" />
                <div>
                  <h4 className="font-black text-xs uppercase text-slate-800">Tamansiswa Batam</h4>
                  <p className="text-[10px] text-slate-400">{user.name}</p>
                </div>
              </div>

              {/* QR Image with Click to Zoom */}
              <div
                onClick={() => setIsQrZoomed(!isQrZoomed)}
                className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner inline-block mx-auto cursor-pointer group hover:border-emerald-500 transition"
                title="Klik untuk memperbesar QR"
              >
                {loadingQr ? (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400 text-xs">
                    Membuat QR...
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className={`mx-auto transition-all duration-300 ${
                        isQrZoomed ? 'w-56 h-56 scale-105' : 'w-40 h-40 group-hover:scale-102'
                      }`}
                    />
                    <div className="absolute bottom-1 right-1 p-1 bg-slate-900/70 text-white rounded-lg text-[9px] flex items-center gap-1 px-1.5 opacity-80 group-hover:opacity-100">
                      {isQrZoomed ? <ZoomOut className="w-3 h-3" /> : <ZoomIn className="w-3 h-3" />}
                      <span>{isQrZoomed ? 'Kecil' : 'Besar'}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 text-center text-[10px] text-slate-500">
                <p className="font-mono font-bold text-slate-700">@{user.username}</p>
                <p className="text-slate-400 mt-0.5">Kode unik absensi resmi sekolah</p>
              </div>
            </div>

            {/* Download & Print Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleDownloadQr}
                disabled={loadingQr || !qrDataUrl}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh PNG</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kartu</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: AJUKAN PERMINTAAN RESET PASSWORD KE ADMIN */}
      {showResetRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Key className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Permintaan Reset Password</h3>
                <p className="text-xs text-slate-500">Kirim tiket permohonan ke Administrator</p>
              </div>
            </div>

            {ticketSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{ticketSuccess}</span>
              </div>
            )}

            {ticketError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{ticketError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitResetRequest} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 space-y-1">
                <p>Akun: <strong>{user.name}</strong> (@{user.username})</p>
                <p className="text-[11px] text-slate-500">
                  Permintaan ini akan dicatat dan ditinjau secara langsung oleh Admin / Tata Usaha Tamansiswa Batam.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Alasan / Keterangan Permohonan *
                </label>
                <textarea
                  rows={3}
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  required
                  placeholder="Contoh: Lupa password lama / ingin memperbarui keamanan akun..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/20 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetRequestModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={ticketLoading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{ticketLoading ? 'Mengirimkan...' : 'Kirim Permohonan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
