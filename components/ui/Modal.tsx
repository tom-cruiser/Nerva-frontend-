'use client';
import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Footer actions (buttons) pinned to the bottom of the panel. */
  footer?: React.ReactNode;
}

/**
 * Dark premium modal — matches the operational `glass` surface used across
 * the login / register / seat flows. Closes on backdrop click and Escape.
 */
export default function Modal({ open, onClose, title, subtitle, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm fade-up"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="glass rounded-xl2 w-full max-w-md shadow-glow overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-zinc-700/60 flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-white tracking-tight">{title}</h2>
            {subtitle && <p className="text-[12px] text-zinc-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/6 flex items-center justify-center transition-colors -mr-1.5"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-zinc-700/60 flex items-center justify-end gap-2.5 bg-black/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
