
import React from 'react';

// 基础波浪头
export const WaveHeader: React.FC = () => (
  <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-0 pointer-events-none">
    <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-nature opacity-100"></div>
    <svg className="relative block w-[calc(100%+1.3px)] h-[180px] rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
      <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#D3EDE6" fillOpacity="0.4"></path>
      <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#BCE3DB" fillOpacity="0.2" transform="translate(0, -10)"></path>
    </svg>
  </div>
);

// 装饰图标组件
export const Coconut: React.FC<{ className?: string, opacity?: number }> = ({ className, opacity = 0.1 }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ opacity }} className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="10" cy="10" r="1.5" fill="white" />
    <circle cx="14" cy="10" r="1.5" fill="white" />
    <circle cx="12" cy="14" r="1.5" fill="white" />
  </svg>
);

export const Sun: React.FC<{ className?: string, opacity?: number }> = ({ className, opacity = 0.1 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity }} className={className}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

export const Starfish: React.FC<{ className?: string, opacity?: number }> = ({ className, opacity = 0.1 }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ opacity }} className={className}>
    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const PalmLeaf: React.FC<{ className?: string, opacity?: number }> = ({ className, opacity = 0.1 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }} className={className}>
    <path d="M12 2C8 6 4 10 4 16c0 4 6 6 12 4 4-2 6-6 4-10-4-2-12-6-20-8" />
    <path d="M12 2v20" />
    <path d="M12 10l6 4" />
    <path d="M12 6l-6 4" />
    <path d="M12 14l-4 3" />
    <path d="M12 16l4 2" />
  </svg>
);

// 组合式海岛背景
export const IslandBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <WaveHeader />
    
    {/* 噪点纹理 - 模拟沙滩感 */}
    <div className="absolute inset-0 opacity-[0.03]" style={{ 
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
    }}></div>

    {/* 散落的装饰元素 */}
    <Coconut className="absolute top-[15%] right-[5%] w-24 h-24 text-island-primary rotate-12" opacity={0.05} />
    <Sun className="absolute top-[8%] left-[20%] w-16 h-16 text-yellow-400" opacity={0.08} />
    <PalmLeaf className="absolute bottom-[20%] left-[-50px] w-64 h-64 text-island-mint rotate-45" opacity={0.15} />
    <Starfish className="absolute bottom-[10%] right-[15%] w-12 h-12 text-orange-300 rotate-12" opacity={0.1} />
    
    {/* 抽象的圆形色块 */}
    <div className="absolute top-[40%] left-[10%] w-32 h-32 rounded-full bg-island-mint/20 blur-3xl"></div>
    <div className="absolute bottom-[20%] right-[5%] w-48 h-48 rounded-full bg-blue-100/30 blur-3xl"></div>
  </div>
);
