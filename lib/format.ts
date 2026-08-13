/**
 * Shared formatters for the Super Admin Command Center
 * (app/(platform)/platform/**). Every money figure returned by
 * services/superadmin (mrr_cents, gmv_lifetime_cents, price_cents, …) is an
 * integer count of cents — these helpers are the one place that assumption
 * is encoded, so a currency-unit bug only ever needs fixing here.
 */

/** `1284500` (cents) → `"XAF 12,845.00"`. Platform aggregates span every
 *  tenant's currency, so this deliberately doesn't localize to any one
 *  tenant's `currency` column — XAF is the platform default (see
 *  `platform_settings.default_currency`). */
export function formatCents(cents: number | null | undefined): string {
  const value = ((cents ?? 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `XAF ${value}`;
}

/** `0.083` → `"8.3%"` */
export function formatPercent(ratio: number | null | undefined, digits = 1): string {
  return `${((ratio ?? 0) * 100).toFixed(digits)}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Coarse "how long ago" for audit-log / error-log feeds. */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** `SOFT_DELETE` → `"Soft Delete"` — for audit-log action / error-code chips. */
export function humanize(token: string | null | undefined): string {
  if (!token) return '—';
  return token
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
