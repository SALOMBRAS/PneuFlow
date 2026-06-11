import { useState } from 'react';
import { Link } from 'react-router-dom';
import { storageService } from '../../services/storage';
import { Zap, Mail, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await storageService.resetPasswordEmail(email);
      setSubmitted(true);
    } catch (err) {
      console.error('Reset error:', err);
      setError('Ocorreu um erro ao enviar o e-mail. Verifique se o endereço está correto.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-dark)',
        padding: '24px'
      }}>
        <div className="card animate-slide" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ color: 'var(--success)', marginBottom: '24px' }}>
            <CheckCircle size={64} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>E-mail Enviado!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
            Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
            Voltar para o Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-dark)',
      padding: '24px'
    }}>
      <div className="card animate-slide" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--primary)',
            color: '#000',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 800,
            fontFamily: 'var(--font-title)',
            fontSize: '20px',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '16px'
          }}>
            <Zap size={18} fill="black" /> PneuFlow
          </div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Recuperar Senha</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Informe seu e-mail e enviaremos as instruções para você.
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            backgroundColor: 'var(--error-glow)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--error)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail Cadastrado</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                id="email"
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: '44px' }}
                placeholder="ex: contato@sualoja.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '12px' }} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <Link to="/login" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <ArrowLeft size={16} /> Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
}
