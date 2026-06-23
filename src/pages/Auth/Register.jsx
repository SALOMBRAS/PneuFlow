import { useState } from 'react';
import { Link } from 'react-router-dom';
import { storageService } from '../../services/storage';
import { Zap, Mail, Lock, Store, Phone, User, AlertTriangle, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';
import BorderBeam from '../../components/BorderBeam/BorderBeam';
import TermsAcceptanceModal from '../../components/TermsAcceptanceModal';

export default function Register() {
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
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido (exemplo@dominio.com).');
      return;
    }

    if (!isPasswordValid) {
      setError('A senha não atende aos requisitos mínimos de segurança.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Por favor, informe um número de WhatsApp válido.');
      return;
    }

    if (!acceptedPolicies) {
      setError('Para continuar, leia e aceite os Termos de Uso e a Política de Privacidade.');
      return;
    }

    setLoading(true);
    try {
      await storageService.createStore({
        storeName,
        ownerEmail: email,
        ownerPassword: password,
        phone: cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`,
        name,
      });

      setIsRegistered(true);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao criar sua loja. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const Requirement = ({ met, text }) => (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: met ? 'var(--success)' : 'var(--text-secondary)',
        transition: 'color 0.3s ease',
        marginBottom: '4px',
      }}
    >
      <div
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          border: `1px solid ${met ? 'var(--success)' : 'var(--border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: met ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
        }}
      >
        {met && <Check size={10} />}
      </div>
      {text}
    </li>
  );

  const FieldIcon = ({ children }) => (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '14px',
        top: '15px',
        color: 'var(--text-muted)',
        lineHeight: 0,
      }}
    >
      {children}
    </span>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-dark)',
        padding: '40px 24px',
      }}
    >
      <div className={`register-page-shell ${isRegistered ? 'register-page-shell--success' : ''}`}>
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
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Voltar para início
        </Link>

        <div className="card animate-slide auth-beam-card register-card">
          <BorderBeam duration={8} size={100} colorFrom="#f59e0b" colorTo="#fbbf24" />

          {isRegistered ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  color: 'var(--success)',
                  marginBottom: '24px',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Mail size={64} />
              </div>
              <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Cadastro realizado!</h2>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  marginBottom: '32px',
                  lineHeight: '1.6',
                }}
              >
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
                <div
                  style={{
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
                    marginBottom: '16px',
                  }}
                >
                  <Zap size={18} fill="black" /> PneuFlow
                </div>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Criar Sua Vitrine Digital</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Configure sua loja e comece a vender em minutos
                </p>
              </div>

              {error && (
                <div
                  style={{
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
                    textAlign: 'left',
                  }}
                >
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="register-form-grid">
                  <section className="register-section-card">
                    <div className="register-section-heading">
                      <span>01</span>
                      <div>
                        <h3>Informações pessoais</h3>
                        <p>Dados para acessar e proteger sua conta.</p>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="name">Seu Nome Completo</label>
                      <div style={{ position: 'relative' }}>
                        <FieldIcon><User size={16} /></FieldIcon>
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
                      <label className="form-label" htmlFor="email">E-mail de Acesso</label>
                      <div style={{ position: 'relative' }}>
                        <FieldIcon><Mail size={16} /></FieldIcon>
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

                    <div className="grid-responsive-auth">
                      <div className="form-group">
                        <label className="form-label" htmlFor="password">Senha</label>
                        <div style={{ position: 'relative' }}>
                          <FieldIcon><Lock size={16} /></FieldIcon>
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
                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '12px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassword">Confirmar</label>
                        <div style={{ position: 'relative' }}>
                          <FieldIcon><Lock size={16} /></FieldIcon>
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

                    <div className="register-password-box">
                      <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '12px' }}>Segurança da Senha:</p>
                      <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                        <Requirement met={checks.length} text="Mínimo de 5 caracteres" />
                        <Requirement met={checks.upper} text="Pelo menos 1 letra maiúscula" />
                        <Requirement met={checks.lower} text="Pelo menos 1 letra minúscula" />
                        <Requirement met={checks.number} text="Pelo menos 1 número" />
                      </ul>
                    </div>
                  </section>

                  <section className="register-section-card register-section-card--store">
                    <div className="register-section-heading">
                      <span>02</span>
                      <div>
                        <h3>Dados da loja</h3>
                        <p>Informações que serão usadas na vitrine.</p>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="storeName">Nome da Sua Loja</label>
                      <div style={{ position: 'relative' }}>
                        <FieldIcon><Store size={16} /></FieldIcon>
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
                      <label className="form-label" htmlFor="phone">WhatsApp Comercial (com DDD)</label>
                      <div style={{ position: 'relative' }}>
                        <FieldIcon><Phone size={16} /></FieldIcon>
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

                    <div className="register-store-preview">
                      <span>Prévia da vitrine</span>
                      <strong>{storeName || 'Nome da sua loja'}</strong>
                      <p>{phone ? `WhatsApp: ${phone}` : 'Adicione o WhatsApp para receber clientes.'}</p>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      aria-pressed={acceptedPolicies}
                      onClick={() => setShowTermsModal(true)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setShowTermsModal(true);
                        }
                      }}
                      className="register-terms-box"
                      style={{
                        borderColor: acceptedPolicies ? 'rgba(245, 158, 11, 0.42)' : 'var(--border)',
                        backgroundColor: acceptedPolicies ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '18px',
                          height: '18px',
                          marginTop: '2px',
                          borderRadius: '5px',
                          border: `1px solid ${acceptedPolicies ? 'var(--success)' : 'var(--border)'}`,
                          backgroundColor: acceptedPolicies ? 'rgba(34, 197, 94, 0.18)' : 'transparent',
                          color: 'var(--success)',
                          flex: '0 0 auto',
                        }}
                      >
                        {acceptedPolicies && <Check size={13} />}
                      </span>
                      <span>
                        {acceptedPolicies ? (
                          <strong style={{ color: 'var(--success)' }}>✓ Termos aceitos</strong>
                        ) : (
                          <>
                            Li e aceito os{' '}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setShowTermsModal(true);
                              }}
                              style={{
                                border: 0,
                                padding: 0,
                                background: 'transparent',
                                color: 'var(--primary)',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              Termos de Uso
                            </button>
                            {' '}e a{' '}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setShowTermsModal(true);
                              }}
                              style={{
                                border: 0,
                                padding: 0,
                                background: 'transparent',
                                color: 'var(--primary)',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              Política de Privacidade
                            </button>
                            {' '}do PneuFlow.
                          </>
                        )}
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '14px', marginTop: 'auto' }}
                      disabled={loading}
                    >
                      {loading ? 'Criando...' : 'Criar Minha Vitrine'}
                    </button>
                  </section>
                </div>
              </form>

              <div className="register-login-link">
                <span style={{ color: 'var(--text-secondary)' }}>Já possui conta? </span>
                <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Entrar no Painel</Link>
              </div>
            </>
          )}
        </div>
      </div>

      <TermsAcceptanceModal
        open={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setAcceptedPolicies(true);
          setShowTermsModal(false);
          setError('');
        }}
      />

      <style>{`
        .register-page-shell {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
        }

        .register-page-shell--success {
          max-width: 460px;
        }

        .register-card {
          width: 100%;
          margin: 0 auto;
        }

        .register-form-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
          gap: 18px;
          align-items: stretch;
        }

        .register-section-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.018)),
            rgba(10, 14, 22, 0.74);
        }

        .register-section-card .form-group {
          margin-bottom: 0;
        }

        .register-section-heading {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 2px;
        }

        .register-section-heading span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.14);
          color: var(--primary);
          font-weight: 900;
          font-size: 12px;
          flex: 0 0 auto;
        }

        .register-section-heading h3 {
          margin: 0 0 4px;
          color: var(--text-primary);
          font-size: 17px;
          font-weight: 900;
        }

        .register-section-heading p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.45;
        }

        .register-password-box,
        .register-store-preview,
        .register-terms-box {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background-color: rgba(255, 255, 255, 0.02);
          text-align: left;
        }

        .register-password-box {
          padding: 16px;
          font-size: 12px;
        }

        .register-store-preview {
          padding: 16px;
          margin-top: 2px;
        }

        .register-store-preview span {
          display: block;
          margin-bottom: 8px;
          color: var(--primary);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .register-store-preview strong {
          display: block;
          color: var(--text-primary);
          font-size: 18px;
          margin-bottom: 6px;
        }

        .register-store-preview p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.45;
        }

        .register-terms-box {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.5;
          cursor: pointer;
        }

        .register-login-link {
          text-align: center;
          margin-top: 24px;
          font-size: 14px;
          border-top: 1px solid var(--border);
          padding-top: 20px;
        }

        .grid-responsive-auth {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        @media (max-width: 760px) {
          .register-page-shell {
            max-width: 460px;
          }

          .register-card {
            padding: 24px 16px !important;
          }

          .register-form-grid {
            display: block;
          }

          .register-section-card {
            display: block;
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
          }

          .register-section-card + .register-section-card {
            margin-top: 16px;
          }

          .register-section-heading {
            margin: 0 0 16px;
          }

          .register-section-card .form-group {
            margin-bottom: 16px;
          }

          .grid-responsive-auth {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .register-password-box {
            margin-bottom: 18px;
          }

          .register-store-preview {
            display: none;
          }

          .register-terms-box {
            margin-bottom: 18px;
          }

          .terms-modal-backdrop {
            padding: 12px !important;
          }

          .terms-modal-card footer {
            flex-direction: column-reverse !important;
          }

          .terms-modal-card footer .btn {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
