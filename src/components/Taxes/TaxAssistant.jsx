import React, { useContext, useMemo, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { FileText, ShieldAlert, Award, Stethoscope, GraduationCap, CheckCircle, Calculator, Sparkles } from 'lucide-react';
import { formatBRL } from '../../utils/financeUtils';
import AIDiagnosticsDrawer from '../layout/AIDiagnosticsDrawer';

const TaxAssistant = () => {
  const { transactions, dependents, investments, jwtToken } = useContext(FinanceContext);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 1. Get deductible transactions
  const deductibleTransactions = transactions.filter(t => t.isTaxDeductible && t.type === 'expense');

  const contextSummary = useMemo(() => ({
    overview: {
      totalDeductiblesValue: deductibleTransactions.reduce((acc, curr) => acc + curr.amount, 0),
      dependentsCount: dependents.length
    },
    taxDeductibles: deductibleTransactions.map(t => ({
      description: t.description,
      amount: t.amount,
      category: t.category,
      date: t.date
    })),
    dependents: dependents.map(d => ({ name: d.name, relation: d.relation, age: d.age }))
  }), [deductibleTransactions, dependents]);

  const taxPrompt = "Faça uma análise rigorosa do meu cenário de deduções fiscais atuais. Verifique se o total deduzido compensa fazer a Declaração Completa do IRPF frente ao Desconto Simplificado (limite de R$ 16.754,34). Comente sobre despesas com saúde, educação, previdência privada (PGBL) e dependentes. Mantenha um tom profissional e didático de contador sênior, apresentando sugestões em listas ou tabelas.";


  // Breakdown by category (Health vs Education)
  const healthDeductibles = deductibleTransactions.filter(t => t.category === 'Saúde');
  const educationDeductibles = deductibleTransactions.filter(t => t.category === 'Educação');
  const otherDeductibles = deductibleTransactions.filter(t => t.category !== 'Saúde' && t.category !== 'Educação');

  const totalHealth = healthDeductibles.reduce((acc, curr) => acc + curr.amount, 0);
  const totalEducation = educationDeductibles.reduce((acc, curr) => acc + curr.amount, 0);
  const totalOther = otherDeductibles.reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalDeductible = totalHealth + totalEducation + totalOther;

  // Brazilian IRPF 2026 Threshold for Simplified Discount Limit
  const simplifiedDiscountLimit = 16754.34;
  const isCompleteFormRecommended = totalDeductible > simplifiedDiscountLimit;

  // Simulated stock sales limit reminder (R$ 20.000 / month exempt)
  const monthlySalesValue = useMemo(() => {
    // A data do sistema é gerada dinamicamente
    const targetMonth = new Date().toISOString().substring(0, 7); 
    
    return transactions
      .filter(t => 
        t.type === 'income' && 
        t.category === 'Venda de Ativos' && 
        t.date && t.date.startsWith(targetMonth)
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);
  
  const stockLimitPercent = (monthlySalesValue / 20000) * 100;

  return (
    <div className="taxes-container">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Assistente Fiscal & IRPF</h1>
          <p>Acompanhe suas despesas dedutíveis em tempo real e prepare-se para a declaração anual.</p>
        </div>
        <button className="ai-diagnostics-float-btn" onClick={() => setIsDrawerOpen(true)}>
          <Sparkles size={16} />
          Diagnóstico de IA
        </button>
      </div>

      <div className="taxes-split-grid">
        {/* Left Column: Deductible Analysis */}
        <div className="left-panel flex-column gap-lg">
          {/* Recommendation Box */}
          <div className={`card recommendation-card ${isCompleteFormRecommended ? 'border-success' : 'border-accent'}`}>
            <div className="card-header flex-center-y">
              <Calculator className="text-accent" size={24} style={{ marginRight: 12 }} />
              <h3>Recomendação de Declaração</h3>
            </div>
            <div className="card-body">
              <p className="recommendation-text">
                Com base nos seus gastos dedutíveis atuais de <strong>{formatBRL(totalDeductible)}</strong>:
              </p>
              <div className="recommendation-badge flex-center-y">
                {isCompleteFormRecommended ? (
                  <>
                    <Award className="text-success" size={20} style={{ marginRight: 8 }} />
                    <span className="font-bold text-success">Declaração por Deduções Legais (Completa)</span>
                  </>
                ) : (
                  <>
                    <Award className="text-accent" size={20} style={{ marginRight: 8 }} />
                    <span className="font-bold text-accent">Declaração por Desconto Simplificado</span>
                  </>
                )}
              </div>
              <p className="card-subtext mt-sm">
                {isCompleteFormRecommended 
                  ? 'Suas despesas dedutíveis ultrapassam o limite do desconto simplificado (R$ 16.754,34). Declarar no modelo completo resultará em maior restituição ou menor imposto a pagar.'
                  : 'Suas deduções atuais ainda não ultrapassam o limite de desconto simplificado. A declaração simplificada é recomendada no momento, mas continue lançando recibos!'}
              </p>
            </div>
          </div>

          {/* Deductibles Breakdown */}
          <div className="card details-card">
            <h3>Deduções por Categoria</h3>
            <div className="deductible-breakdown-list">
              <div className="breakdown-item flex-between flex-center-y">
                <div className="flex-center-y">
                  <div className="icon-circle health-color flex-center">
                    <Stethoscope size={18} className="text-danger" />
                  </div>
                  <div>
                    <p className="breakdown-title">Despesas Médicas</p>
                    <p className="breakdown-subtitle text-xs text-secondary">{healthDeductibles.length} lançamentos vinculados</p>
                  </div>
                </div>
                <span className="breakdown-val font-semibold text-danger">{formatBRL(totalHealth)}</span>
              </div>

              <div className="breakdown-item flex-between flex-center-y">
                <div className="flex-center-y">
                  <div className="icon-circle edu-color flex-center">
                    <GraduationCap size={18} className="text-accent" />
                  </div>
                  <div>
                    <p className="breakdown-title">Instrução / Educação</p>
                    <p className="breakdown-subtitle text-xs text-secondary">{educationDeductibles.length} lançamentos vinculados</p>
                  </div>
                </div>
                <span className="breakdown-val font-semibold text-danger">{formatBRL(totalEducation)}</span>
              </div>

              <div className="breakdown-item flex-between flex-center-y">
                <div className="flex-center-y">
                  <div className="icon-circle flex-center bg-slate">
                    <FileText size={18} className="text-secondary" />
                  </div>
                  <div>
                    <p className="breakdown-title">Outras Deduções (Previdência, etc.)</p>
                    <p className="breakdown-subtitle text-xs text-secondary">{otherDeductibles.length} lançamentos</p>
                  </div>
                </div>
                <span className="breakdown-val font-semibold text-danger">{formatBRL(totalOther)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Investment Tax Warnings & Receipt Vault Link */}
        <div className="right-panel flex-column gap-lg">
          {/* Capital Gains Tracker */}
          <div className="card details-card">
            <h3>Eventos Tributáveis em Ações</h3>
            <p className="card-subtext mb-md">Monitore o limite de isenção de R$ 20.000,00 mensais em vendas de ações na Bolsa de Valores (B3).</p>
            
            <div className="tax-limit-progress">
              <div className="flex-between text-xs mb-sm">
                <span>Vendas no mês atual (XP)</span>
                <span className="font-bold">{formatBRL(monthlySalesValue)} / R$ 20.000,00</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className={`progress-bar-fill ${stockLimitPercent > 80 ? 'bg-danger' : 'bg-warning'}`} 
                  style={{ width: `${stockLimitPercent}%` }}
                ></div>
              </div>
              <div className="flex-between text-xxs text-secondary mt-xs">
                <span>Isento de tributação</span>
                <span>{stockLimitPercent.toFixed(0)}% do limite utilizado</span>
              </div>
            </div>

            {stockLimitPercent > 80 && (
              <div className="alert-message warning-alert mt-md flex-center-y">
                <ShieldAlert size={18} className="text-warning flex-shrink-0" style={{ marginRight: 8 }} />
                <span className="text-xs">Atenção! Você está próximo de atingir o limite de isenção de vendas em ações. Vendas acima de R$ 20 mil geram alíquota de 15% (DARF).</span>
              </div>
            )}
          </div>

          {/* Deductible Transactions List */}
          <div className="card details-card flex-grow">
            <h3>Recibos e Transações Dedutíveis</h3>
            <div className="deductible-tx-list">
              {deductibleTransactions.map(tx => {
                const dep = dependents.find(d => d.id === tx.dependentId);
                return (
                  <div key={tx.id} className="deductible-tx-item flex-between flex-center-y">
                    <div className="tx-details">
                      <p className="tx-desc font-semibold">{tx.description}</p>
                      <p className="tx-meta text-xs text-secondary">
                        {tx.category} • Beneficiário: {dep ? dep.name : 'Titular'}
                      </p>
                    </div>
                    <div className="tx-val-col text-right">
                      <p className="tx-val font-bold text-danger">{formatBRL(tx.amount)}</p>
                      <span className="tax-verified text-success text-xxs flex-center-y">
                        <CheckCircle size={10} style={{ marginRight: 2 }} /> Recibo ok
                      </span>
                    </div>
                  </div>
                );
              })}
              {deductibleTransactions.length === 0 && (
                <p className="empty-state text-sm text-secondary italic">Nenhuma despesa dedutível registrada.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <AIDiagnosticsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Diagnóstico Fiscal com IA"
        systemPrompt={taxPrompt}
        contextSummary={contextSummary}
        jwtToken={jwtToken}
      />
    </div>
  );
};

export default TaxAssistant;
