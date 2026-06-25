import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { UserPlus, Users, Trash2 } from 'lucide-react';
import { formatBRL } from '../../utils/financeUtils';

const DependentsManager = () => {
  const { dependents, transactions, addDependent, deleteDependent } = useContext(FinanceContext);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Filho');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;

    addDependent({
      name,
      relationship
    });

    setName('');
    setRelationship('Filho');
    setShowForm(false);
  };

  const getDependentExpenses = (depId) => {
    return transactions
      .filter(t => t.dependentId === depId && t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
  };

  const getDependentTxCount = (depId) => {
    return transactions.filter(t => t.dependentId === depId).length;
  };

  return (
    <div className="family-container">
      <div className="section-header flex-between">
        <div>
          <h1>Gestão Familiar & Dependentes</h1>
          <p>Cadastre membros da família e acompanhe os gastos destinados a cada um deles.</p>
        </div>
        <button className="btn btn-primary flex-center" onClick={() => setShowForm(!showForm)}>
          <UserPlus size={18} style={{ marginRight: 6 }} />
          {showForm ? 'Fechar Form' : 'Adicionar Dependente'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card animate-slide-down">
          <h3>Cadastrar Dependente</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="dep-name">Nome Completo</label>
              <input 
                id="dep-name"
                type="text" 
                placeholder="Ex: Mariana, Léo, etc." 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="dep-rel">Grau de Parentesco</label>
              <select 
                id="dep-rel"
                value={relationship} 
                onChange={(e) => setRelationship(e.target.value)}
              >
                <option value="Cônjuge">Cônjuge</option>
                <option value="Filho">Filho(a)</option>
                <option value="Pai">Pai/Mãe</option>
                <option value="Outro">Outro Dependente</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Cadastrar</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="family-grid">
        {dependents.map(dep => {
          const totalSpent = getDependentExpenses(dep.id);
          const txCount = getDependentTxCount(dep.id);
          const depTransactions = transactions.filter(t => t.dependentId === dep.id).slice(0, 3);

          return (
            <div key={dep.id} className="card family-card">
              <div className="family-card-header flex-between">
                <div className="dependent-identity flex-center-y">
                  <div className="avatar-circle flex-center font-bold">
                    {dep.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="dependent-name">{dep.name}</h3>
                    <span className="relationship-badge text-xs font-semibold">{dep.relationship}</span>
                  </div>
                </div>
                <button 
                  className="delete-icon-btn" 
                  onClick={() => {
                    if (confirm(`Remover o dependente ${dep.name}? As transações associadas perderão o vínculo.`)) {
                      deleteDependent(dep.id);
                    }
                  }}
                  title="Remover Dependente"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="family-card-stats flex-between">
                <div className="stat">
                  <span className="stat-label text-xs text-secondary">Total Consumido</span>
                  <span className="stat-val amount-secondary text-danger">{formatBRL(totalSpent)}</span>
                </div>
                <div className="stat text-right">
                  <span className="stat-label text-xs text-secondary">Lançamentos</span>
                  <span className="stat-val font-semibold">{txCount}</span>
                </div>
              </div>

              <div className="dependent-recent-tx">
                <h4 className="text-sm font-medium text-secondary">Lançamentos Recentes</h4>
                {depTransactions.length > 0 ? (
                  <div className="dep-tx-list">
                    {depTransactions.map(tx => (
                      <div key={tx.id} className="dep-tx-item flex-between text-xs">
                        <span className="tx-desc truncate">{tx.description}</span>
                        <span className="tx-val font-semibold text-danger">{formatBRL(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-substate text-xs text-secondary italic">Nenhuma despesa recente vinculada.</p>
                )}
              </div>
            </div>
          );
        })}

        {dependents.length === 0 && (
          <div className="card empty-state-card flex-center flex-column text-center">
            <Users size={48} className="text-secondary" style={{ marginBottom: 16 }} />
            <h3>Nenhum dependente cadastrado</h3>
            <p className="text-secondary">Adicione dependentes para segmentar as despesas familiares de forma inteligente.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DependentsManager;
