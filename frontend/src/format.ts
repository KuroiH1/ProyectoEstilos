// Formatting + domain helpers (Peru / es-PE).

export type WarrantyRange = {
  id: string;
  category_id: string;
  min_price: number;
  max_price: number | null;
  warranty_price: number;
  sku?: string | null;
};

// S/ 1,250.00  (period decimal, comma thousands)
export function formatSoles(value: number | null | undefined): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  const parts = Math.abs(safe).toFixed(2).split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = safe < 0 ? "-" : "";
  return `${sign}S/ ${intPart}.${parts[1]}`;
}

// Normalize a brand for grouping: lowercase, no accents, trimmed.
export function normalizeBrand(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Match the warranty range for a price: min_price <= price < max_price
// (max_price null means "sin límite").
export function findRange(
  price: number,
  ranges: WarrantyRange[],
): WarrantyRange | null {
  const p = Number(price);
  if (!Number.isFinite(p)) return null;
  const sorted = [...ranges].sort((a, b) => a.min_price - b.min_price);
  for (const r of sorted) {
    const okMin = p >= r.min_price;
    const okMax = r.max_price === null || r.max_price === undefined ? true : p < r.max_price;
    if (okMin && okMax) return r;
  }
  return null;
}

export function rangeLabel(r: WarrantyRange): string {
  const max = r.max_price === null || r.max_price === undefined ? "a más" : formatSoles(r.max_price);
  if (r.max_price === null || r.max_price === undefined) {
    return `${formatSoles(r.min_price)} a más`;
  }
  return `${formatSoles(r.min_price)} – ${max}`;
}

// Parse a user-typed price string (accepts comma or dot as decimal).
export function parsePrice(text: string): number {
  if (!text) return NaN;
  const cleaned = text.replace(/\s/g, "").replace(/,/g, ".");
  return parseFloat(cleaned);
}
