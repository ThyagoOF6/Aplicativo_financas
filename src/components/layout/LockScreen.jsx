import React, { useState, useContext } from 'react';
import { ShieldCheck, ShieldAlert, Key, Loader2, AlertTriangle, ArrowLeft, Upload, Trash2 } from 'lucide-react';
import { FinanceContext } from '../../context/FinanceContext';

const LockScreen = ({ isInitialized, onSetup, onUnlock }) => {
  const { resetWallet, recoverWalletFromBackup } = useContext(FinanceContext);

  const [view, setView] = useState('login'); // 'login', 'reset_options', 'wipe_confirm', 'restore_backup'
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // States for recovery/wipe
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [backupFileName, setBackupFileName] = useState('');
  const [backupError, setBackupError] = useState('');
  const [backupData, setBackupData] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('Por favor, informe a senha.');
      return;
    }

    setLoading(true);
    // Simulate brief crypto processing delay for UI smoothness
    await new Promise(resolve => setTimeout(resolve, 600));

    if (!isInitialized) {
      // Sign-up flow
      if (password.length < 6) {
        setError('A senha deve conter no mínimo 6 caracteres.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas digitadas não coincidem.');
        setLoading(false);
        return;
      }
      
      const success = await onSetup(password);
      if (!success) {
        setError('Erro ao configurar a senha. Tente novamente.');
      }
    } else {
      // Login flow
      const success = await onUnlock(password);
      if (!success) {
        setError('Senha mestra inválida.');
      }
    }
    setLoading(false);
  };

  const handleWipeWallet = async () => {
    if (wipeConfirmText !== 'APAGAR') {
      setError('Por favor, digite "APAGAR" para confirmar.');
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800)); // smooth delay
    await resetWallet();
    setLoading(false);
    setView('login');
    // Clear state
    setPassword('');
    setConfirmPassword('');
    setWipeConfirmText('');
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBackupFileName(file.name);
    setBackupError('');
    setBackupData(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const backup = JSON.parse(text);

        if (backup.encrypted) {
          setBackupError('Este backup está criptografado. Backups criptografados necessitam da senha original para serem descriptografados. Use um backup em texto aberto (JSON) para recuperar a carteira sem a senha original.');
          return;
        }

        if (!backup.accounts && !backup.transactions && !backup.settings) {
          setBackupError('Arquivo de backup inválido ou sem dados compatíveis.');
          return;
        }

        setBackupData(backup);
      } catch (err) {
        console.error(err);
        setBackupError('Erro ao ler ou processar o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreFromBackup = async (e) => {
    e.preventDefault();
    setBackupError('');

    if (!backupData) {
      setBackupError('Por favor, carregue um arquivo de backup válido primeiro.');
      return;
    }

    if (newPassword.length < 6) {
      setBackupError('A nova senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setBackupError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // smooth delay

    const success = await recoverWalletFromBackup(backupData, newPassword);
    setLoading(false);

    if (success) {
      // Wallet is unlocked, data is loaded! The parent App.jsx will automatically see isLocked = false
    } else {
      setBackupError('Erro ao restaurar o backup e redefinir a senha.');
    }
  };

  const renderHeader = () => {
    let icon, title, subtitle;

    switch (view) {
      case 'reset_options':
        icon = <AlertTriangle size={32} className="text-warning animate-pulse" />;
        title = "Esqueceu a Senha?";
        subtitle = "Esta carteira utiliza criptografia de ponta a ponta (Zero-Knowledge). Não armazenamos sua senha em nenhum servidor. Se você a esquecer, os dados locais e na nuvem criptografados não poderão ser recuperados sem a senha antiga.";
        break;
      case 'wipe_confirm':
        icon = <Trash2 size={32} className="text-danger animate-pulse" />;
        title = "Redefinir Carteira";
        subtitle = "Aviso de exclusão permanente de dados locais.";
        break;
      case 'restore_backup':
        icon = <Upload size={32} className="text-accent animate-pulse" />;
        title = "Restaurar Backup";
        subtitle = "Recupere seus dados financeiros de um backup em texto aberto (.json) e defina uma nova senha.";
        break;
      case 'login':
      default:
        icon = isInitialized ? (
          <Key size={32} className="text-accent animate-pulse" />
        ) : (
          <ShieldCheck size={32} className="text-success" />
        );
        title = "Wealth Manager";
        subtitle = isInitialized 
          ? 'Insira sua senha mestra para desbloquear a carteira' 
          : 'Defina uma senha mestra para criptografar seus dados';
        break;
    }

    return (
      <div className="lockscreen-header text-center flex-column flex-center">
        <div 
          className="shield-icon-wrapper flex-center"
          style={{
            borderColor: view === 'wipe_confirm' ? 'rgba(239, 68, 68, 0.2)' : view === 'reset_options' ? 'rgba(245, 158, 11, 0.2)' : undefined,
            background: view === 'wipe_confirm' ? 'rgba(239, 68, 68, 0.1)' : view === 'reset_options' ? 'rgba(245, 158, 11, 0.1)' : undefined,
            boxShadow: view === 'wipe_confirm' ? '0 0 20px rgba(239, 68, 68, 0.15)' : view === 'reset_options' ? '0 0 20px rgba(245, 158, 11, 0.15)' : undefined
          }}
        >
          {icon}
        </div>
        <h2 className="mt-md font-bold">{title}</h2>
        <p className="text-secondary text-sm mt-xs leading-relaxed" style={{ maxWidth: '360px', margin: '8px auto 0' }}>
          {subtitle}
        </p>
      </div>
    );
  };

  const renderContent = () => {
    switch (view) {
      case 'reset_options':
        return (
          <div className="flex-column gap-md mt-lg" style={{ width: '100%' }}>
            <button 
              type="button" 
              onClick={() => setView('restore_backup')}
              className="btn btn-secondary flex-between text-left p-md"
              style={{ height: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', cursor: 'pointer', gap: '12px' }}
            >
              <div className="flex-column" style={{ gap: '4px' }}>
                <span className="font-semibold text-sm text-primary flex-center-y">
                  <Upload size={16} className="text-accent" style={{ marginRight: 6 }} />
                  Restaurar de um Backup JSON
                </span>
                <span className="text-xxs text-secondary leading-normal">
                  Recupere seus dados financeiros de um arquivo de backup (.json) em texto aberto e defina uma nova senha.
                </span>
              </div>
            </button>

            <button 
              type="button" 
              onClick={() => setView('wipe_confirm')}
              className="btn btn-secondary flex-between text-left p-md"
              style={{ height: 'auto', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.02)', cursor: 'pointer', gap: '12px' }}
            >
              <div className="flex-column" style={{ gap: '4px' }}>
                <span className="font-semibold text-sm text-danger flex-center-y">
                  <Trash2 size={16} className="text-danger" style={{ marginRight: 6 }} />
                  Apagar Tudo e Começar do Zero
                </span>
                <span className="text-xxs text-secondary leading-normal">
                  Apaga permanentemente todos os dados locais salvos neste dispositivo para que você possa criar uma nova carteira.
                </span>
              </div>
            </button>

            <button 
              type="button" 
              onClick={() => {
                setView('login');
                setError('');
              }} 
              className="btn btn-secondary flex-center mt-md text-xs"
              style={{ width: '100%', padding: '10px 0' }}
            >
              <ArrowLeft size={14} style={{ marginRight: 6 }} /> Voltar para o Login
            </button>
          </div>
        );

      case 'wipe_confirm':
        return (
          <div className="flex-column mt-lg" style={{ width: '100%' }}>
            <div className="alert-message error-alert flex-start text-xs" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)', borderRadius: '8px', padding: '12px', lineHeight: 1.4 }}>
              <ShieldAlert size={20} className="text-danger flex-shrink-0" style={{ marginRight: 8, marginTop: 2 }} />
              <span>
                <strong>ATENÇÃO:</strong> Esta ação é irreversível. Todos os seus dados locais (contas, transações, metas) serão excluídos permanentemente. Se você possuir sincronização em nuvem ativa, a conta local será desconectada.
              </span>
            </div>

            <div className="form-group mt-md" style={{ width: '100%' }}>
              <label htmlFor="confirm-wipe-input" className="text-xs text-secondary">Para prosseguir, digite <strong>APAGAR</strong> abaixo:</label>
              <input 
                id="confirm-wipe-input"
                type="text" 
                placeholder="Digite APAGAR..."
                value={wipeConfirmText}
                onChange={(e) => setWipeConfirmText(e.target.value)}
                style={{ textTransform: 'uppercase', width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white', marginTop: '8px', outline: 'none' }}
              />
            </div>

            {error && (
              <div className="alert-message error-alert flex-center-y text-xs mt-md" style={{ width: '100%' }}>
                <ShieldAlert size={16} className="text-danger flex-shrink-0" style={{ marginRight: 8 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="flex-column gap-sm mt-lg" style={{ width: '100%' }}>
              <button 
                type="button" 
                onClick={handleWipeWallet}
                className="btn btn-danger flex-center"
                disabled={wipeConfirmText !== 'APAGAR' || loading}
                style={{ width: '100%', background: wipeConfirmText === 'APAGAR' ? 'var(--danger-color)' : 'rgba(239, 68, 68, 0.2)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: wipeConfirmText === 'APAGAR' ? 'pointer' : 'not-allowed' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} style={{ marginRight: 8 }} />
                    <span>Apagar Todos os Dados</span>
                  </>
                )}
              </button>
              
              <button 
                type="button" 
                onClick={() => {
                  setView('reset_options');
                  setError('');
                  setWipeConfirmText('');
                }} 
                className="btn btn-secondary flex-center text-xs"
                disabled={loading}
                style={{ width: '100%', padding: '10px 0' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        );

      case 'restore_backup':
        return (
          <form onSubmit={handleRestoreFromBackup} className="flex-column gap-md mt-lg" style={{ width: '100%' }}>
            <div className="form-group">
              <label className="text-xs text-secondary">Selecione o arquivo de Backup (.json)</label>
              <label 
                className="btn btn-secondary btn-sm custom-file-upload flex-center mt-sm" 
                style={{ width: '100%', padding: '12px', cursor: 'pointer', border: '1px dashed var(--border-color)', background: 'rgba(255,255,255,0.01)' }}
              >
                <Upload size={16} style={{ marginRight: 8 }} />
                <span>{backupFileName || "Selecionar Arquivo JSON"}</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                  disabled={loading}
                />
              </label>
            </div>

            {backupData && (
              <div className="animate-fade-in flex-column gap-md" style={{ width: '100%' }}>
                <div className="alert-message success-alert flex-center-y text-xs" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success-color)', borderRadius: '8px', padding: '8px 12px' }}>
                  <ShieldCheck size={16} className="text-success" style={{ marginRight: 8, flexShrink: 0 }} />
                  <span>Backup lido: {backupData.accounts?.length || 0} contas e {backupData.transactions?.length || 0} lançamentos.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="new-master-pass">Nova Senha Mestra</label>
                  <input 
                    id="new-master-pass"
                    type="password" 
                    placeholder="Digite a nova senha..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white', marginTop: '4px', outline: 'none' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-new-master-pass">Confirmar Nova Senha</label>
                  <input 
                    id="confirm-new-master-pass"
                    type="password" 
                    placeholder="Confirme a nova senha..."
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'white', marginTop: '4px', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {backupError && (
              <div className="alert-message error-alert flex-start text-xs mt-sm" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)', borderRadius: '8px', padding: '10px' }}>
                <ShieldAlert size={16} className="text-danger flex-shrink-0" style={{ marginRight: 8, marginTop: 2 }} />
                <span>{backupError}</span>
              </div>
            )}

            <div className="flex-column gap-sm mt-md" style={{ width: '100%' }}>
              {backupData && (
                <button 
                  type="submit" 
                  className="btn btn-primary flex-center"
                  disabled={loading}
                  style={{ width: '100%', padding: '12px' }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} />
                      <span>Restaurando...</span>
                    </>
                  ) : (
                    <span>Restaurar e Definir Nova Senha</span>
                  )}
                </button>
              )}
              
              <button 
                type="button" 
                onClick={() => {
                  setView('reset_options');
                  setBackupFileName('');
                  setBackupError('');
                  setBackupData(null);
                  setNewPassword('');
                  setConfirmNewPassword('');
                }} 
                className="btn btn-secondary flex-center text-xs"
                disabled={loading}
                style={{ width: '100%', padding: '10px 0' }}
              >
                Cancelar
              </button>
            </div>
          </form>
        );

      case 'login':
      default:
        return (
          <form onSubmit={handleSubmit} className="lockscreen-form flex-column gap-md mt-lg">
            <div className="form-group">
              <label htmlFor="master-pass">Senha Mestra</label>
              <input 
                id="master-pass"
                type="password" 
                placeholder="Digite sua senha..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            {!isInitialized && (
              <div className="form-group animate-fade-in">
                <label htmlFor="confirm-pass">Confirmar Senha</label>
                <input 
                  id="confirm-pass"
                  type="password" 
                  placeholder="Confirme sua senha..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <div className="alert-message error-alert flex-center-y text-xs animate-scale-up">
                <ShieldAlert size={16} className="text-danger flex-shrink-0" style={{ marginRight: 8 }} />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary flex-center mt-md" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" style={{ marginRight: 8 }} />
                  <span>Processando...</span>
                </>
              ) : (
                <span>{isInitialized ? 'Desbloquear Carteira' : 'Criar Carteira Criptografada'}</span>
              )}
            </button>

            {isInitialized && (
              <button 
                type="button" 
                onClick={() => {
                  setView('reset_options');
                  setError('');
                }} 
                className="btn-link text-xxs text-accent mt-md text-center block"
                style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer', outline: 'none' }}
              >
                Esqueceu sua senha?
              </button>
            )}
          </form>
        );
    }
  };

  return (
    <div className="lockscreen-wrapper flex-center flex-column">
      <div className="lockscreen-card card glass-card animate-scale-up">
        {renderHeader()}
        {renderContent()}
        
        <div className="lockscreen-footer text-xxs text-secondary text-center mt-xl pt-md border-top">
          🔒 Todos os seus dados são criptografados localmente com chave derivada por PBKDF2 e encriptação AES-GCM no seu navegador.
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
