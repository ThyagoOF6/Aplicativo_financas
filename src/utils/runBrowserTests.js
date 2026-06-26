import { calculateAverageYield, calculateRealYield, projectFutureValue, calculateFinancialHealthScore } from './financeUtils';
import { getDaysInMonth, getFirstDayOfMonth, generateCalendarGrid } from './dateUtils';
import { autoCategorize, checkTaxDeductible, parseOFX, parseCSV } from './parser';
import { arrayBufferToBase64, base64ToArrayBuffer, initializeSecurity, validatePassword, encryptData, decryptData, deriveAuthKey, hashAuthKey } from './cryptoUtils';

// A simple describe/it testing framework for the browser
export async function runBrowserTests() {
  const suites = [];
  let currentSuite = null;

  const describe = (name, fn) => {
    currentSuite = { name, specs: [] };
    suites.push(currentSuite);
    fn();
  };

  const it = (description, fn) => {
    currentSuite.specs.push({ description, fn });
  };

  const expect = (actual) => {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Esperava ${expected}, mas obteve ${actual}`);
        }
      },
      toEqual: (expected) => {
        const actStr = JSON.stringify(actual);
        const expStr = JSON.stringify(expected);
        if (actStr !== expStr) {
          throw new Error(`Esperava ${expStr}, mas obteve ${actStr}`);
        }
      },
      toBeCloseTo: (expected, precision = 2) => {
        if (Math.abs(actual - expected) > Math.pow(10, -precision) / 2) {
          throw new Error(`Esperava ${actual} ser próximo a ${expected} (precisão ${precision})`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Esperava um valor verdadeiro, mas obteve ${actual}`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Esperava um valor falso, mas obteve ${actual}`);
        }
      },
      toThrow: async () => {
        let threw = false;
        try {
          await actual();
        } catch (e) {
          threw = true;
        }
        if (!threw) {
          throw new Error("Esperava que a função lançasse um erro, mas ela não lançou");
        }
      }
    };
  };

  // Define Finance Utils tests
  describe('1. Cálculos Financeiros (financeUtils)', () => {
    it('calculateAverageYield: deve calcular o rendimento médio ponderado pelos valores', () => {
      const investments = [
        { value: 1000, yieldRate: 10 },
        { value: 3000, yieldRate: 5 },
      ];
      const res = calculateAverageYield(investments, 4000);
      expect(res).toBe(6.25);
    });

    it('calculateAverageYield: deve retornar 0 se totalValue for menor ou igual a 0', () => {
      expect(calculateAverageYield([], 0)).toBe(0);
      expect(calculateAverageYield([], -10)).toBe(0);
    });

    it('calculateRealYield: deve computar rendimento real descontando inflação (equação de Fisher)', () => {
      const averageYield = 10; // 10%
      const inflation = 5; // 5%
      const res = calculateRealYield(averageYield, inflation);
      // ((1.10 / 1.05) - 1) * 100 = 4.7619...
      expect(res).toBeCloseTo(4.76, 2);
    });

    it('projectFutureValue: deve projetar juros compostos com aportes e valor inicial', () => {
      // 1000 inicial, 100 mensal, 12% a.a. (1% mensal), 1 ano (12 meses)
      const res = projectFutureValue(1000, 100, 12, 1);
      // fvInitial = 1000 * (1.01)^12 = 1126.825
      // fvContributions = 100 * ((1.01)^12 - 1)/0.01 = 1268.25
      // total = 2395.075
      expect(res).toBeCloseTo(2395.08, 2);
    });

    it('projectFutureValue: deve retornar crescimento linear se a taxa for zero', () => {
      const res = projectFutureValue(1000, 100, 0, 1);
      expect(res).toBe(2200);
    });

    it('calculateFinancialHealthScore: deve computar pontuação de saúde financeira corretamente de 0 a 100', () => {
      const accounts = [{ balance: 3000 }];
      const transactions = [
        { type: 'income', amount: 2000, date: '2026-06-01' },
        { type: 'expense', amount: 1000, date: '2026-06-02' }
      ];
      const investments = [{ type: 'Ações' }, { type: 'FII' }];
      const reminders = [];
      const res = calculateFinancialHealthScore(accounts, transactions, investments, reminders);
      expect(typeof res.score).toBe('number');
      expect(res.score >= 0 && res.score <= 100).toBeTruthy();
    });
  });

  // Define Date Utils tests
  describe('2. Calendário e Grade de Datas (dateUtils)', () => {
    it('getDaysInMonth: deve retornar a quantidade exata de dias nos meses comuns e bissextos', () => {
      expect(getDaysInMonth(2024, 2)).toBe(29); // 2024 é bissexto
      expect(getDaysInMonth(2023, 2)).toBe(28); // 2023 não é bissexto
      expect(getDaysInMonth(2026, 6)).toBe(30); // Junho
    });

    it('getFirstDayOfMonth: deve retornar o índice do primeiro dia da semana (0-6)', () => {
      expect(getFirstDayOfMonth(2026, 5)).toBe(1); // 1º de Junho de 2026 é Segunda-feira (índice 1)
    });

    it('generateCalendarGrid: deve gerar grade de calendário com preenchimento em múltiplos de 7', () => {
      const grid = generateCalendarGrid(2026, 5); // Junho de 2026 (0-indexed 5)
      expect(grid.length % 7).toBe(0);
      expect(grid[0].day).toBe(null); // Segunda-feira começa no índice 1, logo Domingo no índice 0 é null
      expect(grid[1].day).toBe(1);
    });
  });

  // Define Parser tests
  describe('3. Importadores de Extrato (parser)', () => {
    it('autoCategorize: deve categorizar despesas e receitas automaticamente baseado em palavras-chave', () => {
      expect(autoCategorize('Supermercado Pão de Açúcar', 'expense')).toBe('Alimentação');
      expect(autoCategorize('UBER RIDE', 'expense')).toBe('Transporte');
      expect(autoCategorize('RECEBIMENTO DE SALARIO', 'income')).toBe('Salário');
      expect(autoCategorize('Despesa avulsa', 'expense')).toBe('Outros');
    });

    it('checkTaxDeductible: deve identificar categorias dedutíveis no Imposto de Renda', () => {
      expect(checkTaxDeductible('Saúde')).toBeTruthy();
      expect(checkTaxDeductible('Educação')).toBeTruthy();
      expect(checkTaxDeductible('Lazer')).toBeFalsy();
    });

    it('parseOFX: deve extrair transações de dados OFX contendo tags bancárias clássicas', () => {
      const ofx = `
        <OFX>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20260610120000</DTPOSTED>
            <TRNAMT>-45.90</TRNAMT>
            <NAME>IFOOD RESTAURANTE</NAME>
          </STMTTRN>
        </OFX>
      `;
      const txs = parseOFX(ofx);
      expect(txs.length).toBe(1);
      expect(txs[0].amount).toBe(45.90);
      expect(txs[0].description).toBe('IFOOD RESTAURANTE');
      expect(txs[0].type).toBe('expense');
      expect(txs[0].category).toBe('Alimentação');
    });

    it('parseCSV: deve extrair transações de dados CSV delimitados por ponto e vírgula', () => {
      const csv = `Data;Descrição;Valor\n10/06/2026;Salário Mensal;4000,00\n11/06/2026;Posto Ipiranga;-200,00`;
      const txs = parseCSV(csv);
      expect(txs.length).toBe(2);
      expect(txs[0].amount).toBe(4000);
      expect(txs[0].type).toBe('income');
      expect(txs[0].category).toBe('Salário');
      expect(txs[1].amount).toBe(200);
      expect(txs[1].type).toBe('expense');
      expect(txs[1].category).toBe('Transporte');
    });
  });

  // Define Crypto Utils tests
  describe('4. Criptografia Zero-Knowledge (cryptoUtils)', () => {
    it('arrayBufferToBase64 / base64ToArrayBuffer: devem ser operações inversas exatas', () => {
      const originalText = "SegurancaFinanceira2026";
      const buffer = new TextEncoder().encode(originalText).buffer;
      const b64 = arrayBufferToBase64(buffer);
      const decBuffer = base64ToArrayBuffer(b64);
      const decText = new TextDecoder().decode(decBuffer);
      expect(decText).toBe(originalText);
    });

    it('Criptografia AES-GCM 256 bits, PBKDF2 e autenticação local devem funcionar integradas', async () => {
      const password = "minha_senha_mestra_secreta";
      
      // 1. Inicializar Segurança local
      const sec = await initializeSecurity(password);
      expect(sec.saltBase64).toBeTruthy();
      expect(sec.verificationJson).toBeTruthy();
      expect(sec.cryptoKey instanceof CryptoKey).toBeTruthy();

      // 2. Validar senha correta
      const correctKey = await validatePassword(password, sec.saltBase64, sec.verificationJson);
      expect(correctKey instanceof CryptoKey).toBeTruthy();

      // 3. Validar senha incorreta
      const incorrectKey = await validatePassword("senha_errada", sec.saltBase64, sec.verificationJson);
      expect(incorrectKey).toBe(null);

      // 4. Cifrar e descifrar dados (AES-GCM de 256 bits)
      const samplePlaintext = JSON.stringify({ saldo: 15400.50, banco: "Nubank" });
      const ciphertext = await encryptData(samplePlaintext, sec.cryptoKey);
      expect(ciphertext.includes("iv")).toBeTruthy();
      expect(ciphertext.includes("ct")).toBeTruthy();

      const decrypted = await decryptData(ciphertext, sec.cryptoKey);
      expect(decrypted).toBe(samplePlaintext);

      // 5. Derivar e hashear a authKey para autenticação (sem vazar a chave de criptografia)
      const authKey = await deriveAuthKey(password, sec.saltBase64);
      expect(authKey instanceof ArrayBuffer).toBeTruthy();

      const authHash = await hashAuthKey(authKey);
      expect(authHash.length).toBe(64); // 64 caracteres hexadecimais (SHA-256)
    });
  });

  // Execute the specs
  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const suite of suites) {
    const suiteResult = { name: suite.name, specs: [] };
    
    for (const spec of suite.specs) {
      try {
        await spec.fn();
        suiteResult.specs.push({ description: spec.description, passed: true });
        totalPassed++;
      } catch (err) {
        suiteResult.specs.push({ description: spec.description, passed: false, error: err.message });
        totalFailed++;
      }
    }
    
    results.push(suiteResult);
  }

  return { results, totalPassed, totalFailed, total: totalPassed + totalFailed };
}
