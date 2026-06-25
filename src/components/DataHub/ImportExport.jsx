import React, { useState, useContext } from 'react';
import { UploadCloud, Download, CheckCircle2, AlertCircle, FileSpreadsheet, FileCode, Check, X, Shield } from 'lucide-react';
import { parseOFX, parseCSV } from '../../utils/parser';
import { formatBRL } from '../../utils/financeUtils';
import { FinanceContext } from '../../context/FinanceContext';
import { encryptData, decryptData } from '../../utils/cryptoUtils';

const ImportExport = () => {
  const { 
    accounts, 
    transactions, 
    dependents, 
    investments, 
    reminders, 
    documents, 
    budgets,
    settings,
    investmentGoal,
    profile,
    sessionKey,
    addTransaction,
    restoreFullBackup
  } = useContext(FinanceContext);

  const [importedTxCount, setImportedTxCount] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewTransactions, setPreviewTransactions] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');
  const [backupErrorMsg, setBackupErrorMsg] = useState('');

  const handleExportData = async (encrypted = true) => {
    try {
      const fullBackup = {
        accounts,
        transactions,
        dependents,
        investments,
        reminders,
        documents,
        budgets,
        settings,
        investmentGoal,
        profile,
        exportedAt: new Date().toISOString()
      };

      let downloadData;
      let filename;

      if (encrypted) {
        if (!sessionKey) {
          setBackupErrorMsg("Sessão travada. Desbloqueie a carteira para gerar backup criptografado.");
          return;
        }
        const ciphertext = await encryptData(JSON.stringify(fullBackup), sessionKey);
        downloadData = {
          encrypted: true,
          payload: ciphertext
        };
        filename = `WealthManager_EncryptedBackup_${new Date().toISOString().substring(0, 10)}.json`;
      } else {
        downloadData = {
          encrypted: false,
          ...fullBackup
        };
        filename = `WealthManager_UnencryptedBackup_${new Date().toISOString().substring(0, 10)}.json`;
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(downloadData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setBackupSuccessMsg(`Backup ${encrypted ? 'criptografado' : 'aberto'} exportado com sucesso!`);
      setTimeout(() => setBackupSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setBackupErrorMsg("Falha ao exportar backup.");
      setTimeout(() => setBackupErrorMsg(''), 4000);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');
    setPreviewTransactions([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let parsed = [];
        
        if (file.name.toLowerCase().endsWith('.ofx')) {
          parsed = parseOFX(text);
        } else if (file.name.toLowerCase().endsWith('.csv')) {
          parsed = parseCSV(text);
        } else {
          setErrorMsg('Formato de arquivo não suportado. Use apenas .OFX ou .CSV.');
          return;
        }

        if (parsed.length === 0) {
          setErrorMsg('Nenhuma transação encontrada no arquivo carregado.');
        } else {
          setPreviewTransactions(parsed);
        }
      } catch (err) {
        console.error("Error parsing file:", err);
        setErrorMsg('Erro interno ao ler arquivo. Verifique o formato.');
      }
    };

    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!selectedAccountId) {
      setErrorMsg('Selecione uma conta para vincular os lançamentos.');
      return;
    }

    // Add all previewed transactions to context
    previewTransactions.forEach(tx => {
      addTransaction({
        ...tx,
        accountId: selectedAccountId
      });
    });

    setImportedTxCount(previewTransactions.length);
    setPreviewTransactions([]);
    setFileName('');
    setTimeout(() => setImportedTxCount(null), 4000);
  };

  const cancelImport = () => {
    setPreviewTransactions([]);
    setFileName('');
  };

  return (
    <div className="import-export-grid animate-fade-in">
      
      {/* OFX / CSV Import Card */}
      <div className="card details-card" style={{ gridColumn: previewTransactions.length > 0 ? 'span 2' : 'span 1' }}>
        <h3>Importação Automática de Extrato (OFX/CSV)</h3>
        <p className="card-subtext mb-lg">Carregue o extrato bancário emitido pelo seu banco para mapear receitas e despesas automaticamente.</p>
        
        {previewTransactions.length === 0 ? (
          <div className="drag-drop-area flex-column flex-center text-center">
            <UploadCloud size={48} className="text-accent mb-md" />
            <p className="font-semibold text-sm">Arraste seu arquivo OFX/CSV aqui</p>
            <p className="text-xxs text-secondary mb-md">ou clique no botão abaixo para escolher do computador</p>
            
            <label className="btn btn-secondary btn-sm custom-file-upload">
              <input type="file" accept=".ofx,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
              Selecionar Arquivo
            </label>
            
            {errorMsg && (
              <div className="alert-message error-alert mt-md flex-center-y text-xs animate-scale-up">
                <AlertCircle size={16} className="text-danger flex-shrink-0" style={{ marginRight: 8 }} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        ) : (
          /* Preview State */
          <div className="import-preview-wrapper flex-column gap-md animate-fade-in">
            <div className="alert-message info-alert flex-between flex-center-y">
              <div className="flex-center-y">
                {fileName.endsWith('.ofx') ? <FileCode className="text-accent mr-sm" size={18} /> : <FileSpreadsheet className="text-success mr-sm" size={18} />}
                <span className="text-xs font-semibold">Visualizando: {fileName} ({previewTransactions.length} transações)</span>
              </div>
              
              <div className="flex-center-y gap-sm">
                <span className="text-xs font-semibold text-secondary">Vincular Lançamentos à Conta:</span>
                <select 
                  value={selectedAccountId} 
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 6, background: '#1e293b', border: '1px solid var(--border-color)', color: 'white' }}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8 }}>
              <table className="transactions-table text-xs">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria Sugerida</th>
                    <th>Dedutível IR</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {previewTransactions.map((tx, idx) => (
                    <tr key={idx} className={tx.type}>
                      <td>{tx.date.split('-').reverse().join('/')}</td>
                      <td className="font-semibold">{tx.description}</td>
                      <td>
                        <span className="category-tag text-xxs font-semibold">{tx.category}</span>
                      </td>
                      <td className={tx.isTaxDeductible ? 'text-success' : 'text-secondary'}>
                        {tx.isTaxDeductible ? 'Sim' : 'Não'}
                      </td>
                      <td className={`font-semibold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex-center gap-md mt-md">
              <button className="btn btn-primary flex-center" onClick={confirmImport} style={{ flex: 1 }}>
                <Check size={18} style={{ marginRight: 6 }} /> Confirmar Importação ({previewTransactions.length})
              </button>
              <button className="btn btn-secondary flex-center" onClick={cancelImport} style={{ flex: 0.3 }}>
                <X size={18} style={{ marginRight: 6 }} /> Cancelar
              </button>
            </div>
          </div>
        )}

        {importedTxCount !== null && (
          <div className="alert-message success-alert mt-md flex-center-y animate-scale-up">
            <CheckCircle2 className="text-success" size={18} style={{ marginRight: 8 }} />
            <span className="text-xs">Importação concluída! {importedTxCount} lançamentos inseridos e vinculados com sucesso.</span>
          </div>
        )}
      </div>

      {/* Export / Backup Card */}
      {previewTransactions.length === 0 && (
        <>
        <div className="card details-card flex-column flex-between">
          <div>
            <h3>Exportar Dados e Backup</h3>
            <p className="card-subtext mb-lg">Salve uma cópia física e completa de todos os seus lançamentos, dependentes, contas, metas e orçamentos.</p>
          </div>
          
          <div className="export-actions-box text-center flex-column gap-md">
            <button className="btn btn-primary flex-center" onClick={() => handleExportData(true)} style={{ width: '100%' }}>
              <Shield size={18} style={{ marginRight: 8 }} />
              Exportar Criptografado (Recomendado)
            </button>
            <button className="btn btn-secondary flex-center" onClick={() => handleExportData(false)} style={{ width: '100%' }}>
              <Download size={18} style={{ marginRight: 8 }} />
              Exportar Texto Aberto (JSON)
            </button>
            <p className="text-xxs text-secondary">
              O backup criptografado protege seus dados financeiros com criptografia AES-GCM baseada na sua chave de sessão atual.
            </p>
          </div>
        </div>

        <div className="card details-card flex-column flex-between">
          <div>
            <h3>Restaurar Backup Local</h3>
            <p className="card-subtext mb-lg">Carregue um arquivo de backup JSON previamente salvo para restaurar integralmente o estado do seu painel.</p>
          </div>

          <div className="restore-actions-box flex-column gap-md" style={{ width: '100%' }}>
            <label className="btn btn-secondary btn-sm custom-file-upload flex-center" style={{ width: '100%', padding: '12px', cursor: 'pointer' }}>
              <UploadCloud size={18} style={{ marginRight: 8 }} />
              <span>Carregar Backup (.JSON)</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (evt) => {
                    try {
                      const text = evt.target.result;
                      const backup = JSON.parse(text);
                      
                      if (backup.encrypted) {
                        if (!sessionKey) {
                          setBackupErrorMsg("Desbloqueie a carteira para descriptografar o backup.");
                          return;
                        }
                        const decrypted = await decryptData(backup.payload, sessionKey);
                        const parsed = JSON.parse(decrypted);
                        restoreFullBackup(parsed);
                        setBackupSuccessMsg("Backup criptografado restaurado com sucesso!");
                      } else {
                        restoreFullBackup(backup);
                        setBackupSuccessMsg("Backup aberto restaurado com sucesso!");
                      }
                      setBackupErrorMsg('');
                      setTimeout(() => setBackupSuccessMsg(''), 4000);
                    } catch (err) {
                      console.error(err);
                      setBackupErrorMsg("Erro ao restaurar backup. Verifique a senha ou o arquivo.");
                      setBackupSuccessMsg('');
                      setTimeout(() => setBackupErrorMsg(''), 4000);
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }} 
                style={{ display: 'none' }} 
              />
            </label>

            {backupSuccessMsg && (
              <div className="alert-message success-alert flex-center-y animate-scale-up" style={{ marginTop: '10px' }}>
                <CheckCircle2 className="text-success" size={16} style={{ marginRight: 8 }} />
                <span className="text-xs">{backupSuccessMsg}</span>
              </div>
            )}

            {backupErrorMsg && (
              <div className="alert-message error-alert flex-center-y animate-scale-up" style={{ marginTop: '10px' }}>
                <AlertCircle className="text-danger" size={16} style={{ marginRight: 8 }} />
                <span className="text-xs">{backupErrorMsg}</span>
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default ImportExport;
