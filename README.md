# Wealth Manager - Sistema Financeiro Pessoal Inteligente

O **Wealth Manager** é uma plataforma financeira pessoal premium projetada para dar controle total ao usuário, cobrindo desde o fluxo de caixa diário e gestão familiar até o planejamento avançado de investimentos, imposto de renda e sincronização segura na nuvem.

Toda a arquitetura do sistema foi desenhada com foco em **alta performance de renderização (React)** e **privacidade absoluta (Segurança Zero-Knowledge)**.

---

## 🎨 Design e Experiência do Usuário

A interface utiliza as melhores práticas de design moderno:
- **Tema Escuro Premium (Glassmorphism):** Cores harmoniosas (Sky Blue, Emerald, Coral, Amber) com fundos semitransparentes com desfoque de fundo e sombras suaves.
- **Tipografia Moderna:** Fontes do Google Fonts (*Inter* para leitura e *Outfit* para títulos e números destacados).
- **Micro-interações:** Efeitos hover responsivos, animações de entrada e transições de progresso dinâmicas.

---

## 🔒 Arquitetura de Segurança Zero-Knowledge (ZK)

Por se tratar de um sistema que lida com dados financeiros íntimos, a segurança é inegociável:
- **Criptografia Simétrica na RAM:** Toda a criptografia e descriptografia dos dados locais ocorrem no navegador do usuário usando a *Web Crypto API* (AES-GCM de 256 bits). A chave simétrica (`sessionKey`) reside exclusivamente na memória RAM e é perdida no momento do bloqueio ou fechamento da aba.
- **Autenticação Desvinculada:** No login, o frontend deriva uma chave secundária baseada em PBKDF2 (`authKey`) com um sal alternativo e envia apenas o hash SHA-256 (`auth_hash`) para o servidor. O servidor jamais tem acesso à chave de criptografia dos dados ou à senha mestra do usuário.
- **Auto-Lock por Inatividade:** O aplicativo detecta automaticamente a ausência de comandos do usuário (mouse, teclado, cliques) e aciona o bloqueio de segurança após 5 minutos.

---

## 📁 Módulos e Funcionalidades

### 1. Gestão de Contas (Account Manager)
- Cadastro de bancos, corretoras e carteira de dinheiro em espécie.
- Consolidação do Patrimônio Líquido total em tempo real no cabeçalho.

### 2. Fluxo de Caixa (Cash Flow)
- Registro de entradas (receitas) e saídas (despesas) com categorização clássica.
- Lançamento de despesas vinculadas a dependentes específicos.

### 3. Gestão Familiar (Family Hub)
- Painel para cadastrar cônjuge e filhos, facilitando o isolamento de custos familiares por beneficiário.

### 4. Assistente Tributário (Tax Intelligence)
- Marcação automática de gastos dedutíveis (saúde e educação).
- Cálculo dinâmico em tempo real de vendas mensais de ações na Bolsa (XP/B3), com aviso visual se estiver próximo do limite de isenção de R$ 20.000,00 por mês.

### 5. Central de Investimentos (Investment Core)
- **Trilha Iniciante (Planner):** Quiz interativo para descobrir o perfil de risco do investidor (Conservador, Moderado, Arrojado) e definir metas para reserva de emergência.
- **Consultor Avançado (Advisor):**
  - Cadastro detalhado de ativos (Quantidade, Preço Médio e Cotação Atual).
  - Cálculo de custo total de aquisição, valor de mercado, lucros nominais (R$) e rentabilidade (%).
  - Busca de cotações em tempo real integrada com APIs públicas (B3 via Brapi e Cripto via CoinGecko).
  - Painel de Rebalanceamento que compara a alocação atual de ativos com os limites recomendados para o seu perfil e sugere ordens de COMPRA e VENDA.

### 6. Cofre de Documentos (Data Hub)
- Área segura e criptografada localmente para armazenar comprovantes fiscais e PDFs de declarações anteriores de IRPF.
- **Persistência de Alta Capacidade:** Os arquivos criptografados pesados em Base64 são salvos diretamente no **IndexedDB** local, contornando a limitação de 5MB do LocalStorage convencional.

---

## 🛠️ Estrutura do Projeto

```text
c:\projetos\Financeiro
├── README.md               (Este guia principal do projeto)
├── index.html              (HTML raiz)
├── package.json            (Configurações de dependências do Frontend)
├── vite.config.js          (Configurações do Vite)
│
├── server/                 (Backend Express + PostgreSQL)
│   ├── .env                (Configuração de variáveis do banco)
│   ├── db.js               (Instância do Pool de conexão do Postgres)
│   ├── package.json        (Dependências do servidor e Express)
│   ├── schema.sql          (DDL de criação de tabelas)
│   └── server.js           (Rotas de autenticação, JWT e sincronização)
│
└── src/
    ├── main.jsx            (Ponto de entrada React)
    ├── App.jsx             (Roteamento, Layout e Hook de Auto-Lock)
    ├── index.css           (Estilos globais, Cores e Design System)
    │
    ├── context/
    │   └── FinanceContext.jsx (Estados globais, CRUDs e Sincronização JWT)
    │
    ├── utils/
    │   ├── cryptoUtils.js  (Derivação de chaves PBKDF2, criptografia AES-GCM e hash)
    │   ├── financeUtils.js (Cálculos de juros compostos, média ponderada e fetch de cotações)
    │   ├── indexedDbUtils.js (Operações de baixo nível para arquivos no IndexedDB)
    │   └── storage.js      (Acesso seguro a chaves do LocalStorage)
    │
    └── components/         (Componentes visuais e modulares)
        ├── layout/         (TopNav, Sidebar, LockScreen)
        ├── Accounts/       (Gestão de Contas)
        ├── DataHub/        (Upload de comprovantes e Cofre)
        ├── Family/         (Dependentes)
        ├── Investments/    (Painel de Investimentos e simuladores)
        ├── Reminders/      (Avisos de vencimentos e tarefas)
        ├── Reports/        (Relatórios de rentabilidade e gastos)
        ├── Taxes/          (Assistente fiscal IRPF)
        └── Transactions/   (Lançamento de fluxo de caixa)
```

---

## 🚀 Como Iniciar e Rodar

### 1. Iniciar o Banco de Dados (PostgreSQL)
Abra o seu PostgreSQL e crie a base de dados do projeto:
```sql
CREATE DATABASE wealth_manager;
```
Em seguida, execute o script contido em [server/schema.sql](file:///c:/projetos/Financeiro/server/schema.sql) para criar as tabelas `users` e `vaults`.

### 2. Rodar o Servidor de Sincronização (Backend)
1. Acesse o diretório `/server`.
2. Configure as variáveis de ambiente no arquivo `.env` com os dados de acesso ao seu banco de dados local.
3. Instale as dependências e inicie o backend:
   ```bash
   npm install
   npm start
   ```
   *O servidor iniciará no endereço `http://localhost:5000`.*

### 3. Rodar a Interface Gráfica (Frontend)
1. Na raiz do projeto, instale as dependências:
   ```bash
   npm install
   ```
2. Inicialize o servidor de desenvolvimento Vite:
   ```bash
   npm run dev
   ```
3. Abra o link gerado no seu navegador para utilizar a plataforma!
