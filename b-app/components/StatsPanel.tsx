
import React, { useMemo, useState } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Users, ArrowUpRight, ArrowDownRight, ChevronRight, Clock, MapPin, ArrowRight } from 'lucide-react';
import { Coconut, PalmLeaf, Sun, Starfish } from './Decorations';
import { MenuItem, Order } from '../types';

// 卡片组件：增加了 decoration 图标
const StatCard: React.FC<{ 
  title: string; 
  value: string; 
  subValue: string; 
  trend?: 'up' | 'down';
  trendValue?: string;
  icon: React.ReactNode;
  decoration: React.ReactNode; // 背景水印
  colorClass?: string;
}> = ({ title, value, subValue, trend, trendValue, icon, decoration, colorClass = "bg-white" }) => (
  <div className={`p-6 rounded-[24px] border border-white/60 shadow-card flex flex-col hover:translate-y-[-2px] transition-transform duration-300 relative overflow-hidden group ${colorClass}`}>
    
    {/* 背景水印装饰 */}
    <div className="absolute -right-4 -bottom-6 opacity-[0.08] transform rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
        {decoration}
    </div>

    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className="w-10 h-10 rounded-[14px] bg-island-sidebar flex items-center justify-center text-island-dark shadow-sm">
        {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 18 })}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
          trend === 'up' 
            ? 'bg-green-50 text-green-600 border-green-100' 
            : 'bg-red-50 text-red-500 border-red-100'
        }`}>
          {trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {trendValue}
        </div>
      )}
    </div>

    <div className="relative z-10">
      <p className="text-xs font-bold text-text-secondary mb-1 tracking-wide">{title}</p>
      <h3 className="text-2xl font-bold text-island-dark tracking-tight font-english">{value}</h3>
      <p className="text-[10px] font-medium text-text-secondary mt-2 flex items-center gap-1">
        {subValue}
      </p>
    </div>
  </div>
);

// 实时订单行组件
const LiveOrderItem: React.FC<{ img: string, name: string, status: string, time: string }> = ({ img, name, status, time }) => (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-xl px-2 transition-colors cursor-pointer">
        <img src={img} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
        <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-island-dark truncate">{name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                    status === '制作中' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                }`}>
                    <div className={`w-1 h-1 rounded-full ${status === '制作中' ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                    {status}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center">
                    <Clock size={8} className="mr-0.5" /> {time}
                </span>
            </div>
        </div>
        <div className="text-right">
             <ArrowRight size={14} className="text-gray-300" />
        </div>
    </div>
)

interface StatsPanelProps {
  products: MenuItem[];
  orders: Order[];
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ products, orders }) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  // 时间过滤函数
  const getFilteredOrders = (range: typeof timeRange) => {
    if (range === 'all') return orders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return orders.filter((order) => {
      const orderDate = new Date(order.createdAt || order.date);
      if (range === 'today') return orderDate >= startOfToday;
      if (range === 'week') return orderDate >= startOfWeek;
      if (range === 'month') return orderDate >= startOfMonth;
      return true;
    });
  };

  const filteredOrders = useMemo(() => getFilteredOrders(timeRange), [orders, timeRange]);

  // 计算KPI数据
  const metrics = useMemo(() => {
    const completedOrders = filteredOrders.filter((order) => order.status === 'completed');
    const allOrdersCount = filteredOrders.length;
    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + (order.finalTotal ?? order.totalPrice ?? 0),
      0
    );
    const totalOrders = completedOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const paymentTotals = completedOrders.reduce(
      (acc, order) => {
        const method = (order.paymentMethod || '').toLowerCase();
        const amount = order.finalTotal ?? order.totalPrice ?? 0;
        if (method.includes('支付宝') || method.includes('alipay')) {
          acc.alipay += amount;
        } else if (method.includes('微信') || method.includes('wechat')) {
          acc.wechat += amount;
        } else {
          acc.other += amount;
        }
        return acc;
      },
      { wechat: 0, alipay: 0, other: 0 }
    );

    // 订单类型统计
    const deliveryOrders = completedOrders.filter(o => o.orderType === 'delivery').length;
    const dineInOrders = completedOrders.filter(o => o.orderType === 'dine-in').length;

    // 订单状态统计
    const pendingOrders = filteredOrders.filter(o => ['pending-payment', 'pending-confirmation', 'preparing'].includes(o.status)).length;
    const completedOrdersCount = completedOrders.length;
    const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled').length;

    // 昨日对比（仅今日模式）
    let yesterdayRevenue = 0;
    let yesterdayOrders = 0;
    if (timeRange === 'today') {
      const now = new Date();
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayData = orders.filter((order) => {
        const orderDate = new Date(order.createdAt || order.date);
        return orderDate >= startOfYesterday && orderDate < startOfToday && order.status === 'completed';
      });
      yesterdayRevenue = yesterdayData.reduce(
        (sum, order) => sum + (order.finalTotal ?? order.totalPrice ?? 0),
        0
      );
      yesterdayOrders = yesterdayData.length;
    }

    // 热销商品统计
    const productSalesMap = new Map<string, { product: MenuItem; count: number; revenue: number }>();
    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.name; // Use name as identifier
        const current = productSalesMap.get(productId) || {
          product: products.find(p => p.name === item.name) || {
            id: productId,
            name: item.name,
            price: item.price,
            imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1563583769690-d28163043363?w=100&h=100&fit=crop',
          } as MenuItem,
          count: 0,
          revenue: 0,
        };
        current.count += item.count;
        current.revenue += item.price * item.count;
        productSalesMap.set(productId, current);
      });
    });

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 计算趋势
    const revenueGrowth = yesterdayRevenue > 0
      ? ((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;
    const ordersGrowth = yesterdayOrders > 0
      ? ((totalOrders - yesterdayOrders) / yesterdayOrders) * 100
      : 0;

    return {
      totalRevenue,
      totalOrders,
      allOrdersCount,
      avgOrderValue,
      deliveryOrders,
      dineInOrders,
      pendingOrders,
      completedOrders: completedOrdersCount,
      cancelledOrders,
      yesterdayRevenue,
      yesterdayOrders,
      revenueGrowth,
      ordersGrowth,
      topProducts,
      wechatRevenue: paymentTotals.wechat,
      alipayRevenue: paymentTotals.alipay,
      otherRevenue: paymentTotals.other,
    };
  }, [filteredOrders, products, timeRange, orders]);

  // 营业趋势图数据（7天或24小时）
  const trendData = useMemo(() => {
    const completedOrders = filteredOrders.filter((order) => order.status === 'completed');
    if (timeRange === 'today') {
      // 按小时统计
      const hourBuckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, revenue: 0, count: 0 }));
      completedOrders.forEach((order) => {
        const orderDate = new Date(order.createdAt || order.date);
        const hour = orderDate.getHours();
        hourBuckets[hour].revenue += order.finalTotal ?? order.totalPrice ?? 0;
        hourBuckets[hour].count += 1;
      });

      // 找到营业时段
      const activeHours = hourBuckets.filter(b => b.count > 0);
      if (activeHours.length === 0) return [];

      return hourBuckets.map((b, i) => ({
        label: `${i}`,
        value: b.revenue,
        count: b.count,
        height: Math.max(10, Math.min(100, (b.revenue / Math.max(...hourBuckets.map(h => h.revenue), 1)) * 100)),
      }));
    } else {
      // 按天统计（最近7天）
      const dayBuckets = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return { date, revenue: 0, count: 0 };
      });

      completedOrders.forEach((order) => {
        const orderDate = new Date(order.createdAt || order.date);
        const dayIndex = dayBuckets.findIndex(b =>
          b.date.toDateString() === orderDate.toDateString()
        );
        if (dayIndex >= 0) {
          dayBuckets[dayIndex].revenue += order.finalTotal ?? order.totalPrice ?? 0;
          dayBuckets[dayIndex].count += 1;
        }
      });

      return dayBuckets.map((b, i) => ({
        label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][b.date.getDay()],
        value: b.revenue,
        count: b.count,
        height: Math.max(10, Math.min(100, (b.revenue / Math.max(...dayBuckets.map(d => d.revenue), 1)) * 100)),
      }));
    }
  }, [filteredOrders, timeRange]);

  // 实时订单（最近3个进行中的订单）
  const recentActiveOrders = useMemo(() => {
    return orders
      .filter(o => ['preparing', 'ready', 'delivering'].includes(o.status))
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .slice(0, 3);
  }, [orders]);

  const formatCurrency = (value: number) => value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-20">
    <div className="space-y-6 animate-fade-in">
      {/* 问候区 + 时间筛选 */}
      <div className="mb-2 relative">
         <div className="flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-bold text-island-dark">
                  {timeRange === 'today' && '今日经营概况'}
                  {timeRange === 'week' && '本周经营概况'}
                  {timeRange === 'month' && '本月经营概况'}
                  {timeRange === 'all' && '累计经营概况'}
                </h1>
                <p className="text-text-secondary text-sm mt-1">
                  实时数据 · 自动更新
                </p>
             </div>
             <div className="flex gap-2">
               {(['today', 'week', 'month', 'all'] as const).map((range) => (
                 <button
                   key={range}
                   onClick={() => setTimeRange(range)}
                   className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                     timeRange === range
                       ? 'bg-island-dark text-white shadow-sm'
                       : 'bg-white/70 text-island-dark/60 hover:bg-white'
                   }`}
                 >
                   {range === 'today' && '今日'}
                   {range === 'week' && '本周'}
                   {range === 'month' && '本月'}
                   {range === 'all' && '累计'}
                 </button>
               ))}
             </div>
         </div>
      </div>

      {/* 核心数据卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={timeRange === 'today' ? '今日总营收' : timeRange === 'week' ? '本周总营收' : timeRange === 'month' ? '本月总营收' : '累计总营收'}
          value={`¥ ${formatCurrency(metrics.totalRevenue)}`}
          subValue={
            timeRange === 'today' && metrics.yesterdayRevenue > 0
              ? `比昨日${metrics.revenueGrowth >= 0 ? '增长' : '下降'} ${Math.abs(metrics.revenueGrowth).toFixed(1)}%`
              : `外卖 ${metrics.deliveryOrders} / 堂食 ${metrics.dineInOrders}`
          }
          trend={timeRange === 'today' ? (metrics.revenueGrowth >= 0 ? "up" : "down") : undefined}
          trendValue={timeRange === 'today' ? `${Math.abs(metrics.revenueGrowth).toFixed(1)}%` : undefined}
          icon={<DollarSign />}
          decoration={<Coconut className="w-24 h-24 text-island-primary" />}
          colorClass="bg-gradient-to-br from-white to-[#F0FDF4]"
        />
        <StatCard
          title={timeRange === 'today' ? '今日订单量' : timeRange === 'week' ? '本周订单量' : timeRange === 'month' ? '本月订单量' : '累计订单量'}
          value={`${metrics.totalOrders} 单`}
          subValue={`外卖 ${metrics.deliveryOrders} / 堂食 ${metrics.dineInOrders}`}
          trend={timeRange === 'today' && metrics.yesterdayOrders > 0 ? (metrics.ordersGrowth >= 0 ? "up" : "down") : undefined}
          trendValue={timeRange === 'today' && metrics.yesterdayOrders > 0 ? `${Math.abs(metrics.ordersGrowth).toFixed(1)}%` : undefined}
          icon={<ShoppingBag />}
          decoration={<PalmLeaf className="w-28 h-28 text-island-primary" />}
        />
        <StatCard
          title="平均客单价"
          value={`¥ ${formatCurrency(metrics.avgOrderValue)}`}
          subValue={`共 ${metrics.totalOrders} 单完成`}
          icon={<Users />}
          decoration={<Starfish className="w-24 h-24 text-orange-400" />}
        />
          <StatCard
            title="订单状态"
            value={`${metrics.pendingOrders} 单`}
            subValue={`完成 ${metrics.completedOrders} / 取消 ${metrics.cancelledOrders}`}
            trend={metrics.cancelledOrders > metrics.completedOrders / 10 ? "down" : "up"}
            trendValue={metrics.allOrdersCount > 0 ? `${((metrics.completedOrders / metrics.allOrdersCount) * 100).toFixed(0)}%` : '0%'}
            icon={<TrendingUp />}
            decoration={<Sun className="w-24 h-24 text-yellow-500" />}
          />
      </div>

      {/* 收款方式统计 */}
      <div className="bg-white p-5 rounded-[24px] shadow-card border border-white">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full bg-emerald-400"></div>
          <h3 className="text-sm font-bold text-island-dark">收款方式统计</h3>
          <span className="text-[10px] text-text-secondary">已完成订单</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-[#f4f9f8] p-4 border border-[#e7efec]">
            <div className="text-xs font-bold text-text-secondary">微信收款</div>
            <div className="text-xl font-bold text-island-dark font-english mt-2">
              ¥ {formatCurrency(metrics.wechatRevenue)}
            </div>
          </div>
          <div className="rounded-2xl bg-[#f4f9f8] p-4 border border-[#e7efec]">
            <div className="text-xs font-bold text-text-secondary">支付宝收款</div>
            <div className="text-xl font-bold text-island-dark font-english mt-2">
              ¥ {formatCurrency(metrics.alipayRevenue)}
            </div>
          </div>
        </div>
        {metrics.otherRevenue > 0 && (
          <div className="mt-3 text-[11px] text-text-secondary">
            其他收款：¥ {formatCurrency(metrics.otherRevenue)}
          </div>
        )}
      </div>

      {/* 主体功能区：左侧图表+实时订单，右侧热销榜 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左侧区域容器 */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 营收趋势图 */}
            <div className="bg-white p-6 rounded-[28px] shadow-card border border-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                  <PalmLeaf className="w-48 h-48 text-island-dark" />
              </div>

              <div className="flex justify-between items-center mb-8 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-island-primary"></div>
                    <h3 className="text-base font-bold text-island-dark">
                      {timeRange === 'today' ? '今日营收趋势（按小时）' : '营收走势'}
                    </h3>
                </div>
                {trendData.length > 0 && (
                  <div className="text-xs text-text-secondary">
                    峰值时段: {trendData.reduce((max, curr, idx) => curr.value > trendData[max].value ? idx : max, 0)}
                    {timeRange === 'today' ? '时' : ''}
                  </div>
                )}
              </div>

              <div className="h-48 flex items-end justify-between gap-4 relative z-10">
                {trendData.length > 0 ? (
                  trendData.map((item, i) => {
                    const isHighest = item.value === Math.max(...trendData.map(d => d.value));
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group cursor-pointer relative">
                        {/* Hover tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-island-dark text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-20">
                          ¥{formatCurrency(item.value)}
                          <div className="text-[8px] text-gray-300">{item.count} 单</div>
                        </div>
                        <div className="relative w-full flex justify-center">
                            <div
                            style={{ height: `${Math.max(item.height, 10)}px` }}
                            className={`w-full max-w-[32px] rounded-t-xl transition-all duration-500 ease-out border-b-0 border-white/50 relative overflow-hidden ${
                                isHighest
                                ? 'bg-island-dark shadow-lg shadow-island-dark/20'
                                : 'bg-island-mint/60 group-hover:bg-island-primary/60'
                            }`}
                            >
                                {/* 柱状图内部的微光效果 */}
                                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent"></div>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold font-english ${
                          isHighest ? 'text-island-dark' : 'text-gray-300'
                        }`}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm">
                    暂无数据
                  </div>
                )}
              </div>
            </div>

            {/* 实时动态 - 新增模块 */}
            <div className="bg-white p-6 rounded-[28px] shadow-card border border-white">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full bg-orange-400"></div>
                        <h3 className="text-base font-bold text-island-dark">实时动态</h3>
                        {recentActiveOrders.length > 0 && (
                          <span className="animate-pulse w-2 h-2 rounded-full bg-green-500 ml-1"></span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col">
                    {recentActiveOrders.length > 0 ? (
                      recentActiveOrders.map((order) => {
                        const getStatusText = (status: string) => {
                          if (status === 'preparing') return '制作中';
                          if (status === 'ready') return '已出餐';
                          if (status === 'delivering') return '配送中';
                          return status;
                        };

                        const getTimeAgo = (date: string) => {
                          const now = new Date();
                          const orderDate = new Date(date);
                          const diffMs = now.getTime() - orderDate.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          if (diffMins < 1) return '刚刚';
                          if (diffMins < 60) return `${diffMins}分钟前`;
                          const diffHours = Math.floor(diffMins / 60);
                          return `${diffHours}小时前`;
                        };

                        const itemsSummary = order.items.slice(0, 2).map(item => `${item.name} x${item.count}`).join(', ');
                        const firstItemImage = order.items[0]?.imageUrl || 'https://images.unsplash.com/photo-1563583769690-d28163043363?w=100&h=100&fit=crop';

                        return (
                          <LiveOrderItem
                            key={order.id}
                            img={firstItemImage}
                            name={itemsSummary}
                            status={getStatusText(order.status)}
                            time={getTimeAgo(order.createdAt || order.date)}
                          />
                        );
                      })
                    ) : (
                      <div className="text-center text-text-secondary text-sm py-8">
                        暂无进行中的订单
                      </div>
                    )}
                </div>
            </div>
        </div>

        {/* 右侧：热销排名 */}
        <div className="bg-white p-6 rounded-[28px] shadow-card border border-white flex flex-col h-full relative overflow-hidden">
            {/* 背景装饰 */}
            <div className="absolute -bottom-10 -right-10 opacity-[0.05]">
                <Sun className="w-40 h-40 text-yellow-500" />
            </div>

           <div className="flex justify-between items-center mb-6 relative z-10">
             <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-red-400"></div>
                <h3 className="font-bold text-base text-island-dark">热销排名 🔥</h3>
             </div>
             {metrics.topProducts.length > 0 && (
               <div className="text-xs text-text-secondary">
                 Top {metrics.topProducts.length}
               </div>
             )}
           </div>

           <div className="space-y-5 flex-1 relative z-10">
              {metrics.topProducts.length > 0 ? (
                metrics.topProducts.map((item, idx) => {
                  const maxCount = metrics.topProducts[0]?.count || 1;
                  const percentage = (item.count / maxCount) * 100;

                  return (
                    <div key={item.product.id || idx} className="flex items-center gap-3 group cursor-pointer">
                       <div className="relative">
                          <img
                            src={item.product.imageUrl || 'https://images.unsplash.com/photo-1563583769690-d28163043363?w=100&h=100&fit=crop'}
                            className="w-12 h-12 rounded-[14px] object-cover bg-gray-50 shadow-sm group-hover:scale-105 transition-transform duration-300"
                            alt={item.product.name}
                          />
                          {idx < 3 && (
                            <div className={`absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-white shadow-sm ${
                                idx === 0 ? 'bg-[#FF9E7D]' : (idx === 1 ? 'bg-[#FCD34D]' : 'bg-[#A7F3D0] text-island-dark')
                            }`}>
                                {idx + 1}
                            </div>
                          )}
                       </div>
                       <div className="flex-1 min-w-0">
                         <h4 className="text-sm font-bold text-island-dark truncate group-hover:text-island-primary transition-colors">
                           {item.product.name}
                         </h4>
                         <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-island-bg rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-island-primary/50 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(10, percentage)}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-text-secondary whitespace-nowrap">已售 {item.count}</p>
                         </div>
                       </div>
                       <span className="font-english font-bold text-sm text-island-dark">
                         ¥{item.product.price.toFixed(0)}
                       </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-text-secondary text-sm py-8">
                  暂无销售数据
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
    </div>
  );
};
