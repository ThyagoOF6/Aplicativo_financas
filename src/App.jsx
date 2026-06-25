import React, { useState, useContext, useEffect, Suspense, lazy } from 'react';
import { FinanceProvider, FinanceContext } from './context/FinanceContext';
import { ToastProvider } from './components/layout/Toast';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';
import LockScreen from './components/layout/LockScreen';

// Lazy load heavy components for Code Splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const Accounts = lazy(() => import('./components/Accounts'));
const Transactions = lazy(() => import('./components/Transactions'));
const Family = lazy(() => import('./components/Family'));
const Taxes = lazy(() => import('./components/Taxes'));
const Reminders = lazy(() => import('./components/Reminders'));
const Investments = lazy(() => import('./components/Investments'));
const Reports = lazy(() => import('./components/Reports'));
const DataHub = lazy(() => import('./components/DataHub'));

function MainContent() {
  const { isLocked, isInitialized, setupMasterPassword, unlockWallet, lockWallet } = useContext(FinanceContext);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (isLocked) return;

    let timeoutId;
    const INACTIVITY_TIME = 5 * 60 * 1000; // 5 minutes

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lockWallet();
      }, INACTIVITY_TIME);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isLocked, lockWallet]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'accounts':
        return <Accounts />;
      case 'transactions':
        return <Transactions />;
      case 'family':
        return <Family />;
      case 'taxes':
        return <Taxes />;
      case 'reminders':
        return <Reminders />;
      case 'investments':
        return <Investments />;
      case 'reports':
        return <Reports />;
      case 'datahub':
        return <DataHub />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  if (isLocked) {
    return (
      <LockScreen 
        isInitialized={isInitialized} 
        onSetup={setupMasterPassword} 
        onUnlock={unlockWallet} 
      />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content-wrapper">
        <TopNav />
        <main className="content-container">
          <Suspense fallback={
            <div className="flex-center flex-column" style={{ height: '50vh', gap: 16 }}>
              <div className="loading-spinner"></div>
              <p className="text-secondary text-sm">Carregando módulo...</p>
            </div>
          }>
            {renderActiveTab()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <FinanceProvider>
        <MainContent />
      </FinanceProvider>
    </ToastProvider>
  );
}

export default App;
