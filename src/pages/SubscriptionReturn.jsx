import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Clock, ShieldCheck, Zap } from 'lucide-react';

const statusContent = {
  success: {
    icon: <ShieldCheck size={26} />,
    title: 'Pagamento aprovado',
    message: 'Pagamento aprovado. Estamos confirmando sua assinatura.',
    color: 'var(--success)'
  },
  pending: {
    icon: <Clock size={26} />,
    title: 'Pagamento pendente',
    message: 'Pagamento pendente. Assim que for confirmado, sua assinatura sera atualizada.',
    color: 'var(--primary)'
  },
  failure: {
    icon: <AlertTriangle size={26} />,
    title: 'Pagamento nao aprovado',
    message: 'Pagamento nao aprovado. Tente novamente.',
    color: 'var(--error)'
  }
};

export default function SubscriptionReturn() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || 'pending';
  const content = statusContent[status] || statusContent.pending;

  return (
    <main
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 50% 10%, rgba(245, 158, 11, 0.16), transparent 34%), var(--bg-dark)',
        color: 'var(--text-primary)',
        padding: '32px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <section
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          border: '1px solid rgba(245, 158, 11, 0.22)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.36), 0 0 70px rgba(245, 158, 11, 0.08)',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
          <div
            style={{
              width: '58px',
              height: '58px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '18px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: content.color
            }}
          >
            {content.icon}
          </div>
        </div>

        <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', margin: 0 }}>
          Assinatura PneuFlow
        </p>
        <h1 style={{ margin: '8px 0 12px', fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.05 }}>
          {content.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.7, marginBottom: '24px' }}>
          {content.message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/assinatura" className="btn btn-primary">
            <Zap size={16} />
            Voltar para assinatura
          </Link>
          <Link to="/" className="btn btn-secondary">
            Voltar ao site
          </Link>
        </div>
      </section>
    </main>
  );
}
