import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const padCls = { sm: 'p-4', md: 'p-5', lg: 'p-6' };

export default function Card({ children, className = '', dark = false, padding = 'md', animated = false }: CardProps) {
  return (
    <div className={`
      relative rounded-xl2 transition-all duration-300
      ${dark
        ? 'glass-accent hover:border-pulse/50 hover:shadow-[0_0_12px_rgba(204,255,0,0.1)]'
        : 'bg-white border-muted/60 text-ink border'}
      ${padCls[padding]} 
      ${animated ? 'fade-up' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}
