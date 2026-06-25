import React, { useState, useContext } from 'react';
import { Plus, Trash2, LineChart, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { 
  calculateAverageYield, 
  calculateRealYield, 
  projectFutureValue, 
  formatBRL,
  fetchAssetPrice
} from '../../utils/financeUtils';
import { FinanceContext } from '../../context/FinanceContext';

const InvestmentAdvisor = ({ investments, onAdd, onDelete }) => {
  const { profile, updateInvestmentPrices } = useContext(FinanceContext);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Renda Fixa');
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [yieldRate, setYieldRate] = useState('');
  const [ipcaCoverage, setIpcaCoverage] = useState(false);

  // Projection states
  const [monthlyAporte, setMonthlyAporte] = useState(1000);
  const [projectionYears, setProjectionYears] = useState(5);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !quantity || !averagePrice || !currentPrice || !yieldRate) return;

    onAdd({
      name,
      type,
      quantity: parseFloat(quantity),
      averagePrice: parseFloat(averagePrice),
      currentPrice: parseFloat(currentPrice),
      yieldRate: parseFloat(yieldRate),
      buyDate: new Date().toISOString().split('T')[0],
      ipcaCoverage
    });

    setName('');
    setType('Renda Fixa');
    setQuantity('');
    setAveragePrice('');
    setCurrentPrice('');
    setYieldRate('');
    setIpcaCoverage(false);
    setShowForm(false);
  const [updatingPrices, setUpdatingPrices] = useState(false);

  const handleUpdatePrices = async () => {
    if (investments.length === 0) return;
    setUpdatingPrices(true);
    const priceMap = {};
    for (let inv of investments) {
      try {
        const newPrice = await fetchAssetPrice(inv.name, inv.type, inv.currentPrice || inv.value);
        priceMap[inv.id] = newPrice;
      } catch (err) {
        console.error("Failed to update price for", inv.name, err);
      }
    }
    updateInvestmentPrices(priceMap);
    setUpdatingPrices(false);
  };

  const ipcaRate = 4.5; // Simulated annual inflation rate (%)
  const totalValue = investments.reduce((acc, curr) => acc + curr.value, 0);
  const averageYield = calculateAverageYield(investments, totalValue);
  const realYield = calculateRealYield(averageYield, ipcaRate);

  const projectedWorth = projectFutureValue(
    totalValue, 
    monthlyAporte, 
    averageYield, 
    projectionYears
  );

  // Task 2: Advanced Asset Allocation Targets
  const ALLOCATION_TARGETS = {
    'Conservador': { 'Renda Fixa': 85, 'FII': 10, 'Ações': 5, 'Cripto': 0 },
    'Moderado':    { 'Renda Fixa': 50, 'FII': 25, 'Ações': 20, 'Cripto': 5 },
    'Arrojado':    { 'Renda Fixa': 20, 'FII': 20, 'Ações': 50, 'Cripto': 10 }
  };

  const actualAllocation = { 'Renda Fixa': 0, 'Ações': 0, 'FII': 0, 'Cripto': 0 };
  investments.forEach(inv => {
    let classType = inv.type;
    if (classType === 'Criptomoedas' || classType === 'Cripto') classType = 'Cripto';
    if (classType === 'FII (Fundo Imobiliário)' || classType === 'FII') classType = 'FII';
    
    if (actualAllocation[classType] !== undefined) {
      actualAllocation[classType] += inv.value;
    }
  });

  const actualPct = {};
  Object.keys(actualAllocation).forEach(key => {
    actualPct[key] = totalValue > 0 ? (actualAllocation[key] / totalValue) * 100 : 0;
  });

  const targets = ALLOCATION_TARGETS[profile] || ALLOCATION_TARGETS['Conservador'];
  const recommendations = Object.keys(targets).map(classType => {
    const targetPct = targets[classType];
    const currentPct = actualPct[classType] || 0;
    const targetVal = (targetPct / 100) * totalValue;
    const diffVal = targetVal - (actualAllocation[classType] || 0); // Positivo: comprar, Negativo: vender
    
    return {
      classType,
      targetPct,
      currentPct,
      diffVal
    };
  });

  const getProgressBarColor = (classType) => {
    switch (classType) {
      case 'Renda Fixa': return 'linear-gradient(90deg, var(--success-color) 0%, #34d399 100%)';
      case 'Ações': return 'linear-gradient(90deg, var(--accent-color) 0%, #60a5fa 100%)';
      case 'FII': return 'linear-gradient(90deg, var(--warning-color) 0%, #fbbf24 100%)';
      case 'Cripto': return 'linear-gradient(90deg, var(--danger-color) 0%, #f87171 100%)';
      default: return 'var(--accent-color)';
    }
  };

  return (
    <div className="advisor-grid animate-fade-in flex-column gap-lg">
      {/* Header Stats */}
      <div className="advisor-stats-cards">
        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Total sob Custódia</span>
            <h2 className="val amount-secondary">{formatBRL(totalValue)}</h2>
          </div>
          <TrendingUp className="text-success" size={24} />
        </div>

        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Rendimento Médio Nominal</span>
            <h2 className="val text-success amount-secondary">{averageYield.toFixed(2)}% a.a.</h2>
          </div>
          <LineChart className="text-success" size={24} />
        </div>

        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Rendimento Real (IPCA Descontado)</span>
            <h2 className={`val amount-secondary ${realYield >= 0 ? 'text-success' : 'text-danger'}`}>
              {realYield.toFixed(2)}% a.a.
            </h2>
          </div>
          <div className="real-yield-indicator flex-column text-right">
            <span className="text-xxs text-secondary">Inflação: {ipcaRate}%</span>
          </div>
        </div>
      </div>

      <div className="advisor-panels-grid">
        {/* Active Assets List */}
        <div className="card details-card main-col">
          <div className="flex-between flex-center-y mb-md">
            <h3>Carteira de Ativos</h3>
            <div className="flex-center-y gap-sm">
              <button 
                className="btn btn-secondary btn-sm flex-center" 
                onClick={handleUpdatePrices} 
                disabled={updatingPrices || investments.length === 0}
              >
                <RefreshCw size={14} className={updatingPrices ? 'animate-spin' : ''} style={{ marginRight: 6 }} />
                {updatingPrices ? 'Atualizando...' : 'Atualizar Cotações'}
              </button>
              <button className="btn btn-primary btn-sm flex-center" onClick={() => setShowForm(!showForm)}>
                <Plus size={14} style={{ marginRight: 4 }} />
                Novo Ativo
              </button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="card form-card mb-md animate-slide-down">
              <h4>Adicionar Ativo à Carteira</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="inv-name">Nome do Ativo</label>
                  <input 
                    id="inv-name"
                    type="text" 
                    placeholder="Ex: Ações WEGE3, Tesouro IPCA" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="inv-type">Tipo de Ativo</label>
                  <select id="inv-type" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Renda Fixa">Renda Fixa</option>
                    <option value="Ações">Ações</option>
                    <option value="FII">FII (Fundo Imobiliário)</option>
                    <option value="Cripto">Criptomoedas</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="inv-quantity">Quantidade</label>
                  <input 
                    id="inv-quantity"
                    type="number" 
                    step="0.0001" 
                    placeholder="0" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="inv-averagePrice">Preço Médio de Compra</label>
                  <input 
                    id="inv-averagePrice"
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={averagePrice} 
                    onChange={(e) => setAveragePrice(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="inv-currentPrice">Cotação Atual</label>
                  <input 
                    id="inv-currentPrice"
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={currentPrice} 
                    onChange={(e) => setCurrentPrice(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="inv-yield">Rendimento Estimado (% a.a.)</label>
                  <input 
                    id="inv-yield"
                    type="number" 
                    step="0.01" 
                    placeholder="Ex: 11.5" 
                    value={yieldRate} 
                    onChange={(e) => setYieldRate(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group checkbox-group flex-center-y">
                  <input 
                    id="inv-ipca"
                    type="checkbox" 
                    checked={ipcaCoverage} 
                    onChange={(e) => setIpcaCoverage(e.target.checked)} 
                  />
                  <label htmlFor="inv-ipca">Ativo com proteção IPCA (ex: IPCA+6%)</label>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-sm">Salvar Ativo</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          )}

          <div className="table-responsive">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Classe</th>
                  <th className="text-right">Qtd</th>
                  <th className="text-right">P. Médio</th>
                  <th className="text-right">Cotação</th>
                  <th className="text-right">Custo Total</th>
                  <th className="text-right">Valor Atual</th>
                  <th className="text-right">Lucro/Prejuízo</th>
                  <th className="text-right">Rend. Nom.</th>
                  <th>Custo Oportunidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {investments.map(inv => {
                  const opportunityDiff = inv.yieldRate - ipcaRate;
                  const qty = inv.quantity !== undefined ? inv.quantity : 1;
                  const avgPrice = inv.averagePrice !== undefined ? inv.averagePrice : inv.value;
                  const currPrice = inv.currentPrice !== undefined ? inv.currentPrice : inv.value;
                  const totalCost = qty * avgPrice;
                  const currentValue = qty * currPrice;
                  const profitLoss = currentValue - totalCost;
                  const yieldPct = avgPrice > 0 ? ((currPrice - avgPrice) / avgPrice) * 100 : 0;

                  return (
                    <tr key={inv.id}>
                      <td className="font-semibold">{inv.name}</td>
                      <td>
                        <span className="category-tag text-xs font-semibold">{inv.type}</span>
                      </td>
                      <td className="text-right">{qty}</td>
                      <td className="text-right">{formatBRL(avgPrice)}</td>
                      <td className="text-right">{formatBRL(currPrice)}</td>
                      <td className="text-right font-semibold">{formatBRL(totalCost)}</td>
                      <td className="text-right font-semibold">{formatBRL(currentValue)}</td>
                      <td className={`text-right font-semibold ${profitLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatBRL(profitLoss)}
                      </td>
                      <td className={`text-right font-semibold ${yieldPct >= 0 ? 'text-success' : 'text-danger'}`}>
                        {yieldPct >= 0 ? '+' : ''}{yieldPct.toFixed(2)}%
                      </td>
                      <td>
                        <span className={`text-xs ${opportunityDiff >= 0 ? 'text-success' : 'text-danger'}`}>
                          {opportunityDiff >= 0 ? '+' : ''}{opportunityDiff.toFixed(2)}% vs IPCA
                        </span>
                        {inv.ipcaCoverage && <span className="text-xxs text-secondary block">Proteção IPCA</span>}
                      </td>
                      <td>
                        <button 
                          className="delete-icon-btn" 
                          onClick={() => {
                            if (confirm(`Remover ativo ${inv.name}?`)) {
                              onDelete(inv.id);
                            }
                          }}
                          title="Remover Ativo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {investments.length === 0 && (
                  <tr>
                    <td colSpan="11" className="empty-table-cell">Nenhum ativo cadastrado na carteira.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side panels container */}
        <div className="side-col flex-column gap-lg">
          {/* Allocation Advisor Panel */}
          <div className="card details-card">
            <h3>Alocação e Rebalanceamento</h3>
            <p className="card-subtext mb-md">Monitore a distribuição de ativos recomendada pelo consultor.</p>
            
            {!profile ? (
              <div className="alert-message warning-alert flex-column gap-xs p-md" style={{ background: 'var(--warning-bg)', borderLeft: '3px solid var(--warning-color)', borderRadius: 'var(--border-radius-sm)' }}>
                <div className="flex-center-y text-warning font-semibold text-xs">
                  <AlertTriangle size={16} style={{ marginRight: 6 }} />
                  Perfil não configurado
                </div>
                <p className="text-secondary text-xxs" style={{ lineHeight: '1.4' }}>
                  Você ainda não definiu seu perfil de investidor. Vá para a aba <strong>Planejamento (Iniciante)</strong> para realizar o teste de perfil e habilitar recomendações inteligentes.
                </p>
              </div>
            ) : (
              <div className="flex-column gap-md">
                <div className="profile-badge-container flex-between flex-center-y">
                  <span className="text-xs text-secondary">Perfil de Investidor:</span>
                  <span className="badge font-bold text-success text-xs" style={{ background: 'var(--success-bg)', padding: '2px 8px', borderRadius: 12 }}>{profile}</span>
                </div>
                
                <div className="allocation-list flex-column gap-sm">
                  {recommendations.map(r => (
                    <div key={r.classType} className="allocation-item">
                      <div className="flex-between text-xxs font-semibold mb-xxs">
                        <span>{r.classType}</span>
                        <span className="text-secondary">
                          {r.currentPct.toFixed(1)}% / Ideal {r.targetPct}%
                        </span>
                      </div>
                      <div className="progress-bar-container" style={{ marginTop: 0 }}>
                        <div 
                          className="progress-bar-fill" 
                          style={{ 
                            width: `${Math.min(r.currentPct, 100)}%`, 
                            background: getProgressBarColor(r.classType) 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rebalancing-recommendations mt-md border-top pt-md">
                  <h4 className="text-xs font-semibold mb-sm">Sugestões de Ajuste</h4>
                  {recommendations.filter(r => Math.abs(r.diffVal) > 100).length === 0 ? (
                    <p className="text-xxs text-secondary italic">Sua carteira está perfeitamente balanceada de acordo com seu perfil.</p>
                  ) : (
                    <div className="flex-column gap-xs">
                      {recommendations.filter(r => Math.abs(r.diffVal) > 100).map(r => (
                        <div 
                          key={r.classType} 
                          className="rebalance-alert-card p-sm flex-column" 
                          style={{ 
                            background: 'rgba(255, 255, 255, 0.02)', 
                            borderRadius: 'var(--border-radius-sm)', 
                            borderLeft: `3px solid ${r.diffVal > 0 ? 'var(--success-color)' : 'var(--warning-color)'}` 
                          }}
                        >
                          <span className="font-bold text-xxs" style={{ color: r.diffVal > 0 ? 'var(--success-color)' : 'var(--warning-color)' }}>
                            {r.diffVal > 0 ? 'COMPRAR' : 'VENDER'}
                          </span>
                          <span className="text-secondary mt-xxs" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
                            {r.diffVal > 0 
                              ? `Aporte ${formatBRL(r.diffVal)} em ${r.classType} para atingir a meta de ${r.targetPct}% (atualmente ${r.currentPct.toFixed(1)}%).`
                              : `Venda ${formatBRL(Math.abs(r.diffVal))} de ${r.classType} para readequar à meta de ${r.targetPct}% (atualmente ${r.currentPct.toFixed(1)}%).`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Compound Interest Simulator Panel */}
          <div className="card details-card">
            <h3>Simulador de Independência</h3>
            <p className="card-subtext mb-md">Simule aportes mensais rendendo à taxa média de sua carteira ({averageYield.toFixed(2)}% a.a.).</p>
            
            <div className="simulator-controls flex-column gap-sm">
              <div className="form-group">
                <label htmlFor="sim-aporte">Aporte Mensal (R$)</label>
                <input 
                  id="sim-aporte"
                  type="number" 
                  value={monthlyAporte} 
                  onChange={(e) => setMonthlyAporte(parseFloat(e.target.value) || 0)} 
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="sim-years">Período (Anos)</label>
                <input 
                  id="sim-years"
                  type="number" 
                  value={projectionYears} 
                  onChange={(e) => setProjectionYears(parseInt(e.target.value) || 0)} 
                />
              </div>
            </div>

            <div className="projection-result-box mt-lg">
              <span className="label text-secondary text-xs">Patrimônio Projetado</span>
              <h2 className="val amount-primary text-success">{formatBRL(projectedWorth)}</h2>
              <span className="text-xxs text-secondary">
                Aportes totais: {formatBRL(totalValue + monthlyAporte * projectionYears * 12)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentAdvisor;
