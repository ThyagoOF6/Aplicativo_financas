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
import { saveEncryptedFile, clearAllDocuments } from '../utils/indexedDbUtils';

// Configurable backend URL — set VITE_API_URL in .env for production deploys
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Utility to calculate JWT remaining validity time
const getTokenRemainingTime = (token) => {
  try {
    const payloadStr = token.split('.')[1];
    const payload = JSON.parse(atob(payloadStr));
    const expTimeMs = payload.exp * 1000;
    return expTimeMs - Date.now();
  } catch (e) {
    return 0;
  }
};

// Generates due recurring transactions at unlock time (pure function, no React deps)
const generateDueRecurringTransactions = (templates, existingTransactions) => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const newTransactions = [];
  const updatedTemplates = [];

  for (const template of templates) {
    const startDate = new Date(template.startDate + 'T12:00:00');
    const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    let shouldGenerate = false;

    if (template.frequency === 'monthly' && currentMonth >= startMonth) {
      if (template.lastGenerated !== currentMonth) shouldGenerate = true;
    } else if (template.frequency === 'yearly') {
      const currentYear = now.getFullYear();
      if (now.getMonth() === startDate.getMonth() && currentYear >= startDate.getFullYear()) {
        const lastGenYear = template.lastGenerated ? parseInt(template.lastGenerated.split('-')[0]) : 0;
        if (lastGenYear < currentYear) shouldGenerate = true;
      }
    }

    if (shouldGenerate) {
      const day = String(startDate.getDate()).padStart(2, '0');
      newTransactions.push({
        id: crypto.randomUUID(),
        description: template.description,
        amount: template.amount,
        type: template.type,
        category: template.category,
        accountId: template.accountId,
        date: `${currentMonth}-${day}`,
        dependentId: template.dependentId || '',
        isTaxDeductible: template.isTaxDeductible || false,
        specificPurpose: template.specificPurpose || '',
        fromRecurring: template.id,
      });
      updatedTemplates.push({ ...template, lastGenerated: currentMonth });
    } else {
      updatedTemplates.push(template);
    }
  }
  return { newTransactions, updatedTemplates };
};

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
  const [customCategories, setCustomCategories] = useState({ income: [], expense: [] });
  const [recurringTemplates, setRecurringTemplates] = useState([]);
  const [wealthHistory, setWealthHistory] = useState([]);
  const [aiHistory, setAiHistory] = useState([]);

  // Single consolidated effect: syncs all states to encrypted local storage.
  // Replaces 11 individual effects to avoid redundant concurrent crypto operations.
  useEffect(() => {
    if (!isLocked && sessionKey) {
      const stateMap = [
        { key: 'wealth_mgr_accounts',            value: accounts },
        { key: 'wealth_mgr_dependents',           value: dependents },
        { key: 'wealth_mgr_transactions',         value: transactions },
        { key: 'wealth_mgr_reminders',            value: reminders },
        { key: 'wealth_mgr_investments',          value: investments },
        { key: 'wealth_mgr_documents',            value: documents },
        { key: 'wealth_mgr_profile',              value: profile },
        { key: 'wealth_mgr_investment_goal',      value: investmentGoal },
        { key: 'wealth_mgr_budgets',              value: budgets },
        { key: 'wealth_mgr_settings',             value: settings },
        { key: 'wealth_mgr_savings_goals',        value: savingsGoals },
        { key: 'wealth_mgr_custom_categories',    value: customCategories },
        { key: 'wealth_mgr_recurring_templates',  value: recurringTemplates },
        { key: 'wealth_mgr_wealth_history',       value: wealthHistory },
        { key: 'wealth_mgr_ai_history',           value: aiHistory },
      ];
      stateMap.forEach(({ key, value }) => {
        encryptData(JSON.stringify(value), sessionKey).then(enc => {
          setRawStorageItem(key, enc);
        });
      });
    }
  }, [accounts, dependents, transactions, reminders, investments, documents, profile, investmentGoal, budgets, settings, savingsGoals, customCategories, recurringTemplates, wealthHistory, aiHistory, isLocked, sessionKey]);

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

  // Applies a parsed vault object to all local React states.
  // Centralises what was previously duplicated in unlockWallet, loginCloud and restoreFullBackup.
  // cryptoKey is optional and only needed for encrypted document migration.
  const applyVaultData = useCallback(async (parsed, cryptoKey = null) => {
    if (parsed.accounts) setAccounts(parsed.accounts);
    if (parsed.dependents) setDependents(parsed.dependents);
    if (parsed.transactions) setTransactions(parsed.transactions);
    if (parsed.reminders) setReminders(parsed.reminders);
    if (parsed.investments) setInvestments(parsed.investments);
    if (parsed.documents) {
      if (cryptoKey) {
        const cleanedDocs = await migrateDocsFromMetadata(parsed.documents, cryptoKey);
        setDocuments(cleanedDocs);
      } else {
        setDocuments(parsed.documents);
      }
    }
    if (parsed.profile !== undefined) setProfile(parsed.profile);
    if (parsed.investmentGoal) setInvestmentGoal(parsed.investmentGoal);
    if (parsed.budgets) setBudgets(parsed.budgets);
    if (parsed.settings) setSettings(parsed.settings);
    if (parsed.savingsGoals) setSavingsGoals(parsed.savingsGoals);
    if (parsed.customCategories) setCustomCategories(parsed.customCategories);
    if (parsed.recurringTemplates) setRecurringTemplates(parsed.recurringTemplates);
    if (parsed.wealthHistory) setWealthHistory(parsed.wealthHistory);
    if (parsed.aiHistory) setAiHistory(parsed.aiHistory);
  }, []);

  // Cloud sync helper function
  const syncWithCloud = useCallback(async (key = sessionKey, token = jwtToken, forceData = null) => {
    if (!token || !key) return;
    
    setSyncStatus('syncing');
    try {
      const dataToEncrypt = forceData || {
        accounts, dependents, transactions, reminders, investments, documents,
        profile, investmentGoal, budgets, settings, savingsGoals,
        customCategories, recurringTemplates, wealthHistory, aiHistory
      };
      
      const ciphertext = await encryptData(JSON.stringify(dataToEncrypt), key);
      
      const res = await fetch(`${API_BASE}/api/vault/sync`, {
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
  }, [accounts, dependents, transactions, reminders, investments, documents, profile, investmentGoal, savingsGoals, customCategories, recurringTemplates, wealthHistory, sessionKey, jwtToken]);

  // Debounced auto sync triggers when local state changes
  useEffect(() => {
    if (!isLocked && sessionKey && jwtToken) {
      const timeout = setTimeout(() => {
        syncWithCloud();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [accounts, dependents, transactions, reminders, investments, documents, profile, investmentGoal, budgets, settings, savingsGoals, isLocked, sessionKey, jwtToken, syncWithCloud]);

  // Automatically renews JWT token before expiration (Fix #6)
  const performTokenRefresh = useCallback(async (token = jwtToken) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setJwtToken(data.token);
      } else {
        console.warn("Failed to refresh JWT token");
      }
    } catch (err) {
      console.error("Token refresh request error:", err);
    }
  }, [jwtToken]);

  useEffect(() => {
    if (jwtToken) {
      const remaining = getTokenRemainingTime(jwtToken);
      // Refresh when 30 minutes remain on the token
      const refreshDelay = Math.max(1000, remaining - 30 * 60 * 1000);
      
      const timer = setTimeout(() => {
        performTokenRefresh(jwtToken);
      }, refreshDelay);
      
      return () => clearTimeout(timer);
    }
  }, [jwtToken, performTokenRefresh]);

  // Decrypts and loads all local database states.
  // Returns the full parsed data map so callers can use it for post-load logic
  // (wealth snapshots, recurring transaction generation) without React batching issues.
  const decryptAndLoadState = async (cryptoKey) => {
    const parsedData = {};
    const keys = [
      { storageKey: 'wealth_mgr_accounts',           stateKey: 'accounts',           setter: setAccounts,           def: [] },
      { storageKey: 'wealth_mgr_dependents',          stateKey: 'dependents',          setter: setDependents,          def: [] },
      { storageKey: 'wealth_mgr_transactions',        stateKey: 'transactions',        setter: setTransactions,        def: [] },
      { storageKey: 'wealth_mgr_reminders',           stateKey: 'reminders',           setter: setReminders,           def: [] },
      { storageKey: 'wealth_mgr_investments',         stateKey: 'investments',         setter: setInvestments,         def: [] },
      { storageKey: 'wealth_mgr_documents',           stateKey: 'documents',           setter: async (data) => {
        const cleaned = await migrateDocsFromMetadata(data, cryptoKey);
        setDocuments(cleaned);
        parsedData.documents = cleaned;
      }, def: [] },
      { storageKey: 'wealth_mgr_profile',             stateKey: 'profile',             setter: setProfile,             def: '' },
      { storageKey: 'wealth_mgr_investment_goal',     stateKey: 'investmentGoal',      setter: setInvestmentGoal,      def: { target: 0, current: 0, label: 'Reserva de Emergência' } },
      { storageKey: 'wealth_mgr_budgets',             stateKey: 'budgets',             setter: setBudgets,             def: [] },
      { storageKey: 'wealth_mgr_settings',            stateKey: 'settings',            setter: setSettings,            def: { autoLockMinutes: 5, theme: 'dark' } },
      { storageKey: 'wealth_mgr_savings_goals',       stateKey: 'savingsGoals',        setter: setSavingsGoals,        def: [] },
      { storageKey: 'wealth_mgr_custom_categories',   stateKey: 'customCategories',    setter: setCustomCategories,    def: { income: [], expense: [] } },
      { storageKey: 'wealth_mgr_recurring_templates', stateKey: 'recurringTemplates',  setter: setRecurringTemplates,  def: [] },
      { storageKey: 'wealth_mgr_wealth_history',      stateKey: 'wealthHistory',       setter: setWealthHistory,       def: [] },
      { storageKey: 'wealth_mgr_ai_history',          stateKey: 'aiHistory',           setter: setAiHistory,           def: [] },
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
            parsedData[key.stateKey] = parsed;
            key.setter(parsed);
          }
        } catch (error) {
          console.error(`Failed to decrypt state for ${key.storageKey}:`, error);
          parsedData[key.stateKey] = key.def;
          key.setter(key.def);
        }
      } else {
        parsedData[key.stateKey] = key.def;
        key.setter(key.def);
      }
    }
    return parsedData;
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
      setCustomCategories({ income: [], expense: [] });
      setRecurringTemplates([]);
      setWealthHistory([]);
      setAiHistory([]);
      
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
      const loadedData = await decryptAndLoadState(cryptoKey);
      setIsLocked(false);

      // --- Monthly Wealth Snapshot ---
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const loadedAccounts     = loadedData.accounts     || [];
      const loadedInvestments  = loadedData.investments  || [];
      const loadedHistory      = loadedData.wealthHistory || [];
      if (!loadedHistory.some(s => s.month === currentMonth) &&
          (loadedAccounts.length > 0 || loadedInvestments.length > 0)) {
        const totalAcc = loadedAccounts.reduce((s, a) => s + a.balance, 0);
        const totalInv = loadedInvestments.reduce((s, i) => s + i.value, 0);
        const updatedHistory = [...loadedHistory, {
          month: currentMonth, netWorth: totalAcc + totalInv, accounts: totalAcc, investments: totalInv
        }].sort((a, b) => a.month.localeCompare(b.month)).slice(-24);
        setWealthHistory(updatedHistory);
      }

      // --- Generate due Recurring Transactions ---
      const loadedTemplates    = loadedData.recurringTemplates || [];
      const loadedTransactions = loadedData.transactions       || [];
      if (loadedTemplates.length > 0) {
        const { newTransactions, updatedTemplates } = generateDueRecurringTransactions(loadedTemplates, loadedTransactions);
        if (newTransactions.length > 0) {
          // Update account balances without relying on React state (batching issue)
          const updatedAccounts = loadedAccounts.map(acc => {
            const delta = newTransactions
              .filter(tx => tx.accountId === acc.id)
              .reduce((s, tx) => s + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
            return delta !== 0 ? { ...acc, balance: Math.round((acc.balance + delta) * 100) / 100 } : acc;
          });
          setAccounts(updatedAccounts);
          setTransactions([...newTransactions, ...loadedTransactions]);
          setRecurringTemplates(updatedTemplates);
        }
      }

      // Cloud sync auto-init via JWT Token validation
      const savedUsername = getRawStorageItem('wealth_mgr_username');
      if (savedUsername) {
        try {
          const authKey = await deriveAuthKey(password, saltBase64);
          const authHash = await hashAuthKey(authKey);
          
          // Request fresh JWT token
          const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
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
            fetch(`${API_BASE}/api/vault/get`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => {
              if (res.ok) return res.json();
            }).then(async data => {
              if (data && data.data_blob) {
                const plain = await decryptData(data.data_blob, cryptoKey);
                const parsed = JSON.parse(plain);
                await applyVaultData(parsed, cryptoKey);
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
    setCustomCategories({ income: [], expense: [] });
    setRecurringTemplates([]);
    setWealthHistory([]);
    setAiHistory([]);
  }, []);

  const resetWallet = useCallback(async () => {
    try {
      await clearAllDocuments();
    } catch (e) {
      console.error("Failed to clear receipt files from IndexedDB:", e);
    }

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('wealth_mgr_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    setSessionKey(null);
    setUsername('');
    setJwtToken(null);
    setSyncStatus('local_only');
    setIsLocked(true);
    setIsInitialized(false);

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
    setCustomCategories({ income: [], expense: [] });
    setRecurringTemplates([]);
    setWealthHistory([]);
    setAiHistory([]);
  }, []);

  const recoverWalletFromBackup = useCallback(async (backupData, newPassword) => {
    try {
      const success = await setupMasterPassword(newPassword);
      if (!success) {
        throw new Error("Failed to setup new master password");
      }
      await applyVaultData(backupData);
      return true;
    } catch (error) {
      console.error("Error recovering wallet from backup:", error);
      return false;
    }
  }, [setupMasterPassword, applyVaultData]);

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

      const res = await fetch(`${API_BASE}/api/auth/register`, {
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
        accounts, dependents, transactions, reminders, investments, documents, profile,
        investmentGoal, budgets, settings, savingsGoals, customCategories, recurringTemplates, wealthHistory, aiHistory
      };

      await syncWithCloud(activeKey, token, dataToSync);
      return { success: true };
    } catch (error) {
      console.error("Cloud registration error:", error);
      return { success: false, error: error.message };
    }
  }, [accounts, dependents, transactions, reminders, investments, documents, profile, investmentGoal, savingsGoals, customCategories, recurringTemplates, wealthHistory, sessionKey, syncWithCloud]);

  const loginCloud = useCallback(async (user, password) => {
    try {
      const saltRes = await fetch(`${API_BASE}/api/auth/salt?username=${encodeURIComponent(user)}`);
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

      const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, auth_hash: authHash })
      });

      if (!loginRes.ok) {
        throw new Error('Autenticação com o servidor falhou');
      }

      const { token } = await loginRes.json();

      const vaultRes = await fetch(`${API_BASE}/api/vault/get`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (vaultRes.ok) {
        const { data_blob } = await vaultRes.json();
        if (data_blob && data_blob !== '{}') {
          const plain = await decryptData(data_blob, cryptoKey);
          const parsed = JSON.parse(plain);
          
          await applyVaultData(parsed, cryptoKey);

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

  const restoreFullBackup = useCallback(async (data) => {
    // sessionKey passed so encrypted document migration can run if needed
    await applyVaultData(data, sessionKey);
  }, [applyVaultData, sessionKey]);

  const deleteDocument = useCallback((id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  // savingsGoals callbacks — defined here (not inline in JSX) for stability
  const addSavingsGoal = useCallback((goal) => {
    setSavingsGoals(prev => [...prev, { ...goal, id: crypto.randomUUID(), target: parseFloat(goal.target), current: parseFloat(goal.current || 0) }]);
  }, []);

  const updateSavingsGoal = useCallback((updatedGoal) => {
    setSavingsGoals(prev => prev.map(g => g.id === updatedGoal.id ? {
      ...updatedGoal,
      target: parseFloat(updatedGoal.target),
      current: parseFloat(updatedGoal.current)
    } : g));
  }, []);

  const deleteSavingsGoal = useCallback((id) => {
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  // Custom categories CRUD
  const addCustomCategory = useCallback((type, name) => {
    setCustomCategories(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), { id: crypto.randomUUID(), name }]
    }));
  }, []);

  const deleteCustomCategory = useCallback((type, id) => {
    setCustomCategories(prev => ({
      ...prev,
      [type]: (prev[type] || []).filter(c => c.id !== id)
    }));
  }, []);

  // Recurring templates CRUD
  const addRecurringTemplate = useCallback((template) => {
    setRecurringTemplates(prev => [...prev, {
      ...template,
      id: crypto.randomUUID(),
      amount: parseFloat(template.amount),
      lastGenerated: null
    }]);
  }, []);

  const deleteRecurringTemplate = useCallback((id) => {
    setRecurringTemplates(prev => prev.filter(t => t.id !== id));
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
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
      customCategories,
      addCustomCategory,
      deleteCustomCategory,
      recurringTemplates,
      addRecurringTemplate,
      deleteRecurringTemplate,
      wealthHistory,
      aiHistory,
      setAiHistory,
      setupMasterPassword,
      unlockWallet,
      lockWallet,
      resetWallet,
      recoverWalletFromBackup,
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
      jwtToken,
      syncStatus,
      syncWithCloud,
      registerCloud,
      loginCloud
    }}>
      {children}
    </FinanceContext.Provider>
  );
};
