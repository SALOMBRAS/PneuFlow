import { useEffect, useState, useCallback } from 'react';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
import { useNotifications } from '../../hooks/useNotifications';
import { IMAGE_UPLOAD_ACCEPT } from '../../utils/imageOptimizer';
import CurrencyInput from '../../components/CurrencyInput';
import { formatBRLCurrency, parseBRLCurrency } from '../../utils/currency';
import {
  getAvailableOfferCount,
  getOfferBadgeLabel,
  getOfferDescriptor,
  getOfferRemainder,
  getOfferTitle,
  getQuantityPerOffer,
  isKitOffer,
  normalizeOfferQuantity
} from '../../utils/tireOffer';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Layers,
  Image as ImageIcon,
  Star,
  Upload,
  AlertCircle,
  Loader2,
  Package,
  TriangleAlert,
  Boxes
} from 'lucide-react';

const MAX_IMAGES_PER_TIRE = 2;

export default function Catalog() {
  const { store, isOwner } = useStore();
  const {
    createPersistentNotification,
    notifyTransientWarning
  } = useNotifications();
  const [tires, setTires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('');

  // Modals state
  const [tireModalOpen, setTireModalOpen] = useState(false);
  const [selectedTire, setSelectedTire] = useState(null);

  // Tire Form fields
  const [formData, setFormData] = useState({
    id: '',
    marca: '',
    modelo: '',
    titulo_anuncio: '',
    medida: '',
    preco: '',
    quantidade_por_anuncio: 1,
    estoque: 0,
    descricao: '',
    status: 'ativo',
    compatibilidade: '',
    tipo_veiculo: 'carro',
    foto_principal_url: '',
    fotos: []
  });

  const [tempPhotos, setTempPhotos] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  const focusField = useCallback((fieldName) => {
    if (typeof document === 'undefined' || !fieldName) return;
    const field = document.querySelector(`[name="${fieldName}"]`);
    if (!field) return;
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field.focus();
  }, []);

  const updateFieldValue = useCallback((name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantidade_por_anuncio'
        ? normalizeOfferQuantity(value, 1)
        : value
    }));

    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const getFieldError = useCallback((fieldName) => fieldErrors[fieldName] || '', [fieldErrors]);

  const getFieldProps = useCallback((fieldName) => (
    fieldErrors[fieldName]
      ? {
          'aria-invalid': true,
          'aria-describedby': `${fieldName}-error`,
          style: {
            borderColor: 'var(--error)',
            boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.22)'
          }
        }
      : {}
  ), [fieldErrors]);

  const validateTireForm = useCallback(() => {
    const errors = {};
    const trimmedTitle = String(formData.titulo_anuncio || '').trim();
    const parsedPrice = parseBRLCurrency(formData.preco);
    const quantityPerOffer = normalizeOfferQuantity(formData.quantidade_por_anuncio, 1);
    const stockValue = String(formData.estoque ?? '').trim() === ''
      ? 0
      : Number.parseInt(formData.estoque, 10);

    if (!String(formData.marca || '').trim()) {
      errors.marca = 'Informe a marca.';
    }

    if (!String(formData.modelo || '').trim()) {
      errors.modelo = 'Informe o modelo.';
    }

    if (!String(formData.medida || '').trim()) {
      errors.medida = 'Informe a medida.';
    }

    if (!String(formData.preco || '').trim()) {
      errors.preco = 'Informe o preço do anúncio.';
    } else if (parsedPrice == null) {
      errors.preco = 'Use um preço válido no formato brasileiro, como 355,55.';
    }

    if (String(formData.titulo_anuncio || '').length > 0 && !trimmedTitle) {
      errors.titulo_anuncio = 'O título não pode conter apenas espaços.';
    } else if (trimmedTitle.length > 100) {
      errors.titulo_anuncio = 'Use no máximo 100 caracteres no título do anúncio.';
    }

    if (!Number.isFinite(quantityPerOffer) || quantityPerOffer < 1) {
      errors.quantidade_por_anuncio = 'Informe pelo menos 1 pneu por anúncio.';
    }

    if (!Number.isFinite(stockValue) || stockValue < 0) {
      errors.estoque = 'Informe um estoque igual ou maior que 0.';
    }

    return {
      errors,
      parsedPrice,
      quantityPerOffer,
      trimmedTitle,
      stockValue: Math.max(0, stockValue || 0)
    };
  }, [formData]);

  const loadData = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    setLoadError('');
    try {
      const list = await storageService.getPneus(store.id);
      setTires(list);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setTires([]);
      setLoadError(err?.message || 'Não foi possível carregar os pneus agora.');
    } finally {
      setLoading(false);
    }
  }, [store]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddTireModal = () => {
    setFormData({
      id: '',
      marca: '',
      modelo: '',
      titulo_anuncio: '',
      medida: '',
      preco: '',
      quantidade_por_anuncio: 1,
      estoque: 0,
      descricao: '',
      status: 'ativo',
      compatibilidade: '',
      tipo_veiculo: 'carro',
      foto_principal_url: '',
      fotos: []
    });
    setTempPhotos([]);
    setFieldErrors({});
    setSelectedTire(null);
    setTireModalOpen(true);
  };

  const openEditTireModal = (tire) => {
    setFormData({
      id: tire.id,
      marca: tire.marca,
      modelo: tire.modelo,
      titulo_anuncio: tire.titulo_anuncio || '',
      medida: tire.medida,
      preco: Number(tire.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      quantidade_por_anuncio: getQuantityPerOffer(tire),
      estoque: tire.estoque,
      descricao: tire.descricao || '',
      status: tire.status || 'ativo',
      compatibilidade: tire.compatibilidade || '',
      tipo_veiculo: tire.tipo_veiculo || 'carro',
      foto_principal_url: tire.foto_principal_url || '',
      fotos: tire.fotos || []
    });
    setTempPhotos([]);
    setFieldErrors({});
    setSelectedTire(tire);
    setTireModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    updateFieldValue(
      name,
      type === 'checkbox'
        ? (checked ? 'ativo' : 'inativo')
        : value
    );
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentImages = [...new Set([formData.foto_principal_url, ...formData.fotos].filter(Boolean))];
    const currentCount = currentImages.length;

    if (currentCount >= MAX_IMAGES_PER_TIRE) {
      notifyTransientWarning({
        title: 'Limite de imagens',
        message: `Este anúncio já atingiu o limite de ${MAX_IMAGES_PER_TIRE} imagens.`,
        category: 'catalogo'
      });
      e.target.value = '';
      return;
    }

    if (files.length > MAX_IMAGES_PER_TIRE) {
      notifyTransientWarning({
        title: 'Limite de imagens',
        message: `Você pode enviar no máximo ${MAX_IMAGES_PER_TIRE} imagens por anúncio.`,
        category: 'catalogo'
      });
      e.target.value = '';
      return;
    }

    if (currentCount + files.length > MAX_IMAGES_PER_TIRE) {
      notifyTransientWarning({
        title: 'Espaco restante',
        message: `Voce so pode adicionar mais ${MAX_IMAGES_PER_TIRE - currentCount} imagem(ns).`,
        category: 'catalogo'
      });
      e.target.value = '';
      return;
    }

    setSubmitting(true);
    try {
      const urls = await storageService.uploadPneuImages(files, store.id);
      
      setFormData(prev => {
        const combined = [...new Set([...prev.fotos, ...urls].filter(Boolean))].slice(0, MAX_IMAGES_PER_TIRE);
        return {
          ...prev,
          fotos: combined,
          foto_principal_url: prev.foto_principal_url || combined[0] || ''
        };
      });
    } catch (err) {
      await createPersistentNotification({
        type: 'error',
        title: 'Falha no upload',
        message: err.message || 'Não foi possível enviar as fotos.',
        category: 'operation_errors'
      });
    } finally {
      setSubmitting(false);
      e.target.value = '';
    }
  };

  const setMainPhoto = (url) => {
    setFormData(prev => ({ ...prev, foto_principal_url: url }));
  };

  const removePhoto = (url) => {
    setFormData(prev => {
      const newFotos = prev.fotos.filter(f => f !== url);
      let newMain = prev.foto_principal_url;
      
      if (newMain === url) {
        newMain = newFotos.length > 0 ? newFotos[0] : '';
      }
      
      return {
        ...prev,
        fotos: newFotos,
        foto_principal_url: newMain
      };
    });
  };

  const handleSaveTire = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const {
      errors,
      parsedPrice,
      quantityPerOffer,
      trimmedTitle,
      stockValue
    } = validateTireForm();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusField(Object.keys(errors)[0]);
      notifyTransientWarning({
        title: 'Campos obrigatorios',
        message: errors[Object.keys(errors)[0]],
        category: 'catalogo'
      });
      return;
    }

    setSubmitting(true);
    try {
      if (!store?.id) {
        throw new Error('Loja não encontrada para o usuário logado. Recarregue a página ou faça login novamente.');
      }

      const pneuData = {
        loja_id: store.id,
        marca: formData.marca,
        modelo: formData.modelo,
        titulo_anuncio: trimmedTitle || null,
        medida: formData.medida,
        preco: parsedPrice,
        quantidade_por_anuncio: quantityPerOffer,
        estoque: stockValue,
        descricao: formData.descricao,
        status: formData.status,
        compatibilidade: formData.compatibilidade,
        tipo_veiculo: formData.tipo_veiculo,
        foto_principal_url: formData.foto_principal_url,
        fotos: formData.fotos
      };

      if (formData.id) {
        await storageService.updatePneu(formData.id, pneuData);
        await createPersistentNotification({
          type: 'success',
          title: 'Pneu atualizado',
          message: `${formData.marca} ${formData.modelo} foi atualizado com sucesso.`,
          category: 'general',
          actionPath: '/dashboard/catalog',
          entityType: 'pneu',
          entityId: formData.id
        });
      } else {
        const created = await storageService.createPneu(pneuData);
        await createPersistentNotification({
          type: 'success',
          title: 'Pneu cadastrado com sucesso.',
          message: `${formData.marca} ${formData.modelo} já está disponível no catálogo.`,
          category: 'general',
          actionPath: '/dashboard/catalog',
          entityType: 'pneu',
          entityId: created?.id || null
        });
      }

      setTireModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Erro completo ao salvar pneu:', error);
      await createPersistentNotification({
        type: 'error',
        title: 'Não foi possível concluir',
        message: error.message || 'Erro ao salvar pneu.',
        category: 'operation_errors'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTire = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este pneu? Esta ação não pode ser desfeita.')) {
      try {
        await storageService.deletePneu(id);
        await createPersistentNotification({
          type: 'success',
          title: 'Pneu removido',
          message: 'O pneu foi excluído do catálogo.',
          category: 'general',
          actionPath: '/dashboard/catalog'
        });
        loadData();
      } catch (err) {
        await createPersistentNotification({
          type: 'error',
          title: 'Não foi possível concluir',
          message: 'Erro ao excluir pneu.',
          category: 'operation_errors'
        });
      }
    }
  };

  const filteredTires = tires.filter(t => {
    const matchesSearch = t.modelo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.medida.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = filterBrand === '' || t.marca === filterBrand;
    return matchesSearch && matchesBrand;
  });

  const uniqueBrands = [...new Set(tires.map(t => t.marca))];
  const activeTiresCount = tires.filter((tire) => tire.status === 'ativo').length;
  const totalStockCount = tires.reduce((sum, tire) => sum + Number(tire.estoque || 0), 0);
  const parsedFormPrice = parseBRLCurrency(formData.preco);
  const formQuantityPerOffer = normalizeOfferQuantity(formData.quantidade_por_anuncio, 1);
  const formStock = Math.max(0, Number.parseInt(formData.estoque, 10) || 0);
  const formAvailableOffers = Math.floor(formStock / formQuantityPerOffer);
  const formRemainder = formStock % formQuantityPerOffer;
  const formOfferDescriptor = getOfferDescriptor({ quantidade_por_anuncio: formQuantityPerOffer });
  const formPreviewTitle = String(formData.titulo_anuncio || '').trim() || String(formData.modelo || '').trim();

  const getStockState = (stock) => {
    const qty = Number(stock || 0);

    if (qty <= 0) {
      return {
        label: 'Esgotado',
        tone: 'out',
        icon: TriangleAlert,
        badgeClass: 'catalog-stock-badge--out',
        cardClass: 'catalog-stock-card--out',
        ariaLabel: 'Esgotado'
      };
    }

    if (qty <= 3) {
      return {
        label: `Estoque baixo · ${qty}`,
        tone: 'low',
        icon: TriangleAlert,
        badgeClass: 'catalog-stock-badge--low',
        cardClass: 'catalog-stock-card--low',
        ariaLabel: `Estoque baixo, ${qty} unidades`
      };
    }

    return {
      label: `${qty} em estoque`,
      tone: 'available',
      icon: qty >= 12 ? Boxes : Package,
      badgeClass: 'catalog-stock-badge--available',
      cardClass: '',
      ariaLabel: `${qty} unidades em estoque`
    };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="animate-fade catalog-page">
      {/* Page Header */}
      <div className="pf-section-header catalog-page-header">
        <div>
          <span className="pf-kicker">Catálogo comercial</span>
          <h1 style={{ fontSize: '32px', margin: '10px 0 0', textAlign: 'left' }}>Catálogo de Pneus</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Gerencie seu estoque e catálogo de produtos.</p>
        </div>
        <button onClick={openAddTireModal} className="btn btn-primary">
          <Plus size={16} /> Cadastrar Pneu
        </button>
      </div>

      <div className="catalog-summary-grid">
        <div className="pf-card catalog-summary-card">
          <span>Pneus cadastrados</span>
          <strong>{loadError ? '--' : tires.length}</strong>
        </div>
        <div className="pf-card catalog-summary-card">
          <span>Anúncios ativos</span>
          <strong>{loadError ? '--' : activeTiresCount}</strong>
        </div>
        <div className="pf-card catalog-summary-card">
          <span>Estoque total</span>
          <strong>{loadError ? '--' : totalStockCount}</strong>
        </div>
      </div>

      {loadError && (
        <div className="card" style={{ marginBottom: '24px', padding: '16px', borderColor: 'rgba(245, 158, 11, 0.28)', background: 'rgba(245, 158, 11, 0.08)', textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertCircle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '6px' }}>Os pneus não puderam ser carregados.</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {loadError}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card catalog-filter-bar" style={{ padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar por marca, modelo ou medida..." 
            className="form-input"
            style={{ paddingLeft: '44px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select 
          className="form-input" 
          style={{ width: '180px' }}
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
        >
          <option value="">Todas as Marcas</option>
          {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Tires Grid */}
      {!loadError && filteredTires.length === 0 ? (
        <div className="pf-empty-state catalog-empty-state" style={{ color: 'var(--text-secondary)' }}>
          <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>Cadastre seu primeiro pneu e publique sua vitrine.</h3>
          <p style={{ fontSize: '16px', maxWidth: '42ch', margin: '10px auto 0' }}>
            Seus pneus cadastrados aparecem na vitrine pública com foto, medida, preço e botão de WhatsApp.
          </p>
          <button onClick={openAddTireModal} className="btn btn-primary" style={{ marginTop: '16px' }}>
            Cadastrar primeiro pneu
          </button>
        </div>
      ) : !loadError ? (
        <div className="grid-cols-3">
          {filteredTires.map((tire) => (
            <div key={tire.id} className={`card catalog-product-card ${getStockState(tire.estoque).cardClass}`.trim()} style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', opacity: tire.status === 'ativo' ? 1 : 0.6 }}>
              {/* Product Image */}
              <div style={{ 
                height: '180px', 
                borderRadius: 'var(--radius-md)', 
                backgroundImage: `url(${tire.foto_principal_url || 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=400'})`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                position: 'relative',
                marginBottom: '16px',
                backgroundColor: 'var(--secondary)'
              }}>
                {(() => {
                  const stockState = getStockState(tire.estoque);
                  const StockIcon = stockState.icon;

                  return (
                    <span
                      className={`catalog-stock-badge ${stockState.badgeClass}`}
                      title={stockState.ariaLabel}
                      aria-label={stockState.ariaLabel}
                    >
                      <StockIcon size={11} />
                      <span>{stockState.label}</span>
                    </span>
                  );
                })()}
                {tire.status !== 'ativo' && (
                  <span className="badge badge-warning" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                    Inativo
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div style={{ textAlign: 'left', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{tire.marca}</span>
                  <span className="badge" style={{ fontSize: '9px', backgroundColor: 'var(--secondary)', color: 'var(--text-secondary)', padding: '2px 6px' }}>
                    {tire.tipo_veiculo === 'moto' ? '🏍️ Moto' : '🚗 Carro'}
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', margin: '2px 0 6px', fontWeight: 600 }}>{getOfferTitle(tire)}</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {isKitOffer(tire) && (
                    <span className="badge badge-warning" style={{ fontSize: '11px' }}>{getOfferBadgeLabel(tire)}</span>
                  )}
                  <span className="badge badge-warning" style={{ fontSize: '11px' }}>{tire.medida}</span>
                </div>
                <div className="catalog-stock-inline" aria-label={`Estoque atual: ${tire.estoque || 0}`}>
                  {(() => {
                    const stockState = getStockState(tire.estoque);
                    const StockIcon = stockState.icon;

                    return (
                      <>
                        <StockIcon size={13} />
                        <span>
                          {isKitOffer(tire)
                            ? `${getAvailableOfferCount(tire)} kits completos (${Number(tire.estoque || 0)} pneus físicos)`
                            : `Estoque: ${Number(tire.estoque || 0)}`}
                        </span>
                      </>
                    );
                  })()}
                </div>
                
                <div style={{ marginTop: 'auto' }}>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{formatBRLCurrency(tire.preco)}</p>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {getOfferDescriptor(tire)}
                  </p>
                </div>
              </div>

              {/* Operations Footer */}
              <div className="catalog-card-actions" style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', marginTop: '16px', paddingTop: '16px', alignItems: 'stretch' }}>
                <button 
                  onClick={() => openEditTireModal(tire)}
                  className="btn btn-outline" 
                  style={{ flex: 1, minWidth: 0, padding: '10px 12px', fontSize: '13px', gap: '6px', whiteSpace: 'nowrap' }}
                >
                  <Edit3 size={14} /> <span>Editar</span>
                </button>

                {isOwner && (
                  <button 
                    onClick={() => handleDeleteTire(tire.id)}
                    className="btn btn-outline" 
                    style={{ width: '44px', minWidth: '44px', padding: '0', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.2)', flexShrink: 0, justifyContent: 'center' }}
                    title="Excluir Pneu"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* MODAL: ADD/EDIT TIRE */}
      {tireModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide catalog-tire-modal" style={{ maxWidth: '700px', textAlign: 'left' }}>
            <div className="catalog-tire-modal__header">
              <h3 style={{ fontSize: '20px', margin: 0 }}>
                {formData.id ? 'Editar Pneu' : 'Cadastrar Novo Pneu'}
              </h3>
              <button className="modal-close catalog-tire-modal__close" onClick={() => setTireModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTire} className="catalog-tire-modal__form">
              <div className="catalog-tire-modal__body">
                {Object.keys(fieldErrors).length > 0 && (
                  <div
                    style={{
                      marginBottom: '20px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: '1px solid rgba(239, 68, 68, 0.22)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#fecaca'
                    }}
                  >
                    Revise os campos destacados antes de salvar.
                  </div>
                )}

                <div className="grid-cols-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Marca *</label>
                  <input 
                    type="text" 
                    name="marca"
                    required 
                    placeholder="Ex: Michelin" 
                    className="form-input" 
                    value={formData.marca} 
                    onChange={handleInputChange}
                    {...getFieldProps('marca')}
                  />
                  {getFieldError('marca') && (
                    <small id="marca-error" style={{ color: 'var(--error)', display: 'block', marginTop: '6px' }}>
                      {getFieldError('marca')}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Modelo *</label>
                  <input 
                    type="text" 
                    name="modelo"
                    required 
                    placeholder="Ex: Primacy 4" 
                    className="form-input" 
                    value={formData.modelo} 
                    onChange={handleInputChange}
                    {...getFieldProps('modelo')}
                  />
                  {getFieldError('modelo') && (
                    <small id="modelo-error" style={{ color: 'var(--error)', display: 'block', marginTop: '6px' }}>
                      {getFieldError('modelo')}
                    </small>
                  )}
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Título do anúncio</label>
                  <input
                    type="text"
                    name="titulo_anuncio"
                    maxLength="100"
                    placeholder="Ex: Kit com 2 Pneus Continental PremiumContact 6"
                    className="form-input"
                    value={formData.titulo_anuncio}
                    onChange={handleInputChange}
                    {...getFieldProps('titulo_anuncio')}
                  />
                  {getFieldError('titulo_anuncio') && (
                    <small id="titulo_anuncio-error" style={{ color: 'var(--error)', display: 'block', marginTop: '6px' }}>
                      {getFieldError('titulo_anuncio')}
                    </small>
                  )}
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    Nome exibido na vitrine. Se ficar vazio, o modelo do pneu será usado.
                  </small>
                </div>
                <div className="form-group">
                  <label className="form-label">Medida *</label>
                  <input 
                    type="text" 
                    name="medida"
                    required 
                    placeholder="Ex: 195/55 R16" 
                    className="form-input" 
                    value={formData.medida} 
                    onChange={handleInputChange}
                    {...getFieldProps('medida')}
                  />
                  {getFieldError('medida') && (
                    <small id="medida-error" style={{ color: 'var(--error)', display: 'block', marginTop: '6px' }}>
                      {getFieldError('medida')}
                    </small>
                  )}
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Preço do anúncio (R$) *</label>
                  <CurrencyInput
                    name="preco"
                    required 
                    placeholder="Ex: 1.478,46"
                    value={formData.preco} 
                    onChange={(value) => updateFieldValue('preco', value)}
                    {...getFieldProps('preco')}
                  />
                  {getFieldError('preco') && (
                    <small id="preco-error" style={{ color: 'var(--error)', display: 'block', marginTop: '6px' }}>
                      {getFieldError('preco')}
                    </small>
                  )}
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    {formQuantityPerOffer > 1
                      ? `Valor total do kit com ${formQuantityPerOffer} pneus.`
                      : 'Valor de um pneu.'}
                  </small>
                </div>
                <div className="form-group">
                  <label className="form-label">Pneus incluídos no anúncio</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    name="quantidade_por_anuncio"
                    className="form-input"
                    value={formData.quantidade_por_anuncio}
                    onChange={handleInputChange}
                    {...getFieldProps('quantidade_por_anuncio')}
                  />
                  {getFieldError('quantidade_por_anuncio') && (
                    <small id="quantidade_por_anuncio-error" style={{ color: 'var(--error)', display: 'block', marginTop: '6px' }}>
                      {getFieldError('quantidade_por_anuncio')}
                    </small>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {[1, 2, 4].map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '8px 10px', fontSize: '12px' }}
                        onClick={() => setFormData((prev) => ({ ...prev, quantidade_por_anuncio: option }))}
                      >
                        {option} pneu{option === 1 ? '' : 's'}
                      </button>
                    ))}
                  </div>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                    Informe 1 para venda unitária, 2 para kit com dois pneus e assim por diante.
                  </small>
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Estoque físico</label>
                  <input 
                    type="number" 
                    name="estoque"
                    className="form-input" 
                    value={formData.estoque} 
                    onChange={handleInputChange}
                    {...getFieldProps('estoque')}
                  />
                  {getFieldError('estoque') && (
                    <small id="estoque-error" style={{ color: 'var(--error)', display: 'block', marginTop: '6px' }}>
                      {getFieldError('estoque')}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo do Pneu</label>
                  <select 
                    name="tipo_veiculo"
                    className="form-input"
                    value={formData.tipo_veiculo}
                    onChange={handleInputChange}
                  >
                    <option value="carro">🚗 Carro</option>
                    <option value="moto">🏍️ Moto</option>
                  </select>
                </div>
              </div>

              {(parsedFormPrice != null || formStock > 0 || formPreviewTitle) && (
                <div
                  style={{
                    marginTop: '4px',
                    marginBottom: '8px',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid rgba(245, 158, 11, 0.18)',
                    background: 'rgba(245, 158, 11, 0.08)'
                  }}
                >
                  {parsedFormPrice != null && formPreviewTitle && (
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formQuantityPerOffer > 1
                        ? `${formOfferDescriptor} por ${formatBRLCurrency(parsedFormPrice)}.`
                        : `${formPreviewTitle} por ${formatBRLCurrency(parsedFormPrice)}.`}
                    </p>
                  )}
                  {formStock > 0 && (
                    <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
                      {formQuantityPerOffer > 1
                        ? `Estoque atual permite ${formAvailableOffers} kit${formAvailableOffers === 1 ? '' : 's'} completo${formAvailableOffers === 1 ? '' : 's'}.`
                        : `Estoque atual: ${formStock} pneu${formStock === 1 ? '' : 's'}.`}
                    </p>
                  )}
                  {formQuantityPerOffer > 1 && formRemainder > 0 && (
                    <p style={{ margin: '6px 0 0', color: 'var(--warning)' }}>
                      O estoque possui {formRemainder} pneu(s) que não completam outro kit.
                    </p>
                  )}
                </div>
              )}

              <div className="grid-cols-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    name="status"
                    className="form-input"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="ativo">Ativo (Visível)</option>
                    <option value="inativo">Inativo (Oculto)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Compatibilidade (Texto simples)</label>
                  <input 
                    type="text" 
                    name="compatibilidade"
                    placeholder="Ex: Onix, HB20, Corolla..." 
                    className="form-input" 
                    value={formData.compatibilidade} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea 
                  name="descricao"
                  rows="3" 
                  placeholder="Detalhes sobre o pneu..." 
                  className="form-input" 
                  value={formData.descricao} 
                  onChange={handleInputChange}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Photos Upload Section */}
              <div className="form-group">
                <label className="form-label">Fotos do Pneu</label>
                <div style={{ 
                  border: '2px dashed var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '20px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-dark)'
                }}>
                  <input 
                    type="file" 
                    id="photo-upload" 
                    multiple 
                    accept={IMAGE_UPLOAD_ACCEPT} 
                    style={{ display: 'none' }} 
                    onChange={handlePhotoUpload}
                    disabled={submitting}
                  />
                  <label htmlFor="photo-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {submitting ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} color="var(--primary)" />}
                    <span style={{ fontSize: '14px' }}>{submitting ? 'Enviando...' : 'Clique para enviar até 2 imagens'}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      PNG, JPG, JPEG, WEBP, HEIC ou HEIF. As imagens são otimizadas automaticamente para WEBP.
                    </span>
                  </label>
                </div>

                {/* Photos Preview */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                  {formData.fotos.map((url, idx) => (
                    <div key={idx} style={{ 
                      position: 'relative', 
                      width: '100px', 
                      height: '100px', 
                      borderRadius: '8px', 
                      backgroundImage: `url(${url})`, 
                      backgroundSize: 'cover', 
                      backgroundPosition: 'center',
                      border: formData.foto_principal_url === url ? '3px solid var(--primary)' : '1px solid var(--border)'
                    }}>
                      <div style={{ position: 'absolute', top: '-8px', right: '-8px', display: 'flex', gap: '4px' }}>
                        <button 
                          type="button" 
                          onClick={() => setMainPhoto(url)}
                          style={{ 
                            backgroundColor: formData.foto_principal_url === url ? 'var(--primary)' : 'var(--bg-card)', 
                            border: '1px solid var(--border)',
                            borderRadius: '50%',
                            padding: '4px',
                            cursor: 'pointer',
                            color: formData.foto_principal_url === url ? '#000' : 'var(--text-muted)'
                          }}
                          title="Definir como principal"
                        >
                          <Star size={12} fill={formData.foto_principal_url === url ? 'currentColor' : 'none'} />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => removePhoto(url)}
                          style={{ 
                            backgroundColor: 'var(--error)', 
                            border: 'none',
                            borderRadius: '50%',
                            padding: '4px',
                            cursor: 'pointer',
                            color: 'white'
                          }}
                          title="Remover foto"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      {formData.foto_principal_url === url && (
                        <span style={{ 
                          position: 'absolute', 
                          bottom: '4px', 
                          left: '4px', 
                          fontSize: '9px', 
                          backgroundColor: 'var(--primary)', 
                          color: '#000', 
                          padding: '2px 4px', 
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          PRINCIPAL
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              </div>

              <div className="catalog-tire-modal__footer">
                <button type="button" className="btn btn-secondary" onClick={() => setTireModalOpen(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Salvando...' : (formData.id ? 'Salvar Alterações' : 'Cadastrar Pneu')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .catalog-page-header {
          align-items: flex-start;
        }

        .catalog-page-header .btn {
          flex: 0 0 auto;
        }

        .catalog-tire-modal {
          max-height: min(90vh, 860px);
          padding: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .catalog-tire-modal__header {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 28px 32px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .catalog-tire-modal__close {
          position: static;
          flex: 0 0 auto;
        }

        .catalog-tire-modal__form {
          min-height: 0;
          display: flex;
          flex: 1;
          flex-direction: column;
        }

        .catalog-tire-modal__body {
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 24px 24px 0 32px;
          scrollbar-gutter: stable;
          scrollbar-width: thin;
          scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
        }

        .catalog-tire-modal__body::-webkit-scrollbar {
          width: 10px;
        }

        .catalog-tire-modal__body::-webkit-scrollbar-track {
          background: transparent;
          margin: 10px 0 14px;
        }

        .catalog-tire-modal__body::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.34);
          border-radius: 999px;
          border: 2px solid rgba(15, 23, 42, 0.22);
        }

        .catalog-tire-modal__body::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }

        .catalog-tire-modal__footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 20px 32px 28px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.38));
          flex-shrink: 0;
        }

        .catalog-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin: -10px 0 24px;
        }

        .catalog-summary-card {
          padding: 18px;
          display: grid;
          gap: 8px;
        }

        .catalog-summary-card span {
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .catalog-summary-card strong {
          color: var(--text-primary);
          font-family: var(--font-title);
          font-size: 28px;
          line-height: 1;
        }

        .catalog-filter-bar,
        .catalog-product-card {
          border-color: rgba(255, 255, 255, 0.09);
        }

        .catalog-product-card {
          position: relative;
          overflow: hidden;
        }

        .catalog-stock-card--low {
          border-color: rgba(245, 158, 11, 0.26);
          box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.06);
        }

        .catalog-stock-card--out {
          border-color: rgba(239, 68, 68, 0.26);
          box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.06);
        }

        .catalog-product-card::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 10% 0%, rgba(245, 158, 11, 0.12), transparent 11rem);
          opacity: 0;
          transition: opacity var(--transition-normal);
        }

        .catalog-product-card:hover::before {
          opacity: 1;
        }

        .catalog-product-card > * {
          position: relative;
          z-index: 1;
        }

        .catalog-stock-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 8px;
          border-radius: 999px;
          border: 1px solid transparent;
          background: rgba(8, 11, 16, 0.72);
          backdrop-filter: blur(8px);
          color: #f8fafc;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.01em;
          line-height: 1;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
        }

        .catalog-stock-badge--available {
          background: rgba(34, 197, 94, 0.14);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .catalog-stock-badge--low {
          background: rgba(245, 158, 11, 0.14);
          border-color: rgba(245, 158, 11, 0.35);
          color: #fbbf24;
        }

        .catalog-stock-badge--out {
          background: rgba(239, 68, 68, 0.14);
          border-color: rgba(239, 68, 68, 0.35);
          color: #f87171;
        }

        .catalog-stock-inline {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
        }

        .catalog-stock-inline svg {
          flex: 0 0 auto;
          color: inherit;
        }

        .catalog-empty-state svg {
          margin-left: auto;
          margin-right: auto;
        }

        .catalog-empty-state h3 {
          margin: 0;
          font-size: clamp(22px, 3vw, 30px);
        }

        @media (max-width: 768px) {
          .catalog-tire-modal {
            max-height: calc(100dvh - 24px);
          }

          .catalog-tire-modal__header {
            padding: 24px 20px 18px;
          }

          .catalog-tire-modal__body {
            padding: 20px 14px 0 20px;
          }

          .catalog-tire-modal__footer {
            padding: 18px 20px 24px;
          }

          .catalog-page-header {
            display: grid;
            gap: 16px;
          }

          .catalog-page-header .btn {
            width: 100%;
          }

          .catalog-summary-grid {
            grid-template-columns: 1fr;
            margin-top: -6px;
          }

          .catalog-card-actions {
            gap: 6px !important;
          }

          .catalog-card-actions .btn {
            min-height: 44px;
          }
        }

        @media (max-width: 480px) {
          .catalog-tire-modal__footer {
            flex-direction: column-reverse;
          }

          .catalog-tire-modal__footer .btn {
            width: 100%;
            justify-content: center;
          }

          .catalog-stock-badge {
            max-width: calc(100% - 20px);
            font-size: 10px;
            padding: 5px 7px;
          }

          .catalog-stock-inline {
            font-size: 11px;
          }

          .catalog-card-actions {
            gap: 6px !important;
          }

          .catalog-card-actions .btn:first-child {
            flex: 1 1 auto;
            padding: 10px 10px !important;
            font-size: 12px !important;
          }

          .catalog-card-actions .btn:last-child {
            width: 42px !important;
            min-width: 42px !important;
          }
        }
      `}</style>
    </div>
  );
}
