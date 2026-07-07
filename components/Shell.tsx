"use client";
import React from 'react';
import Sidebar from './Sidebar';

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-72 h-screen sticky top-0 bg-premium text-white">
        <Sidebar />
      </aside>
      <main className="flex-1 bg-canvas p-6">
        {children}
      </main>
    </div>
  );
}
