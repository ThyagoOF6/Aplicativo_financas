# Wealth Manager - Sistema Financeiro Pessoal Inteligente

O **Wealth Manager** é uma plataforma financeira pessoal premium projetada para dar controle total ao usuário, cobrindo desde o fluxo de caixa diário e gestão familiar até o planejamento avançado de investimentos, imposto de renda, sincronização segura na nuvem e consultoria financeira assistida por Inteligência Artificial.

Toda a arquitetura do sistema foi desenhada com foco em **alta performance de renderização (React)**, **privacidade absoluta (Segurança Zero-Knowledge)** e **responsividade fluida** adaptando-se a dispositivos móveis, tablets e computadores.

---

## 🎨 Design e Experiência do Usuário

A interface utiliza as melhores práticas de design moderno:
- **Tema Escuro Premium (Glassmorphism):** Cores harmoniosas (Sky Blue, Emerald, Coral, Amber) com fundos semitransparentes com desfoque de fundo (backdrop-filter) e sombras suaves.
- **Tipografia Moderna:** Fontes do Google Fonts (*Inter* para leitura e *Outfit* para títulos e números destacados).
- **Micro-interações:** Efeitos hover responsivos, animações de entrada e transições de progresso dinâmicas.test: adiciona testes de unidade no navegador para utils e criptografia
- **Totalmente Responsivo:** Layout adaptável otimizado tanto para telas pequenas (smartphones) quanto para grandes resoluções de desktop.

---

## 🔒 Arquitetura de Segurança Zero-Knowledge (ZK)

Por se tratar de um sistema que lida com dados financeiros íntimos, a segurança é inegociável:
- **Criptografia Simétrica na RAM:** Toda a criptografia e descriptografia dos dados locais ocorrem no navegador do usuário usando a *Web Crypto API* (AES-GCM de 256 bits). A chave simétrica (`sessionKey`) reside exclusivamente na memória RAM e é perdida no momento do bloqueio ou fechamento da aba.
- **Autenticação Desvinculada:** No login, o frontend deriva uma chave secundária baseada em PBKDF2 (`authKey`) com um sal alternativo e envia apenas o hash SHA-256 (`auth_hash`) para o servidor. O servidor jamais tem acesso à chave de criptografia dos dados ou à senha mestra do usuário.
- **Auto-Lock por Inatividade:** O aplicativo detecta automaticamente a ausência de comandos do usuário (mouse, teclado, cliques) e aciona o bloqueio de segurança após 5 minutos.
- **Redefinição e Recuperação de Senha Segura:** Se a senha for esquecida, o usuário tem a opção de redefini-la importando um arquivo de backup em JSON descriptografado. Também é oferecida a opção de wipe total ("Apagar Tudo e Começar do Zero") para deletar de forma limpa o banco de dados local do navegador, sem comprometer a privacidade.

---

## 📁 Módulos e Funcionalidades

### 1. Gestão de Contas & Benefícios (Account Manager)
- Cadastro de bancos, corretoras e carteira de dinheiro em espécie.
- Consolidação do Patrimônio Líquido total em tempo real no cabeçalho.
- **Gestão de Benefícios de Cartão de Crédito:** Cadastro de benefícios como Cashback, Milhas/Pontos, Sala VIP e Isenção de Anuidade (com suporte a tags customizadas).
- **Recomendador de Cartão:** Sugestão automatizada de qual cartão utilizar baseado nos benefícios cadastrados.

### 2. Fluxo de Caixa (Cash Flow)
- Registro de entradas (receitas) e saídas (despesas) com categorização clássica.
- Lançamento de despesas vinculadas a dependentes específicos.
- Importação rápida de dados via extratos bancários em formatos **OFX** e **CSV**.

### 3. Planejador de Metas de Economia (Savings Goals)
- **Lógica de Metas:** Cálculo dinâmico do aporte mensal e semanal necessário para atingir objetivos financeiros em prazos específicos.
- **Análise de Viabilidade:** Avaliação em tempo real se a meta é *Viável*, *Apertada* ou *Inviável* comparando o aporte sugerido com a renda média e o saldo livre do usuário.
- **Sugestões Inteligentes:** Recomendações dinâmicas sugeridas para ajuste do plano (como estender o prazo para diminuir o aporte mensal).
- **Aportes Rápidos:** Registro de contribuições financeiras para as metas diretamente da tela principal.

### 4. Priorização de Contas (Bill Priority)
- Classificação de obrigações, vencimentos e contas a pagar em níveis de prioridade: **Essencial (🔴)**, **Importante (🟡)** ou **Opcional (🔵)**.
- Ordenação e filtragem rápida por data de vencimento, valor ou peso de prioridade.
- Atualização direta de status (Pago / Pendente) e alteração rápida de prioridade na interface.

