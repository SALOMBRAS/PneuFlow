import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
import '../../components/MagicBento/MagicBento.css';
import { 
  Layers, 
  MessageSquare, 
  Eye, 
  Percent, 
  Plus, 
  Copy, 
  Check, 
  ArrowRight,
  TrendingUp,
  Info,
  Clock
} from 'lucide-react';

export default function DashboardHome() {
  const navigate = useNavigate();
  const { store, role, isSeller, user } = useStore();
  const [tiresCount, setTiresCount] = useState(0);
  const [leads, setLeads] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showPlanTooltip, setShowPlanTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState(null);

  const handleMouseEnter = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    setShowPlanTooltip(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowPlanTooltip(false);
    }, 5000);
    setTooltipTimeout(timeout);
  };

  // Mock visits stats - in a real scenario, this would also be scoped if possible
  const visits = 248;

  const loadData = useCallback(async () => {
    if (!store) return;
    try {
      const tires = await storageService.getPneus(store.id);
      setTiresCount(tires.length);

      const storeLeads = await storageService.getLeads(store.id);
      setLeads(storeLeads);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    }
  }, [store]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!store) return null;

  const publicLink = `${window.location.origin}/store/${store.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMetricGlowMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
    const relativeY = ((e.clientY - rect.top) / rect.height) * 100;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((e.clientY - rect.top - centerY) / centerY) * -4;
    const rotateY = ((e.clientX - rect.left - centerX) / centerX) * 4;

    card.style.setProperty('--dashboard-glow-x', `${relativeX}%`);
    card.style.setProperty('--dashboard-glow-y', `${relativeY}%`);
    card.style.setProperty('--dashboard-glow-intensity', '1');
    card.style.setProperty('--dashboard-tilt-x', `${rotateX.toFixed(2)}deg`);
    card.style.setProperty('--dashboard-tilt-y', `${rotateY.toFixed(2)}deg`);
  };

  const handleMetricGlowLeave = (e) => {
    const card = e.currentTarget;
    card.style.setProperty('--dashboard-glow-intensity', '0');
    card.style.setProperty('--dashboard-tilt-x', '0deg');
    card.style.setProperty('--dashboard-tilt-y', '0deg');
  };

  const metricCardProps = {
    className: 'card dashboard-glow-card',
    onMouseMove: handleMetricGlowMove,
    onMouseLeave: handleMetricGlowLeave
  };

  // Calculate conversion rate
  const conversionRate = visits > 0 ? ((leads.length / visits) * 100).toFixed(1) : 0;

  // Most popular tires based on lead count
  const getPopularTires = () => {
    const counts = {};
    leads.forEach(l => {
      const name = l.produto_nome || l.tireName || 'Pneu não identificado';
      counts[name] = (counts[name] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  };

  const popularTires = getPopularTires();

  return (
    <div className="animate-fade">
      {/* Welcome Header */}
      <div className="flex-between" style={{ marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: 0, textAlign: 'left' }}>Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário'}!</h1>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🏪 <strong>{store.nome}</strong>
            </span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              👤 Função: <strong style={{ textTransform: 'capitalize' }}>{role === 'owner' ? 'Dono' : 'Vendedor'}</strong>
            </span>
            {!isSeller && (
              <span style={{ 
                fontSize: '14px', 
                color: 'var(--text-secondary)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                position: 'relative'
              }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                💎 Plano: <strong style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{store.plano}</strong>
                <div 
                  onClick={() => setShowPlanTooltip(!showPlanTooltip)}
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: 'var(--text-muted)',
                    marginLeft: '2px'
                  }}
                >
                  {store.plano === 'free' ? <Info size={14} /> : <Clock size={14} />}
                </div>

                {/* Plan Expiration Tooltip */}
                {showPlanTooltip && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    marginTop: '10px',
                    backgroundColor: '#1a1d26',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    width: '280px',
                    zIndex: 100,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    lineHeight: '1.5',
                    textAlign: 'left',
                    animation: 'fadeIn 0.2s ease-out'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      left: '20px',
                      width: '10px',
                      height: '10px',
                      backgroundColor: '#1a1d26',
                      borderLeft: '1px solid var(--border)',
                      borderTop: '1px solid var(--border)',
                      transform: 'rotate(45deg)'
                    }} />
                    
                    {store.plano === 'free' ? (
                      <p>Você está no <strong>plano Free</strong>. Entre em contato com o suporte para desbloquear os recursos avançados do plano PRO.</p>
                    ) : (
                      <p>
                        Seu plano PRO vence em <strong>{store.plan_due_date ? new Date(store.plan_due_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data Indisponível'}</strong>. 
                        Para evitar a alteração automática para o plano Free, entre em contato com o suporte e regularize sua renovação.
                      </p>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open('https://wa.me/5585992369359', '_blank');
                      }}
                      style={{
                        marginTop: '12px',
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'var(--primary)',
                        color: '#000',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Falar com Suporte
                    </button>
                  </div>
                )}
              </span>
            )}
            {!isSeller && (
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📅 Desde: <strong>{new Date(store.created_at).toLocaleDateString('pt-BR')}</strong>
              </span>
            )}
          </div>
        </div>
        
        {/* Public Store Link Card */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          backgroundColor: 'var(--bg-card)', 
          border: '1px solid var(--border)', 
          padding: '10px 16px', 
          borderRadius: 'var(--radius-md)' 
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Link da loja:</span>
          <code style={{ fontSize: '13px', color: 'var(--primary)', backgroundColor: 'transparent', padding: 0 }}>
            {store.slug}
          </code>
          <button 
            onClick={handleCopyLink} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
            <span style={{ marginLeft: '4px' }}>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className={isSeller ? "grid-cols-2" : "grid-cols-4"} style={{ marginBottom: '32px' }}>
        <div {...metricCardProps} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', '--dashboard-glow-color': '245, 158, 11' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {isSeller ? 'Meus Pneus' : 'Total de Pneus'}
            </span>
            <div style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-glow)', padding: '6px', borderRadius: '6px' }}>
              <Layers size={20} />
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '28px', lineHeight: '1.2' }}>{tiresCount}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Modelos no catálogo</p>
          </div>
        </div>

        <div {...metricCardProps} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', '--dashboard-glow-color': '245, 158, 11' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {isSeller ? 'Meus Leads' : 'Leads no WhatsApp'}
            </span>
            <div style={{ color: 'var(--whatsapp)', backgroundColor: 'var(--whatsapp-glow)', padding: '6px', borderRadius: '6px' }}>
              <MessageSquare size={20} />
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '28px', lineHeight: '1.2' }}>{leads.length}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Cliques em "Tenho Interesse"</p>
          </div>
        </div>

        {!isSeller && (
          <div {...metricCardProps} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', '--dashboard-glow-color': '245, 158, 11' }}>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Visualizações</span>
              <div style={{ color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: '6px' }}>
                <Eye size={20} />
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '28px', lineHeight: '1.2' }}>{visits}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Visitas à sua vitrine</p>
            </div>
          </div>
        )}

        {!isSeller && (
          <div {...metricCardProps} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', '--dashboard-glow-color': '245, 158, 11' }}>
            <div className="flex-between" style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Taxa de Conversão</span>
              <div style={{ color: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.1)', padding: '6px', borderRadius: '6px' }}>
                <Percent size={20} />
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '28px', lineHeight: '1.2' }}>{conversionRate}%</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Visitas convertidas em cliques</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Section: Leads and Popular Items */}
      <div
        className="grid-cols-2 dashboard-home-main-grid"
        style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px', alignItems: 'start' }}
      >
        
        {/* Recent Leads */}
        <div {...metricCardProps} className="card dashboard-home-leads-card dashboard-glow-card" style={{ padding: '24px', '--dashboard-glow-color': '245, 158, 11' }}>
          <div className="flex-between dashboard-home-section-header" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px' }}>Leads Recentes (WhatsApp)</h3>
            <button 
              onClick={() => navigate('/dashboard/leads')} 
              className="btn btn-outline" 
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Ver todos <ArrowRight size={12} style={{ marginLeft: '4px' }} />
            </button>
          </div>
          
          {leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              Nenhum lead gerado ainda. Coloque o link da sua vitrine nas redes sociais para começar a receber contatos!
            </div>
          ) : (
            <div className="dashboard-home-leads-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {leads.slice(0, 4).map((lead) => (
                <div 
                  key={lead.id} 
                  className="dashboard-home-lead-item"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    textAlign: 'left'
                  }}
                >
                  <div className="flex-between dashboard-home-lead-top" style={{ marginBottom: '8px' }}>
                    <div className="dashboard-home-lead-name" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{lead.nome_cliente || 'Cliente Interessado'}</span>
                      <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, wordBreak: 'break-word' }}>{lead.produto_nome || lead.tireName}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {new Date(lead.created_at || lead.data_interesse || lead.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="dashboard-home-lead-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span>📦 Origem:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{lead.origem || 'WhatsApp'}</span>
                    {(lead.produto_medida || lead.vehicleInfo) && (
                      <>
                        <span style={{ margin: '0 4px', opacity: 0.3 }}>|</span>
                        <span>📏 Ref: {lead.produto_medida || lead.vehicleInfo}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular items and Actions */}
        <div className="dashboard-home-side-column" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Popular Tires */}
          <div {...metricCardProps} className="card dashboard-home-popular-card dashboard-glow-card" style={{ padding: '24px', '--dashboard-glow-color': '245, 158, 11' }}>
            <h3 className="dashboard-home-popular-title" style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Pneus Mais Procurados
            </h3>
            
            {popularTires.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Aguardando interações na vitrine para gerar estatísticas.</p>
            ) : (
              <div className="dashboard-home-popular-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {popularTires.map((tire, idx) => (
                  <div key={idx} className="flex-between dashboard-home-popular-item" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', minWidth: 0 }}>
                      {idx + 1}. {tire.name}
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: '11px' }}>{tire.count} cliques</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div {...metricCardProps} className="card dashboard-home-actions-card dashboard-glow-card" style={{ padding: '24px', '--dashboard-glow-color': '245, 158, 11' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Ações Rápidas</h3>
            <div className="dashboard-home-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => navigate('/dashboard/catalog')} 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                <Plus size={16} /> Cadastrar Novo Pneu
              </button>
              <button 
                onClick={() => navigate('/dashboard/settings')} 
                className="btn btn-secondary" 
                style={{ width: '100%', justifyContent: 'flex-start' }}
              >
                Personalizar Vitrine
              </button>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-home-main-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }

          .dashboard-home-main-grid > * {
            min-width: 0;
          }

          .dashboard-home-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .dashboard-home-section-header .btn {
            width: 100%;
          }

          .dashboard-home-leads-card,
          .dashboard-home-popular-card,
          .dashboard-home-actions-card {
            padding: 20px 16px !important;
          }

          .dashboard-home-leads-card,
          .dashboard-home-popular-card,
          .dashboard-home-actions-card {
            width: 100%;
            margin-left: auto;
            margin-right: auto;
          }

          .dashboard-home-leads-list {
            gap: 12px !important;
          }

          .dashboard-home-lead-item {
            padding: 14px 12px !important;
            border-radius: 14px !important;
          }

          .dashboard-home-lead-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .dashboard-home-lead-top > span {
            align-self: flex-start;
          }

          .dashboard-home-lead-meta {
            line-height: 1.55;
          }

          .dashboard-home-side-column {
            gap: 20px !important;
          }

          .dashboard-home-popular-title {
            justify-content: center;
            text-align: center;
            width: 100%;
          }

          .dashboard-home-popular-list {
            gap: 12px !important;
          }

          .dashboard-home-popular-item {
            flex-direction: row;
            align-items: center;
            gap: 12px;
            padding-bottom: 12px !important;
          }

          .dashboard-home-popular-item > span:first-child {
            max-width: calc(100% - 104px);
          }

          .dashboard-home-actions {
            gap: 10px !important;
          }

          .dashboard-home-actions .btn {
            width: 100%;
            justify-content: center !important;
          }
        }

        @media (max-width: 480px) {
          .dashboard-home-lead-item,
          .dashboard-home-popular-card,
          .dashboard-home-actions-card {
            border-radius: 16px;
          }

          .dashboard-home-lead-meta {
            font-size: 11px !important;
          }

          .dashboard-home-popular-item > span:first-child {
            max-width: calc(100% - 92px);
          }
        }
      `}</style>
    </div>
  );
}
