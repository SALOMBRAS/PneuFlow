import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { storageService } from '../../services/storage';
import { Zap, Mail, Lock, Store, Phone, User, AlertTriangle, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';
import BorderBeam from '../../components/BorderBeam/BorderBeam';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Password requirement checks
  const checks = {
    length: password.length >= 5,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
  };

  const isPasswordValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido (exemplo@dominio.com).');
      return;
    }

    // Password validation
    if (!isPasswordValid) {
      setError('A senha não atende aos requisitos mínimos de segurança.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    // Format phone number to clean digits
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Por favor, informe um número de WhatsApp válido.');
      return;
    }

    setLoading(true);
    try {
      await storageService.createStore({
        storeName: storeName,
        ownerEmail: email,
        ownerPassword: password,
        phone: cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`,
        name: name
      });

      setIsRegistered(true);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao criar sua loja. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const Requirement = ({ met, text }) => (
    <li style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      color: met ? 'var(--success)' : 'var(--text-secondary)',
      transition: 'color 0.3s ease',
      marginBottom: '4px'
    }}>
      <div style={{
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        border: `1px solid ${met ? 'var(--success)' : 'var(--border)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: met ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
      }}>
        {met && <Check size={10} />}
      </div>
      {text}
    </li>
  );

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-dark)',
      padding: '40px 24px'
    }}>
      <div style={{ width: '100%', maxWidth: '460px', margin: '0 auto' }}>
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

      <div className="card animate-slide auth-beam-card" style={{ 
        width: '100%', 
        margin: '0 auto' 
      }}>
        <BorderBeam
          duration={8}
          size={100}
          colorFrom="#f59e0b"
          colorTo="#fbbf24"
        />
        {isRegistered ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              color: 'var(--success)',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Mail size={64} />
            </div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Cadastro realizado!</h2>
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: '32px', 
              lineHeight: '1.6' 
            }}>
              Enviamos um link de confirmação para <strong>{email}</strong>.<br />
              Por favor, verifique sua caixa de entrada para ativar sua conta.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
              Ir para o Login
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
              <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Criar Sua Vitrine Digital</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Configure sua loja e comece a vender em minutos</p>
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
                <label className="form-label" htmlFor="name">Seu Nome Completo</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    id="name"
                    type="text"
                    required
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                    placeholder="Ex: João da Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="storeName">Nome da Sua Loja</label>
                <div style={{ position: 'relative' }}>
                  <Store size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    id="storeName"
                    type="text"
                    required
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                    placeholder="Ex: Mundial Pneus"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>
              </div>

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
                    placeholder="Ex: contato@sualoja.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">WhatsApp Comercial (com DDD)</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    id="phone"
                    type="text"
                    required
                    className="form-input"
                    style={{ paddingLeft: '44px' }}
                    placeholder="Ex: 11999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Responsive Password Grid */}
              <div className="grid-responsive-auth" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px' 
              }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="password">Senha</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="form-input"
                      style={{ paddingLeft: '44px' }}
                      placeholder="******"
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
                  <label className="form-label" htmlFor="confirmPassword">Confirmar</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="form-input"
                      style={{ paddingLeft: '44px' }}
                      placeholder="******"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                padding: '16px', 
                borderRadius: 'var(--radius-md)', 
                fontSize: '12px', 
                marginBottom: '24px',
                border: '1px solid var(--border)',
                textAlign: 'left'
              }}>
                <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '12px' }}>Segurança da Senha:</p>
                <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                  <Requirement met={checks.length} text="Mínimo de 5 caracteres" />
                  <Requirement met={checks.upper} text="Pelo menos 1 letra maiúscula" />
                  <Requirement met={checks.lower} text="Pelo menos 1 letra minúscula" />
                  <Requirement met={checks.number} text="Pelo menos 1 número" />
                </ul>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '14px', marginTop: '4px' }} 
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Criar Minha Vitrine'}
              </button>
            </form>

            <div style={{ 
              textAlign: 'center', 
              marginTop: '24px', 
              fontSize: '14px', 
              borderTop: '1px solid var(--border)', 
              paddingTop: '20px' 
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Já possui conta? </span>
              <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Entrar no Painel</Link>
            </div>
          </>
        )}
      </div>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .card {
            padding: 24px 16px !important;
          }
          .grid-responsive-auth {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
