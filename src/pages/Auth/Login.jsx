import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { hasSupabaseConfig, supabaseInitError } from '../../lib/supabase';
import { storageService } from '../../services/storage';
import { Zap, Lock, Mail, AlertTriangle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import BorderBeam from '../../components/BorderBeam/BorderBeam';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const showDemoAccess = import.meta.env.DEV;

  // Load remembered preference and check for auto-redirect
  useEffect(() => {
    const checkSession = async () => {
      try {
        if (!hasSupabaseConfig) {
          setError(supabaseInitError.message);
          return;
        }

        const session = await storageService.getSession();
        const rememberSession = localStorage.getItem('pneuflow_remember_session') === 'true';

        if (session && rememberSession) {
          await storageService.completeRegistration();
          navigate('/dashboard');
          return;
        }

        // Load remembered email for autofill
        const savedEmail = localStorage.getItem('pneuflow_remember_email');
        const isRemembered = localStorage.getItem('pneuflow_remember_me') === 'true';

        if (isRemembered && savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (err) {
        console.error('Login bootstrap error:', err);
        setError('Não foi possível preparar a tela de acesso. Tente novamente em alguns instantes.');
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let authenticated = false;

    try {
      if (!hasSupabaseConfig) {
        throw supabaseInitError;
      }

      // Set the session persistence flag BEFORE login so the custom storage knows where to save
      localStorage.setItem('pneuflow_remember_session', rememberMe ? 'true' : 'false');

      const data = await storageService.login(email, password);
      if (data) {
        authenticated = true;
        await storageService.completeRegistration();

        if (rememberMe) {
          localStorage.setItem('pneuflow_remember_email', email);
          localStorage.setItem('pneuflow_remember_me', 'true');
        } else {
          localStorage.removeItem('pneuflow_remember_email');
          localStorage.removeItem('pneuflow_remember_me');
        }
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err?.message === supabaseInitError?.message) {
        setError(err.message);
      } else if (err.message === 'Email not confirmed') {
        setError('E-mail ainda não confirmado. Verifique sua caixa de entrada.');
      } else if (authenticated) {
        setError('Não foi possível finalizar a configuração da sua loja. Tente entrar novamente em alguns instantes.');
      } else {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-dark)',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '16px',
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} /> Voltar para início
        </Link>

      <div className="card animate-slide auth-beam-card" style={{ width: '100%' }}>
        <BorderBeam
          duration={8}
          size={100}
          colorFrom="#f59e0b"
          colorTo="#fbbf24"
        />
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
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Painel do Lojista</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Entre para gerenciar sua vitrine digital</p>
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
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail de Acesso</label>
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

          <div className="form-group">
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>Senha</label>
              <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
                Esqueci minha senha
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                placeholder="Sua senha secreta"
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
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="remember" style={{ fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Lembrar-me
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={loading}>
            {loading ? 'Entrando...' : 'Acessar Meu Painel'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Não tem conta? </span>
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Cadastrar Loja</Link>
        </div>

        {showDemoAccess && (
        <div style={{
          backgroundColor: '#1b1c23',
          border: '1px dashed var(--border)',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          marginTop: '24px',
          textAlign: 'left',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          <p style={{ fontWeight: 'bold', color: 'var(--primary)', marginBottom: '4px' }}>💡 Acesso rápido para teste:</p>
          <p>📧 E-mail: <strong>demo@pneus.com</strong></p>
          <p>🔑 Senha: <strong>password123</strong></p>
        </div>
        )}
      </div>
      </div>
    </div>
  );
}
