import React from 'react';
import Link from 'next/link';

export default function MarketingLandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h1 className="text-4xl font-extrabold text-[#0052ff] uppercase tracking-tight mb-4">Nerva Intelligence</h1>
      <p className="text-zinc-500 font-medium max-w-lg text-center mb-8">
        The offline-first Retail Operating System for Enterprise scale.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="px-6 py-2.5 bg-[#0052ff] text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition">
          Sign in
        </Link>
        <Link href="/admin" className="px-6 py-2.5 bg-zinc-100 text-zinc-700 font-bold rounded-lg hover:bg-zinc-200 transition">
          Open console
        </Link>
      </div>
    </div>
  );
}
