import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Plus } from 'lucide-react';
import AccountCard from './AccountCard';
import { sanitizeHTML } from '../../utils/xss';

const AccountManager = () => {
  const { accounts, addAccount, deleteAccount } = useContext(FinanceContext);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Banco');
  const [balance, setBalance] = useState('');
  const [includeInTax, setIncludeInTax] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !balance) return;

    addAccount({
      name: sanitizeHTML(name),
      type,
      balance: parseFloat(balance),
      includeInTax
    });

    // Reset form
    setName('');
    setType('Banco');
    setBalance('');
    setIncludeInTax(true);
    setShowForm(false);
  };

  return (
    <div className="accounts-container">
      <div className="section-header flex-between">
        <div>
          <h1>Contas & Carteiras</h1>
          <p>Gerencie seus saldos bancários, corretoras e dinheiro físico.</p>
        </div>
        <button className="btn btn-primary flex-center" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} style={{ marginRight: 6 }} />
          {showForm ? 'Fechar Form' : 'Nova Conta'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card animate-slide-down">
          <h3>Cadastrar Nova Conta</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="acc-name">Nome da Instituição/Carteira</label>
              <input 
                id="acc-name"
                type="text" 
                placeholder="Ex: Nubank, Dinheiro Físico" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="acc-type">Tipo de Conta</label>
              <select 
                id="acc-type"
                value={type} 
                onChange={(e) => setType(e.target.value)}
              >
                <option value="Banco">Banco (Conta Corrente)</option>
                <option value="Corretora">Corretora (Investimentos)</option>
                <option value="Carteira Física">Carteira Física (Dinheiro Vivo)</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="acc-balance">Saldo Inicial</label>
              <input 
                id="acc-balance"
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={balance} 
                onChange={(e) => setBalance(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group checkbox-group flex-center-y">
              <input 
                id="acc-tax"
                type="checkbox" 
                checked={includeInTax} 
                onChange={(e) => setIncludeInTax(e.target.checked)} 
              />
              <label htmlFor="acc-tax">Declarar no Imposto de Renda (Bens e Direitos)</label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Salvar Conta</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="accounts-list-grid">
        {accounts.map(acc => (
          <AccountCard key={acc.id} acc={acc} onDelete={deleteAccount} />
        ))}
      </div>
    </div>
  );
};

export default AccountManager;
