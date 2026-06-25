import React from 'react';
import { Trash2, ShieldCheck, ShieldAlert, Landmark, CreditCard, Coins } from 'lucide-react';
import { formatBRL } from '../../utils/financeUtils';

const AccountCard = ({ acc, onDelete }) => {
  const getAccountIcon = (type) => {
    switch (type) {
      case 'Banco':
        return <Landmark className="text-accent" size={24} />;
      case 'Corretora':
        return <CreditCard className="text-success" size={24} />;
      case 'Carteira Física':
        return <Coins className="text-warning" size={24} />;
      default:
        return <Landmark size={24} />;
    }
  };

  const isPhysical = acc.type === 'Carteira Física';

  return (
    <div className={`card account-card ${isPhysical ? 'physical-wallet-card' : ''}`}>
      <div className="account-card-header flex-between">
        <div className="account-type-info flex-center-y">
          {getAccountIcon(acc.type)}
          <span className="account-type-tag text-xs font-semibold">{acc.type}</span>
        </div>
        <button 
          className="delete-icon-btn" 
          onClick={() => {
            if (confirm(`Excluir conta ${acc.name}?`)) {
              onDelete(acc.id);
            }
          }}
          title="Remover Conta"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="account-card-body">
        <h3 className="account-name">{acc.name}</h3>
        <h2 className="account-balance amount-primary">{formatBRL(acc.balance)}</h2>
      </div>

      <div className="account-card-footer flex-between text-xs">
        {acc.includeInTax ? (
          <div className="tax-badge declared flex-center-y text-success">
            <ShieldCheck size={14} style={{ marginRight: 4 }} />
            Declarável no IRPF
          </div>
        ) : (
          <div className="tax-badge exempt flex-center-y text-secondary">
            <ShieldAlert size={14} style={{ marginRight: 4 }} />
            Isento/Oculto no IRPF
          </div>
        )}
        <span className="account-id text-secondary">ID: {acc.id}</span>
      </div>
    </div>
  );
};

export default AccountCard;