### 5. Consultor Financeiro e Assistente de IA (AI Advisor)
- Chat interativo integrado para esclarecer dúvidas sobre economia, contabilidade, investimentos e planejamento tributário.
- **Privacidade ZK Preservada:** Envio de resumos anonimizados da situação financeira para que a IA auxilie nas recomendações sem violar a privacidade.
- **OCR de Documentos:** Upload de imagens e PDFs de comprovantes e recibos de gastos para análise automatizada.
- **Ações Rápidas por IA:** Sugestão direta no chat para criar novas transações ou metas com um único clique com base nas respostas dadas pela IA.

### 6. Assistente Tributário (Tax Intelligence)
- Marcação automática de gastos dedutíveis (saúde e educação).
- Cálculo dinâmico em tempo real de vendas mensais de ações na Bolsa (XP/B3), com aviso visual se estiver próximo do limite de isenção de R$ 20.000,00 por mês.

### 7. Central de Investimentos (Investment Core)
- **Trilha Iniciante (Planner):** Quiz interativo para descobrir o perfil de risco do investidor (Conservador, Moderado, Arrojado) e definir metas para reserva de emergência.
- **Consultor Avançado (Advisor):**
  - Cadastro detalhado de ativos (Quantidade, Preço Médio e Cotação Atual).
  - Cálculo de custo total de aquisição, valor de mercado, lucros nominais (R$) e rentabilidade (%).
  - Busca de cotações em tempo real integrada com APIs públicas (B3 via Brapi e Cripto via CoinGecko).
  - Painel de Rebalanceamento que compara a alocação atual de ativos com os limites recomendados para o seu perfil e sugere ordens de COMPRA e VENDA.

### 8. Cofre de Documentos (Data Hub)
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
├── iniciar.bat             (Script rápido de startup para Windows)
│
├── server/                 (Backend Express + PostgreSQL)
│   ├── .env                (Configuração de variáveis do banco)
│   ├── db.js               (Instância do Pool de conexão do Postgres)
│   ├── package.json        (Dependências do servidor e Express)
│   ├── schema.sql          (DDL de criação de tabelas)
│   └── server.js           (Rotas de autenticação, JWT, sincronização e chat de IA)
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
    │   ├── dateUtils.js    (Manipulação de datas do calendário)
    │   ├── db.js           (Instância de conexão para sincronização)
    │   ├── exportUtils.js  (Funções para exportação em JSON e CSV)
    │   ├── financeUtils.js (Cálculos de juros compostos, média ponderada e rentabilidade)
    │   ├── indexedDbUtils.js (Operações de baixo nível para arquivos no IndexedDB)
    │   ├── parser.js       (Leitura e importação de extratos OFX/CSV)
    │   ├── runBrowserTests.js (Suíte de testes integrados executados no navegador)
    │   ├── storage.js      (Acesso seguro a chaves do LocalStorage)
    │   └── xss.js          (Prevenção de injeção de scripts maliciosos)
    │
    └── components/         (Componentes visuais e modulares)
        ├── layout/         (TopNav, Sidebar, LockScreen, SettingsManager e Toast)
        ├── AIAdvisor/      (Chat do Consultor Financeiro de IA e leitor OCR de documentos)
        ├── Accounts/       (Gestão de Contas e cadastro de benefícios de Cartões)
        ├── DataHub/        (Upload de comprovantes e visualização de arquivos)
        ├── Family/         (Dependentes e rateio de despesas familiares)
        ├── Goals/          (Planejador de Metas de Economia e análises de viabilidade)
        ├── Investments/    (Painel de Investimentos, perfil e rebalanceamento)
        ├── Reminders/      (Avisos de vencimentos, tarefas e priorização de obrigações)
        ├── Reports/        (Relatórios de rentabilidade e painel analítico de gastos)
        ├── Taxes/          (Assistente fiscal IRPF e despesas dedutíveis)
        └── Transactions/   (Lançamento de fluxo de caixa e filtros)
```

---

## 🚀 Como Iniciar e Rodar

### 1. Iniciar o Banco de Dados (PostgreSQL)
Abra o seu PostgreSQL e crie a base de dados do projeto:
```sql
CREATE DATABASE wealth_manager;
```
Em seguida, execute o script contido em [server/schema.sql](file:///c:/projetos/Financeiro/server/schema.sql) para criar as tabelas `users` e `vaults`.

### 2. Rodar o Servidor de Sincronização & IA (Backend)
1. Acesse o diretório `/server`.
2. Configure as variáveis de ambiente no arquivo `.env` com os dados de acesso ao seu banco de dados local e a chave de API necessária para o funcionamento do Chat de IA.
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
3. Abra o link gerado no seu navegador (normalmente `http://localhost:5173`) ou utilize o executável `iniciar.bat`.

### 4. Executando a Suíte de Testes
Para verificar a integridade da criptografia Zero-Knowledge, lógica de juros, e demais cálculos financeiros:
1. Faça login no aplicativo.
2. Navegue até o painel de **Configurações** (no menu lateral).
3. Clique em **"Executar Testes do Sistema"**.
4. Os resultados das asserções e o tempo total de execução serão exibidos em tempo real na tela!

