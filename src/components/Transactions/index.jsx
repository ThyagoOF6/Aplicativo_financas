import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Plus } from 'lucide-react';
import { useToast } from '../layout/Toast';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

const Transactions = () => {
  const { 
    transactions, 
    accounts, 
    dependents, 
    addTransaction, 
    deleteTransaction,
    updateTransaction
  } = useContext(FinanceContext);
  const { addToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const handleAddTransaction = (tx) => {
    addTransaction(tx);
    addToast(`${tx.type === 'income' ? 'Receita' : 'Despesa'} "${tx.description}" registrada com sucesso!`, 'success');
  };

  const handleUpdateTransaction = (tx) => {
    updateTransaction(tx);
    addToast(`${tx.type === 'income' ? 'Receita' : 'Despesa'} "${tx.description}" atualizada com sucesso!`, 'success');
    setEditingTransaction(null);
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
          if (showForm) {
            handleFormClose();
          } else {
            setShowForm(true);
          }
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
          transactionToEdit={editingTransaction}
          onClose={handleFormClose} 
        />
      )}

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
