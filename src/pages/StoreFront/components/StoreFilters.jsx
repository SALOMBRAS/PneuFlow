import React from 'react';
import { Search, Filter, X, Car, Bike, SlidersHorizontal, Sparkles, ChevronRight } from 'lucide-react';

export default function StoreFilters({
  searchQuery,
  setSearchQuery,
  filterBrand,
  setFilterBrand,
  filterStockOnly,
  setFilterStockOnly,
  catalogVehicleType,
  setCatalogVehicleType,
  uniqueBrands,
  store,
  vehicleType,
  setVehicleType,
  onOpenVehicleSearch,
  onClose,
  variant = 'desktop',
}) {
  const isDrawer = variant === 'drawer';

  const clearAll = () => {
    setSearchQuery('');
    setFilterBrand('');
    setFilterStockOnly(false);
    setCatalogVehicleType('todos');
    if (store?.tipo_vitrine === 'ambos') {
      setVehicleType(null);
    }
  };

  return (
    <div className={`store-filters ${isDrawer ? 'store-filters--drawer' : ''}`}>
      <div className="store-filters__header">
        <div>
          <p className="section-kicker">Filtros inteligentes</p>
          <h3>Refine sua busca</h3>
        </div>

        {isDrawer && (
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar filtros">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="filter-panel">
        <label className="filter-label">
          <Car size={14} />
          Ver pneus para:
        </label>
        <div className="vehicle-toggle-grid">
          <button
            type="button"
            onClick={() => setCatalogVehicleType('todos')}
            className={`vehicle-toggle ${catalogVehicleType === 'todos' ? 'vehicle-toggle--active' : ''}`}
            style={{ fontSize: '0.8rem' }}
            aria-label="Mostrar pneus para todos os veículos"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"
              style={{ marginRight: '4px' }}
            >
              <path d="M12 9H2V7.5c0-.5.3-1 .8-1.2l1.2-2.3c.2-.4.7-.6 1.2-.6h4.6c.5 0 1 .2 1.2.6l1.2 2.3c.5.2.8.7.8 1.2V9z" />
              <circle cx="4.5" cy="9" r="1.5" />
              <circle cx="9.5" cy="9" r="1.5" />
              <circle cx="15.5" cy="18" r="2.5" />
              <circle cx="21.5" cy="18" r="2.5" />
              <path d="M18.5 18v-3l-2-2 3-2 1 2h2" />
            </svg>
            <span>Todos</span>
          </button>
          <button
            type="button"
            onClick={() => setCatalogVehicleType('carro')}
            className={`vehicle-toggle ${catalogVehicleType === 'carro' ? 'vehicle-toggle--active' : ''}`}
            style={{ fontSize: '0.8rem' }}
            aria-label="Mostrar pneus para carros"
          >
            <Car size={20} />
            <span>Carro</span>
          </button>
          <button
            type="button"
            onClick={() => setCatalogVehicleType('moto')}
            className={`vehicle-toggle ${catalogVehicleType === 'moto' ? 'vehicle-toggle--active' : ''}`}
            style={{ fontSize: '0.8rem' }}
            aria-label="Mostrar pneus para motos"
          >
            <Bike size={20} />
            <span>Moto</span>
          </button>
        </div>
      </div>

      <div className="filter-panel">
        <label className="filter-label" htmlFor="storefront-search">
          <Search size={14} />
          Buscar por medida, marca ou modelo
        </label>
        <div className="filter-input-wrap">
          <input
            id="storefront-search"
            type="text"
            placeholder="Ex: 205/55 R16"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
          {searchQuery && (
            <button type="button" className="filter-input-clear" onClick={() => setSearchQuery('')} aria-label="Limpar busca">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="filter-panel">
        <div className="filter-row">
          <label className="filter-label">
            <Filter size={14} />
            Marcas
          </label>
          <button type="button" className="text-button" onClick={() => setFilterBrand('')}>
            Todas
          </button>
        </div>

        <div className="brand-list">
          {uniqueBrands.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => setFilterBrand(brand)}
              className={`brand-pill ${filterBrand === brand ? 'brand-pill--active' : ''}`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-panel filter-panel--soft">
        <div className="filter-row">
          <div>
            <p className="filter-title">Somente pronta entrega</p>
            <p className="filter-description">Prioriza itens com estoque disponível.</p>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={filterStockOnly}
              onChange={(e) => setFilterStockOnly(e.target.checked)}
            />
            <span className="switch__track">
              <span className="switch__thumb" />
            </span>
          </label>
        </div>
      </div>

      <div className="filter-panel filter-panel--cta">
        <button type="button" className="button button--primary button--wide" onClick={onOpenVehicleSearch}>
          <Sparkles size={16} />
          Buscar veículo
        </button>
        <button type="button" className="button button--ghost button--wide" onClick={clearAll}>
          <SlidersHorizontal size={16} />
          Limpar filtros
        </button>
      </div>

      {isDrawer && (
        <button type="button" className="button button--ghost button--wide button--inline" onClick={onClose}>
          <ChevronRight size={16} />
          Voltar para a vitrine
        </button>
      )}
    </div>
  );
}
