import React, { useContext, useState, useMemo } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { LineChart, BarChart3, PieChart, Sparkles, TrendingUp, Info } from 'lucide-react';
import { formatBRL } from '../../utils/financeUtils';

const ReportGenerator = () => {
  const { transactions, accounts, investments } = useContext(FinanceContext);
  const [period, setPeriod] = useState('mensal'); // 'mensal', 'trimestral', 'semestral', 'anual'

  const formatPercent = (val) => `${val.toFixed(1)}%`;

  // Calculations for current active data
  const totalAccounts = useMemo(() => accounts.reduce((acc, curr) => acc + curr.balance, 0), [accounts]);
  const totalInvested = useMemo(() => investments.reduce((acc, curr) => acc + curr.value, 0), [investments]);
  const netWorth = totalAccounts + totalInvested;

  // Filter transactions based on selected period
  const periodTx = useMemo(() => {
    const refYear = 2026;
    const refMonthIdx = 5; // June (0-indexed)

    return transactions.filter(t => {
      const txDate = new Date(t.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();

      if (period === 'mensal') {
        return txYear === refYear && txMonth === refMonthIdx;
      } else if (period === 'trimestral') {
        return txYear === refYear && txMonth >= 3 && txMonth <= 5;
      } else if (period === 'semestral') {
        return txYear === refYear && txMonth >= 0 && txMonth <= 5;
      } else {
        return txYear === refYear;
      }
    });
  }, [transactions, period]);

  const { totalIncome, totalExpense, savings, savingsRate } = useMemo(() => {
    const income = periodTx.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = periodTx.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const sv = income - expense;
    const rate = income > 0 ? (sv / income) * 100 : 0;
    return { totalIncome: income, totalExpense: expense, savings: sv, savingsRate: rate };
  }, [periodTx]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const categoryMap = {};
    periodTx.filter(t => t.type === 'expense').forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });

    return Object.keys(categoryMap).map(cat => ({
      name: cat,
      amount: categoryMap[cat],
      percent: totalExpense > 0 ? (categoryMap[cat] / totalExpense) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [periodTx, totalExpense]);

  // SVG Line Chart coordinates for evolution
  const { points, linePath, areaPath } = useMemo(() => {
    const historicalNetWorth = [
      netWorth * 0.82,  // Jan
      netWorth * 0.85,  // Feb
      netWorth * 0.89,  // Mar
      netWorth * 0.93,  // Apr
      netWorth * 0.96,  // May
      netWorth          // Jun (Current)
    ];

    const maxNW = Math.max(...historicalNetWorth) * 1.1;
    const minNW = Math.min(...historicalNetWorth) * 0.9;
    const nwDiff = maxNW - minNW;

    const pts = historicalNetWorth.map((val, idx) => {
      const x = 50 + idx * 90;
      const y = nwDiff === 0 ? 190 : 200 - ((val - minNW) / nwDiff) * 150;
      return { x, y, value: val };
    });

    const lPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const aPath = `${lPath} L ${pts[pts.length - 1].x} 220 L ${pts[0].x} 220 Z`;

    return { points: pts, linePath: lPath, areaPath: aPath };
  }, [netWorth]);


  return (
    <div className="reports-container flex-column gap-lg">
      <div className="section-header flex-between">
        <div>
          <h1>Painel de Inteligência & Relatórios</h1>
          <p>Visualize a evolução do seu patrimônio e a distribuição detalhada do seu fluxo financeiro.</p>
        </div>

        <div className="period-selector flex-center-y">
          {['mensal', 'trimestral', 'semestral', 'anual'].map(p => (
            <button
              key={p}
              className={`btn btn-sm select-btn ${period === p ? 'active' : 'btn-secondary'}`}
              onClick={() => setPeriod(p)}
              style={{ textTransform: 'capitalize' }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="reports-overview-grid">
        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Total Recebido</span>
            <h2 className="val text-success amount-secondary">{formatBRL(totalIncome)}</h2>
          </div>
          <TrendingUp className="text-success" size={24} />
        </div>

        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Total Gasto</span>
            <h2 className="val text-danger amount-secondary">{formatBRL(totalExpense)}</h2>
          </div>
          <BarChart3 className="text-danger" size={24} />
        </div>

        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Taxa de Poupança</span>
            <h2 className={`val amount-secondary ${savingsRate >= 15 ? 'text-success' : 'text-warning'}`}>
              {savingsRate.toFixed(1)}%
            </h2>
          </div>
          <Sparkles className="text-accent animate-pulse" size={24} />
        </div>
      </div>

      {/* Main Analysis Panels */}
      <div className="reports-panels-grid">
        
        {/* Evolution Chart Card */}
        <div className="card details-card main-col flex-column">
          <div className="card-header flex-between">
            <h3>Evolução Patrimonial Consolidada (Semestre Atual)</h3>
            <span className="text-secondary text-sm">Atual: {formatBRL(netWorth)}</span>
          </div>

          <div className="chart-wrapper flex-center mt-md" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: '20px 10px' }}>
            <svg viewBox="0 0 550 240" className="evolution-chart-svg" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="gradient-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0"/>
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[40, 90, 140, 190].map((y, i) => (
                <line key={i} x1="30" y1={y} x2="520" y2={y} stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="3,3" />
              ))}

              {/* Shaded area under the line */}
              <path d={areaPath} fill="url(#gradient-glow)" />

              {/* Line path */}
              <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

              {/* Dots and Tooltips */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="5" fill="#38bdf8" stroke="#0b0f19" strokeWidth="2" />
                  <text 
                    x={p.x} 
                    y={p.y - 12} 
                    textAnchor="middle" 
                    fill="var(--text-secondary)" 
                    fontSize="9px" 
                    fontWeight="600"
                  >
                    {formatBRL(p.value).replace('R$', '').trim().split(',')[0]}k
                  </text>
                </g>
              ))}

              {/* X Axis Labels */}
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'].map((month, idx) => (
                <text 
                  key={idx} 
                  x={50 + idx * 90} 
                  y="225" 
                  textAnchor="middle" 
                  fill="var(--text-secondary)" 
                  fontSize="11px"
                >
                  {month}
                </text>
              ))}
            </svg>
          </div>

          <div className="alert-message info-alert mt-md flex-center-y">
            <Info className="text-accent flex-shrink-0" size={18} style={{ marginRight: 8 }} />
            <span className="text-xs">
              Seu patrimônio cresceu **{((netWorth / historicalNetWorth[0] - 1) * 100).toFixed(1)}%** desde Janeiro. Mantenha os aportes recorrentes para manter a curva ascendente.
            </span>
          </div>
        </div>

        {/* Savings Rate & Category Pizza breakdown */}
        <div className="reports-side-panels flex-column gap-lg side-col">
          
          {/* Savings Rate Analysis */}
          <div className="card details-card flex-column">
            <h3>Saúde Financeira</h3>
            <p className="card-subtext mb-md">Taxa de Poupança ideal recomendada: **20%** de toda receita.</p>
            
            <div className="flex-center flex-column mt-sm">
              <div className="savings-radial-gauge flex-center flex-column" style={{ position: 'relative', width: 120, height: 120 }}>
                {/* SVG circular track and bar */}
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke={savingsRate >= 20 ? 'var(--success-color)' : 'var(--accent-color)'} 
                    strokeWidth="10" 
                    strokeDasharray="314.16" 
                    strokeDashoffset={314.16 - (314.16 * Math.min(Math.max(savingsRate, 0), 100)) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="gauge-text flex-center flex-column" style={{ position: 'absolute' }}>
                  <span className="amount-secondary font-bold text-lg">{savingsRate.toFixed(0)}%</span>
                  <span className="text-xxs text-secondary">Salvo</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-center mt-md">
                {savingsRate >= 20 
                  ? 'Excelente! Sua taxa de poupança está saudável.' 
                  : 'Atenção! Tente reduzir despesas para poupar pelo menos 20%.'}
              </p>
            </div>
          </div>

          {/* Pie/Breakdown List Card */}
          <div className="card details-card">
            <h3>Distribuição de Custos</h3>
            <div className="category-breakdown-list mt-sm flex-column gap-sm">
              {categoryBreakdown.length > 0 ? (
                categoryBreakdown.slice(0, 4).map(cat => (
                  <div key={cat.name} className="breakdown-item flex-between flex-center-y">
                    <div>
                      <p className="breakdown-title text-sm font-semibold">{cat.name}</p>
                      <p className="breakdown-subtitle text-xxs text-secondary">{formatPercent(cat.percent)} do total gasto</p>
                    </div>
                    <span className="breakdown-val font-semibold text-danger">{formatBRL(cat.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="empty-state text-sm text-secondary italic">Nenhuma despesa no período.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
