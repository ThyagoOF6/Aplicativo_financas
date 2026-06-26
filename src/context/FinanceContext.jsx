import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getRawStorageItem, setRawStorageItem } from '../utils/storage';
import { 
  encryptData, 
  decryptData, 
  initializeSecurity, 
  validatePassword,
  deriveAuthKey,
  hashAuthKey 
} from '../utils/cryptoUtils';
import { saveEncryptedFile } from '../utils/indexedDbUtils';

export const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(() => {
    return !!getRawStorageItem('wealth_mgr_security_salt');
  });
  const [isLocked, setIsLocked] = useState(true);
  const [sessionKey, setSessionKey] = useState(null); // CryptoKey held in memory only

  // Cloud Sync States (JWT token held in memory only)
  const [username, setUsername] = useState(() => getRawStorageItem('wealth_mgr_username') || '');
  const [jwtToken, setJwtToken] = useState(null);
  const [syncStatus, setSyncStatus] = useState('local_only');

  // Data states (empty/default until unlocked)
  const [accounts, setAccounts] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [profile, setProfile] = useState('');
  const [investmentGoal, setInvestmentGoal] = useState({ target: 0, current: 0, label: 'Reserva de Emergência' });
  const [budgets, setBudgets] = useState([]);
  const [settings, setSettings] = useState({ autoLockMinutes: 5, theme: 'dark' });
  const [savingsGoals, setSavingsGoals] = useState([]);

  // Sync to raw storage (only when unlocked and key exists)
  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(accounts), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_accounts', enc);
      });
    }
  }, [accounts, isLocked, sessionKey]);

  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(dependents), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_dependents', enc);
      });
    }
  }, [dependents, isLocked, sessionKey]);

  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(transactions), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_transactions', enc);
      });
    }
  }, [transactions, isLocked, sessionKey]);

  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(reminders), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_reminders', enc);
      });
    }
  }, [reminders, isLocked, sessionKey]);

  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(investments), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_investments', enc);
      });
    }
  }, [investments, isLocked, sessionKey]);

  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(documents), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_documents', enc);
      });
    }
  }, [documents, isLocked, sessionKey]);

  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(profile), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_profile', enc);
      });
    }
  }, [profile, isLocked, sessionKey]);

  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(investmentGoal), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_investment_goal', enc);
      });
    }
  }, [investmentGoal, isLocked, sessionKey]);

  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(budgets), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_budgets', enc);
      });
    }
  }, [budgets, isLocked, sessionKey]);

  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(settings), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_settings', enc);
      });
    }
  }, [settings, isLocked, sessionKey]);

  useEffect(() => {
    if (!isLocked && sessionKey) {
      encryptData(JSON.stringify(savingsGoals), sessionKey).then(enc => {
        setRawStorageItem('wealth_mgr_savings_goals', enc);
      });
    }
  }, [savingsGoals, isLocked, sessionKey]);

  // Document migration from metadata to IndexedDB
  const migrateDocsFromMetadata = async (parsedDocs, cryptoKey) => {
    if (!Array.isArray(parsedDocs)) return parsedDocs;
    let migrated = false;
    for (let doc of parsedDocs) {
      if (doc.encryptedData) {
        try {
          await saveEncryptedFile(doc.id, doc.encryptedData);
          delete doc.encryptedData;
          migrated = true;
        } catch (e) {
          console.error("Failed to migrate document to IndexedDB:", e);
        }
      }
    }
    if (migrated) {
      const cleanEnc = await encryptData(JSON.stringify(parsedDocs), cryptoKey);
      setRawStorageItem('wealth_mgr_documents', cleanEnc);
    }
    return parsedDocs;
  };

  // Cloud sync helper function
  const syncWithCloud = useCallback(async (key = sessionKey, token = jwtToken, forceData = null) => {
    if (!token || !key) return;
    
    setSyncStatus('syncing');
    try {
      const dataToEncrypt = forceData || {
        accounts,
        dependents,
        transactions,
        reminders,
        investments,
        documents,
        profile,
        investmentGoal,
        budgets,
        settings,
        savingsGoals
      };
      
      const ciphertext = await encryptData(JSON.stringify(dataToEncrypt), key);
      
      const res = await fetch('http://localhost:5000/api/vault/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data_blob: ciphertext })
      });
      
      if (res.ok) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error("Cloud sync error:", err);
      setSyncStatus('error');
    }
  }, [accounts, dependents, transactions, reminders, investments, documents, profile, investmentGoal, savingsGoals, sessionKey, jwtToken]);

  // Debounced auto sync triggers when local state changes
  useEffect(() => {
    if (!isLocked && sessionKey && jwtToken) {
      const timeout = setTimeout(() => {
        syncWithCloud();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [accounts, dependents, transactions, reminders, investments, documents, profile, investmentGoal, budgets, settings, savingsGoals, isLocked, sessionKey, jwtToken, syncWithCloud]);

  // Decrypts and loads all local database states
  const decryptAndLoadState = async (cryptoKey) => {
    const keys = [
      { storageKey: 'wealth_mgr_accounts', setter: setAccounts, def: [] },
      { storageKey: 'wealth_mgr_dependents', setter: setDependents, def: [] },
      { storageKey: 'wealth_mgr_transactions', setter: setTransactions, def: [] },
      { storageKey: 'wealth_mgr_reminders', setter: setReminders, def: [] },
      { storageKey: 'wealth_mgr_investments', setter: setInvestments, def: [] },
      { storageKey: 'wealth_mgr_documents', setter: async (data) => {
        const cleaned = await migrateDocsFromMetadata(data, cryptoKey);
        setDocuments(cleaned);
      }, def: [] },
      { storageKey: 'wealth_mgr_profile', setter: setProfile, def: '' },
      { storageKey: 'wealth_mgr_investment_goal', setter: setInvestmentGoal, def: { target: 0, current: 0, label: 'Reserva de Emergência' } },
      { storageKey: 'wealth_mgr_budgets', setter: setBudgets, def: [] },
      { storageKey: 'wealth_mgr_settings', setter: setSettings, def: { autoLockMinutes: 5, theme: 'dark' } },
      { storageKey: 'wealth_mgr_savings_goals', setter: setSavingsGoals, def: [] }
    ];

    for (const key of keys) {
      const encrypted = getRawStorageItem(key.storageKey);
      if (encrypted) {
        try {
          const plain = await decryptData(encrypted, cryptoKey);
          const parsed = JSON.parse(plain);
          if (key.storageKey === 'wealth_mgr_documents') {
            await key.setter(parsed);
          } else {
            key.setter(parsed);
          }
        } catch (error) {
          console.error(`Failed to decrypt state for ${key.storageKey}:`, error);
          key.setter(key.def);
        }
      } else {
        key.setter(key.def);
      }
    }
  };

  // Security Operations
  const setupMasterPassword = useCallback(async (password) => {
    try {
      const { saltBase64, verificationJson, cryptoKey } = await initializeSecurity(password);
      setRawStorageItem('wealth_mgr_security_salt', saltBase64);
      setRawStorageItem('wealth_mgr_security_verify', verificationJson);
      
      setSessionKey(cryptoKey);
      setIsInitialized(true);
      setIsLocked(false);
      
      setUsername('');
      setJwtToken(null);
      setSyncStatus('local_only');
      
      // Initialize fresh arrays/values to trigger initial encrypted saves
      setAccounts([]);
      setDependents([]);
      setTransactions([]);
      setReminders([]);
      setInvestments([]);
      setDocuments([]);
      setProfile('');
      setInvestmentGoal({ target: 0, current: 0, label: 'Reserva de Emergência' });
      setBudgets([]);
      setSettings({ autoLockMinutes: 5, theme: 'dark' });
      setSavingsGoals([]);
      
      return true;
    } catch (error) {
      console.error("Error setting up master password:", error);
      return false;
    }
  }, []);

  const unlockWallet = useCallback(async (password) => {
    const saltBase64 = getRawStorageItem('wealth_mgr_security_salt');
    const verificationJson = getRawStorageItem('wealth_mgr_security_verify');
    
    if (!saltBase64 || !verificationJson) return false;
    
    const cryptoKey = await validatePassword(password, saltBase64, verificationJson);
    if (cryptoKey) {
      setSessionKey(cryptoKey);
      await decryptAndLoadState(cryptoKey);
      setIsLocked(false);

      // Cloud sync auto-init via JWT Token validation
      const savedUsername = getRawStorageItem('wealth_mgr_username');
      if (savedUsername) {
        try {
          const authKey = await deriveAuthKey(password, saltBase64);
          const authHash = await hashAuthKey(authKey);
          
          // Request fresh JWT token
          const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: savedUsername, auth_hash: authHash })
          });

          if (loginRes.ok) {
            const { token } = await loginRes.json();
            setUsername(savedUsername);
            setJwtToken(token);
            setSyncStatus('synced');
            
            // Pull latest vault state
            fetch(`http://localhost:5000/api/vault/get`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => {
              if (res.ok) return res.json();
            }).then(async data => {
              if (data && data.data_blob) {
                const plain = await decryptData(data.data_blob, cryptoKey);
                const parsed = JSON.parse(plain);
                
                if (parsed.accounts) setAccounts(parsed.accounts);
                if (parsed.dependents) setDependents(parsed.dependents);
                if (parsed.transactions) setTransactions(parsed.transactions);
                if (parsed.reminders) setReminders(parsed.reminders);
                if (parsed.investments) setInvestments(parsed.investments);
                if (parsed.documents) {
                  const cleanedDocs = await migrateDocsFromMetadata(parsed.documents, cryptoKey);
                  setDocuments(cleanedDocs);
                }
                if (parsed.profile !== undefined) setProfile(parsed.profile);
                if (parsed.investmentGoal) setInvestmentGoal(parsed.investmentGoal);
                if (parsed.budgets) setBudgets(parsed.budgets);
                if (parsed.settings) setSettings(parsed.settings);
                if (parsed.savingsGoals) setSavingsGoals(parsed.savingsGoals);
              }
            }).catch(err => {
              console.warn("Could not auto-fetch vault:", err);
              setSyncStatus('disconnected');
            });
          } else {
            setSyncStatus('disconnected');
          }
        } catch (e) {
          console.error("Sync init failed:", e);
          setSyncStatus('disconnected');
        }
      } else {
        setSyncStatus('local_only');
      }
      
      return true;
    }
    return false;
  }, []);

  const lockWallet = useCallback(() => {
    setSessionKey(null);
    setUsername('');
    setJwtToken(null);
    setSyncStatus('disconnected');
    setIsLocked(true);
    // Flush sensitive state from RAM
    setAccounts([]);
    setDependents([]);
    setTransactions([]);
    setReminders([]);
    setInvestments([]);
    setDocuments([]);
    setProfile('');
    setBudgets([]);
    setSettings({ autoLockMinutes: 5, theme: 'dark' });
    setSavingsGoals([]);
  }, []);

  const registerCloud = useCallback(async (user, password) => {
    try {
      let saltBase64 = getRawStorageItem('wealth_mgr_security_salt');
      let verificationJson = getRawStorageItem('wealth_mgr_security_verify');
      let activeKey = sessionKey;

      if (!saltBase64 || !verificationJson || !activeKey) {
        const sec = await initializeSecurity(password);
        saltBase64 = sec.saltBase64;
        verificationJson = sec.verificationJson;
        activeKey = sec.cryptoKey;
        
        setRawStorageItem('wealth_mgr_security_salt', saltBase64);
        setRawStorageItem('wealth_mgr_security_verify', verificationJson);
        setSessionKey(activeKey);
        setIsInitialized(true);
        setIsLocked(false);
      }

      const authKey = await deriveAuthKey(password, saltBase64);
      const authHash = await hashAuthKey(authKey);

      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user,
          auth_hash: authHash,
          security_salt: saltBase64,
          security_verify: verificationJson
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Falha no registro');
      }

      const { token } = await res.json();

      setUsername(user);
      setJwtToken(token);
      setRawStorageItem('wealth_mgr_username', user);
      setSyncStatus('synced');

      const dataToSync = {
        accounts, dependents, transactions, reminders, investments, documents, profile, investmentGoal, budgets, settings, savingsGoals
      };

      await syncWithCloud(activeKey, token, dataToSync);
      return { success: true };
    } catch (error) {
      console.error("Cloud registration error:", error);
      return { success: false, error: error.message };
    }
  }, [accounts, dependents, transactions, reminders, investments, documents, profile, investmentGoal, savingsGoals, sessionKey, syncWithCloud]);

  const loginCloud = useCallback(async (user, password) => {
    try {
      const saltRes = await fetch(`http://localhost:5000/api/auth/salt?username=${encodeURIComponent(user)}`);
      if (!saltRes.ok) {
        throw new Error(saltRes.status === 404 ? 'Usuário não encontrado' : 'Falha ao obter chaves');
      }
      const { security_salt, security_verify } = await saltRes.json();

      const cryptoKey = await validatePassword(password, security_salt, security_verify);
      if (!cryptoKey) {
        throw new Error('Senha incorreta');
      }

      const authKey = await deriveAuthKey(password, security_salt);
      const authHash = await hashAuthKey(authKey);

      const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, auth_hash: authHash })
      });

      if (!loginRes.ok) {
        throw new Error('Autenticação com o servidor falhou');
      }

      const { token } = await loginRes.json();

      const vaultRes = await fetch('http://localhost:5000/api/vault/get', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (vaultRes.ok) {
        const { data_blob } = await vaultRes.json();
        if (data_blob && data_blob !== '{}') {
          const plain = await decryptData(data_blob, cryptoKey);
          const parsed = JSON.parse(plain);
          
          if (parsed.accounts) setAccounts(parsed.accounts);
          if (parsed.dependents) setDependents(parsed.dependents);
          if (parsed.transactions) setTransactions(parsed.transactions);
          if (parsed.reminders) setReminders(parsed.reminders);
          if (parsed.investments) setInvestments(parsed.investments);
          if (parsed.documents) {
            const cleanedDocs = await migrateDocsFromMetadata(parsed.documents, cryptoKey);
            setDocuments(cleanedDocs);
          }
          if (parsed.profile !== undefined) setProfile(parsed.profile);
          if (parsed.investmentGoal) setInvestmentGoal(parsed.investmentGoal);
          if (parsed.budgets) setBudgets(parsed.budgets);
          if (parsed.settings) setSettings(parsed.settings);
          if (parsed.savingsGoals) setSavingsGoals(parsed.savingsGoals);

          // Update backups
          setRawStorageItem('wealth_mgr_accounts', await encryptData(JSON.stringify(parsed.accounts || []), cryptoKey));
          setRawStorageItem('wealth_mgr_dependents', await encryptData(JSON.stringify(parsed.dependents || []), cryptoKey));
          setRawStorageItem('wealth_mgr_transactions', await encryptData(JSON.stringify(parsed.transactions || []), cryptoKey));
          setRawStorageItem('wealth_mgr_reminders', await encryptData(JSON.stringify(parsed.reminders || []), cryptoKey));
          setRawStorageItem('wealth_mgr_investments', await encryptData(JSON.stringify(parsed.investments || []), cryptoKey));
          setRawStorageItem('wealth_mgr_profile', await encryptData(JSON.stringify(parsed.profile || ''), cryptoKey));
          setRawStorageItem('wealth_mgr_investment_goal', await encryptData(JSON.stringify(parsed.investmentGoal || {}), cryptoKey));
          setRawStorageItem('wealth_mgr_budgets', await encryptData(JSON.stringify(parsed.budgets || []), cryptoKey));
          setRawStorageItem('wealth_mgr_settings', await encryptData(JSON.stringify(parsed.settings || { autoLockMinutes: 5, theme: 'dark' }), cryptoKey));
          setRawStorageItem('wealth_mgr_savings_goals', await encryptData(JSON.stringify(parsed.savingsGoals || []), cryptoKey));
        }
      }

      setRawStorageItem('wealth_mgr_security_salt', security_salt);
      setRawStorageItem('wealth_mgr_security_verify', security_verify);
      setRawStorageItem('wealth_mgr_username', user);
      
      setSessionKey(cryptoKey);
      setUsername(user);
      setJwtToken(token);
      setIsInitialized(true);
      setIsLocked(false);
      setSyncStatus('synced');

      return { success: true };
    } catch (error) {
      console.error("Cloud login error:", error);
      return { success: false, error: error.message };
    }
  }, []);

  // CRUD Operations (wrapped in useCallback for performance optimization)
  const addAccount = useCallback((account) => {
    setAccounts(prev => [...prev, { ...account, id: crypto.randomUUID(), balance: parseFloat(account.balance) }]);
  }, []);

  const updateAccountBalance = useCallback((accountId, amount, type) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id === accountId) {
        const diff = type === 'income' ? amount : -amount;
        return { ...acc, balance: Math.round((acc.balance + diff) * 100) / 100 };
      }
      return acc;
    }));
  }, []);

  const deleteAccount = useCallback((id) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  }, []);

  const updateAccount = useCallback((updatedAcc) => {
    setAccounts(prev => prev.map(acc => acc.id === updatedAcc.id ? {
      ...updatedAcc,
      balance: parseFloat(updatedAcc.balance)
    } : acc));
  }, []);

  const addTransaction = useCallback((transaction) => {
    const newTx = {
      ...transaction,
      id: crypto.randomUUID(),
      amount: parseFloat(transaction.amount),
      date: transaction.date || new Date().toISOString().split('T')[0]
    };
    setTransactions(prev => [newTx, ...prev]);
    updateAccountBalance(transaction.accountId, parseFloat(transaction.amount), transaction.type);
  }, [updateAccountBalance]);

  const deleteTransaction = useCallback((id) => {
    setTransactions(prev => {
      const tx = prev.find(t => t.id === id);
      if (tx) {
        const revertType = tx.type === 'income' ? 'expense' : 'income';
        updateAccountBalance(tx.accountId, tx.amount, revertType);
      }
      return prev.filter(t => t.id !== id);
    });
  }, [updateAccountBalance]);

  const updateTransaction = useCallback((updatedTx) => {
    setTransactions(prev => {
      const oldTx = prev.find(t => t.id === updatedTx.id);
      if (oldTx) {
        const revertType = oldTx.type === 'income' ? 'expense' : 'income';
        updateAccountBalance(oldTx.accountId, oldTx.amount, revertType);
      }
      updateAccountBalance(updatedTx.accountId, parseFloat(updatedTx.amount), updatedTx.type);
      return prev.map(t => t.id === updatedTx.id ? {
        ...updatedTx,
        amount: parseFloat(updatedTx.amount)
      } : t);
    });
  }, [updateAccountBalance]);

  const addDependent = useCallback((dep) => {
    setDependents(prev => [...prev, { ...dep, id: crypto.randomUUID() }]);
  }, []);

  const deleteDependent = useCallback((id) => {
    setDependents(prev => prev.filter(d => d.id !== id));
  }, []);

  const addReminder = useCallback((rem) => {
    setReminders(prev => [...prev, { 
      ...rem, 
      id: crypto.randomUUID(), 
      amount: parseFloat(rem.amount), 
      paid: false,
      priority: rem.priority || 'important'
    }]);
  }, []);

  const updateReminder = useCallback((updatedRem) => {
    setReminders(prev => prev.map(rem => rem.id === updatedRem.id ? { ...rem, ...updatedRem, amount: parseFloat(updatedRem.amount) } : rem));
  }, []);

  const toggleReminderPaid = useCallback((id) => {
    setReminders(prev => prev.map(rem => {
      if (rem.id === id) {
        return { ...rem, paid: !rem.paid };
      }
      return rem;
    }));
  }, []);

  const deleteReminder = useCallback((id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const addInvestment = useCallback((inv) => {
    const quantity = parseFloat(inv.quantity) || 0;
    const averagePrice = parseFloat(inv.averagePrice) || 0;
    const currentPrice = parseFloat(inv.currentPrice) || 0;
    const value = quantity * currentPrice;

    setInvestments(prev => [...prev, { 
      ...inv, 
      id: crypto.randomUUID(), 
      quantity,
      averagePrice,
      currentPrice,
      value,
      yieldRate: parseFloat(inv.yieldRate) 
    }]);
  }, []);

  const deleteInvestment = useCallback((id) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateInvestment = useCallback((updatedInv) => {
    const quantity = parseFloat(updatedInv.quantity) || 0;
    const currentPrice = parseFloat(updatedInv.currentPrice) || 0;
    const averagePrice = parseFloat(updatedInv.averagePrice) || 0;
    const value = quantity * currentPrice;

    setInvestments(prev => prev.map(inv => inv.id === updatedInv.id ? {
      ...updatedInv,
      quantity,
      averagePrice,
      currentPrice,
      value,
      yieldRate: parseFloat(updatedInv.yieldRate)
    } : inv));
  }, []);

  const updateInvestmentPrices = useCallback((priceMap) => {
    setInvestments(prev => prev.map(inv => {
      if (priceMap[inv.id] !== undefined) {
        const newPrice = priceMap[inv.id];
        const quantity = inv.quantity !== undefined ? inv.quantity : 1;
        return {
          ...inv,
          currentPrice: newPrice,
          value: quantity * newPrice
        };
      }
      return inv;
    }));
  }, []);

  const addDocument = useCallback((doc) => {
    setDocuments(prev => [...prev, { ...doc, id: crypto.randomUUID() }]);
  }, []);

  const updateBudget = useCallback((category, limit) => {
    setBudgets(prev => {
      const exists = prev.some(b => b.category === category);
      if (exists) {
        return prev.map(b => b.category === category ? { ...b, limit: parseFloat(limit) } : b);
      } else {
        return [...prev, { category, limit: parseFloat(limit) }];
      }
    });
  }, []);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const restoreFullBackup = useCallback((data) => {
    if (data.accounts) setAccounts(data.accounts);
    if (data.dependents) setDependents(data.dependents);
    if (data.transactions) setTransactions(data.transactions);
    if (data.reminders) setReminders(data.reminders);
    if (data.investments) setInvestments(data.investments);
    if (data.documents) setDocuments(data.documents);
    if (data.profile !== undefined) setProfile(data.profile);
    if (data.investmentGoal) setInvestmentGoal(data.investmentGoal);
    if (data.budgets) setBudgets(data.budgets);
    if (data.settings) setSettings(data.settings);
    if (data.savingsGoals) setSavingsGoals(data.savingsGoals);
  }, []);

  const deleteDocument = useCallback((id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  return (
    <FinanceContext.Provider value={{
      isInitialized,
      isLocked,
      sessionKey,
      accounts,
      dependents,
      transactions,
      reminders,
      investments,
      documents,
      profile,
      setProfile,
      investmentGoal,
      setInvestmentGoal,
      savingsGoals,
      addSavingsGoal: useCallback((goal) => {
        setSavingsGoals(prev => [...prev, { ...goal, id: crypto.randomUUID(), target: parseFloat(goal.target), current: parseFloat(goal.current || 0) }]);
      }, []),
      updateSavingsGoal: useCallback((updatedGoal) => {
        setSavingsGoals(prev => prev.map(g => g.id === updatedGoal.id ? {
          ...updatedGoal,
          target: parseFloat(updatedGoal.target),
          current: parseFloat(updatedGoal.current)
        } : g));
      }, []),
      deleteSavingsGoal: useCallback((id) => {
        setSavingsGoals(prev => prev.filter(g => g.id !== id));
      }, []),
      setupMasterPassword,
      unlockWallet,
      lockWallet,
      addAccount,
      deleteAccount,
      updateAccount,
      addTransaction,
      deleteTransaction,
      updateTransaction,
      addDependent,
      deleteDependent,
      addReminder,
      toggleReminderPaid,
      deleteReminder,
      updateReminder,
      addInvestment,
      deleteInvestment,
      updateInvestment,
      updateInvestmentPrices,
      budgets,
      updateBudget,
      settings,
      updateSettings,
      addDocument,
      deleteDocument,
      restoreFullBackup,
      // Sync parameters
      username,
      syncStatus,
      syncWithCloud,
      registerCloud,
      loginCloud
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
