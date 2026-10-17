import React from 'react';
import { Vendor } from '../types';
import { 
  ChevronLeft, MapPin, Clock, Phone, ShieldCheck, 
  Store, Award, ExternalLink, Calendar, Users
} from 'lucide-react';
import { PalmLeafIcon, CoconutTreeIcon, ShellIcon, SunIcon } from './Icons';

interface VendorDetailViewProps {
  vendor: Vendor;
  onBack: () => void;
}

const formatUploadTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const VendorDetailView: React.FC<VendorDetailViewProps> = ({ vendor, onBack }) => {
  const coverImage = typeof vendor.imageUrl === 'string' ? vendor.imageUrl.trim() : '';
  const hasCoverImage = Boolean(coverImage);
  const qualificationImage = vendor.qualificationImage?.trim() || '';
  const signImage = vendor.signImage?.trim() || '';
  const hasQualification = Boolean(qualificationImage);
  const hasSign = Boolean(signImage);
  const archiveTitle = hasQualification && hasSign
    ? '招牌&资质'
    : hasSign
      ? '招牌'
      : hasQualification
        ? '相关资质'
        : '经营档案';
  const archiveItems = [
    hasSign ? { key: 'sign', label: '招牌', image: signImage, uploadedAt: vendor.signUploadedAt } : null,
    hasQualification ? { key: 'qualification', label: '相关资质', image: qualificationImage, uploadedAt: vendor.qualificationUploadedAt } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; image: string; uploadedAt?: string }>;
  const hasDescription = Boolean(vendor.description && vendor.description.trim());

  return (
    <div className="absolute inset-0 bg-[#f4f9f8] flex flex-col font-sans overflow-hidden">
      
      {/* 1. HEADER (Floating) */}
      <div className="absolute top-0 left-0 w-full z-50 p-4 pt-14 flex items-center justify-between pointer-events-none">
         <button 
            onClick={onBack} 
            aria-label="返回"
            className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-sm pointer-events-auto active:scale-90 transition-transform text-white"
         >
            <ChevronLeft size={22} strokeWidth={2.5} />
         </button>
         <h1 className="text-white font-heavy text-lg drop-shadow-md opacity-100">摊位详情</h1>
         <div className="w-10"></div>
      </div>

      {/* 2. SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
          
          {/* Top Visual Section */}
          <div className="relative h-64 shrink-0 overflow-hidden">
              {hasCoverImage ? (
                <img src={coverImage} className="w-full h-full object-cover" alt={vendor.name} loading="lazy" decoding="async" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-[#d7ebe7] via-[#eaf4f2] to-[#f4f9f8]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#f4f9f8]"></div>
              
              {/* Floating Badge */}
              <div className="absolute bottom-10 left-6 right-6 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#193b35] rounded-xl flex items-center justify-center text-[#e2f3a6] shadow-sm">
                          <Store size={24} />
                      </div>
                      <div>
                          <h2 className="text-xl font-heavy text-[#193b35] leading-tight">{vendor.name}</h2>
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{vendor.category} · 后海村岛民店</div>
                      </div>
                  </div>
                  <div className="flex flex-col items-end">
                      <div className="bg-[#e2f3a6] px-2 py-1 rounded-lg flex items-center gap-1 text-[#193b35] font-black text-xs">
                          <Award size={14} className="fill-[#193b35]" />
                          优质摊位
                      </div>
                  </div>
              </div>
          </div>

          <div className="px-6 pb-32 space-y-6 -mt-4 relative z-10">
              
              {/* SECTION: BASIC INFO */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#193b35]/5 space-y-5">
                  <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 bg-[#f0f7f5] rounded-xl text-[#193b35]"><MapPin size={18} /></div>
                      <div className="flex-1">
                          <h3 className="text-sm font-heavy text-[#193b35] mb-1">地理位置</h3>
                          <p className="text-xs text-gray-500 leading-relaxed font-medium">{vendor.location || vendor.locationShort || '暂无信息'}</p>
                          <button className="mt-3 text-[11px] font-heavy text-[#193b35] flex items-center gap-1 bg-[#e2f3a6]/30 px-3 py-1.5 rounded-full hover:bg-[#e2f3a6]/50 transition-colors">
                              <ExternalLink size={12} /> 查看地图指引
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex items-start gap-4 border-t border-dashed border-gray-100 pt-5">
                      <div className="mt-1 p-2 bg-[#f0f7f5] rounded-xl text-[#193b35]"><Clock size={18} /></div>
                      <div className="flex-1">
                          <h3 className="text-sm font-heavy text-[#193b35] mb-1">营业时间</h3>
                          <p className="text-xs text-gray-500 font-medium">{vendor.businessHours || '暂无信息'}</p>
                      </div>
                  </div>

                  <div className="flex items-start gap-4 border-t border-dashed border-gray-100 pt-5">
                      <div className="mt-1 p-2 bg-[#f0f7f5] rounded-xl text-[#193b35]"><Phone size={18} /></div>
                      <div className="flex-1">
                          <h3 className="text-sm font-heavy text-[#193b35] mb-1">摊主电话</h3>
                          <p className="text-xs text-gray-500 font-medium">{vendor.phone || '暂无信息'}</p>
                      </div>
                  </div>
              </div>

              {/* SECTION: DESCRIPTION / STORY */}
              {hasDescription && (
                <div className="relative bg-white rounded-3xl p-6 shadow-sm border border-[#193b35]/5 overflow-hidden">
                    <PalmLeafIcon className="absolute -right-8 -top-8 w-32 h-32 text-[#193b35]/5 transform rotate-45" />
                    <h3 className="text-base font-heavy text-[#193b35] mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#e2f3a6] rounded-full"></div>
                        {'\u644a\u4e3b\u5bc4\u8bed'}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium indent-6">
                        {vendor.description}
                    </p>
                </div>
              )}

              {/* SECTION: QUALIFICATIONS (The Quals Wall) */}
              {archiveItems.length > 0 && (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#193b35]/5">
                    <h3 className="text-base font-heavy text-[#193b35] mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#e2f3a6] rounded-full"></div>
                        {archiveTitle}
                    </h3>
                    <div className={`grid ${archiveItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                      {archiveItems.map((item) => {
                        const uploadTime = formatUploadTime(item.uploadedAt);
                        return (
                          <div key={item.key} className="group relative aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-inner cursor-zoom-in">
                              <img src={item.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt={item.label} loading="lazy" decoding="async" />
                              <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity">
                                  <ShieldCheck size={32} className="text-[#193b35]/20" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-2 text-center text-[9px] font-black text-[#193b35] uppercase tracking-tighter space-y-1">
                                 <div>{item.label}</div>
                                 {uploadTime && (
                                   <div className="text-[9px] font-medium text-[#193b35]/60">上传 {uploadTime}</div>
                                 )}
                              </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-dashed border-gray-200">
                        <p className="text-[9px] text-gray-400 font-medium leading-relaxed">
                            * 资质信息已由“滩摊”平台人工审核。如对资质有疑问，可联系平台客服进行咨询或投诉。
                        </p>
                    </div>
                </div>
              )}

              {/* Decor elements */}
              <div className="flex flex-col items-center justify-center opacity-10 py-10 pointer-events-none">
                  <CoconutTreeIcon className="w-32 h-32" />
                  <div className="text-[10px] font-black tracking-[0.4em] uppercase text-[#193b35] mt-4">TanTan Certified</div>
              </div>
          </div>
      </div>
    </div>
  );
};
