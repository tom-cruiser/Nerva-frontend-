// components/inventory/ImportProductsModal.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { inventory } from '@/lib/endpoints';
import type { ImportProductsResponse } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import Button from '@/components/ui/Button';

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after every import attempt that reaches the server (even a
   *  partial one) — the successfully-processed rows should show up
   *  immediately, matching "update the inventory table state immediately
   *  ... without a full page reload". */
  onImported: () => void;
}

/**
 * Chrome deliberately mirrors ProductFormModal.tsx's overlay/header/footer
 * structure (z-50, bg-black/50 backdrop-blur-sm, white rounded-2xl panel,
 * sticky header with title/subtitle/close-X) so every add/edit/import
 * surface in the Inventory module reads as one system.
 */
export default function ImportProductsModal({ isOpen, onClose, onImported }: ImportProductsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ImportProductsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!file) {
      setError('Choose a .csv or .xlsx file first');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await inventory.importProducts(file);
      setResult(res);
      onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Import Products</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Bulk create or update products from a .csv or .xlsx file</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-[12.5px] text-zinc-500 leading-relaxed">
            Required columns: <strong className="text-zinc-700">SKU/Barcode</strong>,{' '}
            <strong className="text-zinc-700">Name</strong>, <strong className="text-zinc-700">Price</strong>,{' '}
            <strong className="text-zinc-700">Base Unit</strong>, <strong className="text-zinc-700">Stock</strong>.
            Optional: Min Stock Level, Reorder Quantity, Category. A row matching an existing SKU is updated; a new
            SKU is created. Malformed rows are skipped and reported below — the rest of the file still imports.
          </p>

          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-[13px] text-zinc-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-[12.5px] file:font-bold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 file:cursor-pointer cursor-pointer"
          />

          {error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-lg px-3 py-2.5">
              {error}
            </p>
          )}

          {result && (
            <div className="rounded-xl border border-zinc-200/60 bg-zinc-50 p-3.5 space-y-2">
              <p className="text-[13px] font-bold text-zinc-800">
                {result.created} created · {result.updated} updated · {result.skipped} skipped
              </p>
              {result.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-[11.5px] text-red-600">
                      Row {e.row}{e.sku ? ` (${e.sku})` : ''}: {e.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200/60 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-zinc-200 bg-white hover:bg-zinc-50"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !file}
            className="bg-[#0052ff] hover:bg-[#003bbf] text-white font-bold px-6"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Importing...
              </>
            ) : (
              'Import'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
