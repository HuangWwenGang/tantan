import React from 'react';
import { Merchant } from '../types';
import { Clock, ArrowRight, MapPin } from 'lucide-react';

interface Props {
  merchant: Merchant;
  onClick: (id: string) => void;
}

export const RecentMerchantCard: React.FC<Props> = ({ merchant, onClick }) => {
  return (
    <div 
      onClick={() => onClick(merchant.id)}
      className="flex items-center p-2.5 bg-white rounded-[18px] shadow-sm active:scale-98 transition-transform cursor-pointer border border-transparent hover:border-island-primary/20"
    >
      <img 
        src={merchant.imageUrl} 
        alt={merchant.name} 
        className="w-12 h-12 rounded-[12px] object-cover bg-gray-100"
      />
      <div className="ml-3 flex-1 min-w-0">
        <h4 className="font-bold text-island-dark text-sm truncate">{merchant.name}</h4>
        <div className="flex items-center text-[11px] text-gray-400 mt-1">
          <MapPin size={10} className="mr-1" />
          <span className="truncate">{merchant.lastVisited}</span>
        </div>
      </div>
      <div className="bg-island-bg p-2 rounded-full text-island-primary opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight size={14} />
      </div>
    </div>
  );
};