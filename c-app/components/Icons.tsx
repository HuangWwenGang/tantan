import React from 'react';
import { 
  ScanLine, Utensils, MapPin, Search, ChevronRight, Star, ArrowRight, 
  Signal, Wifi, BatteryFull, MoreHorizontal, Circle, Home, FileText, User, 
  ChevronLeft, ShoppingBag, Plus, Minus, Flame, Clock, X, Keyboard,
  Settings, CreditCard, HelpCircle, LogOut, Heart, Map, Bike, Coffee, Ticket, Moon,
  MessageSquare, ChevronDown, ChevronUp, Grid, Wind, Cloud, Edit3, Zap, Copy, Scissors
} from 'lucide-react';

export const CoconutIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8a2 2 0 1 0 4 0" />
    <path d="M12 21v-8" />
    <path d="M8 17s2-1 4-1 4 1 4 1" />
  </svg>
);

// REDESIGNED: Fresh Young Green Coconut (Thai Coconut Style)
export const WholeCoconutIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
    {/* Shadow */}
    <ellipse cx="50" cy="90" rx="35" ry="6" fill="#193b35" opacity="0.2" />
    
    {/* Main Body - Tapered bottom for "Young Coconut" shape */}
    <path d="M50 88 C 25 88, 15 60, 15 45 C 15 25, 30 15, 50 15 C 70 15, 85 25, 85 45 C 85 60, 75 88, 50 88 Z" fill="#C5E1A5" />
    
    {/* Gradient Overlay for Body (Simulated depth) */}
    <path d="M50 88 C 25 88, 15 60, 15 45 C 15 25, 30 15, 50 15 C 70 15, 85 25, 85 45 C 85 60, 75 88, 50 88 Z" fill="url(#coconutGrad)" opacity="0.3" />

    {/* Top Cap (Cut part) */}
    <path d="M30 25 L 50 5 L 70 25 L 50 35 Z" fill="#AED581" />
    <path d="M30 25 L 50 35 L 70 25" fill="none" stroke="#8BC34A" strokeWidth="1" opacity="0.5"/>
    
    {/* Small Stem */}
    <path d="M50 5 L 50 0" stroke="#558B2F" strokeWidth="4" strokeLinecap="round" />
    
    {/* Shine/Highlight */}
    <ellipse cx="35" cy="40" rx="8" ry="12" fill="white" opacity="0.4" transform="rotate(-20 35 40)" />

    <defs>
      <linearGradient id="coconutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#558B2F" stopOpacity="0.3" />
      </linearGradient>
    </defs>
  </svg>
);

export const CoconutDrinkIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
     {/* Coconut Body */}
     <path d="M20 55 C20 80, 40 95, 50 95 C60 95, 80 80, 80 55 C80 40, 70 25, 50 25 C30 25, 20 40, 20 55 Z" fill="#D7CCC8" stroke="#8D6E63" strokeWidth="3"/>
     {/* Opening */}
     <ellipse cx="50" cy="35" rx="20" ry="8" fill="#5D4037" />
     <ellipse cx="50" cy="35" rx="16" ry="6" fill="#FFF" opacity="0.9" />
     {/* Straw */}
     <path d="M50 35 L70 10" stroke="#FF8A65" strokeWidth="6" strokeLinecap="round" />
     {/* Umbrella */}
     <path d="M65 25 L85 5" stroke="#4DB6AC" strokeWidth="2" />
     <path d="M65 15 L90 15 L77.5 5 Z" fill="#4DB6AC" />
     {/* Flower */}
     <circle cx="35" cy="65" r="5" fill="#F06292" opacity="0.8" />
  </svg>
);

export const WaveIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1440 320" className={className} preserveAspectRatio="none">
    <path fill="currentColor" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
  </svg>
);

export const SunIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="12" r="6" />
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 2V4M12 20V22M4 12H2M22 12H20M19.07 4.93L17.66 6.34M6.34 17.66L4.93 19.07M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07" />
  </svg>
);

export const SeagullIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 14s2-3 5-3 4 5 7 5c2 0 4-3 6-3" />
  </svg>
);

export const PalmLeafIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12,2C12,2 14,8 18,10C14,11 13,18 12,22C11,18 10,11 6,10C10,8 12,2 12,2Z" opacity="0.6"/>
    <path d="M12,22C12,22 15,16 20,14C16,13 14,8 12,2C10,8 8,13 4,14C9,16 12,22 12,22Z" />
  </svg>
);

