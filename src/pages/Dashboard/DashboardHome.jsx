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
  Clock,
  DollarSign,
  CheckCircle2
} from 'lucide-react';

const emptyCommercialMetrics = {
  totalLeads: 0,
  totalSales: 0,
  confirmedRevenue: 0,
  totalTires: 0,
  activeTires: 0,
  totalStock: 0,
  totalVisits: 0,
  overallConversionRate: 0,
  sellerRanking: [],
  partialErrors: []
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

const formatPercent = (value) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });
};

const buildCommercialMetrics = ({ leads = [], pneus = [], sellers = [], visits = [] }) => {
  const sellerByUserId = new Map();
  const sellerByRefCode = new Map();
  const ranking = new Map();

  const makeUnknownSeller = () => ({
    key: 'sem-vendedor',
    name: 'Sem vendedor',
    email: '',
    refCode: '',
    status: 'unknown'
  });

  const ensureRankingEntry = (seller) => {
    const target = seller || makeUnknownSeller();
    if (!ranking.has(target.key)) {
      ranking.set(target.key, {
        key: target.key,
        name: target.name,
        email: target.email,
        refCode: target.refCode,
        status: target.status,
        leads: 0,
        sales: 0,
        revenue: 0,
        visits: 0,
        conversionRate: 0
      });
    }
    return ranking.get(target.key);
  };

  sellers
    .filter((seller) => seller.role === 'seller' || seller.ref_code || seller.user_id)
    .forEach((seller) => {
      const normalizedSeller = {
        key: seller.id || seller.user_id || seller.ref_code || seller.email,
        name: seller.nome || seller.email || 'Vendedor',
        email: seller.email || '',
        refCode: seller.ref_code || '',
        status: seller.status || ''
      };

      if (seller.user_id) sellerByUserId.set(seller.user_id, normalizedSeller);
      if (seller.ref_code) sellerByRefCode.set(seller.ref_code, normalizedSeller);
      ensureRankingEntry(normalizedSeller);
    });

  const resolveSeller = (item) => {
    if (item?.seller_id && sellerByUserId.has(item.seller_id)) return sellerByUserId.get(item.seller_id);
    if (item?.ref_code && sellerByRefCode.has(item.ref_code)) return sellerByRefCode.get(item.ref_code);
    return makeUnknownSeller();
  };

  leads.forEach((lead) => {
    const entry = ensureRankingEntry(resolveSeller(lead));
    const price = Number(lead.produto_preco || 0);
    const isSold = lead.venda_confirmada === true;

    entry.leads += 1;
    if (isSold) {
      entry.sales += 1;
      entry.revenue += price;
    }
  });

  visits.forEach((visit) => {
    const entry = ensureRankingEntry(resolveSeller(visit));
    entry.visits += 1;
  });

  const sellerRanking = Array.from(ranking.values())
    .map((entry) => ({
      ...entry,
      conversionRate: entry.visits > 0 ? (entry.sales / entry.visits) * 100 : 0
    }))
    .sort((a, b) => {
      if (b.sales !== a.sales) return b.sales - a.sales;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.leads - a.leads;
    });

  const confirmedSales = leads.filter((lead) => lead.venda_confirmada === true);
  const totalVisits = visits.length;

  return {
    totalLeads: leads.length,
    totalSales: confirmedSales.length,
    confirmedRevenue: confirmedSales.reduce((sum, lead) => sum + Number(lead.produto_preco || 0), 0),
    totalTires: pneus.length,
    activeTires: pneus.filter((pneu) => pneu.status === 'ativo').length,
    totalStock: pneus.reduce((sum, pneu) => sum + Number(pneu.estoque || 0), 0),
    totalVisits,
    overallConversionRate: totalVisits > 0 ? (confirmedSales.length / totalVisits) * 100 : 0,
    sellerRanking,
    partialErrors: []
  };
};

function MetricButton({ metric, isSelected, onClick }) {
  return (
    <button
      type="button"
      className={`dashboard-metric-card ${isSelected ? 'is-selected' : ''}`}
      onClick={onClick}
      aria-expanded={isSelected}
      aria-controls="dashboard-metric-details"
    >
      <div className="dashboard-metric-card__top">
        <span>{metric.label}</span>
        <div className={`dashboard-metric-card__icon dashboard-metric-card__icon--${metric.tone || 'primary'}`}>
          {metric.icon}
        </div>
      </div>
      <strong>{metric.value}</strong>
      <small>{metric.helper}</small>
    </button>
  );
}

