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
const SettingsManager = lazy(() => import('./components/layout/SettingsManager'));
const SavingsGoals = lazy(() => import('./components/Goals'));

function MainContent() {
  const { isLocked, isInitialized, setupMasterPassword, unlockWallet, lockWallet, settings, syncWithCloud } = useContext(FinanceContext);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const theme = settings?.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  }, [settings?.theme]);

  useEffect(() => {
    if (isLocked) return;

    let timeoutId;
    const INACTIVITY_TIME = (settings?.autoLockMinutes || 5) * 60 * 1000;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        // Perform a final cloud sync before locking to prevent data loss in the 5s debounce window
        await syncWithCloud();
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
  }, [isLocked, lockWallet, settings?.autoLockMinutes, syncWithCloud]);

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
      case 'goals':
        return <SavingsGoals />;
      case 'reports':
        return <Reports />;
      case 'datahub':
        return <DataHub />;
      case 'settings':
        return <SettingsManager />;
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
