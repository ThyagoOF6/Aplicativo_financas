import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Plus } from 'lucide-react';
import AccountCard from './AccountCard';
import { useToast } from '../layout/Toast';
import ConfirmDialog from '../layout/ConfirmDialog';

const AccountManager = () => {
  const { accounts, addAccount, deleteAccount, updateAccount } = useContext(FinanceContext);
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('Banco');
  const [balance, setBalance] = useState('');
  const [includeInTax, setIncludeInTax] = useState(true);

  const handleEditClick = (acc) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setBalance(acc.balance.toString());
    setIncludeInTax(acc.includeInTax);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAccount(null);
    setName('');
    setType('Banco');
    setBalance('');
    setIncludeInTax(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !balance) return;

    const accData = {
      name,
      type,
      balance: parseFloat(balance),
      includeInTax
    };

    if (editingAccount) {
      updateAccount({ ...accData, id: editingAccount.id });
      addToast(`Conta "${name}" atualizada com sucesso!`, 'success');
    } else {
      addAccount(accData);
      addToast(`Conta "${name}" cadastrada com sucesso!`, 'success');
    }

    handleFormClose();
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteAccount) {
      deleteAccount(confirmDeleteAccount.id);
      addToast(`Conta "${confirmDeleteAccount.name}" excluída com sucesso!`, 'success');
      setConfirmDeleteAccount(null);
    }
  };

  return (
    <div className="accounts-container">
      <div className="section-header flex-between">
        <div>
          <h1>Contas & Carteiras</h1>
          <p>Gerencie seus saldos bancários, corretoras e dinheiro físico.</p>
        </div>
        <button className="btn btn-primary flex-center" onClick={() => {
          if (showForm) {
            handleFormClose();
          } else {
            setShowForm(true);
          }
        }}>
          <Plus size={18} style={{ marginRight: 6 }} />
          {showForm ? 'Fechar Form' : 'Nova Conta'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card animate-slide-down">
          <h3>{editingAccount ? 'Editar Conta' : 'Cadastrar Nova Conta'}</h3>
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
            <button type="submit" className="btn btn-primary">{editingAccount ? 'Salvar Alterações' : 'Salvar Conta'}</button>
            <button type="button" className="btn btn-ghost" onClick={handleFormClose}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="accounts-list-grid">
        {accounts.map(acc => (
          <AccountCard 
            key={acc.id} 
            acc={acc} 
            onDeleteRequest={setConfirmDeleteAccount} 
            onEdit={handleEditClick} 
          />
        ))}
      </div>

      <ConfirmDialog 
        isOpen={!!confirmDeleteAccount}
        title="Excluir Conta"
        message={`Tem certeza que deseja excluir a conta "${confirmDeleteAccount?.name}"? Esta ação removerá a conta permanentemente.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteAccount(null)}
        variant="danger"
      />
    </div>
  );
};

export default AccountManager;
