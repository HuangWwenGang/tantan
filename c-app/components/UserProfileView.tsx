import React, { useMemo } from 'react';
import { HelpCircle, ChevronRight, Heart } from 'lucide-react';
import { PalmLeafIcon, SeagullIcon, CoconutTreeIcon, SunIcon } from './Icons';

interface UserProfileViewProps {
    onNavigate: (view: 'address' | 'favorites' | 'coupons' | 'feedback' | 'help') => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({ onNavigate }) => {
  const profile = useMemo(() => {
    const profiles = [
      {
        name: '文昌鸡',
        avatar: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=320&h=320',
      },
      {
        name: '加积鸭',
        avatar: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&q=80&w=320&h=320',
      },
      {
        name: '和乐蟹',
        avatar: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=320&h=320',
      },
      {
        name: '清补凉',
        avatar: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=320&h=320',
      },
      {
        name: '椰子鸡',
        avatar: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&q=80&w=320&h=320',
      },
      {
        name: '糟粕醋',
        avatar: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=320&h=320',
      },
      {
        name: '鹧鸪茶',
        avatar: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&q=80&w=320&h=320',
      },
      {
        name: '椰子冻',
        avatar: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&q=80&w=320&h=320',
      },
    ];
    return profiles[Math.floor(Math.random() * profiles.length)];
  }, []);

  return (
    // Fixed Container: absolute inset-0 ensures it fills the phone frame exactly.
    // overflow-hidden prevents the whole page from bouncing.
    <div className="absolute inset-0 bg-[#f4f9f8] flex flex-col overflow-hidden select-none">
      
      {/* --- STATIC BACKGROUND DECOR (Fixed, won't scroll) --- */}
      <div className="absolute top-0 right-0 w-full h-64 pointer-events-none opacity-40">
           {/* A very subtle sun gradient */}
           <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-gradient-to-br from-[#e2f3a6]/40 to-transparent rounded-full blur-3xl"></div>
           <PalmLeafIcon className="absolute -top-6 -right-6 w-40 h-40 text-[#193b35] opacity-[0.05] transform rotate-12"/>
      </div>

      {/* --- SCROLLABLE CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar overscroll-none relative z-10 px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+140px)]">
         
         {/* --- 1. GUEST IDENTITY CARD --- */}
         <div className="relative mb-6 group">
            <div className="relative bg-[#fffdfa] rounded-[24px] p-6 shadow-[0_4px_20px_-4px_rgba(25,59,53,0.05)] border border-[#193b35]/5 overflow-hidden">
                <div className="flex flex-col items-center py-4 relative">
                    <SunIcon className="absolute top-0 left-0 w-16 h-16 text-[#e2f3a6] opacity-40 animate-[spin_20s_linear_infinite]" />

                    <div className="relative mb-4">
                        <div className="w-20 h-20 bg-[#f0f7f5] rounded-full flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
                            <img
                              src={profile.avatar}
                              alt={profile.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                        </div>
                    </div>

                    <h1 className="text-xl font-heavy text-[#193b35] mb-1">{profile.name}</h1>
                    <p className="text-xs text-[#193b35]/50 font-medium mb-4">不需要登录，也能直接下单与取餐</p>

                    <div className="w-full bg-[#f4f8f6] rounded-xl p-4 text-center text-[11px] text-[#193b35]/60 font-medium border border-[#193b35]/5">
                        订单记录保存在当前设备，换手机或清缓存会丢失
                    </div>
                </div>
            </div>
         </div>

{/* --- 2. MAIN FUNCTION MENU (Islands) --- */}
         <div className="space-y-4 relative z-10">
            
            {/* Group 1 */}
            <div className="bg-white rounded-[24px] px-2 py-1 shadow-[0_2px_10px_-4px_rgba(25,59,53,0.03)] border border-[#193b35]/5">
                <MenuRow 
                   icon={<Heart size={18} className="text-[#193b35]" />}
                   iconBg="bg-[#f0f5f3]"
                   label="收藏摊位"
                   desc="查看"
                   onClick={() => onNavigate('favorites')}
                />
            </div>

            {/* Group 2 */}
            <div className="bg-white rounded-[24px] px-2 py-1 shadow-[0_2px_10px_-4px_rgba(25,59,53,0.03)] border border-[#193b35]/5">

                <MenuRow 
                   icon={<HelpCircle size={18} className="text-[#193b35]" />}
                   iconBg="bg-[#f0f5f3]"
                   label="帮助中心"
                   onClick={() => onNavigate('help')}
                />
            </div>
         </div>
         
         {/* --- 3. FOOTER (Breezy & Clean) --- */}
         <div className="mt-12 flex flex-col items-center justify-center opacity-40">
             <div className="relative w-full h-24 flex items-end justify-center overflow-hidden">
                {/* Simple silhouettes */}
                <CoconutTreeIcon className="w-20 h-20 text-[#193b35]/30 -mr-4" />
                <SeagullIcon className="w-6 h-6 text-[#193b35]/30 mb-12 -ml-2" />
             </div>
             <p className="text-[9px] text-[#193b35]/20 font-black tracking-[0.3em] uppercase mt-4">TanTan Island Life</p>
         </div>

      </div>
    </div>
  );
};

interface MenuRowProps {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    desc?: string;
    onClick?: () => void;
}

const MenuRow: React.FC<MenuRowProps> = ({ icon, iconBg, label, desc, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 hover:bg-[#f9fbfb] rounded-2xl transition-colors active:scale-[0.99] group"
  >
     <div className="flex items-center gap-4">
        {/* Softer icon background colors */}
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
            {icon}
        </div>
        <span className="text-sm font-heavy text-[#193b35]">{label}</span>
     </div>
     <div className="flex items-center gap-2">
        {desc && <span className="text-xs text-[#193b35]/40 font-bold bg-[#f4f9f8] px-2 py-0.5 rounded-md">{desc}</span>}
        <ChevronRight size={16} className="text-[#193b35]/20 group-hover:text-[#193b35]/60 transition-colors" />
     </div>
  </button>
);





