import React, { useEffect, useState, useRef } from 'react';
import {
  Power,
  LayoutDashboard,
  Store,
  ShoppingBag,
  Settings,
  MessageCircle,
  HelpCircle,
  Clock,
  FileBadge,
  Phone,
  Megaphone,
  Plus,
  X,
} from 'lucide-react';
import type { AppConfig, HelpCenterFaq } from '../types';

interface Props {
  config: AppConfig;
  onUpdate: (config: AppConfig) => Promise<void>;
}

export const ConfigPanel: React.FC<Props> = ({ config, onUpdate }) => {
  const fallbackFaqs: HelpCenterFaq[] = [
    { question: '可以用现金支付吗？', answer: '目前支持微信和支付宝扫码支付，暂不支持现金。' },
    { question: '下单后可以取消吗？', answer: '可以，请在未制作前取消，详情请联系摊主。' },
    { question: '如果找不到摊位怎么办？', answer: '点击联系人工客服或拨打商家电话获取帮助。' },
  ];

  const parseHours = (value?: string) => {
    const fallback = { start: '10:00', end: '24:00' };
    if (!value) return fallback;
    const [startRaw, endRaw] = value.split('-').map((item) => item.trim());
    const normalize = (input: string | undefined, fallbackValue: string) => {
      if (!input) return fallbackValue;
      return input === '24:00' ? '23:59' : input;
    };
    return {
      start: normalize(startRaw, fallback.start),
      end: normalize(endRaw, fallback.end),
    };
  };

  const normalizeFaqs = (value?: HelpCenterFaq[]) => {
    if (!Array.isArray(value) || value.length === 0) return fallbackFaqs;
    const normalized = value
      .map((item) => {
        if (typeof (item as HelpCenterFaq).question === 'string') {
          return {
            question: (item as HelpCenterFaq).question.trim(),
            answer: typeof (item as HelpCenterFaq).answer === 'string' ? (item as HelpCenterFaq).answer.trim() : '',
          };
        }
        return null;
      })
      .filter((item): item is HelpCenterFaq => Boolean(item && item.question));
    return normalized.length > 0 ? normalized : fallbackFaqs;
  };

  const buildHelpDraft = () => {
    const hours = parseHours(config.helpCenterHours);
    return {
      title: config.helpCenterTitle || '客服在线时间',
      hoursStart: hours.start,
      hoursEnd: hours.end,
      contactLabel: config.helpCenterContactLabel || '联系人工客服',
      contactValue: config.helpCenterContactValue || 'kefu_wechat',
      faqs: normalizeFaqs(config.helpCenterFaqs),
    };
  };

  const [helpDraft, setHelpDraft] = useState(buildHelpDraft);
  const [clientBaseUrl, setClientBaseUrl] = useState(config.clientBaseUrl || '');
  const [configStatus, setConfigStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [configMessage, setConfigMessage] = useState('');
  const statusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setHelpDraft(buildHelpDraft());
  }, [config.helpCenterTitle, config.helpCenterHours, config.helpCenterContactLabel, config.helpCenterContactValue, config.helpCenterFaqs]);

  useEffect(() => {
    setClientBaseUrl(config.clientBaseUrl || '');
  }, [config.clientBaseUrl]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        window.clearTimeout(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    };
  }, []);

  const pushConfigStatus = (status: 'saving' | 'success' | 'error', message: string) => {
    setConfigStatus(status);
    setConfigMessage(message);
    if (statusTimerRef.current) {
      window.clearTimeout(statusTimerRef.current);
    }
    if (status !== 'saving') {
      statusTimerRef.current = window.setTimeout(() => {
        setConfigStatus('idle');
        setConfigMessage('');
      }, 2400);
    }
  };

  const runConfigUpdate = async (nextConfig: AppConfig, successMessage: string) => {
    pushConfigStatus('saving', '保存中...');
    try {
      await onUpdate(nextConfig);
      pushConfigStatus('success', successMessage);
    } catch (error) {
      console.error('Failed to update config', error);
      pushConfigStatus('error', '保存失败，请重试');
    }
  };
  const toggleFeature = async (key: keyof AppConfig) => {
    const newConfig = { ...config, [key]: !config[key] };
    await runConfigUpdate(newConfig, '配置已保存');
  };

  const saveHelpCenter = async () => {
    const nextFaqs = helpDraft.faqs
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question.length > 0);
    await runConfigUpdate({
      ...config,
      helpCenterTitle: helpDraft.title.trim() || '客服在线时间',
      helpCenterHours: `${helpDraft.hoursStart || '10:00'} - ${helpDraft.hoursEnd || '23:59'}`,
      helpCenterContactLabel: helpDraft.contactLabel.trim() || '联系人工客服',
      helpCenterContactValue: helpDraft.contactValue.trim() || 'kefu_wechat',
      helpCenterFaqs: nextFaqs.length > 0 ? nextFaqs : fallbackFaqs,
    }, '客服配置已保存');
  };

  const saveClientBaseUrl = async () => {
    await runConfigUpdate({
      ...config,
      clientBaseUrl: clientBaseUrl.trim(),
    }, '地址已保存');
  };

  const updateFaq = (index: number, field: keyof HelpCenterFaq, value: string) => {
    setHelpDraft((prev) => {
      const nextFaqs = [...prev.faqs];
      nextFaqs[index] = { ...nextFaqs[index], [field]: value };
      return { ...prev, faqs: nextFaqs };
    });
  };

  const addFaq = () => {
    setHelpDraft((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }],
    }));
  };

  const removeFaq = (index: number) => {
    setHelpDraft((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {configStatus !== 'idle' && (
        <div className="flex justify-end sticky top-2 z-10">
          <span
            className={`text-xs font-semibold ${
              configStatus === 'success'
                ? 'text-emerald-600'
                : configStatus === 'error'
                  ? 'text-red-500'
                  : 'text-slate-500'
            }`}
          >
            {configMessage}
          </span>
        </div>
      )}
      {/* 系统维护模式 */}
      <div
        className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
          config.systemMaintenance
            ? 'bg-red-50 border-red-200'
            : 'bg-white border-white shadow-sm'
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                config.systemMaintenance
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Power size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1 text-slate-800">
                系统维护模式 (Kill Switch)
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                开启后，所有商家端将进入锁定状态，无法接单。用于紧急系统维护。
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleFeature('systemMaintenance')}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative ${
              config.systemMaintenance ? 'bg-red-500' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                config.systemMaintenance ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </button>
        </div>
      </div>

      {/* B端商家后台权限管理 */}
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-8 mb-4">
        商家后台权限管理
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            key: 'enableStats',
            label: '经营概况',
            icon: LayoutDashboard,
            desc: '数据看板与流水',
          },
          {
            key: 'enableProducts',
            label: '商品管理',
            icon: Store,
            desc: '菜单编辑与库存',
          },
          {
            key: 'enableOrders',
            label: '订单处理',
            icon: ShoppingBag,
            desc: '接单与核销流程',
          },
          {
            key: 'enableSettings',
            label: '店铺设置',
            icon: Settings,
            desc: '基本信息修改',
          },
        ].map((feature) => (
          <div
            key={feature.key}
            className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between h-40"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                <feature.icon size={20} />
              </div>
              <button
                onClick={() => toggleFeature(feature.key as keyof AppConfig)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 relative ${
                  config[feature.key as keyof AppConfig] ? 'bg-green-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                    config[feature.key as keyof AppConfig] ? 'translate-x-4' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>
            <div>
              <h4 className="font-bold text-slate-800">{feature.label}</h4>
              <p className="text-xs text-slate-400 mt-1">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* C端小程序前台显示控制 */}
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-8 mb-4">
        C端小程序显示控制
      </h3>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <MessageCircle size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">C端基础地址</h4>
            <p className="text-xs text-slate-400">用于生成摊位二维码跳转地址</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={clientBaseUrl}
            onChange={(event) => setClientBaseUrl(event.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="例如: https://your-domain.com"
          />
          <button
            onClick={saveClientBaseUrl}
            className="px-5 py-2 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            保存地址
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { key: 'enableClientReviews', label: '评论区', icon: MessageCircle },
          { key: 'showBusinessHours', label: '营业时间', icon: Clock },
          { key: 'showQualifications', label: '商家资质', icon: FileBadge },
          { key: 'showContactPhone', label: '联系电话', icon: Phone },
          { key: 'showMerchantSlogan', label: '商家寄语', icon: Megaphone },
        ].map((feature) => (
          <div
            key={feature.key}
            className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  config[feature.key as keyof AppConfig]
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'bg-slate-50 text-slate-400'
                }`}
              >
                <feature.icon size={16} />
              </div>
              <span
                className={`text-sm font-bold ${
                  config[feature.key as keyof AppConfig] ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {feature.label}
              </span>
            </div>
            <button
              onClick={() => toggleFeature(feature.key as keyof AppConfig)}
              className={`w-8 h-5 rounded-full p-0.5 transition-colors duration-300 relative ${
                config[feature.key as keyof AppConfig] ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                  config[feature.key as keyof AppConfig] ? 'translate-x-3' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <HelpCircle size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">帮助与客服内容</h4>
            <p className="text-xs text-slate-400">用于C端帮助中心展示，修改后即时生效</p>
          </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">标题文案</label>
              <input
                value={helpDraft.title}
                onChange={(event) => setHelpDraft((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="例：客服在线时间"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">客服时间</label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={helpDraft.hoursStart}
                  onChange={(event) =>
                    setHelpDraft((prev) => ({ ...prev, hoursStart: event.target.value }))
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <span className="text-xs text-slate-400">至</span>
                <input
                  type="time"
                  value={helpDraft.hoursEnd}
                  onChange={(event) =>
                    setHelpDraft((prev) => ({ ...prev, hoursEnd: event.target.value }))
                  }
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">结束时间如需填写 24:00，可用 23:59 代替。</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">按钮文案</label>
              <input
                value={helpDraft.contactLabel}
                onChange={(event) => setHelpDraft((prev) => ({ ...prev, contactLabel: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="例：联系人工客服"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">客服微信号</label>
              <input
                value={helpDraft.contactValue}
                onChange={(event) => setHelpDraft((prev) => ({ ...prev, contactValue: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="例：kefu_wechat"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-600">常见问题卡片（Q&A）</label>
              <button
                onClick={addFaq}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={14} /> 新增问题
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {helpDraft.faqs.map((faq, index) => (
                <div key={`faq-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500">问题 {index + 1}</span>
                    <button
                      onClick={() => removeFaq(index)}
                      className="text-slate-400 hover:text-slate-600"
                      title="删除"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    value={faq.question}
                    onChange={(event) => updateFaq(index, 'question', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="输入问题"
                  />
                  <textarea
                    value={faq.answer}
                    onChange={(event) => updateFaq(index, 'answer', event.target.value)}
                    rows={3}
                    className="w-full mt-3 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="输入答案"
                  />
                </div>
              ))}
            </div>
          </div>

        <div className="flex justify-end">
          <button
            onClick={saveHelpCenter}
            className="px-5 py-2 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            保存帮助中心
          </button>
        </div>
      </div>

      {/* 说明文档 */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mt-8">
        <h4 className="text-sm font-bold text-blue-800 mb-2">功能说明</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>系统维护模式</strong>：开启后所有商家端将无法操作，用于紧急维护</li>
          <li>• <strong>商家后台权限</strong>：控制B端商家后台可用的功能模块</li>
          <li>• <strong>C端显示控制</strong>：控制客户端小程序显示的内容模块</li>
          <li>• <strong>实时生效</strong>：所有配置修改后立即生效，无需重启服务</li>
        </ul>
      </div>
    </div>
  );
};
