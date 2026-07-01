import { REPORT_PERIOD_PRESETS, REPORT_SECTION_DEFINITIONS, createDefaultReportSelection } from './dashboardReportConfig';
import {
  getLeadOfferPrice,
  getLeadOfferQuantity,
  getLeadPhysicalQuantity,
  getLeadSummaryLabel,
  getLeadTotalValue,
  getLeadQuantityPerOffer
} from '../../../utils/tireOffer';

const LOW_STOCK_THRESHOLD = 4;
export const DASHBOARD_PERIOD_PRESETS = [
  { id: 'current_month', label: 'Este mês' },
  { id: 'current_semester', label: 'Semestre atual' },
  { id: 'all_time', label: 'Todo o período' }
];

const padDateValue = (value) => String(value).padStart(2, '0');

export const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

export const formatDate = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('pt-BR');
};

export const formatDateTime = (value) => {
  if (!value) return '--';
  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

export const formatPercent = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });

export const normalizeQuantity = (value, fallback = 1) =>
  Math.max(1, Number.parseInt(value ?? fallback, 10) || 1);

export const getLeadStatus = (lead) => {
  const status = lead?.status_atendimento;
  if (status === 'vendido' || status === 'desistencia' || status === 'em_atendimento') {
    return status;
  }
  return lead?.venda_confirmada ? 'vendido' : 'em_atendimento';
};

export const getTodayInputValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${padDateValue(now.getMonth() + 1)}-${padDateValue(now.getDate())}`;
};

export const toInputDate = (date) =>
  `${date.getFullYear()}-${padDateValue(date.getMonth() + 1)}-${padDateValue(date.getDate())}`;

export const buildPresetDateWindow = (presetId, now = new Date()) => {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(end);

  if (presetId === 'week') {
    const day = end.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(end.getDate() - diffToMonday);
  } else if (presetId === 'month' || presetId === 'current_month') {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else if (presetId === 'quarter') {
    const quarterStartMonth = Math.floor(end.getMonth() / 3) * 3;
    start = new Date(end.getFullYear(), quarterStartMonth, 1);
  } else if (presetId === 'current_semester') {
    start = new Date(end.getFullYear(), end.getMonth() < 6 ? 0 : 6, 1);
  } else if (presetId === 'all_time') {
    return {
      startDate: null,
      endDate: toInputDate(end),
      startAt: null,
      endAt: null
    };
  } else {
    start = new Date(end.getFullYear(), 0, 1);
  }

  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end),
    startAt: `${toInputDate(start)}T00:00:00`,
    endAt: `${toInputDate(end)}T23:59:59.999`
  };
};

export const buildPresetRange = (presetId, now = new Date()) => {
  const { startDate, endDate } = buildPresetDateWindow(presetId, now);
  return { startDate, endDate };
};

export const createInitialReportConfig = () => {
  const defaultPreset = REPORT_PERIOD_PRESETS[1]?.id || 'month';
  return {
    preset: defaultPreset,
    startDate: buildPresetRange(defaultPreset).startDate,
    endDate: buildPresetRange(defaultPreset).endDate,
    sections: createDefaultReportSelection()
  };
};

export const validateReportConfig = (config) => {
  const selectedSections = Object.entries(config.sections || {})
    .filter(([, selected]) => selected)
    .map(([sectionId]) => sectionId);

  if (selectedSections.length === 0) {
    return 'Selecione pelo menos uma secao.';
  }

  if (!config.startDate || !config.endDate) {
    return 'Informe a data inicial e a data final.';
  }

  const start = new Date(`${config.startDate}T00:00:00`);
  const end = new Date(`${config.endDate}T00:00:00`);
  const today = new Date(`${getTodayInputValue()}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Informe datas validas.';
  }

  if (end < start) {
    return 'A data final nao pode ser anterior a data inicial.';
  }

  if (start > today || end > today) {
    return 'Nao e permitido selecionar datas futuras.';
  }

  return '';
};

