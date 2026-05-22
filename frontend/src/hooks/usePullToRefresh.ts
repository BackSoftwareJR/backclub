import { useRef, useState, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance in pixels to trigger refresh
  enabled?: boolean;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook per implementare il pattern "Pull to Refresh" su mobile
 */
export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions): UsePullToRefreshReturn => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isPulling = useRef<boolean>(false);
  const scrollTop = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      scrollTop.current = container.scrollTop;
      if (scrollTop.current === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;

      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      if (deltaY > 0 && scrollTop.current === 0) {
        // Prevent default scroll behavior
        e.preventDefault();
        const distance = Math.min(deltaY * 0.5, threshold * 1.5); // Damping effect
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;

      isPulling.current = false;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(threshold);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Error during refresh:', error);
        } finally {
          // Reset after a short delay
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 300);
        }
      } else {
        // Snap back
        setPullDistance(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onRefresh, threshold, pullDistance, isRefreshing]);

  return {
    isRefreshing,
    pullDistance,
    containerRef,
  };
};
