import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Printer,
  X,
  Shield,
  User as UserIcon,
  QrCode as QrIcon,
  School,
  Sparkles,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { User } from '../types/index.ts';

interface Props {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentProfileModal: React.FC<Props> = ({ user, isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loadingQr, setLoadingQr] = useState<boolean>(true);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    setLoadingQr(true);
    setIsZoomed(false);
    // Use the secure qrToken (e.g., TAMVESTA:STUDENT:stu_andi_pratama:hash)
    // No passwords or secret credentials inside!
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
        console.error('Error generating QR code:', err);
        setLoadingQr(false);
      });
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR_TAMVESTA_${user.username}_${user.nisn || 'SISWA'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-amber-300">
              TV
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Profil & Kartu QR Siswa</h3>
              <p className="text-[11px] text-teal-100">TAMVESTA • Perguruan Tamansiswa Batam</p>
            </div>
          </div>
          
          {/* Tombol Balik ke Halaman di Header */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
            title="Tutup dan balik ke halaman sebelumnya"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Balik ke Halaman</span>
          </button>
        </div>

        {/* Card Content & Printable Area */}
        <div className="p-6">
          <div
            ref={printAreaRef}
            id="student-card-print"
            className="bg-gradient-to-b from-slate-50 to-white rounded-2xl border-2 border-dashed border-emerald-300 p-5 shadow-sm text-center relative overflow-hidden"
          >
            {/* Watermark badge */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-100 rounded-full blur-2xl opacity-50 pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 text-left">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 tracking-wide uppercase">
                    Kartu Absensi Siswa
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">Tamansiswa Batam</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                <Sparkles className="w-3 h-3 text-emerald-600" /> RESMI
              </span>
            </div>

            {/* Student Info & Photo */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4 text-left">
              <div className="relative shrink-0">
                <img
                  src={
                    user.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=0284c7`
                  }
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md bg-slate-100"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                  <Shield className="w-3 h-3 text-white" />
                </span>
              </div>
              <div className="flex-1 space-y-1 w-full text-center sm:text-left">
                <h3 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                  {user.name}
                </h3>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-600">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
                    @{user.username}
                  </span>
                  {user.kelas && (
                    <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                      {user.kelas}
                    </span>
                  )}
                </div>
                {user.nisn && (
                  <p className="text-[11px] text-slate-500">
                    NISN: <span className="font-mono font-medium text-slate-700">{user.nisn}</span>
                  </p>
                )}
              </div>
            </div>

            {/* QR Code Container - Clickable to zoom & inspect */}
            <div
              onClick={() => setIsZoomed(!isZoomed)}
              className="group relative bg-white p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 shadow-inner inline-block my-2 mx-auto cursor-pointer transition-all duration-200 hover:shadow-lg"
              title="Klik untuk memperbesar / mengecilkan QR Code"
            >
              {loadingQr ? (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                  Membuat QR Code...
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={qrDataUrl}
                    alt="QR Code Absensi Siswa"
                    className={`object-contain mx-auto transition-all duration-300 ${
                      isZoomed ? 'w-64 h-64 sm:w-72 sm:h-72 scale-105' : 'w-44 h-44 group-hover:scale-102'
                    }`}
                  />
                  <div className="absolute bottom-1 right-1 p-1 bg-slate-900/70 hover:bg-slate-900 text-white rounded-lg opacity-80 group-hover:opacity-100 transition text-[10px] flex items-center gap-1 px-1.5">
                    {isZoomed ? <ZoomOut className="w-3 h-3" /> : <ZoomIn className="w-3 h-3" />}
                    <span>{isZoomed ? 'Perkecil' : 'Perbesar'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 text-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <QrIcon className="w-3.5 h-3.5 text-emerald-600" /> Gunakan Untuk Absensi Event & OSIS
              </span>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                Tunjukkan QR Code ini kepada panitia saat menghadiri kegiatan sekolah. Kode ini unik dan terenkripsi.
              </p>
            </div>
          </div>

          {/* Action Buttons: Unduh & Cetak */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              onClick={handleDownloadPng}
              disabled={loadingQr || !qrDataUrl}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              Unduh QR Code PNG
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Cetak QR Code
            </button>
          </div>

          {/* Tombol Utama: Balik ke Halaman */}
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs sm:text-sm shadow-lg shadow-slate-900/20 transition active:scale-[0.99] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Balik ke Halaman</span>
          </button>

          <p className="text-[11px] text-slate-400 text-center mt-3">
            *QR Code bersifat permanen dan tidak memuat password akun Anda.
          </p>
        </div>
      </div>
    </div>
  );
};
