import React from 'react';
import { Search, ArrowRight, MapPin, Clock3, MessageSquare, Sparkles } from 'lucide-react';
import { formatBRLCurrency } from '../../../utils/currency';
import { getAvailabilityLabel, getAvailableOfferCount, getOfferDescriptor, getOfferTitle, isKitOffer } from '../../../utils/tireOffer';
import { formatBusinessHourLabel } from '../../../utils/storeHours';

export default function VehicleSearchBox({
  store,
  locationText,
  statusLabel,
  statusTone,
  onOpen,
  onWhatsAppClick,
  onScrollToCatalog,
  onHeroInterest,
  onSelectHero,
  vehicleSearchApplied,
  vehicleBrand,
  vehicleModel,
  heroTire,
  heroTires = [],
  activeHeroIndex = 0,
  resultCount,
  uniqueSizes = [],
  uniqueBrands = [],
  commercialContactEnabled = true,
}) {
  const heroImage =
    heroTire?.foto_principal_url ||
    heroTire?.image ||
    store.cover ||
    store.foto_capa ||
    store.banner ||
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=1400';

  const heroTitle = getOfferTitle(heroTire) || heroTire?.medida || 'Medida premium';
  const heroSubtitle = [heroTire?.marca, heroTire?.medida, getOfferDescriptor(heroTire)].filter(Boolean).join(' • ') || 'Marca em destaque';
  const heroDescription =
    heroTire?.descricao ||
    heroTire?.description ||
    'Foto do pneu em destaque com compra rápida no WhatsApp.';
  const heroPrice = formatBRLCurrency(heroTire?.preco || 0);
  const inStock = getAvailableOfferCount(heroTire) > 0;
  const heroContactDisabled = !commercialContactEnabled || (Boolean(heroTire) && !inStock);
  const hoursLabel = formatBusinessHourLabel(store.business_hours, 'Atendimento comercial');

  return (
    <section className="store-hero">
      <div className="store-hero__copy">
        <div className="store-hero__eyebrow">
          <span className={`status-pill ${statusTone === 'success' ? 'status-pill--success' : 'status-pill--muted'}`}>
            <Sparkles size={12} />
            {statusLabel}
          </span>
          <span className="store-hero__meta">
            <MapPin size={13} />
            {locationText}
          </span>
          <span className="store-hero__meta">
            <Clock3 size={13} />
            {hoursLabel}
          </span>
        </div>

        <h2 className="store-hero__title">Escolha seu pneu com rapidez e confiança.</h2>
        <p className="store-hero__lead">
          Veja os pneus em destaque, compare preços e fale com a loja no WhatsApp sem complicação.
        </p>

        <div className="store-hero__actions">
          <button
            type="button"
            className={`button button--primary button--xl ${!commercialContactEnabled ? 'commercial-disabled' : ''}`}
            onClick={onWhatsAppClick}
            disabled={!commercialContactEnabled}
            aria-disabled={!commercialContactEnabled}
          >
            <MessageSquare size={18} />
            Falar no WhatsApp
          </button>
          <button type="button" className="button button--ghost button--xl" onClick={onScrollToCatalog}>
            Ver catálogo
            <ArrowRight size={18} />
          </button>
          <button type="button" className="button button--ghost button--xl button--search" onClick={onOpen}>
            <Search size={18} />
            Buscar pneu
          </button>
        </div>

        {vehicleSearchApplied && (
          <button type="button" className="hero-search-summary" onClick={onOpen}>
            <Search size={14} />
            <span>
              Busca ativa: {vehicleBrand || 'Veículo'} {vehicleModel}
            </span>
          </button>
        )}

        <div className="store-hero__stats">
          <div className="hero-stat">
            <strong>{resultCount}</strong>
            <span>produtos ativos</span>
          </div>
          <div className="hero-stat">
            <strong>{uniqueBrands.length}</strong>
            <span>marcas em destaque</span>
          </div>
          <div className="hero-stat">
            <strong>{uniqueSizes.length}</strong>
            <span>medidas prontas</span>
          </div>
        </div>
      </div>

      <div className="store-hero__showcase">
        <div className="store-hero__frame">
          <div className="store-hero__cover" style={{ backgroundImage: `url(${heroImage})` }}>
            <div className="store-hero__cover-fade" aria-hidden="true" />

            <div className="store-hero__floating-panel store-hero__floating-panel--featured">
              <span className="featured-hero__kicker floating-card__label">Em destaque</span>

              <div className="featured-hero__content">
                <div className="featured-hero__left">
                  <h3 className="hero-product-title">{heroTitle}</h3>
                  <p className="hero-product-subtitle">{heroSubtitle}</p>
                  <p className="hero-product-copy">{heroDescription}</p>
                </div>

                <div className="featured-hero__right">
                  <div className="featured-hero__info-row">
                    <span className="hero-product-line__tag">{heroTitle}</span>
                    <span className={`hero-product-stock ${inStock ? 'hero-product-stock--success' : 'hero-product-stock--muted'}`}>
                      {inStock ? getAvailabilityLabel(heroTire) : 'Sob consulta'}
                    </span>
                  </div>

                  <div className="hero-product-price">
                    {heroPrice}
                  </div>

                  <button
                    type="button"
                    className={`button button--primary button--wide button--xl hero-buy-button ${heroContactDisabled ? 'commercial-disabled' : ''}`}
                    onClick={() => (heroTire ? onHeroInterest(heroTire) : onScrollToCatalog())}
                    aria-label={heroTire ? `Comprar ${getOfferTitle(heroTire) || heroTire.medida || 'pneu'} pelo WhatsApp` : 'Comprar pelo WhatsApp'}
                    disabled={heroContactDisabled}
                    aria-disabled={heroContactDisabled}
                  >
                    <MessageSquare size={18} />
                    {heroTire && !inStock ? 'Indisponivel' : isKitOffer(heroTire) ? 'Comprar kit no WhatsApp' : 'Comprar no WhatsApp'}
                  </button>
                </div>
              </div>

              <div className="hero-carousel-dots" aria-label="Indicador do carrossel">
                {heroTires.length > 0 ? (
                  heroTires.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`hero-carousel-dot ${index === activeHeroIndex ? 'hero-carousel-dot--active' : ''}`}
                      onClick={() => onSelectHero(index)}
                      aria-label={`Ir para o item ${index + 1}`}
                    />
                  ))
                ) : (
                  <span className="hero-carousel-dot hero-carousel-dot--active" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="store-hero__quickbar">
          <button type="button" className="quick-cta quick-cta--primary" onClick={onOpen}>
            <Search size={16} />
            Buscar pneu
          </button>
          <button type="button" className="quick-cta" onClick={onScrollToCatalog}>
            <ArrowRight size={16} />
            Catálogo
          </button>
          <button
            type="button"
            className={`quick-cta quick-cta--whatsapp ${!commercialContactEnabled ? 'commercial-disabled' : ''}`}
            onClick={onWhatsAppClick}
            disabled={!commercialContactEnabled}
            aria-disabled={!commercialContactEnabled}
          >
            <MessageSquare size={16} />
            WhatsApp
          </button>
        </div>
      </div>
    </section>
  );
}
