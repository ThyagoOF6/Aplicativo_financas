import React from 'react';
import { Trash2, Edit2, ShieldCheck, ShieldAlert, Landmark, CreditCard, Coins, TrendingUp, Sparkles } from 'lucide-react';
import { formatBRL } from '../../utils/financeUtils';

const AccountCard = ({ acc, onDeleteRequest, onEdit }) => {
  const getAccountIcon = (type) => {
    switch (type) {
      case 'Banco':
        return <Landmark className="text-accent" size={24} />;
      case 'Corretora':
        return <TrendingUp className="text-success" size={24} />;
      case 'Carteira Física':
        return <Coins className="text-warning" size={24} />;
      case 'Cartão de Crédito':
        return <CreditCard style={{ color: '#ec4899' }} size={24} />;
      default:
        return <Landmark size={24} />;
    }
  };

  const getCardUsageRecommendation = (benefitsList) => {
    if (!benefitsList || benefitsList.length === 0) {
      return "Cadastre os benefícios do cartão para receber recomendações de uso personalizadas.";
    }

    const hasCashback = benefitsList.some(b => b.toLowerCase().includes('cashback'));
    const hasPoints = benefitsList.some(b => b.toLowerCase().includes('milhas') || b.toLowerCase().includes('pontos'));
    const hasVip = benefitsList.some(b => b.toLowerCase().includes('vip') || b.toLowerCase().includes('sala'));
    const hasInsurance = benefitsList.some(b => b.toLowerCase().includes('seguro') || b.toLowerCase().includes('proteção') || b.toLowerCase().includes('protecao'));
    const hasNoAnnualFee = benefitsList.some(b => b.toLowerCase().includes('anuidade') || b.toLowerCase().includes('grátis') || b.toLowerCase().includes('gratis'));

    if (hasCashback && hasPoints) {
      return "Como você acumula cashback e milhas/pontos, compare a taxa de retorno para grandes compras. Use cashback para consumo diário e pontos para passagens e eletrônicos.";
    }
    if ((hasPoints || hasVip || hasInsurance) && hasCashback) {
      return "Use este cartão para todas as despesas diárias (ganhar cashback) e concentre gastos de viagem nele para usufruir de milhas e acessos VIP.";
    }
    if (hasPoints || hasVip || hasInsurance) {
      return "Ideal para passagens, hotéis e despesas internacionais. Concentre compras grandes aqui para acumular milhas e ter acesso a salas VIP e seguros.";
    }
    if (hasCashback) {
      return "Perfeito para compras cotidianas do dia a dia (supermercado, combustível, farmácia) para garantir o retorno direto do seu dinheiro.";
    }
    if (hasNoAnnualFee && benefitsList.length === 1) {
      return "Como é isento de anuidade, é excelente para assinaturas recorrentes automáticas (Netflix, Spotify) ou para guardar como cartão de emergência.";
    }

    return "Aproveite os benefícios exclusivos cadastrados neste cartão para otimizar seus gastos.";
  };

  const isPhysical = acc.type === 'Carteira Física';
  const isCreditCard = acc.type === 'Cartão de Crédito';

  return (
    <div className={`card account-card ${isPhysical ? 'physical-wallet-card' : ''} ${isCreditCard ? 'credit-card-card' : ''}`}>
      <div className="account-card-header flex-between">
        <div className="account-type-info flex-center-y">
          {getAccountIcon(acc.type)}
          <span className="account-type-tag text-xs font-semibold">{acc.type}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="delete-icon-btn" 
            onClick={() => onEdit(acc)}
            title="Editar Conta"
            style={{ color: 'var(--accent-color)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Edit2 size={16} />
          </button>
          <button 
            className="delete-icon-btn" 
            onClick={() => onDeleteRequest(acc)}
            title="Remover Conta"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="account-card-body">
        <h3 className="account-name">{acc.name}</h3>
        <h2 className="account-balance amount-primary">{formatBRL(acc.balance)}</h2>
        {isCreditCard && acc.benefits && acc.benefits.length > 0 && (
          <div className="account-benefits">
            {acc.benefits.map((benefit, i) => (
              <span key={i} className="benefit-badge">
                {benefit}
              </span>
            ))}
          </div>
        )}
        {isCreditCard && (
          <div className="card-recommendation-box">
            <div className="recommendation-title">
              <Sparkles size={12} />
              Recomendação de Uso
            </div>
            <div className="recommendation-text">
              {getCardUsageRecommendation(acc.benefits)}
            </div>
          </div>
        )}
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
