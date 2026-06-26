import React, { useContext, useMemo } from 'react';
import { FinanceContext } from '../context/FinanceContext';
import { formatBRL, calculateFinancialHealthScore } from '../utils/financeUtils';
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
  Award,
  Activity
} from 'lucide-react';

// --- Financial Health Gauge (SVG semicircle) ---
const HealthGauge = ({ score, color, label }) => {
  const r = 72;
  const cx = 100, cy = 100;
  const startAngle = Math.PI; // 180° — left
  const endAngle = 0;          // 0°  — right
  const scoreAngle = Math.PI * (1 - score / 100);

  const toXY = (angle) => ({
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  });

  const start = toXY(startAngle); // (28, 100)
  const end   = toXY(endAngle);   // (172, 100)
  const tip   = toXY(scoreAngle);
  const largeArc = score > 50 ? 1 : 0;

  return (
    <svg viewBox="0 0 200 115" style={{ width: '100%', maxWidth: 220 }}>
      {/* Background track */}
      <path
        d={`M ${start.x},${start.y} A ${r},${r} 0 0,1 ${end.x},${end.y}`}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round"
      />
      {/* Filled arc */}
      {score > 0 && (
        <path
          d={`M ${start.x},${start.y} A ${r},${r} 0 ${largeArc},1 ${tip.x.toFixed(2)},${tip.y.toFixed(2)}`}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      )}
      {/* Score text */}
      <text x="100" y="90" textAnchor="middle" fontSize="28" fontWeight="700" fill={color}>
        {score}
      </text>
      <text x="100" y="108" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.55)">
        {label}
      </text>
    </svg>
  );
};

// --- Wealth History Line Chart (SVG) ---
const WealthChart = ({ history }) => {
  if (!history || history.length < 2) {
    return (
      <p className="empty-state" style={{ fontSize: '0.8rem' }}>
        Histórico disponível após 2+ meses de uso. Desbloqueie o app todo mês para acumular dados.
      </p>
    );
  }

  const W = 460, H = 90, PAD = 12;
  const values = history.map(d => d.netWorth);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range  = maxVal - minVal || 1;
  const xStep  = (W - PAD * 2) / (history.length - 1);

  const points = history.map((d, i) => ({
    x: PAD + i * xStep,
    y: H - PAD - ((d.netWorth - minVal) / range) * (H - PAD * 2),
    ...d,
  }));

  const linePath   = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath   = `${linePath} L ${points[points.length-1].x},${H} L ${points[0].x},${H} Z`;
  const lastPoint  = points[points.length - 1];
  const isPositive = history.length < 2 || history[history.length-1].netWorth >= history[0].netWorth;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
      <defs>
        <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#wealthGrad)" />
      <path d={linePath} fill="none" stroke={isPositive ? '#10b981' : '#ef4444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill={isPositive ? '#10b981' : '#ef4444'} />
      {/* Month labels — show first and last */}
      {[points[0], lastPoint].map((p, i) => (
        <text key={i} x={p.x} y={H} textAnchor={i === 0 ? 'start' : 'end'} fontSize="9" fill="rgba(255,255,255,0.4)">
          {p.month?.slice(5) + '/' + p.month?.slice(0,4)}
        </text>
      ))}
    </svg>
  );
};

