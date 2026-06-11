import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Search, 
  Smartphone, 
  TrendingUp, 
  CheckCircle, 
  HelpCircle, 
  ChevronDown, 
  Zap, 
  Clock, 
  Settings 
} from 'lucide-react';
import './LandingPage.css';
import FeedbackCarousel from '../components/FeedbackCarousel';
import BorderGlow from '../components/BorderGlow/BorderGlow';
import ElectricBorder from '../components/ElectricBorder/ElectricBorder';

const CardSwapHero = lazy(() => import('../components/CardSwap/CardSwapHero'));
const TextType = lazy(() => import('../components/TextType/TextType'));

const StaticHeroTitle = () => (
  <>
    Parem de perder clientes no WhatsApp. Crie sua{' '}
    <span className="hero-title-type__highlight">Vitrine Inteligente</span>
    {' '}em 5 minutos.
  </>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState(null);
  const [isMobileHero, setIsMobileHero] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleViewportChange = (event) => {
      setIsMobileHero(event.matches);
    };

    setIsMobileHero(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleViewportChange);

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  const faqs = [
    {
      q: "Preciso de computador para usar o PneuFlow?",
      a: "Não. O painel do lojista é 100% responsivo e você pode gerenciar todo o seu catálogo, ver leads e configurar sua vitrine diretamente do seu celular."
    },
    {
      q: "Como o cliente acessa a minha vitrine?",
      a: "O PneuFlow gera um link exclusivo para a sua loja (ex.: pneuflow.com.br/store/sua-loja). Você pode colocar esse link na bio do Instagram, no botão do WhatsApp, no Google Meu Negócio ou usar em anúncios pagos."
    },
    {
      q: "Como funciona a busca por veículo?",
      a: "Você cadastra quais veículos são compatíveis com cada pneu. Quando o cliente entra na sua vitrine, ele pode escolher marca, modelo, ano e versão do carro, e o PneuFlow mostra automaticamente os pneus corretos. Chega de vender a medida errada."
    },
    {
      q: "Os pedidos caem direto no meu WhatsApp?",
      a: "Sim. O cliente escolhe o pneu, clica em 'Tenho interesse' e é redirecionado para o seu WhatsApp com uma mensagem automática detalhada com marca, medida, preço e veículo."
    },
    {
      q: "O PneuFlow cobra comissão por venda?",
      a: "Não. Você paga apenas uma mensalidade fixa de acordo com o plano escolhido. Todo o lucro das vendas geradas é 100% seu."
    }
  ];

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="landing-page" style={{ backgroundColor: 'var(--bg-dark)', minHeight: '100vh' }}>
      {/* Navigation */}
      <header className="landing-header" style={{
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(11, 12, 16, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
        padding: '16px 0'
      }}>
        <div className="container flex-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              backgroundColor: 'var(--primary)',
              color: '#000',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 800,
              fontFamily: 'var(--font-title)',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Zap size={16} fill="black" /> PneuFlow
            </div>
          </div>
          
          <nav className="landing-nav" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <a href="#problemas" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Problemas</a>
            <a href="#solucao" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Solução</a>
            <a href="#planos" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Planos</a>
            <a href="#faq" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>FAQ</a>
          </nav>

          <div className="landing-header-actions" style={{ display: 'flex', gap: '12px' }}>
            <Link to="/login" className="btn btn-outline landing-header-login" style={{ padding: '8px 16px', fontSize: '14px' }}>Login</Link>
            <Link to="/register" className="btn btn-primary landing-header-register" style={{ padding: '8px 16px', fontSize: '14px' }}>Criar Vitrine</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-padding" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="container hero-grid">
          <div>
            <span style={{ 
              backgroundColor: 'var(--primary-glow)', 
              color: 'var(--primary)', 
              padding: '6px 12px', 
              borderRadius: 'var(--radius-full)', 
              fontSize: '13px', 
              fontWeight: 600,
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '20px'
            }}>
              <Zap size={12} fill="var(--primary)" /> VENDEDOR DIGITAL DE PNEUS
            </span>
            <h1 className="hero-title">
              {isMobileHero ? (
                <StaticHeroTitle />
              ) : (
                <Suspense fallback={<StaticHeroTitle />}>
              <TextType
                as="span"
                text="Parem de perder clientes no WhatsApp. Crie sua Vitrine Inteligente em 5 minutos."
                typingSpeed={42}
                initialDelay={250}
                pauseDuration={1800}
                loop={false}
                showCursor
                cursorCharacter="▎"
                highlightText="Vitrine Inteligente"
                highlightClassName="hero-title-type__highlight"
                className="hero-title-type hero-title-type--full"
                cursorClassName="hero-title-type__cursor"
              />
                </Suspense>
              )}
            </h1>
            <p className="hero-description">
              Guie seu cliente de forma autônoma: ele pesquisa pneus pela medida ou pelo modelo do veículo, tira todas as dúvidas e chega no seu WhatsApp pronto para fechar a compra.
            </p>
            <div className="hero-buttons">
              <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                Criar Minha Vitrine Grátis
              </button>
              <a href="#solucao" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                Ver Como Funciona
              </a>
            </div>
            
            <div className="hero-checks">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Sem cartão de crédito</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Instalação em 5 minutos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Catálogo 100% Autônomo</span>
              </div>
            </div>
          </div>
          
          {!isMobileHero && (
            <div className="hero-mockup">
              <Suspense fallback={<div className="card-swap-fallback" aria-hidden="true" />}>
                <CardSwapHero />
              </Suspense>
            </div>
          )}
        </div>
      </section>

      {/* Problems Section */}
      <section id="problemas" className="section-padding" style={{ borderBottom: '1px solid var(--border)', backgroundColor: '#0d0f15' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 className="title-lg">Por que as lojas de pneus perdem vendas todos os dias?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '650px', margin: '0 auto' }}>
              Atender clientes interessados em pneus pelo WhatsApp sem uma ferramenta adequada gera atritos que reduzem a conversão.
            </p>
          </div>
          
          <div className="problems-grid">
            <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--error-glow)', 
                color: 'var(--error)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '20px', 
                marginRight: 'auto', 
                marginLeft: 'auto' 
              }}>
                <Clock size={24} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px', textAlign: 'center' }}>Demora no Atendimento</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
                O cliente pergunta a medida no WhatsApp. Se você demora 10 minutos para responder, ele já comprou no concorrente que respondeu antes.
              </p>
            </div>
            
            <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--error-glow)', 
                color: 'var(--error)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '20px', 
                marginRight: 'auto', 
                marginLeft: 'auto' 
              }}>
                <HelpCircle size={24} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px', textAlign: 'center' }}>Clientes não sabem a medida</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
                Muitos motoristas não sabem o aro ou largura do pneu. Seus atendentes perdem tempo explicando onde olhar ou pesquisando compatibilidade manualmente.
              </p>
            </div>
            
            <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--error-glow)', 
                color: 'var(--error)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '20px', 
                marginRight: 'auto', 
                marginLeft: 'auto' 
              }}>
                <Settings size={24} />
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '12px', textAlign: 'center' }}>Catálogo desorganizado</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
                Ficar enviando fotos soltas de pneus ou listas confusas em PDF dificulta a escolha do cliente e parece pouco profissional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solucao" className="section-padding" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 className="title-lg">Apresentamos o PneuFlow: Seu Vendedor Digital de Pneus</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '650px', margin: '0 auto' }}>
              Uma plataforma simples para organizar seu estoque, criar um link público elegante e automatizar a pesquisa do cliente.
            </p>
          </div>

          <div className="solution-grid">
            {/* Features list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ 
                  backgroundColor: 'var(--primary-glow)', 
                  color: 'var(--primary)', 
                  padding: '10px', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  flexShrink: 0
                }}>
                  <Search size={20} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Busca inteligente por veículo</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    O cliente seleciona o carro e o sistema exibe os pneus certos. Sem margem para erros de medida e sem perda de tempo do seu atendente.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ 
                  backgroundColor: 'var(--primary-glow)', 
                  color: 'var(--primary)', 
                  padding: '10px', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  flexShrink: 0
                }}>
                  <MessageSquare size={20} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Contato Direto via WhatsApp</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Ao demonstrar interesse por um pneu, o cliente envia uma mensagem já pronta para o seu WhatsApp com produto, medida e veículo. Só falta você fechar.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ 
                  backgroundColor: 'var(--primary-glow)', 
                  color: 'var(--primary)', 
                  padding: '10px', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  flexShrink: 0
                }}>
                  <TrendingUp size={20} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Dashboard do Lojista Simplificado</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    Acompanhe quais pneus são mais pesquisados, número de visitas e histórico de leads. Tenha total controle do seu negócio.
                  </p>
                </div>
              </div>
            </div>

            {/* Illustration */}
            <div className="card" style={{ padding: '32px', backgroundColor: '#13151c', textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', marginBottom: '24px' }}>
                <Smartphone size={48} />
              </div>
              <h3 style={{ fontSize: '22px', marginBottom: '12px' }}>Disponível onde seu cliente está</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                A vitrine foi desenvolvida com foco total em smartphones. O carregamento é instantâneo e a navegação é limpa para maximizar as vendas.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-warning">Aro</span>
                <span className="badge badge-warning">Medida</span>
                <span className="badge badge-warning">Marca</span>
                <span className="badge badge-warning">Veículo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Planos */}
      <section id="planos" className="section-padding" style={{ borderBottom: '1px solid var(--border)', backgroundColor: '#0d0f15' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 className="title-lg">Planos Simples e Transparentes</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '650px', margin: '0 auto' }}>
              Escolha o plano ideal para o tamanho da sua loja. Comece hoje mesmo a vender mais.
            </p>
          </div>

          <div className="pricing-grid">
            {/* Plan 1 - Free Teste */}
            <BorderGlow
              className="pricing-border-glow"
              edgeSensitivity={28}
              glowColor="156 78 68"
              backgroundColor="#11141b"
              borderRadius={16}
              glowRadius={34}
              glowIntensity={0.8}
              coneSpread={24}
              colors={['#22c55e', '#38bdf8', '#f59e0b']}
              fillOpacity={0.22}
            >
            <div className="pricing-card-content">
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Free Teste</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>Ideal para conhecer a plataforma e testar as funcionalidades básicas.</p>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)' }}>R$ 0</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>/grátis</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'left', flexGrow: 1 }}>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Teste gratuito da plataforma</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Cadastro limitado de pneus</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Página pública simples da loja</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Botão para WhatsApp</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Visualização básica do catálogo</span></li>
              </ul>
              <button onClick={() => navigate('/register')} className="btn btn-outline" style={{ width: '100%' }}>Começar agora</button>
            </div>
            </BorderGlow>
            {/* Plan 2 - Start */}
            <BorderGlow
              className="pricing-border-glow"
              edgeSensitivity={28}
              glowColor="198 82 70"
              backgroundColor="#11141b"
              borderRadius={16}
              glowRadius={34}
              glowIntensity={0.8}
              coneSpread={24}
              colors={['#38bdf8', '#22c55e', '#f59e0b']}
              fillOpacity={0.22}
            >
            <div className="pricing-card-content">
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Start</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>Ideal para lojas pequenas que querem um catálogo digital organizado.</p>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)' }}>R$ 30</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>/mês</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'left', flexGrow: 1 }}>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Cadastro de pneus, marcas e medidas</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Página pública da loja completa</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Botão direto para WhatsApp</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Filtros básicos no catálogo</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Personalização (nome, logo e telefone)</span></li>
              </ul>
              <button onClick={() => navigate('/register')} className="btn btn-outline" style={{ width: '100%' }}>Começar agora</button>
            </div>
            </BorderGlow>
            {/* Plan 3 - Pro (Recommended) */}
            <ElectricBorder
              className="pricing-electric-border"
              color="#EAB308"
              speed={0.4}
              chaos={0.12}
              thickness={2}
              borderRadius={16}
              style={{ borderRadius: 16 }}
            >
            <div className="pricing-card-content pricing-card-content--featured">
              <span style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--primary)',
                color: '#000',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>RECOMENDADO</span>
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Pro</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>Vitrine completa com busca por veículo e recursos avançados.</p>
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary)' }}>R$ 70</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>/mês</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'left', flexGrow: 1 }}>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Tudo do plano Start</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>Busca inteligente por veículo</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Dashboard com métricas e leads</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Controle de cliques no WhatsApp</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Destaque para produtos</span></li>
                <li style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} /><span>Maior personalização da vitrine</span></li>
              </ul>
              <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ width: '100%' }}>Experimentar grátis</button>
            </div>
            </ElectricBorder>
          </div>
        </div>
      </section>

      {/* Feedback Carousel Section */}
      <FeedbackCarousel />

      {/* FAQ Section */}
      <section id="faq" className="section-padding" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 className="title-lg">Perguntas Frequentes</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
              Tudo o que você precisa saber sobre o PneuFlow.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="card" 
                style={{ padding: '20px', cursor: 'pointer', borderColor: activeFaq === index ? 'var(--primary)' : 'var(--border)' }}
                onClick={() => toggleFaq(index)}
              >
                <div className="flex-between" style={{ width: '100%' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, textAlign: 'left' }}>{faq.q}</h3>
                  <ChevronDown 
                    size={20} 
                    style={{ 
                      transform: activeFaq === index ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform var(--transition-normal)',
                      color: 'var(--text-secondary)'
                    }} 
                  />
                </div>
                {activeFaq === index && (
                  <p style={{ 
                    marginTop: '16px', 
                    color: 'var(--text-secondary)', 
                    fontSize: '14px', 
                    textAlign: 'left',
                    lineHeight: '1.5',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '16px',
                    animation: 'fadeIn var(--transition-fast) forwards'
                  }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="section-padding" style={{ background: 'linear-gradient(180deg, var(--bg-dark) 0%, #13151c 100%)', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 36px)', marginBottom: '20px' }}>Pronto para decolar as vendas da sua loja?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(16px, 2vw, 18px)', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
            Crie sua vitrine em menos de 5 minutos e comece com o nosso Plano Free para conhecer todas as funcionalidades.
          </p>
          <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
            Começar agora grátis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer" style={{ backgroundColor: '#07080b', borderTop: '1px solid var(--border)', padding: '40px 0', color: 'var(--text-muted)' }}>
        <div className="container flex-between" style={{ gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'var(--font-title)', marginBottom: '8px' }}>
              <Zap size={16} fill="var(--primary)" style={{ color: 'var(--primary)' }} /> PneuFlow
            </div>
            <p style={{ fontSize: '12px' }}>© 2026 PneuFlow SaaS. Todos os direitos reservados.</p>
          </div>
          <div className="landing-footer-links" style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)' }}>Painel do Lojista</Link>
            <a href="#solucao" style={{ color: 'var(--text-secondary)' }}>Como Funciona</a>
            <a href="#planos" style={{ color: 'var(--text-secondary)' }}>Preços</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
