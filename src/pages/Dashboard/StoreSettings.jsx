import { useEffect, useState, useCallback } from 'react';
import { storageService } from '../../services/storage';
import { useStore } from '../../contexts/StoreContext';
import { Save, Check, ExternalLink, Zap, Globe, MapPin, Palette, Upload, Loader2, Image as ImageIcon } from 'lucide-react';

export default function StoreSettings() {
  const { store, refreshStore } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [hours, setHours] = useState('');
  const [logo, setLogo] = useState('');
  const [description, setDescription] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [tipoVitrine, setTipoVitrine] = useState('carro');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (store) {
      setName(store.nome || '');
      setPhone(store.telefone || '');
      setWhatsapp(store.whatsapp || '');
      setAddress(store.endereco || '');
      setCity(store.cidade || '');
      setState(store.estado || '');
      setLogo(store.logo || '');
      setSeoTitle(store.seo_titulo || '');
      setSeoDescription(store.seo_descricao || '');
      setTipoVitrine(store.tipo_vitrine || 'carro');
      setDescription(store.description || '');
      setHours(store.hours || '');
    }
  }, [store]);

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
        address,
        city,
        state,
        hours,
        logo,
        banner: store.banner,
        cover: store.foto_capa,
        description,
        seoTitle,
        seoDescription,
        tipo_vitrine: tipoVitrine
      });

      if (updated) {
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
      <div className="flex-between store-settings-title-row" style={{ marginBottom: '32px' }}>
        <div className="store-settings-title-copy">
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
        <div className="store-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
          <div className="card store-settings-card" style={{ padding: '24px', minWidth: 0 }}>
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

            <div className="form-group">
              <label className="form-label" htmlFor="store-address">Endereço</label>
              <input
                id="store-address"
                type="text"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua Exemplo, 123 - Bairro"
              />
            </div>

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
              <label className="form-label" htmlFor="store-hours">Horário de Funcionamento</label>
              <input
                id="store-hours"
                type="text"
                className="form-input"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Ex: Seg a Sex: 08h às 18h"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Minha loja vende pneus para:</label>
              <select
                className="form-input"
                value={tipoVitrine}
                onChange={(e) => setTipoVitrine(e.target.value)}
              >
                <option value="carro">Apenas Carros</option>
                <option value="moto">Apenas Motos</option>
                <option value="ambos">Carros e Motos</option>
              </select>
            </div>
          </div>

          <div className="card store-settings-card" style={{ padding: '24px', minWidth: 0 }}>
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
        </div>

        <div className="card store-settings-card" style={{ padding: '24px', minWidth: 0 }}>
          <h3 className="store-settings-section-title" style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <Globe size={20} style={{ color: 'var(--primary)' }} /> SEO Básico (Para Buscadores)
          </h3>
          <div className="store-settings-seo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', minWidth: 0 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="seo-title">Título da Página (SEO Title)</label>
              <input
                id="seo-title"
                type="text"
                className="form-input"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Título que aparece no Google e aba do navegador"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Ideal: 50-60 caracteres.
              </span>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="seo-description">Descrição da Página (Meta Description)</label>
              <textarea
                id="seo-description"
                rows="2"
                className="form-input"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Breve descrição que aparece nos resultados de busca"
                style={{ resize: 'vertical' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Ideal: 150-160 caracteres.
              </span>
            </div>
          </div>
        </div>

        <div className="store-settings-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end', paddingBottom: '40px' }}>
          <button type="submit" className="btn btn-primary store-settings-save-btn" style={{ minWidth: '180px' }} disabled={saving || uploadingLogo}>
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>

      <style>{`
        .store-settings-page {
          min-width: 0;
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

        @media (max-width: 1024px) {
          .store-settings-grid,
          .store-settings-seo-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 768px) {
          .store-settings-title-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
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
          .store-settings-city-state {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
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

          .store-settings-upload-actions .btn {
            width: 100%;
            justify-content: center;
          }

          .store-settings-upload-actions span {
            text-align: center;
          }

          .store-settings-footer {
            padding-bottom: 24px !important;
          }

          .store-settings-save-btn {
            width: 100%;
            justify-content: center;
            min-width: 0 !important;
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
        }
      `}</style>
    </div>
  );
}