export const estimateReportLength = (config) => {
  const checkedCount = Object.values(config.sections || {}).filter(Boolean).length;
  if (checkedCount <= 2) return 'curto';
  if (checkedCount <= 5) return 'medio';
  return 'detalhado';
};

export const getUnavailableSectionReason = (section) => {
  if (section.id === 'contacts') {
    return 'Indisponivel: os leads atuais nao armazenam telefone do cliente.';
  }
  return '';
};

const getSellerName = (row) =>
  row?.vendedor_nome || row?.seller_name || row?.nome || row?.email || 'Sem vendedor';

export const buildDashboardReport = ({ store, rangeLabel, generatedAt, selectedSections, rawData }) => {
  const leads = rawData?.leads || [];
  const soldLeads = rawData?.soldLeads || [];
  const visits = rawData?.visits || [];
  const sellers = rawData?.sellers || [];
  const stock = rawData?.stock || [];

  const summary = {
    totalViews: visits.length,
    totalLeads: leads.length,
    confirmedSales: soldLeads.length,
    confirmedRevenue: soldLeads.reduce((sum, lead) => sum + getLeadTotalValue(lead, 'sold'), 0),
    averageTicket: 0,
    conversionRate: 0
  };

  summary.averageTicket = summary.confirmedSales > 0 ? summary.confirmedRevenue / summary.confirmedSales : 0;
  summary.conversionRate = summary.totalLeads > 0 ? (summary.confirmedSales / summary.totalLeads) * 100 : 0;

  const sections = [];

  if (selectedSections.includes('summary')) {
    sections.push({
      id: 'summary',
      title: 'Resumo geral',
      kind: 'summary',
      items: [
        { label: 'Visualizacoes', value: summary.totalViews },
        { label: 'Clientes interessados', value: summary.totalLeads },
        { label: 'Vendas confirmadas', value: summary.confirmedSales },
        { label: 'Faturamento confirmado', value: formatCurrency(summary.confirmedRevenue) },
        { label: 'Taxa de conversao', value: `${formatPercent(summary.conversionRate)}%` },
        { label: 'Ticket medio', value: summary.confirmedSales > 0 ? formatCurrency(summary.averageTicket) : 'Sem dados' }
      ]
    });
  }

  if (selectedSections.includes('sales')) {
    sections.push({
      id: 'sales',
      title: 'Vendas realizadas',
      kind: 'table',
      columns: ['Data da venda', 'Cliente', 'Produto', 'Medida', 'Kits/Anuncios', 'Pneus fisicos', 'Preco do anuncio', 'Valor total', 'Vendedor'],
      rows: soldLeads.map((lead) => {
        const offerQuantity = getLeadOfferQuantity(lead, 'sold');
        const physicalQuantity = getLeadPhysicalQuantity(lead, 'sold');
        const offerPrice = getLeadOfferPrice(lead);
        return [
          formatDate(lead.venda_confirmada_em || lead.created_at),
          lead.nome_cliente || 'Cliente interessado',
          lead.produto_nome || 'Produto nao identificado',
          lead.produto_medida || '--',
          `${offerQuantity}`,
          `${physicalQuantity}`,
          formatCurrency(offerPrice),
          formatCurrency(getLeadTotalValue(lead, 'sold')),
          getSellerName(lead)
        ];
      }),
      totalLabel: 'Faturamento confirmado',
      totalValue: formatCurrency(summary.confirmedRevenue)
    });
  }

  if (selectedSections.includes('sold_products')) {
    const groupedProducts = soldLeads.reduce((acc, lead) => {
      const key = [lead.marca || '', lead.modelo || '', lead.produto_nome || '', lead.produto_medida || ''].join('||');
      if (!acc.has(key)) {
        acc.set(key, {
          brand: lead.marca || '--',
          model: lead.modelo || lead.produto_nome || '--',
          measure: lead.produto_medida || '--',
          offerQuantity: 0,
          physicalQuantity: 0,
          revenue: 0
        });
      }

      const target = acc.get(key);
      const offerQuantity = getLeadOfferQuantity(lead, 'sold');
      const physicalQuantity = getLeadPhysicalQuantity(lead, 'sold');
      target.offerQuantity += offerQuantity;
      target.physicalQuantity += physicalQuantity;
      target.revenue += getLeadTotalValue(lead, 'sold');
      return acc;
    }, new Map());

    const rows = Array.from(groupedProducts.values()).sort((a, b) => b.physicalQuantity - a.physicalQuantity);
    sections.push({
      id: 'sold_products',
      title: 'Pneus vendidos',
      kind: 'table',
      columns: ['Marca', 'Modelo', 'Medida', 'Kits/Anuncios', 'Pneus fisicos', 'Faturamento por produto'],
      rows: rows.map((item) => [
        item.brand,
        item.model,
        item.measure,
        `${item.offerQuantity}`,
        `${item.physicalQuantity}`,
        formatCurrency(item.revenue)
      ]),
      totalLabel: 'Itens vendidos',
      totalValue: `${rows.reduce((sum, item) => sum + item.physicalQuantity, 0)} pneu(s)`
    });
  }

  if (selectedSections.includes('leads')) {
    sections.push({
      id: 'leads',
      title: 'Clientes interessados',
      kind: 'table',
      columns: ['Nome do cliente', 'Produto de interesse', 'Resumo', 'Data do contato', 'Status', 'Vendedor responsavel'],
      rows: leads.map((lead) => [
        lead.nome_cliente || 'Cliente interessado',
        lead.produto_nome || 'Produto nao identificado',
        getLeadSummaryLabel(lead),
        formatDateTime(lead.created_at),
        getLeadStatus(lead) === 'em_atendimento'
          ? 'Oportunidade em aberto'
          : getLeadStatus(lead) === 'vendido'
            ? 'Vendido'
            : 'Desistencia',
        getSellerName(lead)
      ]),
      totalLabel: 'Total de clientes interessados',
      totalValue: `${leads.length}`
    });
  }

  if (selectedSections.includes('pending')) {
    const pendingLeads = leads.filter((lead) => getLeadStatus(lead) === 'em_atendimento');
    const totalPendingValue = pendingLeads.reduce(
      (sum, lead) => sum + getLeadTotalValue(lead),
      0
    );

    sections.push({
      id: 'pending',
      title: 'Vendas pendentes',
      kind: 'table',
      columns: ['Cliente', 'Produto', 'Resumo', 'Data do contato', 'Valor potencial', 'Vendedor'],
      rows: pendingLeads.map((lead) => {
        return [
          lead.nome_cliente || 'Cliente interessado',
          lead.produto_nome || 'Produto nao identificado',
          getLeadSummaryLabel(lead),
          formatDate(lead.created_at),
          formatCurrency(getLeadTotalValue(lead)),
          getSellerName(lead)
        ];
      }),
      totalLabel: 'Valor potencial em aberto',
      totalValue: formatCurrency(totalPendingValue)
    });
  }

  if (selectedSections.includes('withdrawals')) {
    const withdrawalLeads = leads.filter((lead) => getLeadStatus(lead) === 'desistencia');
    const totalWithdrawalValue = withdrawalLeads.reduce(
      (sum, lead) => sum + getLeadTotalValue(lead),
      0
    );

    sections.push({
      id: 'withdrawals',
      title: 'Desistencias',
      kind: 'table',
      columns: ['Cliente', 'Produto', 'Resumo', 'Data', 'Receita potencial perdida', 'Vendedor'],
      rows: withdrawalLeads.map((lead) => {
        return [
          lead.nome_cliente || 'Cliente interessado',
          lead.produto_nome || 'Produto nao identificado',
          getLeadSummaryLabel(lead),
          formatDate(lead.created_at),
          formatCurrency(getLeadTotalValue(lead)),
          getSellerName(lead)
        ];
      }),
      totalLabel: 'Receita potencial perdida',
      totalValue: formatCurrency(totalWithdrawalValue)
    });
  }

  if (selectedSections.includes('seller_performance')) {
    const sellerMap = new Map();

    sellers.forEach((seller) => {
      const key = seller.user_id || seller.id || seller.ref_code || seller.email || seller.nome;
      sellerMap.set(key, {
        seller: getSellerName(seller),
        leads: 0,
        sales: 0,
        revenue: 0
      });
    });

    leads.forEach((lead) => {
      const key = lead.seller_id || lead.ref_code || getSellerName(lead);
      if (!sellerMap.has(key)) {
        sellerMap.set(key, {
          seller: getSellerName(lead),
          leads: 0,
          sales: 0,
          revenue: 0
        });
      }
      sellerMap.get(key).leads += 1;
    });

    soldLeads.forEach((lead) => {
      const key = lead.seller_id || lead.ref_code || getSellerName(lead);
      if (!sellerMap.has(key)) {
        sellerMap.set(key, {
          seller: getSellerName(lead),
          leads: 0,
          sales: 0,
          revenue: 0
        });
      }
      const target = sellerMap.get(key);
      target.sales += 1;
      target.revenue += getLeadTotalValue(lead, 'sold');
    });

    const rows = Array.from(sellerMap.values())
      .filter((entry) => entry.leads > 0 || entry.sales > 0)
      .sort((a, b) => b.revenue - a.revenue);

    sections.push({
      id: 'seller_performance',
      title: 'Desempenho da equipe',
      kind: 'table',
      columns: ['Vendedor', 'Leads atendidos', 'Vendas confirmadas', 'Taxa de conversao', 'Faturamento'],
      rows: rows.map((entry) => [
        entry.seller,
        `${entry.leads}`,
        `${entry.sales}`,
        `${formatPercent(entry.leads > 0 ? (entry.sales / entry.leads) * 100 : 0)}%`,
        formatCurrency(entry.revenue)
      ]),
      totalLabel: 'Vendedores no relatorio',
      totalValue: `${rows.length}`
    });
  }

  if (selectedSections.includes('stock')) {
    const rows = stock
      .map((item) => {
        const quantity = Math.max(0, Number(item.estoque || 0));
        const quantityPerOffer = getLeadQuantityPerOffer(item);
        return {
          product: item.titulo_anuncio || [item.marca, item.modelo].filter(Boolean).join(' ') || 'Produto sem nome',
          measure: item.medida || '--',
          quantity,
          offerQuantity: quantityPerOffer > 0 ? Math.floor(quantity / quantityPerOffer) : quantity,
          lowStock: quantity <= LOW_STOCK_THRESHOLD ? 'Estoque baixo' : 'Ok'
        };
      })
      .sort((a, b) => a.quantity - b.quantity);

    sections.push({
      id: 'stock',
      title: 'Estoque atual',
      kind: 'table',
      columns: ['Produto', 'Medida', 'Pneus fisicos', 'Kits completos', 'Indicacao'],
      rows: rows.map((item) => [item.product, item.measure, `${item.quantity}`, `${item.offerQuantity}`, item.lowStock]),
      totalLabel: 'Observacao',
      totalValue: 'Fotografia atual do estoque, nao um historico do periodo.'
    });
  }

  const missingData = [];
  if (selectedSections.includes('contacts')) {
    missingData.push('A secao "Nomes e telefones" nao foi gerada porque os leads atuais nao armazenam telefone do cliente.');
  }

  return {
    header: {
      storeName: store?.nome || store?.name || 'Loja',
      storeLogo: store?.logo || '',
      title: 'Relatorio Comercial',
      rangeLabel,
      generatedAt: formatDateTime(generatedAt)
    },
    summary,
    sections,
    selectedSections,
    missingData
  };
};

export {
  REPORT_SECTION_DEFINITIONS,
  REPORT_PERIOD_PRESETS,
  createDefaultReportSelection
};
