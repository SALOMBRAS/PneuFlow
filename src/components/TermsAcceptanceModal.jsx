import { useEffect, useRef, useState } from 'react';
import { Check, ShieldCheck, X } from 'lucide-react';

const summarySections = [
  {
    title: 'Uso do PneuFlow',
    text: 'A loja deve usar o PneuFlow de forma lícita, com informações verdadeiras e respeitando clientes, regras de privacidade e boas práticas comerciais.',
  },
  {
    title: 'Dados da loja e do lojista',
    text: 'Para dados da conta da loja, como nome, e-mail, telefone, dados comerciais e informações de acesso, o PneuFlow pode atuar como controlador.',
  },
  {
    title: 'Dados de clientes finais',
    text: 'Quando tratamos dados de clientes finais em nome da loja, a loja é a controladora e o PneuFlow atua como operador, salvo quando definir finalidades próprias permitidas em lei.',
  },
  {
    title: 'Dados coletados',
    text: 'Podemos tratar dados da conta, dados técnicos de uso e dados de interesse comercial, como produto, veículo ou medida buscada quando informado.',
  },
  {
    title: 'WhatsApp',
    text: 'Pedidos de orçamento pelo WhatsApp são contatos transacionais. Mensagens de ofertas ou marketing dependem de consentimento separado quando exigido pela legislação aplicável.',
  },
  {
    title: 'Fornecedores',
    text: 'A operação pode envolver fornecedores como Vercel, Supabase e WhatsApp/Meta quando aplicável, sempre dentro do necessário para entregar e proteger o serviço.',
  },
  {
    title: 'Segurança e incidentes',
    text: 'Em caso de incidente de segurança que possa gerar risco ou dano relevante, adotaremos as medidas cabíveis e faremos as comunicações exigidas nos prazos legais e regulatórios aplicáveis.',
  },
  {
    title: 'Direitos e contato',
    text: 'Titulares podem exercer direitos previstos na LGPD. Encarregado de Dados: [NOME OU ÁREA DE PRIVACIDADE] — dpo@pneuflow.com.br.',
  },
];

export default function TermsAcceptanceModal({ open, onClose, onAccept }) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const contentRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    setHasScrolledToEnd(false);
    window.setTimeout(() => {
      closeButtonRef.current?.focus();
      const content = contentRef.current;
      if (content && content.scrollHeight <= content.clientHeight + 8) {
        setHasScrolledToEnd(true);
      }
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleScroll = (event) => {
    const element = event.currentTarget;
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (remaining <= 8) setHasScrolledToEnd(true);
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="terms-modal-backdrop"
      onMouseDown={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(2, 6, 12, 0.76)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
        aria-describedby="terms-modal-description"
        className="terms-modal-card"
        style={{
          width: 'min(100%, 720px)',
          maxHeight: 'min(86dvh, 780px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(245, 158, 11, 0.28)',
          borderRadius: '24px',
          background:
            'radial-gradient(circle at 12% 0%, rgba(245, 158, 11, 0.14), transparent 32%), #11141b',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.06)'
        }}
      >
        <header style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '22px 22px 16px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--primary)',
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '10px'
            }}>
              <ShieldCheck size={15} />
              Leitura obrigatória
            </span>
            <h2 id="terms-modal-title" style={{ margin: 0, fontSize: 'clamp(22px, 4vw, 30px)' }}>
              Termos de Uso e Política de Privacidade
            </h2>
            <p id="terms-modal-description" style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Role até o final para confirmar a leitura.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de termos"
            style={{
              width: '36px',
              height: '36px',
              flex: '0 0 auto',
              marginTop: '2px',
              marginRight: '2px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.055)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: 'none',
              lineHeight: 0
            }}
          >
            <X size={16} />
          </button>
        </header>

        <div
          ref={contentRef}
          onScroll={handleScroll}
          tabIndex={0}
          style={{
            overflowY: 'auto',
            padding: '18px 22px',
            minHeight: 0,
            color: 'rgba(243,244,246,0.78)'
          }}
        >
          <p style={{ margin: '0 0 16px', lineHeight: 1.65 }}>
            Este resumo apresenta os principais pontos para criação da sua conta no PneuFlow.
            A página completa de Política de Privacidade continua disponível em <strong>/privacidade</strong>.
          </p>

          <div style={{ display: 'grid', gap: '14px' }}>
            {summarySections.map((section) => (
              <article
                key={section.title}
                style={{
                  padding: '14px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.035)'
                }}
              >
                <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '15px' }}>
                  {section.title}
                </h3>
                <p style={{ margin: 0, lineHeight: 1.6, fontSize: '14px' }}>
                  {section.text}
                </p>
              </article>
            ))}
          </div>

          <div style={{
            marginTop: '18px',
            padding: '14px',
            borderRadius: '16px',
            border: '1px solid rgba(34, 197, 94, 0.22)',
            background: 'rgba(34, 197, 94, 0.08)',
            color: '#d8fbe5',
            fontSize: '14px',
            lineHeight: 1.6
          }}>
            Ao confirmar, você declara que leu e aceita os Termos de Uso e a Política de Privacidade do PneuFlow para continuar o cadastro da sua loja.
          </div>
        </div>

        <footer style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          padding: '16px 22px 22px',
          borderTop: '1px solid var(--border)'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ minHeight: '44px' }}
          >
            Fechar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!hasScrolledToEnd}
            onClick={onAccept}
            style={{
              minHeight: '44px',
              opacity: hasScrolledToEnd ? 1 : 0.48,
              cursor: hasScrolledToEnd ? 'pointer' : 'not-allowed'
            }}
          >
            <Check size={16} />
            Li e aceito
          </button>
        </footer>
      </section>
    </div>
  );
}
