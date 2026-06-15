import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  HelpCircle, 
  ChevronDown, 
  Zap, 
  Clock, 
  Settings 
} from 'lucide-react';
import './LandingPage.css';
import FeedbackCarousel from '../components/FeedbackCarousel';
import InteractiveDemo from '../components/InteractiveDemo/InteractiveDemo';

const CardSwapHero = lazy(() => import('../components/CardSwap/CardSwapHero'));

const heroPhrases = [
  {
    text: 'Pare de perder clientes no WhatsApp. Crie sua vitrine online.',
    highlights: ['WhatsApp', 'vitrine online'],
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
            <a href="#demo-interativa" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Demonstração</a>
            <a href="#faq" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>FAQ</a>
          </nav>

          <div className="landing-header-actions" style={{ display: 'flex', gap: '12px' }}>
            <Link to="/login" className="btn btn-outline landing-header-login" style={{ padding: '8px 16px', fontSize: '14px' }}>Login</Link>
            <Link to="/register" className="btn btn-primary landing-header-register" style={{ padding: '8px 16px', fontSize: '14px' }}>Criar minha vitrine grátis</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-padding landing-hero-section">
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
              <HeroTypewriter isMobile={isMobileHero} />
            </h1>
            <p className="hero-description">
              Guie seu cliente de forma autônoma: ele pesquisa pneus pela medida ou pelo modelo do veículo, tira todas as dúvidas e chega no seu WhatsApp pronto para fechar a compra.
            </p>
            <div className="hero-buttons">
              <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '16px' }}>
                Criar minha vitrine grátis
              </button>
              <a href="#demo-interativa" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '16px' }}>
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
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Vitrine pronta em 5 minutos</span>
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

      <InteractiveDemo />

      {/* Problems Section */}
      <section id="problemas" className="section-padding landing-problems-section">
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

      {/* Feedback Carousel Section */}
      <FeedbackCarousel />

      {/* FAQ Section */}
      <section id="faq" className="section-padding landing-faq-section">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 className="title-lg">Perguntas Frequentes</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
              Tudo o que você precisa saber sobre o PneuFlow.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faqs.map((faq, index) => (
              <article
                key={index} 
                className="card" 
                style={{ padding: '20px', borderColor: activeFaq === index ? 'var(--primary)' : 'var(--border)' }}
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
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="section-padding landing-final-cta-section" style={{ textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 36px)', marginBottom: '20px' }}>Pronto para decolar as vendas da sua loja?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(16px, 2vw, 18px)', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>
            Crie sua vitrine em menos de 5 minutos e comece com o nosso Plano Free para conhecer todas as funcionalidades.
          </p>
          <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }}>
            Criar minha vitrine grátis
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
