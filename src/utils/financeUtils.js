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
