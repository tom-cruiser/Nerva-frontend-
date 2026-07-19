// components/inventory/ProductFormModal.tsx
'use client';
import React, { useState, useEffect } from 'react';
import type { Product } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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
        barcode: product.barcode || '',
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof Product, value: string | number) => {
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

            {/* Unit Price */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Unit Price (XAF) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="100"
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

            {/* Stock Quantity */}
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-1.5">
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="1"
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
                Reorder Level <span className="text-red-500">*</span>
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