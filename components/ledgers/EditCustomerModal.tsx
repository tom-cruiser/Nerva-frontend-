'use client';
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ledger } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    balance: number;
  } | null;
}

export default function EditCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  customer,
}: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Populate form when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
      });
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+\d\s\-\(\)]{8,20}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate() || !customer) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await ledger.updateCustomer(customer.id, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
      });

      console.log('Customer updated successfully');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update customer:', err);
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Failed to update customer. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-zinc-200/60 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-zinc-900">Edit Customer</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                {submitError}
              </div>
            )}

            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-zinc-700 mb-1">
                Customer Name *
              </label>
              <Input
                id="edit-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter customer name"
                error={errors.name}
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="edit-phone" className="block text-sm font-medium text-zinc-700 mb-1">
                Phone Number *
              </label>
              <Input
                id="edit-phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+237 6XX XXX XXX"
                error={errors.phone}
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="edit-email" className="block text-sm font-medium text-zinc-700 mb-1">
                Email (Optional)
              </label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="customer@example.com"
                error={errors.email}
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div className="bg-zinc-50 p-3 rounded-lg">
              <p className="text-sm text-zinc-600">
                Current Balance: <span className="font-bold text-[#0052ff]">XAF {customer.balance.toLocaleString()}</span>
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Balance cannot be edited directly. Use payments or credits to adjust.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#0052ff] hover:bg-[#0041cc] text-white font-bold"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Updating...
                  </>
                ) : (
                  'Update Customer'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}