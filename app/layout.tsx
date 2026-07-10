import '../styles/globals.css';
import React from 'react';
import { AuthProvider } from './context/AuthContext';

export const metadata = {
  title: 'Nerva — Retail Intelligence',
  description: 'Enterprise retail SaaS admin console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className="h-full antialiased text-zinc-800 bg-[#f6f8fc]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
