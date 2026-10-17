import React, { useRef, useState } from 'react';

interface PullToRefreshProps {
  onRefresh?: () => Promise<void> | void;
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
  className?: string;
  children: React.ReactNode;
  threshold?: number;
  maxPull?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  onScroll,
  containerRef,
  className,
  children,
  threshold = 64,
  maxPull = 96,
}) => {
  const localRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node;
    if (containerRef) {
      containerRef.current = node;
    }
  };

  const beginPull = (clientY: number) => {
    const container = localRef.current;
    if (!container || container.scrollTop > 0 || isRefreshing || !onRefresh) return;
    startYRef.current = clientY;
  };

  const updatePull = (clientY: number, event: React.TouchEvent<HTMLDivElement>) => {
    if (startYRef.current === null || isRefreshing || !onRefresh) return;
    const distance = clientY - startYRef.current;
    if (distance <= 0) return;
    event.preventDefault();
    setPullDistance(Math.min(distance, maxPull));
  };

  const finishPull = () => {
    if (startYRef.current === null) return;
    const shouldRefresh = pullDistance >= threshold;
    startYRef.current = null;

    if (!shouldRefresh || !onRefresh) {
      setPullDistance(0);
      return;
    }

    setIsRefreshing(true);
    Promise.resolve(onRefresh())
      .catch(() => undefined)
      .finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
  };

  const label = isRefreshing
    ? '刷新中...'
    : pullDistance >= threshold
      ? '松开刷新'
      : '下拉刷新';

  return (
    <div
      ref={setRefs}
      className={className}
      onScroll={onScroll}
      onTouchStart={(event) => beginPull(event.touches[0].clientY)}
      onTouchMove={(event) => updatePull(event.touches[0].clientY, event)}
      onTouchEnd={finishPull}
      onTouchCancel={finishPull}
    >
      <div
        className="flex items-center justify-center text-[11px] font-heavy text-[#193b35]/50"
        style={{ height: pullDistance }}
      >
        {pullDistance > 0 || isRefreshing ? label : null}
      </div>
      {children}
    </div>
  );
};
