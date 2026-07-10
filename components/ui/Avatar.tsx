import React from 'react';

export default function Avatar({ name = '', size = 32 }: { name?: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  const colors = ['#2DD4BF', '#818cf8', '#f472b6', '#fb923c', '#34d399'];
  const idx    = name.charCodeAt(0) % colors.length;

  return (
    <div
      style={{ width: size, height: size, backgroundColor: colors[idx] + '22', border: `1.5px solid ${colors[idx]}44` }}
      className="rounded-full flex items-center justify-center flex-shrink-0"
    >
      <span style={{ fontSize: size * 0.38, color: colors[idx] }} className="font-semibold leading-none">
        {initials || '?'}
      </span>
    </div>
  );
}
