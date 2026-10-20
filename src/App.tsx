import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Login } from './pages/Login.tsx';
import { Navbar } from './components/Navbar.tsx';
import { StudentDashboard } from './pages/student/StudentDashboard.tsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.tsx';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard.tsx';
import { ScannerPage } from './pages/attendance/ScannerPage.tsx';
import { PasswordChangeModal } from './components/PasswordChangeModal.tsx';
import { School } from 'lucide-react';

function AppContent() {
  const { user, loading, mustChangePassword } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'scanner'>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 animate-bounce">
          <School className="w-8 h-8 text-amber-300" />
        </div>
        <h2 className="text-xl font-black text-white mt-4 tracking-tight">TAMVESTA</h2>
        <p className="text-xs text-emerald-400 font-medium">Perguruan Tamansiswa Batam</p>
        <p className="text-xs text-slate-500 mt-2">Memuat data sistem sekolah...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Global Navigation */}
      <Navbar
        currentTab={currentView}
        onNavigate={(tab) => {
          if (tab === 'scanner') setCurrentView('scanner');
          else setCurrentView('dashboard');
        }}
      />

      {/* Mandatory Password Change Gate for First Login */}
      {mustChangePassword && (
        <PasswordChangeModal
          isOpen={true}
          isMandatory={true}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 pb-12">
        {currentView === 'scanner' ? (
          <ScannerPage onBackToDashboard={() => setCurrentView('dashboard')} />
        ) : (
          <>
            {user.role === 'admin' && (
              <AdminDashboard onOpenScanner={() => setCurrentView('scanner')} />
            )}

            {user.role === 'guru' && (
              <TeacherDashboard onOpenScanner={() => setCurrentView('scanner')} />
            )}

            {user.role === 'siswa' && <StudentDashboard />}

            {user.role === 'panitia' && (
              <ScannerPage onBackToDashboard={() => setCurrentView('dashboard')} />
            )}

            {user.role === 'kepala_sekolah' && (
              <AdminDashboard onOpenScanner={() => setCurrentView('scanner')} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
