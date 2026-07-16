'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import type { Permission, UserRole } from '@/lib/types';

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
}

export default function RequireRole({
  children,
  allowedRoles,
  requiredPermission,
  fallback,
}: RequireRoleProps) {
  const { user, status, hasPermission, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f6f8fc]">
        <span className="w-6 h-6 border-2 border-[#0052ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'anonymous') {
    return null;
  }

  const roleAllowed = allowedRoles ? hasRole(...allowedRoles) : true;
  const permissionAllowed = requiredPermission ? hasPermission(requiredPermission) : true;

  if (!roleAllowed || !permissionAllowed) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-[#f6f8fc] px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 border border-red-500/20">
          <span className="material-symbols-outlined text-3xl font-bold">lock</span>
        </div>
        <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Access Restricted</h2>
        <p className="text-[13px] text-zinc-500 max-w-sm mt-2 leading-relaxed">
          Your account role (<strong className="text-zinc-700">{user?.role}</strong>) does not have permission to view this section.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
