
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ProjectsPage from './components/ProjectsPage';
import ReportsPage from './components/ReportsPage';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState('Dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <Dashboard setActivePage={setActivePage} />;
      case 'Projects':
        return <ProjectsPage />;
      case 'Reports':
        return <ReportsPage />;
      // Add cases for other pages like 'Financials', 'Settings' here
      default:
        return <Dashboard setActivePage={setActivePage} />;
    }
  };


  return (
    <div className="flex h-screen bg-base-200 text-base-content font-sans">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-base-200 p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;