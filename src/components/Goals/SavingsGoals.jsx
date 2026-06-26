import React, { useContext, useState, useMemo } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { formatBRL } from '../../utils/financeUtils';
import { 
  Target, Plus, Trash2, Edit2, Calendar, AlertTriangle, 
  CheckCircle, Sparkles, TrendingUp, Coins, HelpCircle, ArrowRight
} from 'lucide-react';

const SavingsGoals = () => {
  const { 
    savingsGoals, 
    addSavingsGoal, 
    updateSavingsGoal, 
    deleteSavingsGoal,
    transactions,
    reminders,
    accounts
  } = useContext(FinanceContext);

  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState('');

  // Quick contribution state
  const [quickAmount, setQuickAmount] = useState({});

  // Financial calculations for average income and expenses
  const financialSummary = useMemo(() => {
    const monthsSeen = new Set();
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      monthsSeen.add(month);
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpense += t.amount;
      }
    });

    const numMonths = Math.max(1, monthsSeen.size);
    const avgIncome = totalIncome / numMonths;
    const avgExpense = totalExpense / numMonths;
    
    const pendingBills = reminders
      .filter(r => !r.paid)
      .reduce((sum, r) => sum + r.amount, 0);

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const disposableIncome = Math.max(0, avgIncome - avgExpense);

    return {
      avgIncome,
      avgExpense,
      pendingBills,
      totalBalance,
      disposableIncome
    };
  }, [transactions, reminders, accounts]);

  // Open form for adding
  const handleNewGoal = () => {
    setEditingGoal(null);
    setTitle('');
    setTarget('');
    setCurrent('0');
    setDeadline('');
    setShowForm(true);
  };

  // Open form for editing
  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTarget(goal.target);
    setCurrent(goal.current);
    setDeadline(goal.deadline);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !target || !deadline) return;

    const goalData = {
      title: title.trim(),
      target: parseFloat(target),
      current: parseFloat(current || 0),
      deadline
    };

    if (editingGoal) {
      updateSavingsGoal({ ...goalData, id: editingGoal.id });
    } else {
      addSavingsGoal(goalData);
    }

    setShowForm(false);
    setTitle('');
    setTarget('');
    setCurrent('');
    setDeadline('');
    setEditingGoal(null);
  };

  // Quick contribution handler
  const handleQuickContribution = (goalId, isAddition = true) => {
    const amt = parseFloat(quickAmount[goalId]);
    if (isNaN(amt) || amt <= 0) return;

    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;

    let newCurrent = goal.current + (isAddition ? amt : -amt);
    newCurrent = Math.max(0, Math.min(goal.target, newCurrent));

    updateSavingsGoal({
      ...goal,
      current: newCurrent
    });

    setQuickAmount(prev => ({ ...prev, [goalId]: '' }));
  };

  // Detailed analysis of each goal
  const analyzedGoals = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);

    return savingsGoals.map(goal => {
      const targetVal = parseFloat(goal.target);
      const currentVal = parseFloat(goal.current || 0);
      const remainingVal = Math.max(0, targetVal - currentVal);
      
      const deadlineDate = new Date(goal.deadline);
      deadlineDate.setHours(0,0,0,0);
      
      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const monthsRemaining = diffDays > 0 ? (diffDays / 30.44) : 0;
      
      let monthlyNeeded = 0;
      if (remainingVal > 0) {
        monthlyNeeded = monthsRemaining > 0 ? (remainingVal / monthsRemaining) : remainingVal;
      }
      const weeklyNeeded = monthlyNeeded / 4.33;

      // Calculate progress percentage
      const progressPercent = targetVal > 0 ? Math.min(100, (currentVal / targetVal) * 100) : 0;

      // Determine viability status
      let viability = 'viable'; // viable, tight, unviable, completed
      let viabilityLabel = 'Viável';
      let viabilityColor = 'var(--success-color)';
      let viabilityBg = 'var(--success-bg)';

      if (remainingVal === 0) {
        viability = 'completed';
        viabilityLabel = 'Meta Alcançada!';
      } else if (financialSummary.disposableIncome <= 0) {
        viability = 'unviable';
        viabilityLabel = 'Inviável';
        viabilityColor = 'var(--danger-color)';
        viabilityBg = 'var(--danger-bg)';
      } else {
        const percentageOfDisposable = (monthlyNeeded / financialSummary.disposableIncome) * 100;
        if (percentageOfDisposable > 100) {
          viability = 'unviable';
          viabilityLabel = 'Inviável';
          viabilityColor = 'var(--danger-color)';
          viabilityBg = 'var(--danger-bg)';
        } else if (percentageOfDisposable > 70) {
          viability = 'tight';
          viabilityLabel = 'Apertado';
          viabilityColor = 'var(--warning-color)';
          viabilityBg = 'var(--warning-bg)';
        }
      }

      // Generate dynamic smart recommendations
      const recommendations = [];
      if (viability !== 'completed' && remainingVal > 0) {
        // Suggest extension
        const extendedMonths = Math.max(1, Math.round(monthsRemaining * 1.5));
        const extendedDate = new Date();
        extendedDate.setMonth(extendedDate.getMonth() + extendedMonths);
        const extendedDateStr = extendedDate.toLocaleDateString('pt-BR');
        const extendedMonthly = remainingVal / extendedMonths;
        const savingsPct = monthlyNeeded > 0 ? ((monthlyNeeded - extendedMonthly) / monthlyNeeded) * 100 : 0;

        if (viability === 'unviable' || viability === 'tight') {
          recommendations.push(
            `Estender o prazo para daqui a ${extendedMonths} meses (${extendedDateStr}) reduziria a parcela mensal para ${formatBRL(extendedMonthly)} (uma economia de ${savingsPct.toFixed(0)}%).`
          );
          
          if (financialSummary.pendingBills > 0) {
            recommendations.push(
              `Você tem ${formatBRL(financialSummary.pendingBills)} em contas a vencer. Liquidar esses boletos pendentes liberará mais margem mensal.`
            );
          }

          // Check if there are high categories of spending
          const categoriesMap = {};
          transactions.filter(t => t.type === 'expense').forEach(t => {
            categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount;
          });
          const sortedCategories = Object.keys(categoriesMap)
            .map(c => ({ name: c, amount: categoriesMap[c] }))
            .sort((a,b) => b.amount - a.amount);
          
          if (sortedCategories.length > 0) {
            const topCat = sortedCategories[0];
            recommendations.push(
              `Reduzir gastos na categoria '${topCat.name}' (onde você gastou ${formatBRL(topCat.amount)} no total) pode ajudar a atingir seu objetivo.`
            );
          }
        }
      }

      return {
        ...goal,
        monthsRemaining,
        diffDays,
        monthlyNeeded,
        weeklyNeeded,
        progressPercent,
        viability,
        viabilityLabel,
        viabilityColor,
        viabilityBg,
        recommendations,
        remainingVal
      };
    });
  }, [savingsGoals, financialSummary, transactions]);

  return (
    <div className="reminders-container flex-column gap-lg">
      <div className="section-header flex-between">
        <div>
          <h1>Metas de Poupança & Planejamento</h1>
          <p>Defina seus objetivos de economia e analise se eles cabem no seu orçamento com base no seu fluxo de caixa.</p>
        </div>
        <button className="btn btn-primary flex-center" onClick={handleNewGoal}>
          <Plus size={18} style={{ marginRight: 6 }} />
          Nova Meta
        </button>
      </div>

      {/* Financial Health Summary */}
      <div className="reminders-stats-grid">
        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Renda Média Mensal</span>
            <h2 className="val text-success amount-secondary">
              {formatBRL(financialSummary.avgIncome)}
            </h2>
          </div>
          <TrendingUp className="text-success" size={24} />
        </div>

        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Saldo Livre Estimado</span>
            <h2 className="val text-accent amount-secondary">
              {formatBRL(financialSummary.disposableIncome)}
            </h2>
          </div>
          <Coins className="text-accent" size={24} />
        </div>

        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Total Guardado em Metas</span>
            <h2 className="val text-warning amount-secondary">
              {formatBRL(savingsGoals.reduce((sum, g) => sum + g.current, 0))}
            </h2>
          </div>
          <Target className="text-warning animate-pulse" size={24} />
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card animate-slide-down">
          <h3>{editingGoal ? 'Editar Meta Financeira' : 'Criar Nova Meta Financeira'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="goal-title">Nome do Objetivo</label>
              <input 
                id="goal-title"
                type="text" 
                placeholder="Ex: Viagem para o Japão, Entrada do Carro, etc." 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="goal-target">Quanto quer juntar? (R$)</label>
              <input 
                id="goal-target"
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={target} 
                onChange={(e) => setTarget(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label htmlFor="goal-current">Valor que já possui guardado (R$)</label>
              <input 
                id="goal-current"
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={current} 
                onChange={(e) => setCurrent(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label htmlFor="goal-deadline">Data Limite (Prazo)</label>
              <input 
                id="goal-deadline"
                type="date" 
                value={deadline} 
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDeadline(e.target.value)} 
                required 
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{editingGoal ? 'Salvar Alterações' : 'Salvar Objetivo'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Goals Display Grid */}
      <div className="goals-display-list flex-column gap-md">
        {analyzedGoals.length > 0 ? (
          analyzedGoals.map(goal => (
            <div key={goal.id} className="card details-card flex-column gap-md animate-fade-in" style={{ borderLeft: `5px solid ${goal.viabilityColor}` }}>
              
              {/* Header Info */}
              <div className="flex-between flex-center-y">
                <div className="flex-center-y gap-sm">
                  <div className="tx-icon-circle flex-center" style={{ background: goal.viabilityBg, color: goal.viabilityColor }}>
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="text-md font-bold">{goal.title}</h3>
                    <p className="text-secondary text-xxs flex-center-y gap-xxs" style={{ marginTop: 2 }}>
                      <Calendar size={12} />
                      Prazo: {goal.deadline.split('-').reverse().join('/')} 
                      {goal.diffDays > 0 ? ` (Faltam ${goal.monthsRemaining.toFixed(1)} meses)` : ' (Vencida)'}
                    </p>
                  </div>
                </div>

                <div className="flex-center-y gap-sm">
                  <span className="status-pill text-xxs font-semibold" style={{ background: goal.viabilityBg, color: goal.viabilityColor }}>
                    {goal.viabilityLabel}
                  </span>
                  <button className="btn btn-icon-sm btn-secondary" onClick={() => handleEditGoal(goal)} title="Editar Meta">
                    <Edit2 size={14} />
                  </button>
                  <button className="delete-icon-btn" onClick={() => { if(confirm(`Deseja excluir a meta "${goal.title}"?`)) deleteSavingsGoal(goal.id); }} title="Excluir Meta">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Progress and values */}
              <div className="goal-progress-section">
                <div className="flex-between text-xs font-semibold mb-xs">
                  <span>Progresso: {goal.progressPercent.toFixed(1)}%</span>
                  <span className="text-accent">{formatBRL(goal.current)} de {formatBRL(goal.target)}</span>
                </div>
                <div className="progress-bar-container" style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5 }}>
                  <div 
                    className="progress-bar-fill bg-accent" 
                    style={{ 
                      width: `${goal.progressPercent}%`, 
                      height: '100%', 
                      borderRadius: 5,
                      background: `linear-gradient(90deg, var(--accent-color) 0%, ${goal.viabilityColor} 100%)`,
                      boxShadow: `0 0 10px ${goal.viabilityColor}44`
                    }}
                  ></div>
                </div>
                {goal.remainingVal > 0 ? (
                  <p className="text-xxs text-secondary mt-xs">Falta economizar: {formatBRL(goal.remainingVal)}</p>
                ) : (
                  <p className="text-xxs text-success font-semibold mt-xs flex-center-y gap-xxs">
                    <CheckCircle size={12} /> Objetivo alcançado com sucesso! Parabéns!
                  </p>
                )}
              </div>

              {/* Calculations Block */}
              {goal.remainingVal > 0 && (
                <div className="goal-rates-grid" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: 16,
                  padding: 12,
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div>
                    <span className="text-xxs text-secondary block uppercase tracking-wider font-semibold">Economizar por mês</span>
                    <span className="text-md font-bold text-primary" style={{ color: goal.viabilityColor }}>{formatBRL(goal.monthlyNeeded)}</span>
                  </div>
                  <div>
                    <span className="text-xxs text-secondary block uppercase tracking-wider font-semibold">Economizar por semana</span>
                    <span className="text-md font-semibold text-primary">{formatBRL(goal.weeklyNeeded)}</span>
                  </div>
                  <div>
                    <span className="text-xxs text-secondary block uppercase tracking-wider font-semibold">Margem no Saldo Livre</span>
                    <span className="text-xs font-medium block mt-xs">
                      {financialSummary.disposableIncome > 0 
                        ? `${((goal.monthlyNeeded / financialSummary.disposableIncome) * 100).toFixed(0)}% do saldo livre`
                        : 'Sem saldo livre estimado'
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Contribution quick form */}
              {goal.remainingVal > 0 && (
                <div className="flex-between flex-center-y flex-wrap gap-sm p-sm" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--border-radius-sm)' }}>
                  <span className="text-xxs text-secondary font-medium">Aporte rápido para esta meta:</span>
                  <div className="flex-center-y gap-sm">
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      value={quickAmount[goal.id] || ''} 
                      onChange={(e) => setQuickAmount(prev => ({ ...prev, [goal.id]: e.target.value }))}
                      style={{ width: 100, height: 32, fontSize: '12px', padding: '0 8px' }}
                    />
                    <button className="btn btn-secondary btn-icon-sm" onClick={() => handleQuickContribution(goal.id, true)} style={{ height: 32, padding: '0 12px', fontSize: '11px' }}>
                      Adicionar
                    </button>
                  </div>
                </div>
              )}

              {/* Smart Recommendations Section */}
              {goal.recommendations.length > 0 && (
                <div className="smart-advice-box flex-column gap-xs" style={{ 
                  background: 'rgba(56, 189, 248, 0.03)',
                  border: '1px dashed rgba(56, 189, 248, 0.2)',
                  padding: 12,
                  borderRadius: 'var(--border-radius-sm)'
                }}>
                  <span className="text-xxs font-bold text-accent flex-center-y gap-xxs uppercase tracking-wider">
                    <Sparkles size={14} /> Dicas Inteligentes de Economia
                  </span>
                  <ul className="flex-column gap-xxs" style={{ listStyleType: 'none', paddingLeft: 0, margin: 0 }}>
                    {goal.recommendations.map((rec, i) => (
                      <li key={i} className="text-xxs text-secondary flex-start-x gap-xs" style={{ lineHeight: 1.4 }}>
                        <span className="text-accent">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          ))
        ) : (
          <div className="card glass-card flex-center flex-column p-xl" style={{ height: '30vh', gap: 16 }}>
            <Target className="text-secondary opacity-30" size={48} />
            <p className="text-secondary text-sm">Nenhuma meta cadastrada ainda. Crie sua primeira meta financeira para começar!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavingsGoals;
