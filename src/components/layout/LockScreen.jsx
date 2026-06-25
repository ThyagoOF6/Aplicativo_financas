import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Key, Loader2 } from 'lucide-react';

const LockScreen = ({ isInitialized, onSetup, onUnlock }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="lockscreen-wrapper flex-center flex-column">
      <div className="lockscreen-card card glass-card animate-scale-up">
        
        <div className="lockscreen-header text-center flex-column flex-center">
          <div className="shield-icon-wrapper flex-center">
            {isInitialized ? (
              <Key size={32} className="text-accent animate-pulse" />
            ) : (
              <ShieldCheck size={32} className="text-success" />
            )}
          </div>
          <h2 className="mt-md font-bold">Wealth Manager</h2>
          <p className="text-secondary text-sm">
            {isInitialized 
              ? 'Insira sua senha mestra para desbloquear a carteira' 
              : 'Defina uma senha mestra para criptografar seus dados'}
          </p>
        </div>

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
        </form>

        <div className="lockscreen-footer text-xxs text-secondary text-center mt-xl pt-md border-top">
          🔒 Todos os seus dados são criptografados localmente com chave derivada por PBKDF2 e encriptação AES-GCM no seu navegador.
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
