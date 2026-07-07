import '../styles/globals.css';
import React from 'react';
import { AuthProvider } from './context/AuthContext';
import Shell from '../components/Shell';

export const metadata = {
  title: 'Nerva the Knowing',
  description: 'Admin console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
