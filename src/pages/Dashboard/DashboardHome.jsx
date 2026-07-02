import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
import '../../components/MagicBento/MagicBento.css';
import MetricDetailsPanel from './components/MetricDetailsPanel';
import DashboardReportModal from './components/DashboardReportModal';
import DashboardPeriodControl from './components/DashboardPeriodControl';
import {
  buildPresetDateWindow,
  buildDashboardReport,
  buildPresetRange,
  createInitialReportConfig,
  DASHBOARD_PERIOD_PRESETS,
  formatDate,
  validateReportConfig
} from './components/dashboardReportUtils';
import { getLeadTotalValue } from '../../utils/tireOffer';
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
  FileText,
  DollarSign,
  CheckCircle2,
  Edit3,
  X
} from 'lucide-react';

const emptyCommercialMetrics = {
  totalLeads: 0,
  totalSales: 0,
  confirmedRevenue: 0,
  totalTires: 0,
  activeTires: 0,
  totalStock: 0,
  totalVisits: 0,
  totalVisitsToday: 0,
  overallConversionRate: 0,
  sellerRanking: [],
  partialErrors: []
};

const DASHBOARD_PERIOD_STORAGE_PREFIX = 'pneuflow_dashboard_period';

const getDashboardPeriodStorageKey = (userId, storeId) => {
  if (!userId || !storeId) return null;
  return `${DASHBOARD_PERIOD_STORAGE_PREFIX}_${userId}_${storeId}`;
};

const isValidDashboardPeriod = (value) =>
  DASHBOARD_PERIOD_PRESETS.some((option) => option.id === value);

const readStoredDashboardPeriod = (storageKey) => {
  if (!storageKey || typeof window === 'undefined') return 'current_month';

  const storedValue = window.localStorage.getItem(storageKey);
  return isValidDashboardPeriod(storedValue) ? storedValue : 'current_month';
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

const createMetricTheme = (accent, accentRgb, iconBackground) => ({
  accent,
  accentRgb,
  iconBackground,
  style: {
    '--metric-accent': accent,
    '--metric-accent-rgb': accentRgb,
    '--metric-icon-bg': iconBackground
  }
});

const isSameCalendarDay = (dateValueA, dateValueB = new Date()) => {
  if (!dateValueA) return false;

  const a = new Date(dateValueA);
  const b = new Date(dateValueB);

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const buildCommercialMetrics = ({ leads = [], soldLeads = [], pneus = [], sellers = [], visits = [], partialErrors = [] }) => {
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
    entry.leads += 1;
  });

  soldLeads.forEach((lead) => {
    const entry = ensureRankingEntry(resolveSeller(lead));
    entry.sales += 1;
    entry.revenue += getLeadTotalValue(lead, 'sold');
  });

  visits.forEach((visit) => {
    const entry = ensureRankingEntry(resolveSeller(visit));
    entry.visits += 1;
  });

  const sellerRanking = Array.from(ranking.values())
    .map((entry) => ({
      ...entry,
      conversionRate: entry.visits > 0 ? (entry.leads / entry.visits) * 100 : 0
    }))
    .sort((a, b) => {
      if (b.sales !== a.sales) return b.sales - a.sales;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.leads - a.leads;
    });

  const totalVisits = visits.length;
  const totalVisitsToday = visits.filter((visit) => isSameCalendarDay(visit.created_at)).length;

  return {
    totalLeads: leads.length,
    totalSales: soldLeads.length,
    confirmedRevenue: soldLeads.reduce((sum, lead) => sum + getLeadTotalValue(lead, 'sold'), 0),
    totalTires: pneus.length,
    activeTires: pneus.filter((pneu) => pneu.status === 'ativo').length,
    totalStock: pneus.reduce((sum, pneu) => sum + Number(pneu.estoque || 0), 0),
    totalVisits,
    totalVisitsToday,
    overallConversionRate: totalVisits > 0 ? (leads.length / totalVisits) * 100 : 0,
    sellerRanking,
    partialErrors
  };
};

function MetricButton({ metric, isSelected, onClick }) {
  return (
    <button
      type="button"
      className={`dashboard-metric-card ${isSelected ? 'is-selected' : ''}`}
      onClick={onClick}
      style={metric.theme?.style}
      aria-expanded={isSelected}
      aria-pressed={isSelected}
      aria-controls="dashboard-metric-details"
    >
      <div className="dashboard-metric-card__top">
        <span>{metric.label}</span>
        <div className={`dashboard-metric-card__icon dashboard-metric-card__icon--${metric.tone || 'amber'}`}>
          {metric.icon}
        </div>
      </div>
      <strong>{metric.value}</strong>
      <small>{metric.helper}</small>
    </button>
  );
}

