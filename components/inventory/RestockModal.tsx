// components/inventory/RestockModal.tsx
'use client';
import React, { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { inventory } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import type { Product } from '@/lib/types';

interface RestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  /** Called after a successful restock, so the caller can reload its list
   *  (the product's stock_quantity has just changed server-side). */
  onRestocked: () => void;
}

export default function RestockModal({ isOpen, onClose, product, onRestocked }: RestockModalProps) {
  const [quantity, setQuantity] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset the form every time a different product's restock is opened.
  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setSupplierName('');
      setSupplierContact('');
      setUnitCost('');
      setNotes('');
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const qty = Number(quantity);
    if (!quantity || !Number.isInteger(qty) || qty <= 0) {
      next.quantity = 'Enter a whole number greater than 0.';
    }
    if (!supplierName.trim()) {
      next.supplierName = 'Supplier name is required.';
    }
    if (unitCost && Number(unitCost) < 0) {
      next.unitCost = 'Unit cost must be a positive number.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await inventory.restockProduct(product.id, {
        supplierName: supplierName.trim(),
        quantityReceived: Number(quantity),
        supplierContact: supplierContact.trim() || undefined,
        unitCost: unitCost ? Number(unitCost) : undefined,
        notes: notes.trim() || undefined,
      });
      onRestocked();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Failed to record this delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Restock</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {product.name} <span className="font-mono text-zinc-400">({product.product_sku})</span> —
              currently {product.stock_quantity} {product.base_unit} in stock
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1.5">
              Quantity Received <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`e.g., 50 (${product.base_unit})`}
              className={errors.quantity ? 'border-red-300 focus:border-red-500' : ''}
            />
            {errors.quantity && <p className="text-xs text-red-500 mt-1.5">{errors.quantity}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1.5">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g., Golden Wholesale Ltd"
              className={errors.supplierName ? 'border-red-300 focus:border-red-500' : ''}
            />
            {errors.supplierName && <p className="text-xs text-red-500 mt-1.5">{errors.supplierName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">Supplier Contact</label>
              <Input
                value={supplierContact}
                onChange={(e) => setSupplierContact(e.target.value)}
                placeholder="Phone or email"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">Unit Cost (XAF)</label>
              <Input
                type="number"
                min="0"
                step="any"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Optional"
                className={errors.unitCost ? 'border-red-300 focus:border-red-500' : ''}
              />
              {errors.unitCost && <p className="text-xs text-red-500 mt-1.5">{errors.unitCost}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional — e.g. invoice number, delivery condition"
              className="w-full rounded-lg border border-zinc-200 text-sm px-3 py-2 outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/10"
            />
          </div>

          {submitError && (
            <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200/80 rounded-lg px-3 py-2.5">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#0052ff] hover:bg-[#003bbf] text-white"
              loading={isSubmitting}
            >
              Add Stock
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
