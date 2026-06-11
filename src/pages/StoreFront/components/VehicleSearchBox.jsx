import React from 'react';
import { Search, Car, ArrowRight, MapPin, Clock3, MessageSquare, Sparkles } from 'lucide-react';

export default function VehicleSearchBox({
  store,
  locationText,
  statusLabel,
  statusTone,
  onOpen,
  onOpenFilters,
  onWhatsAppClick,
  onScrollToCatalog,
  onHeroInterest,
  onSelectHero,
  vehicleSearchApplied,
  vehicleBrand,
  vehicleModel,
  onClear,
  primaryColor,
  heroTire,
  heroTires = [],
  activeHeroIndex = 0,
  resultCount,
  uniqueSizes = [],
  uniqueBrands = [],
  searchQuery,
  setSearchQuery,
  filterBrand,
  setFilterBrand,
}) {
  const heroImage =
    heroTire?.foto_principal_url ||
    heroTire?.image ||
    store.cover ||
    store.foto_capa ||
    store.banner ||
    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=1400';

  const heroTitle = heroTire?.medida || 'Medida premium';
  const heroSubtitle = [heroTire?.marca, heroTire?.modelo].filter(Boolean).join(' • ') || 'Marca em destaque';
  const heroDescription =
    heroTire?.descricao ||
    heroTire?.description ||
    'Foto do pneu em destaque com compra rápida no WhatsApp.';
  const heroPrice = Number(heroTire?.preco || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const inStock = Number(heroTire?.estoque || 0) > 0;

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
            {store.hours || 'Atendimento comercial'}
          </span>
        </div>

        <h2 className="store-hero__title">Escolha seu pneu com rapidez e confiança.</h2>
        <p className="store-hero__lead">
          Veja os pneus em destaque, compare preços e fale com a loja no WhatsApp sem complicação.
        </p>

        <div className="store-hero__actions">
          <button type="button" className="button button--primary button--xl" onClick={onWhatsAppClick}>
            <MessageSquare size={18} />
            Falar no WhatsApp
          </button>
          <button type="button" className="button button--ghost button--xl" onClick={onScrollToCatalog}>
            Ver catálogo
            <ArrowRight size={18} />
          </button>
        </div>

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
                      {inStock ? 'Pronta entrega' : 'Sob consulta'}
                    </span>
                  </div>

                  <div className="hero-product-price">
                    <span>R$</span>
                    {heroPrice}
                  </div>

                  <button
                    type="button"
                    className="button button--primary button--wide button--xl hero-buy-button"
                    onClick={() => (heroTire ? onHeroInterest(heroTire) : onScrollToCatalog())}
                    aria-label={heroTire ? `Comprar ${heroTire.marca || ''} ${heroTire.modelo || heroTire.medida || 'pneu'} pelo WhatsApp` : 'Comprar pelo WhatsApp'}
                  >
                    <MessageSquare size={18} />
                    Comprar no WhatsApp
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
          <button type="button" className="quick-cta quick-cta--primary" onClick={onOpenFilters}>
            <Search size={16} />
            Filtros
          </button>
          <button type="button" className="quick-cta" onClick={onWhatsAppClick}>
            <MessageSquare size={16} />
            WhatsApp
          </button>
          <button type="button" className="quick-cta" onClick={onScrollToCatalog}>
            <ArrowRight size={16} />
            Catálogo
          </button>
        </div>

        <div className="store-search-grid">
          <div className="search-card">
            <p className="search-card__label">Busca por medida</p>
            <input
              type="text"
              className="search-card__input"
              placeholder="Ex: 205/55 R16"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="search-card__hint">
              {uniqueSizes.slice(0, 3).map((size) => (
                <button key={size} type="button" className="mini-chip" onClick={() => setSearchQuery(size)}>
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="search-card search-card--accent">
            <p className="search-card__label">Busca por veículo</p>
            <p className="search-card__copy">Encontre pneus compatíveis por marca, modelo e versão.</p>
            {vehicleSearchApplied ? (
              <div className="search-card__active">
                <strong>
                  {vehicleBrand || 'Veículo'} {vehicleModel}
                </strong>
                <button type="button" className="text-button text-button--light" onClick={onClear}>
                  Limpar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="button button--white button--wide button--xl hero-search-action"
                onClick={onOpen}
                aria-label="Buscar pneu por veículo"
              >
                <Car size={22} />
                Buscar veículo
              </button>
            )}
          </div>

          <div className="search-card">
            <p className="search-card__label">Busca por marca</p>
            <select className="search-card__select" value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
              <option value="">Todas as marcas</option>
              {uniqueBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <div className="search-card__hint">
              <span className="search-card__hint-text">Principais marcas da loja.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
