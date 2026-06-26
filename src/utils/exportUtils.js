/**
 * Utility functions for exporting financial data.
 */

/**
 * Converts an array of transactions to CSV and triggers a browser download.
 * @param {Array} transactions
 * @param {Array} accounts - used to resolve account names
 * @param {string} filename - without extension
 */
export const exportToCSV = (transactions, accounts = [], filename = 'extrato') => {
  const accountMap = {};
  accounts.forEach(a => { accountMap[a.id] = a.name; });

  const headers = [
    'Data',
    'Descrição',
    'Tipo',
    'Categoria',
    'Conta',
    'Valor (R$)',
    'Dedutível IR',
    'Finalidade'
  ];

  const rows = transactions.map(tx => [
    tx.date,
    `"${(tx.description || '').replace(/"/g, '""')}"`,
    tx.type === 'income' ? 'Receita' : 'Despesa',
    tx.category || '',
    `"${accountMap[tx.accountId] || tx.accountId || ''}"`,
    tx.amount.toFixed(2).replace('.', ','),
    tx.isTaxDeductible ? 'Sim' : 'Não',
    `"${(tx.specificPurpose || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Opens a formatted print window for PDF generation via the browser's print dialog.
 * @param {Array} transactions
 * @param {Array} accounts
 * @param {string} periodLabel - display label for the period
 */
export const exportToPrintHTML = (transactions, accounts = [], periodLabel = 'Período Selecionado') => {
  const accountMap = {};
  accounts.forEach(a => { accountMap[a.id] = a.name; });

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const fmt = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const rows = transactions
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(tx => `
      <tr>
        <td>${tx.date.split('-').reverse().join('/')}</td>
        <td>${tx.description}</td>
        <td>${tx.type === 'income' ? 'Receita' : 'Despesa'}</td>
        <td>${tx.category}</td>
        <td>${accountMap[tx.accountId] || '-'}</td>
        <td style="text-align:right; color:${tx.type === 'income' ? '#16a34a' : '#dc2626'}">
          ${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)}
        </td>
      </tr>
    `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Extrato Financeiro — ${periodLabel}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .subtitle { color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e293b; color: #fff; padding: 8px; text-align: left; }
        td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        .summary { margin-top: 20px; display: flex; gap: 32px; }
        .summary-item { font-size: 13px; }
        .summary-item strong { display: block; font-size: 16px; }
        .green { color: #16a34a; }
        .red { color: #dc2626; }
        .blue { color: #0284c7; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <h1>Extrato Financeiro</h1>
      <div class="subtitle">Período: ${periodLabel} — Gerado em ${new Date().toLocaleString('pt-BR')}</div>
      <table>
        <thead>
          <tr>
            <th>Data</th><th>Descrição</th><th>Tipo</th><th>Categoria</th><th>Conta</th><th>Valor</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="summary">
        <div class="summary-item"><span>Total Receitas</span><strong class="green">${fmt(totalIncome)}</strong></div>
        <div class="summary-item"><span>Total Despesas</span><strong class="red">${fmt(totalExpense)}</strong></div>
        <div class="summary-item"><span>Saldo do Período</span><strong class="${balance >= 0 ? 'green' : 'red'}">${fmt(balance)}</strong></div>
      </div>
      <script>window.onload = () => window.print();<\/script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
};
