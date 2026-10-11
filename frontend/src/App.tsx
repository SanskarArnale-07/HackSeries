import { useState, useEffect } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { DashboardPage } from './components/dashboard/DashboardPage';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      return p === '/dashboard' ? '/dashboard' : '/';
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      setCurrentPath(p === '/dashboard' ? '/dashboard' : '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  if (currentPath === '/dashboard') {
    return <DashboardPage onNavigateHome={() => navigate('/')} />;
  }

  return <LandingPage onEnterDashboard={() => navigate('/dashboard')} />;
}

export default App;
