import React, { useState } from 'react';
import { formatBRL } from '../../utils/financeUtils';
import { sanitizeHTML } from '../../utils/xss';

const TransactionForm = ({ accounts, dependents, onAdd, onClose }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Alimentação');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dependentId, setDependentId] = useState('');
  const [isTaxDeductible, setIsTaxDeductible] = useState(false);
  const [specificPurpose, setSpecificPurpose] = useState('');

  const getCategoryOptions = () => {
    if (type === 'income') {
      return ['Salário', 'Pró-labore', 'Rendimentos', 'Venda de Ativos', 'Outros'];
    }
    return ['Alimentação', 'Transporte', 'Saúde', 'Educação', 'Moradia', 'Lazer', 'Impostos', 'Outros'];
  };

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'income') {
      setCategory('Salário');
    } else {
      setCategory('Alimentação');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount || !accountId) return;

    onAdd({
      description: sanitizeHTML(description),
      amount: parseFloat(amount),
      type,
      category,
      accountId,
      date,
      dependentId,
      isTaxDeductible: type === 'expense' ? isTaxDeductible : false,
      specificPurpose: sanitizeHTML(specificPurpose)
    });

    // Reset Form
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setDependentId('');
    setIsTaxDeductible(false);
    setSpecificPurpose('');
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="card form-card animate-slide-down">
      <h3>Lançar Transação</h3>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="tx-type">Tipo</label>
          <select 
            id="tx-type"
            value={type} 
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            <option value="expense">Despesa (Saída)</option>
            <option value="income">Receita (Entrada)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tx-desc">Descrição</label>
          <input 
            id="tx-desc"
            type="text" 
            placeholder="Ex: Supermercado, Salário, etc." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="tx-amount">Valor (R$)</label>
          <input 
            id="tx-amount"
            type="number" 
            step="0.01" 
            placeholder="0.00" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="tx-date">Data</label>
          <input 
            id="tx-date"
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="tx-cat">Categoria</label>
          <select 
            id="tx-cat"
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
          >
            {getCategoryOptions().map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tx-acc">Conta Originária/Destino</label>
          <select 
            id="tx-acc"
            value={accountId} 
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            <option value="" disabled>Selecione uma conta</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} (Saldo: {formatBRL(acc.balance)})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tx-dep">Destinado a (Dependente)</label>
          <select 
            id="tx-dep"
            value={dependentId} 
            onChange={(e) => setDependentId(e.target.value)}
          >
            <option value="">Nenhum (Gasto Pessoal)</option>
            {dependents.map(dep => (
              <option key={dep.id} value={dep.id}>{dep.name} ({dep.relationship})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tx-purpose">Finalidade Específica</label>
          <input 
            id="tx-purpose"
            type="text" 
            placeholder="Ex: Saque para pagar conta de luz, etc." 
            value={specificPurpose} 
            onChange={(e) => setSpecificPurpose(e.target.value)} 
          />
        </div>

        {type === 'expense' && (
          <div className="form-group checkbox-group flex-center-y">
            <input 
              id="tx-tax"
              type="checkbox" 
              checked={isTaxDeductible} 
              onChange={(e) => setIsTaxDeductible(e.target.checked)} 
            />
            <label htmlFor="tx-tax">Despesa dedutível de Imposto de Renda (Saúde, Educação)</label>
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Adicionar Transação</button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
      </div>
    </form>
  );
};

export default TransactionForm;
