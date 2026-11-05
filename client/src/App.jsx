import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, isGuardian } from './api.js';
import Login from './pages/Login.jsx';
import MockOAuth from './pages/MockOAuth.jsx';
import Signup from './pages/Signup.jsx';
import StudentHome from './pages/StudentHome.jsx';
import Session from './pages/Session.jsx';
import Result from './pages/Result.jsx';
import Notebook from './pages/Notebook.jsx';
import GuardianHome from './pages/GuardianHome.jsx';
import GuardianStudent from './pages/GuardianStudent.jsx';
import { ToastHost } from './components/Toast.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

// 상단바가 없는 로그인·가입 화면에서만 우측 상단에 띄움 (그 외 화면은 상단바 안에 있음)
function AuthPageToggle() {
  const { pathname } = useLocation();
  const isAuth = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth/');
  return isAuth ? <ThemeToggle floating /> : null;
}

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function Guard({ role, children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!user.role) return <Navigate to="/signup" replace />;
  if (role === 'student' && user.role !== 'student') return <Navigate to="/" replace />;
  if (role === 'guardian' && !isGuardian(user)) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.role) return <Navigate to="/signup" replace />;
  return user.role === 'student' ? <StudentHome /> : <GuardianHome />;
}

export default function App() {
  const [user, setUser] = useState(undefined);

  const refresh = async () => {
    const { user } = await api('/auth/me').catch(() => ({ user: null }));
    setUser(user);
    return user;
  };
  useEffect(() => {
    refresh();
  }, []);

  if (user === undefined) return <div className="boot">불러오는 중…</div>;

  return (
    <AuthCtx.Provider value={{ user, setUser, refresh }}>
      <AuthPageToggle />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user?.role ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/auth/mock/:provider" element={<MockOAuth />} />
        <Route path="/signup" element={!user ? <Navigate to="/login" replace /> : user.role ? <Navigate to="/" replace /> : <Signup />} />
        <Route path="/s/:id" element={<Guard role="student"><Session /></Guard>} />
        <Route path="/s/:id/result" element={<Guard role="student"><Result /></Guard>} />
        <Route path="/notebook/:subject" element={<Guard role="student"><Notebook /></Guard>} />
        <Route path="/g/student/:sid" element={<Guard role="guardian"><GuardianStudent /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
    </AuthCtx.Provider>
  );
}
