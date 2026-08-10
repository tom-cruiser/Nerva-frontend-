'use client';
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="lg:ml-64 flex flex-col h-dvh bg-[#f6f8fc]">
        <TopBar search={search} onSearch={setSearch} onMenuClick={() => setSidebarOpen(true)} />
        {children}
      </main>
    </>
  );
}
