/**
 * File parser utility for bank statement files (OFX and CSV).
 */

const CATEGORY_KEYWORDS = {
  // Expense categories
  'MERCADO': 'Alimentação',
  'SUPERMERCADO': 'Alimentação',
  'RESTAURANTE': 'Alimentação',
  'IFOOD': 'Alimentação',
  'LANCHONETE': 'Alimentação',
  'PADARIA': 'Alimentação',
  
  'POSTO': 'Transporte',
  'COMBUSTIVEL': 'Transporte',
  'UBER': 'Transporte',
  '99TAXI': 'Transporte',
  'METRO': 'Transporte',
  'PEDAGIO': 'Transporte',
  'ESTACIONAMENTO': 'Transporte',
  
  'FARMACIA': 'Saúde',
  'DROGARIA': 'Saúde',
  'HOSPITAL': 'Saúde',
  'MEDICO': 'Saúde',
  'CLINICA': 'Saúde',
  'EXAME': 'Saúde',
  'DENTISTA': 'Saúde',
  
  'ESCOLA': 'Educação',
  'FACULDADE': 'Educação',
  'CURSO': 'Educação',
  'LIVRARIA': 'Educação',
  'MATRICULA': 'Educação',
  'COLEGIO': 'Educação',
  
  'ALUGUEL': 'Moradia',
  'CONDOMINIO': 'Moradia',
  'ENEL': 'Moradia',
  'LUZ': 'Moradia',
  'SABESP': 'Moradia',
  'GAS': 'Moradia',
  'INTERNET': 'Moradia',
  
  'SPOTIFY': 'Lazer',
  'NETFLIX': 'Lazer',
  'CINEMA': 'Lazer',
  'COMPRA': 'Lazer',
  'SHOPPING': 'Lazer',
  'JOGOS': 'Lazer',
  'STEAM': 'Lazer',
  
  'DARF': 'Impostos',
  'IMPOSTO': 'Impostos',
  'RECEITA FEDERAL': 'Impostos',
  
  // Income categories
  'SALARIO': 'Salário',
  'PRO-LABORE': 'Pró-labore',
  'RENDIMENTO': 'Rendimentos',
  'DIVIDENDO': 'Rendimentos',
  'JUROS': 'Rendimentos',
  'TED RECEBIDA': 'Salário',
  'PIX RECEBIDO': 'Outros'
};

/**
 * Normalizes text to upper case and removes accents.
 */
function cleanText(str) {
  if (!str) return '';
  return str.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Automagically categorizes a transaction based on keywords.
 * @param {string} description 
 * @param {string} type ('income' or 'expense')
 * @returns {string} Category
 */
export function autoCategorize(description, type) {
  const clean = cleanText(description);
  
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    if (clean.includes(kw)) {
      // Validate that it fits the type flow
      if (type === 'income') {
        const incomeCats = ['Salário', 'Pró-labore', 'Rendimentos', 'Venda de Ativos', 'Outros'];
        if (incomeCats.includes(cat)) return cat;
      } else {
        const expenseCats = ['Alimentação', 'Transporte', 'Saúde', 'Educação', 'Moradia', 'Lazer', 'Impostos', 'Outros'];
        if (expenseCats.includes(cat)) return cat;
      }
    }
  }
  return type === 'income' ? 'Outros' : 'Outros';
}

/**
 * Checks if a category is tax deductible (Saúde or Educação).
 * @param {string} category 
 * @returns {boolean}
 */
export function checkTaxDeductible(category) {
  return ['Saúde', 'Educação'].includes(category);
}

/**
 * Parses date string in DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD format to YYYY-MM-DD.
 */
