import React, { useState } from 'react';
import { User, Lock, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { IslandBackground, Sun } from './Decorations';

interface Props {
  onLogin: (code: string, password: string) => Promise<void>;
}

export const MerchantLogin: React.FC<Props> = ({ onLogin }) => {
  const [formData, setFormData] = useState({ code: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.code || !formData.password) {
      setError('请输入摊位码和密码');
      return;
    }

    setIsLoading(true);
    onLogin(formData.code.trim(), formData.password)
      .catch((err) => {
        setError(err instanceof Error ? err.message : '登录失败，请稍后再试');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-island-bg p-6">
      <IslandBackground />

      <div className="w-full max-w-[360px] bg-white/90 backdrop-blur-md rounded-[32px] shadow-2xl shadow-island-dark/5 p-8 relative z-10 border border-white animate-scale-up">
        <div className="absolute -top-12 -right-8 animate-float-slow">
          <Sun className="w-24 h-24 text-yellow-400" />
        </div>

        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center text-white font-black text-3xl shadow-lg mx-auto mb-4 rotate-3 bg-island-dark shadow-island-dark/20">
            T
          </div>
          <h1 className="text-2xl font-bold text-island-dark tracking-tight">摊主登录</h1>
          <p className="text-text-secondary text-xs mt-1">请输入摊位码与密码</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-island-dark ml-2">摊位码</label>
            <div className="relative group">
              <div className="absolute left-4 top-3.5 transition-colors text-island-dark/30 group-focus-within:text-island-primary">
                <User size={18} />
              </div>
              <input
                type="text"
                placeholder="例如 HI888"
                className="w-full h-12 bg-gray-50 rounded-2xl pl-11 pr-4 text-sm font-medium text-island-dark outline-none focus:bg-white focus:ring-2 transition-all placeholder:text-gray-300 ring-island-primary/50"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-island-dark ml-2">密码</label>
            <div className="relative group">
              <div className="absolute left-4 top-3.5 transition-colors text-island-dark/30 group-focus-within:text-island-primary">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入密码"
                className="w-full h-12 bg-gray-50 rounded-2xl pl-11 pr-12 text-sm font-medium text-island-dark outline-none focus:bg-white focus:ring-2 transition-all placeholder:text-gray-300 ring-island-primary/50"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-300 hover:text-island-dark transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs font-bold text-center bg-red-50 py-2 rounded-lg animate-shake">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 text-white rounded-2xl font-bold text-base shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 relative overflow-hidden group bg-island-dark shadow-island-dark/20"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>进入商家后台</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
              <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:left-[100%] transition-all duration-700 ease-in-out" />
            </button>
          </div>
        </form>
      </div>

      <div className="absolute bottom-6 left-0 w-full text-center z-10">
        <p className="text-[10px] text-island-dark/20 font-english font-bold tracking-widest uppercase">
          TanTan Island Street Food
        </p>
      </div>
    </div>
  );
};
