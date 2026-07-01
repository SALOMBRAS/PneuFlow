export const REPORT_PERIOD_PRESETS = [
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mês' },
  { id: 'quarter', label: 'Este trimestre' },
  { id: 'year', label: 'Este ano' }
];

export const REPORT_SECTION_DEFINITIONS = [
  {
    id: 'summary',
    label: 'Resumo geral',
    defaultChecked: true,
    description: 'Visualizacoes, total de clientes interessados, vendas confirmadas, faturamento e ticket medio.'
  },
  {
    id: 'sales',
    label: 'Vendas realizadas',
    defaultChecked: true,
    description: 'Lista compacta de vendas confirmadas no periodo.'
  },
  {
    id: 'sold_products',
    label: 'Pneus vendidos',
    defaultChecked: true,
    description: 'Consolidado por marca, modelo e medida.'
  },
  {
    id: 'leads',
    label: 'Clientes interessados',
    defaultChecked: false,
    description: 'Clientes, produto de interesse, quantidade, data do contato e responsavel.'
  },
  {
    id: 'contacts',
    label: 'Nomes e telefones',
    defaultChecked: false,
    ownerOnly: true,
    requiresFields: ['customer_phone'],
    description: 'Dados pessoais. Exige telefones reais dos clientes.'
  },
  {
    id: 'pending',
    label: 'Vendas pendentes',
    defaultChecked: false,
    description: 'Oportunidades em aberto e valor potencial ainda nao convertido.'
  },
  {
    id: 'withdrawals',
    label: 'Desistencias',
    defaultChecked: false,
    description: 'Receita potencial perdida em desistencias.'
  },
  {
    id: 'seller_performance',
    label: 'Desempenho da equipe',
    defaultChecked: false,
    description: 'Leads atendidos, vendas confirmadas, conversao e faturamento por vendedor.'
  },
  {
    id: 'stock',
    label: 'Estoque atual',
    defaultChecked: false,
    description: 'Fotografia atual do estoque, com destaque para itens baixos.'
  }
];

export const createDefaultReportSelection = () =>
  REPORT_SECTION_DEFINITIONS.reduce((acc, section) => {
    acc[section.id] = Boolean(section.defaultChecked);
    return acc;
  }, {});
