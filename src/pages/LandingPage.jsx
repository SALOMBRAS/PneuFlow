import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  ChevronDown, 
  Zap, 
  Settings,
  Store,
  MessageCircle,
  BarChart3,
  Users,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import './LandingPage.css';
import RevealOnScroll from '../components/RevealOnScroll';
import FeedbackCarousel from '../components/FeedbackCarousel';
import InteractiveDemo from '../components/InteractiveDemo/InteractiveDemo';

const CardSwapHero = lazy(() => import('../components/CardSwap/CardSwapHero'));

const pricingLaunchConfig = {
  urgencyEnabled: true,
  onboardingSlots: null,
  offerEndDate: null,
  launchOfferLabel: 'Condição de lançamento',
};

const heroPhrases = [
  {
    text: 'Venda mais pneus com uma vitrine online integrada ao WhatsApp.',
    highlights: ['Venda mais pneus', 'WhatsApp'],
  },
  {
    text: 'Organize seus pneus em minutos. Venda mais pelo WhatsApp.',
    highlights: ['Venda mais', 'WhatsApp'],
  },
  {
    text: 'Mostre seu catálogo online. Receba clientes prontos para comprar.',
    highlights: ['catálogo online', 'clientes prontos'],
  },
];

const HERO_MOBILE_PHRASE_KEY = 'pneuflowHeroPhraseIndex';

const benefitCards = [
  {
    icon: <Store size={22} />,
    title: 'Vitrine online em minutos',
    text: 'Publique um link profissional para seus pneus sem depender de PDF, lista solta ou resposta manual.'
  },
  {
    icon: <Settings size={22} />,
    title: 'Catálogo organizado',
    text: 'Medida, marca, modelo, estoque e preço ficam claros para o cliente comparar antes de chamar.'
  },
  {
    icon: <MessageCircle size={22} />,
    title: 'Leads direto no WhatsApp',
    text: 'O comprador chega com produto e intenção de compra, reduzindo conversa repetida no atendimento.'
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Dashboard comercial',
    text: 'Acompanhe leads, visualizações, conversão e pneus mais procurados no painel da loja.'
  },
  {
    icon: <Users size={22} />,
    title: 'Vendedores e referral',
    text: 'Crie links por vendedor, acompanhe oportunidades e direcione o WhatsApp correto.'
  },
  {
    icon: <ShieldCheck size={22} />,
    title: 'Trial com controle',
    text: 'Após o teste, o painel é bloqueado com clareza e a vitrine mantém uma experiência segura.'
  }
];

const howItWorks = [
  {
    step: '01',
    title: 'Cadastre sua loja',
    text: 'Crie a conta, configure WhatsApp, cidade, identidade e link público da vitrine.'
  },
  {
    step: '02',
    title: 'Publique seus pneus',
    text: 'Adicione medidas, marcas, preços, estoque e fotos para montar um catálogo profissional.'
  },
  {
    step: '03',
    title: 'Receba compradores',
    text: 'O cliente pesquisa, escolhe o pneu e chama no WhatsApp com a mensagem pronta.'
  }
];

const getPrefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const getNextMobilePhraseIndex = () => {
  if (typeof window === 'undefined') return 0;

  try {
    const lastIndex = Number(window.localStorage.getItem(HERO_MOBILE_PHRASE_KEY));
    const nextIndex = Number.isInteger(lastIndex)
      ? (lastIndex + 1) % heroPhrases.length
      : Math.floor(Math.random() * heroPhrases.length);

    window.localStorage.setItem(HERO_MOBILE_PHRASE_KEY, String(nextIndex));
    return nextIndex;
  } catch {
    return Math.floor(Math.random() * heroPhrases.length);
  }
};

