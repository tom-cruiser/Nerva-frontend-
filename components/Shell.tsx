'use client';
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState('');

  return (
    <>
      <Sidebar />
      <main className="ml-64 flex flex-col h-screen bg-[#f6f8fc]">
        <TopBar search={search} onSearch={setSearch} />
        {children}
      </main>
    </>
  );
}
