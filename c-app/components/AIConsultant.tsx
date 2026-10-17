
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Loader2, Sparkles, MessageCircle } from 'lucide-react';
import { aiService } from '../services/ai';
import { CoconutDrinkIcon, PalmLeafIcon } from './Icons';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export const AIConsultant: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: '嘿！我是小椰 🥥，后海村最懂吃的岛民。今天想在沙滩上整点什么好吃的哈？' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const reply = await aiService.getBeachRecommendation(userMsg);
      setMessages(prev => [...prev, { role: 'ai', text: reply || '哎呀，海浪太大信号断了，等下再试试啵！' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: '服务器去冲浪了，暂时没法回复你哦。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-[#E0F2F1] flex flex-col z-[70] animate-[slideUp_0.3s_ease-out]">
      {/* Header */}
      <div className="pt-14 pb-4 px-5 bg-white/80 backdrop-blur-md flex items-center gap-4 border-b border-[#193b35]/5 shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-[#193b35]">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#193b35] rounded-xl flex items-center justify-center text-[#e2f3a6]">
             <CoconutDrinkIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heavy text-[#193b35] text-base leading-none">智能导购·小椰</h2>
            <span className="text-[10px] text-green-500 font-black animate-pulse uppercase mt-1 inline-block">Online</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
         {messages.map((msg, idx) => (
           <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                msg.role === 'user' 
                ? 'bg-[#193b35] text-[#e2f3a6] rounded-tr-none' 
                : 'bg-white text-[#193b35] rounded-tl-none border border-white'
              }`}>
                {msg.text}
              </div>
           </div>
         ))}
         {isLoading && (
           <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-white flex items-center gap-2">
                 <Loader2 size={16} className="animate-spin text-[#193b35]" />
                 <span className="text-xs text-[#193b35]/40 font-bold">小椰正在思考...</span>
              </div>
           </div>
         )}
      </div>

      {/* Input Area */}
      <div className="p-5 pb-10 bg-white border-t border-gray-100 shrink-0">
         <div className="flex gap-2 items-center bg-[#f4f9f8] p-2 rounded-2xl border border-[#193b35]/5 focus-within:border-[#193b35]/20 transition-all">
            <input 
              className="flex-1 bg-transparent border-none focus:outline-none px-2 text-sm text-[#193b35] placeholder:text-[#193b35]/30 font-bold"
              placeholder="问问小椰：有什么不辣的吃？"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                input.trim() ? 'bg-[#193b35] text-[#e2f3a6]' : 'bg-[#193b35]/10 text-[#193b35]/20'
              }`}
            >
              <Send size={18} />
            </button>
         </div>
         <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {['推荐椰子鸡', '附近有厕所吗', '现在天气咋样', '哪里好停车'].map(tag => (
              <button 
                key={tag}
                onClick={() => setInput(tag)}
                className="whitespace-nowrap px-3 py-1 bg-gray-50 text-[10px] font-heavy text-[#193b35]/50 border border-gray-100 rounded-lg"
              >
                {tag}
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};
