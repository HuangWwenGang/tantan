
import React, { useState } from 'react';
import { Shield, Power, LayoutDashboard, ShoppingBag, Settings, Store, LogOut, CheckCircle, AlertTriangle, Users, Search, Ban, Eye, TrendingUp, DollarSign, ArrowUpRight, Lock, Unlock, MapPin, ArrowDownRight, Activity, PieChart, Clock, BarChart3, ChevronRight, Award, Receipt, Bike, Calendar, CreditCard, MessageSquareText, X, Phone, Utensils, User, FileBadge, Megaphone, MessageCircle } from 'lucide-react';
import { AppConfig, Merchant, Order, OrderItem } from '../types';

interface Props {
  onLogout: () => void;
  config: AppConfig;
  merchants: Merchant[];
  globalOrders: Order[];
  onUpdateConfig: (newConfig: AppConfig) => void;
  onImpersonate: (merchantId: string) => void;
  onUpdateMerchantStatus: (id: string, status: Merchant['status']) => void;
}

const getOrderStatusLabel = (status: Order['status']) => {
  if (status === 'completed') return '已完成';
  if (status === 'delivering') return '配送中';
  if (status === 'preparing') return '制作中';
  if (status === 'cancelled') return '已取消';
  if (status === 'pending-confirmation') return '待确认';
  return '待接单';
};

const getOrderStatusPillClass = (status: Order['status']) => {
  if (status === 'completed') return 'bg-green-50 text-green-600 border-green-100';
  if (status === 'delivering') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500 border-slate-200';
  return 'bg-orange-50 text-orange-600 border-orange-100';
};

const getOrderStatusDotClass = (status: Order['status']) => {
  if (status === 'completed') return 'bg-green-500';
  if (status === 'delivering') return 'bg-blue-500';
  if (status === 'cancelled') return 'bg-slate-500';
  return 'bg-orange-500';
};

// --- 增强版统计卡片 ---
const StatCard: React.FC<{ 
    title: string; 
    value: string; 
    trend: string; 
    isUp: boolean; 
    icon: React.ReactNode; 
    colorBg: string; 
    colorText: string;
    subLabel?: string;
}> = ({ title, value, trend, isUp, icon, colorBg, colorText, subLabel }) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="flex justify-between items-start z-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorBg} ${colorText}`}>
                {icon}
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {trend}
            </div>
        </div>
        <div className="z-10">
            <h3 className="text-2xl font-black text-slate-800 font-english tracking-tight">{value}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                {title} {subLabel && <span className="text-slate-300">• {subLabel}</span>}
            </p>
        </div>
        {/* 背景装饰 */}
        <div className={`absolute -right-4 -bottom-4 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform ${colorText}`}>
             {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 64 })}
        </div>
    </div>
);

// --- 简易 CSS 柱状图组件 ---
const BarChart: React.FC<{ data: number[], labels: string[], activeIndex?: number }> = ({ data, labels, activeIndex = 6 }) => {
    const max = Math.max(...data);
    return (
        <div className="h-48 flex items-end justify-between gap-2 pt-6">
            {data.map((val, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group cursor-pointer">
                    <div className="relative w-full flex justify-center h-full items-end">
                        {/* Tooltip */}
                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded mb-1 whitespace-nowrap z-20">
                            ¥{val.toLocaleString()}
                        </div>
                        <div 
                            style={{ height: `${(val / max) * 100}%` }} 
                            className={`w-full max-w-[24px] rounded-t-lg transition-all duration-500 ease-out relative overflow-hidden ${
                                i === activeIndex 
                                ? 'bg-indigo-600 shadow-lg shadow-indigo-200' 
                                : 'bg-slate-100 group-hover:bg-indigo-300'
                            }`}
                        ></div>
                    </div>
                    <span className={`text-[10px] font-bold font-english ${
                        i === activeIndex ? 'text-indigo-600' : 'text-slate-400'
                    }`}>
                        {labels[i]}
                    </span>
                </div>
            ))}
        </div>
    );
};

