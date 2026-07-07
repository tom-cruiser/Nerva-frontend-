"use client";
import React from 'react';

export default function Button({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-3 py-2 bg-pulse text-white hover:opacity-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
