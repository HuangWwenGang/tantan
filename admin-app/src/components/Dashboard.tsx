import React, { useState } from 'react';
import {
  LayoutDashboard,
  Store,
  Settings,
  LogOut,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { PlatformStats } from '../types';

interface Props {
  activeTab: 'overview' | 'vendors' | 'settings';
  onTabChange: (tab: 'overview' | 'vendors' | 'settings') => void;
  onLogout: () => void;
  stats: PlatformStats;
  children: React.ReactNode;
}

// 统计卡片组件
const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  colorBg: string;
  colorText: string;
}> = ({ title, value, subtitle, icon, colorBg, colorText }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorBg} ${colorText}`}>
        {icon}
      </div>
    </div>
    <div>
      <h3 className="text-3xl font-black text-slate-800 font-english">{value}</h3>
      <p className="text-sm text-slate-500 mt-1 font-medium">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  </div>
);

export const Dashboard: React.FC<Props> = ({ activeTab, onTabChange, onLogout, stats, children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 侧边栏 */}
      <div className={`bg-slate-900 text-white flex flex-col shrink-0 fixed h-full z-50 transition-all duration-200 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Logo */}
        <div className={`h-20 flex items-center border-b border-slate-800 ${isSidebarCollapsed ? 'justify-center' : 'gap-3 px-6'}`}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          {!isSidebarCollapsed && (
            <div>
              <h1 className="font-bold text-lg tracking-wide leading-none">超级管理员</h1>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Platform Control</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          className={`mx-3 mt-4 mb-2 h-9 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${isSidebarCollapsed ? 'flex items-center justify-center' : 'flex items-center gap-2 px-3'}`}
          title={isSidebarCollapsed ? '展开侧栏' : '收起侧栏'}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!isSidebarCollapsed && <span className="text-xs font-bold">收起侧栏</span>}
        </button>

        {/* 导航菜单 */}
        <div className="flex-1 py-6 px-3 space-y-1">
          <button
            onClick={() => onTabChange('overview')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <TrendingUp size={18} />
            {!isSidebarCollapsed && '数据总览'}
          </button>
          <button
            onClick={() => onTabChange('vendors')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'vendors'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Store size={18} />
            {!isSidebarCollapsed && '商户管理'}
          </button>
          <button
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings size={18} />
            {!isSidebarCollapsed && '功能配置'}
          </button>
        </div>

        {/* 退出登录 */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className={`text-xs font-bold text-slate-400 hover:text-white transition-colors w-full px-4 py-2 ${isSidebarCollapsed ? 'flex items-center justify-center' : 'flex items-center gap-2'}`}
          >
            <LogOut size={14} />
            {!isSidebarCollapsed && '退出登录'}
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className={`flex-1 p-8 transition-all duration-200 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        {/* 顶部标题栏 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">
              {activeTab === 'overview' && '平台数据总览'}
              {activeTab === 'vendors' && '商户管理'}
              {activeTab === 'settings' && '功能配置'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {new Date().toLocaleDateString()} · 欢迎回来，管理员
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            SA
          </div>
        </div>

        {/* 数据总览页 - KPI卡片 */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="总商户数"
                value={stats.totalVendors.toString()}
                subtitle={`活跃: ${stats.activeVendors} | 待审: ${stats.pendingVendors}`}
                icon={<Store />}
                colorBg="bg-indigo-50"
                colorText="text-indigo-600"
              />
              <StatCard
                title="平台总营收"
                value={`¥${stats.totalRevenue.toLocaleString()}`}
                subtitle="所有商户累计营收"
                icon={<DollarSign />}
                colorBg="bg-emerald-50"
                colorText="text-emerald-600"
              />
              <StatCard
                title="总订单量"
                value={stats.totalOrders.toString()}
                subtitle="所有商户累计订单"
                icon={<ShoppingBag />}
                colorBg="bg-blue-50"
                colorText="text-blue-600"
              />
              <StatCard
                title="平均客单价"
                value={`¥${stats.avgOrderValue.toFixed(1)}`}
                subtitle="平台平均客单价"
                icon={<Users />}
                colorBg="bg-orange-50"
                colorText="text-orange-600"
              />
            </div>

            {/* 商户状态分布 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users size={20} className="text-indigo-500" />
                商户状态分布
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                  <CheckCircle size={24} className="text-green-600" />
                  <div>
                    <p className="text-2xl font-black text-green-700">{stats.openVendors}</p>
                    <p className="text-xs text-green-600 font-medium">正在营业</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <CheckCircle size={24} className="text-blue-600" />
                  <div>
                    <p className="text-2xl font-black text-blue-700">{stats.activeVendors}</p>
                    <p className="text-xs text-blue-600 font-medium">激活商户</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <AlertCircle size={24} className="text-orange-600" />
                  <div>
                    <p className="text-2xl font-black text-orange-700">{stats.pendingVendors}</p>
                    <p className="text-xs text-orange-600 font-medium">待审核</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                  <AlertCircle size={24} className="text-red-600" />
                  <div>
                    <p className="text-2xl font-black text-red-700">{stats.bannedVendors}</p>
                    <p className="text-xs text-red-600 font-medium">已封禁</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 其他Tab的内容通过children传入 */}
        {activeTab !== 'overview' && children}
      </div>
    </div>
  );
};
