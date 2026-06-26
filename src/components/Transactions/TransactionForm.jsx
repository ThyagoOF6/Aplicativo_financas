import React, { useState, useContext } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { formatBRL } from '../../utils/financeUtils';
import { RefreshCw } from 'lucide-react';

const DEFAULT_INCOME_CATS  = ['Salário', 'Pró-labore', 'Rendimentos', 'Venda de Ativos', 'Outros'];
const DEFAULT_EXPENSE_CATS = ['Alimentação', 'Transporte', 'Saúde', 'Educação', 'Moradia', 'Lazer', 'Impostos', 'Outros'];

const TransactionForm = ({ accounts, dependents, onAdd, onClose, transactionToEdit, onUpdate, onAddTemplate }) => {
  const { customCategories = { income: [], expense: [] } } = useContext(FinanceContext);

  const [description, setDescription]       = useState(transactionToEdit ? transactionToEdit.description : '');
  const [amount, setAmount]                  = useState(transactionToEdit ? transactionToEdit.amount.toString() : '');
  const [type, setType]                      = useState(transactionToEdit ? transactionToEdit.type : 'expense');
  const [category, setCategory]             = useState(transactionToEdit ? transactionToEdit.category : 'Alimentação');
  const [accountId, setAccountId]           = useState(transactionToEdit ? transactionToEdit.accountId : (accounts[0]?.id || ''));
  const [date, setDate]                     = useState(transactionToEdit ? transactionToEdit.date : new Date().toISOString().split('T')[0]);
  const [dependentId, setDependentId]       = useState(transactionToEdit ? transactionToEdit.dependentId || '' : '');
  const [isTaxDeductible, setIsTaxDeductible] = useState(transactionToEdit ? transactionToEdit.isTaxDeductible : false);
  const [specificPurpose, setSpecificPurpose] = useState(transactionToEdit ? transactionToEdit.specificPurpose || '' : '');

  // Recurring fields (only for new transactions)
  const [isRecurring, setIsRecurring]           = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');

  const getCategoryOptions = () => {
    const defaults = type === 'income' ? DEFAULT_INCOME_CATS : DEFAULT_EXPENSE_CATS;
    const customs  = (customCategories[type] || []).map(c => c.name);
    // Merge and deduplicate
    return [...new Set([...defaults, ...customs])];
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(newType === 'income' ? 'Salário' : 'Alimentação');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount || !accountId) return;

    const txData = {
      description:   description.trim(),
      amount:        parseFloat(amount),
      type,
      category,
      accountId,
      date,
      dependentId,
      isTaxDeductible: type === 'expense' ? isTaxDeductible : false,
      specificPurpose: specificPurpose.trim()
    };

    if (transactionToEdit) {
      onUpdate({ ...txData, id: transactionToEdit.id });
    } else {
      // Create the immediate transaction
      onAdd(txData);

      // Also register as a recurring template if flagged
      if (isRecurring && onAddTemplate) {
        onAddTemplate({
          ...txData,
          startDate: date,
          frequency: recurringFrequency,
        });
      }

      // Reset form
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDependentId('');
      setIsTaxDeductible(false);
      setSpecificPurpose('');
      setIsRecurring(false);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="card form-card animate-slide-down">
      <h3>{transactionToEdit ? 'Editar Transação' : 'Lançar Transação'}</h3>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="tx-type">Tipo</label>
          <select id="tx-type" value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            <option value="expense">Despesa (Saída)</option>
            <option value="income">Receita (Entrada)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tx-desc">Descrição</label>
          <input id="tx-desc" type="text" placeholder="Ex: Supermercado, Salário, etc."
            value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>

        <div className="form-group">
          <label htmlFor="tx-amount">Valor (R$)</label>
          <input id="tx-amount" type="number" step="0.01" placeholder="0.00"
            value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>

        <div className="form-group">
          <label htmlFor="tx-date">Data</label>
          <input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="form-group">
          <label htmlFor="tx-cat">Categoria</label>
          <select id="tx-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            {getCategoryOptions().map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tx-acc">Conta Originária/Destino</label>
          <select id="tx-acc" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
            <option value="" disabled>Selecione uma conta</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {formatBRL(acc.balance)})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tx-dep">Destinado a (Dependente)</label>
          <select id="tx-dep" value={dependentId} onChange={(e) => setDependentId(e.target.value)}>
            <option value="">Nenhum (Gasto Pessoal)</option>
            {dependents.map(dep => (
              <option key={dep.id} value={dep.id}>{dep.name} ({dep.relationship})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tx-purpose">Finalidade Específica</label>
          <input id="tx-purpose" type="text" placeholder="Ex: Saque para pagar conta de luz, etc."
            value={specificPurpose} onChange={(e) => setSpecificPurpose(e.target.value)} />
        </div>

        {type === 'expense' && (
          <div className="form-group checkbox-group flex-center-y">
            <input id="tx-tax" type="checkbox" checked={isTaxDeductible}
              onChange={(e) => setIsTaxDeductible(e.target.checked)} />
            <label htmlFor="tx-tax">Despesa dedutível de Imposto de Renda (Saúde, Educação)</label>
          </div>
        )}

        {/* Recurring toggle (only when creating) */}
        {!transactionToEdit && (
          <div className="form-group recurring-toggle-group">
            <div className="recurring-toggle-header flex-center-y" style={{ gap: 10 }}>
              <button
                type="button"
                id="tx-recurring"
                className={`toggle-btn ${isRecurring ? 'toggle-active' : ''}`}
                onClick={() => setIsRecurring(p => !p)}
              >
                <RefreshCw size={14} />
              </button>
              <label htmlFor="tx-recurring" style={{ cursor: 'pointer', marginBottom: 0 }} onClick={() => setIsRecurring(p => !p)}>
                Transação Recorrente
              </label>
            </div>
            {isRecurring && (
              <div className="recurring-frequency animate-slide-down" style={{ marginTop: 10 }}>
                <label htmlFor="tx-freq" className="text-xs text-secondary">Frequência</label>
                <select id="tx-freq" value={recurringFrequency} onChange={(e) => setRecurringFrequency(e.target.value)}
                  style={{ marginTop: 4, width: '100%' }}>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
                <p className="text-xxs text-secondary" style={{ marginTop: 6 }}>
                  {recurringFrequency === 'monthly'
                    ? 'Uma cópia desta transação será gerada automaticamente todo mês nesta data.'
                    : 'Uma cópia será gerada no mesmo mês e dia, a cada ano.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{transactionToEdit ? 'Salvar Alterações' : 'Adicionar Transação'}</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      </div>
    </form>
  );
};

export default TransactionForm;