function MetricDetailContent({ metric }) {
  if (!metric) return null;

  return (
    <>
      <div className="dashboard-detail-head">
        <div>
          <span className="dashboard-detail-eyebrow">Detalhe da métrica</span>
          <h3>{metric.label}</h3>
        </div>
        <strong>{metric.value}</strong>
      </div>

      <div className="dashboard-detail-grid">
        {metric.details.map((detail) => (
          <div key={detail.label} className="dashboard-detail-item">
            <span>{detail.label}</span>
            <strong>{detail.value}</strong>
          </div>
        ))}
      </div>

      <p className="dashboard-detail-note">{metric.note}</p>
    </>
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { store, role, isSeller, user } = useStore();
  const [leads, setLeads] = useState([]);
  const [commercialMetrics, setCommercialMetrics] = useState(emptyCommercialMetrics);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPlanTooltip, setShowPlanTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

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

  const loadData = useCallback(async () => {
    if (!store) return;
    setMetricsLoading(true);
    setMetricsError('');
    try {
      const data = await storageService.getDashboardCommercialMetrics(store.id);
      const metrics = buildCommercialMetrics(data);
      setCommercialMetrics(metrics);
      setLeads(data.leads || []);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setCommercialMetrics(emptyCommercialMetrics);
      setLeads([]);
      setMetricsError('Algumas métricas não puderam ser carregadas agora.');
    } finally {
      setMetricsLoading(false);
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

  // Most popular tires based on lead count
  const getPopularTires = () => {
    const counts = {};
    leads.forEach(l => {
      const name = l.produto_nome || 'Pneu não identificado';
      counts[name] = (counts[name] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  };

  const popularTires = getPopularTires();
  const visits = commercialMetrics.totalVisits;
  const conversionRate = formatPercent(commercialMetrics.overallConversionRate);
  const bestSeller = commercialMetrics.sellerRanking[0] || null;
  const latestLead = leads[0] || null;
  const topPopularTire = popularTires[0];
  const topSellerConversion = commercialMetrics.sellerRanking.find((seller) => seller.visits > 0);

  const metricCards = [
    {
      id: 'tires',
      label: isSeller ? 'Meus Pneus' : 'Total de Pneus',
      value: commercialMetrics.totalTires,
      helper: `${commercialMetrics.activeTires} ativos • ${commercialMetrics.totalStock} em estoque`,
      icon: <Layers size={20} />,
      tone: 'primary',
      details: [
        { label: 'Total de pneus', value: commercialMetrics.totalTires },
        { label: 'Pneus ativos', value: commercialMetrics.activeTires },
        { label: 'Estoque total', value: commercialMetrics.totalStock },
        { label: 'Mais procurado', value: topPopularTire ? `${topPopularTire.name} (${topPopularTire.count})` : 'Sem dados' }
      ],
      note: 'Resumo do catálogo atual, considerando pneus cadastrados, ativos e estoque total.'
    },
    {
      id: 'leads',
      label: isSeller ? 'Meus Leads' : 'Leads no WhatsApp',
      value: commercialMetrics.totalLeads,
      helper: 'Cliques em "Tenho Interesse"',
      icon: <MessageSquare size={20} />,
      tone: 'whatsapp',
      details: [
        { label: 'Total de leads', value: commercialMetrics.totalLeads },
        { label: 'Vendas confirmadas', value: commercialMetrics.totalSales },
        { label: 'Último lead', value: latestLead?.nome_cliente || 'Nenhum' },
        { label: 'Origem principal', value: latestLead?.origem || 'WhatsApp' }
      ],
      note: 'Leads gerados pelo botão Tenho Interesse e contatos vindos da vitrine.'
    },
    {
      id: 'revenue',
      label: 'Faturamento',
      value: formatCurrency(commercialMetrics.confirmedRevenue),
      helper: 'Somente vendas confirmadas',
      icon: <DollarSign size={20} />,
      tone: 'primary',
      details: [
        { label: 'Valor total confirmado', value: formatCurrency(commercialMetrics.confirmedRevenue) },
        { label: 'Vendas consideradas', value: commercialMetrics.totalSales },
        { label: 'Taxa de conversão', value: `${conversionRate}%` },
        { label: 'Fórmula', value: 'vendas / visualizações' }
      ],
      note: 'Soma de produto_preco em vendas confirmadas.'
    },
    {
      id: 'visits',
      label: 'Visualizações',
      value: visits,
      helper: 'Visitas por indicação/referral',
      icon: <Eye size={20} />,
      tone: 'blue',
      details: [
        { label: 'Total de visitas', value: visits },
        { label: 'Melhor vendedor', value: bestSeller?.name || 'Sem dados' },
        { label: 'Ranking resumido', value: bestSeller ? `${bestSeller.sales} vendas • ${bestSeller.leads} leads` : 'Sem dados' },
        { label: 'Conversão por vendedor', value: topSellerConversion ? `${topSellerConversion.name}: ${formatPercent(topSellerConversion.conversionRate)}%` : 'Sem dados' }
      ],
      note: 'Visualizações registradas por links de indicação.'
    },
    {
      id: 'conversion',
      label: 'Taxa de conversão',
      value: `${conversionRate}%`,
      helper: 'Vendas confirmadas por visitas',
      icon: <Percent size={20} />,
      tone: 'purple',
      details: [
        { label: 'Conversão geral', value: `${conversionRate}%` },
        { label: 'Fórmula', value: 'vendas / visualizações' }
      ],
      note: 'Se não houver visualizações, a conversão será 0%.'
    }
  ].filter((metric) => !['sales', 'conversion'].includes(metric.id));
  const activeMetric = selectedMetric ? metricCards.find((metric) => metric.id === selectedMetric) : null;

  const closeMetricDetail = () => {
    setSelectedMetric(null);
    setMobileDetailOpen(false);
  };

  const openMetricDetail = (metricId) => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

    setSelectedMetric((current) => {
      const nextMetric = current === metricId ? null : metricId;
      if (isMobile) setMobileDetailOpen(Boolean(nextMetric));
      return nextMetric;
    });
  };

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

      {(metricsLoading || metricsError) && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            color: metricsError ? 'var(--warning)' : 'var(--text-secondary)',
            fontSize: '13px',
            textAlign: 'left'
          }}
        >
          {metricsLoading ? 'Carregando métricas comerciais...' : metricsError}
        </div>
      )}

      <div className="dashboard-metric-grid">
        {metricCards.map((metric) => (
          <MetricButton
            key={metric.id}
            metric={metric}
            isSelected={selectedMetric === metric.id}
            onClick={() => openMetricDetail(metric.id)}
          />
        ))}
      </div>

      {activeMetric && (
        <section id="dashboard-metric-details" className="dashboard-detail-panel" aria-live="polite">
          <MetricDetailContent metric={activeMetric} />
        </section>
      )}

      {mobileDetailOpen && activeMetric && (
        <div className="dashboard-mobile-detail-backdrop" onClick={closeMetricDetail}>
          <div
            className="dashboard-mobile-detail-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhes de ${activeMetric?.label || 'métrica'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="dashboard-mobile-detail-close"
              onClick={closeMetricDetail}
              aria-label="Fechar detalhes"
            >
              ×
            </button>
            <MetricDetailContent metric={activeMetric} />
          </div>
        </div>
      )}

      <div className="dashboard-content-grid">
        <div className="dashboard-main-stack">
        <div {...metricCardProps} className="card dashboard-home-leads-card dashboard-glow-card" style={{ padding: '22px', '--dashboard-glow-color': '245, 158, 11' }}>
          <div className="flex-between dashboard-home-section-header" style={{ marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '18px', margin: 0 }}>Leads Recentes</h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Últimos contatos recebidos pela vitrine.</p>
            </div>
            <button onClick={() => navigate('/dashboard/leads')} className="btn btn-outline dashboard-small-action">
              Ver todos <ArrowRight size={12} />
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="dashboard-empty-block">
              Nenhum lead gerado ainda. Divulgue sua vitrine para começar a receber contatos.
            </div>
          ) : (
            <div className="dashboard-home-leads-list">
              {leads.slice(0, 4).map((lead) => (
                <div key={lead.id} className="dashboard-home-lead-item">
                  <div className="flex-between dashboard-home-lead-top">
                    <div className="dashboard-home-lead-name">
                      <span>{lead.nome_cliente || 'Cliente Interessado'}</span>
                      <span>{lead.produto_nome || 'Pneu não identificado'}</span>
                    </div>
                    <span className="dashboard-home-lead-date">
                      {lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}
                    </span>
                  </div>
                  <div className="dashboard-home-lead-meta">
                    <span>Origem:</span>
                    <strong>{lead.origem || 'WhatsApp'}</strong>
                    {lead.produto_medida && (
                      <>
                        <span className="dashboard-home-lead-separator">|</span>
                        <span>Ref: {lead.produto_medida}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          <div
            {...metricCardProps}
            className="card dashboard-home-actions-card dashboard-glow-card dashboard-actions-compact"
            style={{ '--dashboard-glow-color': '245, 158, 11' }}
          >
            <h3>Ações Rápidas</h3>
            <div className="dashboard-home-actions">
              <button onClick={() => navigate('/dashboard/catalog')} className="btn btn-primary">
                <Plus size={15} /> Cadastrar Pneu
              </button>
              <button onClick={() => navigate('/dashboard/settings')} className="btn btn-secondary">
                Personalizar
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-side-stack">
          <div {...metricCardProps} className="card dashboard-home-popular-card dashboard-glow-card" style={{ padding: '22px', '--dashboard-glow-color': '245, 158, 11' }}>
            <h3 className="dashboard-subcard-title">
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Pneus Mais Procurados
            </h3>
            {popularTires.length === 0 ? (
              <p className="dashboard-empty-text">Aguardando interações na vitrine para gerar estatísticas.</p>
            ) : (
              <div className="dashboard-home-popular-list">
                {popularTires.map((tire, idx) => (
                  <div key={idx} className="dashboard-home-popular-item">
                    <span>{idx + 1}. {tire.name}</span>
                    <span className="badge badge-warning">{tire.count} cliques</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div {...metricCardProps} className="card dashboard-home-ranking-card dashboard-glow-card" style={{ padding: '22px', '--dashboard-glow-color': '34, 197, 94' }}>
            <h3 className="dashboard-subcard-title">
              <TrendingUp size={18} style={{ color: '#22c55e' }} /> Ranking Comercial
            </h3>

            {commercialMetrics.sellerRanking.length === 0 ? (
              <p className="dashboard-empty-text">Ainda não há leads, vendas ou visitas para montar o ranking.</p>
            ) : (
              <div className="dashboard-home-ranking-list">
                {commercialMetrics.sellerRanking.slice(0, 5).map((seller, idx) => (
                  <div key={seller.key} className="dashboard-home-ranking-item">
                    <div className="flex-between dashboard-ranking-top">
                      <div>
                        <span>{idx + 1}. {seller.name}</span>
                        {seller.refCode && <div>Ref: {seller.refCode}</div>}
                      </div>
                      <span className="badge badge-success">{formatPercent(seller.conversionRate)}%</span>
                    </div>

                    <div className="dashboard-ranking-stats">
                      <span>Visitas: <strong>{seller.visits}</strong></span>
                      <span>Leads: <strong>{seller.leads}</strong></span>
                      <span>Vendas: <strong>{seller.sales}</strong></span>
                      <span>Faturamento: <strong>{formatCurrency(seller.revenue)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {false && (
          <div
            {...metricCardProps}
            className="card dashboard-home-actions-card dashboard-glow-card dashboard-actions-compact"
            style={{ '--dashboard-glow-color': '245, 158, 11' }}
          >
            <h3>Ações Rápidas</h3>
            <div className="dashboard-home-actions">
              <button onClick={() => navigate('/dashboard/catalog')} className="btn btn-primary">
                <Plus size={15} /> Cadastrar Pneu
              </button>
              <button onClick={() => navigate('/dashboard/settings')} className="btn btn-secondary">
                Personalizar
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      {false && (
      <div className="dashboard-accordion-stack">
        <DashboardSection
          id="dashboard-funnel-section"
          title="Funil Comercial"
          isOpen={openSections.funnel}
          onToggle={() => toggleSection('funnel')}
          summary={
            <>
              <SummaryPill label="Leads totais" value={commercialMetrics.totalLeads} />
              <SummaryPill label="Vendas" value={commercialMetrics.totalSales} tone="success" />
              <SummaryPill label="Faturamento" value={formatCurrency(commercialMetrics.confirmedRevenue)} tone="primary" />
            </>
          }
        >
          <div className="dashboard-section-grid">
            <MetricTile
              label={isSeller ? 'Meus leads' : 'Leads totais'}
              value={commercialMetrics.totalLeads}
              helper='Cliques em "Tenho Interesse"'
              icon={<MessageSquare size={18} />}
            />
            <MetricTile
              label="Vendas confirmadas"
              value={commercialMetrics.totalSales}
              helper="Leads marcados como vendidos"
              icon={<CheckCircle2 size={18} />}
              tone="success"
            />
            <MetricTile
              label="Faturamento confirmado"
              value={formatCurrency(commercialMetrics.confirmedRevenue)}
              helper="Somente vendas confirmadas"
              icon={<DollarSign size={18} />}
            />
            <MetricTile
              label="Taxa de conversão"
              value={`${conversionRate}%`}
              helper="Vendas confirmadas por visitas"
              icon={<Percent size={18} />}
              tone="purple"
            />
          </div>
          <p className="dashboard-section-note">Conversão calculada por vendas confirmadas / visualizações.</p>
        </DashboardSection>

        <DashboardSection
          id="dashboard-catalog-section"
          title="Catálogo e Estoque"
          isOpen={openSections.catalog}
          onToggle={() => toggleSection('catalog')}
          summary={
            <>
              <SummaryPill label="Total de pneus" value={commercialMetrics.totalTires} />
              <SummaryPill label="Ativos" value={commercialMetrics.activeTires} tone="success" />
              <SummaryPill label="Estoque" value={commercialMetrics.totalStock} tone="primary" />
            </>
          }
        >
          <div className="dashboard-section-grid">
            <MetricTile
              label={isSeller ? 'Meus pneus' : 'Total de pneus'}
              value={commercialMetrics.totalTires}
              helper="Modelos no catálogo"
              icon={<Layers size={18} />}
            />
            <MetricTile
              label="Pneus ativos"
              value={commercialMetrics.activeTires}
              helper='Status igual a "ativo"'
              icon={<CheckCircle2 size={18} />}
              tone="success"
            />
            <MetricTile
              label="Estoque total"
              value={commercialMetrics.totalStock}
              helper="Soma dos pneus cadastrados"
              icon={<Layers size={18} />}
            />
          </div>

          <div className="dashboard-subcard">
            <h3 className="dashboard-subcard-title">
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Pneus Mais Procurados
            </h3>
            {popularTires.length === 0 ? (
              <p className="dashboard-empty-text">Aguardando interações na vitrine para gerar estatísticas.</p>
            ) : (
              <div className="dashboard-home-popular-list">
                {popularTires.map((tire, idx) => (
                  <div key={idx} className="dashboard-home-popular-item">
                    <span>{idx + 1}. {tire.name}</span>
                    <span className="badge badge-warning">{tire.count} cliques</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardSection>

        <DashboardSection
          id="dashboard-sellers-section"
          title="Indicações e Vendedores"
          isOpen={openSections.sellers}
          onToggle={() => toggleSection('sellers')}
          summary={
            <>
              <SummaryPill label="Visualizações" value={visits} tone="primary" />
              <SummaryPill label="Melhor vendedor" value={bestSeller?.name || 'Sem dados'} />
              <SummaryPill label="Conversão geral" value={`${conversionRate}%`} tone="success" />
            </>
          }
        >
          <div className="dashboard-section-grid">
            <MetricTile
              label="Visualizações da vitrine"
              value={visits}
              helper="Visitas por indicação"
              icon={<Eye size={18} />}
              tone="blue"
            />
            <MetricTile
              label="Conversão geral"
              value={`${conversionRate}%`}
              helper="Vendas confirmadas por visitas"
              icon={<Percent size={18} />}
              tone="purple"
            />
            <MetricTile
              label="Melhor vendedor"
              value={bestSeller?.name || 'Sem dados'}
              helper={bestSeller ? `${bestSeller.sales} vendas • ${formatCurrency(bestSeller.revenue)}` : 'Aguardando dados'}
              icon={<TrendingUp size={18} />}
              tone="success"
            />
          </div>

          <div className="dashboard-subcard">
            <h3 className="dashboard-subcard-title">
              <TrendingUp size={18} style={{ color: '#22c55e' }} /> Ranking Comercial
            </h3>

            {commercialMetrics.sellerRanking.length === 0 ? (
              <p className="dashboard-empty-text">Ainda não há leads, vendas ou visitas para montar o ranking.</p>
            ) : (
              <div className="dashboard-home-ranking-list">
                {commercialMetrics.sellerRanking.slice(0, 5).map((seller, idx) => (
                  <div key={seller.key} className="dashboard-home-ranking-item">
                    <div className="flex-between dashboard-ranking-top">
                      <div>
                        <span>{idx + 1}. {seller.name}</span>
                        {seller.refCode && <div>Ref: {seller.refCode}</div>}
                      </div>
                      <span className="badge badge-success">{formatPercent(seller.conversionRate)}%</span>
                    </div>

                    <div className="dashboard-ranking-stats">
                      <span>Visitas: <strong>{seller.visits}</strong></span>
                      <span>Leads: <strong>{seller.leads}</strong></span>
                      <span>Vendas: <strong>{seller.sales}</strong></span>
                      <span>Faturamento: <strong>{formatCurrency(seller.revenue)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardSection>

        <DashboardSection
          id="dashboard-recent-leads-section"
          title="Leads Recentes"
          isOpen={openSections.recentLeads}
          onToggle={() => toggleSection('recentLeads')}
          summary={
            <>
              <SummaryPill label="Recentes" value={Math.min(leads.length, 4)} />
              <SummaryPill label="Último lead" value={latestLead?.nome_cliente || 'Nenhum'} tone="primary" />
            </>
          }
        >
          <div className="dashboard-section-header-row">
            <div>
              <h3>Leads Recentes (WhatsApp)</h3>
              <p>Últimos contatos recebidos pela vitrine.</p>
            </div>
            <button onClick={() => navigate('/dashboard/leads')} className="btn btn-outline">
              Ver todos <ArrowRight size={12} />
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="dashboard-empty-block">
              Nenhum lead gerado ainda. Coloque o link da sua vitrine nas redes sociais para começar a receber contatos!
            </div>
          ) : (
            <div className="dashboard-home-leads-list">
              {leads.slice(0, 4).map((lead) => (
                <div key={lead.id} className="dashboard-home-lead-item">
                  <div className="flex-between dashboard-home-lead-top">
                    <div className="dashboard-home-lead-name">
                      <span>{lead.nome_cliente || 'Cliente Interessado'}</span>
                      <span>{lead.produto_nome || 'Pneu não identificado'}</span>
                    </div>
                    <span className="dashboard-home-lead-date">
                      {lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}
                    </span>
                  </div>
                  <div className="dashboard-home-lead-meta">
                    <span>Origem:</span>
                    <strong>{lead.origem || 'WhatsApp'}</strong>
                    {lead.produto_medida && (
                      <>
                        <span className="dashboard-home-lead-separator">|</span>
                        <span>Ref: {lead.produto_medida}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>
      </div>

      )}

      {false && (
        <>
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
            <h3 style={{ fontSize: '28px', lineHeight: '1.2' }}>{commercialMetrics.totalTires}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {commercialMetrics.activeTires} ativos • {commercialMetrics.totalStock} em estoque
            </p>
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
            <h3 style={{ fontSize: '28px', lineHeight: '1.2' }}>{commercialMetrics.totalLeads}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Cliques em "Tenho Interesse"</p>
          </div>
        </div>

        <div {...metricCardProps} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', '--dashboard-glow-color': '34, 197, 94' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Vendas Confirmadas</span>
            <div style={{ color: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '6px', borderRadius: '6px' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '28px', lineHeight: '1.2' }}>{commercialMetrics.totalSales}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Leads marcados como vendidos</p>
          </div>
        </div>

        <div {...metricCardProps} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px', '--dashboard-glow-color': '245, 158, 11' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Faturamento</span>
            <div style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-glow)', padding: '6px', borderRadius: '6px' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '24px', lineHeight: '1.2' }}>{formatCurrency(commercialMetrics.confirmedRevenue)}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Somente vendas confirmadas</p>
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
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Vendas confirmadas por visitas</p>
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
                      <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, wordBreak: 'break-word' }}>{lead.produto_nome || 'Pneu não identificado'}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}
                    </span>
                  </div>
                  <div className="dashboard-home-lead-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span>📦 Origem:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{lead.origem || 'WhatsApp'}</span>
                    {lead.produto_medida && (
                      <>
                        <span style={{ margin: '0 4px', opacity: 0.3 }}>|</span>
                        <span>📏 Ref: {lead.produto_medida}</span>
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

          {/* Seller Ranking */}
          <div {...metricCardProps} className="card dashboard-home-ranking-card dashboard-glow-card" style={{ padding: '24px', '--dashboard-glow-color': '34, 197, 94' }}>
            <h3 className="dashboard-home-popular-title" style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: '#22c55e' }} /> Ranking Comercial
            </h3>

            {commercialMetrics.sellerRanking.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Ainda não há leads, vendas ou visitas para montar o ranking.</p>
            ) : (
              <div className="dashboard-home-ranking-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {commercialMetrics.sellerRanking.slice(0, 5).map((seller, idx) => (
                  <div
                    key={seller.key}
                    className="dashboard-home-ranking-item"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '14px',
                      padding: '14px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      textAlign: 'left'
                    }}
                  >
                    <div className="flex-between" style={{ gap: '12px', marginBottom: '10px', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px', wordBreak: 'break-word' }}>
                          {idx + 1}. {seller.name}
                        </span>
                        {seller.refCode && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px', wordBreak: 'break-word' }}>
                            Ref: {seller.refCode}
                          </div>
                        )}
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '11px', flexShrink: 0 }}>
                        {formatPercent(seller.conversionRate)}%
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '12px'
                      }}
                    >
                      <span>Visitas: <strong style={{ color: 'var(--text-primary)' }}>{seller.visits}</strong></span>
                      <span>Leads: <strong style={{ color: 'var(--text-primary)' }}>{seller.leads}</strong></span>
                      <span>Vendas: <strong style={{ color: '#22c55e' }}>{seller.sales}</strong></span>
                      <span>Faturamento: <strong style={{ color: 'var(--primary)' }}>{formatCurrency(seller.revenue)}</strong></span>
                    </div>
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

        </>
      )}

      <style>{`
        .dashboard-metric-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 16px;
          perspective: 900px;
        }

        .dashboard-metric-card {
          width: 100%;
          min-width: 0;
          min-height: 132px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018));
          color: var(--text-primary);
          cursor: pointer;
          padding: 16px;
          text-align: left;
          transform: translateY(0) rotateX(0deg) rotateY(0deg) scale(1);
          transform-style: preserve-3d;
          will-change: transform;
          transition:
            transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1),
            border-color 0.24s ease,
            background 0.24s ease,
            box-shadow 0.24s ease;
        }

        .dashboard-metric-card:hover,
        .dashboard-metric-card:focus-visible {
          border-color: rgba(245, 158, 11, 0.55);
          box-shadow: 0 18px 38px rgba(245, 158, 11, 0.12), 0 10px 24px rgba(0, 0, 0, 0.26);
          transform: translateY(-4px) rotateX(1.2deg) rotateY(-1.2deg) scale(1.012);
          outline: none;
        }

        .dashboard-metric-card.is-selected {
          border-color: var(--primary);
          background:
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.22), transparent 34%),
            linear-gradient(145deg, rgba(245, 158, 11, 0.16), rgba(255, 255, 255, 0.025));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 18px 38px rgba(245, 158, 11, 0.14);
          transform: translateY(-2px) scale(1.006);
        }

        .dashboard-metric-card__top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }

        .dashboard-metric-card__top span {
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.25;
        }

        .dashboard-metric-card__icon {
          display: inline-flex;
          flex-shrink: 0;
          border-radius: 10px;
          padding: 7px;
          color: var(--primary);
          background: var(--primary-glow);
          transition: transform 0.24s ease, box-shadow 0.24s ease, filter 0.24s ease;
        }

        .dashboard-metric-card:hover .dashboard-metric-card__icon,
        .dashboard-metric-card:focus-visible .dashboard-metric-card__icon,
        .dashboard-metric-card.is-selected .dashboard-metric-card__icon {
          filter: brightness(1.12);
          box-shadow: 0 8px 22px rgba(245, 158, 11, 0.16);
          transform: translateZ(14px) scale(1.08);
        }

        .dashboard-metric-card__icon--success {
          color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
        }

        .dashboard-metric-card__icon--blue {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }

        .dashboard-metric-card__icon--purple {
          color: #a855f7;
          background: rgba(168, 85, 247, 0.1);
        }

        .dashboard-metric-card__icon--whatsapp {
          color: var(--whatsapp);
          background: var(--whatsapp-glow);
        }

        .dashboard-metric-card strong {
          display: block;
          color: var(--text-primary);
          font-size: 24px;
          font-weight: 900;
          line-height: 1.12;
          overflow-wrap: anywhere;
        }

        .dashboard-metric-card small {
          display: block;
          color: var(--text-muted);
          font-size: 11px;
          line-height: 1.35;
          margin-top: 7px;
        }

        .dashboard-detail-panel {
          border: 1px solid rgba(245, 158, 11, 0.32);
          border-radius: 20px;
          background:
            radial-gradient(circle at top left, rgba(245, 158, 11, 0.13), transparent 34%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018));
          box-shadow: 0 18px 38px rgba(0, 0, 0, 0.22);
          margin-bottom: 22px;
          padding: 18px;
          max-height: 640px;
          overflow: hidden;
          transform-origin: top center;
          animation: dashboardDetailIn 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
          transition: opacity 0.24s ease, transform 0.24s ease, max-height 0.28s ease, margin-bottom 0.24s ease;
        }

        .dashboard-detail-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 14px;
        }

        .dashboard-detail-eyebrow {
          color: var(--primary);
          display: block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .dashboard-detail-head h3 {
          font-size: 18px;
          margin: 0;
        }

        .dashboard-detail-head > strong {
          color: var(--primary);
          font-size: 24px;
          line-height: 1.1;
          text-align: right;
          overflow-wrap: anywhere;
        }

        .dashboard-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .dashboard-detail-item {
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.16);
          padding: 12px;
        }

        .dashboard-detail-item span {
          color: var(--text-secondary);
          display: block;
          font-size: 11px;
          margin-bottom: 5px;
        }

        .dashboard-detail-item strong {
          color: var(--text-primary);
          display: block;
          font-size: 15px;
          overflow-wrap: anywhere;
        }

        .dashboard-detail-note {
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.5;
          margin: 12px 0 0;
        }

        .dashboard-content-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
          gap: 22px;
          align-items: start;
        }

        .dashboard-main-stack,
        .dashboard-side-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }

        .dashboard-small-action {
          gap: 6px;
          padding: 7px 11px !important;
          font-size: 12px !important;
        }

        .dashboard-mobile-detail-backdrop {
          display: none;
        }

        @media (max-width: 1180px) {
          .dashboard-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .dashboard-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 16px;
          }

          .dashboard-metric-card {
            min-height: 120px;
            padding: 13px;
            border-radius: 16px;
          }

          .dashboard-metric-card:hover {
            transform: none;
          }

          .dashboard-metric-card:active {
            transform: scale(0.98);
          }

          .dashboard-metric-card strong {
            font-size: 21px;
          }

          .dashboard-detail-panel {
            display: none;
          }

          .dashboard-mobile-detail-backdrop {
            position: fixed;
            inset: 0;
            z-index: 70;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            background: rgba(0, 0, 0, 0.52);
            padding: 16px;
            animation: dashboardBackdropIn 0.22s ease-out;
          }

          .dashboard-mobile-detail-sheet {
            position: relative;
            width: min(100%, 430px);
            max-height: min(72vh, 520px);
            overflow: auto;
            border: 1px solid rgba(245, 158, 11, 0.36);
            border-radius: 22px;
            background:
              radial-gradient(circle at top left, rgba(245, 158, 11, 0.14), transparent 35%),
              #10131a;
            box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.42);
            padding: 18px;
            transform-origin: bottom center;
            animation: dashboardSheetIn 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
          }

          .dashboard-mobile-detail-close {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 34px;
            height: 34px;
            border: 1px solid var(--border);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            cursor: pointer;
            font-size: 22px;
            line-height: 1;
          }

          .dashboard-mobile-detail-sheet .dashboard-detail-head {
            padding-right: 38px;
          }

          .dashboard-mobile-detail-sheet .dashboard-detail-head,
          .dashboard-mobile-detail-sheet .dashboard-detail-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-mobile-detail-sheet .dashboard-detail-head {
            flex-direction: column;
            gap: 8px;
          }

          .dashboard-mobile-detail-sheet .dashboard-detail-head > strong {
            text-align: left;
          }

          .dashboard-content-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .dashboard-home-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .dashboard-small-action {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 420px) {
          .dashboard-metric-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-metric-card__top span {
            font-size: 12px;
          }

          .dashboard-metric-card strong {
            font-size: 20px;
          }

          .dashboard-metric-card small {
            font-size: 10px;
          }
        }

        @keyframes dashboardSheetIn {
          from {
            opacity: 0;
            transform: translateY(26px) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes dashboardBackdropIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes dashboardDetailIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
            max-height: 0;
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            max-height: 640px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dashboard-metric-card,
          .dashboard-metric-card__icon,
          .dashboard-detail-panel,
          .dashboard-mobile-detail-backdrop,
          .dashboard-mobile-detail-sheet {
            animation: none !important;
            transition: border-color 0.01ms linear, background 0.01ms linear, box-shadow 0.01ms linear !important;
            transform: none !important;
          }

          .dashboard-metric-card:hover,
          .dashboard-metric-card:focus-visible,
          .dashboard-metric-card.is-selected,
          .dashboard-metric-card:hover .dashboard-metric-card__icon,
          .dashboard-metric-card:focus-visible .dashboard-metric-card__icon,
          .dashboard-metric-card.is-selected .dashboard-metric-card__icon {
            transform: none !important;
          }
        }

        .dashboard-accordion-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 20px;
        }

        .dashboard-accordion-section {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 16px 34px rgba(0, 0, 0, 0.18);
          min-width: 0;
          overflow: hidden;
        }

        .dashboard-accordion-section.is-open {
          border-color: rgba(245, 158, 11, 0.35);
        }

        .dashboard-accordion-trigger {
          width: 100%;
          border: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.035), rgba(245, 158, 11, 0.035));
          color: var(--text-primary);
          padding: 18px 20px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          text-align: left;
        }

        .dashboard-accordion-trigger:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: -3px;
        }

        .dashboard-accordion-title {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dashboard-accordion-title > span {
          font-size: 18px;
          font-weight: 800;
        }

        .dashboard-accordion-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .dashboard-summary-pill {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 7px 10px;
          color: var(--text-secondary);
          font-size: 12px;
        }

        .dashboard-summary-pill strong {
          color: var(--text-primary);
          font-size: 12px;
          white-space: nowrap;
        }

        .dashboard-accordion-icon {
          flex-shrink: 0;
          color: var(--primary);
          transition: transform 0.2s ease;
        }

        .dashboard-accordion-section.is-open .dashboard-accordion-icon {
          transform: rotate(180deg);
        }

        .dashboard-accordion-content {
          padding: 0 20px 20px;
          animation: fadeIn 0.18s ease-out;
        }

        .dashboard-section-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .dashboard-metric-tile {
          min-width: 0;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          text-align: left;
        }

        .dashboard-metric-tile strong {
          overflow-wrap: anywhere;
        }

        .dashboard-section-note {
          color: var(--text-muted);
          font-size: 12px;
          margin: 14px 0 0;
          text-align: left;
        }

        .dashboard-subcard {
          margin-top: 16px;
          background: rgba(0, 0, 0, 0.14);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          min-width: 0;
        }

        .dashboard-subcard-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          margin: 0 0 14px;
        }

        .dashboard-empty-text {
          color: var(--text-secondary);
          font-size: 13px;
          margin: 0;
          text-align: left;
        }

        .dashboard-empty-block {
          color: var(--text-secondary);
          padding: 24px 0;
          text-align: center;
          line-height: 1.5;
        }

        .dashboard-home-popular-list,
        .dashboard-home-ranking-list,
        .dashboard-home-leads-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dashboard-home-popular-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
        }

        .dashboard-home-popular-item > span:first-child {
          min-width: 0;
          color: var(--text-secondary);
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dashboard-home-ranking-item {
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.025);
          text-align: left;
          min-width: 0;
        }

        .dashboard-ranking-top {
          gap: 12px;
          margin-bottom: 10px;
          align-items: flex-start;
        }

        .dashboard-ranking-top div {
          min-width: 0;
        }

        .dashboard-ranking-top span:first-child {
          color: var(--text-primary);
          font-weight: 700;
          font-size: 14px;
          word-break: break-word;
        }

        .dashboard-ranking-top div div {
          color: var(--text-muted);
          font-size: 11px;
          margin-top: 2px;
          word-break: break-word;
        }

        .dashboard-ranking-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          color: var(--text-secondary);
          font-size: 12px;
        }

        .dashboard-ranking-stats span {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .dashboard-ranking-stats strong {
          color: var(--text-primary);
        }

        .dashboard-ranking-stats span:nth-child(3) strong {
          color: #22c55e;
        }

        .dashboard-ranking-stats span:nth-child(4) strong {
          color: var(--primary);
        }

        .dashboard-section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 14px;
          text-align: left;
        }

        .dashboard-section-header-row h3 {
          font-size: 16px;
          margin: 0;
        }

        .dashboard-section-header-row p {
          color: var(--text-muted);
          font-size: 12px;
          margin: 4px 0 0;
        }

        .dashboard-home-lead-item {
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px;
          text-align: left;
          min-width: 0;
        }

        .dashboard-home-lead-top {
          gap: 12px;
          margin-bottom: 8px;
        }

        .dashboard-home-lead-name {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .dashboard-home-lead-name span:first-child {
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 800;
          word-break: break-word;
        }

        .dashboard-home-lead-name span:nth-child(2) {
          color: var(--primary);
          font-size: 12px;
          font-weight: 700;
          word-break: break-word;
        }

        .dashboard-home-lead-date {
          color: var(--text-muted);
          font-size: 11px;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .dashboard-home-lead-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          color: var(--text-secondary);
          font-size: 12px;
        }

        .dashboard-home-lead-meta strong {
          color: var(--text-primary);
        }

        .dashboard-home-lead-separator {
          opacity: 0.3;
        }

        .dashboard-actions-compact {
          padding: 14px !important;
        }

        .dashboard-actions-compact h3 {
          font-size: 15px;
          line-height: 1.2;
          margin: 0 0 10px;
        }

        .dashboard-actions-compact .dashboard-home-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .dashboard-actions-compact .btn {
          justify-content: center;
          min-width: 0;
          min-height: 40px;
          padding: 9px 10px;
          font-size: 13px;
          line-height: 1.15;
        }

        @media (max-width: 1024px) {
          .dashboard-section-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-ranking-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .dashboard-accordion-stack {
            gap: 12px;
          }

          .dashboard-accordion-trigger {
            align-items: flex-start;
            padding: 16px 14px;
          }

          .dashboard-accordion-content {
            padding: 0 14px 14px;
          }

          .dashboard-section-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .dashboard-accordion-title > span {
            font-size: 17px;
          }

          .dashboard-summary-pill {
            width: 100%;
            justify-content: space-between;
            border-radius: 12px;
          }

          .dashboard-section-header-row {
            flex-direction: column;
          }

          .dashboard-section-header-row .btn {
            width: 100%;
            justify-content: center;
          }

          .dashboard-home-lead-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .dashboard-home-lead-date {
            white-space: normal;
          }

          .dashboard-actions-compact {
            padding: 14px !important;
          }

          .dashboard-actions-compact .dashboard-home-actions {
            grid-template-columns: 1fr;
          }

          .dashboard-actions-compact .btn {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .dashboard-accordion-section,
          .dashboard-subcard,
          .dashboard-metric-tile,
          .dashboard-home-ranking-item,
          .dashboard-home-lead-item {
            border-radius: 16px;
          }

          .dashboard-ranking-stats {
            grid-template-columns: 1fr;
          }

          .dashboard-home-popular-item {
            align-items: flex-start;
          }

          .dashboard-home-popular-item > span:first-child {
            white-space: normal;
          }
        }

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
          .dashboard-home-ranking-card,
          .dashboard-home-actions-card {
            padding: 20px 16px !important;
          }

          .dashboard-home-leads-card,
          .dashboard-home-popular-card,
          .dashboard-home-ranking-card,
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
          .dashboard-home-ranking-card,
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
