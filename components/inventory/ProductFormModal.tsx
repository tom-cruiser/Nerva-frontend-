// components/inventory/ProductFormModal.tsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import type { Product, ProductUnit } from '@/lib/types';
import { inventory } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Plus, X as XIcon, Star } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>) => Promise<void>;
  product?: Product | null;
  isSubmitting?: boolean;
}

export default function ProductFormModal({
  isOpen,
  onClose,
  onSave,
  product = null,
  isSubmitting = false,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    product_sku: '',
    name: '',
    description: '',
    category: '',
    unit_price: 0,
    stock_quantity: 0,
    reorder_level: 0,
    reorder_quantity: null,
    base_unit: 'pieces',
    cost_price: null,
    tax_rate: 0,
    barcode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setFormData({
        product_sku: product.product_sku || '',
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        unit_price: product.unit_price || 0,
        stock_quantity: product.stock_quantity || 0,
        reorder_level: product.reorder_level || 0,
        reorder_quantity: product.reorder_quantity ?? null,
        base_unit: product.base_unit || 'pieces',
        cost_price: product.cost_price ?? null,
        tax_rate: product.tax_rate ?? 0,
        barcode: product.barcode || '',
        // Confirmed-broken bug fix: this modal never carried `version`
        // forward, yet PATCH /products/:id has always required it for its
        // optimistic lock — every edit-and-save was failing validation.
        // Now the value the product was loaded with is round-tripped back.
        version: product.version,
      });
    } else {
      // Reset form for new product
      setFormData({
        product_sku: '',
        name: '',
        description: '',
        category: '',
        unit_price: 0,
        stock_quantity: 0,
        reorder_level: 0,
        reorder_quantity: null,
        base_unit: 'pieces',
        cost_price: null,
        tax_rate: 0,
        barcode: '',
      });
    }
    setErrors({});
    setTouched({});
  }, [product, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_sku?.trim()) {
      newErrors.product_sku = 'SKU is required';
    } else if (formData.product_sku.length < 3) {
      newErrors.product_sku = 'SKU must be at least 3 characters';
    }

    if (!formData.name?.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Product name must be at least 2 characters';
    }

    if (!formData.category?.trim()) {
      newErrors.category = 'Category is required';
    }

    if (formData.unit_price === undefined || formData.unit_price < 0) {
      newErrors.unit_price = 'Unit price must be a positive number';
    }

    if (formData.stock_quantity === undefined || formData.stock_quantity < 0) {
      newErrors.stock_quantity = 'Stock quantity must be a positive number';
    }

    if (formData.reorder_level === undefined || formData.reorder_level < 0) {
      newErrors.reorder_level = 'Reorder level must be a positive number';
    }

    if (!formData.base_unit?.trim()) {
      newErrors.base_unit = 'Base unit is required';
    }

    if (formData.reorder_quantity !== null && formData.reorder_quantity !== undefined && formData.reorder_quantity < 0) {
      newErrors.reorder_quantity = 'Reorder quantity must be a positive number';
    }

    if (formData.cost_price !== null && formData.cost_price !== undefined && formData.cost_price < 0) {
      newErrors.cost_price = 'Cost price must be a positive number';
    }

    if (
      formData.tax_rate !== null && formData.tax_rate !== undefined &&
      (formData.tax_rate < 0 || formData.tax_rate > 100)
    ) {
      newErrors.tax_rate = 'Tax rate must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof Product, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is touched and changed
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: keyof Product) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (!validate()) {
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save product:', error);
      // Handle error - show in UI
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">
              {product ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {product ? 'Update product details' : 'Create a new product in inventory'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                SKU <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.product_sku || ''}
                onChange={(e) => handleChange('product_sku', e.target.value)}
                onBlur={() => handleBlur('product_sku')}
                placeholder="e.g., RICE-50KG"
                className={errors.product_sku && touched.product_sku ? 'border-red-300 focus:border-red-500' : ''}
              />
              {errors.product_sku && touched.product_sku && (
                <p className="text-xs text-red-500 mt-1.5">{errors.product_sku}</p>
              )}
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Barcode
              </label>
              <Input
                value={formData.barcode || ''}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Optional barcode"
              />
            </div>

            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="e.g., Premium Rice 50kg"
                className={errors.name && touched.name ? 'border-red-300 focus:border-red-500' : ''}
              />
              {errors.name && touched.name && (
                <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                onBlur={() => handleBlur('category')}
                className={`w-full px-3.5 py-2.5 rounded-xl border ${
                  errors.category && touched.category
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-zinc-200 focus:border-[#0052ff]'
                } bg-white text-zinc-800 text-sm font-medium transition-colors outline-none`}
              >
                <option value="">Select category</option>
                <option value="Cereals">Cereals</option>
                <option value="Oils">Oils</option>
                <option value="Dry Goods">Dry Goods</option>
                <option value="Canned">Canned</option>
                <option value="Dairy">Dairy</option>
                <option value="Hygiene">Hygiene</option>
                <option value="Beverages">Beverages</option>
                <option value="Snacks">Snacks</option>
                <option value="Other">Other</option>
              </select>
              {errors.category && touched.category && (
                <p className="text-xs text-red-500 mt-1.5">{errors.category}</p>
              )}
            </div>

            {/* Base Unit */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Base Unit <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.base_unit || ''}
                onChange={(e) => handleChange('base_unit', e.target.value)}
                onBlur={() => handleBlur('base_unit')}
                placeholder="e.g., pieces, kg, ml"
                className={errors.base_unit && touched.base_unit ? 'border-red-300 focus:border-red-500' : ''}
              />
              <p className="text-[11px] text-zinc-400 mt-1">The unit Stock Quantity is tracked in.</p>
              {errors.base_unit && touched.base_unit && (
                <p className="text-xs text-red-500 mt-1.5">{errors.base_unit}</p>
              )}
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Unit Price (XAF) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                value={formData.unit_price || ''}
                onChange={(e) => handleChange('unit_price', Number(e.target.value))}
                onBlur={() => handleBlur('unit_price')}
                placeholder="e.g., 18000"
                className={errors.unit_price && touched.unit_price ? 'border-red-300 focus:border-red-500' : ''}
              />
              {errors.unit_price && touched.unit_price && (
                <p className="text-xs text-red-500 mt-1.5">{errors.unit_price}</p>
              )}
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Cost Price (XAF)
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                value={formData.cost_price ?? ''}
                onChange={(e) => handleChange('cost_price', e.target.value === '' ? null : Number(e.target.value))}
                onBlur={() => handleBlur('cost_price')}
                placeholder="e.g., 12000"
                className={errors.cost_price && touched.cost_price ? 'border-red-300 focus:border-red-500' : ''}
              />
              <p className="text-[11px] text-zinc-400 mt-1">Used to calculate Net Profit on the Reports page.</p>
              {errors.cost_price && touched.cost_price && (
                <p className="text-xs text-red-500 mt-1.5">{errors.cost_price}</p>
              )}
            </div>

            {/* Tax Rate */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Tax Rate (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="any"
                // `|| ''` (not `?? ''`) deliberately — tax_rate defaults to a
                // real 0, and 0 is falsy, so this renders an empty field
                // instead of a literal "0" the user can't backspace past
                // (which then snapped straight back on the next keystroke).
                // Matches unit_price/reorder_level below, which already do
                // this for the same reason.
                value={formData.tax_rate || ''}
                onChange={(e) => handleChange('tax_rate', e.target.value === '' ? 0 : Number(e.target.value))}
                onBlur={() => handleBlur('tax_rate')}
                placeholder="e.g., 5"
                className={errors.tax_rate && touched.tax_rate ? 'border-red-300 focus:border-red-500' : ''}
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                Set per product — there is no store-wide tax rate. Leave at 0 if this item isn&apos;t taxed.
              </p>
              {errors.tax_rate && touched.tax_rate && (
                <p className="text-xs text-red-500 mt-1.5">{errors.tax_rate}</p>
              )}
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.001"
                // Same `|| ''` fix as tax_rate above — stock_quantity also
                // defaults to a real 0, which `?? ''` would render as a
                // literal, un-backspaceable "0".
                value={formData.stock_quantity || ''}
                onChange={(e) => handleChange('stock_quantity', Number(e.target.value))}
                onBlur={() => handleBlur('stock_quantity')}
                placeholder="e.g., 10"
                className={errors.stock_quantity && touched.stock_quantity ? 'border-red-300 focus:border-red-500' : ''}
              />
              {errors.stock_quantity && touched.stock_quantity && (
                <p className="text-xs text-red-500 mt-1.5">{errors.stock_quantity}</p>
              )}
            </div>

            {/* Reorder Level */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Reorder Level (Min Stock) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formData.reorder_level || ''}
                onChange={(e) => handleChange('reorder_level', Number(e.target.value))}
                onBlur={() => handleBlur('reorder_level')}
                placeholder="e.g., 5"
                className={errors.reorder_level && touched.reorder_level ? 'border-red-300 focus:border-red-500' : ''}
              />
              {errors.reorder_level && touched.reorder_level && (
                <p className="text-xs text-red-500 mt-1.5">{errors.reorder_level}</p>
              )}
            </div>

            {/* Reorder Quantity */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Reorder Quantity
              </label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={formData.reorder_quantity ?? ''}
                onChange={(e) => handleChange('reorder_quantity', e.target.value === '' ? null : Number(e.target.value))}
                onBlur={() => handleBlur('reorder_quantity')}
                placeholder="Recommended order size"
                className={errors.reorder_quantity && touched.reorder_quantity ? 'border-red-300 focus:border-red-500' : ''}
              />
              {errors.reorder_quantity && touched.reorder_quantity && (
                <p className="text-xs text-red-500 mt-1.5">{errors.reorder_quantity}</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-medium transition-colors outline-none focus:border-[#0052ff] resize-y"
                placeholder="Product description (optional)"
              />
            </div>
          </div>

          {/* Selling Units — only manageable once the product exists, since
              each unit attaches to a real product id. New products save
              their base fields first, then this section becomes available
              on the next Edit. */}
          <div className="pt-2 border-t border-zinc-200/60">
            {product ? (
              <SellingUnitsEditor productId={product.id} />
            ) : (
              <p className="text-[12px] text-zinc-400">
                Save this product first to add non-base selling units (e.g. "Carton" = 24 pieces).
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-200/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-zinc-200 bg-white hover:bg-zinc-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0052ff] hover:bg-[#003bbf] text-white font-bold px-6"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {product ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                product ? 'Update Product' : 'Create Product'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Non-base selling units (e.g. "Carton" = 24 pieces) for an existing
 * product. Each add/remove/star-as-default action is its own immediate API
 * call — not deferred to the surrounding form's Save button — since units
 * are a separate sub-resource (product_units) with its own endpoints,
 * matching how other quick-attach lists elsewhere in the console behave.
 */
function SellingUnitsEditor({ productId }: { productId: string }) {
  const [units, setUnits] = useState<ProductUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState('');
  const [newFactor, setNewFactor] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await inventory.units.list(productId);
      setUnits(res.units);
    } catch (err) {
      if (!(err instanceof ApiError && err.isNotImplemented)) {
        setError(err instanceof ApiError ? err.message : 'Failed to load selling units');
      }
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const factor = Number(newFactor);
    if (!newUnitName.trim() || !Number.isFinite(factor) || factor <= 0) {
      setError('Enter a unit name and a positive conversion factor');
      return;
    }
    setIsAdding(true);
    setError(null);
    try {
      await inventory.units.create(productId, { unit_name: newUnitName.trim(), conversion_factor: factor });
      setNewUnitName('');
      setNewFactor('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add unit');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await inventory.units.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove unit');
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await inventory.units.update(id, { is_default: true });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to set default unit');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <label className="block text-sm font-bold text-zinc-700 mb-1.5">Selling Units</label>
      <p className="text-[11px] text-zinc-400 mb-2.5">
        Non-base units this product can be sold in (e.g. "Carton" = 24 pieces).
      </p>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {isLoading ? (
        <p className="text-xs text-zinc-400">Loading…</p>
      ) : (
        <div className="space-y-2 mb-3">
          {units.map((u) => (
            <div key={u.id} className="flex items-center gap-2 bg-zinc-50 border border-zinc-200/60 rounded-xl px-3 py-2">
              <button
                type="button"
                onClick={() => handleSetDefault(u.id)}
                disabled={busyId === u.id}
                title={u.is_default ? 'Default selling unit' : 'Set as default'}
                className={`shrink-0 ${u.is_default ? 'text-amber-500' : 'text-zinc-300 hover:text-amber-400'}`}
              >
                <Star size={14} fill={u.is_default ? 'currentColor' : 'none'} />
              </button>
              <span className="text-[13px] font-semibold text-zinc-800">{u.unit_name}</span>
              <span className="text-[12px] text-zinc-400">= {u.conversion_factor} base units</span>
              <button
                type="button"
                onClick={() => handleRemove(u.id)}
                disabled={busyId === u.id}
                className="ml-auto text-zinc-400 hover:text-red-500 disabled:opacity-50"
              >
                <XIcon size={14} />
              </button>
            </div>
          ))}
          {units.length === 0 && <p className="text-xs text-zinc-400">No selling units defined yet.</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={newUnitName}
          onChange={(e) => setNewUnitName(e.target.value)}
          placeholder="Unit name (e.g. Carton)"
          className="flex-1"
        />
        <Input
          type="number"
          min="0"
          step="0.0001"
          value={newFactor}
          onChange={(e) => setNewFactor(e.target.value)}
          placeholder="Factor"
          className="w-28"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={isAdding}
          className="border-zinc-200 bg-white hover:bg-zinc-50 shrink-0"
        >
          <Plus size={14} />
        </Button>
      </div>
    </div>
  );
}
