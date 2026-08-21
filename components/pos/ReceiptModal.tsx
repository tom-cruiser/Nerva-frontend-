// components/pos/ReceiptModal.tsx
'use client';
import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import {
  getReceiptSettings,
  saveReceiptSettings,
  ReceiptSettings,
  PrinterMode,
} from '@/lib/receipt-settings';
import {
  isBluetoothPrintingSupported,
  connectPrinter,
  disconnectPrinter,
  getConnectedPrinterName,
  printReceiptViaBluetooth,
  ReceiptLine,
} from '@/lib/thermal-printer';

export interface ReceiptItem {
  name: string;
  sku: string;
  qty: number;
  price: number;
}

export interface ReceiptData {
  transactionId: string;
  timestamp: string; // ISO
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  method: 'CASH' | 'MOMO' | 'CREDIT' | 'CARD';
  /** Only set for a CREDIT sale — who it's billed to. */
  customerName?: string;
  workerTag: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
}

const money = (n: number) => n.toLocaleString();

export default function ReceiptModal({ isOpen, onClose, receipt }: ReceiptModalProps) {
  const [settings, setSettings] = useState<ReceiptSettings>(getReceiptSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [buyerTin, setBuyerTin] = useState('');
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getReceiptSettings());
      setBuyerTin('');
      setPrintError(null);
      setPrinterName(getConnectedPrinterName());
    }
  }, [isOpen]);

  if (!isOpen || !receipt) return null;

  const updateSetting = <K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveReceiptSettings(next);
  };

  const handleConnectPrinter = async () => {
    setIsConnecting(true);
    setPrintError(null);
    try {
      const name = await connectPrinter();
      setPrinterName(name);
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : 'Failed to connect to the printer.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectPrinter = () => {
    disconnectPrinter();
    setPrinterName(null);
  };

  const buildReceiptLines = (): ReceiptLine[] => {
    const lines: ReceiptLine[] = [];
    lines.push({ text: settings.shopName || 'Your Shop', align: 'center', bold: true });
    if (settings.shopAddress) lines.push({ text: settings.shopAddress, align: 'center' });
    if (settings.shopPhone) lines.push({ text: settings.shopPhone, align: 'center' });
    if (settings.shopTin) lines.push({ text: `TIN: ${settings.shopTin}`, align: 'center' });
    lines.push({ text: '--------------------------------' });
    lines.push({ text: `Receipt: ${receipt.transactionId.slice(0, 12)}` });
    lines.push({ text: new Date(receipt.timestamp).toLocaleString() });
    lines.push({ text: `Served by: ${receipt.workerTag}` });
    if (receipt.customerName) lines.push({ text: `Customer: ${receipt.customerName}` });
    if (buyerTin.trim()) lines.push({ text: `Buyer TIN: ${buyerTin.trim()}` });
    lines.push({ text: '--------------------------------' });
    for (const item of receipt.items) {
      lines.push({ text: `${item.name} x${item.qty}` });
      lines.push({ text: `  ${money(item.price)} each = ${money(item.price * item.qty)}`, align: 'right' });
    }
    lines.push({ text: '--------------------------------' });
    lines.push({ text: `Subtotal: ${money(receipt.subtotal)}`, align: 'right' });
    if (receipt.tax > 0) lines.push({ text: `Tax: ${money(receipt.tax)}`, align: 'right' });
    lines.push({ text: `TOTAL: XAF ${money(receipt.total)}`, align: 'right', bold: true });
    lines.push({ text: `Payment: ${receipt.method}`, align: 'right' });
    lines.push({ text: '' });
    if (settings.footerNote) lines.push({ text: settings.footerNote, align: 'center' });
    return lines;
  };

  const handlePrint = async () => {
    setPrintError(null);
    if (settings.printerMode === 'browser') {
      window.print();
      return;
    }
    setIsPrinting(true);
    try {
      await printReceiptViaBluetooth(buildReceiptLines());
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : 'Failed to print — check the printer connection.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:bg-white print:p-0">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[92vh] overflow-y-auto print:shadow-none print:rounded-none print:max-w-none print:max-h-none">
        {/* Header — hidden on print */}
        <div className="print:hidden sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-5 py-3.5 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-bold text-zinc-900">Receipt</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Printable receipt body */}
        <div id="receipt-print-area" className="p-5 font-mono text-[12px] text-zinc-800 leading-relaxed">
          <p className="text-center font-bold text-sm">{settings.shopName || 'Your Shop'}</p>
          {settings.shopAddress && <p className="text-center text-zinc-500">{settings.shopAddress}</p>}
          {settings.shopPhone && <p className="text-center text-zinc-500">{settings.shopPhone}</p>}
          {settings.shopTin && <p className="text-center text-zinc-500">TIN: {settings.shopTin}</p>}

          <div className="border-t border-dashed border-zinc-300 my-2" />

          <p>Receipt: {receipt.transactionId.slice(0, 12)}</p>
          <p>{new Date(receipt.timestamp).toLocaleString()}</p>
          <p>Served by: {receipt.workerTag}</p>
          {receipt.customerName && <p>Customer: {receipt.customerName}</p>}
          {buyerTin.trim() && <p>Buyer TIN: {buyerTin.trim()}</p>}

          <div className="border-t border-dashed border-zinc-300 my-2" />

          {receipt.items.map((item, idx) => (
            <div key={idx} className="flex justify-between gap-2">
              <span className="truncate">{item.name} x{item.qty}</span>
              <span className="shrink-0">{money(item.price * item.qty)}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-zinc-300 my-2" />

          <div className="flex justify-between"><span>Subtotal</span><span>{money(receipt.subtotal)}</span></div>
          {receipt.tax > 0 && (
            <div className="flex justify-between"><span>Tax</span><span>{money(receipt.tax)}</span></div>
          )}
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>TOTAL</span><span>XAF {money(receipt.total)}</span>
          </div>
          <div className="flex justify-between text-zinc-500 mt-1">
            <span>Payment</span><span>{receipt.method}</span>
          </div>

          {settings.footerNote && (
            <p className="text-center text-zinc-500 mt-3">{settings.footerNote}</p>
          )}
        </div>

        {/* Controls — hidden on print */}
        <div className="print:hidden px-5 pb-5 space-y-3">
          <label className="block">
            <span className="text-xs font-bold text-zinc-600">Buyer TIN (optional)</span>
            <input
              value={buyerTin}
              onChange={(e) => setBuyerTin(e.target.value)}
              placeholder="Ask the buyer if they need it on the receipt"
              className="mt-1 w-full rounded-lg border border-zinc-200 text-sm px-3 py-2 outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/10"
            />
          </label>

          {printError && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-lg px-3 py-2">
              {printError}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsSettingsOpen((v) => !v)}
            >
              {isSettingsOpen ? 'Hide Settings' : 'Printer / Shop Settings'}
            </Button>
            <Button
              className="flex-1 bg-[#0052ff] hover:bg-[#003bbf] text-white"
              onClick={handlePrint}
              loading={isPrinting}
            >
              Print Receipt
            </Button>
          </div>

          {isSettingsOpen && (
            <div className="space-y-3 bg-zinc-50 rounded-xl border border-zinc-200/60 p-4">
              <div>
                <span className="text-xs font-bold text-zinc-600">Shop Name</span>
                <input
                  value={settings.shopName}
                  onChange={(e) => updateSetting('shopName', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 text-sm px-3 py-2 outline-none focus:border-[#0052ff]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-bold text-zinc-600">Address</span>
                  <input
                    value={settings.shopAddress}
                    onChange={(e) => updateSetting('shopAddress', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 text-sm px-3 py-2 outline-none focus:border-[#0052ff]"
                  />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-600">Phone</span>
                  <input
                    value={settings.shopPhone}
                    onChange={(e) => updateSetting('shopPhone', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 text-sm px-3 py-2 outline-none focus:border-[#0052ff]"
                  />
                </div>
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-600">Shop TIN (your own tax ID)</span>
                <input
                  value={settings.shopTin}
                  onChange={(e) => updateSetting('shopTin', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 text-sm px-3 py-2 outline-none focus:border-[#0052ff]"
                />
              </div>
              <div>
                <span className="text-xs font-bold text-zinc-600">Footer Note</span>
                <input
                  value={settings.footerNote}
                  onChange={(e) => updateSetting('footerNote', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 text-sm px-3 py-2 outline-none focus:border-[#0052ff]"
                />
              </div>

              <div className="border-t border-zinc-200/70 pt-3">
                <span className="text-xs font-bold text-zinc-600">Printer Connection</span>
                <p className="text-[11px] text-zinc-400 mt-0.5 mb-2">
                  This is saved on this device only — each till/terminal is set up separately.
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['browser', 'bluetooth'] as PrinterMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => updateSetting('printerMode', m)}
                      className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${
                        settings.printerMode === m
                          ? 'bg-[#0052ff] border-[#0052ff] text-white'
                          : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'
                      }`}
                    >
                      {m === 'browser' ? 'System Print Dialog' : 'Bluetooth Printer'}
                    </button>
                  ))}
                </div>

                {settings.printerMode === 'bluetooth' && (
                  <div className="mt-2.5">
                    {!isBluetoothPrintingSupported() ? (
                      <p className="text-xs font-semibold text-amber-600">
                        This browser doesn't support Bluetooth printing — try Chrome or Edge on desktop or Android.
                      </p>
                    ) : printerName ? (
                      <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                        <span className="text-xs font-bold text-emerald-700 truncate">Connected: {printerName}</span>
                        <button
                          onClick={handleDisconnectPrinter}
                          className="text-[11px] font-bold text-red-500 uppercase shrink-0"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleConnectPrinter}
                        loading={isConnecting}
                      >
                        Connect Printer
                      </Button>
                    )}
                    <p className="text-[11px] text-zinc-400 mt-1.5">
                      Works with most generic ESC/POS Bluetooth thermal printers. If yours doesn't show up or
                      printing fails, use System Print Dialog instead — it works with any printer set up on this
                      device, thermal included.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print-mode CSS: only the receipt body is visible, narrowed to a
          typical 80mm thermal roll width. */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area,
          #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 72mm;
          }
        }
      `}</style>
    </div>
  );
}