const Dashboard = ({ setActiveTab }) => {
  const { 
    accounts, 
    investments, 
    transactions, 
    reminders,
    profile,
    username,
    budgets = [],
    wealthHistory = [],
  } = useContext(FinanceContext);

  // Calculations
  const totalAccounts = useMemo(() => accounts.reduce((acc, curr) => acc + curr.balance, 0), [accounts]);
  const totalInvested = useMemo(() => investments.reduce((acc, curr) => acc + curr.value, 0), [investments]);
  const netWorth = totalAccounts + totalInvested;

  // Monthly flow — referenceMonthStr memoized (Fix #8)
  const { referenceMonthStr, currentMonthLabel } = useMemo(() => ({
    referenceMonthStr: new Date().toISOString().substring(0, 7),
    currentMonthLabel: new Date().toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase()),
  }), []);

  const { monthlyTransactions, incomeThisMonth, expenseThisMonth } = useMemo(() => {
    const mTx = transactions.filter(t => t.date.startsWith(referenceMonthStr));
    const income = mTx.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = mTx.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    return { monthlyTransactions: mTx, incomeThisMonth: income, expenseThisMonth: expense };
  }, [transactions, referenceMonthStr]);

  // Financial Health Score (Feature A)
  const healthData = useMemo(
    () => calculateFinancialHealthScore(accounts, transactions, investments, reminders),
    [accounts, transactions, investments, reminders]
  );

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

  // Pending reminders
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
          id: 'rebalance', type: 'warning',
          icon: <Award className="text-warning" size={18} />,
          title: 'Alerta de Rebalanceamento',
          text: `Sua carteira possui ${volatilePct.toFixed(1)}% em ativos de alto risco (Ações/Cripto), excedendo o limite de 30% para o perfil Conservador.`
        });
      } else if (profile === 'Moderado' && volatilePct > 60) {
        alerts.push({
          id: 'rebalance', type: 'warning',
          icon: <Award className="text-warning" size={18} />,
          title: 'Alerta de Rebalanceamento',
          text: `Sua carteira possui ${volatilePct.toFixed(1)}% em ativos voláteis, acima de 60% para o perfil Moderado.`
        });
      }
    }

    if (Array.isArray(budgets) && budgets.length > 0) {
      budgets.forEach(b => {
        if (b.limit > 0) {
          const catExpense = monthlyTransactions
            .filter(t => t.type === 'expense' && t.category === b.category)
            .reduce((sum, t) => sum + t.amount, 0);
          if (catExpense >= b.limit) {
            alerts.push({
              id: `budget-exceeded-${b.category}`, type: 'warning',
              icon: <AlertTriangle className="text-danger" size={18} />,
              title: `Orçamento Estourado: ${b.category}`,
              text: `Você gastou ${formatBRL(catExpense)} do limite de ${formatBRL(b.limit)} em ${b.category}.`
            });
          } else if (catExpense >= b.limit * 0.8) {
            alerts.push({
              id: `budget-warning-${b.category}`, type: 'warning',
              icon: <AlertTriangle className="text-warning" size={18} />,
              title: `Limite Próximo: ${b.category}`,
              text: `Você consumiu ${(catExpense / b.limit * 100).toFixed(0)}% (${formatBRL(catExpense)}) do orçamento de ${formatBRL(b.limit)} em ${b.category}.`
            });
          }
        }
      });
    }
    return alerts;
  }, [transactions, investments, profile, budgets, monthlyTransactions]);

  return (
    <div className="dashboard-container flex-column gap-lg">
      {/* Welcome & Net Worth Header */}
      <section className="dashboard-intro">
        <div className="intro-text">
          <h1>Olá, {username || 'Investidor'}</h1>
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
            <h2 className="amount-primary">{formatBRL(totalAccounts)}</h2>
            <p className="card-subtext">Total líquido em contas correntes e espécie</p>
          </div>
        </div>

        <div className="card glass-card">
          <div className="card-header">
            <span className="card-title">Patrimônio Investido</span>
            <TrendingUp className="card-icon text-success" size={20} />
          </div>
          <div className="card-body">
            <h2 className="amount-primary">{formatBRL(totalInvested)}</h2>
            <p className="card-subtext">Fundos, Renda Fixa e Ações</p>
          </div>
        </div>

        <div className="card glass-card">
          <div className="card-header">
            <span className="card-title">Patrimônio Líquido Consolidado</span>
            <div className="card-badge">Foco de IR</div>
          </div>
          <div className="card-body">
            <h2 className="amount-highlight">{formatBRL(netWorth)}</h2>
            <p className="card-subtext">Bens declaráveis e saldos consolidados</p>
          </div>
        </div>
      </div>

      {/* Health Score + Wealth History Row */}
      <div className="dashboard-health-row">
        {/* Financial Health Score — Feature A */}
        <div className="card glass-card health-score-card">
          <div className="card-header flex-between">
            <h3 className="flex-center-y" style={{ gap: 8 }}>
              <Activity size={18} className="text-accent" /> Saúde Financeira
            </h3>
            <span className="text-xxs text-secondary">Score 0–100</span>
          </div>
          <div className="health-gauge-wrapper">
            <HealthGauge score={healthData.score} color={healthData.color} label={healthData.label} />
          </div>
          <div className="health-pillars-grid">
            {Object.values(healthData.pillars).map(pillar => (
              <div key={pillar.label} className="health-pillar-item">
                <div className="health-pillar-bar-track">
                  <div
                    className="health-pillar-bar-fill"
                    style={{ width: `${(pillar.score / pillar.max) * 100}%`, backgroundColor: healthData.color }}
                  />
                </div>
                <span className="health-pillar-label">{pillar.label}</span>
                <span className="health-pillar-detail">{pillar.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wealth History Chart — Feature B */}
        <div className="card glass-card wealth-history-card">
          <div className="card-header flex-between">
            <h3 className="flex-center-y" style={{ gap: 8 }}>
              <TrendingUp size={18} className="text-success" /> Evolução do Patrimônio
            </h3>
            <span className="text-xxs text-secondary">{wealthHistory.length} snapshot(s)</span>
          </div>
          {wealthHistory.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span className="amount-primary" style={{ fontSize: '1.4rem' }}>{formatBRL(netWorth)}</span>
              {wealthHistory.length >= 2 && (() => {
                const diff = wealthHistory[wealthHistory.length-1].netWorth - wealthHistory[0].netWorth;
                const isPos = diff >= 0;
                return (
                  <span className={`text-xs ml-sm font-semibold ${isPos ? 'text-success' : 'text-danger'}`}>
                    {isPos ? '+' : ''}{formatBRL(diff)} desde {wealthHistory[0].month.slice(5)}/{wealthHistory[0].month.slice(0,4)}
                  </span>
                );
              })()}
            </div>
          )}
          <WealthChart history={wealthHistory} />
        </div>
      </div>

      {/* Main content grid */}
      <div className="dashboard-details-grid">
        {/* Despesas por Categoria */}
        <div className="card details-card main-col">
          <div className="card-header flex-between">
            <h3>Gastos por Categoria ({currentMonthLabel})</h3>
            <span className="text-secondary text-sm">Total: {formatBRL(expenseThisMonth)}</span>
          </div>
          <div className="category-list">
            {expenseCategories.length > 0 ? (
              expenseCategories.map(cat => {
                const catBudget = budgets?.find(b => b.category === cat.name);
                const limit = catBudget ? catBudget.limit : 0;
                const hasLimit = limit > 0;
                const percentOfBudget = hasLimit ? (cat.amount / limit) * 100 : 0;
                
                let barColor = '';
                if (hasLimit) {
                  if (percentOfBudget >= 100) barColor = 'bg-danger';
                  else if (percentOfBudget >= 80) barColor = 'bg-warning';
                  else barColor = 'bg-success';
                }

                return (
                  <div key={cat.name} className="category-item">
                    <div className="category-item-info flex-between">
                      <span className="category-name">
                        {cat.name} 
                        {hasLimit && (
                          <span className="text-xxs text-secondary" style={{ marginLeft: 8 }}>
                            (Meta: {formatBRL(limit)})
                          </span>
                        )}
                      </span>
                      <span className="category-amount font-semibold">{formatBRL(cat.amount)}</span>
                    </div>
                    <div className="progress-bar-container">
                      <div 
                        className={`progress-bar-fill ${barColor}`} 
                        style={{ width: `${hasLimit ? Math.min(100, percentOfBudget) : cat.percent}%` }}
                      ></div>
                    </div>
                    <span className="category-percent">
                      {hasLimit 
                        ? `${percentOfBudget.toFixed(0)}% do orçamento consumido` 
                        : `${cat.percent.toFixed(1)}% do total mensal`
                      }
                    </span>
                  </div>
                );
              })
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
                    <span className="reminder-amount font-semibold">{formatBRL(rem.amount)}</span>
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
                    {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
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