// --- 品类占比条 ---
const CategoryBar: React.FC<{ label: string, percent: number, color: string, value: string }> = ({ label, percent, color, value }) => (
    <div className="mb-4 last:mb-0 group cursor-pointer">
        <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${color}`}></span>
                {label}
            </span>
            <span className="text-xs font-english font-bold text-slate-800">{value} ({percent}%)</span>
        </div>
        <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
            <div 
                className={`h-full rounded-full ${color} transition-all duration-1000 ease-out group-hover:opacity-80`} 
                style={{ width: `${percent}%` }}
            ></div>
        </div>
    </div>
);

// --- 订单详情弹窗 ---
const OrderDetailModal: React.FC<{ order: Order; onClose: () => void }> = ({ order, onClose }) => {
    const orderStatus = order.status;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
                
                {/* Header */}
                <div className="h-16 px-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                订单详情 <span className="font-english text-indigo-600">#{order.id}</span>
                            </h2>
                            <span className="text-xs text-slate-400 font-medium">{order.date} 下单</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getOrderStatusPillClass(order.status)}`}>
                            {getOrderStatusLabel(order.status)}
                        </span>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    
                    {/* Left: Goods List */}
                    <div className="flex-1 overflow-y-auto p-6 border-r border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ShoppingBag size={16} className="text-indigo-500" />
                            商品明细 ({order.count}件)
                        </h3>
                        <div className="space-y-4">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <img src={item.imageUrl} className="w-16 h-16 rounded-lg object-cover bg-white" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-700 text-sm">{item.name}</h4>
                                            <span className="font-english font-bold text-slate-800">¥{item.price}</span>
                                        </div>
                                        {item.specs && (
                                            <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-1">
                                                {item.specs.map((s, i) => (
                                                    <span key={i} className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{s}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mt-2 text-xs font-bold text-indigo-600">x {item.count}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary */}
                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">商品总额</span>
                                <span className="font-english font-bold text-slate-700">¥{order.totalPrice}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">配送费</span>
                                <span className="font-english font-bold text-slate-700">¥0.00</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">包装费</span>
                                <span className="font-english font-bold text-slate-700">¥0.00</span>
                            </div>
                            <div className="flex justify-between items-end pt-2">
                                <span className="font-bold text-slate-800">实付金额</span>
                                <span className="text-2xl font-english font-black text-indigo-600">¥{order.totalPrice}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Info Panels */}
                    <div className="w-full md:w-80 bg-slate-50 overflow-y-auto p-6 space-y-6">
                        
                        {/* 1. Customer Info */}
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <User size={14} /> 顾客信息
                            </h3>
                            {order.orderType === 'delivery' && order.address ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{order.address.contactName}</p>
                                            <p className="text-xs text-slate-400 font-english">{order.address.contactPhone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center shrink-0">
                                            <MapPin size={16} />
                                        </div>
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed pt-1">
                                            {order.address.location} {order.address.detail}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-sm font-bold text-slate-700">自提 / 堂食订单</p>
                                    <div className="mt-2 text-3xl font-english font-black text-indigo-600 tracking-widest">{order.pickupCode}</div>
                                </div>
                            )}
                        </div>

                         {/* 2. Vendor Info */}
                         <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Store size={14} /> 所属商户
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                                    <Store size={16} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-slate-700 truncate">{order.vendorName}</p>
                                    <p className="text-xs text-slate-400">ID: {order.vendorId}</p>
                                </div>
                            </div>
                        </div>

                        {/* 3. Rider Info (If Delivery) */}
                        {order.orderType === 'delivery' && (
                             <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Bike size={14} /> 骑手配送
                                </h3>
                                {order.riderName ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                                            <Bike size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-700">{order.riderName}</p>
                                            <p className="text-xs text-slate-400 font-english">{order.riderPhone}</p>
                                        </div>
                                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <Phone size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 bg-slate-50 p-2 rounded text-center">
                                        {orderStatus === 'pending-confirmation'
                                          ? '等待收款确认后分配骑手'
                                          : orderStatus === 'pending-payment'
                                            ? '等待接单后分配骑手'
                                            : '正在分配骑手...'}
                                    </div>
                                )}
                                {order.deliveryTime && (
                                     <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                                        <span className="text-slate-400">预计送达</span>
                                        <span className="font-english font-bold text-slate-700">{order.deliveryTime}</span>
                                     </div>
                                )}
                            </div>
                        )}

                        {/* 4. Other Info */}
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">其他信息</h3>
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 flex items-center gap-2"><CreditCard size={12}/> 支付方式</span>
                                <span className="font-bold text-slate-700">{order.paymentMethod || '微信支付'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 flex items-center gap-2"><Calendar size={12}/> 订单类型</span>
                                <span className="font-bold text-slate-700">{order.orderType === 'delivery' ? '外卖配送' : '堂食/自提'}</span>
                            </div>
                            {order.remarks && (
                                <div className="pt-2 border-t border-slate-50">
                                    <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                                        <MessageSquareText size={10} /> 订单备注
                                    </div>
                                    <p className="text-xs font-medium text-amber-600 bg-amber-50 p-2 rounded-lg">
                                        {order.remarks}
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export const AdminDashboard: React.FC<Props> = ({ onLogout, config, merchants, globalOrders, onUpdateConfig, onImpersonate, onUpdateMerchantStatus }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'orders' | 'settings'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // --- Real Stats Calculation ---
  const totalGMV = merchants.reduce((acc, m) => acc + (m.revenue || 0), 0);
  const activeMerchants = merchants.filter(m => m.status === 'active').length;
  const totalOrders = globalOrders.length;
  const avgOrderValue = totalOrders > 0 ? (totalGMV / totalOrders).toFixed(1) : '0.0';
  
  // Mock Data for Charts (Simulation)
  const revenueTrendData = [12000, 15400, 13800, 18900, 16500, 21000, totalGMV]; // Ends with current total for realism
  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Filter Merchants
  const filteredMerchants = merchants.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.ownerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter Orders
  const filteredOrders = globalOrders.filter(o => {
      const matchSearch = searchTerm === '' || 
                          o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          o.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = orderStatusFilter === 'all' ? true :
                          orderStatusFilter === 'processing' ? ['preparing', 'ready', 'delivering'].includes(o.status) :
                          orderStatusFilter === 'pending' ? (o.status === 'pending-payment' || o.status === 'pending-confirmation') :
                          o.status === orderStatusFilter;
      
      return matchSearch && matchStatus;
  });

  const topMerchants = [...merchants].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 5);

  const toggleFeature = (key: keyof AppConfig) => {
    onUpdateConfig({ ...config, [key]: !config[key] });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      
      {/* Sidebar Navigation */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0 fixed h-full z-50 transition-all">
         {/* Brand */}
         <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-800">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Shield size={16} className="text-white" />
            </div>
            <div>
                <h1 className="font-bold text-lg tracking-wide leading-none">Admin</h1>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Platform Control</p>
            </div>
         </div>

         {/* Nav Links */}
         <div className="flex-1 py-6 px-3 space-y-1">
            <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <LayoutDashboard size={18} /> 总览 Dashboard
            </button>
            <button 
                onClick={() => setActiveTab('merchants')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'merchants' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Store size={18} /> 商户管理 Merchants
            </button>
            <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <ShoppingBag size={18} /> 全平台订单 Orders
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Settings size={18} /> 系统配置 Config
            </button>
         </div>

         {/* Logout */}
         <div className="p-4 border-t border-slate-800">
            <button onClick={onLogout} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors w-full px-4 py-2">
                <LogOut size={14} /> 退出管理员账号
            </button>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-black text-slate-800">
                    {activeTab === 'overview' && '平台总览'}
                    {activeTab === 'merchants' && '商户管理'}
                    {activeTab === 'orders' && '全平台订单监管'}
                    {activeTab === 'settings' && '系统配置'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    {new Date().toLocaleDateString()} · 欢迎回来，超级管理员
                </p>
            </div>
            <div className="flex items-center gap-3">
                 {(activeTab === 'merchants' || activeTab === 'orders') && (
                     <div className="relative">
                         <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                         <input 
                            type="text" 
                            placeholder={activeTab === 'orders' ? "搜索订单号/商户名..." : "搜索商户..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500 transition-colors w-64"
                         />
                     </div>
                 )}
                 <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    SA
                 </div>
            </div>
        </div>

        {/* --- VIEW: OVERVIEW --- */}
        {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in pb-10">
                {/* 1. 核心指标卡片 (KPIs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title="平台总交易额 (GMV)" 
                        value={`¥ ${(totalGMV).toLocaleString()}`} 
                        trend="12.5%" isUp={true}
                        icon={<DollarSign />}
                        colorBg="bg-indigo-50" colorText="text-indigo-600"
                        subLabel="较上周"
                    />
                    <StatCard 
                        title="今日总订单量" 
                        value={totalOrders.toString()} 
                        trend="8.2%" isUp={true}
                        icon={<ShoppingBag />}
                        colorBg="bg-blue-50" colorText="text-blue-600"
                        subLabel="转化率 24%"
                    />
                     <StatCard 
                        title="活跃入驻商户" 
                        value={`${activeMerchants} / ${merchants.length}`} 
                        trend="1 家待审" isUp={false}
                        icon={<Store />}
                        colorBg="bg-orange-50" colorText="text-orange-600"
                        subLabel="覆盖率 85%"
                    />
                    <StatCard 
                        title="平均客单价 (AOV)" 
                        value={`¥ ${avgOrderValue}`} 
                        trend="3.1%" isUp={true}
                        icon={<Activity />}
                        colorBg="bg-emerald-50" colorText="text-emerald-600"
                        subLabel="较昨日"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 2. 营收趋势图 (占 2/3) */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <BarChart3 size={20} className="text-indigo-500" />
                                    营收趋势分析
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">最近7天平台交易数据监控</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200">近7天</button>
                                <button className="px-3 py-1 bg-white text-slate-400 text-xs font-bold rounded-lg hover:text-slate-600">近30天</button>
                            </div>
                        </div>
                        <BarChart data={revenueTrendData} labels={weekLabels} />
                    </div>

                    {/* 3. 品类占比与热力 (占 1/3) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                        <div>
                             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                                <PieChart size={20} className="text-orange-500" />
                                热门品类分布
                            </h3>
                            <CategoryBar label="海岛烧烤" percent={45} value="¥12.5k" color="bg-orange-500" />
                            <CategoryBar label="特色饮品" percent={30} value="¥8.4k" color="bg-blue-500" />
                            <CategoryBar label="清凉甜品" percent={15} value="¥4.2k" color="bg-pink-500" />
                            <CategoryBar label="主食简餐" percent={10} value="¥2.8k" color="bg-emerald-500" />
                        </div>
                        
                        {/* 迷你时段热力 */}
                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1">
                                <Clock size={12} /> 下单高峰时段
                            </h4>
                            <div className="flex items-end justify-between h-12 gap-1">
                                {[2,5,8,12,45,80,95,60,30,10,5,2].map((h, i) => (
                                    <div key={i} className="w-full bg-slate-100 rounded-sm relative group">
                                        <div 
                                            className="absolute bottom-0 w-full bg-indigo-400 rounded-sm group-hover:bg-indigo-600 transition-colors" 
                                            style={{ height: `${h}%` }}
                                        ></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-english">
                                <span>12PM</span>
                                <span>6PM</span>
                                <span>12AM</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 4. 明星商户榜单 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Award size={20} className="text-yellow-500" />
                                明星商户榜 (Top 5)
                            </h3>
                            <button className="text-xs text-indigo-600 font-bold flex items-center">
                                查看全部 <ChevronRight size={14} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {topMerchants.map((m, idx) => (
                                <div key={m.id} className="flex items-center gap-4 py-2 hover:bg-slate-50 rounded-xl transition-colors px-2 -mx-2 cursor-pointer" onClick={() => onImpersonate(m.id)}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm ${
                                        idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-orange-300' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        {idx + 1}
                                    </div>
                                    <img src={m.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-slate-200" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-slate-800 truncate">{m.name}</h4>
                                            {m.status === 'banned' && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">已封禁</span>}
                                        </div>
                                        <p className="text-xs text-slate-400 truncate">{m.ownerName} · {m.phone}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-800 font-english">¥{(m.revenue || 0).toLocaleString()}</p>
                                        <p className="text-xs text-slate-400">评分 {m.rating}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 5. 实时平台动态 */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Activity size={20} className="text-emerald-500" />
                            实时交易动态
                        </h3>
                        <div className="space-y-0 relative">
                            {/* 连接线 */}
                            <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-100 z-0"></div>

                            {[1,2,3,4,5].map((i) => (
                                <div key={i} className="flex items-start gap-4 py-3 relative z-10 group">
                                    <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shrink-0 group-hover:border-indigo-500 group-hover:text-indigo-600 transition-colors text-slate-400">
                                        {i % 2 === 0 ? <ShoppingBag size={16} /> : <CheckCircle size={16} />}
                                    </div>
                                    <div className="flex-1 pt-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-bold text-slate-700">
                                                {i % 2 === 0 ? '新订单提交' : '订单已完成'} 
                                                <span className="text-slate-400 ml-2 font-normal">#102{i}</span>
                                            </p>
                                            <span className="text-xs font-bold text-slate-500">¥ 128.00</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            来自 <span className="text-indigo-600 font-bold cursor-pointer hover:underline">大飞海鲜烧烤</span> · {i * 2}分钟前
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- VIEW: MERCHANTS --- */}
        {activeTab === 'merchants' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">商户信息</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">摊主/联系方式</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">状态</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">总营收</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">管理操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredMerchants.map(merchant => (
                            <tr key={merchant.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={merchant.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-slate-200" />
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{merchant.name}</div>
                                            <div className="text-xs text-slate-400 flex items-center gap-1">
                                                <MapPin size={10} /> {merchant.location}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-slate-700">{merchant.ownerName}</div>
                                    <div className="text-xs text-slate-400 font-english">{merchant.phone}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                                        merchant.status === 'active' 
                                        ? 'bg-green-50 text-green-600' 
                                        : 'bg-red-50 text-red-600'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${merchant.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        {merchant.status === 'active' ? '正常营业' : '已封禁'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-english font-bold text-slate-700">¥{(merchant.revenue || 0).toLocaleString()}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-100">
                                        {merchant.status === 'active' ? (
                                            <button 
                                                onClick={() => onUpdateMerchantStatus(merchant.id, 'banned')}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="封禁商户"
                                            >
                                                <Ban size={16} />
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => onUpdateMerchantStatus(merchant.id, 'active')}
                                                className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                                                title="解封商户"
                                            >
                                                <Unlock size={16} />
                                            </button>
                                        )}
                                        
                                        <button 
                                            onClick={() => onImpersonate(merchant.id)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-indigo-200 active:scale-95"
                                        >
                                            <Eye size={14} /> 进入店铺
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* --- VIEW: ORDERS (New) --- */}
        {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in flex flex-col h-[calc(100vh-140px)]">
                {/* Order Filters */}
                <div className="px-6 py-4 border-b border-slate-100 flex gap-2">
                    {[
                        { id: 'all', label: '全部订单' },
                        { id: 'pending', label: '待接单' },
                        { id: 'processing', label: '进行中' },
                        { id: 'completed', label: '已完成' },
                        { id: 'cancelled', label: '已取消' }
                    ].map(status => (
                        <button
                            key={status.id}
                            onClick={() => setOrderStatusFilter(status.id as any)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                orderStatusFilter === status.id 
                                ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/20' 
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>

                {/* Orders Table */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">订单号/时间</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">所属商户</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">顾客/类型</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">摘要</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">状态</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">金额</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 text-slate-400 text-sm">
                                        暂无符合条件的订单
                                    </td>
                                </tr>
                            ) : filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedOrder(order)}>
                                    <td className="px-6 py-4">
                                        <div className="font-english font-bold text-slate-800">#{order.id}</div>
                                        <div className="text-xs text-slate-400">{order.date}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Store size={14} className="text-slate-400" />
                                            <span className="text-sm font-bold text-slate-700">{order.vendorName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-700">
                                            {order.address ? order.address.contactName : '自提顾客'}
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                            order.orderType === 'delivery' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                        }`}>
                                            {order.orderType === 'delivery' ? '外卖配送' : '自提/堂食'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-500 max-w-[150px] truncate" title={order.itemsSummary}>
                                            {order.itemsSummary}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">共 {order.count} 件商品</div>
                                    </td>
                                    <td className="px-6 py-4">
                                         <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${getOrderStatusPillClass(order.status)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${getOrderStatusDotClass(order.status)}`}></span>
                                            {getOrderStatusLabel(order.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-english font-bold text-slate-800">¥{order.totalPrice}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors">
                                            <Receipt size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- VIEW: SETTINGS (Original Content) --- */}
        {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in pb-20">
                 {/* System Maintenance */}
                 <div className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                    config.systemMaintenance ? 'bg-red-50 border-red-200' : 'bg-white border-white shadow-sm'
                }`}>
                    <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.systemMaintenance ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <Power size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-1 text-slate-800">系统维护模式 (Kill Switch)</h3>
                            <p className="text-xs text-slate-500 max-w-md">
                                开启后，所有商家端将进入锁定状态，无法接单。用于紧急系统维护。
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => toggleFeature('systemMaintenance')}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative ${config.systemMaintenance ? 'bg-red-500' : 'bg-slate-300'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${config.systemMaintenance ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                    </div>
                </div>

                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-8 mb-4">商家后台权限管理</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Backend Feature Cards */}
                    {[
                        { key: 'enableStats', label: '经营概况', icon: LayoutDashboard, desc: '数据看板与流水' },
                        { key: 'enableProducts', label: '商品管理', icon: Store, desc: '菜单编辑与库存' },
                        { key: 'enableOrders', label: '订单处理', icon: ShoppingBag, desc: '接单与核销流程' },
                        { key: 'enableSettings', label: '店铺设置', icon: Settings, desc: '基本信息修改' },
                    ].map((feature) => (
                        <div key={feature.key} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between h-40">
                            <div className="flex justify-between items-start">
                                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                                    <feature.icon size={20} />
                                </div>
                                <button 
                                    onClick={() => toggleFeature(feature.key as keyof AppConfig)}
                                    className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 relative ${config[feature.key as keyof AppConfig] ? 'bg-green-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${config[feature.key as keyof AppConfig] ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </button>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{feature.label}</h4>
                                <p className="text-xs text-slate-400 mt-1">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-8 mb-4">小程序前台显示控制</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                     {/* Client Feature Toggles */}
                     {[
                        { key: 'enableClientReviews', label: '评论区', icon: MessageCircle },
                        { key: 'showBusinessHours', label: '营业时间', icon: Clock },
                        { key: 'showQualifications', label: '商家资质', icon: FileBadge },
                        { key: 'showContactPhone', label: '联系电话', icon: Phone },
                        { key: 'showMerchantSlogan', label: '商家寄语', icon: Megaphone },
                     ].map((feature) => (
                         <div key={feature.key} className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config[feature.key as keyof AppConfig] ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <feature.icon size={16} />
                                </div>
                                <span className={`text-sm font-bold ${config[feature.key as keyof AppConfig] ? 'text-slate-800' : 'text-slate-400'}`}>{feature.label}</span>
                            </div>
                            <button 
                                onClick={() => toggleFeature(feature.key as keyof AppConfig)}
                                className={`w-8 h-5 rounded-full p-0.5 transition-colors duration-300 relative ${config[feature.key as keyof AppConfig] ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${config[feature.key as keyof AppConfig] ? 'translate-x-3' : 'translate-x-0'}`}></div>
                            </button>
                         </div>
                     ))}
                </div>
            </div>
        )}

      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
          <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
};


