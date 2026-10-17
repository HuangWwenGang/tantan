import React from 'react';
import { Vendor } from '../types';
import { Star, ChevronRight, Clock } from './Icons';
import { isVendorClosed } from '../utils/availability';

interface VendorCardProps {
  vendor: Vendor;
  onClick: (vendor: Vendor) => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({ vendor, onClick }) => {
  const isClosed = isVendorClosed(vendor.businessHours, vendor.isOpen !== false);
  const showRating = false;
  return (
    <button
      type="button"
      onClick={() => onClick(vendor)}
      aria-label={`进入${vendor.name}`}
      className="cv-auto w-full text-left group bg-white/60 backdrop-blur-md rounded-[20px] p-3 flex items-center gap-4 active:scale-[0.98] transition-all duration-200 cursor-pointer hover:bg-white hover:shadow-sm"
    >
      <div className="relative w-16 h-16 flex-shrink-0">
        <img 
          src={vendor.imageUrl} 
          alt={vendor.name} 
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover rounded-2xl"
        />
        {/* Category Badge - Small & Minimal */}
        <div className="absolute -bottom-1 -right-1 bg-[#fff8e1] text-[#b45309] text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
          {vendor.category}
        </div>
      </div>
      
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-heavy text-[#193b35] truncate text-[17px] leading-tight">{vendor.name}</h3>
          <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full ${
            isClosed
              ? 'bg-[#f1f7f5] text-[#193b35]/50 border border-[#193b35]/10'
              : 'bg-[#cce8e4] text-[#193b35]'
          }`}>
            {isClosed ? '已打烊' : '营业中'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#2d4f48]/80 font-medium">
          {showRating && (
            <>
              <div className="flex items-center gap-0.5 bg-[#e2f3a6] px-1.5 py-0.5 rounded text-[#193b35] font-black text-[10px]">
                 <Star size={10} className="fill-[#193b35]" strokeWidth={3} />
                 <span>{vendor.rating}</span>
              </div>
              <span className="w-0.5 h-0.5 bg-[#193b35]/30 rounded-full"></span>
            </>
          )}
          <span className="truncate flex items-center gap-0.5 font-bold">
             <Clock size={10} strokeWidth={2.5} />
             {vendor.lastVisited}
          </span>
        </div>
      </div>

      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#193b35]/30 group-hover:text-[#193b35] group-hover:bg-[#cce8e4] transition-colors">
        <ChevronRight size={20} strokeWidth={3} />
      </div>
    </button>
  );
};
