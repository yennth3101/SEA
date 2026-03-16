import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap, LogOut, User } from 'lucide-react';
import { auth } from '../firebase';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  role: 'lecturer' | 'student' | null;
  onLogout: () => void;
  onSwitchRole?: (role: 'lecturer' | 'student') => void;
}

export default function Layout({ children, user, role, onLogout, onSwitchRole }: LayoutProps) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-600 p-2 rounded-lg">
                <GraduationCap className="text-white w-6 h-6" />
              </div>
              <span className="font-bold text-xl tracking-tight">SmartEdu Assistant</span>
            </div>
            
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-4">
                  {onSwitchRole && (
                    <div className="hidden md:flex bg-stone-100 p-1 rounded-xl gap-1">
                      <button
                        onClick={() => onSwitchRole('lecturer')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${role === 'lecturer' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                      >
                        Giảng viên
                      </button>
                      <button
                        onClick={() => onSwitchRole('student')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${role === 'student' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                      >
                        Sinh viên
                      </button>
                    </div>
                  )}
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{user.displayName || user.email}</p>
                    <p className="text-xs text-stone-500 uppercase tracking-wider">
                      {role === 'lecturer' ? 'Giảng viên' : 'Sinh viên'}
                    </p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-600"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </main>

      <footer className="bg-white border-t border-stone-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-stone-500 text-sm">
          <p>© 2026 SmartEdu Assistant - Hệ thống hỗ trợ học tập thông minh</p>
        </div>
      </footer>
    </div>
  );
}
