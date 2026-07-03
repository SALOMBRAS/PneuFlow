import { useEffect, useState, useCallback, useRef } from 'react';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
import { Save, Check, ExternalLink, Zap, MapPin, Palette, Upload, Loader2, Image as ImageIcon, Copy, Clock3, CalendarDays, CarFront, Bike } from 'lucide-react';

const WEEK_DAYS = [
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
];

const createDefaultBusinessHours = () =>
  WEEK_DAYS.reduce((acc, day) => {
    acc[day.key] = { enabled: day.key !== 'sunday', open: '08:00', close: '18:00' };
    if (day.key === 'saturday') acc[day.key] = { enabled: false, open: '08:00', close: '13:00' };
    if (day.key === 'sunday') acc[day.key] = { enabled: false, open: '08:00', close: '18:00' };
    return acc;
  }, {});

const AllVehiclesIcon = () => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} aria-hidden="true">
    <CarFront size={18} />
    <Bike size={18} />
  </span>
);

const VEHICLE_TYPE_OPTIONS = [
  {
    value: 'ambos',
    label: 'Todos',
    description: 'Carros e motos',
    Icon: AllVehiclesIcon
  },
  {
    value: 'carro',
    label: 'Carros',
    description: 'Somente carros',
    Icon: CarFront
  },
  {
    value: 'moto',
    label: 'Motos',
    description: 'Somente motos',
    Icon: Bike
  }
];

const formatPostalCode = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const normalizeBusinessHours = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return WEEK_DAYS.reduce((acc, day) => {
      const current = value[day.key] || {};
      acc[day.key] = {
        enabled: Boolean(current.enabled),
        open: typeof current.open === 'string' ? current.open : '08:00',
        close: typeof current.close === 'string' ? current.close : '18:00'
      };
      return acc;
    }, createDefaultBusinessHours());
  }
  return createDefaultBusinessHours();
};

