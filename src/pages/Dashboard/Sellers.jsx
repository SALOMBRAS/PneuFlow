import { useEffect, useState, useCallback } from 'react';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
import { useNotifications } from '../../hooks/useNotifications';
import {
  Users,
  UserPlus,
  DoorOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Loader2,
  X,
  Copy,
  Check,
  Edit3,
  Lock
} from 'lucide-react';

export default function Sellers() {
  const { store, isOwner, session } = useStore();
  const {
    createPersistentNotification,
    notifyTransientError,
    notifyTransientWarning
  } = useNotifications();
  const emptySellerForm = { nome: '', email: '', whatsapp: '', password: '', confirmPassword: '' };
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptySellerForm);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedEmailId, setCopiedEmailId] = useState(null);
  const [editingRefId, setEditingRefId] = useState(null);
  const [tempRefCode, setTempRefCode] = useState('');
  const [editingWhatsappId, setEditingWhatsappId] = useState(null);
  const [tempWhatsapp, setTempWhatsapp] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newPasswordData, setNewPasswordData] = useState({ password: '', confirmPassword: '' });
  const [sellerAccessModalOpen, setSellerAccessModalOpen] = useState(false);
  const [sellerAccessTarget, setSellerAccessTarget] = useState(null);
  const [sellerAccessSubmitting, setSellerAccessSubmitting] = useState(false);
  const [blockedSellerAccess, setBlockedSellerAccess] = useState(null);

  const getPasswordRules = (password) => {
    return {
      minLength: password.length >= 5,
      hasNumber: /\d/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
    };
  };

  const isPasswordValid = (password) => {
    const rules = getPasswordRules(password);
    return Object.values(rules).every(Boolean);
  };

  const PasswordRequirement = ({ met, text }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: met ? 'var(--success)' : 'var(--text-muted)', marginBottom: '2px' }}>
      {met ? <CheckCircle2 size={12} /> : <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid var(--border)' }} />}
      <span style={{ color: met ? 'var(--text-primary)' : 'inherit' }}>{text}</span>
    </div>
  );

  const PasswordRulesList = ({ password }) => {
    const rules = getPasswordRules(password);
    return (
      <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>A senha deve conter:</p>
        <PasswordRequirement met={rules.minLength} text="Mínimo 5 caracteres" />
        <PasswordRequirement met={rules.hasNumber} text="Pelo menos 1 número" />
        <PasswordRequirement met={rules.hasUpper} text="Pelo menos 1 letra maiúscula" />
        <PasswordRequirement met={rules.hasLower} text="Pelo menos 1 letra minúscula" />
      </div>
    );
  };

  const loadMembers = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      const data = await storageService.getStoreMembers(store.id);
      setMembers(data);
    } catch (err) {
      console.error('Erro ao carregar vendedores:', err);
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const closeSellerAccessModal = (force = false) => {
    if (sellerAccessSubmitting && !force) return;
    setSellerAccessModalOpen(false);
    setSellerAccessTarget(null);
    setBlockedSellerAccess(null);
  };

  const openSellerAccessWindow = (payload) => {
    const popup = window.open('about:blank', '_blank');
    if (!popup) return false;

    popup.name = JSON.stringify({
      type: 'pneuflow:seller-access',
      ticket: payload.ticket,
      ownerAccessToken: payload.ownerAccessToken
    });
    popup.location.replace(`${window.location.origin}/seller-access`);
    return true;
  };

  const handleConfirmSellerAccess = async () => {
    if (!sellerAccessTarget || sellerAccessSubmitting) return;
    if (!session?.access_token) {
      notifyTransientError({
        title: 'Sessao expirada',
        message: 'Faca login novamente para iniciar o acesso temporario.',
        category: 'vendedores'
      });
      return;
    }

    setSellerAccessSubmitting(true);
    setBlockedSellerAccess(null);

    try {
      const result = await storageService.createSellerAccess(sellerAccessTarget.id);
      const payload = {
        ticket: result.ticket,
        ownerAccessToken: session.access_token
      };

      const opened = openSellerAccessWindow(payload);

      if (!opened) {
        setBlockedSellerAccess(payload);
        notifyTransientWarning({
          title: 'Nova guia bloqueada',
          message: 'O navegador bloqueou a nova guia. Clique em "Abrir sessao temporaria" para continuar.',
          category: 'vendedores'
        });
        return;
      }

      await createPersistentNotification({
        type: 'info',
        title: 'Sessao temporaria pronta',
        message: `Uma nova guia foi aberta para acessar ${sellerAccessTarget.nome || sellerAccessTarget.email || 'o vendedor'}.`,
        category: 'general',
        actionPath: '/dashboard/sellers'
      });

      closeSellerAccessModal(true);
    } catch (err) {
      await createPersistentNotification({
        type: 'error',
        title: 'Nao foi possivel iniciar',
        message: err.message || 'Nao foi possivel iniciar o acesso temporario.',
        category: 'operation_errors'
      });
    } finally {
      setSellerAccessSubmitting(false);
    }
  };

  const handleResumeBlockedSellerAccess = () => {
    if (!blockedSellerAccess) return;

    const opened = openSellerAccessWindow(blockedSellerAccess);
    if (!opened) {
      notifyTransientWarning({
        title: 'Nova guia bloqueada',
        message: 'Permita pop-ups para este site e tente novamente.',
        category: 'vendedores'
      });
      return;
    }

    closeSellerAccessModal(true);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (formData.password) {
      if (!isPasswordValid(formData.password)) {
        notifyTransientWarning({
          title: 'Senha invalida',
          message: 'A senha precisa ter minimo 5 caracteres, 1 numero, 1 letra maiuscula e 1 letra minuscula.',
          category: 'vendedores'
        });
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        notifyTransientWarning({
          title: 'Senha invalida',
          message: 'As senhas nao coincidem.',
          category: 'vendedores'
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await storageService.inviteSeller(store.id, formData);
      if (result?.member_id) {
        await storageService.updateSellerWhatsapp(result.member_id, formData.whatsapp);
      }
      await createPersistentNotification({
        type: 'success',
        title: 'Vendedor cadastrado com sucesso.',
        message: formData.password
          ? 'O vendedor foi criado e ja pode acessar o painel.'
          : 'O convite foi enviado para o e-mail do vendedor.',
        category: 'general',
        actionPath: '/dashboard/sellers'
      });
      setInviteModalOpen(false);
      setFormData(emptySellerForm);
      loadMembers();
    } catch (err) {
      await createPersistentNotification({
        type: 'error',
        title: 'Nao foi possivel concluir',
        message: err.message || 'Erro ao processar vendedor.',
        category: 'operation_errors'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (submitting || !selectedMember) return;

    if (!isPasswordValid(newPasswordData.password)) {
      notifyTransientWarning({
        title: 'Senha invalida',
        message: 'A senha precisa ter minimo 5 caracteres, 1 numero, 1 letra maiuscula e 1 letra minuscula.',
        category: 'vendedores'
      });
      return;
    }

    if (newPasswordData.password !== newPasswordData.confirmPassword) {
      notifyTransientWarning({
        title: 'Senha invalida',
        message: 'As senhas nao coincidem.',
        category: 'vendedores'
      });
      return;
    }

    setSubmitting(true);
    try {
      await storageService.inviteSeller(store.id, {
        nome: selectedMember.nome,
        email: selectedMember.email,
        password: newPasswordData.password
      });
      await createPersistentNotification({
        type: 'success',
        title: 'Senha alterada com sucesso.',
        message: 'A nova senha do vendedor ja esta ativa no sistema.',
        category: 'general',
        actionPath: '/dashboard/sellers'
      });
      setPasswordModalOpen(false);
      setNewPasswordData({ password: '', confirmPassword: '' });
      setSelectedMember(null);
      loadMembers();
    } catch (err) {
      await createPersistentNotification({
        type: 'error',
        title: 'Nao foi possivel concluir',
        message: err.message || 'Erro ao alterar senha.',
        category: 'operation_errors'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyEmail = async (member) => {
    if (!member?.email) return;
    try {
      await copyTextToClipboard(member.email);
      setCopiedEmailId(member.id);
      setTimeout(() => setCopiedEmailId(null), 2000);
    } catch (err) {
      notifyTransientError({
        title: 'Falha ao copiar',
        message: 'Nao foi possivel copiar o e-mail. Tente novamente.',
        category: 'vendedores'
      });
    }
  };

  const handleManageAccess = async (memberId, action) => {
    let confirmMsg = '';
    if (action === 'deactivate') confirmMsg = 'Tem certeza que deseja desativar este vendedor? Ele não conseguirá mais acessar o painel.';
    if (action === 'reactivate') confirmMsg = 'Deseja reativar este vendedor?';
    if (action === 'remove_access') confirmMsg = 'Tem certeza? Isso apagará o login do vendedor no Auth. O histórico de leads será preservado e o e-mail poderá ser convidado novamente.';

    if (confirmMsg && !window.confirm(confirmMsg)) return;

    try {
      const result = await storageService.manageSellerAccess({
        storeId: store.id,
        memberId,
        action
      });
      await createPersistentNotification({
        type: 'info',
        title: 'Acesso atualizado',
        message: result.message || 'A acao foi executada com sucesso.',
        category: 'general',
        actionPath: '/dashboard/sellers'
      });
      loadMembers();
    } catch (err) {
      await createPersistentNotification({
        type: 'error',
        title: 'Nao foi possivel concluir',
        message: err.message || 'Erro ao gerenciar vendedor.',
        category: 'operation_errors'
      });
    }
  };

  const handleCopyLink = async (member) => {
    const publicUrl = `${window.location.origin}/store/${store.slug}?ref=${member.ref_code}`;
    try {
      await copyTextToClipboard(publicUrl);
      setCopiedId(member.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      notifyTransientError({
        title: 'Falha ao copiar',
        message: 'Nao foi possivel copiar o link. Tente novamente.',
        category: 'vendedores'
      });
    }
  };

  const startEditingRef = (member) => {
    setEditingRefId(member.id);
    setTempRefCode(member.ref_code || '');
  };

  const handleSaveRefCode = async (memberId) => {
    const cleanRef = tempRefCode.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    if (!cleanRef) {
      notifyTransientWarning({
        title: 'Codigo invalido',
        message: 'O codigo nao pode estar vazio.',
        category: 'vendedores'
      });
      return;
    }

    try {
      await storageService.updateSellerRefCode(memberId, cleanRef);
      setEditingRefId(null);
      await createPersistentNotification({
        type: 'success',
        title: 'Codigo atualizado',
        message: 'O codigo referral do vendedor foi atualizado.',
        category: 'general',
        actionPath: '/dashboard/sellers'
      });
      loadMembers();
    } catch (err) {
      await createPersistentNotification({
        type: 'error',
        title: 'Nao foi possivel concluir',
        message: err.message || 'Erro ao atualizar codigo.',
        category: 'operation_errors'
      });
    }
  };

  const startEditingWhatsapp = (member) => {
    setEditingWhatsappId(member.id);
    setTempWhatsapp(member.whatsapp || '');
  };

  const handleSaveWhatsapp = async (memberId) => {
    if (String(tempWhatsapp || '').replace(/\D/g, '').length < 10) {
      notifyTransientWarning({
        title: 'WhatsApp invalido',
        message: 'Informe um WhatsApp valido para o vendedor.',
        category: 'vendedores'
      });
      return;
    }

    try {
      await storageService.updateSellerWhatsapp(memberId, tempWhatsapp);
      setEditingWhatsappId(null);
      await loadMembers();
      await createPersistentNotification({
        type: 'success',
        title: 'WhatsApp atualizado',
        message: 'O WhatsApp do vendedor foi atualizado com sucesso.',
        category: 'general',
        actionPath: '/dashboard/sellers'
      });
    } catch (err) {
      await createPersistentNotification({
        type: 'error',
        title: 'Nao foi possivel concluir',
        message: err.message || 'Erro ao atualizar WhatsApp.',
        category: 'operation_errors'
      });
    }
  };

  const filteredMembers = members.filter(m =>
    m.nome?.toLowerCase().includes(filterText.toLowerCase()) ||
    m.email.toLowerCase().includes(filterText.toLowerCase())
  );
  const sellerMembers = members.filter((member) => member.role !== 'owner');
  const activeSellers = sellerMembers.filter((member) => member.status === 'active').length;
  const pendingSellers = sellerMembers.filter((member) => member.status === 'pending').length;

  if (loading && members.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  const thStyle = { padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' };
  const copyButtonStyle = {
    padding: '10px 14px',
    fontSize: '12px',
    minHeight: '42px',
    minWidth: '112px',
    width: 'fit-content',
    borderRadius: '10px',
    gap: '7px',
    lineHeight: 1.1,
    whiteSpace: 'nowrap'
  };
  const emailCopyButtonStyle = {
    ...copyButtonStyle,
    minWidth: '124px',
    padding: '9px 12px'
  };

  const copyTextToClipboard = async (text) => {
    if (!text) return false;

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="animate-fade sellers-page">
      <div className="pf-section-header sellers-page-header">
        <div>
          <span className="pf-kicker">Equipe comercial</span>
          <h1 style={{ fontSize: '32px', margin: '10px 0 0', textAlign: 'left' }}>Vendedores</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Acompanhe quem gera oportunidades e controle acessos sem expor senhas.</p>
        </div>
        <button onClick={() => setInviteModalOpen(true)} className="btn btn-primary">
          <UserPlus size={16} /> Adicionar vendedor
        </button>
      </div>

      <div className="sellers-summary-grid">
        <div className="pf-card sellers-summary-card">
          <span>Vendedores</span>
          <strong>{sellerMembers.length}</strong>
        </div>
        <div className="pf-card sellers-summary-card sellers-summary-card--success">
          <span>Ativos</span>
          <strong>{activeSellers}</strong>
        </div>
        <div className="pf-card sellers-summary-card">
          <span>Pendentes</span>
          <strong>{pendingSellers}</strong>
        </div>
      </div>

      <div style={{ marginBottom: '24px', position: 'relative', maxWidth: '400px' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          className="form-input"
          style={{ paddingLeft: '44px' }}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      <div className="card sellers-table-card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredMembers.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <p>Nenhum vendedor encontrado.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>Vendedor</th>
                  <th style={thStyle}>E-mail</th>
                  <th style={thStyle}>WhatsApp</th>
                  <th style={thStyle}>Link Referral</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ position: 'relative', width: '36px', height: '36px', overflow: 'visible' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              color: 'var(--primary)'
                            }}
                          >
                            {(member.nome || member.email || '?').charAt(0).toUpperCase()}
                          </div>
                          {isOwner && member.role !== 'owner' && member.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSellerAccessTarget(member);
                                setBlockedSellerAccess(null);
                                setSellerAccessModalOpen(true);
                              }}
                              data-testid="seller-access-button"
                              className="seller-access-avatar-button"
                              title="Acessar como vendedor"
                              aria-label={`Acessar como vendedor ${member.nome || member.email || 'vendedor'}`}
                            >
                              <DoorOpen size={13} />
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>
                            {member.nome || 'Pendente'}
                          </span>

                          <span
                            className={`badge ${member.role === 'owner' ? 'badge-primary' : 'badge-secondary'}`}
                            style={{
                              fontSize: '9px',
                              textTransform: 'capitalize',
                              width: 'fit-content',
                              marginTop: '2px'
                            }}
                          >
                            {member.role === 'owner' ? 'Dono' : 'Vendedor'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', maxWidth: '280px' }}>
                        <span style={{ wordBreak: 'break-all' }}>{member.email || '-'}</span>
                        {member.email && (
                          <button 
                            type="button"
                            onClick={() => handleCopyEmail(member)}
                            className="btn btn-outline"
                            style={{
                              ...emailCopyButtonStyle,
                              color: copiedEmailId === member.id ? 'var(--success)' : 'var(--text-primary)',
                              borderColor: copiedEmailId === member.id ? 'rgba(16,185,129,0.45)' : 'var(--border)'
                            }}
                            title="Copiar e-mail"
                            aria-label={`Copiar e-mail de ${member.nome || member.email || 'vendedor'}`}
                          >
                            {copiedEmailId === member.id ? <Check size={15} /> : <Copy size={15} />}
                            <span>{copiedEmailId === member.id ? 'Copiado!' : 'Copiar e-mail'}</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {editingWhatsappId === member.id ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="tel"
                            className="form-input"
                            placeholder="55 85 9 9282-7407"
                            style={{ padding: '6px 10px', fontSize: '12px', width: '170px' }}
                            value={tempWhatsapp}
                            onChange={(e) => setTempWhatsapp(e.target.value)}
                            autoFocus
                          />
                          <button type="button" onClick={() => handleSaveWhatsapp(member.id)} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '12px', minHeight: '34px' }}>
                            <Check size={14} />
                            Salvar
                          </button>
                          <button type="button" onClick={() => setEditingWhatsappId(null)} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '12px', minHeight: '34px' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{member.whatsapp || '-'}</span>
                          {member.role !== 'owner' && (
                            <button
                              type="button"
                              onClick={() => startEditingWhatsapp(member)}
                              className="btn btn-outline"
                              style={{ padding: '6px 10px', fontSize: '12px', minHeight: '34px', gap: '6px' }}
                              aria-label={`Editar WhatsApp de ${member.nome || member.email || 'vendedor'}`}
                            >
                              <Edit3 size={14} />
                              Editar
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {editingRefId === member.id ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '12px', width: '120px' }}
                                value={tempRefCode}
                                onChange={(e) => setTempRefCode(e.target.value)}
                                autoFocus
                              />
                              <button onClick={() => handleSaveRefCode(member.id)} className="btn btn-primary" style={{ padding: '4px 8px' }}>
                                <Check size={14} />
                              </button>
                              <button onClick={() => setEditingRefId(null)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <code style={{ fontSize: '12px', color: 'var(--primary)' }}>{member.ref_code || '---'}</code>
                              <button onClick={() => startEditingRef(member)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <Edit3 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                        {member.ref_code && (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(member)}
                            className="btn btn-outline"
                            style={{
                              ...copyButtonStyle,
                              color: copiedId === member.id ? 'var(--success)' : 'var(--text-primary)',
                              borderColor: copiedId === member.id ? 'rgba(16,185,129,0.45)' : 'var(--border)'
                            }}
                            aria-label={`Copiar link referral de ${member.nome || member.email || 'vendedor'}`}
                          >
                            {copiedId === member.id ? <Check size={15} /> : <Copy size={15} />}
                            <span>{copiedId === member.id ? 'Copiado!' : 'Copiar Link'}</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        {member.status === 'active' && <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />}
                        {member.status === 'pending' && <Clock size={14} style={{ color: 'var(--warning)' }} />}
                        {member.status === 'inactive' && <XCircle size={14} style={{ color: 'var(--text-muted)' }} />}
                        {member.status === 'removed' && <XCircle size={14} style={{ color: 'var(--error)' }} />}

                        <span style={{
                          color: member.status === 'active' ? 'var(--success)' :
                            member.status === 'pending' ? 'var(--warning)' :
                              member.status === 'inactive' ? 'var(--text-muted)' : 'var(--error)',
                          fontWeight: 500
                        }}>
                          {member.status === 'active' ? 'Ativo' :
                            member.status === 'pending' ? 'Pendente' :
                              member.status === 'inactive' ? 'Desativado' :
                                member.status === 'removed' ? 'Acesso Removido' : 'Desativado'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      {member.role !== 'owner' && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {member.status === 'active' && (
                            <>
                              <button 
                                onClick={() => {
                                  setSelectedMember(member);
                                  setPasswordModalOpen(true);
                                }}
                                className="btn btn-outline" 
                                style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                              >
                                Alterar Senha
                              </button>
                              <button
                                onClick={() => handleManageAccess(member.id, 'deactivate')}
                                className="btn btn-outline"
                                style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--text-muted)', color: 'var(--text-secondary)' }}
                              >
                                Desativar
                              </button>
                              <button
                                onClick={() => handleManageAccess(member.id, 'remove_access')}
                                className="btn btn-outline"
                                style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--error)' }}
                              >
                                Remover Acesso
                              </button>
                            </>
                          )}

                          {member.status === 'inactive' && (
                            <>
                              <button
                                onClick={() => handleManageAccess(member.id, 'reactivate')}
                                className="btn btn-outline"
                                style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--success)', color: 'var(--success)' }}
                              >
                                Reativar
                              </button>
                              <button
                                onClick={() => handleManageAccess(member.id, 'remove_access')}
                                className="btn btn-outline"
                                style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--error)' }}
                              >
                                Remover Acesso
                              </button>
                            </>
                          )}

                          {member.status === 'removed' && (
                            <button
                              onClick={() => {
                                setFormData({
                                  ...emptySellerForm,
                                  nome: member.nome || '',
                                  email: member.email || '',
                                  whatsapp: member.whatsapp || ''
                                });
                                setInviteModalOpen(true);
                              }}
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                              Reativar com Senha
                            </button>
                          )}

                          {member.status === 'pending' && (
                            <button
                              onClick={() => handleManageAccess(member.id, 'remove_access')}
                              className="btn btn-outline"
                              style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--error)' }}
                            >
                              Cancelar Convite
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sellerAccessModalOpen && sellerAccessTarget && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide" style={{ maxWidth: '440px', textAlign: 'left' }}>
            <button className="modal-close" onClick={closeSellerAccessModal} disabled={sellerAccessSubmitting}>
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Acessar como vendedor?</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Voce abrira uma sessao temporaria como <strong style={{ color: 'var(--text-primary)' }}>{sellerAccessTarget.nome || 'Vendedor'}</strong>.
              A acao ficara registrada no historico de seguranca.
            </p>

            <div
              style={{
                marginTop: '18px',
                padding: '14px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                display: 'grid',
                gap: '6px'
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Vendedor selecionado
              </span>
              <strong style={{ fontSize: '15px' }}>{sellerAccessTarget.nome || 'Sem nome'}</strong>
              <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{sellerAccessTarget.email}</span>
            </div>

            {blockedSellerAccess && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.24)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  lineHeight: 1.5
                }}
              >
                O navegador bloqueou a nova guia. Use o botao abaixo para abrir a sessao temporaria manualmente.
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '28px', flexWrap: 'wrap' }}>
              {blockedSellerAccess && (
                <button type="button" className="btn btn-outline" onClick={handleResumeBlockedSellerAccess}>
                  Abrir sessao temporaria
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={closeSellerAccessModal} disabled={sellerAccessSubmitting}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmSellerAccess} disabled={sellerAccessSubmitting}>
                {sellerAccessSubmitting ? 'Preparando...' : 'Acessar como vendedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide" style={{ maxWidth: '450px', textAlign: 'left' }}>
            <button className="modal-close" onClick={() => setInviteModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Convidar Vendedor</h3>

            <form onSubmit={handleInvite}>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Oliveira"
                  className="form-input"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: carlos@email.com"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp do vendedor</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 55 85 9 9282-7407"
                  className="form-input"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                />
                <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Este número será usado nos botões da vitrine quando o link deste vendedor for acessado.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Senha Inicial</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                  <input 
                    type="password" 
                    required 
                    placeholder="Defina uma senha" 
                    className="form-input" 
                    style={{ paddingLeft: '44px' }}
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  />
                </div>
                <PasswordRulesList password={formData.password} />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Confirmar Senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                  <input 
                    type="password" 
                    required 
                    placeholder="Repita a senha" 
                    className="form-input" 
                    style={{ paddingLeft: '44px' }}
                    value={formData.confirmPassword} 
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} 
                  />
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px' }}>As senhas não coincidem.</p>
                )}
              </div>

              <div style={{ marginTop: '24px', padding: '12px', backgroundColor: 'var(--secondary)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <p style={{ margin: 0 }}>O vendedor poderá acessar o painel imediatamente usando o e-mail e esta senha.</p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setInviteModalOpen(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting || !formData.nome || !formData.email || !formData.whatsapp || !isPasswordValid(formData.password) || formData.password !== formData.confirmPassword}
                >
                  {submitting ? 'Criando...' : 'Criar Vendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {passwordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide" style={{ maxWidth: '400px', textAlign: 'left' }}>
            <button className="modal-close" onClick={() => { setPasswordModalOpen(false); setSelectedMember(null); }}>
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Alterar Senha</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
              Vendedor: <strong>{selectedMember?.nome}</strong>
            </p>
            
            <form onSubmit={handleUpdatePassword}>
              <div className="form-group">
                <label className="form-label">Nova Senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                  <input 
                    type="password" 
                    required 
                    placeholder="Mínimo 5 caracteres" 
                    className="form-input" 
                    style={{ paddingLeft: '44px' }}
                    value={newPasswordData.password} 
                    onChange={(e) => setNewPasswordData({ ...newPasswordData, password: e.target.value })} 
                  />
                </div>
                <PasswordRulesList password={newPasswordData.password} />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Confirmar Nova Senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                  <input 
                    type="password" 
                    required 
                    placeholder="Repita a nova senha" 
                    className="form-input" 
                    style={{ paddingLeft: '44px' }}
                    value={newPasswordData.confirmPassword} 
                    onChange={(e) => setNewPasswordData({ ...newPasswordData, confirmPassword: e.target.value })} 
                  />
                </div>
                {newPasswordData.confirmPassword && newPasswordData.password !== newPasswordData.confirmPassword && (
                  <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px' }}>As senhas não coincidem.</p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setPasswordModalOpen(false); setSelectedMember(null); }} disabled={submitting}>
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submitting || !isPasswordValid(newPasswordData.password) || newPasswordData.password !== newPasswordData.confirmPassword}
                >
                  {submitting ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .sellers-page-header {
          align-items: flex-start;
        }

        .sellers-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin: -10px 0 24px;
        }

        .sellers-summary-card {
          padding: 18px;
          display: grid;
          gap: 8px;
        }

        .sellers-summary-card span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .sellers-summary-card strong {
          color: var(--text-primary);
          font-family: var(--font-title);
          font-size: 28px;
          line-height: 1;
        }

        .sellers-summary-card--success strong {
          color: var(--success);
        }

        .sellers-table-card {
          border-color: rgba(255, 255, 255, 0.09);
        }

        .sellers-table-card table tbody tr {
          transition: background var(--transition-fast);
        }

        .sellers-table-card table tbody tr:hover {
          background: rgba(245, 158, 11, 0.035);
        }

        .seller-access-avatar-button {
          position: absolute;
          right: -4px;
          bottom: -4px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 1px solid rgba(245, 158, 11, 0.35);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(15, 18, 27, 0.96));
          color: var(--primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
        }

        .seller-access-avatar-button:focus-visible {
          outline: 2px solid rgba(245, 158, 11, 0.88);
          outline-offset: 2px;
        }

        @media (max-width: 768px) {
          .sellers-page-header {
            display: grid;
            gap: 16px;
          }

          .sellers-page-header .btn {
            width: 100%;
          }

          .sellers-summary-grid {
            grid-template-columns: 1fr;
            margin-top: -6px;
          }

          .seller-access-avatar-button {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>
    </div>
  );
}
