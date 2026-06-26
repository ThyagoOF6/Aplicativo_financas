import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import './AIDiagnosticsDrawer.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AIDiagnosticsDrawer = ({ 
  isOpen, 
  onClose, 
  title, 
  systemPrompt, 
  contextSummary, 
  jwtToken 
}) => {
  const [diagnosticText, setDiagnosticText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDiagnostic = async () => {
    if (!jwtToken || !isOpen) return;

    setIsLoading(true);
    setError('');
    setDiagnosticText('');

    try {
      const res = await fetch(`${API_BASE}/api/ai/advisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          question: systemPrompt,
          context: contextSummary,
          history: [] // No history, just a single turn diagnostic request
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao gerar diagnóstico.');
      }

      const data = await res.json();
      setDiagnosticText(data.reply);
    } catch (err) {
      console.error('Diagnostics Error:', err);
      setError(err.message || 'Erro ao obter dados do consultor IA.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostic();
    }
  }, [isOpen]);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

      if (currentLine.startsWith('-') || currentLine.startsWith('*')) {
        const content = line.replace(/^\s*[-*]\s+/, '');
        return <li key={idx} className="markdown-li">{parseInlineMarkdown(content)}</li>;
      }

      if (currentLine.startsWith('### ')) {
        return <h4 key={idx} className="markdown-h4">{parseInlineMarkdown(line.substring(4))}</h4>;
      }
      if (currentLine.startsWith('## ')) {
        return <h3 key={idx} className="markdown-h3">{parseInlineMarkdown(line.substring(3))}</h3>;
      }
      if (currentLine.startsWith('# ')) {
        return <h2 key={idx} className="markdown-h2">{parseInlineMarkdown(line.substring(2))}</h2>;
      }

      if (currentLine === '') {
        return <div key={idx} className="markdown-spacer" />;
      }

      return <p key={idx} className="markdown-p">{parseInlineMarkdown(line)}</p>;
    }).filter(Boolean);

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

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="drawer-header flex-between flex-center-y">
          <div className="flex-center-y gap-sm">
            <Sparkles size={20} className="text-accent" />
            <h3 className="drawer-title">{title}</h3>
          </div>
          <button className="drawer-close-btn flex-center" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="drawer-body">
          {isLoading && (
            <div className="drawer-loading flex-center flex-column gap-md">
              <div className="loading-spinner"></div>
              <p className="text-sm text-secondary">A IA está consolidando seus dados...</p>
            </div>
          )}

          {error && (
            <div className="drawer-error flex-column gap-md">
              <div className="flex-center-y gap-sm text-danger">
                <AlertTriangle size={24} />
                <h4 className="font-bold">Ocorreu um erro</h4>
              </div>
              <p className="text-xs text-secondary leading-relaxed">{error}</p>
              <button className="btn btn-sm btn-accent flex-center-y gap-xs" onClick={fetchDiagnostic}>
                <RefreshCw size={14} /> Tentar Novamente
              </button>
            </div>
          )}

          {!isLoading && !error && diagnosticText && (
            <div className="drawer-markdown-content fade-in-up">
              {renderMarkdown(diagnosticText)}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isLoading && !error && (
          <div className="drawer-footer flex-end">
            <button className="btn btn-secondary flex-center-y gap-xs" onClick={fetchDiagnostic}>
              <RefreshCw size={14} /> Atualizar Análise
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default AIDiagnosticsDrawer;
