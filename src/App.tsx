import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import Layout from './components/Layout';
import LecturerArea from './components/LecturerArea';
import StudentView from './components/StudentView';
import { Loader2, LogIn, GraduationCap, Users } from 'lucide-react';

import { handleFirestoreError, OperationType } from './utils/errorHandlers';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'lecturer' | 'student' | null>(null);
  const [overrideRole, setOverrideRole] = useState<'lecturer' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Check role in Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          let userRole: 'lecturer' | 'student' = 'student';
          
          if (userDoc.exists()) {
            userRole = userDoc.data().role;
          } else {
            userRole = currentUser.email === 'yennth.math@gmail.com' ? 'lecturer' : 'student';
            await setDoc(doc(db, 'users', currentUser.uid), {
              email: currentUser.email,
              role: userRole,
            });
          }
          setRole(userRole);

          // Initialize settings if missing
          const settingsDoc = await getDoc(doc(db, 'settings', 'current'));
          if (!settingsDoc.exists() && currentUser.email === 'yennth.math@gmail.com') {
            await setDoc(doc(db, 'settings', 'current'), {
              currentLectureId: '',
              currentTestId: '',
              updatedAt: serverTimestamp(),
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users/settings');
        }
      } else {
        setUser(null);
        setRole(null);
        setOverrideRole(null);
      }
      setAuthReady(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const activeRole = overrideRole || role;

  if (loading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-stone-200 text-center space-y-8">
          <div className="bg-emerald-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <GraduationCap className="text-white w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-stone-900">SmartEdu Assistant</h1>
            <p className="text-stone-500 mt-2">Trợ lý học tập thông minh dành cho Giảng viên & Sinh viên</p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              className="w-full bg-white border-2 border-stone-200 hover:border-emerald-500 text-stone-700 font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 group"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              Đăng nhập với Google
            </button>
            <p className="text-xs text-stone-400">
              Sử dụng tài khoản Google để truy cập hệ thống bài giảng và bài test.
            </p>
          </div>

          <div className="pt-8 border-t border-stone-100 grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="bg-stone-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <GraduationCap className="w-5 h-5 text-stone-600" />
              </div>
              <p className="text-[10px] font-bold uppercase text-stone-400">Giảng viên</p>
            </div>
            <div className="text-center">
              <div className="bg-stone-100 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-stone-600" />
              </div>
              <p className="text-[10px] font-bold uppercase text-stone-400">Sinh viên</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      user={user} 
      role={activeRole} 
      onLogout={handleLogout}
      onSwitchRole={user.email === 'yennth.math@gmail.com' ? (r) => setOverrideRole(r) : undefined}
    >
      {activeRole === 'lecturer' ? <LecturerArea /> : <StudentView />}
    </Layout>
  );
}
