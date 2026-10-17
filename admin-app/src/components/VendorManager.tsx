import React, { useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Ban,
  Unlock,
  QrCode,
  CheckCircle,
  Circle,
  CircleDot,
  X,
  Download,
  Trash2,
  TrendingUp,
  BarChart3,
  ShoppingBag,
} from 'lucide-react';
import type { Vendor, CreateVendorRequest, Order } from '../types';
import { isVendorClosed } from '../utils/availability';

interface Props {
  vendors: Vendor[];
  orders: Order[];
  deliveryUrgeCounts?: Record<string, number>;
  onCreateVendor: (vendor: CreateVendorRequest) => Promise<void>;
  onUpdateStatus: (id: string, status: Vendor['status']) => Promise<void>;
  onGenerateQRCode: (id: string) => Promise<{ qrDataUrl: string; url: string }>;
  onDeleteVendor: (id: string) => Promise<void>;
}

type DialogState = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
};

export const VendorManager: React.FC<Props> = ({
  vendors,
  orders,
  deliveryUrgeCounts = {},
  onCreateVendor,
  onUpdateStatus,
  onGenerateQRCode,
  onDeleteVendor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<{ qrDataUrl: string; url: string; vendorName: string } | null>(null);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [kpiRange, setKpiRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: '确认',
    cancelLabel: '取消',
    showCancel: true,
  });

  // 搜索过滤
  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOrderAmount = (order: Order) =>
    typeof order.finalTotal === 'number' ? order.finalTotal : order.totalPrice || 0;

  const parseOrderDate = (order: Order): Date | null => {
    const raw = order.createdAt || order.date;
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const revenueByVendor = orders.reduce((acc, order) => {
    if (order.status !== 'completed') return acc;
    const current = acc.get(order.vendorId) || 0;
    acc.set(order.vendorId, current + getOrderAmount(order));
    return acc;
  }, new Map<string, number>());

  const activeVendor = vendors.find((vendor) => vendor.id === activeVendorId) || null;
  const activeVendorOrders = activeVendorId
    ? orders.filter((order) => order.vendorId === activeVendorId)
    : [];

  const getFilteredOrders = (sourceOrders: Order[], range: typeof kpiRange) => {
    if (range === 'all') return sourceOrders;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return sourceOrders.filter((order) => {
      const orderDate = parseOrderDate(order);
      if (!orderDate) return false;
      if (range === 'today') return orderDate >= startOfToday;
      if (range === 'week') return orderDate >= startOfWeek;
      if (range === 'month') return orderDate >= startOfMonth;
      return true;
    });
  };

  const filteredVendorOrders = getFilteredOrders(activeVendorOrders, kpiRange);
  const completedOrders = filteredVendorOrders.filter((order) => order.status === 'completed');
  const totalRevenue = completedOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
  const totalOrders = completedOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const deliveryOrders = completedOrders.filter((order) => order.orderType === 'delivery').length;
  const dineInOrders = completedOrders.filter((order) => order.orderType === 'dine-in').length;
  const pendingOrders = filteredVendorOrders.filter((order) =>
    ['pending-payment', 'pending-confirmation', 'preparing'].includes(order.status)
  ).length;
  const cancelledOrders = filteredVendorOrders.filter((order) => order.status === 'cancelled').length;
  const allOrdersCount = filteredVendorOrders.length;

  const now = new Date();
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayCompleted = activeVendorOrders.filter((order) => {
    if (order.status !== 'completed') return false;
    const orderDate = parseOrderDate(order);
    if (!orderDate) return false;
    return orderDate >= startOfYesterday && orderDate < startOfToday;
  });
  const yesterdayRevenue = yesterdayCompleted.reduce((sum, order) => sum + getOrderAmount(order), 0);
  const yesterdayOrders = yesterdayCompleted.length;
  const revenueGrowth = yesterdayRevenue > 0 ? ((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
  const ordersGrowth = yesterdayOrders > 0 ? ((totalOrders - yesterdayOrders) / yesterdayOrders) * 100 : 0;

  const productSalesMap = new Map<string, { name: string; imageUrl?: string; count: number; revenue: number }>();
  completedOrders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.name;
      const current = productSalesMap.get(key) || {
        name: item.name,
        imageUrl: item.imageUrl,
        count: 0,
        revenue: 0,
      };
      current.count += item.count;
      current.revenue += item.price * item.count;
      productSalesMap.set(key, current);
    });
  });
  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const trendData = (() => {
    if (kpiRange === 'today') {
      const hourBuckets = Array.from({ length: 24 }, (_, i) => ({ hour: i, revenue: 0, count: 0 }));
      completedOrders.forEach((order) => {
        const orderDate = parseOrderDate(order);
        if (!orderDate) return;
        const hour = orderDate.getHours();
        hourBuckets[hour].revenue += getOrderAmount(order);
        hourBuckets[hour].count += 1;
      });
      return hourBuckets.map((bucket) => ({
        label: `${bucket.hour}`,
        value: bucket.revenue,
        count: bucket.count,
      }));
    }

    const dayBuckets = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return { date, revenue: 0, count: 0 };
    });

    completedOrders.forEach((order) => {
      const orderDate = parseOrderDate(order);
      if (!orderDate) return;
      const dayIndex = dayBuckets.findIndex((bucket) => bucket.date.toDateString() === orderDate.toDateString());
      if (dayIndex >= 0) {
        dayBuckets[dayIndex].revenue += getOrderAmount(order);
        dayBuckets[dayIndex].count += 1;
      }
    });

    return dayBuckets.map((bucket) => ({
      label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][bucket.date.getDay()],
      value: bucket.revenue,
      count: bucket.count,
    }));
  })();

  const maxTrendValue = Math.max(1, ...trendData.map((item) => item.value));

  const formatCurrency = (value: number) =>
    value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const openConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = '确认',
    cancelLabel = '取消'
  ) => {
    setDialog({
      open: true,
      title,
      message,
      confirmLabel,
      cancelLabel,
      showCancel: true,
      onConfirm,
    });
  };

  const openAlert = (title: string, message: string, confirmLabel = '知道了') => {
    setDialog({
      open: true,
      title,
      message,
      confirmLabel,
      cancelLabel: '取消',
      showCancel: false,
      onConfirm: undefined,
    });
  };

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, open: false, onConfirm: undefined }));
  };

  const handleDialogConfirm = () => {
    const action = dialog.onConfirm;
    closeDialog();
    action?.();
  };

  // 生成二维码
  const handleGenerateQR = async (vendor: Vendor) => {
    try {
      const result = await onGenerateQRCode(vendor.id);
      setQrData({ ...result, vendorName: vendor.name });
      setShowQRModal(true);
    } catch (error) {
      openAlert('生成二维码失败', error instanceof Error ? error.message : '生成二维码失败');
    }
  };

  // 下载二维码
  const downloadQRCode = () => {
    if (!qrData) return;
    const link = document.createElement('a');
    link.download = `${qrData.vendorName}-二维码.png`;
    link.href = qrData.qrDataUrl;
    link.click();
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    openConfirm('删除商户', `确认删除商户「${vendor.name}」吗？删除后将无法恢复。`, async () => {
      await onDeleteVendor(vendor.id);
    }, '确认删除');
  };

  const handleOpenKpi = (vendorId: string) => {
    setActiveVendorId(vendorId);
    setKpiRange('today');
  };

  return (
    <div className="animate-fade-in">
      {/* 工具栏 */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="搜索商户名称、摊主、登录码..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-indigo-500 transition-colors w-80"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-md shadow-indigo-200"
        >
          <Plus size={18} /> 开通新商户
        </button>
      </div>

      {/* 商户列表 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                商户信息
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                登录码/密码
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                摊主/联系方式
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                海滩配送催促
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                总营收
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                创建时间
              </th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    暂无商户数据
                  </td>
                </tr>
            ) : (
              filteredVendors.map((vendor) => {
                const vendorRevenue = revenueByVendor.get(vendor.id) || 0;
                return (
                <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={vendor.imageUrl || 'https://via.placeholder.com/40'}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-200"
                        alt={vendor.name}
                      />
                      <div>
                        <div className="text-sm font-bold text-slate-800">{vendor.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin size={10} /> {vendor.location}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">登录码:</span>
                        <span className="font-english font-bold text-indigo-600 text-sm">
                          {vendor.code}
                        </span>
                      </div>
                      {vendor.password && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">密码:</span>
                          <span className="font-english font-medium text-slate-700 text-sm bg-slate-100 px-2 py-0.5 rounded">
                            {vendor.password}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700">
                      {vendor.ownerName || '-'}
                    </div>
                    <div className="text-xs text-slate-400 font-english">
                      {vendor.phone || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                          vendor.status === 'active'
                            ? 'bg-green-50 text-green-600'
                            : vendor.status === 'pending'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            vendor.status === 'active'
                              ? 'bg-green-500'
                              : vendor.status === 'pending'
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                          }`}
                        ></span>
                        {vendor.status === 'active'
                          ? '激活'
                          : vendor.status === 'pending'
                          ? '待审核'
                          : '已封禁'}
                      </span>
                      {vendor.status === 'active' && (
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                              !isVendorClosed(vendor.businessHours, vendor.isOpen)
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {!isVendorClosed(vendor.businessHours, vendor.isOpen) ? (
                              <>
                                <CircleDot size={12} className="text-blue-600" />
                                营业中
                              </>
                            ) : (
                              <>
                                <Circle size={12} className="text-slate-500" />
                                已打烊
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-english font-bold text-slate-700">
                      {deliveryUrgeCounts[vendor.id] ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-english font-bold text-slate-700">
                      ¥{vendorRevenue.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500">
                      {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      }) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenKpi(vendor.id)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="查看商户KPI"
                      >
                        <TrendingUp size={16} />
                      </button>
                      <button
                        onClick={() => handleGenerateQR(vendor)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="生成二维码"
                      >
                        <QrCode size={16} />
                      </button>
                        {vendor.status === 'active' || vendor.status === 'pending' ? (
                          <button
                            onClick={() => onUpdateStatus(vendor.id, 'banned')}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="封禁商户"
                          >
                            <Ban size={16} />
                          </button>
                        ) : (
                        <button
                          onClick={() => onUpdateStatus(vendor.id, 'active')}
                          className="p-2 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                            title="解封商户"
                          >
                            <Unlock size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteVendor(vendor)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除商户"
                        >
                          <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>

      {activeVendor && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setActiveVendorId(null)}
          ></div>
          <div className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">商户经营概况</div>
                <div className="text-lg font-bold text-slate-800 mt-1">{activeVendor.name}</div>
                <div className="text-xs text-slate-400 mt-1">{activeVendor.location}</div>
              </div>
              <button
                onClick={() => setActiveVendorId(null)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                aria-label="关闭"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-4 flex gap-2">
              {(['today', 'week', 'month', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setKpiRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    kpiRange === range
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {range === 'today' && '今日'}
                  {range === 'week' && '本周'}
                  {range === 'month' && '本月'}
                  {range === 'all' && '累计'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <BarChart3 size={18} />
                    </div>
                    {kpiRange === 'today' && yesterdayRevenue > 0 && (
                      <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${revenueGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {revenueGrowth >= 0 ? '+' : '-'}{Math.abs(revenueGrowth).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-bold">总营收</div>
                  <div className="text-2xl font-black text-slate-800 font-english mt-1">¥{formatCurrency(totalRevenue)}</div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    {kpiRange === 'today' && yesterdayRevenue > 0
                      ? `昨日 ¥${formatCurrency(yesterdayRevenue)}`
                      : `外卖 ${deliveryOrders} / 堂食 ${dineInOrders}`}
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <ShoppingBag size={18} />
                    </div>
                    {kpiRange === 'today' && yesterdayOrders > 0 && (
                      <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${ordersGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {ordersGrowth >= 0 ? '+' : '-'}{Math.abs(ordersGrowth).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-bold">完成订单</div>
                  <div className="text-2xl font-black text-slate-800 font-english mt-1">{totalOrders}</div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    外卖 {deliveryOrders} / 堂食 {dineInOrders}
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 font-bold">平均客单价</div>
                  <div className="text-2xl font-black text-slate-800 font-english mt-1">¥{formatCurrency(avgOrderValue)}</div>
                  <div className="text-[11px] text-slate-400 mt-2">共 {totalOrders} 单完成</div>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <ShoppingBag size={18} />
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 font-bold">订单状态</div>
                  <div className="text-2xl font-black text-slate-800 font-english mt-1">{pendingOrders}</div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    完成 {totalOrders} / 取消 {cancelledOrders}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
                  <BarChart3 size={16} className="text-indigo-500" />
                  营收趋势
                </div>
                {trendData.length === 0 ? (
                  <div className="text-xs text-slate-400 py-6 text-center">暂无数据</div>
                ) : (
                  <div className="h-28 flex items-end gap-2">
                    {trendData.map((item, idx) => (
                      <div key={`${item.label}-${idx}`} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end justify-center h-20">
                          <div
                            className="w-4 rounded-t-lg bg-indigo-500/30"
                            style={{ height: `${Math.max(10, (item.value / maxTrendValue) * 100)}%` }}
                          ></div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold">{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
                  <ShoppingBag size={16} className="text-emerald-500" />
                  热销排行
                </div>
                {topProducts.length === 0 ? (
                  <div className="text-xs text-slate-400 py-6 text-center">暂无销售数据</div>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} />
                          ) : (
                            <div className="w-full h-full bg-slate-200"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-700 truncate">{item.name}</div>
                          <div className="text-[11px] text-slate-400">已售 {item.count}</div>
                        </div>
                        <div className="text-sm font-english font-bold text-slate-700">¥{formatCurrency(item.revenue)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-400">
                当前区间订单数：{allOrdersCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建商户弹窗 */}
      {showCreateModal && (
        <CreateVendorModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (data) => {
            await onCreateVendor(data);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* 二维码展示弹窗 */}
      {showQRModal && qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-scale-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">商户二维码</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-4">{qrData.vendorName}</p>
              <img
                src={qrData.qrDataUrl}
                alt="商户二维码"
                className="w-64 h-64 mx-auto rounded-xl border border-slate-200"
              />
              <p className="text-xs text-slate-400 mt-4 break-all">{qrData.url}</p>
              <button
                onClick={downloadQRCode}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
              >
                <Download size={18} /> 下载二维码
              </button>
            </div>
          </div>
        </div>
      )}

      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDialog} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-white/60">
            <div className="text-xs font-black tracking-[0.3em] uppercase text-slate-400">Notice</div>
            <h3 className="text-lg font-bold text-slate-800 mt-2">{dialog.title}</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed whitespace-pre-line">
              {dialog.message}
            </p>
            <div className="mt-5 flex items-center gap-3">
              {dialog.showCancel !== false && (
                <button
                  type="button"
                  onClick={closeDialog}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold bg-white hover:bg-slate-50 transition-colors"
                >
                  {dialog.cancelLabel || '取消'}
                </button>
              )}
              <button
                type="button"
                onClick={handleDialogConfirm}
                className="flex-1 h-11 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-[4px_4px_0px_rgba(67,56,202,0.25)] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(67,56,202,0.25)] transition-all"
              >
                {dialog.confirmLabel || '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 创建商户表单弹窗
const CreateVendorModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: CreateVendorRequest) => Promise<void>;
}> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateVendorRequest>({
    code: '',
    password: '',
    name: '',
    category: '烧烤',
    location: '',
    ownerName: '',
    phone: '',
    imageUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.code || !formData.password || !formData.name || !formData.location) {
      setError('请填写所有必填项');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">开通新商户</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                登录码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="例如: 1001"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                初始密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="商户首次登录密码"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              商户名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: 大飞海鲜烧烤"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">分类</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                disabled={loading}
              >
                <option value="烧烤">烧烤</option>
                <option value="饮品">饮品</option>
                <option value="正餐">正餐</option>
                <option value="甜品">甜品</option>
                <option value="小吃">小吃</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="例如: 后海村沙滩 3号"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">摊主姓名</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="例如: 大飞哥"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">联系电话</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="演示号码: 00000000000"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">封面图URL</label>
            <input
              type="text"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="可选，留空使用默认图"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? '创建中...' : <><CheckCircle size={18} /> 确认开通</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
