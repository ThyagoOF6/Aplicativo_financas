import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Settings, Shield, Target, Sun, Moon, Tag, Trash2, Plus } from 'lucide-react';
import { useToast } from './Toast';
import { formatBRL } from '../../utils/financeUtils';

const DEFAULT_INCOME_CATS  = ['Salário', 'Pró-labore', 'Rendimentos', 'Venda de Ativos', 'Outros'];
const DEFAULT_EXPENSE_CATS = ['Alimentação', 'Transporte', 'Saúde', 'Educação', 'Moradia', 'Lazer', 'Impostos', 'Outros'];

const SettingsManager = () => {
  const { 
    budgets = [], updateBudget, 
    settings, updateSettings,
    customCategories = { income: [], expense: [] },
    addCustomCategory, deleteCustomCategory,
  } = useContext(FinanceContext);
  const { addToast } = useToast();

  const [autoLock, setAutoLock] = useState(settings?.autoLockMinutes || 5);
  const [theme, setTheme] = useState(settings?.theme || 'dark');

  // New category form state
  const [newCatType, setNewCatType] = useState('expense');
  const [newCatName, setNewCatName] = useState('');

  const expenseCategories = [
    ...DEFAULT_EXPENSE_CATS,
    ...(customCategories.expense || []).map(c => c.name)
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
    setLocalBudgets(prev => ({ ...prev, [cat]: val }));
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
    updateSettings({ autoLockMinutes: parseInt(autoLock, 10), theme });
    addToast('Configurações globais salvas com sucesso!', 'success');
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    const allDefaults = newCatType === 'income' ? DEFAULT_INCOME_CATS : DEFAULT_EXPENSE_CATS;
    const existing = [...allDefaults, ...(customCategories[newCatType] || []).map(c => c.name)];
    if (existing.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      addToast('Essa categoria já existe.', 'error');
      return;
    }

    addCustomCategory(newCatType, trimmed);
    addToast(`Categoria "${trimmed}" adicionada!`, 'success');
    setNewCatName('');
  };

  const handleDeleteCategory = (type, id, name) => {
    deleteCustomCategory(type, id);
    addToast(`Categoria "${name}" removida.`, 'info');
  };

  return (
    <div className="settings-container flex-column gap-lg animate-fade-in">
      <div className="section-header">
        <h1>Configurações do Sistema</h1>
        <p>Ajuste suas preferências de segurança, limites de orçamento, categorias e tema visual.</p>
      </div>

      <div className="settings-grid">
        {/* Left Card: General Preferences */}
        <div className="card glass-card flex-column gap-md">
          <div className="card-header flex-center-y" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Settings className="text-accent mr-sm" size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Preferências Gerais</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="flex-column gap-md">
            <div className="form-group">
              <label className="flex-center-y gap-xs" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Shield size={16} className="text-secondary" />
                <span>Bloqueio Automático (Inatividade)</span>
              </label>
              <select value={autoLock} onChange={(e) => setAutoLock(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
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

            <div className="form-group">
              <label className="flex-center-y gap-xs" style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {theme === 'dark' ? <Moon size={16} className="text-accent" /> : <Sun size={16} className="text-warning" />}
                <span>Tema da Interface</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className={`btn flex-center gap-xs ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTheme('dark')} style={{ flex: 1, padding: '10px' }}>
                  <Moon size={16} style={{ marginRight: 6 }} />Escuro (Glass)
                </button>
                <button type="button" className={`btn flex-center gap-xs ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setTheme('light')} style={{ flex: 1, padding: '10px' }}>
                  <Sun size={16} style={{ marginRight: 6 }} />Claro
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
                      value={localBudgets[cat] || ''}
                      onChange={(e) => handleBudgetChange(cat, e.target.value)}
                      style={{ width: '120px', padding: '6px 6px 6px 30px', fontSize: '0.85rem', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => saveBudget(cat)}
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    Salvar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature E — Custom Categories */}
      <div className="card glass-card flex-column gap-md">
        <div className="card-header flex-center-y" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <Tag className="text-accent mr-sm" size={20} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Categorias Personalizadas</h3>
        </div>
        <p className="text-secondary text-xs" style={{ margin: 0 }}>
          Adicione categorias extras que aparecerão no formulário de transações, mescladas com as categorias padrão.
        </p>

        {/* Add form */}
        <form onSubmit={handleAddCategory} className="custom-cat-form flex-center-y" style={{ gap: 10, flexWrap: 'wrap' }}>
          <select value={newCatType} onChange={(e) => setNewCatType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
          <input
            type="text"
            placeholder="Nome da nova categoria..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            style={{ flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn btn-primary flex-center" style={{ gap: 6, padding: '8px 16px' }}>
            <Plus size={16} /> Adicionar
          </button>
        </form>

        {/* Lists */}
        <div className="custom-cats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {['expense', 'income'].map(catType => (
            <div key={catType}>
              <h4 className="text-sm font-semibold text-secondary" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {catType === 'expense' ? '📤 Despesa' : '📥 Receita'}
              </h4>
              {(customCategories[catType] || []).length === 0 ? (
                <p className="text-xxs text-secondary">Nenhuma categoria personalizada.</p>
              ) : (
                (customCategories[catType] || []).map(cat => (
                  <div key={cat.id} className="custom-cat-item flex-between flex-center-y"
                    style={{ padding: '6px 10px', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 6 }}>
                    <span className="text-sm">{cat.name}</span>
                    <button className="btn btn-ghost icon-btn"
                      onClick={() => handleDeleteCategory(catType, cat.id, cat.name)}
                      title="Remover categoria" style={{ padding: '4px' }}>
                      <Trash2 size={14} className="text-danger" />
                    </button>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
