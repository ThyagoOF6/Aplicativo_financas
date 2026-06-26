import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  Users, 
  FileText, 
  Calendar, 
  TrendingUp, 
  FolderOpen,
  BarChart3,
  Settings,
  Target,
  Sparkles,
  X
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts', label: 'Contas & Carteiras', icon: Wallet },
    { id: 'transactions', label: 'Fluxo de Caixa', icon: ArrowLeftRight },
    { id: 'family', label: 'Gestão Familiar', icon: Users },
    { id: 'taxes', label: 'Assistente Fiscal', icon: FileText },
    { id: 'reminders', label: 'Alertas & Contas', icon: Calendar },
    { id: 'investments', label: 'Investimentos', icon: TrendingUp },
    { id: 'goals', label: 'Metas de Economia', icon: Target },
    { id: 'ai-advisor', label: 'Consultor IA', icon: Sparkles },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'datahub', label: 'Cofre & Integração', icon: FolderOpen },
    { id: 'settings', label: 'Configurações', icon: Settings }
  ];



  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <TrendingUp className="logo-icon" size={28} />
        <span className="logo-text">Wealth Manager</span>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Fechar menu">
          <X size={20} />
        </button>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} className="nav-item-icon" />
              <span className="nav-item-text">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="sidebar-footer">
        <p className="footer-version">v1.0.0 Premium</p>
      </div>
    </aside>
  );
};

export default Sidebar;
