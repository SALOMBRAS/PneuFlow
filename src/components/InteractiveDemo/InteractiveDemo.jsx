import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Gauge,
  MessageSquare,
  PackageSearch,
  Plus,
  Search,
  Smartphone,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import './InteractiveDemo.css';

const demoTabs = [
  {
    id: 'vitrine',
    label: 'Vitrine',
    icon: Store,
    title: 'Seu cliente encontra o pneu certo sozinho',
    description:
      'A vitrine organiza seus pneus e permite que o cliente pesquise por medida, aro ou veículo antes de chamar no WhatsApp.',
    benefit: 'Menos perguntas repetidas. Mais clientes prontos para comprar.',
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    icon: PackageSearch,
    title: 'Catálogo profissional e sempre organizado',
    description:
      'Cadastre marca, modelo, medida, preço e estoque em uma apresentação mais clara e profissional.',
    benefit: 'Sua loja deixa de depender de fotos soltas e listas confusas.',
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: Users,
    title: 'Organize interessados e pedidos em um só lugar',
    description:
      'Acompanhe quem chamou, qual pneu procurou e em que etapa está o atendimento.',
    benefit: 'Mais controle sobre seus contatos e oportunidades de venda.',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    title: 'Controle sua loja digital em um só painel',
    description:
      'Veja catálogo, leads, vitrine e dados principais em uma interface simples feita para lojas de pneus.',
    benefit: 'Menos bagunça. Mais velocidade no atendimento.',
  },
];

const demoTires = [
  {
    id: 'michelin-energy-xm2',
    brand: 'Michelin',
    model: 'Energy XM2',
    size: '175/65 R14',
    rim: '14',
    condition: 'Novo',
    price: 'R$ 329,90',
    stock: '8 em estoque',
  },
  {
    id: 'pirelli-cinturato-p1',
    brand: 'Pirelli',
    model: 'Cinturato P1',
    size: '185/60 R15',
    rim: '15',
    condition: 'Novo',
    price: 'R$ 389,90',
    stock: '5 em estoque',
  },
  {
    id: 'goodyear-efficientgrip',
    brand: 'Goodyear',
    model: 'EfficientGrip',
    size: '205/55 R16',
    rim: '16',
    condition: 'Novo',
    price: 'R$ 489,90',
    stock: '3 em estoque',
  },
  {
    id: 'firestone-f600-usado',
    brand: 'Firestone',
    model: 'F-600',
    size: '175/70 R14',
    rim: '14',
    condition: 'Usado',
    price: 'R$ 189,90',
    stock: '2 em estoque',
  },
];

const catalogItems = [
  { name: 'Michelin 195/55 R16', price: 'R$ 329,90', stock: '8 em estoque' },
  { name: 'Pirelli 175/65 R14', price: 'R$ 249,90', stock: '12 em estoque' },
  { name: 'Goodyear 205/55 R16', price: 'R$ 359,90', stock: '5 em estoque' },
];

const leads = [
  { name: 'João', request: 'Procura 175/65 R14', status: 'Pendente', tone: 'warning' },
  { name: 'Mariana', request: 'Interessada em Michelin R16', status: 'Em atendimento', tone: 'info' },
  { name: 'Carlos', request: 'Pedido concluído', status: 'Vendido', tone: 'success' },
];

const metrics = [
  { label: 'Pneus cadastrados', value: '42' },
  { label: 'Leads no WhatsApp', value: '18' },
  { label: 'Visualizações', value: '1.248' },
  { label: 'Conversão', value: '12%' },
];

const rimFilters = [
  { id: 'all', label: 'Todos' },
  { id: '14', label: 'Aro 14' },
  { id: '15', label: 'Aro 15' },
  { id: '16', label: 'Aro 16' },
];

const conditionFilters = ['Todos', 'Novo', 'Usado'];

