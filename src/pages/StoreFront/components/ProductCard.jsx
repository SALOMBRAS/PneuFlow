import React, { useState } from 'react';
import { MessageSquare, Car, Bike, Info, ShieldCheck, Zap, Gauge } from 'lucide-react';
import QuantitySelector from './QuantitySelector';
import { formatBRLCurrency } from '../../../utils/currency';
import {
  getAvailabilityLabel,
  getAvailableOfferCount,
  getOfferBadgeLabel,
  getOfferDescriptor,
  getOfferQuantityLabel,
  getPhysicalTireTotal,
  getQuantityPerOffer,
  getQuantitySelectorLabel,
  isKitOffer
} from '../../../utils/tireOffer';

export default function ProductCard({ tire, primaryColor, onInterest, onDetail, commercialContactEnabled = true }) {
  const stockCount = getAvailableOfferCount(tire);
  const isStock = stockCount > 0;
  const [desiredQuantity, setDesiredQuantity] = useState(1);
  const image = tire.foto_principal_url || tire.image || 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=800';
  const vehicleLabel = tire.tipo_veiculo === 'moto' ? 'Moto' : 'Carro';
  const compatibility = tire.compatibilidade || tire.compatibility || tire.version || tire.descricao || 'Compatibilidade sob consulta';
  const contactDisabled = !commercialContactEnabled || !isStock;
  const quantityPerOffer = getQuantityPerOffer(tire);
  const physicalTotal = getPhysicalTireTotal(desiredQuantity, quantityPerOffer);
  const helperText = isKitOffer(tire)
    ? `${getOfferQuantityLabel(desiredQuantity, tire)} = ${physicalTotal} pneus.`
    : '';

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
          {isKitOffer(tire) ? (
            <span className="product-badge product-badge--accent">{getOfferBadgeLabel(tire)}</span>
          ) : null}
          <span className="product-badge product-badge--spec">{tire.medida}</span>
        </div>

        <span className={`stock-pill ${isStock ? 'stock-pill--success' : 'stock-pill--warning'}`}>
          {getAvailabilityLabel(tire)}
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

        <h3 className="product-title">{tire.titulo_anuncio || tire.modelo}</h3>

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

        <QuantitySelector
          value={desiredQuantity}
          max={stockCount}
          onChange={setDesiredQuantity}
          label={getQuantitySelectorLabel(tire)}
          availabilityText={getAvailabilityLabel(tire)}
          helperText={helperText}
          compact
          disabled={!commercialContactEnabled}
        />

        <div className="product-price-row">
          <div>
            <span className="product-price-label">{isKitOffer(tire) ? 'Preço do kit' : 'A partir de'}</span>
            <div className="product-price" style={{ color: primaryColor }}>{formatBRLCurrency(tire.preco)}</div>
            <small style={{ color: 'var(--text-muted)' }}>{getOfferDescriptor(tire)}</small>
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
          onClick={() => onInterest(tire, desiredQuantity)}
          type="button"
          className={`btn-whatsapp-card ${contactDisabled ? 'commercial-disabled' : ''}`}
          aria-label={`Falar no WhatsApp sobre o pneu ${tire.marca || ''} ${tire.modelo || tire.medida || ''}`.trim()}
          disabled={contactDisabled}
          aria-disabled={contactDisabled}
        >
          <MessageSquare size={16} />
          {isStock ? 'Falar no WhatsApp' : 'Indisponivel'}
        </button>
      </div>
    </article>
  );
}
