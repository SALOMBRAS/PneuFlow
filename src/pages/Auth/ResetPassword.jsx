import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { storageService } from '../../services/storage';
import { Zap, Lock, CheckCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await storageService.updatePassword(password);
      setSubmitted(true);
    } catch (err) {
      console.error('Update password error:', err);
      setError('Ocorreu um erro ao atualizar sua senha. O link pode ter expirado.');
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
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Senha Alterada!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
            Sua senha foi redefinida com sucesso. Agora você já pode acessar seu painel com a nova senha.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
            Ir para o Login
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
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Nova Senha</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Crie uma nova senha segura para sua conta.
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
            <label className="form-label" htmlFor="password">Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                className="form-input"
                style={{ paddingLeft: '44px' }}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirmar Nova Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                style={{ paddingLeft: '44px' }}
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '12px' }} disabled={loading}>
            {loading ? 'Redefinindo...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
