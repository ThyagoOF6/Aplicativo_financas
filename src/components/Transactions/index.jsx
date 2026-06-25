import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Plus } from 'lucide-react';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';

const Transactions = () => {
  const { 
    transactions, 
    accounts, 
    dependents, 
    addTransaction, 
    deleteTransaction 
  } = useContext(FinanceContext);

  const [showForm, setShowForm] = useState(false);

  return (
    <div className="transactions-container">
      <div className="section-header flex-between">
        <div>
          <h1>Fluxo de Caixa</h1>
          <p>Registre e acompanhe todas as suas receitas, despesas e transações vinculadas.</p>
        </div>
        <button className="btn btn-primary flex-center" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} style={{ marginRight: 6 }} />
          {showForm ? 'Fechar Form' : 'Nova Transação'}
        </button>
      </div>

      {showForm && (
        <TransactionForm 
          accounts={accounts} 
          dependents={dependents} 
          onAdd={addTransaction} 
          onClose={() => setShowForm(false)} 
        />
      )}

      <TransactionList 
        transactions={transactions} 
        accounts={accounts} 
        dependents={dependents} 
        onDelete={deleteTransaction} 
      />
    </div>
  );
};

export default Transactions;
