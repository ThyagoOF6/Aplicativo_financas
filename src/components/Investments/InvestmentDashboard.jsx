import React, { useContext, useState, useMemo } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Compass, LineChart, Sparkles } from 'lucide-react';
import InvestmentPlanner from './InvestmentPlanner';
import InvestmentAdvisor from './InvestmentAdvisor';
import AIDiagnosticsDrawer from '../layout/AIDiagnosticsDrawer';

const InvestmentDashboard = () => {
  const { 
    investments, 
    addInvestment, 
    deleteInvestment, 
    investmentGoal, 
    setInvestmentGoal,
    jwtToken,
    profile
  } = useContext(FinanceContext);

  const [activeSubTab, setActiveSubTab] = useState('advisor'); // 'planner' or 'advisor'
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const contextSummary = useMemo(() => ({
    overview: {
      totalInvestmentsValue: investments.reduce((acc, curr) => acc + curr.value, 0),
    },
    investments: investments.map(i => ({ 
      symbol: i.symbol || i.name, 
      name: i.name, 
      type: i.type, 
      quantity: i.quantity, 
      currentPrice: i.currentPrice, 
      value: i.value,
      yieldRate: i.yieldRate 
    })),
    profile
  }), [investments, profile]);

  const investmentPrompt = "Faça uma análise crítica detalhada da minha carteira de investimentos atual. Mapeie a alocação de ativos (ex: Renda Fixa vs Ações vs Outros), identifique riscos de diversificação (concentração em poucos papéis), comente sobre a adequação ao meu perfil de risco declarado (ex: conservador, moderado ou arrojado) e dê sugestões concretas de alocação ou rebalanceamento baseadas nas taxas e cenários de mercado atuais no Brasil. Mantenha um tom profissional e didático de analista CNPI ou consultor financeiro sênior.";

  return (
    <div className="investments-container">
      <div className="section-header flex-between flex-center-y">
        <div>
          <h1>Central de Investimentos</h1>
          <p>Acompanhe o rendimento real dos seus ativos e projete sua independência financeira.</p>
        </div>
        
        <div className="flex-center-y gap-md">
          <button className="ai-diagnostics-float-btn" onClick={() => setIsDrawerOpen(true)}>
            <Sparkles size={16} />
            Diagnóstico de IA
          </button>

          <div className="subtab-selector flex-center-y">
            <button 
              className={`btn subtab-btn ${activeSubTab === 'planner' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('planner')}
            >
              <Compass size={16} style={{ marginRight: 6 }} />
              Planejamento (Iniciante)
            </button>
            <button 
              className={`btn subtab-btn ${activeSubTab === 'advisor' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('advisor')}
            >
              <LineChart size={16} style={{ marginRight: 6 }} />
              Análise e Consultor (Avançado)
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'planner' ? (
        <InvestmentPlanner 
          investmentGoal={investmentGoal} 
          setInvestmentGoal={setInvestmentGoal} 
        />
      ) : (
        <InvestmentAdvisor 
          investments={investments} 
          onAdd={addInvestment} 
          onDelete={deleteInvestment} 
        />
      )}

      <AIDiagnosticsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Diagnóstico de Carteira com IA"
        systemPrompt={investmentPrompt}
        contextSummary={contextSummary}
        jwtToken={jwtToken}
      />
    </div>
  );
};

export default InvestmentDashboard;

