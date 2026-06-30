import { useEffect, useState } from 'react';
import { formatBRLCurrencyInput, parseBRLCurrency } from '../utils/currency';

export default function CurrencyInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  className = 'form-input',
  required = false,
  disabled = false,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const [draft, setDraft] = useState(value || '');

  useEffect(() => {
    setDraft(value || '');
  }, [value]);

  const handleChange = (event) => {
    const nextValue = event.target.value;
    setDraft(nextValue);
    onChange?.(nextValue);
  };

  const handleBlur = (event) => {
    const parsed = parseBRLCurrency(draft);
    const formatted = parsed == null ? draft.trim() : formatBRLCurrencyInput(parsed);
    setDraft(formatted);
    onChange?.(formatted);
    onBlur?.(event);
  };

  return (
    <input
      id={id}
      type="text"
      name={name}
      inputMode="decimal"
      autoComplete="off"
      spellCheck="false"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
    />
  );
}
