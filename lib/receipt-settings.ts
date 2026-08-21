'use client';

/**
 * Receipt letterhead + printer preference, stored per-device (localStorage)
 * rather than synced through the backend.
 *
 * Deliberate scope choice: there is no tenant-wide "business profile"
 * endpoint yet (no shop address/phone/TIN column anywhere in the schema),
 * and a Bluetooth printer pairing is inherently per-device anyway — you
 * can't "sync" a physical printer connection to another terminal. Keeping
 * both together as one local settings blob avoids inventing a backend
 * feature that wasn't asked for, at the cost of the cashier at each
 * register having to fill in the shop's letterhead once per device. If the
 * shop details should instead be tenant-wide (so every terminal is
 * guaranteed to print the same header without re-entering it), that's a
 * real backend field/endpoint to add later, not a client-only fix.
 */

export type PrinterMode = 'browser' | 'bluetooth';

export interface ReceiptSettings {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  /** The SHOP's own tax id, printed on every receipt — distinct from the
   *  buyer's TIN, which is entered per-sale on the receipt itself. */
  shopTin: string;
  footerNote: string;
  printerMode: PrinterMode;
}

const STORAGE_KEY = 'nerva:receipt-settings';

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  shopName: 'Your Shop',
  shopAddress: '',
  shopPhone: '',
  shopTin: '',
  footerNote: 'Thank you for your purchase!',
  printerMode: 'browser',
};

export function getReceiptSettings(): ReceiptSettings {
  if (typeof window === 'undefined') return DEFAULT_RECEIPT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RECEIPT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_RECEIPT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_RECEIPT_SETTINGS;
  }
}

export function saveReceiptSettings(settings: ReceiptSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full/blocked (private browsing etc.) — silently no-op rather
    // than breaking the receipt flow over a preference that failed to save.
  }
}