const getHighlightRanges = (phrase) => {
  const ranges = phrase.highlights
    .map((term) => {
      const start = phrase.text.indexOf(term);
      return start >= 0 ? { start, end: start + term.length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  return ranges;
};

const renderHeroText = (phrase, visibleText) => {
  const ranges = getHighlightRanges(phrase);
  const visibleLength = visibleText.length;
  const parts = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (range.start >= visibleLength) return;

    const highlightStart = Math.max(range.start, 0);
    const highlightEnd = Math.min(range.end, visibleLength);

    if (cursor < highlightStart) {
      parts.push(visibleText.slice(cursor, highlightStart));
    }

    if (highlightEnd > highlightStart) {
      parts.push(
        <span key={`highlight-${index}`} className="hero-title-type__highlight">
          {visibleText.slice(highlightStart, highlightEnd)}
        </span>
      );
    }

    cursor = Math.max(cursor, highlightEnd);
  });

  if (cursor < visibleLength) {
    parts.push(visibleText.slice(cursor));
  }

  return parts;
};

const HeroTypewriter = ({ isMobile }) => {
  const [staticPhraseIndex, setStaticPhraseIndex] = useState(() => (
    isMobile ? getNextMobilePhraseIndex() : 0
  ));
  const staticPhraseReadyRef = useRef(isMobile);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getPrefersReducedMotion);
  const isStaticHero = isMobile || prefersReducedMotion;
  const [phraseIndex, setPhraseIndex] = useState(() => (isStaticHero ? staticPhraseIndex : 0));
  const [displayedText, setDisplayedText] = useState(() => (
    isStaticHero ? heroPhrases[staticPhraseIndex].text : ''
  ));
  const [phase, setPhase] = useState('typing');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreference = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleMotionPreference);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (isMobile) {
      const nextIndex = staticPhraseReadyRef.current
        ? staticPhraseIndex
        : getNextMobilePhraseIndex();

      staticPhraseReadyRef.current = true;
      setStaticPhraseIndex(nextIndex);
      setPhraseIndex(nextIndex);
      setDisplayedText(heroPhrases[nextIndex].text);
      setPhase('typing');
      return undefined;
    }

    if (prefersReducedMotion) {
      setStaticPhraseIndex(0);
      setPhraseIndex(0);
      setDisplayedText(heroPhrases[0].text);
      setPhase('typing');
      return undefined;
    }

    setPhraseIndex(0);
    setDisplayedText('');
    setPhase('typing');
    staticPhraseReadyRef.current = false;
    return undefined;
  }, [isMobile, prefersReducedMotion, staticPhraseIndex]);

  useEffect(() => {
    if (isStaticHero) return undefined;

    const phrase = heroPhrases[phraseIndex].text;
    let timeout;

    if (phase === 'typing') {
      if (displayedText.length < phrase.length) {
        timeout = window.setTimeout(() => {
          setDisplayedText(phrase.slice(0, displayedText.length + 1));
        }, 55);
      } else {
        timeout = window.setTimeout(() => setPhase('deleting'), 1650);
      }
    }

    if (phase === 'deleting') {
      if (displayedText.length > 0) {
        timeout = window.setTimeout(() => {
          setDisplayedText((current) => current.slice(0, -1));
        }, 32);
      } else {
        timeout = window.setTimeout(() => {
          setPhraseIndex((current) => (current + 1) % heroPhrases.length);
          setPhase('typing');
        }, 320);
      }
    }

    return () => window.clearTimeout(timeout);
  }, [displayedText, phase, phraseIndex, isStaticHero]);

  const renderedPhraseIndex = isMobile ? staticPhraseIndex : phraseIndex;
  const phrase = heroPhrases[renderedPhraseIndex];

  return (
    <span className="hero-title-type hero-title-type--full" aria-live={isStaticHero ? undefined : 'off'}>
      <span className="hero-title-type__text">
        {renderHeroText(phrase, displayedText)}
      </span>
      {!isStaticHero && (
        <span className="hero-title-type__cursor" aria-hidden="true">▎</span>
      )}
    </span>
  );
};