export const HibiscusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 6c0-2.5-2-4-4.5-4S3 4.5 3 7c0 2 1.5 3 4 4" />
    <path d="M12 6c0-2.5 2-4 4.5-4S21 4.5 21 7c0 2-1.5 3-4 4" />
    <path d="M7 11c-2.5 0-4 2-4 4.5S5.5 20 8 20c2 0 3-1.5 4-4" />
    <path d="M17 11c2.5 0 4 2 4 4.5S18.5 20 16 20c-2 0-3-1.5-4-4" />
    <circle cx="12" cy="11" r="2" fill="currentColor" className="opacity-50" />
    <path d="M12 11v6" />
  </svg>
);

// Updated: Muted, Natural Colors (Less Cartoonish)
export const CoconutTreeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 200" fill="none" className={className}>
    {/* Trunk - Muted Brown */}
    <path d="M95 180 C 80 150, 110 120, 100 80 L 105 80 C 115 120, 85 150, 105 180 Z" fill="#A1887F" />
    
    {/* Leaves - Soft Sage/Olive Greens */}
    <path d="M100 80 Q 60 40 40 90 C 50 80, 80 60, 100 80 Z" fill="#81C784" opacity="0.9" />
    <path d="M100 80 Q 50 20 20 50 C 40 40, 70 40, 100 80 Z" fill="#AED581" opacity="0.9" />
    <path d="M100 80 Q 140 40 160 90 C 150 80, 120 60, 100 80 Z" fill="#81C784" opacity="0.9" />
    <path d="M100 80 Q 150 20 180 50 C 160 40, 130 40, 100 80 Z" fill="#AED581" opacity="0.9" />
    <path d="M100 80 Q 100 20 100 40 C 105 45, 95 45, 100 80 Z" fill="#66BB6A" opacity="0.9" />

    {/* Coconuts - Pale Sandy colors */}
    <circle cx="95" cy="85" r="6" fill="#DCE775" /> 
    <circle cx="106" cy="86" r="6" fill="#C5E1A5" /> 
  </svg>
);

// Updated: SUBTLE Background Style (Pale, Monochromatic feel)
export const HangingCoconutClusterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className}>
     {/* Stems - Muted Brown */}
     <path d="M50 0 L35 30" stroke="#8D6E63" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
     <path d="M50 0 L65 30" stroke="#8D6E63" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
     <path d="M50 0 L50 45" stroke="#8D6E63" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
     
     {/* Coconuts - Pale, washed out colors to blend with background */}
     
     {/* Right - Pale Beige */}
     <circle cx="68" cy="38" r="18" fill="#F0F4C3" />
     <path d="M60 28 Q 68 25 76 28" stroke="#DCE775" strokeWidth="1.5" fill="none" opacity="0.5"/>

     {/* Left - Pale Green-White */}
     <circle cx="35" cy="40" r="18" fill="#DCEDC8" />
     <path d="M27 30 Q 35 27 43 30" stroke="#AED581" strokeWidth="1.5" fill="none" opacity="0.5"/>

     {/* Bottom - Soft Cream */}
     <circle cx="52" cy="65" r="18" fill="#FFF9C4" />
     <path d="M44 55 Q 52 52 60 55" stroke="#F0F4C3" strokeWidth="1.5" fill="none" opacity="0.5"/>

     {/* Soft Outlines for definition without contrast */}
     <circle cx="68" cy="38" r="18" stroke="#E6EE9C" strokeWidth="1" opacity="0.5"/>
     <circle cx="35" cy="40" r="18" stroke="#C5E1A5" strokeWidth="1" opacity="0.5"/>
     <circle cx="52" cy="65" r="18" stroke="#FFF59D" strokeWidth="1" opacity="0.5"/>
  </svg>
);

export const ShellIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
     <path d="M12 21.5C12 21.5 19 16 19 10C19 6.134 15.866 3 12 3C8.134 3 5 6.134 5 10C5 16 12 21.5 12 21.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
     <path d="M12 21.5V10" stroke="white" strokeWidth="1" strokeLinecap="round" className="opacity-50"/>
     <path d="M12 21.5L8 10" stroke="white" strokeWidth="1" strokeLinecap="round" className="opacity-50"/>
     <path d="M12 21.5L16 10" stroke="white" strokeWidth="1" strokeLinecap="round" className="opacity-50"/>
     <path d="M12 21.5L5 10" stroke="white" strokeWidth="1" strokeLinecap="round" className="opacity-50"/>
     <path d="M12 21.5L19 10" stroke="white" strokeWidth="1" strokeLinecap="round" className="opacity-50"/>
  </svg>
);

