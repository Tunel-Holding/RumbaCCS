// Small helper to format event prices with currency symbol
export function formatPrice(rawPrice, moneda) {
  // normalize
  if (rawPrice === null || rawPrice === undefined) return '';
  const asString = String(rawPrice).trim();
  // treat empty or special
  if (asString === '' || asString.toLowerCase() === 'null') return '';

  // detect free
  if (asString === '0' || asString === '0.00' || asString === '0.0') return 'Entrada libre';

  // try numeric value
  const num = Number(asString);
  if (!Number.isFinite(num)) return asString; // fallback to original

  // determine currency symbol
  let symbol = '$';
  if (moneda) {
    const m = String(moneda).toLowerCase();
    if (m.includes('bs') || m.includes('ves') || m.includes('bolivar') || m.includes('bolíva')) {
      symbol = 'Bs';
    } else if (m.includes('usd') || m.includes('$') || m.includes('dolar') || m.includes('dólar')) {
      symbol = '$';
    }
  }

  // format with thousands separator, no currency style to keep symbol custom
  const formatted = num.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: (Number.isInteger(num) ? 0 : 2) });
  return `${symbol} ${formatted}`;
}
