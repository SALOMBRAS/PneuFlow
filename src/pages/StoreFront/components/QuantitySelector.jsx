import React from 'react';

const clampQuantity = (value, max) => {
  const safeMax = Math.max(0, Number(max) || 0);
  if (safeMax <= 0) return 0;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;

  return Math.min(Math.max(parsed, 1), safeMax);
};

export default function QuantitySelector({
  value,
  max,
  onChange,
  label = 'Quantidade desejada',
  compact = false,
  disabled = false,
  className = ''
}) {
  const safeMax = Math.max(0, Number(max) || 0);
  const isUnavailable = safeMax <= 0;
  const currentValue = clampQuantity(value, safeMax);
  const isDisabled = disabled || isUnavailable;

  const updateQuantity = (nextValue) => {
    if (isDisabled) return;
    onChange(clampQuantity(nextValue, safeMax));
  };

  return (
    <div className={`quantity-selector ${compact ? 'quantity-selector--compact' : ''} ${className}`}>
      <div className="quantity-selector__header">
        <span>{label}</span>
        <small>{isUnavailable ? 'Indisponivel' : `Disponivel: ${safeMax}`}</small>
      </div>

      <div className="quantity-selector__control">
        <button
          type="button"
          onClick={() => updateQuantity(currentValue - 1)}
          disabled={isDisabled || currentValue <= 1}
          aria-label="Diminuir quantidade"
        >
          -
        </button>

        <input
          type="number"
          min="1"
          max={safeMax || 1}
          value={currentValue || ''}
          onChange={(event) => updateQuantity(event.target.value)}
          disabled={isDisabled}
          aria-label={label}
        />

        <button
          type="button"
          onClick={() => updateQuantity(currentValue + 1)}
          disabled={isDisabled || currentValue >= safeMax}
          aria-label="Aumentar quantidade"
        >
          +
        </button>
      </div>
    </div>
  );
}
