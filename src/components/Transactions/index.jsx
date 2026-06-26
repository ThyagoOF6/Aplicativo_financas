import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Plus, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../layout/Toast';
import { formatBRL } from '../../utils/financeUtils';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

const FREQUENCY_LABELS = { monthly: 'Mensal', yearly: 'Anual' };

const Transactions = () => {
  const { 
    transactions, 
    accounts, 
    dependents, 
    addTransaction, 
    deleteTransaction,
    updateTransaction,
    recurringTemplates = [],
    addRecurringTemplate,
    deleteRecurringTemplate,
  } = useContext(FinanceContext);
  const { addToast } = useToast();

  const [showForm, setShowForm]                       = useState(false);
  const [editingTransaction, setEditingTransaction]   = useState(null);
  const [showRecurring, setShowRecurring]             = useState(false);

  const handleAddTransaction = (tx) => {
    addTransaction(tx);
    addToast(`${tx.type === 'income' ? 'Receita' : 'Despesa'} "${tx.description}" registrada com sucesso!`, 'success');
  };

  const handleUpdateTransaction = (tx) => {
    updateTransaction(tx);
    addToast(`${tx.type === 'income' ? 'Receita' : 'Despesa'} "${tx.description}" atualizada com sucesso!`, 'success');
    setEditingTransaction(null);
  };

  const handleAddTemplate = (template) => {
    addRecurringTemplate(template);
    addToast(`Recorrência "${template.description}" (${FREQUENCY_LABELS[template.frequency]}) criada!`, 'success');
  };

  const handleDeleteTemplate = (id, description) => {
    deleteRecurringTemplate(id);
    addToast(`Recorrência "${description}" removida.`, 'info');
  };

  const handleEditClick = (tx) => {
    setEditingTransaction(tx);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  return (
    <div className="transactions-container">
      <div className="section-header flex-between">
        <div>
          <h1>Fluxo de Caixa</h1>
          <p>Registre e acompanhe todas as suas receitas, despesas e transações vinculadas.</p>
        </div>
        <button className="btn btn-primary flex-center" onClick={() => {
          if (showForm) handleFormClose(); else setShowForm(true);
        }}>
          <Plus size={18} style={{ marginRight: 6 }} />
          {showForm ? 'Fechar Form' : 'Nova Transação'}
        </button>
      </div>

      {showForm && (
        <TransactionForm 
          accounts={accounts} 
          dependents={dependents} 
          onAdd={handleAddTransaction} 
          onUpdate={handleUpdateTransaction}
          onAddTemplate={handleAddTemplate}
          transactionToEdit={editingTransaction}
          onClose={handleFormClose} 
        />
      )}

      {/* Recurring Templates Section — Feature C */}
      <div className="recurring-section card glass-card">
        <button
          className="recurring-section-header flex-between flex-center-y"
          onClick={() => setShowRecurring(p => !p)}
          style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', padding: '4px 0' }}
        >
          <div className="flex-center-y" style={{ gap: 10 }}>
            <RefreshCw size={18} className="text-accent" />
            <h3 style={{ margin: 0, fontSize: '1rem' }}>
              Recorrências Ativas
              <span className="badge-count" style={{ marginLeft: 8 }}>{recurringTemplates.length}</span>
            </h3>
          </div>
          {showRecurring ? <ChevronUp size={18} className="text-secondary" /> : <ChevronDown size={18} className="text-secondary" />}
        </button>

        {showRecurring && (
          <div className="recurring-list animate-slide-down" style={{ marginTop: 16 }}>
            {recurringTemplates.length === 0 ? (
              <p className="empty-state" style={{ margin: 0 }}>
                Nenhuma recorrência cadastrada. Marque "Transação Recorrente" ao lançar uma nova transação.
              </p>
            ) : (
              recurringTemplates.map(t => {
                const acc = accounts.find(a => a.id === t.accountId);
                return (
                  <div key={t.id} className="recurring-item flex-between flex-center-y">
                    <div className="recurring-item-info">
                      <span className="recurring-item-desc">{t.description}</span>
                      <span className="recurring-item-meta text-secondary text-xs">
                        {t.category} • {acc?.name || 'Conta removida'} • {FREQUENCY_LABELS[t.frequency]}
                        {t.lastGenerated && ` • Última geração: ${t.lastGenerated}`}
                      </span>
                    </div>
                    <div className="recurring-item-right flex-center-y" style={{ gap: 12 }}>
                      <span className={`recurring-item-amount font-semibold ${t.type === 'income' ? 'text-success' : 'text-danger'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatBRL(t.amount)}
                      </span>
                      <button
                        className="btn btn-ghost icon-btn"
                        onClick={() => handleDeleteTemplate(t.id, t.description)}
                        title="Excluir recorrência"
                      >
                        <Trash2 size={15} className="text-danger" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <TransactionList 
        transactions={transactions} 
        accounts={accounts} 
        dependents={dependents} 
        onDelete={deleteTransaction} 
        onEdit={handleEditClick}
      />
    </div>
  );
};

export default Transactions;
