import React, { useState } from 'react';
import { 
  ChevronLeft, Plus, MapPin, Edit2, Trash2, Heart, Star, 
  Clock, Ticket, Copy, MessageSquare, Image as ImageIcon, 
  Send, ChevronRight
} from 'lucide-react';
import { Vendor, AppConfig } from '../types';
import { CoconutDrinkIcon, PalmLeafIcon } from './Icons';
import { StatePanel } from './StatePanel';

// --- COMMON HEADER COMPONENT ---
const SubViewHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="relative z-10 p-4 pt-14 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 border-b border-[#193b35]/5">
     <button onClick={onBack} aria-label="返回" className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-[#193b35] transition-colors">
        <ChevronLeft size={24} />
     </button>
     <h1 className="text-lg font-bold text-[#193b35]">{title}</h1>
     <div className="w-10"></div>
  </div>
);

// ================= 1. ADDRESS VIEW =================
export const UserAddressView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="h-full bg-[#f1f7f5] flex flex-col relative overflow-hidden">
      <SubViewHeader title="我的地址" onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Address Card 1 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-transparent hover:border-[#193b35]/20 transition-all group">
             <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-[#cce8e4] text-[#193b35] px-1.5 py-0.5 rounded">公司</span>
                    <span className="font-bold text-[#193b35] text-base">后海村冲浪俱乐部</span>
                </div>
                <Edit2 size={16} className="text-gray-300 group-hover:text-[#193b35] cursor-pointer" />
             </div>
             <p className="text-sm text-gray-600 mb-1">前台吧台旁边2号柜子</p>
             <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-[#193b35] font-medium">李逍遥</span>
                <span>138****8888</span>
             </div>
          </div>

          {/* Address Card 2 (Default) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#193b35]/20 ring-1 ring-[#193b35]/5 relative overflow-hidden">
             <div className="absolute top-0 right-0 bg-[#193b35] text-[#e2f3a6] text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">默认</div>
             <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-[#e2f3a6] text-[#193b35] px-1.5 py-0.5 rounded">沙滩</span>
                    <span className="font-bold text-[#193b35] text-base">后海主海滩3号遮阳伞</span>
                </div>
                <Edit2 size={16} className="text-gray-300 cursor-pointer hover:text-[#193b35]" />
             </div>
             <p className="text-sm text-gray-600 mb-1">蓝色遮阳伞下，靠近救生塔</p>
             <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-[#193b35] font-medium">李逍遥 (女士)</span>
                <span>138****8888</span>
             </div>
          </div>
      </div>

      <div className="p-6 bg-white border-t border-gray-100 pb-8">
         <button className="w-full h-12 bg-[#193b35] text-[#e2f3a6] rounded-xl font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all">
            <Plus size={20} /> 新增收货地址
         </button>
      </div>
    </div>
  );
};

// ================= 2. FAVORITES VIEW =================
export const UserFavoritesView: React.FC<{ onBack: () => void; onEnterVendor: (v: Vendor) => void; vendors: Vendor[] }> = ({
  onBack,
  onEnterVendor,
  vendors,
}) => {
  const hasFavorites = vendors.length > 0;
  const showRating = false;

  return (
    <div className="h-full bg-[#f1f7f5] flex flex-col">
      <SubViewHeader title="我的收藏" onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
         {!hasFavorites ? (
             <StatePanel
               variant="empty"
               title="暂无收藏摊位"
               description="遇见喜欢的口味，记得点亮红心哦"
               actionLabel="去逛逛"
               onAction={onBack}
             />
         ) : (
            <>
                {vendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      onClick={() => onEnterVendor(vendor)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onEnterVendor(vendor);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="cv-auto bg-white rounded-2xl p-3 flex gap-3 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                    >
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
                        <img src={vendor.imageUrl} className="w-full h-full object-cover" loading="lazy" decoding="async" alt={vendor.name} />
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="absolute top-1 left-1 bg-white/90 rounded px-1 text-[9px] font-bold text-[#193b35]">{vendor.category}</div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                            <h3 className="font-bold text-[#193b35]">{vendor.name}</h3>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                {showRating && (
                                  <>
                                    <Star size={10} className="fill-[#fbbf24] text-[#fbbf24]"/> 
                                    <span className="font-bold text-[#193b35]">{vendor.rating}</span>
                                    <span className="w-0.5 h-2 bg-gray-300 mx-1"></span>
                                  </>
                                )}
                                <span>月售 2000+</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div className="text-[10px] text-gray-400">上次光顾: {vendor.lastVisited}</div>
                            <Heart size={18} className="fill-[#e87a5f] text-[#e87a5f]" />
                        </div>
                    </div>
                    </div>
                ))}
                
                <div className="text-center py-8 opacity-40">
                    <PalmLeafIcon className="w-12 h-12 text-[#193b35] mx-auto mb-2" />
                    <p className="text-xs text-[#193b35]">没有更多收藏了</p>
                </div>
            </>
         )}
      </div>
    </div>
  );
};

// ================= 3. COUPONS VIEW (REDESIGNED) =================
export const UserCouponsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'platform' | 'merchant'>('platform');
  const hasPlatformCoupons = true; 
  const hasMerchantCoupons = false; 

  return (
    <div className="h-full bg-[#f1f7f5] flex flex-col">
      <SubViewHeader title="我的卡券包" onBack={onBack} />
      
      {/* Tabs - Updated to Rounded Rectangles (consistent with main tab bar) */}
      <div className="px-6 py-4 flex gap-4 bg-[#f1f7f5] z-10 sticky top-[72px]">
         <button 
            onClick={() => setActiveTab('platform')} 
            className={`flex-1 h-12 flex items-center justify-center text-sm font-heavy rounded-[20px] transition-all duration-300 shadow-sm ${activeTab === 'platform' ? 'bg-[#193b35] text-[#e2f3a6] shadow-[0_4px_12px_rgba(25,59,53,0.2)] scale-[1.02]' : 'bg-white text-[#193b35]/60 hover:bg-white/80'}`}
         >
            平台红包
         </button>
         <button 
            onClick={() => setActiveTab('merchant')} 
            className={`flex-1 h-12 flex items-center justify-center text-sm font-heavy rounded-[20px] transition-all duration-300 shadow-sm ${activeTab === 'merchant' ? 'bg-[#193b35] text-[#e2f3a6] shadow-[0_4px_12px_rgba(25,59,53,0.2)] scale-[1.02]' : 'bg-white text-[#193b35]/60 hover:bg-white/80'}`}
         >
            商家代金券         </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-20 pt-2 space-y-4">
          {activeTab === 'platform' ? (
              hasPlatformCoupons ? (
                <>
                    {/* Active Coupon - Island Ticket Style */}
                    <div className="flex w-full drop-shadow-sm filter group active:scale-[0.99] transition-transform duration-200">
                        {/* Left Side: Value */}
                        <div className="w-[32%] bg-[#193b35] rounded-l-2xl flex flex-col items-center justify-center text-[#e2f3a6] relative overflow-hidden h-28">
                             {/* Decor */}
                             <PalmLeafIcon className="absolute -bottom-6 -left-6 w-24 h-24 text-white/5 rotate-12" />
                             
                             <div className="flex items-baseline gap-0.5 relative z-10">
                                <span className="text-sm font-bold">¥</span>
                                <span className="text-5xl font-display font-heavy">8</span>
                             </div>
                             <div className="text-[9px] font-heavy opacity-80 mt-1 bg-white/10 px-1.5 py-0.5 rounded backdrop-blur-sm">满无门槛</div>
                        </div>
                        
                        {/* Connector - Visual Punch Holes */}
                        <div className="relative w-4 bg-white flex flex-col justify-between items-center py-0">
                             <div className="w-3 h-3 rounded-full bg-[#f1f7f5] -mt-1.5 shadow-inner"></div>
                             <div className="h-full border-l-2 border-dashed border-[#193b35]/10"></div>
                             <div className="w-3 h-3 rounded-full bg-[#f1f7f5] -mb-1.5 shadow-inner"></div>
                        </div>

                        {/* Right Side: Details */}
                        <div className="flex-1 bg-white rounded-r-2xl p-4 flex flex-col justify-between relative overflow-hidden h-28">
                             <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-heavy text-[#193b35] text-base leading-tight">新人海滩见面礼</h3>
                                    <span className="text-[9px] text-[#e87a5f] bg-[#e87a5f]/10 px-1.5 py-0.5 rounded-md font-bold shrink-0 ml-2">即将过期</span>
                                </div>
                                <p className="text-[11px] text-[#2d4f48]/60 mt-1.5 font-medium leading-tight">全场通用 · 仅限到店订单</p>
                             </div>
                             
                             <div className="flex justify-between items-end mt-2">
                                 <span className="text-[10px] text-gray-300 font-medium">有效期至 2024.11.30</span>
                                 <button className="bg-[#193b35] text-[#e2f3a6] text-xs font-heavy px-3.5 py-1.5 rounded-full hover:bg-[#2d4f48] active:scale-95 transition-all shadow-sm">
                                   去使用                                 </button>
                             </div>
                        </div>
                    </div>

                    {/* Expired Coupon - Desaturated Ticket */}
                    <div className="flex w-full opacity-60 grayscale filter select-none">
                        {/* Left Side: Value */}
                        <div className="w-[32%] bg-[#9ca3af] rounded-l-2xl flex flex-col items-center justify-center text-white relative overflow-hidden h-28">
                             <div className="flex items-baseline gap-0.5 relative z-10">
                                <span className="text-sm font-bold">¥</span>
                                <span className="text-5xl font-display font-heavy">5</span>
                             </div>
                             <div className="text-[9px] font-heavy opacity-80 mt-1 bg-black/10 px-1.5 py-0.5 rounded">立减优惠</div>
                        </div>
                        
                        {/* Connector */}
                        <div className="relative w-4 bg-white flex flex-col justify-between items-center py-0">
                             <div className="w-3 h-3 rounded-full bg-[#f1f7f5] -mt-1.5"></div>
                             <div className="h-full border-l-2 border-dashed border-gray-200"></div>
                             <div className="w-3 h-3 rounded-full bg-[#f1f7f5] -mb-1.5"></div>
                        </div>

                        {/* Right Side: Details */}
                        <div className="flex-1 bg-white rounded-r-2xl p-4 flex flex-col justify-between relative overflow-hidden h-28">
                             <div>
                                <h3 className="font-heavy text-gray-500 text-base leading-tight">立减券</h3>
                                <p className="text-[11px] text-gray-400 mt-1.5 font-medium leading-tight">堂食/自提可用</p>
                             </div>
                             
                             <div className="flex justify-between items-end mt-2">
                                 <span className="text-[10px] text-gray-300 font-medium">已过期</span>
                             </div>

                             {/* Stamp Effect */}
                             <div className="absolute right-2 bottom-4 transform -rotate-12 border-2 border-gray-300 text-gray-300 rounded-lg px-2 py-1 text-xs font-black tracking-widest opacity-50">
                                EXPIRED
                             </div>
                        </div>
                    </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                         <Ticket className="w-10 h-10 text-[#193b35]/20" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-[#193b35]/60 font-heavy">暂无平台红包</p>
                </div>
              )
          ) : (
             !hasMerchantCoupons ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <div className="relative w-24 h-24 mb-4">
                        <div className="absolute inset-0 bg-white rounded-full opacity-60"></div>
                        <Ticket className="w-12 h-12 text-[#193b35]/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-[#193b35]/60 font-heavy">暂无商家代金券</p>
                    <p className="text-xs text-gray-400 mt-1.5 font-medium">去逛逛摊位，可能会有惊喜哦</p>
                    
                    <button onClick={onBack} className="mt-6 px-6 py-2 bg-[#193b35]/5 text-[#193b35] text-xs font-heavy rounded-full hover:bg-[#193b35] hover:text-[#e2f3a6] transition-colors">
                        去逛逛                    </button>
                </div>
             ) : null
          )}
      </div>
    </div>
  );
};

// ================= 4. FEEDBACK VIEW =================
export const UserFeedbackView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [text, setText] = useState('');
  
  return (
    <div className="h-full bg-[#f1f7f5] flex flex-col">
      <SubViewHeader title="建议反馈" onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto p-6">
         <h2 className="text-[#193b35] font-bold text-lg mb-2">我们在倾听</h2>
         <p className="text-sm text-gray-500 mb-6">您的建议会让滩摊变得更好。无论是功能吐槽还是新摊位推荐，都欢迎告诉我们。</p>
         
         <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#193b35]/10 mb-4">
             <textarea 
               className="w-full h-32 bg-transparent resize-none focus:outline-none text-sm text-[#193b35] placeholder:text-gray-300"
               placeholder="请详细描述您遇到的问题或建议..."
               value={text}
               onChange={(e) => setText(e.target.value)}
             ></textarea>
             <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                 <button className="w-16 h-16 bg-[#f0f7f5] rounded-xl flex flex-col items-center justify-center text-gray-400 gap-1 hover:bg-[#e0e7e4] transition-colors border border-dashed border-gray-300">
                    <ImageIcon size={20} />
                    <span className="text-[10px]">传图</span>
                 </button>
                 <span className="text-xs text-gray-300">{text.length}/200</span>
             </div>
         </div>

         <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#193b35]/10 mb-8">
             <label className="text-sm font-bold text-[#193b35] block mb-2">联系方式 (选填)</label>
             <input 
               type="text" 
               className="w-full bg-[#f9fafb] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#193b35]"
               placeholder="手机号 / 微信"
             />
         </div>

         <button className="w-full h-14 bg-[#193b35] text-[#e2f3a6] rounded-2xl font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_#2d4f48] active:translate-y-[2px] active:shadow-[2px_2px_0px_#2d4f48] transition-all">
            <Send size={18} /> 提交反馈
         </button>
      </div>
    </div>
  );
};

// ================= 5. HELP VIEW =================
export const UserHelpView: React.FC<{ onBack: () => void; config?: AppConfig }> = ({ onBack, config }) => {
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const fallbackFaqs = [
    { question: '可以用现金支付吗？', answer: '目前支持微信和支付宝扫码支付，暂不支持现金。' },
    { question: '下单后可以取消吗？', answer: '可以，请在未制作前取消，详情请联系摊主。' },
    { question: '如果找不到摊位怎么办？', answer: '点击联系人工客服或拨打商家电话获取帮助。' },
  ];
  const rawFaqs = config?.helpCenterFaqs as Array<{ question: string; answer: string } | string> | undefined;
  const faqs = rawFaqs && rawFaqs.length > 0
    ? rawFaqs.map((item) => (typeof item === 'string' ? { question: item, answer: '' } : item))
    : fallbackFaqs;
  const title = config?.helpCenterTitle || '客服在线时间';
  const hours = config?.helpCenterHours || '10:00 - 24:00';
  const contactLabel = config?.helpCenterContactLabel || '联系人工客服';
  const contactValue = config?.helpCenterContactValue || 'kefu_wechat';

  const handleCopy = async () => {
    if (!contactValue) return;
    try {
      await navigator.clipboard.writeText(contactValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError('复制失败，请手动添加客服微信号');
      window.setTimeout(() => setCopyError(''), 1800);
    }
  };
  
  return (
    <div className="h-full bg-[#f1f7f5] flex flex-col">
      <SubViewHeader title="帮助与客服" onBack={onBack} />
      
      <div className="flex-1 overflow-y-auto p-5">
         <div className="bg-[#193b35] rounded-2xl p-6 text-center text-white mb-6 relative overflow-hidden">
             <div className="relative z-10">
                <h2 className="font-bold text-lg mb-1">{title}</h2>
                <p className="text-[#e2f3a6] font-display text-2xl font-bold mb-4">{hours}</p>
                <button
                  onClick={() => setIsContactOpen(true)}
                  className="bg-white text-[#193b35] px-6 py-2 rounded-full text-sm font-bold hover:bg-[#e2f3a6] transition-colors flex items-center gap-2 mx-auto"
                >
                   <MessageSquare size={16} /> {contactLabel}
                </button>
             </div>
             <PalmLeafIcon className="absolute -bottom-10 -right-10 text-white/5 w-48 h-48 rotate-12" />
         </div>

         <h3 className="font-bold text-[#193b35] mb-3 px-1">常见问题</h3>
         <div className="space-y-3">
             {faqs.map((faq, i) => (
                 <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#193b35]/5 p-4">
                     <button
                       type="button"
                       aria-expanded={openFaqIndex === i}
                       onClick={() => setOpenFaqIndex((prev) => (prev === i ? null : i))}
                       className="w-full flex items-start gap-2 text-left"
                     >
                        <span className="text-[10px] font-black bg-[#e2f3a6] text-[#193b35] px-1.5 py-0.5 rounded">Q</span>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-[#193b35]">{faq.question}</div>
                        </div>
                        <ChevronRight
                          size={16}
                          className={`mt-0.5 text-[#193b35]/40 transition-transform ${
                            openFaqIndex === i ? 'rotate-90' : ''
                          }`}
                        />
                     </button>
                     <div
                       className={`overflow-hidden transition-all duration-300 ${
                         openFaqIndex === i ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'
                       }`}
                     >
                        <div className="text-xs text-[#2d4f48]/70 leading-relaxed">
                          <span className="font-bold text-[#193b35] mr-1">A</span>
                          {faq.answer || '暂未添加回复'}
                        </div>
                     </div>
                 </div>
             ))}
         </div>
      </div>

      {isContactOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl text-center">
            <div className="text-sm font-bold text-[#193b35] mb-2">客服微信号</div>
            <div className="bg-[#f1f7f5] rounded-xl px-4 py-3 text-[#193b35] font-bold tracking-wide mb-4">
              {contactValue}
            </div>
            <button
              onClick={handleCopy}
              className="w-full py-2 bg-[#193b35] text-[#e2f3a6] rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Copy size={16} />
              {copied ? '已复制' : '复制微信号'}
            </button>
            {copyError && (
              <div className="mt-2 text-[11px] font-bold text-[#b42318] bg-[#fee4e2] px-3 py-2 rounded-xl border border-[#fecdca] text-center">
                {copyError}
              </div>
            )}
            <button
              onClick={() => setIsContactOpen(false)}
              className="w-full mt-3 py-2 text-sm text-[#193b35]/70"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
