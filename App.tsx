


import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProjectsPage from './components/ProjectsPage';
import ReportsPage from './components/ReportsPage';
import SettingsPage from './components/SettingsPage';
import FinancialsPage from './components/financials/FinancialsPage';
import NotificationsPage from './components/notifications/NotificationsPage';
import { User, UserRole } from './types';
import LoginPage from './components/LoginPage';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('Dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // To prevent flash of login page

  // Simple session persistence using localStorage
  useEffect(() => {
    try {
      const loggedInUser = localStorage.getItem('costpilotUser');
      if (loggedInUser) {
        setCurrentUser(JSON.parse(loggedInUser));
      }
    } catch (error)
    {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('costpilotUser');
    }
    setLoadingAuth(false);
  }, []);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = async (email: string): Promise<{ success: boolean; error?: string }> => {
    // In a real app, you would use Firebase Auth. This is a simulation.
    // We are not checking the password for this demo.
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, error: 'No user found with that email.' };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = { id: userDoc.id, ...userDoc.data() } as User;
      
      setCurrentUser(userData);
      localStorage.setItem('costpilotUser', JSON.stringify(userData)); // Persist session
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: 'An error occurred during login.' };
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('costpilotUser'); // Clear session
    setActivePage('Dashboard'); // Reset to default page on logout
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('costpilotUser', JSON.stringify(updatedUser));
  };


  const hasAccess = (page: string, role: UserRole): boolean => {
    const adminPages = ['Dashboard', 'Projects', 'Reports', 'Financials', 'Notifications', 'Settings'];
    const pmPages = ['Dashboard', 'Projects', 'Notifications'];
    const financePages = ['Dashboard', 'Financials', 'Notifications'];

    switch (role) {
        case UserRole.Admin:
            return adminPages.includes(page);
        case UserRole.ProjectManager:
            return pmPages.includes(page);
        case UserRole.Finance:
            return financePages.includes(page);
        default:
            return false;
    }
  };

  const handleSetPage = (page: string) => {
    if (currentUser && hasAccess(page, currentUser.role)) {
        setActivePage(page);
    }
  };


  const renderPage = () => {
    if (currentUser && !hasAccess(activePage, currentUser.role)) {
        return <Dashboard setActivePage={handleSetPage} />;
    }

    switch (activePage) {
      case 'Dashboard':
        return <Dashboard setActivePage={handleSetPage} />;
      case 'Projects':
        return <ProjectsPage />;
      case 'Reports':
        return <ReportsPage />;
      case 'Financials':
        return <FinancialsPage />;
      case 'Notifications':
        return <NotificationsPage />;
      case 'Settings':
        return <SettingsPage currentUser={currentUser} onUserUpdate={handleUserUpdate}/>;
      default:
        return <Dashboard setActivePage={handleSetPage} />;
    }
  };

  if (loadingAuth) {
    return <div className="flex h-screen w-screen items-center justify-center bg-base-200 dark:bg-gray-900">Loading...</div>;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-base-200 text-base-content font-sans dark:bg-gray-900 dark:text-gray-200">
      <Sidebar activePage={activePage} setActivePage={handleSetPage} currentUser={currentUser} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
            theme={theme} 
            toggleTheme={toggleTheme} 
            setActivePage={handleSetPage}
            currentUser={currentUser}
            onLogout={handleLogout}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-base-200 p-4 sm:p-6 lg:p-8 dark:bg-gray-900">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;