const PRICING_CONFIG = {
  urgencyEnabled: true,
  onboardingSlots: null,
  offerEndDate: '',
  launchOfferLabel: 'Oferta de lançamento para novas lojas.',
  trialDays: 7,
};

const PRICING_PLAN = {
  name: 'Plano PRO',
  badge: 'Mais escolhido',
  price: '39,00',
  description: 'Uma assinatura simples para manter vitrine, dashboard, leads e vendedores em um so lugar.',
  ctaLabel: `Comecar meus ${PRICING_CONFIG.trialDays} dias gratis`,
  waitlistCtaLabel: 'Entrar na lista de espera',
  trialLabel: `Teste gratis por ${PRICING_CONFIG.trialDays} dias. Cancele quando quiser.`,
  reassurance: 'Sem compromisso durante o periodo de teste.',
  urgencyTitle: 'Condicao de lancamento',
  urgencyFallback: 'Onboarding prioritario disponivel por tempo limitado.',
  benefits: [
    'Vitrine publica com catalogo de pneus',
    'Leads com destino para WhatsApp',
    'Dashboard comercial e ranking',
    'Controle de vendedores e links referral',
  ],
};

const formatOfferDeadline = (value) => {
  if (!value) return null;

  const parsedDate = new Date(`${value}T23:59:59`);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() < Date.now()) {
    return null;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(parsedDate);
};

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
      q: "Preciso escolher um plano agora?",
      a: "Não. Você pode criar sua vitrine, conhecer o fluxo da plataforma e escolher o plano ideal dentro do painel depois. Todo o lucro das vendas geradas é 100% seu."
    }
  ];

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const offerDeadline = formatOfferDeadline(PRICING_CONFIG.offerEndDate);
  const hasRealSlots = Number.isInteger(PRICING_CONFIG.onboardingSlots) && PRICING_CONFIG.onboardingSlots > 0;
  const isWaitlistOpen = PRICING_CONFIG.onboardingSlots === 0;
  const showOfferBar = PRICING_CONFIG.urgencyEnabled && (PRICING_CONFIG.launchOfferLabel || hasRealSlots || offerDeadline);
  const urgencyCopy = hasRealSlots
    ? `Restam ${PRICING_CONFIG.onboardingSlots} vagas para onboarding prioritario neste ciclo.`
    : PRICING_PLAN.urgencyFallback;
  const slotIndicatorLabel = hasRealSlots
    ? `${PRICING_CONFIG.onboardingSlots} vagas disponiveis para onboarding`
    : 'Entre na lista de espera';
  const offerBarSuffix = offerDeadline ? ` Ate ${offerDeadline}.` : '';
  const primaryCtaLabel = isWaitlistOpen ? PRICING_PLAN.waitlistCtaLabel : PRICING_PLAN.ctaLabel;

  return (
    <div className="landing-page landing-page--snap" style={{ backgroundColor: 'var(--bg-dark)', minHeight: '100vh' }}>
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
            <a href="#beneficios" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Benefícios</a>
            <a href="#como-funciona" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Como funciona</a>
            <a href="#preco" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Preço</a>
            <a href="#faq" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>FAQ</a>
          </nav>

          <div className="landing-header-actions" style={{ display: 'flex', gap: '12px' }}>
            <Link to="/login" className="btn btn-outline landing-header-login" style={{ padding: '8px 16px', fontSize: '14px' }}>Login</Link>
            <Link to="/register" className="btn btn-primary landing-header-register" style={{ padding: '8px 16px', fontSize: '14px' }}>Criar minha vitrine grátis</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-padding landing-hero-section landing-snap-section">
        <div className="container hero-grid">
          <RevealOnScroll className="landing-hero-copy" duration={520} distance={16}>
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
              <HeroTypewriter isMobile={isMobileHero} />
            </h1>
            <p className="hero-description">
              Transforme seu estoque em um catálogo bonito, pesquisável e pronto para gerar leads qualificados no WhatsApp da sua loja.
            </p>
            <div className="hero-buttons">
              <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                Começar teste grátis
              </button>
              <a href="#demo-interativa" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                Ver exemplo de vitrine
              </a>
            </div>
            
            <div className="hero-checks">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Sem cartão de crédito</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Vitrine pronta em 5 minutos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Catálogo 100% Autônomo</span>
              </div>
            </div>
          </RevealOnScroll>
          
          {!isMobileHero && (
            <RevealOnScroll className="hero-mockup" direction="right" delay={120} duration={640} distance={20}>
              <Suspense fallback={<div className="card-swap-fallback" aria-hidden="true" />}>
                <CardSwapHero />
              </Suspense>
            </RevealOnScroll>
          )}
        </div>
      </section>

      <RevealOnScroll duration={620} distance={20}>
        <InteractiveDemo />
      </RevealOnScroll>

      <section id="beneficios" className="section-padding landing-benefits-section landing-snap-section">
        <div className="container">
          <RevealOnScroll className="pf-section-header landing-centered-header" delay={40} duration={560} distance={18}>
            <div>
              <span className="pf-kicker">Produto para vender mais</span>
              <h2 className="title-lg">Uma vitrine que trabalha antes do cliente chamar.</h2>
              <p>
                O PneuFlow organiza o que hoje fica espalhado entre fotos, listas e mensagens soltas, deixando a compra mais clara para o motorista.
              </p>
            </div>
          </RevealOnScroll>

          <div className="landing-benefits-grid">
            {benefitCards.map((benefit, index) => (
              <RevealOnScroll
                key={benefit.title}
                as="article"
                className="pf-card pf-card-hover landing-benefit-card"
                delay={index * 90}
                duration={600}
                distance={24}
              >
                <div className="landing-benefit-icon">{benefit.icon}</div>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="section-padding landing-how-section landing-snap-section">
        <div className="container">
          <RevealOnScroll className="landing-how-card pf-card-premium" delay={60} duration={620} distance={24}>
            <div className="landing-how-copy">
              <span className="pf-kicker">Como funciona</span>
              <h2 className="title-lg">Do cadastro ao WhatsApp em três passos.</h2>
              <p>
                A experiência foi pensada para o lojista configurar rápido e para o comprador chegar com menos dúvida no atendimento.
              </p>
            </div>

            <div className="landing-how-steps">
              {howItWorks.map((item, index) => (
                <RevealOnScroll
                  key={item.step}
                  as="article"
                  className="landing-how-step"
                  delay={index * 100}
                  duration={560}
                  distance={20}
                >
                  <span>{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </RevealOnScroll>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section id="preco" className="section-padding landing-pricing-section landing-snap-section">
        <div className="container">
          <div className="landing-pricing-stack">
            {showOfferBar && (
              <div className="landing-pricing-offerbar" role="status">
                <div>
                  <strong>{PRICING_CONFIG.launchOfferLabel}</strong>
                  <span> Comece agora e tenha acesso ao onboarding prioritario.{offerBarSuffix}</span>
                </div>
                {(hasRealSlots || isWaitlistOpen) && (
                  <span className={`landing-pricing-slotpill${isWaitlistOpen ? ' landing-pricing-slotpill--waitlist' : ''}`}>
                    {slotIndicatorLabel}
                  </span>
                )}
              </div>
            )}

            <div className="landing-pricing-card landing-pricing-card--featured pf-card-premium">
              <div className="landing-pricing-main">
                <div className="landing-pricing-heading">
                  <span className="pf-kicker">{PRICING_PLAN.name}</span>
                  <span className="landing-pricing-badge">{PRICING_PLAN.badge}</span>
                </div>
                <h2 className="landing-pricing-price" aria-label="R$ 39,00 por mes">
                  <span className="landing-pricing-price__currency">R$</span>
                  <span className="landing-pricing-price__amount">{PRICING_PLAN.price}</span>
                  <span className="landing-pricing-price__period">/mês</span>
                </h2>
                <p>{PRICING_PLAN.description}</p>
                <p className="landing-pricing-trial">{PRICING_PLAN.trialLabel}</p>
              </div>

              <ul className="landing-pricing-list">
                {PRICING_PLAN.benefits.map((benefit) => (
                  <li key={benefit}>
                    <CheckCircle size={16} />
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="landing-pricing-side">
                {PRICING_CONFIG.urgencyEnabled && (
                  <div className="landing-pricing-urgency">
                    <span className="landing-pricing-urgency__label">{PRICING_PLAN.urgencyTitle}</span>
                    <p>{urgencyCopy}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="btn btn-primary landing-pricing-cta landing-pricing-cta--featured"
                >
                  <CreditCard size={18} />
                  {primaryCtaLabel}
                </button>
                <span className="landing-pricing-reassurance">{PRICING_PLAN.reassurance}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Carousel Section */}
      <RevealOnScroll duration={560} distance={18}>
        <FeedbackCarousel />
      </RevealOnScroll>

      {/* FAQ Section */}
      <section id="faq" className="section-padding landing-faq-section landing-snap-section">
        <div className="container" style={{ maxWidth: '800px' }}>
          <RevealOnScroll style={{ textAlign: 'center', marginBottom: '56px' }} duration={520} distance={16}>
            <h2 className="title-lg">Perguntas Frequentes</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
              Tudo o que você precisa saber sobre o PneuFlow.
            </p>
          </RevealOnScroll>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq, index) => (
              <RevealOnScroll
                key={index} 
                as="article"
                className="card" 
                style={{ padding: '20px', borderColor: activeFaq === index ? 'var(--primary)' : 'var(--border)' }}
                delay={index * 90}
                duration={560}
                distance={18}
              >
                <button
                  type="button"
                  className="landing-faq-trigger flex-between"
                  aria-expanded={activeFaq === index}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => toggleFaq(index)}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: 600, textAlign: 'left' }}>{faq.q}</h3>
                  <ChevronDown 
                    size={20} 
                    style={{ 
                      transform: activeFaq === index ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform var(--transition-normal)',
                      color: 'var(--text-secondary)'
                    }} 
                  />
                </button>
                {activeFaq === index && (
                  <p id={`faq-answer-${index}`} style={{
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
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="section-padding landing-final-cta-section landing-snap-section" style={{ textAlign: 'center' }}>
        <div className="container">
          <RevealOnScroll duration={560} distance={16}>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 36px)', marginBottom: '20px' }}>Pronto para decolar as vendas da sua loja?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(16px, 2vw, 18px)', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
              Crie sua vitrine em menos de 5 minutos e comece com o nosso Plano Free para conhecer todas as funcionalidades.
            </p>
            <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
              Criar minha vitrine grátis
            </button>
          </RevealOnScroll>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer" style={{ backgroundColor: '#07080b', borderTop: '1px solid var(--border)', padding: '40px 0', color: 'var(--text-muted)' }}>
        <div className="container flex-between" style={{ gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'var(--font-title)', marginBottom: '8px' }}>
              <Zap size={16} fill="var(--primary)" style={{ color: 'var(--primary)' }} /> PneuFlow
            </div>
            <p style={{ fontSize: '12px' }}>© 2026 PneuFlow. Todos os direitos reservados.</p>
          </div>
          <div className="landing-footer-links" style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
            <Link to="/login" style={{ color: 'var(--text-secondary)' }}>Painel do Lojista</Link>
            <a href="#demo-interativa" style={{ color: 'var(--text-secondary)' }}>Como Funciona</a>
            <Link to="/privacidade" style={{ color: 'var(--text-secondary)' }}>Política de Privacidade</Link>
            <Link to="/register" style={{ color: 'var(--text-secondary)' }}>Criar minha vitrine grátis</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
