const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const DIGIT_SANITIZER = /[^\d.,]/g;
const WHITESPACE_SANITIZER = /[\s\u00A0]/g;

const clampFraction = (value) => String(value || '').replace(/\D/g, '').slice(0, 2);

const hasOnlyThousandsSeparator = (raw, separator) => {
  const firstIndex = raw.indexOf(separator);
  const lastIndex = raw.lastIndexOf(separator);

  if (firstIndex !== lastIndex) {
    return false;
  }

  const [left = '', right = ''] = raw.split(separator);
  const leftDigits = left.replace(/\D/g, '');
  const rightDigits = right.replace(/\D/g, '');

  return leftDigits.length >= 1 && rightDigits.length === 3;
};

export const parseBRLCurrency = (input) => {
  if (input == null) {
    return null;
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input < 0) {
      return null;
    }
    return Number(input.toFixed(2));
  }

  const normalized = String(input)
    .replace(/R\$/gi, '')
    .replace(WHITESPACE_SANITIZER, '')
    .replace(DIGIT_SANITIZER, '');

  if (!normalized || normalized.includes('-')) {
    return null;
  }

  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');
  const hasComma = lastComma >= 0;
  const hasDot = lastDot >= 0;

  let integerDigits = normalized;
  let fractionDigits = '';

  if (hasComma && hasDot) {
    const decimalIndex = Math.max(lastComma, lastDot);
    integerDigits = normalized.slice(0, decimalIndex).replace(/\D/g, '');
    fractionDigits = clampFraction(normalized.slice(decimalIndex + 1));
  } else if (hasComma || hasDot) {
    const separator = hasComma ? ',' : '.';

    if (hasOnlyThousandsSeparator(normalized, separator)) {
      integerDigits = normalized.replace(/\D/g, '');
    } else {
      const decimalIndex = normalized.lastIndexOf(separator);
      integerDigits = normalized.slice(0, decimalIndex).replace(/\D/g, '');
      fractionDigits = clampFraction(normalized.slice(decimalIndex + 1));
    }
  } else {
    integerDigits = normalized.replace(/\D/g, '');
  }

  if (!integerDigits && !fractionDigits) {
    return null;
  }

  const integerPart = integerDigits || '0';
  const decimalPart = fractionDigits.padEnd(fractionDigits ? 2 : 0, '0');
  const serialized = decimalPart ? `${integerPart}.${decimalPart}` : `${integerPart}.00`;
  const value = Number(serialized);

  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Number(value.toFixed(2));
};

export const normalizeBRLCurrencyForDatabase = (input) => {
  const parsed = parseBRLCurrency(input);
  if (parsed == null) {
    return null;
  }
  return parsed.toFixed(2);
};

export const formatBRLCurrency = (value) => {
  const amount = parseBRLCurrency(value);
  return BRL_FORMATTER.format(amount ?? 0);
};

export const formatBRLCurrencyInput = (value) => {
  const amount = parseBRLCurrency(value);

  if (amount == null) {
    return '';
  }

  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