function VitrinePanel({ onInterest }) {
  const [activeRim, setActiveRim] = useState('all');
  const [activeCondition, setActiveCondition] = useState('Todos');

  const filteredTires = demoTires.filter((tire) => {
    const matchesRim = activeRim === 'all' || tire.rim === activeRim;
    const matchesCondition = activeCondition === 'Todos' || tire.condition === activeCondition;
    return matchesRim && matchesCondition;
  });

  return (
    <div className="demo-screen demo-screen--store">
      <div className="demo-store-header">
        <div>
          <span className="demo-status-dot" />
          <span className="demo-store-status">Aberto agora</span>
          <h4>Pneus Express</h4>
        </div>
        <span className="demo-whatsapp-pill">
          <MessageSquare size={14} />
          WhatsApp
        </span>
      </div>

      <div className="demo-search">
        <Search size={16} />
        <span>Digite medida, aro ou veículo</span>
      </div>

      <div className="demo-chip-row" aria-label="Filtros por aro">
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

      <div className="demo-condition-row" aria-label="Filtros por condição">
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
        {filteredTires.map((product) => (
          <article className="demo-product-card" key={product.id}>
            <div className="demo-product-thumb">
              <span />
            </div>
            <div>
              <strong>{product.size}</strong>
              <p>{product.brand} {product.model}</p>
              <small>{product.condition} · {product.stock}</small>
            </div>
            <div className="demo-product-footer">
              <span>{product.price}</span>
              <button
                type="button"
                onClick={() => onInterest(product)}
                aria-label={`Simular contato pelo WhatsApp sobre ${product.brand} ${product.model} ${product.size}`}
              >
                <MessageSquare size={13} />
                WhatsApp
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CatalogoPanel() {
  return (
    <div className="demo-screen">
      <div className="demo-panel-header">
        <div>
          <span>Gestão da loja</span>
          <h4>Catálogo de Pneus</h4>
        </div>
        <button type="button" className="demo-mini-action">
          <Plus size={14} />
          Novo pneu
        </button>
      </div>

      <div className="demo-filter-row">
        <span className="is-active">Todos</span>
        <span>Novos</span>
        <span>Usados</span>
      </div>

      <div className="demo-list">
        {catalogItems.map((item) => (
          <article className="demo-list-item" key={item.name}>
            <div className="demo-list-icon">
              <PackageSearch size={17} />
            </div>
            <div>
              <strong>{item.name}</strong>
              <p>{item.price} · {item.stock}</p>
            </div>
            <span className="demo-status demo-status--success">Ativo</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function LeadsPanel() {
  return (
    <div className="demo-screen">
      <div className="demo-panel-header">
        <div>
          <span>Atendimento</span>
          <h4>Leads no WhatsApp</h4>
        </div>
        <MessageSquare className="demo-panel-icon" size={22} />
      </div>

      <div className="demo-filter-row">
        <span className="is-active">Todos</span>
        <span>Pendentes</span>
        <span>Vendidos</span>
      </div>

      <div className="demo-list demo-list--leads">
        {leads.map((lead) => (
          <article className="demo-list-item" key={lead.name}>
            <div className={`demo-avatar demo-avatar--${lead.tone}`}>{lead.name[0]}</div>
            <div>
              <strong>{lead.name}</strong>
              <p>{lead.request}</p>
            </div>
            <span className={`demo-status demo-status--${lead.tone}`}>{lead.status}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function DashboardPanel() {
  return (
    <div className="demo-screen">
      <div className="demo-panel-header">
        <div>
          <span>Visão geral</span>
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
        <span>Ações rápidas</span>
        <div>
          <button type="button">Cadastrar pneu</button>
          <button type="button">Ver leads</button>
          <button type="button">Personalizar vitrine</button>
        </div>
      </div>
    </div>
  );
}

function DemoPanel({ activeTab, onInterest }) {
  if (activeTab === 'vitrine') return <VitrinePanel onInterest={onInterest} />;
  if (activeTab === 'catalogo') return <CatalogoPanel />;
  if (activeTab === 'leads') return <LeadsPanel />;
  return <DashboardPanel />;
}

export default function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState('vitrine');
  const [showToast, setShowToast] = useState(false);
  const active = demoTabs.find((tab) => tab.id === activeTab) ?? demoTabs[0];
  const ActiveIcon = active.icon;

  useEffect(() => {
    if (!showToast) return undefined;

    const timer = window.setTimeout(() => {
      setShowToast(false);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [showToast]);

  const handleInterest = () => {
    setShowToast(true);
  };

  return (
    <section id="demo-interativa" className="interactive-demo-section" aria-labelledby="interactive-demo-title">
      <div className="interactive-demo-shell">
        <div className="interactive-demo-heading">
          <span className="interactive-demo-eyebrow">
            <Zap size={13} fill="currentColor" />
            Demonstração interativa
          </span>
          <h2 id="interactive-demo-title">Teste uma prévia da sua vitrine inteligente</h2>
          <p>
            Uma experiência visual simples para mostrar como o cliente encontra pneus,
            demonstra interesse e chega até o WhatsApp.
          </p>
        </div>

        <div className="interactive-demo-grid">
          <aside className="interactive-demo-copy">
            <span className="interactive-demo-kicker">Experimente uma prévia sem cadastrar nada</span>
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
                Criar minha vitrine grátis
                <ArrowRight size={17} />
              </Link>
              <a href="#demo-interativa" className="btn btn-secondary interactive-demo-secondary-cta">
                Ver demonstração
              </a>
            </div>
          </aside>

          <div className="interactive-demo-stage">
            <div className="interactive-demo-tabbar" role="tablist" aria-label="Prévia do PneuFlow">
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
                    onClick={() => setActiveTab(tab.id)}
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
                <p>pneuflow.app/preview</p>
              </div>

              <DemoPanel activeTab={activeTab} onInterest={handleInterest} />

              {showToast && (
                <div className="interactive-demo-toast" role="status">
                  <MessageSquare size={16} />
                  Interesse enviado para o lojista
                </div>
              )}
            </div>

            <p className="interactive-demo-hint">
              <Smartphone size={15} />
              Clique nas abas para testar
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
