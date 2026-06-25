import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { 
  DollarSign, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  User, 
  Cloud, 
  CloudLightning, 
  CloudOff, 
  RefreshCw, 
  Loader2 
} from 'lucide-react';

const TopNav = () => {
  const { 
    accounts, 
    investments, 
    transactions,
    syncStatus,
    syncWithCloud,
    username,
    registerCloud,
    loginCloud,
    lockWallet
  } = useContext(FinanceContext);

  // Modal and form states
  const [showModal, setShowModal] = useState(false);
  const [formTab, setFormTab] = useState('login'); // 'login' or 'register'
  const [modalUser, setModalUser] = useState('');
  const [modalPass, setModalPass] = useState('');
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Consolidated Net Worth = Accounts balances + Investment values
  const totalAccountsBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const totalInvestmentsValue = investments.reduce((acc, curr) => acc + curr.value, 0);
  const netWorth = totalAccountsBalance + totalInvestmentsValue;

  // Cash / Physical Wallet balance
  const cashAccount = accounts.find(acc => acc.type === 'Carteira Física' || acc.name.includes('Espécie'));
  const cashBalance = cashAccount ? cashAccount.balance : 0;

  // Monthly balance calculation (Income - Expense for current month)
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  
  // For demo consistency (since initial mock data is set to 2026-06)
  const referenceMonthStr = '2026-06'; 

  const monthlyTransactions = transactions.filter(t => t.date.startsWith(referenceMonthStr));
  const monthlyIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const monthlySavings = monthlyIncome - monthlyExpense;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getSyncIcon = (status) => {
    switch (status) {
      case 'synced':
        return <Cloud size={16} />;
      case 'syncing':
        return <CloudLightning size={16} className="animate-pulse" />;
      case 'error':
      case 'disconnected':
      case 'local_only':
      default:
        return <CloudOff size={16} />;
    }
  };

  const getSyncIconClass = (status) => {
    switch (status) {
      case 'synced':
        return 'saving'; // Green background
      case 'syncing':
        return 'net-worth'; // Sky blue background
      case 'error':
        return 'debt'; // Red background
      case 'disconnected':
      case 'local_only':
      default:
        return 'bg-slate'; // Gray background
    }
  };

  const getSyncStatusText = (status) => {
    switch (status) {
      case 'synced': return 'Nuvem OK';
      case 'syncing': return 'Sincronizando';
      case 'error': return 'Erro Nuvem';
      case 'disconnected': return 'Offline';
      case 'local_only': return 'Local Apenas';
      default: return 'Desconectado';
    }
  };

  const handleSyncClick = () => {
    setShowModal(true);
  };

  const handleDisconnect = () => {
    // Reset sync states on client
    localStorage.removeItem('wealth_mgr_username');
    lockWallet(); // Force re-lock for absolute security after disconnecting cloud
    setShowModal(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFormLoading(true);

    try {
      if (formTab === 'login') {
        const res = await loginCloud(modalUser, modalPass);
        if (res.success) {
          setShowModal(false);
          setModalUser('');
          setModalPass('');
        } else {
          setError(res.error || 'Credenciais inválidas.');
        }
      } else {
        const res = await registerCloud(modalUser, modalPass);
        if (res.success) {
          setShowModal(false);
          setModalUser('');
          setModalPass('');
        } else {
          setError(res.error || 'Falha ao registrar.');
        }
      }
    } catch (err) {
      setError(err.message || 'Erro de rede.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <>
      <header className="topnav">
        <div className="topnav-stats">
          <div className="stat-pill">
            <div className="stat-pill-icon net-worth">
              <DollarSign size={16} />
            </div>
            <div className="stat-pill-info">
              <span className="stat-pill-label">Patrimônio Líquido</span>
              <span className="stat-pill-value">{formatCurrency(netWorth)}</span>
            </div>
          </div>

          <div className="stat-pill">
            <div className="stat-pill-icon cash">
              <Wallet size={16} />
            </div>
            <div className="stat-pill-info">
              <span className="stat-pill-label">Dinheiro em Espécie</span>
              <span className="stat-pill-value">{formatCurrency(cashBalance)}</span>
            </div>
          </div>

          <div className="stat-pill">
            <div className={`stat-pill-icon ${monthlySavings >= 0 ? 'saving' : 'debt'}`}>
              {monthlySavings >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            </div>
            <div className="stat-pill-info">
              <span className="stat-pill-label">Resultado do Mês</span>
              <span className={`stat-pill-value ${monthlySavings >= 0 ? 'text-success' : 'text-danger'}`}>
                {monthlySavings >= 0 ? '+' : ''}{formatCurrency(monthlySavings)}
              </span>
            </div>
          </div>

          {/* Zero-Knowledge Cloud Sync Pill */}
          <div className="stat-pill" onClick={handleSyncClick} style={{ cursor: 'pointer' }}>
            <div className={`stat-pill-icon ${getSyncIconClass(syncStatus)}`}>
              {getSyncIcon(syncStatus)}
            </div>
            <div className="stat-pill-info">
              <span className="stat-pill-label">Sincronização</span>
              <span className="stat-pill-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {getSyncStatusText(syncStatus)}
                {username && <span className="text-secondary" style={{ fontSize: '0.7rem' }}>({username})</span>}
              </span>
            </div>
          </div>
        </div>

        <div className="topnav-profile">
          <div className="profile-info">
            <span className="profile-name">Thyago F.</span>
            <span className="profile-role">Plano VIP</span>
          </div>
          <div className="profile-avatar">
            <User size={18} />
          </div>
        </div>
      </header>

      {/* Cloud Sync Premium Modal */}
      {showModal && (
        <div className="modal-backdrop flex-center" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }} onClick={() => setShowModal(false)}>
          <div className="card glass-card flex-column gap-md" style={{
            width: 420,
            padding: '2rem',
            backgroundColor: '#0f172a',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--glass-shadow)',
            borderRadius: 'var(--border-radius)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header flex-between flex-center-y" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem' }}>
                <Cloud className="text-accent" size={20} />
                Sincronização na Nuvem
              </h3>
              <button className="link-btn font-bold" onClick={() => setShowModal(false)} style={{ fontSize: '1.2rem', padding: '0 8px' }}>&times;</button>
            </div>

            {username ? (
              // Connected State
              <div className="flex-column gap-md mt-sm">
                <p className="text-xs text-secondary" style={{ lineHeight: '1.5' }}>
                  Sua conta está conectada à nuvem em modo <strong>Zero-Knowledge</strong>. Seus dados financeiros são criptografados localmente com sua senha mestra antes de serem sincronizados.
                </p>
                <div className="info-box p-md flex-column gap-xs" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div className="flex-between text-xs">
                    <span className="text-secondary">Usuário:</span>
                    <span className="font-semibold text-primary">{username}</span>
                  </div>
                  <div className="flex-between text-xs">
                    <span className="text-secondary">Status:</span>
                    <span className="font-semibold text-success">{syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'error' ? 'Erro de sincronização' : 'Desconectado'}</span>
                  </div>
                </div>
                <div className="flex-column gap-sm mt-md">
                  <button className="btn btn-primary btn-sm flex-center gap-xs" onClick={() => syncWithCloud()} disabled={syncStatus === 'syncing'}>
                    <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} style={{ marginRight: 4 }} />
                    Sincronizar Agora
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleDisconnect}>
                    Desconectar & Bloquear Carteira
                  </button>
                </div>
              </div>
            ) : (
              // Login / Register Form
              <div className="flex-column gap-md mt-sm">
                <div className="tab-buttons flex" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem', display: 'flex' }}>
                  <button 
                    className="link-btn text-xs font-semibold" 
                    style={{ flex: 1, paddingBottom: 8, color: formTab === 'login' ? 'var(--accent-color)' : 'var(--text-secondary)', borderBottom: formTab === 'login' ? '2px solid var(--accent-color)' : 'none', background: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                    onClick={() => { setFormTab('login'); setError(''); }}
                  >
                    Entrar
                  </button>
                  <button 
                    className="link-btn text-xs font-semibold" 
                    style={{ flex: 1, paddingBottom: 8, color: formTab === 'register' ? 'var(--accent-color)' : 'var(--text-secondary)', borderBottom: formTab === 'register' ? '2px solid var(--accent-color)' : 'none', background: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
                    onClick={() => { setFormTab('register'); setError(''); }}
                  >
                    Criar Conta
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="flex-column gap-sm" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="form-group flex-column gap-xxs" style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    <label htmlFor="cloud-user" className="text-xxs text-secondary" style={{ fontSize: '0.7rem' }}>Usuário / Email</label>
                    <input 
                      id="cloud-user" 
                      type="text" 
                      placeholder="Escolha seu usuário..." 
                      value={modalUser}
                      onChange={(e) => setModalUser(e.target.value)}
                      required 
                      style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#fff' }}
                    />
                  </div>
                  <div className="form-group flex-column gap-xxs" style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    <label htmlFor="cloud-pass" className="text-xxs text-secondary" style={{ fontSize: '0.7rem' }}>Senha Mestra</label>
                    <input 
                      id="cloud-pass" 
                      type="password" 
                      placeholder="Sua senha de acesso..." 
                      value={modalPass}
                      onChange={(e) => setModalPass(e.target.value)}
                      required 
                      style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.03)', color: '#fff' }}
                    />
                  </div>

                  {error && (
                    <div className="text-xxs text-danger font-semibold" style={{ background: 'var(--danger-bg)', color: 'var(--danger-color)', padding: '8px 12px', borderRadius: 4, fontSize: '0.75rem', marginBottom: 12 }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary btn-sm flex-center mt-sm" disabled={formLoading}>
                    {formLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <span>{formTab === 'login' ? 'Conectar' : 'Registrar & Sincronizar'}</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TopNav;
