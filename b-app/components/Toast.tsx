import React from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

const toneStyles: Record<ToastTone, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-island-dark text-white',
};

export const ToastStack: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] space-y-2 w-[90%] max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-sm font-bold ${toneStyles[toast.tone]}`}
        >
          <span className="truncate">{toast.message}</span>
          <button
            type="button"
            aria-label="关闭提示"
            onClick={() => onDismiss(toast.id)}
            className="text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
