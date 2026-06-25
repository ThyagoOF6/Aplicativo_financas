import React, { useContext, useState, useMemo } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { 
  Plus, Trash2, Calendar, AlertCircle, CheckCircle, BellRing, BellOff, 
  ChevronLeft, ChevronRight, List, CalendarDays, ShieldAlert, Award 
} from 'lucide-react';
import { formatBRL } from '../../utils/financeUtils';
import { generateCalendarGrid, MONTHS_PT } from '../../utils/dateUtils';

const CalendarAlerts = () => {
  const { 
    reminders, 
    transactions, 
    investments, 
    profile, 
    addReminder, 
    toggleReminderPaid, 
    deleteReminder 
  } = useContext(FinanceContext);

  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Calendar active month/year (Defaults to June 2026 for consistency with mock data)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June (0-indexed)

  // Popover details for clicked day
  const [selectedDayDate, setSelectedDayDate] = useState(null);
  const [showPopover, setShowPopover] = useState(false);

  const getDaysRemaining = (dueDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Smart Alerts logic
  const smartAlerts = useMemo(() => {
    const alerts = [];

    // 1. IRPF Alert
    const deductibleCount = transactions.filter(t => t.isTaxDeductible).length;
    if (deductibleCount > 0) {
      alerts.push({
        id: 'irpf',
        type: 'info',
        icon: <ShieldAlert className="text-accent" size={18} />,
        title: 'Período IRPF Ativo',
        text: `Você possui ${deductibleCount} despesas dedutíveis (Saúde/Educação) no Fluxo de Caixa. Lembre-se de anexar os comprovantes na aba de Integração.`
      });
    }

    // 2. Portfolio Rebalancing Alert
    if (profile) {
      const totalInvValue = investments.reduce((acc, curr) => acc + curr.value, 0);
      const volatileValue = investments
        .filter(inv => inv.type === 'Ações' || inv.type === 'Cripto')
        .reduce((acc, curr) => acc + curr.value, 0);
      
      const volatilePct = totalInvValue > 0 ? (volatileValue / totalInvValue) * 100 : 0;

      if (profile === 'Conservador' && volatilePct > 30) {
        alerts.push({
          id: 'rebalance',
          type: 'warning',
          icon: <Award className="text-warning" size={18} />,
          title: 'Alerta de Risco (Rebalanceamento)',
          text: `Sua carteira possui ${volatilePct.toFixed(1)}% em ativos voláteis (Ações/Cripto). O limite recomendado para o perfil Conservador é 30%. Considere rebalancear.`
        });
      } else if (profile === 'Moderado' && volatilePct > 60) {
        alerts.push({
          id: 'rebalance',
          type: 'warning',
          icon: <Award className="text-warning" size={18} />,
          title: 'Alerta de Risco (Rebalanceamento)',
          text: `Sua carteira possui ${volatilePct.toFixed(1)}% em ativos voláteis. O limite recomendado para o perfil Moderado é 60%.`
        });
      }
    }

    return alerts;
  }, [transactions, investments, profile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount || !dueDate) return;

    addReminder({
      description,
      amount: parseFloat(amount),
      dueDate
    });

    setDescription('');
    setAmount('');
    setDueDate('');
    setShowForm(false);
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const getReminderStatusInfo = (rem) => {
    if (rem.paid) {
      return { label: 'Pago', class: 'status-paid', colorClass: 'dot-paid', icon: <CheckCircle className="text-success" size={14} /> };
    }
    const days = getDaysRemaining(rem.dueDate);
    if (days < 0) {
      return { label: 'Atrasado', class: 'status-overdue', colorClass: 'dot-overdue', icon: <AlertCircle className="text-danger" size={14} /> };
    }
    if (days <= 3) {
      return { label: `Vence em ${days}d`, class: 'status-warning', colorClass: 'dot-warning', icon: <AlertCircle className="text-warning" size={14} /> };
    }
    return { label: `Vence em ${days}d`, class: 'status-pending', colorClass: 'dot-pending', icon: <Calendar className="text-accent" size={14} /> };
  };

  // Generate calendar grid
  const calendarCells = useMemo(() => {
    return generateCalendarGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Map reminders to dates
  const remindersByDate = useMemo(() => {
    const map = {};
    reminders.forEach(rem => {
      if (!map[rem.dueDate]) {
        map[rem.dueDate] = [];
      }
      map[rem.dueDate].push(rem);
    });
    return map;
  }, [reminders]);

  const handleCellClick = (cell) => {
    if (cell.dateString && remindersByDate[cell.dateString]) {
      setSelectedDayDate(cell.dateString);
      setShowPopover(true);
    }
  };

  const selectedDayReminders = selectedDayDate ? remindersByDate[selectedDayDate] || [] : [];

  return (
    <div className="reminders-container flex-column gap-lg">
      <div className="section-header flex-between">
        <div>
          <h1>Alertas & Cronograma de Contas</h1>
          <p>Evite multas e juros. Monitore o vencimento de boletos e configure alertas inteligentes.</p>
        </div>
        <button className="btn btn-primary flex-center" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} style={{ marginRight: 6 }} />
          {showForm ? 'Fechar Form' : 'Novo Alerta'}
        </button>
      </div>

      {/* Smart Alerts Center */}
      {smartAlerts.length > 0 && (
        <div className="smart-alerts-container flex-column gap-sm animate-slide-down">
          {smartAlerts.map(alert => (
            <div key={alert.id} className={`alert-message ${alert.type === 'warning' ? 'warning-alert' : 'info-alert'} flex-center-y`}>
              <div className="mr-sm flex-shrink-0">{alert.icon}</div>
              <div>
                <span className="font-bold text-xs block">{alert.title}</span>
                <span className="text-xxs text-secondary">{alert.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card animate-slide-down">
          <h3>Adicionar Nova Conta / Boleto</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="rem-desc">Descrição do Boleto</label>
              <input 
                id="rem-desc"
                type="text" 
                placeholder="Ex: Condomínio, Energia Enel, etc." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="rem-amount">Valor (R$)</label>
              <input 
                id="rem-amount"
                type="number" 
                step="0.01" 
                placeholder="0.00" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label htmlFor="rem-date">Data de Vencimento</label>
              <input 
                id="rem-date"
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                required 
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Agendar Boleto</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {/* Overview Stats */}
      <div className="reminders-stats-grid">
        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Total Pendente</span>
            <h2 className="val text-warning amount-secondary">
              {formatBRL(reminders.filter(r => !r.paid).reduce((acc, curr) => acc + curr.amount, 0))}
            </h2>
          </div>
          <BellRing className="text-warning animate-bounce" size={24} />
        </div>

        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Boletos Atrasados</span>
            <h2 className="val text-danger amount-secondary">
              {reminders.filter(r => !r.paid && getDaysRemaining(r.dueDate) < 0).length}
            </h2>
          </div>
          <AlertCircle className="text-danger" size={24} />
        </div>

        <div className="card stat-mini-card flex-between flex-center-y">
          <div>
            <span className="label text-secondary text-xs">Contas Pagas no Mês</span>
            <h2 className="val text-success amount-secondary">
              {formatBRL(reminders.filter(r => r.paid).reduce((acc, curr) => acc + curr.amount, 0))}
            </h2>
          </div>
          <CheckCircle className="text-success" size={24} />
        </div>
      </div>

      {/* View Switcher and Calendar Navigation */}
      <div className="flex-between flex-center-y mt-md">
        <div className="subtab-selector flex-center-y">
          <button 
            className={`btn subtab-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays size={16} style={{ marginRight: 6 }} />
            Calendário Mensal
          </button>
          <button 
            className={`btn subtab-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={16} style={{ marginRight: 6 }} />
            Lista de Boletos
          </button>
        </div>

        {viewMode === 'calendar' && (
          <div className="flex-center-y gap-md">
            <button className="btn btn-secondary btn-icon-sm" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-sm" style={{ minWidth: 140, textAlign: 'center' }}>
              {MONTHS_PT[currentMonth]} de {currentYear}
            </span>
            <button className="btn btn-secondary btn-icon-sm" onClick={nextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Calendar Grid View */}
      {viewMode === 'calendar' ? (
        <div className="card details-card p-none animate-fade-in" style={{ padding: '20px' }}>
          <div className="calendar-grid">
            {/* Week Headers */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(w => (
              <div key={w} className="calendar-week-header text-center font-bold text-secondary text-xs pb-sm">
                {w}
              </div>
            ))}

            {/* Calendar Cells */}
            {calendarCells.map((cell, idx) => {
              const dayReminders = cell.dateString ? remindersByDate[cell.dateString] || [] : [];
              const hasReminders = dayReminders.length > 0;
              
              return (
                <div 
                  key={idx} 
                  className={`calendar-cell flex-column flex-between ${!cell.isCurrentMonth ? 'empty' : ''} ${hasReminders ? 'has-reminders' : ''}`}
                  onClick={() => handleCellClick(cell)}
                >
                  <span className="calendar-day-num font-semibold text-xs">{cell.day}</span>
                  
                  {hasReminders && (
                    <div className="calendar-dots-container flex-center gap-xxs">
                      {dayReminders.slice(0, 3).map(rem => {
                        const status = getReminderStatusInfo(rem);
                        return (
                          <span 
                            key={rem.id} 
                            className={`calendar-dot ${status.colorClass}`}
                            title={`${rem.description}: ${formatBRL(rem.amount)}`}
                          ></span>
                        );
                      })}
                      {dayReminders.length > 3 && (
                        <span className="text-xxs text-secondary font-bold">+{dayReminders.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View (Original) */
        <div className="card table-card animate-fade-in">
          <div className="table-responsive">
            <table className="reminders-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {reminders.length > 0 ? (
                  reminders.map(rem => {
                    const status = getReminderStatusInfo(rem);
                    return (
                      <tr key={rem.id} className={rem.paid ? 'row-paid' : 'row-pending'}>
                        <td>
                          <span className={`status-pill ${status.class} flex-center-y text-xs font-semibold`}>
                            {status.icon}
                            <span style={{ marginLeft: 6 }}>{status.label}</span>
                          </span>
                        </td>
                        <td className="font-semibold">{rem.description}</td>
                        <td>{rem.dueDate.split('-').reverse().join('/')}</td>
                        <td className="font-semibold">{formatBRL(rem.amount)}</td>
                        <td>
                          <div className="action-buttons-flex">
                            <button
                              className={`btn btn-sm ${rem.paid ? 'btn-secondary' : 'btn-primary'}`}
                              onClick={() => toggleReminderPaid(rem.id)}
                              title={rem.paid ? 'Marcar como Não Pago' : 'Marcar como Pago'}
                            >
                              {rem.paid ? <BellOff size={14} /> : <BellRing size={14} />}
                              <span style={{ marginLeft: 4 }}>{rem.paid ? 'Estornar' : 'Pagar'}</span>
                            </button>
                            <button 
                              className="delete-icon-btn ml-sm"
                              onClick={() => {
                                if (confirm('Excluir este lembrete?')) {
                                  deleteReminder(rem.id);
                                }
                              }}
                              title="Excluir Lembrete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="empty-table-cell">Nenhum boleto ou lembrete agendado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pop-over modal for clicking on calendar days */}
      {showPopover && (
        <div className="modal-overlay flex-center animate-fade-in" onClick={() => setShowPopover(false)}>
          <div className="modal-content card glass-card animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px' }}>
            <div className="modal-header flex-between border-bottom pb-md mb-md">
              <h3>Boletos para {selectedDayDate.split('-').reverse().join('/')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPopover(false)}>Fechar</button>
            </div>
            <div className="modal-body flex-column gap-md">
              {selectedDayReminders.map(rem => {
                const status = getReminderStatusInfo(rem);
                return (
                  <div key={rem.id} className="flex-between flex-center-y p-sm border-radius-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <p className="font-semibold text-sm">{rem.description}</p>
                      <p className="amount-secondary text-xs mt-xs text-accent">{formatBRL(rem.amount)}</p>
                      <span className={`status-pill ${status.class} text-xxs font-semibold mt-sm inline-block`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex-center-y gap-sm">
                      <button
                        className={`btn btn-sm ${rem.paid ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => toggleReminderPaid(rem.id)}
                      >
                        {rem.paid ? 'Estornar' : 'Pagar'}
                      </button>
                      <button 
                        className="delete-icon-btn" 
                        onClick={() => {
                          if (confirm('Excluir este lembrete?')) {
                            deleteReminder(rem.id);
                            // Close popover if no more reminders
                            if (selectedDayReminders.length <= 1) {
                              setShowPopover(false);
                            }
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarAlerts;