function parseDateString(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  const clean = dateStr.trim();
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  
  // If DD/MM/YYYY or DD-MM-YYYY
  const parts = clean.split(/[/|-]/);
  if (parts.length === 3) {
    if (parts[0].length === 2 && parts[2].length === 4) {
      // DD/MM/YYYY -> YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    if (parts[0].length === 4 && parts[2].length === 2) {
      // YYYY/MM/DD
      return `${parts[0]}-${parts[1]}-${parts[2]}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Parses numeric amount from Brazilian representation (e.g. -1.234,56 or 500.00).
 */
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  let clean = amountStr.trim();
  
  // Check if it uses comma as decimal separator (Brazilian BRL format)
  if (clean.includes(',') && !clean.includes('.')) {
    clean = clean.replace(',', '.');
  } else if (clean.includes(',') && clean.includes('.')) {
    // E.g. -1.234,56 -> remove dots, replace comma with dot
    clean = clean.replace(/\./g, '').replace(',', '.');
  }
  
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses an OFX bank statement file content.
 * @param {string} text 
 * @returns {Array} List of transactions
 */
export function parseOFX(text) {
  const transactions = [];
  const txBlocks = text.split(/<STMTTRN>/i).slice(1);
  
  for (const block of txBlocks) {
    const cleanBlock = block.split(/<\/STMTTRN>/i)[0];
    
    const typeTag = getOFXTagValue(cleanBlock, 'TRNTYPE'); // DEBIT, CREDIT
    const dateTag = getOFXTagValue(cleanBlock, 'DTPOSTED'); // YYYYMMDD
    const amountTag = getOFXTagValue(cleanBlock, 'TRNAMT'); // -15.50
    const nameTag = getOFXTagValue(cleanBlock, 'NAME') || getOFXTagValue(cleanBlock, 'MEMO') || 'Transação';
    
    if (amountTag) {
      const parsedVal = parseFloat(amountTag);
      const isIncome = typeTag.toUpperCase() === 'CREDIT' || parsedVal >= 0;
      
      let date = new Date().toISOString().split('T')[0];
      if (dateTag && dateTag.length >= 8) {
        date = `${dateTag.substring(0, 4)}-${dateTag.substring(4, 6)}-${dateTag.substring(6, 8)}`;
      }
      
      const category = autoCategorize(nameTag, isIncome ? 'income' : 'expense');
      
      transactions.push({
        description: nameTag.trim(),
        amount: Math.abs(parsedVal),
        type: isIncome ? 'income' : 'expense',
        category,
        date,
        isTaxDeductible: isIncome ? false : checkTaxDeductible(category),
        specificPurpose: 'Importação Extrato OFX'
      });
    }
  }
  
  return transactions;
}

function getOFXTagValue(block, tag) {
  const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Parses a CSV bank statement file content.
 * @param {string} text 
 * @returns {Array} List of transactions
 */
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];
  
  // Heuristic to detect delimiter: check commas vs semicolons in the header
  const header = lines[0];
  const commaCount = (header.match(/,/g) || []).length;
  const semicolonCount = (header.match(/;/g) || []).length;
  const delimiter = semicolonCount >= commaCount ? ';' : ',';
  
  const headers = header.split(delimiter).map(h => cleanText(h.trim()));
  
  // Heuristic column indexes
  let dateIdx = -1;
  let descIdx = -1;
  let amountIdx = -1;
  
  headers.forEach((h, idx) => {
    if (h.includes('DATA') || h.includes('DATE') || h.includes('DT')) {
      if (dateIdx === -1) dateIdx = idx;
    } else if (h.includes('DESCR') || h.includes('HIST') || h.includes('LANC') || h.includes('MEMO') || h.includes('NOME') || h.includes('DETALHE')) {
      if (descIdx === -1) descIdx = idx;
    } else if (h.includes('VALOR') || h.includes('VALUE') || h.includes('AMOUNT') || h.includes('QUANTIA') || h.includes('VAL')) {
      if (amountIdx === -1) amountIdx = idx;
    }
  });
  
  // Defaults if headers are not detected
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;
  if (amountIdx === -1) amountIdx = Math.min(2, headers.length - 1);
  
  const transactions = [];
  
  // Read remaining lines
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(delimiter);
    if (columns.length <= Math.max(dateIdx, descIdx, amountIdx)) continue;
    
    const rawDate = columns[dateIdx];
    const rawDesc = columns[descIdx];
    const rawAmount = columns[amountIdx];
    
    if (!rawDesc || !rawAmount) continue;
    
    const parsedVal = parseAmount(rawAmount);
    const isIncome = parsedVal >= 0;
    const date = parseDateString(rawDate);
    const category = autoCategorize(rawDesc, isIncome ? 'income' : 'expense');
    
    transactions.push({
      description: rawDesc.trim(),
      amount: Math.abs(parsedVal),
      type: isIncome ? 'income' : 'expense',
      category,
      date,
      isTaxDeductible: isIncome ? false : checkTaxDeductible(category),
      specificPurpose: 'Importação Extrato CSV'
    });
  }
  
  return transactions;
}
