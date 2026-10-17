import React from 'react';

type Variant = 'loading' | 'empty' | 'error';

interface StatePanelProps {
  variant: Variant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const copyMap: Record<Variant, { title: string; description: string; actionLabel?: string }> = {
  loading: {
    title: '加载中',
    description: '正在准备海岛风味的精选内容',
  },
  empty: {
    title: '暂无数据',
    description: '等风来，我们再一起去海边寻味',
  },
  error: {
    title: '网络异常',
    description: '请检查连接，或稍后再试',
    actionLabel: '重试',
  },
};

const decodeUnicode = (value: string) => {
  if (!value.includes('\\u')) return value;
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_match, code) =>
    String.fromCharCode(parseInt(code, 16))
  );
};

export const StatePanel: React.FC<StatePanelProps> = ({
  variant,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const copy = copyMap[variant];
  const panelTitle = decodeUnicode(title || copy.title);
  const panelDescription = decodeUnicode(description || copy.description);
  const rawAction = actionLabel ?? copy.actionLabel;
  const panelAction = rawAction ? decodeUnicode(rawAction) : undefined;
  const role = variant === 'error' ? 'alert' : 'status';
  const live = variant === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role={role}
      aria-live={live}
      aria-busy={variant === 'loading'}
      className="bg-white/85 backdrop-blur-sm border border-[#cce8e4] rounded-[24px] p-6 text-center shadow-sm"
    >
      <div className="w-12 h-12 rounded-full bg-[#e8f5f2] mx-auto flex items-center justify-center">
        {variant === 'loading' ? (
          <div className="w-6 h-6 rounded-full border-2 border-[#8ed6d6] border-t-transparent animate-spin" />
        ) : (
          <div className="w-3 h-3 rounded-full bg-[#8ed6d6]" />
        )}
      </div>
      <h3 className="mt-4 text-lg font-heavy text-[#3a6b63]">{panelTitle}</h3>
      <p className="mt-2 text-xs text-[#5f8781] font-medium leading-relaxed">{panelDescription}</p>
      {panelAction && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center justify-center h-10 px-5 rounded-full bg-[#cce8e4] text-[#3a6b63] text-xs font-heavy shadow-[0_6px_16px_rgba(204,232,228,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ed6d6] focus-visible:ring-offset-2"
        >
          {panelAction}
        </button>
      )}
    </div>
  );
};