export const BubblesIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="4" cy="12" r="2" opacity="0.6"/>
    <circle cx="10" cy="8" r="3" opacity="0.8"/>
    <circle cx="16" cy="14" r="2.5" opacity="0.6"/>
    <circle cx="21" cy="10" r="1.5" opacity="0.5"/>
  </svg>
);

export const CrabIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 80" fill="currentColor" className={className}>
    {/* Body */}
    <ellipse cx="50" cy="45" rx="30" ry="20" />
    {/* Legs L */}
    <path d="M25 45 Q 10 35 15 20" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M22 50 Q 5 55 10 70" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <path d="M25 55 Q 10 65 15 75" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
    {/* Legs R */}
    <path d="M75 45 Q 90 35 85 20" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M78 50 Q 95 55 90 70" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <path d="M75 55 Q 90 65 85 75" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
    {/* Eyes */}
    <circle cx="40" cy="30" r="3" fill="white" />
    <circle cx="60" cy="30" r="3" fill="white" />
  </svg>
);

export const ShrimpIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Curved Body segments */}
    <path d="M30 30 Q 50 10 70 30 T 80 60" />
    <path d="M32 35 L 35 25" strokeWidth="2" /> {/* Antennas */}
    <path d="M80 60 L 75 70 L 85 70 Z" fill="currentColor" stroke="none" /> {/* Tail */}
    {/* Legs */}
    <path d="M40 25 L 40 40" strokeWidth="1" />
    <path d="M50 20 L 50 45" strokeWidth="1" />
    <path d="M60 25 L 60 40" strokeWidth="1" />
  </svg>
);

export const StarfishIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L15 9L22 9L17 14L19 21L12 17L5 21L7 14L2 9L9 9L12 2Z" strokeLinejoin="round"/>
  </svg>
);

// New Watermark Icon for Order Page
export const ReceiptIconWatermark = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 200 200" fill="none" className={className}>
        <rect x="40" y="20" width="120" height="160" rx="4" fill="currentColor" opacity="0.1"/>
        <path d="M40 180 L50 170 L60 180 L70 170 L80 180 L90 170 L100 180 L110 170 L120 180 L130 170 L140 180 L150 170 L160 180 V24 H40 V180 Z" fill="currentColor" opacity="0.15"/>
        <rect x="60" y="50" width="80" height="8" rx="2" fill="currentColor" opacity="0.1"/>
        <rect x="60" y="70" width="60" height="6" rx="2" fill="currentColor" opacity="0.1"/>
        <rect x="60" y="90" width="80" height="6" rx="2" fill="currentColor" opacity="0.1"/>
        <rect x="60" y="110" width="40" height="6" rx="2" fill="currentColor" opacity="0.1"/>
        <line x1="60" y1="140" x2="140" y2="140" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" opacity="0.1"/>
    </svg>
);

export const WaveIndicator = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 10" fill="currentColor" className={className} preserveAspectRatio="none">
    <path d="M0 10 C 10 10, 10 0, 20 0 C 30 0, 30 10, 40 10" />
  </svg>
);

// REVERTED: Standard Icons for clear display
export const TabIcon = ({ name, active }: { name: 'home' | 'order' | 'user', active?: boolean }) => {
    // Colors based on dark green navbar
    const color = active ? '#e2f3a6' : 'rgba(255,255,255,0.5)';
    
    switch(name) {
        case 'home': return <Home size={24} color={color} strokeWidth={active ? 3 : 2} />;
        case 'order': return <FileText size={24} color={color} strokeWidth={active ? 3 : 2} />;
        case 'user': return <User size={24} color={color} strokeWidth={active ? 3 : 2} />;
    }
};

export { 
  ScanLine, Utensils, MapPin, Search, ChevronRight, Star, ArrowRight, 
  Signal, Wifi, BatteryFull, MoreHorizontal, Circle, ChevronLeft, ShoppingBag, 
  Plus, Minus, Flame, Clock, X, Keyboard, Settings, CreditCard, HelpCircle, 
  LogOut, Heart, Map, Bike, Coffee, Ticket, Moon,
  MessageSquare, ChevronDown, ChevronUp, Grid, Wind, Cloud, Edit3, Zap, Copy, Scissors,
  Home, FileText, User
};
