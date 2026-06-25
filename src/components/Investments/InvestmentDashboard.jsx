import React, { useContext, useState } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Compass, LineChart } from 'lucide-react';
import InvestmentPlanner from './InvestmentPlanner';
import InvestmentAdvisor from './InvestmentAdvisor';

const InvestmentDashboard = () => {
  const { 
    investments, 
    addInvestment, 
    deleteInvestment, 
    investmentGoal, 
    setInvestmentGoal 
  } = useContext(FinanceContext);

  const [activeSubTab, setActiveSubTab] = useState('advisor'); // 'planner' or 'advisor'

  return (
    <div className="investments-container">
      <div className="section-header flex-between">
        <div>
          <h1>Central de Investimentos</h1>
          <p>Acompanhe o rendimento real dos seus ativos e projete sua independência financeira.</p>
        </div>
        
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
    </div>
  );
};

export default InvestmentDashboard;
