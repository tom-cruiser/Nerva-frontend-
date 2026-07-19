'use client';
import React from 'react';

interface Product {
  sku: string;
  name: string;
  price: number;
  stock: number;
}

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  quantityInCart?: number;
  isDisabled?: boolean;
}

export default function ProductCard({
  product,
  onAdd,
  quantityInCart = 0,
  isDisabled = false,
}: ProductCardProps) {
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;

  return (
    <button
      onClick={() => onAdd(product)}
      disabled={isDisabled || isOutOfStock}
      className={`
        relative text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-200
        hover:scale-[1.02] active:scale-[0.98]
        ${isOutOfStock || isDisabled
          ? 'bg-zinc-100/50 border-zinc-200 opacity-55 cursor-not-allowed'
          : quantityInCart > 0
            ? 'bg-[#0052ff]/[0.04] border-[#0052ff] shadow-[0_4px_16px_rgba(0,82,255,0.08)]'
            : 'bg-white border-zinc-200/80 hover:border-zinc-300 hover:shadow-md hover:bg-zinc-50/50'
        }
      `}
    >
      {quantityInCart > 0 && (
        <span className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 min-w-[22px] h-[22px] sm:min-w-[24px] sm:h-6 rounded-full bg-[#0052ff] text-white text-[11px] sm:text-xs font-black px-1.5 sm:px-2 flex items-center justify-center shadow-sm">
          {quantityInCart}
        </span>
      )}

      <p className="text-[13px] sm:text-sm font-bold text-zinc-850 leading-snug pr-7 sm:pr-8 line-clamp-2">
        {product.name}
      </p>

      <p className="text-[9px] sm:text-[10px] font-mono text-zinc-400 mt-1 sm:mt-1.5 uppercase tracking-wider truncate">
        {product.sku}
      </p>

      <p className="text-sm sm:text-base font-black text-[#0052ff] mt-2 sm:mt-2.5 truncate">
        XAF {product.price.toLocaleString()}
      </p>

      <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5">
        <span className={`
          text-[9.5px] sm:text-[10.5px] font-bold
          ${isOutOfStock
            ? 'text-red-500'
            : isLowStock
              ? 'text-amber-600'
              : 'text-zinc-400'
          }
        `}>
          {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
        </span>
        {isLowStock && !isOutOfStock && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        )}
      </div>
    </button>
  );
}