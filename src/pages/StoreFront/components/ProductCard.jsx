import React from 'react';
import { MessageSquare, Car, Bike, Info, ShieldCheck, Zap, Gauge } from 'lucide-react';

const formatPrice = (value) =>
  Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ProductCard({ tire, primaryColor, onInterest, onDetail, commercialContactEnabled = true }) {
  const isStock = Number(tire.estoque || 0) > 0;
  const image = tire.foto_principal_url || tire.image || 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800';
  const vehicleLabel = tire.tipo_veiculo === 'moto' ? 'Moto' : 'Carro';
  const compatibility = tire.compatibilidade || tire.compatibility || tire.version || tire.descricao || 'Compatibilidade sob consulta';

  return (
    <article className="product-card">
      <button
        className="product-image-container"
        onClick={() => onDetail(tire)}
        type="button"
        aria-label={`Ver detalhes do pneu ${tire.marca || ''} ${tire.modelo || tire.medida || ''}`.trim()}
      >
        <img
          src={image}
          alt={`${tire.marca} ${tire.modelo}`}
          className="product-image"
          loading="lazy"
          decoding="async"
          width="800"
          height="600"
        />

        <div className="product-image-overlay" />

        <div className="product-top-badges">
          <span className="product-badge product-badge--accent">
            {tire.tipo_veiculo === 'moto' ? <Bike size={12} /> : <Car size={12} />}
            {vehicleLabel}
          </span>
          <span className="product-badge product-badge--spec">{tire.medida}</span>
        </div>

        <span className={`stock-pill ${isStock ? 'stock-pill--success' : 'stock-pill--warning'}`}>
          {isStock ? 'Pronta entrega' : 'Sob consulta'}
        </span>
      </button>

      <div className="product-content">
        <div className="product-brand-row">
          <span className="product-brand">{tire.marca}</span>
          <span className="product-rating">
            <Zap size={12} />
            Destaque
          </span>
        </div>

        <h3 className="product-title">{tire.modelo}</h3>

        <div className="product-compatibility">
          <ShieldCheck size={14} />
          <span>{compatibility}</span>
        </div>

        <div className="product-specs">
          <span>
            <Gauge size={12} />
            {tire.aro ? `Aro ${tire.aro}` : 'Linha premium'}
          </span>
          <span>
            {vehicleLabel}
          </span>
        </div>

        <div className="product-price-row">
          <div>
            <span className="product-price-label">A partir de</span>
            <div className="product-price">
              <span style={{ color: primaryColor }}>R$</span>
              {formatPrice(tire.preco)}
            </div>
          </div>
          <button
            onClick={() => onDetail(tire)}
            type="button"
            className="product-detail-link"
            aria-label={`Ver detalhes do pneu ${tire.marca || ''} ${tire.modelo || tire.medida || ''}`.trim()}
          >
            <Info size={14} />
            Ver
          </button>
        </div>

        <button
          onClick={() => onInterest(tire)}
          type="button"
          className={`btn-whatsapp-card ${!commercialContactEnabled ? 'commercial-disabled' : ''}`}
          aria-label={`Falar no WhatsApp sobre o pneu ${tire.marca || ''} ${tire.modelo || tire.medida || ''}`.trim()}
          disabled={!commercialContactEnabled}
          aria-disabled={!commercialContactEnabled}
        >
          <MessageSquare size={16} />
          Falar no WhatsApp
        </button>
      </div>
    </article>
  );
}
