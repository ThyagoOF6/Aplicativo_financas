import React, { useContext, useMemo, useState, useEffect } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { 
  FileText, 
  ShieldAlert, 
  Award, 
  Stethoscope, 
  GraduationCap, 
  CheckCircle, 
  Calculator, 
  Sparkles, 
  Calendar, 
  HelpCircle, 
  ArrowRight, 
  TrendingUp, 
  User, 
  Wallet, 
  Percent, 
  ShieldCheck 
} from 'lucide-react';
import { formatBRL } from '../../utils/financeUtils';
import AIDiagnosticsDrawer from '../layout/AIDiagnosticsDrawer';
import './TaxAssistant.css';

const TaxAssistant = () => {
  const { 
    transactions, 
    dependents, 
    investments, 
    jwtToken, 
    addReminder, 
    reminders 
  } = useContext(FinanceContext);
  
  const [activeTab, setActiveTab] = useState('general');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Diagnóstico Fiscal com IA');
  const [activePrompt, setActivePrompt] = useState('');
  
  // File upload states for audit
  const [taxDeclarationText, setTaxDeclarationText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  
  // Custom IA question state
  const [customQuestion, setCustomQuestion] = useState('');

  // 1. Get deductible transactions from context
  const deductibleTransactions = useMemo(() => {
    return transactions.filter(t => t.isTaxDeductible && t.type === 'expense');
  }, [transactions]);

  // Breakdown by category from context
  const healthDeductibles = useMemo(() => deductibleTransactions.filter(t => t.category === 'Saúde'), [deductibleTransactions]);
  const educationDeductibles = useMemo(() => deductibleTransactions.filter(t => t.category === 'Educação'), [deductibleTransactions]);
  const otherDeductibles = useMemo(() => deductibleTransactions.filter(t => t.category !== 'Saúde' && t.category !== 'Educação'), [deductibleTransactions]);

  const totalHealth = useMemo(() => healthDeductibles.reduce((acc, curr) => acc + curr.amount, 0), [healthDeductibles]);
  const totalEducation = useMemo(() => educationDeductibles.reduce((acc, curr) => acc + curr.amount, 0), [educationDeductibles]);
  const totalOther = useMemo(() => otherDeductibles.reduce((acc, curr) => acc + curr.amount, 0), [otherDeductibles]);
  const totalDeductibleFromContext = totalHealth + totalEducation + totalOther;

  // Calculate annual income from context
  const totalAnnualIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // --- Interactive Simulator States ---
  // Defaults: if user has income in context, use it. Otherwise default to R$ 80,000 for demonstration.
  const [simTaxableIncome, setSimTaxableIncome] = useState(80000);
  const [simPgblContribution, setSimPgblContribution] = useState(0);
  const [simDependentsCount, setSimDependentsCount] = useState(dependents.length);
  const [simHealthExpenses, setSimHealthExpenses] = useState(0);
  const [simEducationExpenses, setSimEducationExpenses] = useState(0);

  // Sync simulator inputs with actual context values on load / update
  useEffect(() => {
    if (totalAnnualIncome > 0) setSimTaxableIncome(totalAnnualIncome);
  }, [totalAnnualIncome]);

  useEffect(() => {
    setSimDependentsCount(dependents.length);
  }, [dependents]);

  useEffect(() => {
    setSimHealthExpenses(totalHealth);
  }, [totalHealth]);

  useEffect(() => {
    setSimEducationExpenses(totalEducation);
  }, [totalEducation]);

  // Brazilian IRPF progressive tax table calculation
  const calculateEstimatedTax = (taxableBase) => {
    if (taxableBase <= 27110.40) {
      return { tax: 0, rate: 0, deduction: 0 };
    } else if (taxableBase <= 33919.80) {
      return { tax: (taxableBase * 0.075) - 2033.28, rate: 7.5, deduction: 2033.28 };
    } else if (taxableBase <= 45012.60) {
      return { tax: (taxableBase * 0.15) - 4577.28, rate: 15, deduction: 4577.28 };
    } else if (taxableBase <= 55976.16) {
      return { tax: (taxableBase * 0.225) - 7953.24, rate: 22.5, deduction: 7953.24 };
    } else {
      return { tax: (taxableBase * 0.275) - 10752.00, rate: 27.5, deduction: 10752.00 };
    }
  };

  // --- Reactive Simulator Calculations ---
  // A. Modelo Simplificado
  const simplifiedDiscount = useMemo(() => {
    return Math.min(simTaxableIncome * 0.20, 16754.34);
  }, [simTaxableIncome]);

  const simplifiedBase = useMemo(() => {
    return Math.max(0, simTaxableIncome - simplifiedDiscount);
  }, [simTaxableIncome, simplifiedDiscount]);

  const simplifiedTaxResult = useMemo(() => {
    return calculateEstimatedTax(simplifiedBase);
  }, [simplifiedBase]);

  const simplifiedTax = simplifiedTaxResult.tax;

  // B. Modelo Completo (Deduções Legais)
  // Dependents deduction: R$ 2.275,08 per dependent
  const dependentsDeduction = useMemo(() => {
    return simDependentsCount * 2275.08;
  }, [simDependentsCount]);

  // Education deduction: capped at R$ 3.561,50 per person (User + Dependents)
  const maxEducationCap = useMemo(() => {
    return (1 + simDependentsCount) * 3561.50;
  }, [simDependentsCount]);

  const educationDeduction = useMemo(() => {
    return Math.min(simEducationExpenses, maxEducationCap);
  }, [simEducationExpenses, maxEducationCap]);

  // Health expenses are fully deductible
  const healthDeduction = simHealthExpenses;

  // PGBL: capped at 12% of gross taxable income
  const maxPgblDeductionCap = useMemo(() => {
    return simTaxableIncome * 0.12;
  }, [simTaxableIncome]);

  const pgblDeduction = useMemo(() => {
    return Math.min(simPgblContribution, maxPgblDeductionCap);
  }, [simPgblContribution, maxPgblDeductionCap]);

  const totalDeductions = useMemo(() => {
    return dependentsDeduction + educationDeduction + healthDeduction + pgblDeduction;
  }, [dependentsDeduction, educationDeduction, healthDeduction, pgblDeduction]);

  const completeBase = useMemo(() => {
    return Math.max(0, simTaxableIncome - totalDeductions);
  }, [simTaxableIncome, totalDeductions]);

  const completeTaxResult = useMemo(() => {
    return calculateEstimatedTax(completeBase);
  }, [completeBase]);

  const completeTax = completeTaxResult.tax;

  // Recommendation comparison
  const isCompleteFormRecommended = completeTax < simplifiedTax;
  const taxDifference = Math.abs(simplifiedTax - completeTax);

  // PGBL Optimization Strategy
  const remainingPgblContribution = useMemo(() => {
    return Math.max(0, maxPgblDeductionCap - simPgblContribution);
  }, [maxPgblDeductionCap, simPgblContribution]);

  const pgblPotentialSavings = useMemo(() => {
    if (remainingPgblContribution <= 0) return 0;
    // Calculate new complete tax if user maxes out PGBL contribution
    const maxDeductions = dependentsDeduction + educationDeduction + healthDeduction + maxPgblDeductionCap;
    const maxCompleteBase = Math.max(0, simTaxableIncome - maxDeductions);
    const maxCompleteTax = calculateEstimatedTax(maxCompleteBase).tax;
    return Math.max(0, completeTax - maxCompleteTax);
  }, [remainingPgblContribution, completeTax, dependentsDeduction, educationDeduction, healthDeduction, maxPgblDeductionCap, simTaxableIncome]);

  // Context summary to pass to the AI drawer
  const contextSummary = useMemo(() => ({
    overview: {
      totalDeductiblesValue: totalDeductibleFromContext,
      dependentsCount: dependents.length,
      annualIncomeFromContext: totalAnnualIncome
    },
    taxDeductibles: deductibleTransactions.map(t => ({
      description: t.description,
      amount: t.amount,
      category: t.category,
      date: t.date
    })),
    dependents: dependents.map(d => ({ name: d.name, relation: d.relation, age: d.age }))
  }), [deductibleTransactions, dependents, totalDeductibleFromContext, totalAnnualIncome]);

  // AI Prompt Builders
  const handleGeneralDiagnosticsClick = () => {
    setDrawerTitle("Diagnóstico Fiscal com IA");
    setActivePrompt(
      `Faça uma análise rigorosa do meu cenário de deduções fiscais atuais baseado nos lançamentos da carteira. 
      Total deduzido em lançamentos reais: ${formatBRL(totalDeductibleFromContext)}.
      Número de dependentes cadastrados: ${dependents.length}.
      Renda calculada nas receitas: ${formatBRL(totalAnnualIncome)}.
      
      Compare se esse montante compensa a Declaração Completa do IRPF frente ao Desconto Simplificado (limite de R$ 16.754,34). 
      Comente especificamente sobre despesas médicas, educação, previdência (PGBL) e dependentes. 
      Mantenha o tom de contador sênior, apresentando sugestões práticas em listas ou tabelas.`
    );
    setIsDrawerOpen(true);
  };

  const handleAuditClick = () => {
    if (!taxDeclarationText) return;
    setDrawerTitle("Auditoria Patrimonial com IA");
    setActivePrompt(
      `Compare a minha declaração de IRPF do ano anterior (cujo XML/texto segue em anexo) com o meu contexto de contas e investimentos deste ano.
      
      Declaração do Ano Anterior:
      ---
      ${taxDeclarationText}
      ---
      
      Por favor, identifique e descreva inconsistências patrimoniais como:
      1. Bens ou ativos que constavam na declaração anterior mas não aparecem nas contas/carteira atuais (verifique se houve venda não declarada).
      2. Ativos comprados este ano que não estavam listados no ano anterior.
      3. Análise da evolução patrimonial e dicas de como organizar os campos para a declaração atual.
      Dê recomendações contábeis estruturadas.`
    );
    setIsDrawerOpen(true);
  };

  const handleDarfClick = () => {
    setDrawerTitle("Guia de Emissão de DARF");
    setActivePrompt(
      `Gere um guia passo a passo completo e detalhado para emissão de DARF no Sicalc da Receita Federal.
      Considere o volume de vendas de ações no mês atual: ${formatBRL(monthlySalesValue)}.
      Considere as seguintes regras oficiais brasileiras:
      - Vendas de ações comuns na B3 até R$ 20.000 no mês são isentas de ganho de capital. Acima disso, alíquota de 15% sobre o lucro líquido (código de arrecadação 6015).
      - Vendas de Fundos Imobiliários (FII) e ETFs de Fundos Imobiliários não têm isenção de R$ 20k, a alíquota é de 20% sobre o lucro (código 6015).
      - Day trade tem alíquota de 20% sobre qualquer ganho.
      Explique detalhadamente como o usuário calcula o preço médio de compra, desconta taxas de corretagem e liquidação, compensa prejuízos de meses anteriores e emite a guia de pagamento.`
    );
    setIsDrawerOpen(true);
  };

  const handleAskContadorIA = () => {
    if (!customQuestion.trim()) return;
    setDrawerTitle("Consultoria Fiscal - Contador IA");
    setActivePrompt(
      `O usuário está simulando seu Imposto de Renda (IRPF 2026) e tem uma dúvida contábil/fiscal específica.
      
      Dados Atuais do Simulador IRPF do Usuário:
      - Renda Tributável Anual Simulada: ${formatBRL(simTaxableIncome)}
      - Dependentes: ${simDependentsCount}
      - Gastos Médicos Simulados: ${formatBRL(simHealthExpenses)}
      - Gastos com Educação Simulados: ${formatBRL(simEducationExpenses)} (Cap de dedução individual: R$ 3.561,50)
      - Contribuição PGBL Simulada: ${formatBRL(simPgblContribution)} (Limite dedutível de 12%: ${formatBRL(maxPgblDeductionCap)})
      
      Resultado Simulado:
      - Imposto Estimado Simplificado: ${formatBRL(simplifiedTax)} (Alíquota efetiva: ${((simplifiedTax / (simTaxableIncome || 1)) * 100).toFixed(1)}%)
      - Imposto Estimado Completo: ${formatBRL(completeTax)} (Alíquota efetiva: ${((completeTax / (simTaxableIncome || 1)) * 100).toFixed(1)}%)
      - Modelo Recomendado: Declaração ${isCompleteFormRecommended ? 'Completa' : 'Simplificada'} (Economia de ${formatBRL(taxDifference)})
      
      Dúvida do Usuário:
      "${customQuestion}"
      
      Por favor, atue como um contador sênior brasileiro e planejador tributário certificado. Dê uma resposta precisa, didática, amigável e adaptada a esta simulação e à legislação brasileira da Receita Federal.`
    );
    setIsDrawerOpen(true);
  };

  const handleTaxDeclarationUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setTaxDeclarationText(event.target.result.substring(0, 45000));
    };
    reader.readAsText(file);
  };

  // Capital gains sales calculator
  const monthlySalesValue = useMemo(() => {
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

  // Reminders Helper
  const isReminderScheduled = (description) => {
    return reminders && reminders.some(r => r.description.toLowerCase() === description.toLowerCase());
  };

  const handleScheduleReminder = (title, frequency, type) => {
    const now = new Date();
    let dateStr = "";
    
    if (frequency === 'monthly') {
      // Last business-like day of current month
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay - 1}`;
    } else if (type === 'pgbl') {
      // December 20th of current year
      dateStr = `${now.getFullYear()}-12-20`;
    } else if (type === 'irpf') {
      // May 15th (middle of tax season)
      dateStr = `${now.getFullYear()}-05-15`;
    }

    addReminder({
      description: title,
      amount: 0,
      date: dateStr,
      priority: 'important',
      paid: false
    });
  };

  return (
    <div className="taxes-container">
      {/* Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Planejador Fiscal & IRPF</h1>
          <p>Faça simulações, organize seus comprovantes dedutíveis e consulte nosso Contador IA.</p>
        </div>
        <button className="ai-diagnostics-float-btn" onClick={handleGeneralDiagnosticsClick}>
          <Sparkles size={16} />
          Diagnóstico de IA
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="taxes-tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <Wallet size={16} />
          Painel Geral
        </button>
        <button 
          className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <Calculator size={16} />
          Simulador IRPF & PGBL
        </button>
        <button 
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={16} />
          Agenda & Auditoria
        </button>
      </div>

      {/* Tab contents */}
      {activeTab === 'general' && (
        <div className="taxes-split-grid">
          {/* Left Column: Deductible Analysis */}
          <div className="left-panel flex-column gap-lg">
            {/* Recommendation Box */}
            <div className={`card recommendation-card ${isCompleteFormRecommended ? 'border-success' : 'border-accent'}`}>
              <div className="card-header flex-center-y">
                <Calculator className="text-accent" size={24} style={{ marginRight: 12 }} />
                <h3>Recomendação da Declaração</h3>
              </div>
              <div className="card-body">
                <p className="recommendation-text">
                  Com base nas suas despesas dedutíveis da carteira de <strong>{formatBRL(totalDeductibleFromContext)}</strong>:
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
                    ? `Suas despesas dedutíveis atuais de ${formatBRL(totalDeductibleFromContext)} são vantajosas frente ao desconto simplificado estimado. A declaração Completa é a melhor opção.`
                    : `Seus lançamentos dedutíveis atuais ainda não compensam a declaração Completa frente ao desconto simplificado. Continue lançando recibos de saúde e educação!`}
                </p>
              </div>
            </div>

            {/* Deductibles Breakdown */}
            <div className="card details-card">
              <h3>Deduções Lançadas por Categoria</h3>
              <div className="deductible-breakdown-list">
                <div className="breakdown-item flex-between flex-center-y">
                  <div className="flex-center-y">
                    <div className="icon-circle health-color flex-center">
                      <Stethoscope size={18} className="text-danger" />
                    </div>
                    <div>
                      <p className="breakdown-title">Despesas Médicas</p>
                      <p className="breakdown-subtitle text-xs text-secondary">{healthDeductibles.length} recibos salvos</p>
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
                      <p className="breakdown-subtitle text-xs text-secondary">{educationDeductibles.length} recibos salvos</p>
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
                      <p className="breakdown-title">Previdência & Outras Deduções</p>
                      <p className="breakdown-subtitle text-xs text-secondary">{otherDeductibles.length} lançamentos</p>
                    </div>
                  </div>
                  <span className="breakdown-val font-semibold text-danger">{formatBRL(totalOther)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Capital Gains Tracker & Deductibles */}
          <div className="right-panel flex-column gap-lg">
            {/* Capital Gains Tracker */}
            <div className="card details-card">
              <h3>Vendas de Ações na Bolsa</h3>
              <p className="card-subtext mb-md">Monitore o limite de isenção de R$ 20.000,00 mensais em vendas de ações na B3 (XP/Clear/Rico).</p>
              
              <div className="tax-limit-progress">
                <div className="flex-between text-xs mb-sm">
                  <span>Vendas no mês atual</span>
                  <span className="font-bold">{formatBRL(monthlySalesValue)} / R$ 20.000,00</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className={`progress-bar-fill ${stockLimitPercent > 80 ? 'bg-danger' : 'bg-warning'}`} 
                    style={{ width: `${Math.min(stockLimitPercent, 100)}%` }}
                  ></div>
                </div>
                <div className="flex-between text-xxs text-secondary mt-xs">
                  <span>Isento de IRPF</span>
                  <span>{stockLimitPercent.toFixed(0)}% do limite utilizado</span>
                </div>
              </div>

              {stockLimitPercent > 80 && (
                <div className="alert-message warning-alert mt-md flex-center-y">
                  <ShieldAlert size={18} className="text-warning flex-shrink-0" style={{ marginRight: 8 }} />
                  <span className="text-xs">Atenção! Você está próximo de atingir o limite de isenção. Vendas acima de R$ 20 mil geram alíquota de 15% sobre o lucro total.</span>
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
      )}

      {activeTab === 'simulator' && (
        <div className="simulator-layout">
          {/* Inputs Column */}
          <div className="sim-inputs-col card flex-column gap-md">
            <h3>Parâmetros de Simulação</h3>
            <p className="card-subtext">Ajuste os valores para simular o impacto tributário do IRPF e planejar aportes de Previdência PGBL.</p>
            
            <div className="sim-form-grid">
              {/* Renda Tributável Anual */}
              <div className="sim-input-group">
                <div className="sim-input-header">
                  <span className="sim-input-label">Renda Tributável Anual</span>
                  <span className="badge badge-accent text-xs font-bold">{formatBRL(simTaxableIncome)}</span>
                </div>
                <p className="sim-input-desc">Salários, pró-labore, aluguéis recebidos, pensões e prestação de serviços.</p>
                <div className="sim-slider-container">
                  <input 
                    type="range" 
                    className="sim-range-slider" 
                    min="15000" 
                    max="300000" 
                    step="5000" 
                    value={simTaxableIncome} 
                    onChange={(e) => setSimTaxableIncome(parseInt(e.target.value))}
                  />
                </div>
                <div className="sim-input-wrapper">
                  <span className="sim-input-prefix">R$</span>
                  <input 
                    type="number" 
                    className="sim-input-field" 
                    value={simTaxableIncome} 
                    onChange={(e) => setSimTaxableIncome(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
              </div>

              {/* Contribuição PGBL */}
              <div className="sim-input-group">
                <div className="sim-input-header">
                  <span className="sim-input-label">Contribuições para Previdência PGBL</span>
                  <span className="badge badge-accent text-xs font-bold">{formatBRL(simPgblContribution)}</span>
                </div>
                <p className="sim-input-desc">Planos de Previdência PGBL (limitado a 12% da renda bruta). VGBL não deduz.</p>
                <div className="sim-slider-container">
                  <input 
                    type="range" 
                    className="sim-range-slider" 
                    min="0" 
                    max={Math.max(1000, simTaxableIncome * 0.20)} 
                    step="500" 
                    value={simPgblContribution} 
                    onChange={(e) => setSimPgblContribution(parseInt(e.target.value))}
                  />
                  <span className="slider-pct-indicator">
                    {((simPgblContribution / (simTaxableIncome || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="sim-input-wrapper">
                  <span className="sim-input-prefix">R$</span>
                  <input 
                    type="number" 
                    className="sim-input-field" 
                    value={simPgblContribution} 
                    onChange={(e) => setSimPgblContribution(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
              </div>

              {/* Dependentes */}
              <div className="sim-input-group">
                <div className="sim-input-header">
                  <span className="sim-input-label">Número de Dependentes</span>
                  <span className="font-semibold text-sm text-primary">{simDependentsCount}</span>
                </div>
                <p className="sim-input-desc">Abatimento de R$ 2.275,08 anual por dependente na declaração Completa.</p>
                <div className="sim-slider-container">
                  <input 
                    type="range" 
                    className="sim-range-slider" 
                    min="0" 
                    max="10" 
                    step="1" 
                    value={simDependentsCount} 
                    onChange={(e) => setSimDependentsCount(parseInt(e.target.value))}
                  />
                </div>
              </div>

              {/* Despesas Médicas */}
              <div className="sim-input-group">
                <div className="sim-input-header">
                  <span className="sim-input-label">Despesas Médicas</span>
                  <span className="badge badge-accent text-xs font-bold">{formatBRL(simHealthExpenses)}</span>
                </div>
                <p className="sim-input-desc">Consultas, exames, planos de saúde, dentistas, cirurgias. Sem limite anual.</p>
                <div className="sim-input-wrapper">
                  <span className="sim-input-prefix">R$</span>
                  <input 
                    type="number" 
                    className="sim-input-field" 
                    value={simHealthExpenses} 
                    onChange={(e) => setSimHealthExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
              </div>

              {/* Despesas de Educação */}
              <div className="sim-input-group">
                <div className="sim-input-header">
                  <span className="sim-input-label">Despesas de Educação</span>
                  <span className="badge badge-accent text-xs font-bold">{formatBRL(simEducationExpenses)}</span>
                </div>
                <p className="sim-input-desc">Escola, faculdade, pós-graduação. Capped em R$ 3.561,50 por dependente/titular.</p>
                <div className="sim-input-wrapper">
                  <span className="sim-input-prefix">R$</span>
                  <input 
                    type="number" 
                    className="sim-input-field" 
                    value={simEducationExpenses} 
                    onChange={(e) => setSimEducationExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
              </div>
            </div>

            {/* Direct Ask to AI Accountant */}
            <div className="question-box-card card mt-sm">
              <div className="flex-center-y gap-xs text-accent">
                <Sparkles size={16} />
                <h4>Pergunte ao Contador IA</h4>
              </div>
              <p className="text-xxs text-secondary leading-relaxed mt-xs">
                A IA analisará este cenário simulado em tempo real e responderá dúvidas contábeis sobre deduções ou previdência.
              </p>
              <div className="textarea-question-wrapper">
                <textarea 
                  className="textarea-question"
                  placeholder="Ex: Como declaro pensão alimentícia? Ou: Vale a pena mudar de PGBL para VGBL?"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                />
                <button 
                  className="btn btn-accent btn-sm w-full mt-xs flex-center-y gap-xs"
                  disabled={!customQuestion.trim()}
                  onClick={handleAskContadorIA}
                  style={{ justifyContent: 'center' }}
                >
                  <Sparkles size={12} />
                  Consultar Contador IA
                </button>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="sim-outputs-col flex-column gap-md">
            <div className="comparison-container">
              {/* Dynamic Comparison Cards */}
              <div className="comparison-cards-grid">
                
                {/* Card Simplificado */}
                <div className={`comparison-card ${!isCompleteFormRecommended ? 'highlighted' : ''}`}>
                  <span className={`comp-badge ${!isCompleteFormRecommended ? 'comp-badge-recommended' : 'comp-badge-standard'}`}>
                    {!isCompleteFormRecommended ? 'Recomendado' : 'Modelo Simplificado'}
                  </span>
                  <h4 className="comp-title">Desconto Simplificado</h4>
                  <div className="comp-values">
                    <div className="comp-row">
                      <span>Renda Tributável:</span>
                      <span>{formatBRL(simTaxableIncome)}</span>
                    </div>
                    <div className="comp-row">
                      <span>Desconto Padrão (20%):</span>
                      <span>-{formatBRL(simplifiedDiscount)}</span>
                    </div>
                    <div className="comp-row-highlight">
                      <span>Base de Cálculo:</span>
                      <span>{formatBRL(simplifiedBase)}</span>
                    </div>
                    <div className="comp-result-tax">
                      <span>Imposto Devido:</span>
                      <span className="comp-tax-val">{formatBRL(simplifiedTax)}</span>
                    </div>
                    <div className="comp-row text-xxs mt-xs">
                      <span>Alíquota Efetiva:</span>
                      <span>{((simplifiedTax / (simTaxableIncome || 1)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Card Completo */}
                <div className={`comparison-card ${isCompleteFormRecommended ? 'highlighted' : ''}`}>
                  <span className={`comp-badge ${isCompleteFormRecommended ? 'comp-badge-recommended' : 'comp-badge-standard'}`}>
                    {isCompleteFormRecommended ? 'Recomendado' : 'Deduções Legais'}
                  </span>
                  <h4 className="comp-title">Declaração Completa</h4>
                  <div className="comp-values">
                    <div className="comp-row">
                      <span>Renda Tributável:</span>
                      <span>{formatBRL(simTaxableIncome)}</span>
                    </div>
                    <div className="comp-row">
                      <span>Dependentes ({simDependentsCount}):</span>
                      <span>-{formatBRL(dependentsDeduction)}</span>
                    </div>
                    <div className="comp-row">
                      <span>Educação (Capped):</span>
                      <span>-{formatBRL(educationDeduction)}</span>
                    </div>
                    <div className="comp-row">
                      <span>Médico (Integral):</span>
                      <span>-{formatBRL(healthDeduction)}</span>
                    </div>
                    <div className="comp-row">
                      <span>Aportes PGBL:</span>
                      <span>-{formatBRL(pgblDeduction)}</span>
                    </div>
                    <div className="comp-row-highlight">
                      <span>Base de Cálculo:</span>
                      <span>{formatBRL(completeBase)}</span>
                    </div>
                    <div className="comp-result-tax">
                      <span>Imposto Devido:</span>
                      <span className="comp-tax-val">{formatBRL(completeTax)}</span>
                    </div>
                    <div className="comp-row text-xxs mt-xs">
                      <span>Alíquota Efetiva:</span>
                      <span>{((completeTax / (simTaxableIncome || 1)) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Savings Banner */}
              {taxDifference > 0 && (
                <div className="savings-banner">
                  <div className="savings-icon-wrapper">
                    <Percent size={20} />
                  </div>
                  <div className="savings-content">
                    <h4>Economia estimada de {formatBRL(taxDifference)}</h4>
                    <p>
                      Optando pelo modelo de <strong>{isCompleteFormRecommended ? 'Deduções Legais (Completa)' : 'Desconto Simplificado'}</strong>, você diminui sua carga tributária com base nos dados informados.
                    </p>
                  </div>
                </div>
              )}

              {/* PGBL Planner Card */}
              <div className="pgbl-optimization-card">
                <div className="pgbl-opt-header text-accent">
                  <TrendingUp size={18} />
                  <span className="font-bold text-xs">Otimização de Previdência PGBL</span>
                </div>
                <div className="pgbl-opt-body">
                  <p>
                    Contribuições para previdência privada do tipo PGBL permitem deduzir até 12% da sua renda bruta se você declarar no modelo completo.
                  </p>
                </div>
                <div className="pgbl-opt-stats">
                  <div className="pgbl-stat-box">
                    <span className="pgbl-stat-label">Limite Dedução (12%)</span>
                    <span className="pgbl-stat-value">{formatBRL(maxPgblDeductionCap)}</span>
                  </div>
                  <div className="pgbl-stat-box">
                    <span className="pgbl-stat-label">Aporte Atual Simulado</span>
                    <span className="pgbl-stat-value">{formatBRL(simPgblContribution)}</span>
                  </div>
                </div>

                {remainingPgblContribution > 0 ? (
                  <div className="pgbl-opt-body flex-column gap-xs mt-xs">
                    <p className="text-xs text-primary">
                      💡 Você pode aportar mais <strong>{formatBRL(remainingPgblContribution)}</strong> em PGBL até o final do ano fiscal.
                    </p>
                    {pgblPotentialSavings > 0 && (
                      <p className="text-xs text-success font-semibold">
                        📉 Esse aporte adicional geraria uma economia de imposto estimada de <strong>{formatBRL(pgblPotentialSavings)}</strong>!
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-success text-xs font-semibold flex-center-y gap-xs mt-xs">
                    <CheckCircle size={14} /> Você já maximizou o seu benefício fiscal do PGBL (12% da renda)!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="taxes-split-grid">
          {/* Left Column: Fiscal Calendar Obligations */}
          <div className="left-panel card">
            <div className="card-header flex-center-y gap-sm">
              <Calendar className="text-accent" size={20} />
              <h3>Calendário de Obrigações Fiscais</h3>
            </div>
            <p className="card-subtext mt-xs mb-md">Agende alertas automáticos na sua conta para não perder os prazos da Receita Federal e otimizações tributárias.</p>
            
            <div className="fiscal-timeline">
              {/* Obligation 1 */}
              <div className="timeline-item active">
                <div className="timeline-dot"></div>
                <div className="timeline-meta">
                  <span className="timeline-date">Mensal</span>
                  <span className="timeline-period-badge">Último dia útil</span>
                </div>
                <div className="timeline-body">
                  <div className="timeline-info">
                    <h4 className="timeline-title">Emissão de DARF de Bolsa (XP/B3)</h4>
                    <p className="timeline-desc">Calcular lucros e emitir guia DARF no Sicalc caso tenha excedido R$ 20k de vendas de ações ou alienado FIIs.</p>
                  </div>
                  {isReminderScheduled("Emitir e pagar DARF de ações/FIIs") ? (
                    <button className="timeline-btn-add added" disabled>
                      <CheckCircle size={12} /> Agendado
                    </button>
                  ) : (
                    <button 
                      className="timeline-btn-add"
                      onClick={() => handleScheduleReminder("Emitir e pagar DARF de ações/FIIs", "monthly", "darf")}
                    >
                      Agendar Alerta
                    </button>
                  )}
                </div>
              </div>

              {/* Obligation 2 */}
              <div className="timeline-item warning">
                <div className="timeline-dot"></div>
                <div className="timeline-meta">
                  <span className="timeline-date">Março a Maio</span>
                  <span className="timeline-period-badge">Anual</span>
                </div>
                <div className="timeline-body">
                  <div className="timeline-info">
                    <h4 className="timeline-title">Entrega de Declaração Anual IRPF</h4>
                    <p className="timeline-desc">Transmitir o Ajuste Anual IRPF no programa da Receita Federal contendo todas as receitas, ativos e recibos dedutíveis.</p>
                  </div>
                  {isReminderScheduled("Enviar Declaração Anual IRPF à Receita Federal") ? (
                    <button className="timeline-btn-add added" disabled>
                      <CheckCircle size={12} /> Agendado
                    </button>
                  ) : (
                    <button 
                      className="timeline-btn-add"
                      onClick={() => handleScheduleReminder("Enviar Declaração Anual IRPF à Receita Federal", "yearly", "irpf")}
                    >
                      Agendar Alerta
                    </button>
                  )}
                </div>
              </div>

              {/* Obligation 3 */}
              <div className="timeline-item active">
                <div className="timeline-dot"></div>
                <div className="timeline-meta">
                  <span className="timeline-date">Até 28/Dezembro</span>
                  <span className="timeline-period-badge">Otimização</span>
                </div>
                <div className="timeline-body">
                  <div className="timeline-info">
                    <h4 className="timeline-title">Aporte Final PGBL para Dedução</h4>
                    <p className="timeline-desc">Último prazo bancário para depositar aportes adicionais no PGBL para deduzir até 12% da renda no ajuste anual.</p>
                  </div>
                  {isReminderScheduled("Aporte de PGBL para benefício fiscal") ? (
                    <button className="timeline-btn-add added" disabled>
                      <CheckCircle size={12} /> Agendado
                    </button>
                  ) : (
                    <button 
                      className="timeline-btn-add"
                      onClick={() => handleScheduleReminder("Aporte de PGBL para benefício fiscal", "yearly", "pgbl")}
                    >
                      Agendar Alerta
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: XML Auditor */}
          <div className="right-panel flex-column gap-lg">
            <div className="card details-card">
              <div className="flex-center-y gap-sm">
                <ShieldCheck size={20} className="text-success" />
                <h3>Auditoria de Declaração Anterior (IA)</h3>
              </div>
              <p className="card-subtext mb-md mt-xs">
                Importe o arquivo XML da sua Declaração de IRPF do ano anterior transmitida à Receita Federal. O Auditor IA cruzará os bens passados com a sua carteira e saldos atuais para identificar possíveis furos ou inconsistências na evolução patrimonial.
              </p>
              
              <div className="flex-column gap-sm">
                {/* Upload Tax Return XML/PDF */}
                <div className="flex-column gap-xs">
                  <div className="flex gap-sm">
                    <input 
                      type="file" 
                      id="past-tax-return-input"
                      style={{ display: 'none' }}
                      onChange={handleTaxDeclarationUpload}
                      accept=".xml,.txt"
                    />
                    <button 
                      className="btn btn-secondary text-xs flex-grow"
                      onClick={() => document.getElementById('past-tax-return-input').click()}
                    >
                      {uploadedFileName ? `${uploadedFileName.substring(0, 18)}...` : 'Selecionar Declaração (.xml / .txt)'}
                    </button>
                    <button 
                      className="btn btn-accent text-xs flex-center-y gap-xs"
                      disabled={!taxDeclarationText}
                      onClick={handleAuditClick}
                    >
                      <Sparkles size={12} />
                      Auditar Declaração
                    </button>
                  </div>
                  {!taxDeclarationText && (
                    <span className="text-xxs text-secondary mt-xs">🔒 Os dados do XML são analisados localmente e descartados ao fechar a sessão.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="card details-card flex-grow">
              <div className="flex-center-y gap-sm text-accent">
                <Calculator size={18} />
                <h3>Guias Tributárias & DARF</h3>
              </div>
              <p className="card-subtext mt-xs">
                Se você realizou operações em Bolsa (ações, FIIs, derivativos) e precisa pagar o imposto sobre ganho de capital mensal, utilize as guias de cálculo rápido geradas pela IA.
              </p>
              <button 
                className="btn btn-secondary flex-center-y gap-xs w-full mt-md"
                onClick={handleDarfClick}
                style={{ justifyContent: 'center' }}
              >
                <Calculator size={16} />
                Instruções Completas de Emissão de DARF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AIDiagnosticsDrawer */}
      <AIDiagnosticsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={drawerTitle}
        systemPrompt={activePrompt}
        contextSummary={contextSummary}
        jwtToken={jwtToken}
      />
    </div>
  );
};

export default TaxAssistant;

