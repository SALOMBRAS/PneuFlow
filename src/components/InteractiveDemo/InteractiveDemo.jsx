import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Gauge,
  MessageSquare,
  PackageSearch,
  Search,
  Smartphone,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import RevealOnScroll from '../RevealOnScroll';
import './InteractiveDemo.css';

const demoTabs = [
  {
    id: 'vitrine',
    label: 'Vitrine',
    icon: Store,
    title: 'Seu cliente encontra o pneu certo sozinho',
    description:
      'A vitrine organiza pneus fictícios e mostra como o cliente pesquisaria por medida, aro ou veículo antes de chamar no atendimento.',
    benefit: 'Menos perguntas repetidas. Mais clientes prontos para comprar.',
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    icon: PackageSearch,
    title: 'Catálogo profissional e sempre organizado',
    description:
      'Veja uma prévia simples de como produtos poderiam ficar organizados por marca, medida, preço e status.',
    benefit: 'Sua loja deixa de depender de fotos soltas e listas confusas.',
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: Users,
    title: 'Organize interessados e pedidos em um so lugar',
    description:
      'Acompanhe poucos contatos ficticios e mude status apenas para entender o fluxo visual do PneuFlow.',
    benefit: 'Mais controle sobre seus contatos e oportunidades de venda.',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    title: 'Controle sua loja digital em um so painel',
    description:
      'Indicadores simples mostram como catálogo, leads e vitrine podem aparecer juntos em uma visão rápida.',
    benefit: 'Menos bagunca. Mais velocidade no atendimento.',
  },
];

const initialProducts = [
  {
    id: 'michelin-energy-xm2',
    brand: 'Michelin',
    model: 'Energy XM2',
    size: '175/65 R14',
    rim: '14',
    condition: 'Novo',
    price: 'R$ 329,90',
    stock: 8,
    active: true,
  },
  {
    id: 'pirelli-cinturato-p1',
    brand: 'Pirelli',
    model: 'Cinturato P1',
    size: '185/60 R15',
    rim: '15',
    condition: 'Novo',
    price: 'R$ 389,90',
    stock: 5,
    active: true,
  },
  {
    id: 'goodyear-efficientgrip',
    brand: 'Goodyear',
    model: 'EfficientGrip',
    size: '205/55 R16',
    rim: '16',
    condition: 'Novo',
    price: 'R$ 489,90',
    stock: 3,
    active: true,
  },
  {
    id: 'firestone-f600-usado',
    brand: 'Firestone',
    model: 'F-600',
    size: '175/70 R14',
    rim: '14',
    condition: 'Usado',
    price: 'R$ 189,90',
    stock: 2,
    active: false,
  },
];

const initialLeads = [
  { id: 'joao', name: 'Joao', request: 'Procura 175/65 R14', status: 'Pendente' },
  { id: 'mariana', name: 'Mariana', request: 'Interessada em Michelin R16', status: 'Em atendimento' },
  { id: 'carlos', name: 'Carlos', request: 'Pedido concluido', status: 'Vendido' },
];

const rimFilters = [
  { id: 'all', label: 'Todos' },
  { id: '14', label: 'Aro 14' },
  { id: '15', label: 'Aro 15' },
  { id: '16', label: 'Aro 16' },
];

const conditionFilters = ['Todos', 'Novo', 'Usado'];

const statusCycle = ['Pendente', 'Em atendimento', 'Vendido'];

function getLeadTone(status) {
  if (status === 'Vendido') return 'success';
  if (status === 'Em atendimento') return 'info';
  return 'warning';
}

