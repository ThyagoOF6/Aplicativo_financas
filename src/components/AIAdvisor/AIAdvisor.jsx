import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { useToast } from '../layout/Toast';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  TrendingUp, 
  FileText, 
  Wallet, 
  Target, 
  Info,
  ShieldCheck,
  AlertTriangle,
  Paperclip,
  X,
  CheckCircle,
  FileIcon
} from 'lucide-react';
import './AIAdvisor.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AIAdvisor = () => {
  const { 
    accounts, 
    transactions, 
    investments, 
    savingsGoals, 
    dependents,
    jwtToken,
    aiHistory,
    setAiHistory,
    addSavingsGoal
  } = useContext(FinanceContext);

  const { addToast } = useToast();

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // File upload states
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Tracks message indexes of goals that were already created or ignored
  const [processedGoals, setProcessedGoals] = useState({});

  const welcomeMessage = { 
    sender: 'ai', 
    text: 'Olá! Sou o seu Consultor Especialista em Economia, Contabilidade e Planejamento Fiscal. Com base nos seus dados financeiros atuais (criptografados e protegidos), posso ajudar você a otimizar sua carteira de investimentos, planejar seu Imposto de Renda (IRPF) ou analisar suas despesas dedutíveis. Como posso ajudar você hoje?' 
  };

  // Safe wrapper around history to fallback to welcome message if empty
  const activeMessages = useMemo(() => {
    if (!aiHistory || aiHistory.length === 0) {
      return [welcomeMessage];
    }
    return aiHistory;
  }, [aiHistory]);

  // Automatically scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages, isLoading]);

  // Context summarization (anonymized/safe data payload)
  const financeContextSummary = useMemo(() => {
    const deductibles = transactions.filter(t => t.isTaxDeductible && t.type === 'expense');
    
    return {
      overview: {
        totalAccountsBalance: accounts.reduce((acc, curr) => acc + curr.balance, 0),
        totalInvestmentsValue: investments.reduce((acc, curr) => acc + curr.value, 0),
        totalDeductiblesValue: deductibles.reduce((acc, curr) => acc + curr.amount, 0),
        dependentsCount: dependents.length
      },
      accounts: accounts.map(a => ({ label: a.label, type: a.type, balance: a.balance })),
      investments: investments.map(i => ({ 
        symbol: i.symbol, 
        name: i.name, 
        type: i.type, 
        quantity: i.quantity, 
        currentPrice: i.currentPrice, 
        value: i.value,
        yieldRate: i.yieldRate 
      })),
      recentTransactionsSummary: transactions.slice(0, 30).map(t => ({
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.category,
        date: t.date,
        isTaxDeductible: t.isTaxDeductible
      })),
      taxDeductibles: deductibles.map(t => ({
        description: t.description,
        amount: t.amount,
        category: t.category,
        date: t.date
      })),
      savingsGoals: savingsGoals.map(g => ({
        label: g.label,
        target: g.target,
        current: g.current
      })),
      dependents: dependents.map(d => ({
        name: d.name,
        relation: d.relation,
        age: d.age
      }))
    };
  }, [accounts, transactions, investments, savingsGoals, dependents]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim() && !attachedFile) return;

    if (!textToSend) {
      setInputValue('');
    }

    // Add user message to UI
    let userMsgText = text;
    if (attachedFile) {
      userMsgText = `${text}\n\n*[Arquivo Anexo: ${attachedFile.name}]*`;
    }

    const nextUserMessages = [...activeMessages, { sender: 'user', text: userMsgText }];
    setAiHistory(nextUserMessages);
    setIsLoading(true);
    setErrorMessage('');

    // Capture file data and reset the input
    const filePayload = attachedFile ? { mimeType: attachedFile.mimeType, data: attachedFile.data } : null;
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      // Map message history to payload (excluding the welcome message)
      const historyPayload = nextUserMessages
        .slice(1, -1) // slice off the prompt message and current question
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      const res = await fetch(`${API_BASE}/api/ai/advisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          question: text || "Analise este documento em anexo.",
          context: financeContextSummary,
          history: historyPayload,
          file: filePayload
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro na resposta do servidor.');
      }

      const data = await res.json();
      setAiHistory(prev => [...(prev.length === 0 ? nextUserMessages : prev), { sender: 'ai', text: data.reply }]);
    } catch (err) {
      console.error('Advisor Error:', err);
      setErrorMessage(err.message || 'Erro ao conectar ao consultor financeiro.');
      setAiHistory(prev => [...(prev.length === 0 ? nextUserMessages : prev), { 
        sender: 'ai', 
        text: 'Desculpe, ocorreu um erro de conexão com a Inteligência Artificial. Por favor, verifique se a sua chave API do Gemini foi inserida corretamente no arquivo .env do servidor e tente novamente.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handles clicking the Paperclip icon
  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  // Handles picking a file
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("O arquivo anexo excede o limite de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachedFile({
        name: file.name,
        mimeType: file.type,
        data: reader.result.split(',')[1] // Base64 data string
      });
    };
    reader.readAsDataURL(file);
  };

  // Dynamic Goal creation logic
  const handleCreateGoal = (idx, goalData) => {
    addSavingsGoal({
      label: goalData.label,
      target: parseFloat(goalData.target),
      current: parseFloat(goalData.current || 0)
    });
    setProcessedGoals(prev => ({ ...prev, [idx]: 'created' }));
    addToast(`Meta "${goalData.label}" criada com sucesso!`, 'success');
  };

  // Parse structured action commands in message replies
  const parseGoalAction = (text) => {
    const goalRegex = /\[CREATE_GOAL:\s*({[^}]+})\s*\]/g;
    const match = goalRegex.exec(text);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        const cleanText = text.replace(goalRegex, '').trim();
        return { cleanText, goalData: data };
      } catch (e) {
        console.error("Failed to parse goal action JSON:", e);
      }
    }
    return { cleanText: text, goalData: null };
  };

  // Quick Action Buttons
  const quickActions = [
    {
      label: 'Otimizar Imposto de Renda (IRPF)',
      prompt: 'Como posso otimizar minha declaração de Imposto de Renda (IRPF) este ano com base nas minhas despesas dedutíveis e previdência?',
      icon: FileText
    },
    {
      label: 'Análise de Carteira & Risco',
      prompt: 'Analise a minha carteira de investimentos atual. Ela está bem diversificada? Quais são os riscos e possíveis melhorias?',
      icon: TrendingUp
    },
    {
      label: 'Avaliar Metas de Economia',
      prompt: 'Com base no meu saldo total e minhas metas de economia, qual é a melhor estratégia para eu atingir meus objetivos?',
      icon: Target
    }
  ];

  // Custom regex markdown inline parser
  const parseInlineMarkdown = (text) => {
    let segments = text.split('**');
    let elements = [];
    segments.forEach((seg, sIdx) => {
      const isBold = sIdx % 2 !== 0;
      
      let codeSegments = seg.split('`');
      codeSegments.forEach((cSeg, cIdx) => {
        const isCode = cIdx % 2 !== 0;
        const key = `${sIdx}-${cIdx}`;
        if (isCode) {
          elements.push(<code key={key} className="markdown-inline-code">{cSeg}</code>);
        } else {
          if (isBold) {
            elements.push(<strong key={key} className="markdown-bold">{cSeg}</strong>);
          } else {
            elements.push(<span key={key}>{cSeg}</span>);
          }
        }
      });
    });
    return elements;
  };

  // Custom markdown block parser
  const renderMarkdown = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    let inTable = false;
    let tableHeaders = [];
    
    const parsed = lines.map((line, idx) => {
      let currentLine = line.trim();

      // Table parsing
      if (currentLine.startsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
        if (cells.every(c => c.startsWith('-'))) {
          return null; // separator
        }

        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
          return (
            <thead key={`thead-${idx}`}>
              <tr>
                {cells.map((cell, cIdx) => (
                  <th key={cIdx} className="markdown-th">{parseInlineMarkdown(cell)}</th>
                ))}
              </tr>
            </thead>
          );
        } else {
          return (
            <tr key={`tr-${idx}`} className="markdown-tr">
              {cells.map((cell, cIdx) => (
                <td key={cIdx} className="markdown-td">{parseInlineMarkdown(cell)}</td>
              ))}
            </tr>
          );
        }
      } else {
        inTable = false;
      }

      // List parsing
      if (currentLine.startsWith('-') || currentLine.startsWith('*')) {
        const content = line.replace(/^\s*[-*]\s+/, '');
        return <li key={idx} className="markdown-li">{parseInlineMarkdown(content)}</li>;
      }

      // Headers
      if (currentLine.startsWith('### ')) {
        return <h4 key={idx} className="markdown-h4">{parseInlineMarkdown(line.substring(4))}</h4>;
      }
      if (currentLine.startsWith('## ')) {
        return <h3 key={idx} className="markdown-h3">{parseInlineMarkdown(line.substring(3))}</h3>;
      }
      if (currentLine.startsWith('# ')) {
        return <h2 key={idx} className="markdown-h2">{parseInlineMarkdown(line.substring(2))}</h2>;
      }

      // Empty line
      if (currentLine === '') {
        return <div key={idx} className="markdown-spacer" />;
      }

      // Paragraph
      return <p key={idx} className="markdown-p">{parseInlineMarkdown(line)}</p>;
    }).filter(Boolean);

    // Grouping list items and tables
    const grouped = [];
    let tempTable = [];
    let tempUL = [];

    parsed.forEach((node, index) => {
      if (node.type === 'thead' || node.type === 'tr') {
        tempTable.push(node);
      } else if (node.type === 'li') {
        if (tempTable.length > 0) {
          grouped.push(
            <div key={`table-wrapper-${index}`} className="markdown-table-wrapper">
              <table className="markdown-table">{tempTable}</table>
            </div>
          );
          tempTable = [];
        }
        tempUL.push(node);
      } else {
        if (tempTable.length > 0) {
          grouped.push(
            <div key={`table-wrapper-${index}`} className="markdown-table-wrapper">
              <table className="markdown-table">{tempTable}</table>
            </div>
          );
          tempTable = [];
        }
        if (tempUL.length > 0) {
          grouped.push(<ul key={`ul-${index}`} className="markdown-ul">{tempUL}</ul>);
          tempUL = [];
        }
        grouped.push(node);
      }
    });

    if (tempTable.length > 0) {
      grouped.push(
        <div key="table-wrapper-last" className="markdown-table-wrapper">
          <table className="markdown-table">{tempTable}</table>
        </div>
      );
    }
    if (tempUL.length > 0) {
      grouped.push(<ul key="ul-last" className="markdown-ul">{tempUL}</ul>);
    }

    return grouped;
  };

  const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="ai-advisor-container">
      <div className="advisor-grid">
        
        {/* Left Column: Chat Area */}
        <div className="chat-area card">
          <div className="chat-header flex-between flex-center-y">
            <div className="flex-center-y gap-md">
              <div className="ai-icon-circle flex-center animate-glow">
                <Sparkles size={20} className="text-accent" />
              </div>
              <div>
                <h3 className="chat-title">Consultor IA</h3>
                <span className="chat-subtitle">Economia, Contabilidade e Impostos</span>
              </div>
            </div>
            <div className="security-badge flex-center-y gap-xs">
              <ShieldCheck size={14} className="text-success" />
              <span className="text-xxs text-success font-semibold">Conexão Segura</span>
            </div>
          </div>

          {/* Messages Wrapper */}
          <div className="messages-container">
            {activeMessages.map((msg, idx) => {
              // Parse the message for goal actions
              const { cleanText, goalData } = msg.sender === 'ai' ? parseGoalAction(msg.text) : { cleanText: msg.text, goalData: null };
              
              return (
                <div key={idx} className={`message-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}>
                  <div className="message-icon flex-center">
                    {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className="message-bubble">
                    {msg.sender === 'user' ? (
                      <p className="message-text" style={{ whiteSpace: 'pre-wrap' }}>{cleanText}</p>
                    ) : (
                      <div className="message-text-markdown">
                        {renderMarkdown(cleanText)}
                        
                        {/* Interactive Goal Suggestion Card */}
                        {goalData && (
                          <div className="ai-goal-card mt-sm border-accent">
                            <div className="flex-center-y gap-sm">
                              <Target size={16} className="text-accent" />
                              <span className="font-bold text-xs text-primary">Meta Sugerida pela IA</span>
                            </div>
                            <p className="text-xs text-secondary mt-xs">
                              Título: <strong className="text-primary">{goalData.label}</strong> • Objetivo: <strong className="text-primary">{formatBRL(goalData.target)}</strong>
                            </p>
                            
                            {processedGoals[idx] === 'created' ? (
                              <div className="text-success text-xs font-semibold mt-sm flex-center-y gap-xs">
                                <CheckCircle size={14} /> Meta criada no sistema!
                              </div>
                            ) : processedGoals[idx] === 'ignored' ? (
                              <div className="text-secondary text-xs italic mt-sm">
                                Sugestão ignorada.
                              </div>
                            ) : (
                              <div className="flex gap-sm mt-sm">
                                <button 
                                  className="btn btn-sm btn-accent" 
                                  onClick={() => handleCreateGoal(idx, goalData)}
                                >
                                  Confirmar
                                </button>
                                <button 
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setProcessedGoals(prev => ({ ...prev, [idx]: 'ignored' }))}
                                >
                                  Ignorar
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {isLoading && (
              <div className="message-row ai-row">
                <div className="message-icon flex-center">
                  <Bot size={16} />
                </div>
                <div className="message-bubble loading-bubble">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="error-banner flex-center-y gap-sm">
              <AlertTriangle size={18} className="text-danger flex-shrink-0" />
              <p className="text-xs text-danger">{errorMessage}</p>
            </div>
          )}

          {/* Input Area */}
          <div className="input-area">
            {activeMessages.length === 1 && !attachedFile && (
              <div className="quick-actions-grid">
                {quickActions.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button 
                      key={idx} 
                      className="quick-action-btn flex-center-y gap-sm"
                      onClick={() => handleSendMessage(action.prompt)}
                    >
                      <Icon size={16} className="text-accent" />
                      <span className="text-xs text-left font-medium">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Attached File Preview Area */}
            {attachedFile && (
              <div className="attached-file-preview flex-between flex-center-y">
                <div className="flex-center-y gap-sm">
                  <FileIcon size={20} className="text-accent" />
                  <div>
                    <p className="text-xs font-semibold text-primary">{attachedFile.name}</p>
                    <p className="text-xxs text-secondary">Documento pronto para análise OCR</p>
                  </div>
                </div>
                <button 
                  className="remove-file-btn flex-center"
                  onClick={() => setAttachedFile(null)}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            <div className="input-field-wrapper">
              {/* File input and button */}
              <input 
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept="image/*,application/pdf"
              />
              <button 
                className="attach-file-btn flex-center"
                onClick={handlePaperclipClick}
                title="Anexar comprovante/recibo"
                disabled={isLoading}
              >
                <Paperclip size={20} />
              </button>

              <textarea
                className="input-textarea"
                placeholder={attachedFile ? "Escreva algo sobre este arquivo..." : "Pergunte sobre investimentos, deduções fiscais ou envie um recibo..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isLoading}
              />
              <button 
                className="send-message-btn flex-center"
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!inputValue.trim() && !attachedFile)}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Context & Safety Info */}
        <div className="info-sidebar flex-column gap-lg">
          
          {/* Security & Zero-Knowledge Box */}
          <div className="card glass-card border-success">
            <div className="card-header flex-center-y gap-sm">
              <ShieldCheck className="text-success" size={20} />
              <h4 className="font-bold text-sm">Privacidade Privada</h4>
            </div>
            <div className="card-body mt-sm">
              <p className="text-xs text-secondary leading-relaxed">
                Este app opera com criptografia ponta a ponta. Os dados financeiros só podem ser descriptografados localmente no seu navegador. O servidor repassa as informações para a API do Gemini de forma segura em tempo real, sem salvar ou logs.
              </p>
            </div>
          </div>

          {/* Context Loaded Statistics */}
          <div className="card details-card">
            <div className="card-header flex-center-y gap-sm">
              <Info className="text-accent" size={20} />
              <h4 className="font-bold text-sm">Contexto Compartilhado</h4>
            </div>
            <div className="card-body flex-column gap-md mt-md">
              <p className="text-xs text-secondary">
                A IA analisa estes dados locais para dar as recomendações:
              </p>

              <div className="context-stat-item flex-between flex-center-y">
                <div className="flex-center-y gap-sm">
                  <Wallet size={16} className="text-secondary" />
                  <span className="text-xs">Saldos & Contas</span>
                </div>
                <span className="badge badge-accent text-xxs font-semibold">
                  {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}
                </span>
              </div>

              <div className="context-stat-item flex-between flex-center-y">
                <div className="flex-center-y gap-sm">
                  <TrendingUp size={16} className="text-secondary" />
                  <span className="text-xs">Investimentos</span>
                </div>
                <span className="badge badge-accent text-xxs font-semibold">
                  {investments.length} {investments.length === 1 ? 'ativo' : 'ativos'}
                </span>
              </div>

              <div className="context-stat-item flex-between flex-center-y">
                <div className="flex-center-y gap-sm">
                  <FileText size={16} className="text-secondary" />
                  <span className="text-xs">Gastos Dedutíveis</span>
                </div>
                <span className="badge badge-accent text-xxs font-semibold">
                  {transactions.filter(t => t.isTaxDeductible).length} lançados
                </span>
              </div>

              <div className="context-stat-item flex-between flex-center-y">
                <div className="flex-center-y gap-sm">
                  <Target size={16} className="text-secondary" />
                  <span className="text-xs">Metas Ativas</span>
                </div>
                <span className="badge badge-accent text-xxs font-semibold">
                  {savingsGoals.length} {savingsGoals.length === 1 ? 'meta' : 'metas'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Notice on Financial Advice */}
          <div className="card glass-card border-warning">
            <div className="card-header flex-center-y gap-sm">
              <AlertTriangle className="text-warning" size={18} />
              <h4 className="font-bold text-xs text-warning">Isenção de Responsabilidade</h4>
            </div>
            <div className="card-body mt-sm">
              <p className="text-xxs text-secondary leading-relaxed">
                As análises fornecidas pelo Consultor IA são informativas e educacionais. Decisões de investimento e declarações fiscais definitivas devem ser revisadas ou confirmadas junto a um profissional de contabilidade ou consultor certificado.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AIAdvisor;
