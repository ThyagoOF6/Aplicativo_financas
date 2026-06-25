import React, { useState } from 'react';
import { Trash2, Edit2, Search, FileText } from 'lucide-react';
import { formatBRL } from '../../utils/financeUtils';
import ConfirmDialog from '../layout/ConfirmDialog';
import { useToast } from '../layout/Toast';

const TransactionList = ({ transactions, accounts, dependents, onDelete, onEdit }) => {
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [visibleCount, setVisibleCount] = useState(20);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.specificPurpose && tx.specificPurpose.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' ? true : tx.type === filterType;
    const matchesCategory = filterCategory === 'all' ? true : tx.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const paginatedTransactions = filteredTransactions.slice(0, visibleCount);

  return (
    <div className="flex-column gap-md">
      {/* Filter and Search Bar */}
      <div className="card filters-card flex-between">
        <div className="search-box flex-center-y">
          <Search size={18} className="text-secondary" style={{ marginRight: 8 }} />
          <input 
            type="text" 
            placeholder="Pesquisar transação..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        
        <div className="filters-group">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Todos os tipos</option>
            <option value="income">Apenas Receitas</option>
            <option value="expense">Apenas Despesas</option>
          </select>

          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">Todas as categorias</option>
            <option value="Salário">Salário</option>
            <option value="Alimentação">Alimentação</option>
            <option value="Transporte">Transporte</option>
            <option value="Saúde">Saúde</option>
            <option value="Educação">Educação</option>
            <option value="Moradia">Moradia</option>
            <option value="Lazer">Lazer</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card table-card">
        <div className="table-responsive">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição / Finalidade</th>
                <th>Categoria</th>
                <th>Conta</th>
                <th>Dependente</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map(tx => {
                  const account = accounts.find(a => a.id === tx.accountId);
                  const dependent = dependents.find(d => d.id === tx.dependentId);
                  
                  return (
                    <tr key={tx.id} className={tx.type}>
                      <td>{tx.date.split('-').reverse().join('/')}</td>
                      <td>
                        <div className="tx-desc-cell">
                          <span className="tx-desc-title font-semibold">{tx.description}</span>
                          {tx.specificPurpose && (
                            <span className="tx-desc-purpose text-xs text-secondary italic">
                              Motivo: {tx.specificPurpose}
                            </span>
                          )}
                          {tx.isTaxDeductible && (
                            <span className="tax-deductible-pill text-xs flex-center-y text-success font-semibold">
                              <FileText size={12} style={{ marginRight: 4 }} /> Dedutível IR
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="category-tag text-xs font-semibold">{tx.category}</span>
                      </td>
                      <td>
                        <span className="text-secondary text-sm">{account ? account.name : 'Outra'}</span>
                      </td>
                      <td>
                        <span className="text-secondary text-sm">{dependent ? dependent.name : 'Pessoal'}</span>
                      </td>
                      <td className={`font-semibold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
                      </td>
                      <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className="delete-icon-btn" 
                          onClick={() => onEdit(tx)}
                          title="Editar transação"
                          style={{ color: 'var(--accent-color)' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="delete-icon-btn" 
                          onClick={() => setConfirmDelete(tx)}
                          title="Remover transação"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="empty-table-cell">Nenhuma transação encontrada com os filtros aplicados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTransactions.length > visibleCount && (
        <div className="flex-center mt-sm">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setVisibleCount(prev => prev + 20)}
            style={{ width: '100%', maxWidth: '280px', padding: '10px' }}
          >
            Carregar Mais Lançamentos ({filteredTransactions.length - visibleCount} restantes)
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Excluir Transação"
        message={confirmDelete ? `Deseja excluir "${confirmDelete.description}"? O saldo da conta será recalculado automaticamente.` : ''}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={() => {
          onDelete(confirmDelete.id);
          addToast(`Transação "${confirmDelete.description}" removida com sucesso.`, 'success');
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

export default TransactionList;