function MetricSkeleton({ index }) {
  return (
    <div
      className="dashboard-metric-card"
      aria-hidden="true"
      style={{
        opacity: 0.78,
        pointerEvents: 'none'
      }}
    >
      <div className="dashboard-metric-card__top">
        <span>Carregando...</span>
        <div className="dashboard-metric-card__icon dashboard-metric-card__icon--amber">
          <Clock size={20} />
        </div>
      </div>
      <strong>--</strong>
      <small>{index === 0 ? 'Preparando periodo salvo' : 'Buscando metricas do dashboard'}</small>
    </div>
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { store, role, isSeller, user, refreshStore } = useStore();
  const [leads, setLeads] = useState([]);
  const [commercialMetrics, setCommercialMetrics] = useState(emptyCommercialMetrics);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [tempSlug, setTempSlug] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugMessage, setSlugMessage] = useState('');
  const [slugMessageType, setSlugMessageType] = useState('success');
  const [showPlanTooltip, setShowPlanTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportStep, setReportStep] = useState('config');
  const [reportConfig, setReportConfig] = useState(() => createInitialReportConfig());
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reportPreview, setReportPreview] = useState(null);
  const [dashboardPeriod, setDashboardPeriod] = useState('current_month');
  const [dashboardPeriodHydrated, setDashboardPeriodHydrated] = useState(false);
  const [metricsInitialized, setMetricsInitialized] = useState(false);
  const dashboardPeriodStorageKey = useMemo(
    () => getDashboardPeriodStorageKey(user?.id, store?.id),
    [store?.id, user?.id]
  );
  const dashboardPeriodReady = dashboardPeriodHydrated && isValidDashboardPeriod(dashboardPeriod);

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
    if (!store?.id || !dashboardPeriodReady) return;
    setMetricsLoading(true);
    setMetricsError('');
    try {
      const selectedPeriod = buildPresetDateWindow(dashboardPeriod);
      const data = await storageService.getDashboardCommercialMetrics(store.id, {
        startAt: selectedPeriod.startAt,
        endAt: selectedPeriod.endAt
      });
      const metrics = buildCommercialMetrics(data);
      setCommercialMetrics(metrics);
      setLeads(data.leads || []);

      if (Array.isArray(data.partialErrors) && data.partialErrors.length > 0) {
        const labels = data.partialErrors.map((item) => item.label).join(', ');
        setMetricsError(`Algumas metricas nao puderam ser carregadas agora (${labels}).`);
      } else {
        setMetricsError('');
      }
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setCommercialMetrics(emptyCommercialMetrics);
      setLeads([]);
      setMetricsError('Algumas metricas nao puderam ser carregadas agora.');
    } finally {
      setMetricsInitialized(true);
      setMetricsLoading(false);
    }
  }, [dashboardPeriod, dashboardPeriodReady, store]);

  useEffect(() => {
    if (!dashboardPeriodReady) return;
    loadData();
  }, [dashboardPeriodReady, loadData]);

  useEffect(() => {
    setMetricsInitialized(false);
    setDashboardPeriodHydrated(false);
    if (!dashboardPeriodStorageKey) return;
    setDashboardPeriod(readStoredDashboardPeriod(dashboardPeriodStorageKey));
    setDashboardPeriodHydrated(true);
  }, [dashboardPeriodStorageKey]);

  useEffect(() => {
    if (!dashboardPeriodStorageKey || typeof window === 'undefined') return;
    if (!dashboardPeriodHydrated) return;
    if (!isValidDashboardPeriod(dashboardPeriod)) return;

    window.localStorage.setItem(dashboardPeriodStorageKey, dashboardPeriod);
  }, [dashboardPeriod, dashboardPeriodHydrated, dashboardPeriodStorageKey]);

  useEffect(() => {
    if (!selectedMetric) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedMetric(null);
        setMobileDetailOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedMetric]);

  useEffect(() => {
    if (reportConfig.preset === 'custom') return;

    const nextRange = buildPresetRange(reportConfig.preset);
    setReportConfig((current) => ({
      ...current,
      startDate: nextRange.startDate,
      endDate: nextRange.endDate
    }));
  }, [reportConfig.preset]);

  if (!store) return null;

  const publicLink = `${window.location.origin}/store/${store.slug}`;
  const selectedDashboardPeriod = DASHBOARD_PERIOD_PRESETS.find((option) => option.id === dashboardPeriod) || DASHBOARD_PERIOD_PRESETS[0];
  const showInitialMetricsLoading = !dashboardPeriodReady || !metricsInitialized;
  const normalizeSlugPreview = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartSlugEdit = () => {
    setTempSlug(store.slug || '');
    setSlugMessage('');
    setEditingSlug(true);
  };

  const handleCancelSlugEdit = () => {
    setEditingSlug(false);
    setTempSlug('');
    setSlugMessage('');
  };

  const handleSaveSlug = async () => {
    const nextSlug = normalizeSlugPreview(tempSlug);

    if (nextSlug.length < 3) {
      setSlugMessageType('error');
      setSlugMessage('Use pelo menos 3 caracteres no link.');
      return;
    }

    if (nextSlug === store.slug) {
      setEditingSlug(false);
      setSlugMessage('');
      return;
    }

    setSavingSlug(true);
    setSlugMessage('');

    try {
      await storageService.updateStoreSlug(store.id, nextSlug);
      await refreshStore();
      setEditingSlug(false);
      setSlugMessageType('success');
      setSlugMessage('Link atualizado com sucesso.');
      setTimeout(() => setSlugMessage(''), 3500);
    } catch (err) {
      setSlugMessageType('error');
      setSlugMessage(err.message || 'Nao foi possivel atualizar o link da loja.');
    } finally {
      setSavingSlug(false);
    }
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
  const averageTicket = commercialMetrics.totalSales > 0
    ? commercialMetrics.confirmedRevenue / commercialMetrics.totalSales
    : null;
  const tireActiveRate = commercialMetrics.totalTires > 0
    ? (commercialMetrics.activeTires / commercialMetrics.totalTires) * 100
    : null;
  const leadSaleRate = commercialMetrics.totalLeads > 0
    ? (commercialMetrics.totalSales / commercialMetrics.totalLeads) * 100
    : null;
  const visitTodayRate = visits > 0
    ? (commercialMetrics.totalVisitsToday / visits) * 100
    : null;

  const revenueOpportunity = useMemo(() => {
    return leads.reduce((acc, lead) => {
      const leadValue = getLeadTotalValue(lead, lead?.status_atendimento === 'vendido' ? 'sold' : 'desired');
      if (!Number.isFinite(leadValue) || leadValue <= 0) {
        return acc;
      }

      const status = lead?.status_atendimento || (lead?.venda_confirmada ? 'vendido' : 'em_atendimento');

      if (status === 'em_atendimento') {
        acc.pendingCount += 1;
        acc.pendingValue += leadValue;
      } else if (status === 'desistencia') {
        acc.withdrawalCount += 1;
        acc.withdrawalValue += leadValue;
      }

      return acc;
    }, {
      pendingCount: 0,
      pendingValue: 0,
      withdrawalCount: 0,
      withdrawalValue: 0
    });
  }, [leads]);

  const totalNotConverted = revenueOpportunity.pendingValue + revenueOpportunity.withdrawalValue;
  const partialErrorLabels = new Set(commercialMetrics.partialErrors?.map((item) => item.label) || []);
  const tireMetricsUnavailable = partialErrorLabels.has('pneus');
  const leadMetricsUnavailable = partialErrorLabels.has('leads');
  const revenueMetricsUnavailable = leadMetricsUnavailable;

  const renderMetricValue = (value, unavailable) => (unavailable ? '--' : value);
  const renderMetricHelper = (fallback, unavailable) => (
    unavailable ? 'Falha ao carregar dados agora' : fallback
  );

  const metricCards = [
    {
      id: 'tires',
      label: isSeller ? 'Meus Pneus' : 'Total de Pneus',
      value: renderMetricValue(commercialMetrics.totalTires, tireMetricsUnavailable),
      helper: renderMetricHelper(`${commercialMetrics.activeTires} ativos • ${commercialMetrics.totalStock} em estoque`, tireMetricsUnavailable),
      icon: <Layers size={20} />,
      tone: 'amber',
      theme: createMetricTheme('#f59e0b', '245, 158, 11', 'rgba(245, 158, 11, 0.12)'),
      details: [
        { label: 'Total de pneus', value: commercialMetrics.totalTires },
        { label: 'Pneus ativos', value: commercialMetrics.activeTires },
        { label: 'Estoque total', value: commercialMetrics.totalStock },
        { label: 'Mais procurado', value: topPopularTire ? `${topPopularTire.name} (${topPopularTire.count})` : 'Sem dados' }
      ],
      description: 'Saude do catalogo publicado e pronto para virar oportunidade.',
      summaryTitle: commercialMetrics.totalTires > 0 ? `${commercialMetrics.activeTires} pneus ativos agora` : 'Catalogo aguardando pneus',
      progress: tireActiveRate,
      progressLabel: 'Pneus ativos no catalogo',
      actionHint: 'Mantenha o catalogo completo para reduzir perguntas repetidas no WhatsApp.',
      actions: [
        { label: 'Ver catalogo', to: '/dashboard/catalog' },
        { label: 'Cadastrar pneu', to: '/dashboard/catalog' }
      ],
      note: 'Resumo do catalogo atual, considerando pneus cadastrados, ativos e estoque total.'
    },
    {
      id: 'leads',
      label: isSeller ? 'Meus Leads' : 'Leads no WhatsApp',
      value: renderMetricValue(commercialMetrics.totalLeads, leadMetricsUnavailable),
      helper: renderMetricHelper('Cliques em "Tenho Interesse"', leadMetricsUnavailable),
      icon: <MessageSquare size={20} />,
      tone: 'green',
      theme: createMetricTheme('#22c55e', '34, 197, 94', 'rgba(34, 197, 94, 0.12)'),
      details: [
        { label: 'Total de leads', value: commercialMetrics.totalLeads },
        { label: 'Vendas confirmadas', value: commercialMetrics.totalSales },
        { label: 'Último lead', value: latestLead?.nome_cliente || 'Nenhum' },
        { label: 'Origem principal', value: latestLead?.origem || 'WhatsApp' }
      ],
      description: 'Contatos comerciais gerados pelos CTAs da vitrine.',
      summaryTitle: latestLead ? `Ultimo contato: ${latestLead.nome_cliente}` : 'Nenhum lead recente',
      progress: leadSaleRate,
      progressLabel: 'Leads que viraram venda',
      actionHint: 'Acompanhe os contatos e marque vendas confirmadas para melhorar a leitura do funil.',
      actions: [
        { label: 'Ver leads', to: '/dashboard/leads' },
        { label: 'Abrir vitrine', href: publicLink }
      ],
      note: 'Leads gerados pelo botao Tenho Interesse e contatos vindos da vitrine.'
    },
    {
      id: 'revenue',
      label: 'Faturamento',
      value: renderMetricValue(formatCurrency(commercialMetrics.confirmedRevenue), revenueMetricsUnavailable),
      helper: renderMetricHelper('Somente vendas confirmadas', revenueMetricsUnavailable),
      icon: <DollarSign size={20} />,
      tone: 'yellow',
      theme: createMetricTheme('#eab308', '234, 179, 8', 'rgba(234, 179, 8, 0.14)'),
      details: [
        { label: 'Valor total confirmado', value: formatCurrency(commercialMetrics.confirmedRevenue) },
        { label: 'Vendas confirmadas', value: commercialMetrics.totalSales },
        { label: 'Taxa de conversão', value: `${conversionRate}%` },
        { label: 'Ticket medio', value: averageTicket ? formatCurrency(averageTicket) : 'Sem dados' },
        {
          label: 'Resumo comercial',
          value: commercialMetrics.totalSales > 0
            ? `${commercialMetrics.totalSales} vendas em ${commercialMetrics.totalLeads} leads`
            : 'Aguardando a primeira venda confirmada'
        },
        {
          label: 'Receita não convertida',
          value: formatCurrency(totalNotConverted),
          note: `${formatCurrency(revenueOpportunity.pendingValue)} em atendimento • ${formatCurrency(revenueOpportunity.withdrawalValue)} em desistências`,
          emphasis: 'danger'
        }
      ],
      description: 'Receita estimada apenas com vendas confirmadas no painel.',
      summaryTitle: commercialMetrics.totalSales > 0
        ? `${commercialMetrics.totalSales} vendas confirmadas com ${conversionRate}% de conversao`
        : 'Sem venda confirmada ainda',
      progress: leadSaleRate,
      progressLabel: 'Conversao de leads em vendas',
      actionHint: commercialMetrics.totalSales > 0
        ? 'O painel cruza faturamento, vendas e conversao para mostrar a eficiencia comercial atual.'
        : 'Confirme vendas na aba de leads para liberar uma leitura mais fiel do faturamento.',
      actions: [
        { label: 'Ver leads', to: '/dashboard/leads' },
        { label: 'Ver catalogo', to: '/dashboard/catalog' }
      ],
      note: averageTicket
        ? 'Soma de produto_preco em vendas confirmadas, com taxa de conversao e ticket medio reaproveitando os dados ja carregados.'
        : 'Soma de produto_preco em vendas confirmadas, com taxa de conversao reaproveitando os dados ja carregados.'
    },
    {
      id: 'visits',
      label: 'Visualizações',
      value: visits,
      helper: 'Vitrine pública e referral',
      icon: <Eye size={20} />,
      tone: 'blue',
      theme: createMetricTheme('#3b82f6', '59, 130, 246', 'rgba(59, 130, 246, 0.12)'),
      details: [
        { label: 'Total de visitas', value: visits },
        { label: 'Visualizacoes hoje', value: commercialMetrics.totalVisitsToday },
        { label: 'Melhor vendedor', value: bestSeller?.name || 'Sem dados' },
        { label: 'Ranking resumido', value: bestSeller ? `${bestSeller.sales} vendas • ${bestSeller.leads} leads` : 'Sem dados' },
        { label: 'Conversao por vendedor', value: topSellerConversion ? `${topSellerConversion.name}: ${formatPercent(topSellerConversion.conversionRate)}%` : 'Sem dados' }
      ],
      description: 'Movimento da vitrine publica e visitas vindas de referral.',
      summaryTitle: visits > 0 ? `${commercialMetrics.totalVisitsToday} visitas hoje` : 'Vitrine aguardando visitantes',
      progress: visitTodayRate,
      progressLabel: 'Participacao das visitas de hoje',
      actionHint: 'Compartilhe o link da vitrine para aumentar visitas qualificadas.',
      actions: [
        { label: 'Abrir vitrine', href: publicLink },
        { label: 'Ver vendedores', to: '/dashboard/sellers' }
      ],
      note: 'Visualizacoes registradas na vitrine publica, com dedupe por visitante e janela de 24 horas.'
    },
    {
      id: 'conversion',
      label: 'Taxa de conversão',
      value: `${conversionRate}%`,
      helper: 'Leads por visualizações',
      icon: <Percent size={20} />,
      tone: 'purple',
      details: [
        { label: 'Conversao geral', value: `${conversionRate}%` },
        { label: 'Leads', value: commercialMetrics.totalLeads },
        { label: 'Visualizacoes', value: visits },
        { label: 'Formula', value: '(leads / visualizacoes) * 100' }
      ],
      description: 'Eficiencia da vitrine em transformar visitas em oportunidades.',
      summaryTitle: visits > 0 ? `${commercialMetrics.totalLeads} leads em ${visits} visitas` : 'Sem base de visitas ainda',
      progress: Number(commercialMetrics.overallConversionRate),
      progressLabel: 'Leads por visualizacao',
      actionHint: 'Use visitas e leads juntos para entender se a vitrine esta atraindo o cliente certo.',
      actions: [
        { label: 'Ver leads', to: '/dashboard/leads' },
        { label: 'Abrir vitrine', href: publicLink }
      ],
      note: 'Se nao houver visualizacoes, a conversao sera 0%.'
    }
  ].filter((metric) => metric.id !== 'sales' && metric.id !== 'conversion');
  const activeMetric = selectedMetric ? metricCards.find((metric) => metric.id === selectedMetric) : null;

  const closeMetricDetail = () => {
    setSelectedMetric(null);
    setMobileDetailOpen(false);
  };

  const closeReportModal = () => {
    setReportModalOpen(false);
    setReportStep('config');
    setReportLoading(false);
    setReportError('');
    setReportPreview(null);
  };

  const handleOpenReportModal = () => {
    if (role !== 'owner') return;
    setReportError('');
    setReportPreview(null);
    setReportStep('config');
    setReportModalOpen(true);
  };

  const handleReportConfigChange = (updater) => {
    setReportError('');
    setReportConfig((current) => (typeof updater === 'function' ? updater(current) : updater));
  };

  const handleBuildReportPreview = async () => {
    if (!store?.id) return;

    if (role !== 'owner') {
      setReportError('Somente o dono da loja pode gerar este relatorio.');
      return;
    }

    const validationError = validateReportConfig(reportConfig);
    if (validationError) {
      setReportError(validationError);
      return;
    }

    const selectedSections = Object.entries(reportConfig.sections || {})
      .filter(([, selected]) => selected)
      .map(([sectionId]) => sectionId);
    const startAt = `${reportConfig.startDate}T00:00:00`;
    const endAt = `${reportConfig.endDate}T23:59:59.999`;
    const rangeLabel = `${formatDate(startAt)} a ${formatDate(endAt)}`;

    setReportLoading(true);
    setReportError('');

    try {
      const rawData = await storageService.getDashboardReportData(store.id, {
        startAt,
        endAt,
        selectedSections
      });

      setReportPreview(buildDashboardReport({
        store,
        rangeLabel,
        generatedAt: new Date().toISOString(),
        selectedSections,
        rawData
      }));
      setReportStep('preview');
    } catch (error) {
      console.error('Erro ao gerar relatorio do dashboard:', error);
      setReportError(error.message || 'Nao foi possivel gerar o relatorio agora.');
    } finally {
      setReportLoading(false);
    }
  };

  const handlePrintReport = () => {
    if (typeof window === 'undefined') return;
    window.print();
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
      <div className="dashboard-home-header-shell">
        {/* Welcome Header */}
        <div className="dashboard-home-header-inner">
          <div className="dashboard-home-header-left">
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
                        window.open('https://wa.me/5585992369359', '_blank', 'noopener,noreferrer');
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
        
        <div className="dashboard-home-header-center">
          <div className="dashboard-store-link-card">
            <div className="dashboard-store-link-content">
              <span className="dashboard-store-link-label">Link da loja</span>
              {editingSlug ? (
                <div className="dashboard-store-link-editor">
                  <span className="dashboard-store-link-prefix">/store/</span>
                  <input
                    type="text"
                    className="form-input dashboard-store-link-input"
                    value={tempSlug}
                    onChange={(e) => setTempSlug(normalizeSlugPreview(e.target.value))}
                    placeholder="minha-loja"
                    aria-label="Editar link da loja"
                    autoFocus
                  />
                </div>
              ) : (
                <code className="dashboard-store-link-code">{store.slug}</code>
              )}
              {slugMessage && (
                <small className={`dashboard-store-link-message ${slugMessageType === 'error' ? 'is-error' : 'is-success'}`}>
                  {slugMessage}
                </small>
              )}
            </div>

            <div className="dashboard-store-link-actions">
              {editingSlug ? (
                <>
                  <button
                    type="button"
                    onClick={handleSaveSlug}
                    className="btn btn-primary dashboard-store-link-action"
                    disabled={savingSlug}
                  >
                    {savingSlug ? <Clock size={14} /> : <Check size={14} />}
                    {savingSlug ? 'Salvando' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelSlugEdit}
                    className="btn btn-secondary dashboard-store-link-action"
                    disabled={savingSlug}
                    aria-label="Cancelar edicao do link da loja"
                  >
                    <X size={14} />
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="btn btn-secondary dashboard-store-link-action"
                  >
                    {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  {!isSeller && (
                    <button
                      type="button"
                      onClick={handleStartSlugEdit}
                      className="btn btn-outline dashboard-store-link-action"
                    >
                      <Edit3 size={14} />
                      Editar
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {!isSeller && (
            <button
              type="button"
              onClick={handleOpenReportModal}
              className="btn btn-primary dashboard-report-action"
            >
              <FileText size={16} />
              Gerar relatorio
            </button>
          )}
        </div>
        </div>
      </div>

      {((showInitialMetricsLoading || metricsLoading) || metricsError) && (
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
          {showInitialMetricsLoading
            ? 'Recuperando seu periodo salvo antes de carregar as metricas...'
            : metricsLoading
              ? 'Atualizando metricas comerciais...'
              : metricsError}
        </div>
      )}

      <div className="dashboard-metric-grid">
        {showInitialMetricsLoading
          ? metricCards.map((metric, index) => <MetricSkeleton key={metric.id} index={index} />)
          : metricCards.map((metric) => (
            <MetricButton
              key={metric.id}
              metric={metric}
              isSelected={selectedMetric === metric.id}
              onClick={() => openMetricDetail(metric.id)}
            />
          ))}
      </div>

      {!showInitialMetricsLoading && activeMetric && !mobileDetailOpen && (
        <section id="dashboard-metric-details" className="dashboard-detail-panel" aria-live="polite">
          <MetricDetailsPanel
            metric={activeMetric}
            onClose={closeMetricDetail}
            onNavigate={navigate}
          />
        </section>
      )}

      {!showInitialMetricsLoading && mobileDetailOpen && activeMetric && (
        <div className="dashboard-mobile-detail-backdrop" onClick={closeMetricDetail}>
          <div
            className="dashboard-mobile-detail-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Detalhes de ${activeMetric?.label || 'métrica'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <MetricDetailsPanel
              metric={activeMetric}
              onClose={closeMetricDetail}
              onNavigate={navigate}
              compact
            />
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

          {showInitialMetricsLoading ? (
            <div className="dashboard-empty-block">
              Carregando os contatos do periodo salvo...
            </div>
          ) : leads.length === 0 ? (
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
                    <span>📦 Origem:</span>
                    <strong>{lead.origem || 'WhatsApp'}</strong>
                    {lead.produto_medida && (
                      <>
                        <span className="dashboard-home-lead-separator">|</span>
                        <span>📏 Ref: {lead.produto_medida}</span>
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
          <DashboardPeriodControl
            value={dashboardPeriod}
            options={DASHBOARD_PERIOD_PRESETS}
            selectedLabel={selectedDashboardPeriod.label}
            onChange={setDashboardPeriod}
          />
        </div>

        <div className="dashboard-side-stack">
          <div {...metricCardProps} className="card dashboard-home-popular-card dashboard-glow-card" style={{ padding: '26px', '--dashboard-glow-color': '245, 158, 11' }}>
            <h3 className="dashboard-subcard-title">
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Pneus Mais Procurados
            </h3>
            {popularTires.length === 0 ? (
              <p className="dashboard-empty-text">Aguardando interações na vitrine para gerar estatísticas.</p>
            ) : (
              <div className="dashboard-home-popular-list">
                {popularTires.map((tire, idx) => (
                  <div key={idx} className="dashboard-home-popular-item">
                    <span className="dashboard-compact-rank">{idx + 1}</span>
                    <span className="dashboard-compact-item-name">{tire.name}</span>
                    <span className="badge badge-warning dashboard-soft-badge">{tire.count} cliques</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div {...metricCardProps} className="card dashboard-home-ranking-card dashboard-glow-card" style={{ padding: '26px', '--dashboard-glow-color': '34, 197, 94' }}>
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
                      <div className="dashboard-ranking-identity">
                        <span className="dashboard-compact-rank">{idx + 1}</span>
                        <div className="dashboard-ranking-copy">
                          <span>{seller.name}</span>
                          {seller.refCode && <div>Ref: {seller.refCode}</div>}
                        </div>
                      </div>
                      <span className="badge badge-success dashboard-soft-badge">{formatPercent(seller.conversionRate)}%</span>
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
                    <span className="dashboard-compact-rank">{idx + 1}</span>
                    <span className="dashboard-compact-item-name">{tire.name}</span>
                    <span className="badge badge-warning dashboard-soft-badge">{tire.count} cliques</span>
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
                      <div className="dashboard-ranking-identity">
                        <span className="dashboard-compact-rank">{idx + 1}</span>
                        <div className="dashboard-ranking-copy">
                          <span>{seller.name}</span>
                          {seller.refCode && <div>Ref: {seller.refCode}</div>}
                        </div>
                      </div>
                      <span className="badge badge-success dashboard-soft-badge">{formatPercent(seller.conversionRate)}%</span>
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
          <div {...metricCardProps} className="card dashboard-home-popular-card dashboard-glow-card" style={{ padding: '26px', '--dashboard-glow-color': '245, 158, 11' }}>
            <h3 className="dashboard-home-popular-title" style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> Pneus Mais Procurados
            </h3>
            
            {popularTires.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Aguardando interações na vitrine para gerar estatísticas.</p>
            ) : (
              <div className="dashboard-home-popular-list">
                {popularTires.map((tire, idx) => (
                  <div key={idx} className="dashboard-home-popular-item">
                    <span className="dashboard-compact-rank">{idx + 1}</span>
                    <span className="dashboard-compact-item-name">{tire.name}</span>
                    <span className="badge badge-warning dashboard-soft-badge">{tire.count} cliques</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seller Ranking */}
          <div {...metricCardProps} className="card dashboard-home-ranking-card dashboard-glow-card" style={{ padding: '26px', '--dashboard-glow-color': '34, 197, 94' }}>
            <h3 className="dashboard-home-popular-title" style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: '#22c55e' }} /> Ranking Comercial
            </h3>

            {commercialMetrics.sellerRanking.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Ainda não há leads, vendas ou visitas para montar o ranking.</p>
            ) : (
              <div className="dashboard-home-ranking-list">
                {commercialMetrics.sellerRanking.slice(0, 5).map((seller, idx) => (
                  <div
                    key={seller.key}
                    className="dashboard-home-ranking-item"
                  >
                    <div className="flex-between dashboard-ranking-top">
                      <div className="dashboard-ranking-identity">
                        <span className="dashboard-compact-rank">{idx + 1}</span>
                        <div className="dashboard-ranking-copy">
                          <span>{seller.name}</span>
                          {seller.refCode && (
                            <div>Ref: {seller.refCode}</div>
                          )}
                        </div>
                      </div>
                      <span className="badge badge-success dashboard-soft-badge">
                        {formatPercent(seller.conversionRate)}%
                      </span>
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
          --metric-accent: var(--primary);
          --metric-accent-rgb: 245, 158, 11;
          --metric-icon-bg: rgba(245, 158, 11, 0.12);
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
          border-color: rgba(var(--metric-accent-rgb), 0.55);
          box-shadow: 0 18px 38px rgba(var(--metric-accent-rgb), 0.12), 0 10px 24px rgba(0, 0, 0, 0.26);
          transform: translateY(-4px) rotateX(1.2deg) rotateY(-1.2deg) scale(1.012);
          outline: none;
        }

        .dashboard-metric-card.is-selected {
          border-color: var(--metric-accent);
          background:
            radial-gradient(circle at top right, rgba(var(--metric-accent-rgb), 0.22), transparent 34%),
            linear-gradient(145deg, rgba(var(--metric-accent-rgb), 0.16), rgba(255, 255, 255, 0.025));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 18px 38px rgba(var(--metric-accent-rgb), 0.14);
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
          color: var(--metric-accent);
          background: var(--metric-icon-bg);
          transition: transform 0.24s ease, box-shadow 0.24s ease, filter 0.24s ease;
        }

        .dashboard-metric-card:hover .dashboard-metric-card__icon,
        .dashboard-metric-card:focus-visible .dashboard-metric-card__icon,
        .dashboard-metric-card.is-selected .dashboard-metric-card__icon {
          filter: brightness(1.12);
          box-shadow: 0 8px 22px rgba(var(--metric-accent-rgb), 0.16);
          transform: translateZ(14px) scale(1.08);
        }

        .dashboard-metric-card__icon--amber {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.12);
        }

        .dashboard-metric-card__icon--green {
          color: #22c55e;
          background: rgba(34, 197, 94, 0.12);
        }

        .dashboard-metric-card__icon--yellow {
          color: #eab308;
          background: rgba(234, 179, 8, 0.14);
        }

        .dashboard-metric-card__icon--red {
          color: #f87171;
          background: rgba(239, 68, 68, 0.12);
        }

        .dashboard-metric-card__icon--blue {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.12);
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
          margin-bottom: 22px;
          transform-origin: top center;
          animation: dashboardDetailIn 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
          transition: opacity 0.24s ease, transform 0.24s ease, margin-bottom 0.24s ease;
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

        .dashboard-home-header-shell {
          width: 100%;
          margin-bottom: 32px;
        }

        .dashboard-home-header-inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 18px;
          width: 100%;
          margin: 0;
        }

        .dashboard-home-header-center {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
          align-items: flex-end;
        }

        .dashboard-home-header-right {
          display: flex;
          justify-content: flex-end;
        }

        .dashboard-report-action {
          min-height: 44px;
          gap: 8px;
          align-self: flex-end;
        }

        .dashboard-store-link-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: var(--bg-card);
          border: 1px solid var(--border);
          padding: 10px 12px;
          border-radius: var(--radius-md);
          min-width: 0;
          max-width: 100%;
        }

        .dashboard-store-link-content {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .dashboard-store-link-label {
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .dashboard-store-link-code {
          min-width: 0;
          max-width: 210px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          color: var(--primary);
          background-color: transparent;
          padding: 0;
        }

        .dashboard-store-link-editor {
          display: flex;
          align-items: center;
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          overflow: hidden;
        }

        .dashboard-store-link-prefix {
          flex-shrink: 0;
          padding: 0 0 0 10px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .dashboard-store-link-input {
          width: 170px;
          min-height: 38px;
          border: 0;
          background: transparent;
          padding: 8px 10px 8px 4px;
          font-size: 13px;
          color: var(--primary);
        }

        .dashboard-store-link-input:focus {
          box-shadow: none;
        }

        .dashboard-store-link-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .dashboard-store-link-action {
          min-height: 38px;
          padding: 7px 12px !important;
          font-size: 12px !important;
          white-space: nowrap;
        }

        .dashboard-store-link-message {
          flex-basis: 100%;
          font-size: 11px;
          line-height: 1.25;
        }

        .dashboard-store-link-message.is-success {
          color: var(--success);
        }

        .dashboard-store-link-message.is-error {
          color: var(--error);
        }

        .dashboard-mobile-detail-backdrop {
          display: none;
        }

        @media (max-width: 1180px) {
          .dashboard-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 1280px) {
          .dashboard-home-header-inner {
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: start;
          }

          .dashboard-home-header-center {
            align-items: flex-end;
          }

          .dashboard-home-header-right {
            align-self: start;
          }

          .dashboard-home-header-left {
            min-width: 0;
          }
        }

        @media (max-width: 768px) {
          .dashboard-metric-grid {
            grid-template-columns: 1fr;
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
            border-radius: 26px;
            padding: 0;
            transform-origin: bottom center;
            animation: dashboardSheetIn 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
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

          .dashboard-store-link-card {
            width: 100%;
            align-items: stretch;
            flex-direction: column;
          }

          .dashboard-store-link-content {
            align-items: flex-start;
            flex-direction: column;
          }

          .dashboard-store-link-code,
          .dashboard-store-link-editor {
            width: 100%;
            max-width: none;
          }

          .dashboard-store-link-input {
            width: 100%;
          }

          .dashboard-store-link-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .dashboard-store-link-action {
            flex: 1 1 130px;
          }

          .dashboard-home-header-inner {
            width: 100%;
          }

          .dashboard-home-header-right {
            justify-content: flex-start;
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
          padding: 18px;
          min-width: 0;
        }

        .dashboard-subcard-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 850;
          letter-spacing: -0.025em;
          line-height: 1.2;
          margin: 0 0 18px;
        }

        .dashboard-subcard-title svg,
        .dashboard-home-popular-title svg {
          flex: 0 0 auto;
          filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.2));
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
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .dashboard-home-popular-item {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 16px;
          background:
            linear-gradient(135deg, rgba(245, 158, 11, 0.07), rgba(255, 255, 255, 0.028) 42%, rgba(255, 255, 255, 0.018)),
            rgba(255, 255, 255, 0.018);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
          min-width: 0;
          min-height: 54px;
          padding: 12px 13px;
        }

        .dashboard-compact-rank {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.18);
          color: #fbbf24;
          font-size: 12px;
          font-weight: 850;
          line-height: 1;
          flex: 0 0 auto;
        }

        .dashboard-compact-item-name {
          min-width: 0;
          color: rgba(248, 250, 252, 0.84);
          font-size: 13.5px;
          font-weight: 700;
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dashboard-home-popular-item > .dashboard-soft-badge {
          justify-self: end;
          max-width: 118px;
        }

        .dashboard-soft-badge {
          min-height: 24px;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.045em;
          text-transform: uppercase;
          box-shadow: none;
        }

        .dashboard-soft-badge.badge-warning {
          color: #fbbf24;
          background: rgba(245, 158, 11, 0.095);
          border-color: rgba(245, 158, 11, 0.22);
        }

        .dashboard-soft-badge.badge-success {
          color: #34d399;
          background: rgba(34, 197, 94, 0.095);
          border-color: rgba(34, 197, 94, 0.2);
        }

        .dashboard-home-ranking-item {
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 18px;
          padding: 16px;
          background:
            linear-gradient(145deg, rgba(34, 197, 94, 0.055), rgba(255, 255, 255, 0.024) 48%, rgba(255, 255, 255, 0.015)),
            rgba(255, 255, 255, 0.018);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
          text-align: left;
          min-width: 0;
        }

        .dashboard-ranking-top {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          margin-bottom: 14px;
          align-items: flex-start;
        }

        .dashboard-ranking-identity {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: start;
          gap: 10px;
          min-width: 0;
        }

        .dashboard-ranking-copy {
          min-width: 0;
        }

        .dashboard-ranking-copy > span:first-child {
          color: var(--text-primary);
          font-weight: 700;
          font-size: 14px;
          word-break: break-word;
        }

        .dashboard-ranking-copy div {
          color: var(--text-muted);
          font-size: 11px;
          margin-top: 4px;
          word-break: break-word;
        }

        .dashboard-ranking-top > .dashboard-soft-badge {
          justify-self: end;
          max-width: 88px;
        }

        .dashboard-ranking-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          color: var(--text-secondary);
          font-size: 11px;
        }

        .dashboard-ranking-stats span {
          display: flex;
          flex-direction: column;
          gap: 2px;
          border: 1px solid rgba(255, 255, 255, 0.055);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.022);
          padding: 9px 10px;
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
          gap: 10px;
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
          .dashboard-home-popular-item,
          .dashboard-home-ranking-item,
          .dashboard-home-lead-item {
            border-radius: 16px;
          }

          .dashboard-ranking-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-home-popular-item {
            align-items: flex-start;
          }

          .dashboard-compact-item-name {
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
            grid-template-columns: auto minmax(0, 1fr) auto;
            align-items: center;
            gap: 12px;
            padding: 12px;
          }

          .dashboard-compact-item-name {
            max-width: 100%;
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

          .dashboard-home-popular-item {
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
          }

          .dashboard-compact-item-name {
            max-width: 100%;
            white-space: normal;
          }

          .dashboard-home-popular-item > .dashboard-soft-badge {
            grid-column: 1 / -1;
            justify-self: start;
            max-width: 100%;
          }

          .dashboard-ranking-top {
            grid-template-columns: 1fr;
          }

          .dashboard-ranking-top > .dashboard-soft-badge {
            justify-self: start;
          }
        }

        .dashboard-report-overlay {
          position: fixed;
          inset: 0;
          z-index: 140;
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .dashboard-report-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(5, 8, 14, 0.72);
          backdrop-filter: blur(8px);
        }

        .dashboard-report-container {
          position: relative;
          width: min(1220px, 100%);
          max-height: calc(100dvh - 48px);
          overflow: auto;
          border-radius: 26px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.98));
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        }

        .dashboard-report-sheet {
          position: relative;
          padding: 28px;
          color: var(--text-primary);
        }

        .dashboard-report-sheet--preview {
          background: #f3f4f6;
        }

        .dashboard-report-sheet__header,
        .dashboard-report-sheet__actions,
        .dashboard-report-card__top,
        .dashboard-report-bulk-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .dashboard-report-sheet__header {
          margin-bottom: 22px;
        }

        .dashboard-report-sheet__eyebrow {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #fbbf24;
          margin-bottom: 8px;
        }

        .dashboard-report-sheet__header h2,
        .dashboard-report-card h3 {
          margin: 0;
        }

        .dashboard-report-sheet__header p,
        .dashboard-report-card p,
        .dashboard-report-section-row span {
          color: var(--text-secondary);
        }

        .dashboard-report-close {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-primary);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .dashboard-report-config-grid {
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          gap: 18px;
        }

        .dashboard-report-card {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 22px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.04);
          display: grid;
          gap: 18px;
        }

        .dashboard-report-presets,
        .dashboard-report-sections {
          display: grid;
          gap: 10px;
        }

        .dashboard-report-choice {
          width: 100%;
          text-align: left;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
          cursor: pointer;
          font-weight: 700;
        }

        .dashboard-report-choice.is-active {
          border-color: rgba(245, 158, 11, 0.55);
          background: rgba(245, 158, 11, 0.14);
          color: #fde68a;
        }

        .dashboard-report-date-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboard-report-date-grid label,
        .dashboard-report-section-row {
          display: grid;
          gap: 8px;
        }

        .dashboard-report-date-grid span {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .dashboard-report-date-grid input {
          min-height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.88);
          color: var(--text-primary);
          padding: 0 12px;
        }

        .dashboard-report-section-row {
          grid-template-columns: auto minmax(0, 1fr);
          align-items: start;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.02);
        }

        .dashboard-report-section-row input {
          margin-top: 2px;
        }

        .dashboard-report-section-row strong {
          display: block;
          margin-bottom: 4px;
        }

        .dashboard-report-section-row.is-disabled {
          opacity: 0.58;
        }

        .dashboard-report-feedback {
          margin-top: 18px;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 600;
        }

        .dashboard-report-feedback.is-error,
        .dashboard-report-missing-data {
          border: 1px solid rgba(248, 113, 113, 0.24);
          background: rgba(127, 29, 29, 0.12);
          color: #fecaca;
        }

        .dashboard-report-sheet__actions {
          margin-top: 22px;
        }

        .dashboard-report-privacy-note {
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.24);
          color: #fde68a;
          font-size: 13px;
        }

        .dashboard-report-preview {
          background: #ffffff;
          color: #111827;
          min-height: 100%;
          border-radius: 22px;
          padding: 32px;
        }

        .dashboard-report-preview__header,
        .dashboard-report-preview__footer {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
        }

        .dashboard-report-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .dashboard-report-brand img,
        .dashboard-report-logo-fallback {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          object-fit: cover;
          background: #111827;
          color: #fbbf24;
          display: grid;
          place-items: center;
          font-weight: 800;
        }

        .dashboard-report-brand span {
          display: block;
          color: #6b7280;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .dashboard-report-brand h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.1;
        }

        .dashboard-report-meta {
          display: grid;
          gap: 6px;
          color: #4b5563;
          font-size: 13px;
          text-align: right;
        }

        .dashboard-report-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 24px 0;
        }

        .dashboard-report-summary-card {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 16px;
          background: #f9fafb;
        }

        .dashboard-report-summary-card span,
        .dashboard-report-inline-summary span,
        .dashboard-report-total span,
        .dashboard-report-empty {
          color: #6b7280;
        }

        .dashboard-report-summary-card strong,
        .dashboard-report-inline-summary strong,
        .dashboard-report-total strong {
          display: block;
          margin-top: 6px;
          color: #111827;
        }

        .dashboard-report-preview__sections {
          display: grid;
          gap: 18px;
        }

        .dashboard-report-preview-section {
          break-inside: avoid;
          page-break-inside: avoid;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 18px;
        }

        .dashboard-report-preview-section h3 {
          margin: 0 0 14px;
          font-size: 18px;
        }

        .dashboard-report-inline-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .dashboard-report-inline-summary div {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px;
          background: #f9fafb;
        }

        .dashboard-report-table-wrap {
          overflow: auto;
        }

        .dashboard-report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .dashboard-report-table thead {
          display: table-header-group;
        }

        .dashboard-report-table th,
        .dashboard-report-table td {
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
          vertical-align: top;
        }

        .dashboard-report-table th {
          color: #374151;
          background: #f3f4f6;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .dashboard-report-total {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          font-size: 13px;
        }

        .dashboard-report-missing-data {
          margin: 0 0 18px;
          border-radius: 16px;
          padding: 14px 16px;
        }

        .dashboard-report-preview__footer {
          margin-top: 22px;
          padding-top: 14px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 12px;
        }

        .spin {
          animation: dashboardReportSpin 0.9s linear infinite;
        }

        @keyframes dashboardReportSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 960px) {
          .dashboard-report-config-grid,
          .dashboard-report-summary-grid,
          .dashboard-report-inline-summary {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-report-overlay {
            padding: 0;
          }

          .dashboard-report-container {
            width: 100%;
            max-height: 100dvh;
            border-radius: 0;
          }

          .dashboard-report-sheet,
          .dashboard-report-preview {
            padding: 18px;
          }

          .dashboard-report-date-grid {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          body * {
            visibility: hidden;
          }

          .print-surface,
          .print-surface * {
            visibility: visible;
          }

          .print-surface {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border-radius: 0;
            padding: 0;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: auto;
            margin: 14mm;
          }

          .dashboard-report-preview-section,
          .dashboard-report-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <DashboardReportModal
        isOpen={reportModalOpen}
        step={reportStep}
        report={reportPreview}
        config={reportConfig}
        loading={reportLoading}
        error={reportError}
        isOwner={role === 'owner'}
        onConfigChange={handleReportConfigChange}
        onPreview={handleBuildReportPreview}
        onBackToConfig={() => setReportStep('config')}
        onClose={closeReportModal}
        onPrint={handlePrintReport}
      />
    </div>
  );
}
