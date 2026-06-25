import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import DocumentVault from './DocumentVault';
import ImportExport from './ImportExport';

const DataHub = () => {
  const { 
    documents, 
    addDocument, 
    deleteDocument, 
    accounts, 
    transactions, 
    dependents, 
    investments,
    reminders,
    addTransaction 
  } = useContext(FinanceContext);

  const [activeSubTab, setActiveSubTab] = useState('vault'); // 'vault' or 'import'

  return (
    <div className="datahub-container">
      <div className="section-header flex-between">
        <div>
          <h1>Cofre de Documentos & Integração</h1>
          <p>Importe seus extratos e armazene comprovantes fiscais com criptografia ponta a ponta.</p>
        </div>
        
        <div className="subtab-selector flex-center-y">
          <button 
            className={`btn subtab-btn ${activeSubTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('vault')}
          >
            Cofre de Arquivos
          </button>
          <button 
            className={`btn subtab-btn ${activeSubTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('import')}
          >
            Importar & Exportar
          </button>
        </div>
      </div>

      {activeSubTab === 'vault' ? (
        <DocumentVault 
          documents={documents} 
          onAdd={addDocument} 
          onDelete={deleteDocument} 
        />
      ) : (
        <ImportExport 
          accounts={accounts} 
          transactions={transactions} 
          dependents={dependents} 
          investments={investments} 
          reminders={reminders} 
          documents={documents} 
          onAddTransaction={addTransaction} 
        />
      )}
    </div>
  );
};

export default DataHub;
