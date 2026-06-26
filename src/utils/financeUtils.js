/**
 * Utility functions for financial calculations.
 */

/**
 * Calculates the weighted average yield of a portfolio.
 * @param {Array} investments 
 * @param {number} totalValue 
 * @returns {number} Average nominal yield rate (% a.a.)
 */
export const calculateAverageYield = (investments, totalValue) => {
  if (!totalValue || totalValue <= 0) return 0;
  return investments.reduce((acc, curr) => acc + (curr.yieldRate * (curr.value / totalValue)), 0);
};

/**
 * Calculates the real yield rate discounting inflation (Fisher equation).
 * @param {number} averageYield Nominal yield (% a.a.)
 * @param {number} inflationRate Inflation rate (IPCA % a.a.)
 * @returns {number} Real yield rate (% a.a.)
 */
export const calculateRealYield = (averageYield, inflationRate) => {
  return ((1 + averageYield / 100) / (1 + inflationRate / 100) - 1) * 100;
};

/**
 * Simulates compound interest with monthly contributions and initial value.
 * FV = P * ((1 + r)^n - 1) / r + PV * (1 + r)^n
 * @param {number} initialValue (PV)
 * @param {number} monthlyAporte (P)
 * @param {number} annualRate (Nominal yield % a.a.)
 * @param {number} years 
 * @returns {number} Future Value (FV)
 */
export const projectFutureValue = (initialValue, monthlyAporte, annualRate, years) => {
  const monthlyRate = annualRate / 12 / 100;
  const months = years * 12;
  
  if (monthlyRate === 0) {
    return initialValue + monthlyAporte * months;
  }

  const fvContributions = monthlyAporte * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  const fvInitial = initialValue * Math.pow(1 + monthlyRate, months);
  
  return fvContributions + fvInitial;
};

/**
 * Formats a numeric value to Brazilian Real (BRL).
 * @param {number} val 
 * @returns {string} Formatted currency string
 */
export const formatBRL = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

/**
 * Fetches the current asset price from public APIs (Brapi for B3, CoinGecko for Cryptos).
 * Falls back to a realistic simulated variation if the API call fails or limits are reached.
 * @param {string} symbol 
 * @param {string} type (Ações, FII, Cripto, Renda Fixa)
 * @param {number} currentPrice (fallback baseline price)
 * @returns {Promise<number>} Current asset price
 */
export const fetchAssetPrice = async (symbol, type, currentPrice = 10.00) => {
  const cleanSymbol = symbol.trim().toUpperCase();
  
  if (type === 'Renda Fixa') {
    // Renda Fixa doesn't fluctuate via public quotes, simulates accrual (e.g. +0.03% daily rate)
    const variation = 1 + (Math.random() * 0.0006);
    return Math.round(currentPrice * variation * 100) / 100;
  }

  try {
    if (type === 'Cripto' || type === 'Criptomoedas') {
      const cryptoMap = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'SOL': 'solana',
        'ADA': 'cardano',
        'XRP': 'ripple',
        'BITCOIN': 'bitcoin',
        'ETHEREUM': 'ethereum'
      };
      
      const coinId = cryptoMap[cleanSymbol] || cleanSymbol.toLowerCase();
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=brl`);
      if (res.ok) {
        const data = await res.json();
        if (data[coinId] && data[coinId].brl) {
          return data[coinId].brl;
        }
      }
    } else {
      // Stock or FII
      // Using Brapi public sandbox endpoint
      const res = await fetch(`https://brapi.dev/api/quote/${cleanSymbol}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results[0] && data.results[0].regularMarketPrice) {
          return data.results[0].regularMarketPrice;
        }
      }
    }
  } catch (error) {
    console.warn(`Could not fetch price for ${symbol} via API, using realistic fallback:`, error);
  }

  // Realistic fallback price simulation (fluctuation of -2% to +3%)
  const percentageChange = -0.02 + (Math.random() * 0.05);
  const newPrice = currentPrice * (1 + percentageChange);
  return Math.round(newPrice * 100) / 100;
};

/**
 * Calculates a Financial Health Score (0–100) based on 4 pillars.
 * Each pillar contributes up to 25 points.
 * @param {Array} accounts
 * @param {Array} transactions
 * @param {Array} investments
 * @param {Array} reminders
 * @returns {{ score, label, color, pillars, avgIncome, avgExpense }}
 */
export const calculateFinancialHealthScore = (accounts, transactions, investments, reminders) => {
  const now = new Date();

  // Use last 6 months of data for averages
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentTx = transactions.filter(t => new Date(t.date + 'T12:00:00') >= sixMonthsAgo);
  const monthsWithData = Math.max(1, new Set(recentTx.map(t => t.date.substring(0, 7))).size);

  const totalIncome  = recentTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = recentTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const avgIncome  = totalIncome  / monthsWithData;
  const avgExpense = totalExpense / monthsWithData;
  const avgSavings = avgIncome - avgExpense;

  // Pillar 1 — Savings Rate (goal: save ≥20% of income)
  const savingsRateScore = avgIncome > 0
    ? Math.min(25, (avgSavings / avgIncome / 0.20) * 25)
    : 0;

  // Pillar 2 — Emergency Reserve (goal: ≥3 months of expenses in accounts)
  const totalAccountBalance = accounts.reduce((s, a) => s + Math.max(0, a.balance), 0);
  const monthsCoverage = avgExpense > 0 ? totalAccountBalance / avgExpense : 0;
  const emergencyScore = Math.min(25, (monthsCoverage / 3) * 25);

  // Pillar 3 — Investment Diversification (goal: 3+ different types)
  const invTypes = new Set(investments.map(i => i.type)).size;
  const diversificationScore = invTypes === 0 ? 0 : invTypes === 1 ? 10 : invTypes === 2 ? 18 : 25;

  // Pillar 4 — Bill Compliance (goal: zero overdue reminders)
  const overdueCount = reminders.filter(r => !r.paid && new Date(r.dueDate + 'T12:00:00') < now).length;
  const complianceScore = reminders.length === 0
    ? 25
    : Math.max(0, ((reminders.length - overdueCount) / reminders.length) * 25);

  const total = Math.round(
    Math.max(0, savingsRateScore) +
    Math.max(0, emergencyScore) +
    diversificationScore +
    Math.max(0, complianceScore)
  );
  const score = Math.max(0, Math.min(100, total));

  const getLabel = s => s >= 80 ? 'Excelente' : s >= 60 ? 'Bom' : s >= 40 ? 'Regular' : s >= 20 ? 'Atenção' : 'Crítico';
  const getColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#38bdf8' : s >= 40 ? '#f59e0b' : '#ef4444';

  return {
    score,
    label: getLabel(score),
    color: getColor(score),
    pillars: {
      savingsRate:      { score: Math.round(Math.max(0, savingsRateScore)),  max: 25, label: 'Taxa de Poupança',        detail: avgIncome > 0 ? `${((avgSavings / avgIncome) * 100).toFixed(1)}% da renda poupada` : 'Sem receitas registradas' },
      emergency:        { score: Math.round(Math.max(0, emergencyScore)),     max: 25, label: 'Reserva de Emergência',  detail: `${monthsCoverage.toFixed(1)} mês(es) de cobertura` },
      diversification:  { score: diversificationScore,                         max: 25, label: 'Diversificação',         detail: `${invTypes} tipo(s) de investimento` },
      compliance:       { score: Math.round(Math.max(0, complianceScore)),    max: 25, label: 'Adimplência',            detail: `${overdueCount} conta(s) em atraso` },
    },
    avgIncome,
    avgExpense,
  };
};
