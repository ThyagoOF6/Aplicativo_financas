import React, { useContext, useMemo } from 'react';
import { FinanceContext } from '../context/FinanceContext';
import { 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  PlusCircle, 
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Award
} from 'lucide-react';

const Dashboard = ({ setActiveTab }) => {
  const { 
    accounts, 
    investments, 
    transactions, 
    reminders,
    profile
  } = useContext(FinanceContext);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Calculations
  const totalAccounts = useMemo(() => accounts.reduce((acc, curr) => acc + curr.balance, 0), [accounts]);
  const totalInvested = useMemo(() => investments.reduce((acc, curr) => acc + curr.value, 0), [investments]);
  const netWorth = totalAccounts + totalInvested;

  // Monthly flow
  const referenceMonthStr = '2026-06';
  
  const { monthlyTransactions, incomeThisMonth, expenseThisMonth } = useMemo(() => {
    const mTx = transactions.filter(t => t.date.startsWith(referenceMonthStr));
    const income = mTx.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = mTx.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    return { monthlyTransactions: mTx, incomeThisMonth: income, expenseThisMonth: expense };
  }, [transactions]);

  // Category summary
  const expenseCategories = useMemo(() => {
    const categoriesMap = {};
    monthlyTransactions.filter(t => t.type === 'expense').forEach(t => {
      categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount;
    });

    return Object.keys(categoriesMap).map(cat => ({
      name: cat,
      amount: categoriesMap[cat],
      percent: expenseThisMonth > 0 ? (categoriesMap[cat] / expenseThisMonth) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [monthlyTransactions, expenseThisMonth]);

  // Recent transactions (last 3)
  const recentTransactions = useMemo(() => transactions.slice(0, 3), [transactions]);

  // Pending reminders (vencendo em breve)
  const pendingReminders = useMemo(() => reminders.filter(r => !r.paid).slice(0, 2), [reminders]);

  // Smart Alerts logic
  const smartAlerts = useMemo(() => {
    const alerts = [];
    const deductibleCount = transactions.filter(t => t.isTaxDeductible).length;
    
    if (deductibleCount > 0) {
      alerts.push({
        id: 'irpf',
        type: 'info',
        icon: <ShieldAlert className="text-accent" size={18} />,
        title: 'Período IRPF Ativo',
        text: `Você possui ${deductibleCount} despesas dedutíveis (Saúde/Educação) salvas no fluxo de caixa. Exporte os comprovantes na aba Integração.`
      });
    }

    if (profile) {
      const totalInvValue = investments.reduce((acc, curr) => acc + curr.value, 0);
      const volatileValue = investments
        .filter(inv => inv.type === 'Ações' || inv.type === 'Cripto')
        .reduce((acc, curr) => acc + curr.value, 0);
      
      const volatilePct = totalInvValue > 0 ? (volatileValue / totalInvValue) * 100 : 0;

      if (profile === 'Conservador' && volatilePct > 30) {
        alerts.push({
          id: 'rebalance',
          type: 'warning',
          icon: <Award className="text-warning" size={18} />,
          title: 'Alerta de Rebalanceamento',
          text: `Sua carteira possui ${volatilePct.toFixed(1)}% em ativos de alto risco (Ações/Cripto), excedendo o limite de 30% recomendado para o perfil Conservador.`
        });
      } else if (profile === 'Moderado' && volatilePct > 60) {
        alerts.push({
          id: 'rebalance',
          type: 'warning',
          icon: <Award className="text-warning" size={18} />,
          title: 'Alerta de Rebalanceamento',
          text: `Sua carteira possui ${volatilePct.toFixed(1)}% em ativos voláteis, acima do limite recomendado de 60% para o perfil Moderado.`
        });
      }
    }
    return alerts;
  }, [transactions, investments, profile]);

  return (
    <div className="dashboard-container flex-column gap-lg">
      {/* Welcome & Net Worth Header */}
      <section className="dashboard-intro">
        <div className="intro-text">
          <h1>Olá, Thyago</h1>
          <p>Veja o resumo consolidado do seu patrimônio e fluxo de caixa.</p>
        </div>
        <div className="quick-actions-bar">
          <button className="btn btn-primary" onClick={() => setActiveTab('transactions')}>
            <PlusCircle size={18} />
            <span>Nova Transação</span>
          </button>
          <button className="btn btn-secondary" onClick={() => setActiveTab('reminders')}>
            <Calendar size={18} />
            <span>Lembretes</span>
          </button>
        </div>
      </section>

      {/* Smart Alerts */}
      {smartAlerts.length > 0 && (
        <div className="smart-alerts-container flex-column gap-sm animate-slide-down" style={{ width: '100%' }}>
          {smartAlerts.map(alert => (
            <div key={alert.id} className={`alert-message ${alert.type === 'warning' ? 'warning-alert' : 'info-alert'} flex-center-y`}>
              <div className="mr-sm flex-shrink-0">{alert.icon}</div>
              <div>
                <span className="font-bold text-xs block">{alert.title}</span>
                <span className="text-xxs text-secondary">{alert.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid of Cards */}
      <div className="dashboard-grid">
        <div className="card glass-card">
          <div className="card-header">
            <span className="card-title">Disponível em Contas</span>
            <Wallet className="card-icon text-accent" size={20} />
          </div>
          <div className="card-body">
            <h2 className="amount-primary">{formatCurrency(totalAccounts)}</h2>
            <p className="card-subtext">Total líquido em contas correntes e espécie</p>
          </div>
        </div>

        <div className="card glass-card">
          <div className="card-header">
            <span className="card-title">Patrimônio Investido</span>
            <TrendingUp className="card-icon text-success" size={20} />
          </div>
          <div className="card-body">
            <h2 className="amount-primary">{formatCurrency(totalInvested)}</h2>
            <p className="card-subtext">Fundos, Renda Fixa e Ações</p>
          </div>
        </div>

        <div className="card glass-card">
          <div className="card-header">
            <span className="card-title">Patrimônio Líquido Consolidado</span>
            <div className="card-badge">Foco de IR</div>
          </div>
          <div className="card-body">
            <h2 className="amount-highlight">{formatCurrency(netWorth)}</h2>
            <p className="card-subtext">Bens declaráveis e saldos consolidados</p>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="dashboard-details-grid">
        {/* Despesas por Categoria */}
        <div className="card details-card main-col">
          <div className="card-header flex-between">
            <h3>Gastos por Categoria (Junho)</h3>
            <span className="text-secondary text-sm">Total: {formatCurrency(expenseThisMonth)}</span>
          </div>
          <div className="category-list">
            {expenseCategories.length > 0 ? (
              expenseCategories.map(cat => (
                <div key={cat.name} className="category-item">
                  <div className="category-item-info flex-between">
                    <span className="category-name">{cat.name}</span>
                    <span className="category-amount font-semibold">{formatCurrency(cat.amount)}</span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${cat.percent}%` }}
                    ></div>
                  </div>
                  <span className="category-percent">{cat.percent.toFixed(1)}% do total mensal</span>
                </div>
              ))
            ) : (
              <p className="empty-state">Nenhuma despesa registrada este mês.</p>
            )}
          </div>
        </div>

        {/* Transações Recentes & Alertas */}
        <div className="side-col flex-column gap-lg">
          {/* Lembretes Urgentes */}
          <div className="card details-card mini-card">
            <div className="card-header">
              <h3>Próximos Vencimentos</h3>
            </div>
            <div className="reminder-compact-list">
              {pendingReminders.length > 0 ? (
                pendingReminders.map(rem => (
                  <div key={rem.id} className="reminder-compact-item">
                    <div className="reminder-compact-details">
                      <AlertTriangle className="text-warning flex-shrink-0" size={18} />
                      <div className="reminder-text">
                        <p className="reminder-name">{rem.description}</p>
                        <p className="reminder-date">Vence em: {rem.dueDate.split('-').reverse().join('/')}</p>
                      </div>
                    </div>
                    <span className="reminder-amount font-semibold">{formatCurrency(rem.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="empty-state">Tudo pago! Nenhum boleto pendente.</p>
              )}
            </div>
          </div>

          {/* Transações Recentes */}
          <div className="card details-card mini-card flex-grow">
            <div className="card-header flex-between">
              <h3>Últimos Lançamentos</h3>
              <button className="link-btn text-sm flex-center" onClick={() => setActiveTab('transactions')}>
                Ver todos <ArrowRight size={14} style={{ marginLeft: 4 }} />
              </button>
            </div>
            <div className="recent-tx-list">
              {recentTransactions.map(tx => (
                <div key={tx.id} className="recent-tx-item flex-between">
                  <div className="tx-info">
                    <div className="tx-icon-circle flex-center">
                      {tx.type === 'income' ? (
                        <ArrowUpRight size={16} className="text-success" />
                      ) : (
                        <ArrowDownRight size={16} className="text-danger" />
                      )}
                    </div>
                    <div>
                      <p className="tx-title">{tx.description}</p>
                      <p className="tx-meta">
                        {tx.category} • {tx.date.split('-').reverse().join('/')}
                      </p>
                    </div>
                  </div>
                  <span className={`tx-amount font-semibold ${tx.type === 'income' ? 'text-success' : ''}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
