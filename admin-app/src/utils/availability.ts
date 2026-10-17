// 营业时间工具函数（从C端复制）

interface TimeRange {
  start: number; // minutes from midnight
  end: number;   // minutes from midnight
}

const parseBusinessHours = (hours?: string): TimeRange | null => {
  if (!hours) return null;
  const match = hours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, startH, startM, endH, endM] = match;
  return {
    start: parseInt(startH) * 60 + parseInt(startM),
    end: parseInt(endH) * 60 + parseInt(endM),
  };
};

export const isVendorClosed = (
  businessHours?: string,
  isOpen: boolean = true,
  now: Date = new Date()
): boolean => {
  if (!isOpen) return true;
  const range = parseBusinessHours(businessHours);
  if (!range) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (range.start <= range.end) {
    return nowMinutes < range.start || nowMinutes > range.end;
  }
  return nowMinutes < range.start && nowMinutes > range.end;
};