export default function StoreSettings() {
  const { store, refreshStore } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [logo, setLogo] = useState('');
  const [description, setDescription] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [businessHours, setBusinessHours] = useState(createDefaultBusinessHours());
  const [scheduleDraft, setScheduleDraft] = useState(createDefaultBusinessHours());
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [tipoVitrine, setTipoVitrine] = useState('carro');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [postalCodeLookup, setPostalCodeLookup] = useState({ loading: false, error: '' });
  const [lastLookupPostalCode, setLastLookupPostalCode] = useState('');
  const postalLookupTokenRef = useRef(0);
  const addressAutosaveTimerRef = useRef(null);
  const addressAutosaveBusyRef = useRef(false);
  const addressAutosaveSnapshotRef = useRef('');

  useEffect(() => {
    if (store) {
      setName(store.nome || '');
      setPhone(store.telefone || '');
      setWhatsapp(store.whatsapp || '');
      setAddress(store.endereco || '');
      setPostalCode(formatPostalCode(store.postal_code || ''));
      setAddressNumber(store.address_number || '');
      setAddressComplement(store.address_complement || '');
      setNeighborhood(store.neighborhood || '');
      setCity(store.cidade || '');
      setState(store.estado || '');
      setLogo(store.logo || '');
      setSeoTitle(store.seo_titulo || '');
      setSeoDescription(store.seo_descricao || '');
      setTipoVitrine(store.tipo_vitrine || 'carro');
      setDescription(store.description || '');
      setBusinessHours(normalizeBusinessHours(store.business_hours));
      setScheduleDraft(normalizeBusinessHours(store.business_hours));
      setScheduleDirty(false);
      setLastLookupPostalCode(String(store.postal_code || '').replace(/\D/g, '').slice(0, 8));
      addressAutosaveSnapshotRef.current = JSON.stringify({
        postalCode: String(store.postal_code || '').replace(/\D/g, '').slice(0, 8),
        address: store.endereco || '',
        addressNumber: store.address_number || '',
        addressComplement: store.address_complement || '',
        neighborhood: store.neighborhood || '',
        city: store.cidade || '',
        state: store.estado || ''
      });
    }
  }, [store]);

  const buildAddressSnapshot = useCallback(() => JSON.stringify({
    postalCode: postalCode.replace(/\D/g, ''),
    address: address.trim(),
    addressNumber: addressNumber.trim(),
    addressComplement: addressComplement.trim(),
    neighborhood: neighborhood.trim(),
    city: city.trim(),
    state: state.trim().toUpperCase()
  }), [postalCode, address, addressNumber, addressComplement, neighborhood, city, state]);

  const persistAddressFields = useCallback(async ({ silent = false } = {}) => {
    if (!store?.id || addressAutosaveBusyRef.current) return null;

    addressAutosaveBusyRef.current = true;
    const cleanPostalCode = postalCode.replace(/\D/g, '');

    try {
      const updated = await storageService.updateStore(store.id, {
        name,
        whatsapp: whatsapp.replace(/\D/g, '').startsWith('55') ? whatsapp.replace(/\D/g, '') : `55${whatsapp.replace(/\D/g, '')}`,
        phone,
        postalCode: cleanPostalCode,
        address,
        addressNumber,
        addressComplement,
        neighborhood,
        city,
        state,
        logo,
        banner: store.banner,
        cover: store.foto_capa,
        description,
        seoTitle,
        seoDescription,
        tipo_vitrine: tipoVitrine,
        business_hours: businessHours
      });

      if (updated) {
        setPostalCode(formatPostalCode(updated.postal_code || cleanPostalCode));
        setAddress(updated.endereco || address);
        setAddressNumber(updated.address_number || addressNumber);
        setAddressComplement(updated.address_complement || addressComplement);
        setNeighborhood(updated.neighborhood || neighborhood);
        setCity(updated.cidade || city);
        setState(updated.estado || state);
        await refreshStore();
        addressAutosaveSnapshotRef.current = JSON.stringify({
          postalCode: updated.postal_code || cleanPostalCode,
          address: updated.endereco || address,
          addressNumber: updated.address_number || addressNumber,
          addressComplement: updated.address_complement || addressComplement,
          neighborhood: updated.neighborhood || neighborhood,
          city: updated.cidade || city,
          state: updated.estado || state
        });
        if (!silent) {
          setMessage('Endereço salvo automaticamente.');
          setIsSuccess(true);
          setTimeout(() => setMessage(''), 2200);
        }
      }

      return updated;
    } catch (error) {
      console.error('Erro ao salvar endereço automaticamente:', error);
      if (!silent) {
        setMessage('Não foi possível salvar o endereço automaticamente.');
        setIsSuccess(false);
      }
      return null;
    } finally {
      addressAutosaveBusyRef.current = false;
    }
  }, [
    store?.id,
    postalCode,
    address,
    addressNumber,
    addressComplement,
    neighborhood,
    city,
    state,
    whatsapp,
    phone,
    name,
    logo,
    description,
    seoTitle,
    seoDescription,
    tipoVitrine,
    businessHours,
    refreshStore
  ]);

  useEffect(() => {
    if (!store?.id) return undefined;

    const currentSnapshot = buildAddressSnapshot();
    if (currentSnapshot === addressAutosaveSnapshotRef.current) {
      return undefined;
    }

    window.clearTimeout(addressAutosaveTimerRef.current);
    addressAutosaveTimerRef.current = window.setTimeout(() => {
      persistAddressFields({ silent: true }).catch(() => {});
    }, 900);

    return () => window.clearTimeout(addressAutosaveTimerRef.current);
  }, [store?.id, buildAddressSnapshot, persistAddressFields]);

  const handleImageUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Por favor, selecione um arquivo de imagem válido.');
      setIsSuccess(false);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('A imagem deve ter no máximo 2MB.');
      setIsSuccess(false);
      return;
    }

    let setter;
    let loadingSetter;
    if (type === 'logo') {
      setter = setLogo;
      loadingSetter = setUploadingLogo;
    }

    loadingSetter(true);
    try {
      const publicUrl = await storageService.uploadStoreImage(file);
      setter(publicUrl);
      setMessage('Upload concluído com sucesso!');
      setIsSuccess(true);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Erro no upload:', err);
      setMessage('Erro ao fazer upload da imagem.');
      setIsSuccess(false);
    } finally {
      loadingSetter(false);
    }
  };

  const runPostalCodeLookup = useCallback(async (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length !== 8) {
      setPostalCodeLookup((current) => ({ ...current, error: '' }));
      return;
    }

    if (digits === lastLookupPostalCode) return;

    const lookupId = postalLookupTokenRef.current + 1;
    postalLookupTokenRef.current = lookupId;
    setPostalCodeLookup({ loading: true, error: '' });

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!response.ok) {
        throw new Error('lookup_failed');
      }

      const data = await response.json();
      if (postalLookupTokenRef.current !== lookupId) return;

      if (data?.erro) {
        setPostalCodeLookup({ loading: false, error: 'CEP não encontrado.' });
        return;
      }

      setLastLookupPostalCode(digits);
      setAddress(data.logradouro || '');
      setNeighborhood(data.bairro || '');
      setCity(data.localidade || '');
      setState((data.uf || '').toUpperCase());
      setPostalCodeLookup({ loading: false, error: '' });
    } catch {
      if (postalLookupTokenRef.current !== lookupId) return;
      setPostalCodeLookup({
        loading: false,
        error: 'Não foi possível consultar o CEP. Preencha o endereço manualmente.'
      });
    }
  }, [lastLookupPostalCode]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!name.trim()) {
      setMessage('O nome da loja é obrigatório.');
      setIsSuccess(false);
      return;
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.length < 10) {
      setMessage('Insira um número de WhatsApp comercial válido.');
      setIsSuccess(false);
      return;
    }

    setSaving(true);
    try {
      const updated = await storageService.updateStore(store.id, {
        name,
        whatsapp: cleanWhatsapp.startsWith('55') ? cleanWhatsapp : `55${cleanWhatsapp}`,
        phone,
        postalCode: postalCode.replace(/\D/g, ''),
        address,
        addressNumber,
        addressComplement,
        neighborhood,
        city,
        state,
        logo,
        banner: store.banner,
        cover: store.foto_capa,
        description,
        seoTitle,
        seoDescription,
        tipo_vitrine: tipoVitrine,
        business_hours: businessHours
      });

      if (updated) {
        setPostalCode(formatPostalCode(updated.postal_code || postalCode));
        setAddress(updated.endereco || address);
        setAddressNumber(updated.address_number || addressNumber);
        setAddressComplement(updated.address_complement || addressComplement);
        setNeighborhood(updated.neighborhood || neighborhood);
        setCity(updated.cidade || city);
        setState(updated.estado || state);
        await refreshStore();
        setMessage('Configurações salvas com sucesso!');
        setIsSuccess(true);
      }

      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações da vitrine:', error);
      setMessage('Ocorreu um erro ao salvar as configurações.');
      setIsSuccess(false);
    } finally {
      setSaving(false);
    }
  };

  if (!store) return null;

  const publicLink = `${window.location.origin}/store/${store.slug}`;
  const updateDayHours = (dayKey, patch) => {
    setScheduleDraft((current) => ({
      ...current,
      [dayKey]: { ...current[dayKey], ...patch }
    }));
    setScheduleDirty(true);
  };

  const copyWeekdayHours = (dayKey) => {
    const source = scheduleDraft[dayKey];
    if (!source) return;
    setScheduleDraft((current) =>
      WEEK_DAYS.reduce((acc, day) => {
        acc[day.key] = day.key === 'sunday'
          ? current[day.key]
          : { ...source, enabled: day.key === 'saturday' ? false : source.enabled };
        return acc;
      }, { ...current })
    );
    setScheduleDirty(true);
  };

  const applyMondayToWeekdays = () => {
    const source = scheduleDraft.monday;
    if (!source) return;

    setScheduleDraft((current) =>
      WEEK_DAYS.reduce((acc, day) => {
        if (day.key === 'saturday' || day.key === 'sunday') {
          acc[day.key] = current[day.key];
          return acc;
        }

        acc[day.key] = { ...source, enabled: source.enabled };
        return acc;
        }, { ...current })
    );
    setScheduleDirty(true);
  };

  const getFirstOpenDay = () => WEEK_DAYS.find((day) => scheduleDraft[day.key]?.enabled && scheduleDraft[day.key]?.open && scheduleDraft[day.key]?.close);

  const copyFirstOpenDayToOpenDays = () => {
    const sourceDay = getFirstOpenDay();
    if (!sourceDay) return;

    const confirmCopy = window.confirm(`Copiar o horário de ${sourceDay.label} para os demais dias abertos?`);
    if (!confirmCopy) return;

    const source = scheduleDraft[sourceDay.key];
    setScheduleDraft((current) =>
      WEEK_DAYS.reduce((acc, day) => {
        const currentDay = current[day.key] || {};
        if (!currentDay.enabled) {
          acc[day.key] = currentDay;
          return acc;
        }

        acc[day.key] = { ...source, enabled: true };
        return acc;
      }, { ...current })
    );
    setScheduleDirty(true);
  };

  const openScheduleModal = () => {
    setScheduleDraft(businessHours);
    setScheduleDirty(false);
    setScheduleModalOpen(true);
  };

  const closeScheduleModal = () => {
    if (scheduleDirty && !window.confirm('Descartar as alterações de horários?')) {
      return;
    }
    setScheduleDraft(businessHours);
    setScheduleDirty(false);
    setScheduleModalOpen(false);
  };

  const handleSaveSchedule = () => {
    setBusinessHours(scheduleDraft);
    setScheduleDirty(false);
    setScheduleModalOpen(false);
  };

  const businessHoursSummary = (() => {
    const openDays = WEEK_DAYS.filter((day) => businessHours[day.key]?.enabled);
    if (!openDays.length) return 'Horários desativados';
    const firstOpen = openDays[0];
    const lastOpen = openDays[openDays.length - 1];
    const weekdaySpan = openDays.length === 5 && openDays[0]?.key === 'monday' && openDays[4]?.key === 'friday';
    const range = firstOpen ? `${businessHours[firstOpen.key].open} às ${businessHours[firstOpen.key].close}` : '';
    const weekendClosed = !businessHours.saturday?.enabled && !businessHours.sunday?.enabled;
    return [
      weekdaySpan ? 'Seg a Sex' : firstOpen?.label,
      range,
      weekendClosed ? 'Sáb/Dom fechado' : lastOpen?.label
    ].filter(Boolean).join(' • ');
  })();

  const renderScheduleEditor = () => (
    <>
      <div className="store-hours-panel__toolbar">
        <div>
          <strong>Ativar horários</strong>
          <p>Use os chips para abrir ou fechar cada dia sem perder os horários já cadastrados.</p>
        </div>
        <div className="store-hours-panel__actions">
          <button type="button" className="btn btn-secondary store-hours-apply-weekdays" onClick={applyMondayToWeekdays}>
            <CalendarDays size={14} />
            Aplicar segunda aos dias úteis
          </button>
          <button type="button" className="btn btn-secondary store-hours-apply-weekdays" onClick={copyFirstOpenDayToOpenDays}>
            <Copy size={14} />
            Copiar horário para todos
          </button>
        </div>
      </div>

      <div className="store-hours-chips" aria-label="Dias da semana">
        {WEEK_DAYS.map((day) => {
          const current = scheduleDraft[day.key] || {};
          return (
            <button
              key={day.key}
              type="button"
              className={`store-hours-chip ${current.enabled ? 'is-open' : 'is-closed'}`}
              onClick={() => updateDayHours(day.key, { enabled: !current.enabled })}
              aria-label={day.label}
              title={day.label}
            >
              {day.label.charAt(0)}
            </button>
          );
        })}
      </div>

      <div className="store-hours-list">
        {WEEK_DAYS.map((day) => {
          const current = scheduleDraft[day.key] || {};
          const isOpen = Boolean(current.enabled);
          return (
            <div key={day.key} className={`store-hours-row ${isOpen ? '' : 'is-closed'}`}>
              <div className="store-hours-cell store-hours-cell--day">
                <strong>{day.label}</strong>
              </div>
              <div className="store-hours-cell store-hours-cell--status">
                <button
                  type="button"
                  className={`store-hours-switch ${isOpen ? 'is-open' : 'is-closed'}`}
                  onClick={() => updateDayHours(day.key, { enabled: !isOpen })}
                  aria-label={`${isOpen ? 'Fechar' : 'Abrir'} ${day.label}`}
                >
                  <span className="store-hours-switch__track" aria-hidden="true">
                    <span className="store-hours-switch__thumb" />
                  </span>
                  <span className="store-hours-switch__label">{isOpen ? 'Aberto' : 'Fechado'}</span>
                </button>
              </div>
              <div className="store-hours-cell store-hours-cell--open">
                {isOpen ? (
                  <input
                    type="time"
                    className="form-input store-hours-time-input"
                    value={current.open || ''}
                    onChange={(e) => updateDayHours(day.key, { open: e.target.value })}
                  />
                ) : (
                  <span className="store-hours-closed-text">Fechado</span>
                )}
              </div>
              <div className="store-hours-cell store-hours-cell--separator">até</div>
              <div className="store-hours-cell store-hours-cell--close">
                {isOpen ? (
                  <input
                    type="time"
                    className="form-input store-hours-time-input"
                    value={current.close || ''}
                    onChange={(e) => updateDayHours(day.key, { close: e.target.value })}
                  />
                ) : (
                  <span className="store-hours-closed-text">Fechado</span>
                )}
              </div>
              <div className="store-hours-cell store-hours-cell--action">
                {isOpen ? (
                  <button
                    type="button"
                    className="store-hours-icon-btn"
                    onClick={() => copyWeekdayHours(day.key)}
                    title="Copiar este horário para os dias abertos"
                    aria-label={`Copiar horário de ${day.label}`}
                  >
                    <Copy size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const ImageUploadField = ({ id, label, value, uploading, onUpload }) => (
    <div className="form-group store-settings-upload">
      <label className="form-label">{label}</label>
      <div className="store-settings-upload-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--border)',
        minWidth: 0
      }}>
        {value ? (
          <div className="store-settings-upload-preview" style={{ position: 'relative', width: 'fit-content', maxWidth: '100%' }}>
            <img
              src={value}
              alt={label}
              loading="lazy"
              decoding="async"
              width={id === 'store-logo' ? '160' : '320'}
              height={id === 'store-logo' ? '80' : '120'}
              style={{
                maxWidth: '100%',
                maxHeight: id === 'store-logo' ? '80px' : '120px',
                borderRadius: 'var(--radius-sm)',
                objectFit: 'contain'
              }}
            />
            <div style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: 'var(--success)',
              borderRadius: '50%',
              padding: '2px'
            }}>
              <Check size={12} color="black" />
            </div>
          </div>
        ) : (
          <div style={{
            height: id === 'store-logo' ? '80px' : '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-muted)'
          }}>
            <ImageIcon size={32} opacity={0.3} />
          </div>
        )}

        <div className="store-settings-upload-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <label
            htmlFor={id}
            className={`btn ${uploading ? 'btn-disabled' : 'btn-outline'} store-settings-upload-button`}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0
            }}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Enviando...' : value ? 'Alterar Imagem' : 'Escolher Arquivo'}
            <input
              id={id}
              type="file"
              accept="image/*"
              onChange={onUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: 0 }}>PNG ou JPG, máx. 2MB</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade store-settings-page">
      <div className="pf-section-header store-settings-title-row">
        <div className="store-settings-title-copy">
          <span className="pf-kicker">Vitrine publica</span>
          <h1 style={{ fontSize: '32px', margin: 0, textAlign: 'left' }}>Configurações da Vitrine</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Personalize a identidade da sua loja e os dados de contato.</p>
        </div>
        <a
          href={publicLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline store-settings-visualize-btn"
          style={{ fontSize: '14px' }}
        >
          Visualizar Vitrine <ExternalLink size={14} style={{ marginLeft: '4px' }} />
        </a>
      </div>

      <div className="store-settings-preview pf-card-premium">
        <div className="store-settings-preview__brand">
          <div className="store-settings-preview__logo">
            {logo ? <img src={logo} alt="" loading="lazy" decoding="async" /> : <Zap size={20} />}
          </div>
          <div>
            <span className="pf-badge-soft">Preview da loja</span>
            <h2>{name || store.nome || 'Nome da loja'}</h2>
            <p>{description || 'Descricao curta da loja para gerar confianca no comprador.'}</p>
          </div>
        </div>
        <div className="store-settings-preview__meta">
          <span>{city || 'Cidade'}{state ? `, ${state}` : ''}</span>
          <strong>{whatsapp ? 'WhatsApp configurado' : 'Configure o WhatsApp'}</strong>
        </div>
      </div>

      {message && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: isSuccess ? 'var(--success-glow)' : 'var(--error-glow)',
          border: `1px solid ${isSuccess ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          color: isSuccess ? 'var(--success)' : 'var(--error)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '14px',
          marginBottom: '24px',
          textAlign: 'left',
          minWidth: 0
        }}>
          {isSuccess ? <Check size={18} /> : <Loader2 size={18} className="animate-spin" />}
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="store-settings-form" style={{ textAlign: 'left', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div className="store-settings-grid">
          <div className="card store-settings-card store-settings-card--details" style={{ padding: '24px', minWidth: 0 }}>
            <h3 className="store-settings-section-title" style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <MapPin size={20} style={{ color: 'var(--primary)' }} /> Informações da Loja
            </h3>

            <div className="form-group">
              <label className="form-label" htmlFor="store-name">Nome da Loja</label>
              <input
                id="store-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mundial Pneus"
              />
            </div>

            <div className="store-settings-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', minWidth: 0 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="store-whatsapp">WhatsApp (Leads)</label>
                <input
                  id="store-whatsapp"
                  type="text"
                  className="form-input"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="11999999999"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="store-phone">Telefone Fixo</label>
                <input
                  id="store-phone"
                  type="text"
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="1133334444"
                />
              </div>
            </div>

            <div className="store-settings-address-grid">
              <div className="form-group store-settings-address-grid__cep">
                <label className="form-label" htmlFor="store-postal-code">CEP</label>
                <div className="store-settings-postal-wrapper">
                  <input
                    id="store-postal-code"
                    type="text"
                    inputMode="numeric"
                    className="form-input"
                    value={postalCode}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setPostalCode(formatPostalCode(digits));
                      if (digits.length === 8) {
                        runPostalCodeLookup(digits);
                      } else {
                        setPostalCodeLookup({ loading: false, error: '' });
                      }
                    }}
                    onBlur={() => runPostalCodeLookup(postalCode)}
                    placeholder="00000-000"
                  />
                  {postalCodeLookup.loading ? <span className="store-settings-postal-status">Consultando...</span> : null}
                </div>
              </div>

              <div className="form-group store-settings-address-grid__street">
                <label className="form-label" htmlFor="store-address">Rua / Logradouro</label>
                <input
                  id="store-address"
                  type="text"
                  className="form-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua Exemplo"
                />
              </div>

              <div className="store-settings-address-grid__row">
                <div className="form-group">
                  <label className="form-label" htmlFor="store-number">Número</label>
                  <input
                    id="store-number"
                    type="text"
                    className="form-input"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    placeholder="Ex.: 125"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="store-complement">Complemento</label>
                  <input
                    id="store-complement"
                    type="text"
                    className="form-input"
                    value={addressComplement}
                    onChange={(e) => setAddressComplement(e.target.value)}
                    placeholder="Ex.: Sala 02"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="store-neighborhood">Bairro</label>
                  <input
                    id="store-neighborhood"
                    type="text"
                    className="form-input"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
              </div>
            </div>

            {postalCodeLookup.error ? (
              <div className="store-settings-postal-error" role="status">
                {postalCodeLookup.error}
              </div>
            ) : null}

            <div className="store-settings-city-state" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', minWidth: 0 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="store-city">Cidade</label>
                <input
                  id="store-city"
                  type="text"
                  className="form-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="store-state">Estado (UF)</label>
                <input
                  id="store-state"
                  type="text"
                  className="form-input"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  placeholder="SP"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Minha loja vende pneus para:</label>
              <p className="form-helper store-settings-vehicle-helper">Escolha quais veículos serão exibidos na sua vitrine.</p>
              <div className="store-settings-vehicle-select">
                <select
                  className="form-input store-settings-vehicle-select__native"
                  value={tipoVitrine}
                  onChange={(e) => setTipoVitrine(e.target.value)}
                >
                  <option value="ambos">Todos</option>
                  <option value="carro">Carros</option>
                  <option value="moto">Motos</option>
                </select>

                <div className="store-settings-vehicle-cards" role="radiogroup" aria-label="Minha loja vende pneus para">
                  {VEHICLE_TYPE_OPTIONS.map(({ value, label, description, Icon }) => {
                    const selected = tipoVitrine === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`store-settings-vehicle-card ${selected ? 'is-selected' : ''}`}
                        onClick={() => setTipoVitrine(value)}
                      >
                        <span className="store-settings-vehicle-card__icon" aria-hidden="true">
                          <Icon size={28} />
                        </span>
                        <span className="store-settings-vehicle-card__content">
                          <strong>{label}</strong>
                          <span>{description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="card store-settings-card store-settings-card--identity" style={{ padding: '24px', minWidth: 0 }}>
            <h3 className="store-settings-section-title" style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <Palette size={20} style={{ color: 'var(--primary)' }} /> Identidade da Loja
            </h3>

            <ImageUploadField
              id="store-logo"
              label="Logotipo da Loja"
              value={logo}
              uploading={uploadingLogo}
              onUpload={(e) => handleImageUpload(e, 'logo')}
            />

            <div className="form-group">
              <label className="form-label" htmlFor="store-description">Descrição Breve (Bio)</label>
              <textarea
                id="store-description"
                rows="3"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fale brevemente sobre sua loja..."
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="card store-settings-card store-settings-card--hours" style={{ padding: '24px', minWidth: 0 }}>
            <h3 className="store-settings-section-title" style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <Clock3 size={20} style={{ color: 'var(--primary)' }} /> Horários de funcionamento
            </h3>

            <div className="store-hours-summary-card">
              <div>
                <strong>Horários configurados</strong>
                <p>{businessHoursSummary}</p>
              </div>
              <button type="button" className="btn btn-primary store-hours-summary-action" onClick={openScheduleModal}>
                <Clock3 size={16} />
                Escolher horário de funcionamento
              </button>
            </div>
          </div>
        </div>

        <div className="store-settings-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', paddingBottom: '40px' }}>
          <button type="submit" className="btn btn-primary store-settings-save-btn" style={{ minWidth: '180px' }} disabled={saving || uploadingLogo}>
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>

      {scheduleModalOpen ? (
        <div
          className="store-hours-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="store-hours-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeScheduleModal();
          }}
        >
          <div className="store-hours-modal__dialog" onMouseDown={(e) => e.stopPropagation()}>
            <div className="store-hours-modal__header">
              <div>
                <h3 id="store-hours-modal-title">Horários de funcionamento</h3>
                <p>Edite a disponibilidade da loja sem sair da tela de configurações.</p>
              </div>
              <button type="button" className="store-hours-modal__close" onClick={closeScheduleModal} aria-label="Fechar modal">
                ×
              </button>
            </div>

            <div className="store-hours-panel store-hours-panel--modal">
              {renderScheduleEditor()}
            </div>

            <div className="store-hours-modal__footer">
              <button type="button" className="btn btn-secondary" onClick={closeScheduleModal}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={handleSaveSchedule}>Salvar horários</button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .store-settings-page {
          min-width: 0;
        }

        .store-settings-title-row {
          align-items: flex-start;
        }

        .store-settings-preview {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin: -12px 0 24px;
          padding: 20px;
          border-radius: var(--radius-card);
        }

        .store-settings-preview__brand {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .store-settings-preview__logo {
          width: 60px;
          height: 60px;
          flex: 0 0 auto;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, var(--primary), var(--color-accent));
          color: #080b10;
          overflow: hidden;
        }

        .store-settings-preview__logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .store-settings-preview h2 {
          margin: 10px 0 4px;
          font-size: 24px;
        }

        .store-settings-preview p {
          margin: 0;
          max-width: 52ch;
          color: var(--text-secondary);
          line-height: 1.55;
        }

        .store-settings-preview__meta {
          display: grid;
          gap: 6px;
          justify-items: end;
          color: var(--text-secondary);
          font-size: 13px;
          text-align: right;
          flex: 0 0 auto;
        }

        .store-settings-preview__meta strong {
          color: var(--success);
        }

        .store-settings-page h1,
        .store-settings-page h3,
        .store-settings-page p,
        .store-settings-page label,
        .store-settings-page span {
          overflow-wrap: anywhere;
        }

        .store-settings-page .card,
        .store-settings-page .form-group,
        .store-settings-page .store-settings-upload-panel {
          min-width: 0;
        }

        .store-settings-grid {
          display: grid;
          gap: 24px;
          align-items: stretch;
        }

        .store-settings-card--details {
          grid-area: details;
        }

        .store-settings-card--identity {
          grid-area: identity;
        }

        .store-settings-card--hours {
          grid-area: hours;
        }

        @media (min-width: 1200px) {
          .store-settings-grid {
            grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
            grid-template-areas:
              'details identity'
              'details hours';
          }
        }

        @media (min-width: 768px) and (max-width: 1199px) {
          .store-settings-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              'details details'
              'identity hours';
          }
        }

        @media (max-width: 767px) {
          .store-settings-grid {
            grid-template-columns: 1fr;
            grid-template-areas:
              'details'
              'identity'
              'hours';
          }
        }

        .store-settings-upload-panel {
          width: 100%;
        }

        .store-settings-upload-preview {
          max-width: 100%;
        }

        .store-settings-upload-preview img {
          display: block;
          max-width: 100%;
        }

        .store-settings-upload-actions {
          flex-wrap: wrap;
        }

        .store-settings-address-grid {
          display: grid;
          gap: 16px;
          min-width: 0;
          grid-template-columns: 120px minmax(0, 1fr);
          grid-template-areas:
            'cep street'
            'row row'
            'neighborhood neighborhood';
        }

        .store-settings-address-grid__cep {
          grid-area: cep;
        }

        .store-settings-address-grid__street {
          grid-area: street;
        }

        .store-settings-address-grid__row {
          grid-area: row;
          display: grid;
          grid-template-columns: minmax(90px, 0.55fr) minmax(150px, 1fr) minmax(180px, 1.35fr);
          gap: 12px;
          min-width: 0;
        }

        .store-settings-postal-wrapper {
          display: grid;
          gap: 8px;
        }

        .store-settings-postal-status {
          color: var(--text-muted);
          font-size: 12px;
        }

        .store-settings-postal-error {
          padding: 12px 14px;
          border: 1px solid rgba(245, 158, 11, 0.24);
          border-radius: var(--radius-md);
          background: rgba(255,255,255,0.02);
          color: var(--text-secondary);
          font-size: 13px;
        }

        .store-settings-vehicle-helper {
          margin: 6px 0 12px;
          color: var(--text-muted);
          font-size: 12px;
        }

        .store-settings-vehicle-select {
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .store-settings-vehicle-cards {
          display: none;
          gap: 12px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .store-settings-vehicle-card {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 108px;
          padding: 16px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.03);
          color: var(--text-secondary);
          text-align: left;
          cursor: pointer;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
        }

        .store-settings-vehicle-card:hover {
          transform: translateY(-1px);
          border-color: rgba(245, 158, 11, 0.24);
        }

        .store-settings-vehicle-card.is-selected {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.94), rgba(251, 146, 60, 0.92));
          color: #111827;
          border-color: rgba(245, 158, 11, 0.72);
          box-shadow: 0 12px 28px rgba(245, 158, 11, 0.15);
        }

        .store-settings-vehicle-card__icon {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: rgba(255,255,255,0.08);
          flex: 0 0 auto;
        }

        .store-settings-vehicle-card.is-selected .store-settings-vehicle-card__icon {
          background: rgba(17,24,39,0.12);
        }

        .store-settings-vehicle-card__content {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .store-settings-vehicle-card__content strong {
          font-size: 15px;
          line-height: 1.1;
        }

        .store-settings-vehicle-card__content span {
          font-size: 12px;
          line-height: 1.35;
          color: inherit;
          opacity: 0.82;
        }

        .store-settings-vehicle-select__native {
          display: block;
        }

        .store-hours-panel {
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .store-hours-summary-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          min-width: 0;
          padding: 16px 18px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: rgba(255,255,255,0.02);
        }

        .store-hours-summary-card strong {
          display: block;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .store-hours-summary-card p {
          margin: 0;
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .store-hours-summary-action {
          white-space: nowrap;
          flex: 0 0 auto;
          width: fit-content;
          max-width: 100%;
          padding-inline: 14px;
        }

        .store-hours-modal {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(3, 7, 18, 0.72);
          backdrop-filter: blur(10px);
        }

        .store-hours-modal__dialog {
          width: min(960px, 100%);
          max-height: min(88vh, 860px);
          overflow: auto;
          border-radius: 24px;
          border: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(17,24,39,0.98), rgba(10,14,23,0.98));
          box-shadow: 0 30px 80px rgba(0,0,0,0.5);
          padding: 18px;
          display: grid;
          gap: 14px;
        }

        .store-hours-modal__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .store-hours-modal__header h3 {
          margin: 0;
          font-size: 20px;
        }

        .store-hours-modal__header p {
          margin: 6px 0 0;
          color: var(--text-muted);
          font-size: 13px;
        }

        .store-hours-modal__close {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.04);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 22px;
          line-height: 1;
        }

        .store-hours-panel--modal {
          background: transparent;
        }

        .store-hours-modal__footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }

        .store-hours-panel__toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: rgba(255,255,255,0.02);
        }

        .store-hours-panel__toolbar strong {
          display: block;
          font-size: 14px;
        }

        .store-hours-panel__toolbar p {
          margin: 4px 0 0;
          color: var(--text-muted);
          font-size: 12px;
        }

        .store-hours-panel__actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
          max-width: 100%;
        }

        .store-hours-apply-weekdays {
          min-height: 36px;
          padding: 6px 10px !important;
          gap: 8px;
          white-space: nowrap;
        }

        .store-hours-chips {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          min-width: 0;
        }

        .store-hours-chip {
          min-width: 0;
          min-height: 34px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.03);
          color: var(--text-secondary);
          font-weight: 800;
          cursor: pointer;
        }

        .store-hours-chip.is-open {
          background: rgba(245, 158, 11, 0.18);
          color: #111827;
          border-color: rgba(245, 158, 11, 0.38);
        }

        .store-hours-chip.is-closed {
          background: rgba(255,255,255,0.04);
        }

        .store-hours-list {
          display: grid;
          gap: 0;
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
          background: rgba(255,255,255,0.02);
        }

        .store-hours-row {
          display: grid;
          grid-template-columns: minmax(90px, 1.1fr) minmax(110px, 0.95fr) minmax(120px, 1fr) 24px minmax(120px, 1fr) 36px;
          gap: 8px;
          align-items: center;
          min-width: 0;
          padding: 9px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          min-height: 60px;
        }

        .store-hours-row:last-child {
          border-bottom: 0;
        }

        .store-hours-row.is-closed {
          opacity: 0.72;
        }

        .store-hours-cell {
          min-width: 0;
        }

        .store-hours-cell--day strong {
          display: block;
          font-size: 14px;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .store-hours-cell--separator {
          color: var(--text-muted);
          text-align: center;
          font-size: 12px;
          white-space: nowrap;
        }

        .store-hours-switch {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          min-width: 0;
          cursor: pointer;
          user-select: none;
          border: 0;
          background: transparent;
          padding: 0;
        }

        .store-hours-switch__label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          font-size: 13px;
          white-space: nowrap;
        }

        .store-hours-switch__track {
          position: relative;
          width: 38px;
          height: 22px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid var(--border);
          transition: background 160ms ease, border-color 160ms ease;
        }

        .store-hours-switch__track::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--text-secondary);
          transition: transform 160ms ease, background 160ms ease;
        }

        .store-hours-switch.is-open .store-hours-switch__track {
          background: rgba(245, 158, 11, 0.18);
          border-color: rgba(245, 158, 11, 0.32);
        }

        .store-hours-switch.is-open .store-hours-switch__track::after {
          transform: translateX(16px);
          background: var(--primary);
        }

        .store-hours-switch.is-closed {
          opacity: 0.82;
        }

        .store-hours-time-input {
          min-height: 40px;
          height: 40px;
          width: 100%;
          min-width: 0;
        }

        .store-hours-time-input:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .store-hours-icon-btn {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: rgba(255,255,255,0.03);
          color: var(--text-secondary);
          cursor: pointer;
        }

        .store-hours-icon-btn:hover:not(:disabled) {
          color: var(--text-primary);
          border-color: rgba(245, 158, 11, 0.28);
        }

        .store-hours-icon-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        @media (max-width: 1024px) {
          .store-settings-seo-grid {
            grid-template-columns: 1fr !important;
          }

          .store-hours-modal__dialog {
            width: min(920px, 100%);
          }

          .store-hours-row {
            grid-template-columns: minmax(84px, 0.95fr) minmax(92px, 0.9fr) minmax(100px, 1fr) 24px minmax(100px, 1fr) 32px;
          }
        }

        @media (min-width: 1200px) {
          .store-settings-vehicle-select__native {
            display: none;
          }

          .store-settings-vehicle-cards {
            display: grid;
          }
        }

        @media (max-width: 768px) {
          .store-settings-title-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .store-settings-preview {
            flex-direction: column;
            align-items: stretch;
            margin-top: -4px;
          }

          .store-settings-preview__meta {
            justify-items: start;
            text-align: left;
          }

          .store-settings-title-row .btn {
            width: 100%;
            justify-content: center;
          }

          .store-settings-form {
            gap: 24px !important;
          }

          .store-settings-grid,
          .store-settings-seo-grid,
          .store-settings-two-col,
          .store-settings-address-grid,
          .store-settings-city-state {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .store-settings-address-grid {
            grid-template-areas:
              'cep'
              'street'
              'row'
              'neighborhood';
          }

          .store-settings-address-grid__row {
            grid-template-columns: 1fr;
          }

          .store-settings-card {
            padding: 20px 16px !important;
          }

          .store-settings-section-title {
            font-size: 16px !important;
          }

          .store-settings-upload-panel {
            padding: 14px !important;
          }

          .store-settings-upload-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .store-hours-row {
            grid-template-columns: 1fr 1fr;
            gap: 8px 10px;
            min-height: 0;
            padding: 10px 12px;
          }

          .store-hours-cell--day {
            grid-column: 1 / -1;
          }

          .store-hours-cell--status {
            justify-self: start;
          }

          .store-hours-cell--action {
            justify-self: end;
          }

          .store-hours-cell--separator {
            display: none;
          }

          .store-hours-list {
            border-radius: 14px;
          }

          .store-hours-panel__toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .store-hours-panel__actions {
            justify-content: stretch;
          }

          .store-hours-panel__actions .btn {
            flex: 1 1 160px;
          }

          .store-settings-upload-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .store-settings-upload-actions span {
            text-align: center;
          }

          .store-settings-vehicle-helper {
            margin-bottom: 8px;
          }

          .store-settings-footer {
            padding-bottom: 24px !important;
          }

          .store-settings-save-btn {
            width: 100%;
            justify-content: center;
            min-width: 0 !important;
          }

          .store-hours-summary-card {
            flex-direction: column;
            align-items: stretch;
          }

          .store-hours-summary-action {
            width: 100%;
            justify-content: center;
          }

          .store-hours-modal {
            padding: 12px;
          }

          .store-hours-modal__dialog {
            padding: 16px;
            border-radius: 18px;
          }

          .store-hours-modal__header,
          .store-hours-modal__footer {
            flex-direction: column;
            align-items: stretch;
          }

          .store-hours-modal__footer .btn {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .store-settings-page h1 {
            font-size: 28px !important;
            line-height: 1.05;
          }

          .store-settings-card {
            border-radius: 16px;
          }

          .store-settings-upload-preview {
            width: 100%;
          }

          .store-settings-upload-preview img {
            width: 100%;
            height: auto;
          }

          .store-hours-chips {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .store-hours-row {
            grid-template-columns: 1fr;
          }

          .store-hours-summary-card {
            gap: 12px;
          }

          .store-hours-summary-action {
            width: 100%;
          }

          .store-hours-modal__dialog {
            max-height: 92vh;
            padding: 14px;
          }

          .store-hours-modal__header h3 {
            font-size: 18px;
          }

          .store-hours-modal__header p {
            font-size: 12px;
          }

          .store-hours-cell--status,
          .store-hours-cell--open,
          .store-hours-cell--close,
          .store-hours-cell--action {
            grid-column: 1 / -1;
          }

          .store-hours-cell--status,
          .store-hours-cell--action {
            justify-self: start;
          }

          .store-settings-grid {
            grid-template-columns: 1fr;
            grid-template-areas:
              'details'
              'identity'
              'hours';
          }
        }
      `}</style>
    </div>
  );
}
