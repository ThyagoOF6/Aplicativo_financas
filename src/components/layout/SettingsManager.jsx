import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Settings, Shield, Target, Sun, Moon } from 'lucide-react';
import { useToast } from './Toast';
import { formatBRL } from '../../utils/financeUtils';

const SettingsManager = () => {
  const { budgets = [], updateBudget, settings, updateSettings } = useContext(FinanceContext);
  const { addToast } = useToast();

  const [autoLock, setAutoLock] = useState(settings?.autoLockMinutes || 5);
  const [theme, setTheme] = useState(settings?.theme || 'dark');

  // Categories defined in TransactionForm.jsx
  const expenseCategories = [
    'Alimentação',
    'Transporte',
    'Saúde',
    'Educação',
    'Moradia',
    'Lazer',
    'Impostos',
    'Outros'
  ];

  // Temporary local state for unsaved budgets to avoid lag while typing
  const [localBudgets, setLocalBudgets] = useState(() => {
    const map = {};
    expenseCategories.forEach(cat => {
      const b = budgets.find(x => x.category === cat);
      map[cat] = b ? b.limit.toString() : '';
    });
    return map;
  });

  const handleBudgetChange = (cat, val) => {
    setLocalBudgets(prev => ({
      ...prev,
      [cat]: val
    }));
  };

  const saveBudget = (cat) => {
    const val = localBudgets[cat];
    if (val === '') {
      updateBudget(cat, 0);
      addToast(`Limite de ${cat} removido.`, 'info');
    } else {
      const parsedVal = parseFloat(val);
      if (isNaN(parsedVal) || parsedVal < 0) {
        addToast('Por favor, insira um valor válido.', 'error');
        return;
      }
      updateBudget(cat, parsedVal);
      addToast(`Limite de ${cat} atualizado para ${formatBRL(parsedVal)}`, 'success');
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateSettings({
      autoLockMinutes: parseInt(autoLock, 10),
      theme
    });
    addToast('Configurações globais salvas com sucesso!', 'success');
  };

  return (
    <div className="settings-container flex-column gap-lg animate-fade-in">
      <div className="section-header">
        <h1>Configurações do Sistema</h1>
        <p>Ajuste suas preferências de segurança, limites de orçamento e tema visual.</p>
      </div>

      <div className="settings-grid">
        {/* Left Card: General Preferences */}
        <div className="card glass-card flex-column gap-md">
          <div className="card-header flex-center-y" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Settings className="text-accent mr-sm" size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Preferências Gerais</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="flex-column gap-md">
            {/* Auto Lock timer */}
            <div className="form-group">
              <label className="flex-center-y gap-xs" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Shield size={16} className="text-secondary" />
                <span>Bloqueio Automático (Inatividade)</span>
              </label>
              <select 
                value={autoLock} 
                onChange={(e) => setAutoLock(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="1">1 Minuto</option>
                <option value="2">2 Minutos</option>
                <option value="5">5 Minutos (Padrão)</option>
                <option value="10">10 Minutos</option>
                <option value="15">15 Minutos</option>
                <option value="30">30 Minutos</option>
              </select>
              <span className="text-xxs text-secondary mt-xs block">
                Tempo decorrido sem cliques ou teclas antes do Wealth Manager cifrar os dados da RAM.
              </span>
            </div>

            {/* Theme switcher */}
            <div className="form-group">
              <label className="flex-center-y gap-xs" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {theme === 'dark' ? <Moon size={16} className="text-accent" /> : <Sun size={16} className="text-warning" />}
                <span>Tema da Interface</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn flex-center gap-xs ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTheme('dark')}
                  style={{ flex: 1, padding: '10px' }}
                >
                  <Moon size={16} style={{ marginRight: 6 }} />
                  Escuro (Glass)
                </button>
                <button
                  type="button"
                  className={`btn flex-center gap-xs ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTheme('light')}
                  style={{ flex: 1, padding: '10px' }}
                >
                  <Sun size={16} style={{ marginRight: 6 }} />
                  Claro
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-sm" style={{ width: '100%', padding: '12px' }}>
              Salvar Preferências
            </button>
          </form>
        </div>

        {/* Right Card: Budget Limits */}
        <div className="card glass-card flex-column gap-md">
          <div className="card-header flex-center-y" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Target className="text-success mr-sm" size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Limites de Orçamento Mensal</h3>
          </div>
          <p className="text-secondary text-xs" style={{ margin: 0 }}>
            Estipule limites para categorias de despesas para acompanhar seu progresso no dashboard em tempo real.
          </p>

          <div className="budget-limits-list flex-column gap-sm" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
            {expenseCategories.map(cat => (
              <div key={cat} className="flex-between flex-center-y" style={{ gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span className="font-semibold text-sm" style={{ flex: 1 }}>{cat}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>R$</span>
                    <input
                      type="number"
                      placeholder="Sem limite"
                      value={localBudgets[cat]}
                      onChange={(e) => handleBudgetChange(cat, e.target.value)}
                      style={{
                        width: '120px',
                        padding: '6px 6px 6px 30px',
                        fontSize: '0.85rem',
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => saveBudget(cat)}
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
