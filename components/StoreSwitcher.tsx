"use client";
import React from 'react';
import { useAuth } from '../app/context/AuthContext';

const SAMPLE_ORGS = [
  { id: 'org_1', name: "Main Store" },
  { id: 'org_2', name: "Branch A" },
  { id: 'org_3', name: "Branch B" },
];

export default function StoreSwitcher() {
  const { session, setSession } = useAuth();

  const tier = session?.tier ?? 'starter';
  const activeOrg = session?.organization_id ?? SAMPLE_ORGS[0].id;

  const allowed = tier === 'business' || tier === 'business_premium';

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!allowed) return;
    const newOrg = e.target.value;
    setSession && setSession({ ...(session ?? { organization_id: null, tier: 'starter', role: 'cashier' }), organization_id: newOrg });
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-white/80">Store</label>
      {allowed ? (
        <select value={activeOrg} onChange={onChange} className="bg-white/5 text-white rounded-md px-2 py-1">
          {SAMPLE_ORGS.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2">
          <div className="text-sm text-white/80">{SAMPLE_ORGS.find(o => o.id === activeOrg)?.name}</div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
            <path d="M12 2C8.13 2 5 5.13 5 9v4H3v7h18v-7h-2V9c0-3.87-3.13-7-7-7z" fill="#fff" opacity="0.12" />
            <path d="M12 17a2 2 0 100-4 2 2 0 000 4z" fill="#fff" />
          </svg>
          <a href="/pricing" className="text-pulse text-sm underline">Upgrade</a>
        </div>
      )}
    </div>
  );
}