function VitrinePanel({ products, onInterest }) {
  const [activeRim, setActiveRim] = useState('all');
  const [activeCondition, setActiveCondition] = useState('Todos');

  const filteredProducts = products.filter((product) => {
    const matchesRim = activeRim === 'all' || product.rim === activeRim;
    const matchesCondition = activeCondition === 'Todos' || product.condition === activeCondition;
    return product.active && matchesRim && matchesCondition;
  });

  return (
    <div className="demo-screen demo-screen--store">
      <div className="demo-store-header">
        <div>
          <span className="demo-status-dot" />
          <span className="demo-store-status">Loja ficticia aberta</span>
          <h4>Pneus Express</h4>
        </div>
        <span className="demo-whatsapp-pill">
          <MessageSquare size={14} />
          Atendimento simulado
        </span>
      </div>

      <div className="demo-search" aria-label="Campo de busca demonstrativo">
        <Search size={16} />
        <span>Digite medida, aro ou veículo</span>
      </div>

      <div className="demo-chip-row" aria-label="Filtros ficticios por aro">
        {rimFilters.map((filter) => (
          <button
            type="button"
            key={filter.id}
            className={activeRim === filter.id ? 'is-active' : ''}
            aria-pressed={activeRim === filter.id}
            onClick={() => setActiveRim(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="demo-condition-row" aria-label="Filtros ficticios por condicao">
        {conditionFilters.map((condition) => (
          <button
            type="button"
            key={condition}
            className={activeCondition === condition ? 'is-active' : ''}
            aria-pressed={activeCondition === condition}
            onClick={() => setActiveCondition(condition)}
          >
            {condition}
          </button>
        ))}
      </div>

      <div className="demo-product-grid">
        {filteredProducts.map((product) => (
          <article className="demo-product-card" key={product.id}>
            <div className="demo-product-thumb" aria-hidden="true">
              <span />
            </div>
            <div>
              <strong>{product.size}</strong>
              <p>{product.brand} {product.model}</p>
              <small>{product.condition} · {product.stock} em estoque</small>
            </div>
            <div className="demo-product-footer">
              <span>{product.price}</span>
              <button
                type="button"
                onClick={() => onInterest(product)}
                aria-label={`Simular interesse no pneu ${product.brand} ${product.model} ${product.size}`}
              >
                <MessageSquare size={13} />
                Simular
              </button>
            </div>
          </article>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <p className="demo-empty-state">Nenhum produto ficticio nesse filtro.</p>
      )}
    </div>
  );
}

function CatalogoPanel({ products, onToggleProduct }) {
  const [catalogFilter, setCatalogFilter] = useState('Todos');
  const filteredProducts = products.filter((product) => {
    if (catalogFilter === 'Ativos') return product.active;
    if (catalogFilter === 'Ocultos') return !product.active;
    return true;
  });

  return (
    <div className="demo-screen">
      <div className="demo-panel-header">
        <div>
          <span>Gestao ficticia</span>
          <h4>Catálogo de Pneus</h4>
        </div>
        <span className="demo-mini-action">4 produtos</span>
      </div>

      <div className="demo-filter-row" aria-label="Filtros demonstrativos">
        {['Todos', 'Ativos', 'Ocultos'].map((filter) => (
          <button
            type="button"
            key={filter}
            className={catalogFilter === filter ? 'is-active' : ''}
            aria-pressed={catalogFilter === filter}
            onClick={() => setCatalogFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="demo-list">
        {filteredProducts.map((item) => (
          <article className={`demo-list-item ${!item.active ? 'is-muted' : ''}`} key={item.id}>
            <div className="demo-list-icon">
              <PackageSearch size={17} />
            </div>
            <div>
              <strong>{item.brand} {item.size}</strong>
              <p>{item.price} · {item.stock} em estoque</p>
            </div>
            <button
              type="button"
              className={`demo-status demo-status-button ${item.active ? 'demo-status--success' : 'demo-status--muted'}`}
              aria-pressed={item.active}
              aria-label={`${item.active ? 'Ocultar' : 'Reativar'} produto ficticio ${item.brand} ${item.size}`}
              onClick={() => onToggleProduct(item.id)}
            >
              {item.active ? 'Ativo' : 'Oculto'}
            </button>
          </article>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <p className="demo-empty-state">Nenhum produto ficticio nesse filtro.</p>
      )}
    </div>
  );
}

function LeadsPanel({ leads, onCycleLeadStatus }) {
  const [leadFilter, setLeadFilter] = useState('Todos');
  const filteredLeads = leads.filter((lead) => {
    if (leadFilter === 'Pendentes') return lead.status !== 'Vendido';
    if (leadFilter === 'Vendidos') return lead.status === 'Vendido';
    return true;
  });

  return (
    <div className="demo-screen">
      <div className="demo-panel-header">
        <div>
          <span>Atendimento ficticio</span>
          <h4>Leads no WhatsApp</h4>
        </div>
        <MessageSquare className="demo-panel-icon" size={22} />
      </div>

      <div className="demo-filter-row" aria-label="Filtros demonstrativos de leads">
        {['Todos', 'Pendentes', 'Vendidos'].map((filter) => (
          <button
            type="button"
            key={filter}
            className={leadFilter === filter ? 'is-active' : ''}
            aria-pressed={leadFilter === filter}
            onClick={() => setLeadFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="demo-list demo-list--leads">
        {filteredLeads.map((lead) => {
          const tone = getLeadTone(lead.status);

          return (
            <article className="demo-list-item" key={lead.id}>
              <div className={`demo-avatar demo-avatar--${tone}`}>{lead.name[0]}</div>
              <div>
                <strong>{lead.name}</strong>
                <p>{lead.request}</p>
              </div>
              <button
                type="button"
                className={`demo-status demo-status-button demo-status--${tone}`}
                onClick={() => onCycleLeadStatus(lead.id)}
                aria-label={`Mudar status ficticio de ${lead.name}`}
              >
                {lead.status}
              </button>
            </article>
          );
        })}
      </div>

      {filteredLeads.length === 0 && (
        <p className="demo-empty-state">Nenhum lead ficticio nesse filtro.</p>
      )}
    </div>
  );
}

function DashboardPanel({ products, leads, onNavigate }) {
  const activeProducts = products.filter((product) => product.active).length;
  const soldLeads = leads.filter((lead) => lead.status === 'Vendido').length;
  const pendingLeads = leads.filter((lead) => lead.status !== 'Vendido').length;
  const conversion = leads.length > 0 ? Math.round((soldLeads / leads.length) * 100) : 0;

  const metrics = [
    { label: 'Pneus ativos', value: String(activeProducts) },
    { label: 'Leads ficticios', value: String(leads.length) },
    { label: 'Em atendimento', value: String(pendingLeads) },
    { label: 'Conversao simulada', value: `${conversion}%` },
  ];

  return (
    <div className="demo-screen">
      <div className="demo-panel-header">
        <div>
          <span>Visao geral ficticia</span>
          <h4>Painel do Lojista</h4>
        </div>
        <Gauge className="demo-panel-icon" size={23} />
      </div>

      <div className="demo-metric-grid">
        {metrics.map((metric) => (
          <article className="demo-metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      <div className="demo-actions-box">
        <span>Acoes rapidas demonstrativas</span>
        <div>
          <button type="button" onClick={() => onNavigate('catalogo')}>Ver catálogo</button>
          <button type="button" onClick={() => onNavigate('leads')}>Ver leads</button>
          <button type="button" onClick={() => onNavigate('vitrine')}>Ver vitrine</button>
        </div>
      </div>
    </div>
  );
}

function DemoPanel({ activeTab, products, leads, onInterest, onToggleProduct, onCycleLeadStatus, onNavigate }) {
  if (activeTab === 'vitrine') return <VitrinePanel products={products} onInterest={onInterest} />;
  if (activeTab === 'catalogo') return <CatalogoPanel products={products} onToggleProduct={onToggleProduct} />;
  if (activeTab === 'leads') return <LeadsPanel leads={leads} onCycleLeadStatus={onCycleLeadStatus} />;
  return <DashboardPanel products={products} leads={leads} onNavigate={onNavigate} />;
}

export default function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState('vitrine');
  const [products, setProducts] = useState(initialProducts);
  const [leads, setLeads] = useState(initialLeads);

  const active = demoTabs.find((tab) => tab.id === activeTab) ?? demoTabs[0];
  const ActiveIcon = active.icon;

  const handleInterest = (product) => {
    setLeads((currentLeads) => {
      const demoLead = {
        id: 'cliente-demo',
        name: 'Cliente demo',
        request: `Interesse em ${product.size}`,
        status: 'Pendente',
      };

      if (currentLeads.some((lead) => lead.id === demoLead.id)) {
        return currentLeads.map((lead) => (lead.id === demoLead.id ? demoLead : lead));
      }

      return [demoLead, ...currentLeads].slice(0, 4);
    });
    setActiveTab('leads');
  };

  const handleToggleProduct = (productId) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, active: !product.active } : product
      )
    );
  };

  const handleCycleLeadStatus = (leadId) => {
    setLeads((currentLeads) =>
      currentLeads.map((lead) => {
        if (lead.id !== leadId) return lead;
        const currentIndex = statusCycle.indexOf(lead.status);
        const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
        return { ...lead, status: nextStatus };
      })
    );
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <section id="demo-interativa" className="interactive-demo-section" aria-labelledby="interactive-demo-title">
      <div className="interactive-demo-shell">
        <RevealOnScroll className="interactive-demo-heading" duration={520} distance={16}>
          <span className="interactive-demo-eyebrow">
            <Zap size={13} fill="currentColor" />
            Demonstracao interativa
          </span>
          <h2 id="interactive-demo-title">Teste uma previa da sua vitrine inteligente</h2>
          <p>
            Uma experiencia visual simples para mostrar como o cliente encontra pneus,
            demonstra interesse e chega ate o atendimento.
          </p>
          <small className="interactive-demo-disclaimer">
            Demonstracao interativa — dados ficticios, sem envio e sem alteracao real.
          </small>
        </RevealOnScroll>

        <div className="interactive-demo-grid">
          <RevealOnScroll as="aside" className="interactive-demo-copy" delay={100} duration={560} distance={18}>
            <span className="interactive-demo-kicker">Experimente uma previa sem cadastrar nada</span>
            <div className="interactive-demo-copy-card" key={active.id}>
              <ActiveIcon size={28} />
              <h3>{active.title}</h3>
              <p>{active.description}</p>
              <div className="interactive-demo-benefit">
                <CheckCircle size={18} />
                <strong>{active.benefit}</strong>
              </div>
            </div>

            <div className="interactive-demo-cta">
              <Link to="/register" className="btn btn-primary interactive-demo-primary-cta">
                Criar minha vitrine gratis
                <ArrowRight size={17} />
              </Link>
            </div>
          </RevealOnScroll>

          <RevealOnScroll className="interactive-demo-stage" delay={180} duration={700} distance={28}>
            <div className="interactive-demo-tabbar" role="tablist" aria-label="Previa demonstrativa do PneuFlow">
              {demoTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    type="button"
                    key={tab.id}
                    role="tab"
                    id={`demo-tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`demo-panel-${tab.id}`}
                    className={isActive ? 'is-active' : ''}
                    onClick={() => handleTabChange(tab.id)}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div
              className="interactive-demo-browser"
              role="tabpanel"
              id={`demo-panel-${activeTab}`}
              aria-labelledby={`demo-tab-${activeTab}`}
              key={activeTab}
            >
              <div className="interactive-demo-browser-top">
                <div aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p>pneuflow.app/preview-ficticio</p>
              </div>

              <DemoPanel
                activeTab={activeTab}
                products={products}
                leads={leads}
                onInterest={handleInterest}
                onToggleProduct={handleToggleProduct}
                onCycleLeadStatus={handleCycleLeadStatus}
                onNavigate={handleTabChange}
              />
            </div>

            <p className="interactive-demo-hint">
              <Smartphone size={15} />
              Clique nas abas para testar uma previa ficticia
            </p>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
