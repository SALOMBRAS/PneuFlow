import { useEffect, useState, useCallback } from 'react';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
import { IMAGE_UPLOAD_ACCEPT } from '../../utils/imageOptimizer';
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
  const [tires, setTires] = useState([]);
  const [loading, setLoading] = useState(true);
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
    medida: '',
    preco: '',
    estoque: 0,
    descricao: '',
    status: 'ativo',
    compatibilidade: '',
    tipo_veiculo: 'carro',
    foto_principal_url: '',
    fotos: []
  });

  const [tempPhotos, setTempPhotos] = useState([]);

  const loadData = useCallback(async () => {
    if (!store) return;
    setLoading(true);
    try {
      const list = await storageService.getPneus(store.id);
      setTires(list);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
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
      medida: '',
      preco: '',
      estoque: 0,
      descricao: '',
      status: 'ativo',
      compatibilidade: '',
      tipo_veiculo: 'carro',
      foto_principal_url: '',
      fotos: []
    });
    setTempPhotos([]);
    setSelectedTire(null);
    setTireModalOpen(true);
  };

  const openEditTireModal = (tire) => {
    setFormData({
      id: tire.id,
      marca: tire.marca,
      modelo: tire.modelo,
      medida: tire.medida,
      preco: tire.preco.toString(),
      estoque: tire.estoque,
      descricao: tire.descricao || '',
      status: tire.status || 'ativo',
      compatibilidade: tire.compatibilidade || '',
      tipo_veiculo: tire.tipo_veiculo || 'carro',
      foto_principal_url: tire.foto_principal_url || '',
      fotos: tire.fotos || []
    });
    setTempPhotos([]);
    setSelectedTire(tire);
    setTireModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'ativo' : 'inativo') : value
    }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentImages = [...new Set([formData.foto_principal_url, ...formData.fotos].filter(Boolean))];
    const currentCount = currentImages.length;

    if (currentCount >= MAX_IMAGES_PER_TIRE) {
      alert(`Este anúncio já atingiu o limite de ${MAX_IMAGES_PER_TIRE} imagens. Remova uma imagem para enviar outra.`);
      e.target.value = '';
      return;
    }

    if (files.length > MAX_IMAGES_PER_TIRE) {
      alert(`Você pode enviar no máximo ${MAX_IMAGES_PER_TIRE} imagens por anúncio.`);
      e.target.value = '';
      return;
    }

    if (currentCount + files.length > MAX_IMAGES_PER_TIRE) {
      alert(`Você só pode adicionar mais ${MAX_IMAGES_PER_TIRE - currentCount} imagem(ns).`);
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
      alert(err.message || 'Erro ao enviar fotos. Verifique se o bucket "pneus-fotos" existe no Supabase.');
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

    if (!formData.marca || !formData.modelo || !formData.medida || !formData.preco) {
      alert('Preencha os campos obrigatórios (*).');
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
        medida: formData.medida,
        preco: parseFloat(formData.preco),
        estoque: parseInt(formData.estoque) || 0,
        descricao: formData.descricao,
        status: formData.status,
        compatibilidade: formData.compatibilidade,
        tipo_veiculo: formData.tipo_veiculo,
        foto_principal_url: formData.foto_principal_url,
        fotos: formData.fotos
      };

      if (formData.id) {
        await storageService.updatePneu(formData.id, pneuData);
      } else {
        await storageService.createPneu(pneuData);
      }

      setTireModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Erro completo ao salvar pneu:', error);
      alert(`Erro ao salvar pneu: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTire = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este pneu? Esta ação não pode ser desfeita.')) {
      try {
        await storageService.deletePneu(id);
        loadData();
      } catch (err) {
        alert('Erro ao excluir pneu.');
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
          <span className="pf-kicker">Catalogo comercial</span>
          <h1 style={{ fontSize: '32px', margin: '10px 0 0', textAlign: 'left' }}>Catalogo de Pneus</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Gerencie seu estoque e catálogo de produtos.</p>
        </div>
        <button onClick={openAddTireModal} className="btn btn-primary">
          <Plus size={16} /> Cadastrar Pneu
        </button>
      </div>

      <div className="catalog-summary-grid">
        <div className="pf-card catalog-summary-card">
          <span>Pneus cadastrados</span>
          <strong>{tires.length}</strong>
        </div>
        <div className="pf-card catalog-summary-card">
          <span>Anuncios ativos</span>
          <strong>{activeTiresCount}</strong>
        </div>
        <div className="pf-card catalog-summary-card">
          <span>Estoque total</span>
          <strong>{totalStockCount}</strong>
        </div>
      </div>

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
      {filteredTires.length === 0 ? (
        <div className="pf-empty-state catalog-empty-state" style={{ color: 'var(--text-secondary)' }}>
          <Layers size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h3>Cadastre seu primeiro pneu e publique sua vitrine.</h3>
          <p style={{ fontSize: '16px', maxWidth: '42ch', margin: '10px auto 0' }}>
            Seus pneus cadastrados aparecem na vitrine publica com foto, medida, preco e botao de WhatsApp.
          </p>
          <button onClick={openAddTireModal} className="btn btn-primary" style={{ marginTop: '16px' }}>
            Cadastrar primeiro pneu
          </button>
        </div>
      ) : (
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
                <h3 style={{ fontSize: '18px', margin: '2px 0 6px', fontWeight: 600 }}>{tire.modelo}</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span className="badge badge-warning" style={{ fontSize: '11px' }}>{tire.medida}</span>
                </div>
                <div className="catalog-stock-inline" aria-label={`Estoque atual: ${tire.estoque || 0}`}>
                  {(() => {
                    const stockState = getStockState(tire.estoque);
                    const StockIcon = stockState.icon;

                    return (
                      <>
                        <StockIcon size={13} />
                        <span>Estoque: {Number(tire.estoque || 0)}</span>
                      </>
                    );
                  })()}
                </div>
                
                <div style={{ marginTop: 'auto' }}>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>R$ {tire.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
      )}

      {/* MODAL: ADD/EDIT TIRE */}
      {tireModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide" style={{ maxWidth: '700px', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setTireModalOpen(false)}>
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>
              {formData.id ? 'Editar Pneu' : 'Cadastrar Novo Pneu'}
            </h3>
            
            <form onSubmit={handleSaveTire}>
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
                  />
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
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '16px' }}>
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
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Preço (R$) *</label>
                  <input 
                    type="number" 
                    name="preco"
                    step="0.01" 
                    required 
                    placeholder="Ex: 689.90" 
                    className="form-input" 
                    value={formData.preco} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Estoque (Qtd)</label>
                  <input 
                    type="number" 
                    name="estoque"
                    className="form-input" 
                    value={formData.estoque} 
                    onChange={handleInputChange} 
                  />
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

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
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
