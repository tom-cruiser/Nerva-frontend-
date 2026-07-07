"use client";
import React from 'react';
import { useAuth } from '../app/context/AuthContext';
import { usePathname } from 'next/navigation';

export default function RoleGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const pathname = usePathname() || '/';

  const role = session?.role ?? 'cashier';

  if (role === 'cashier') {
    // Only allow cashier to access POS checkout routes
    if (pathname.startsWith('/pos/checkout') || pathname === '/pos') {
      return <>{children}</>;
    }
    return (
      <div className="p-4 text-sm text-white/80">
        Access restricted: cashiers can only access the checkout terminal.
      </div>
    );
  }

  if (role === 'admin') {
    // Admin sees everything within the shell
    return <>{children}</>;
  }

  // superadmin or unknown roles: allow by default
  return <>{children}</>;
}
