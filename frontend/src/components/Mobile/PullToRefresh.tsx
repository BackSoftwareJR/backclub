import React from 'react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useTheme } from '../../context/ThemeContext';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  enabled?: boolean;
  threshold?: number;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  enabled = true,
  threshold = 80,
}) => {
  const { theme } = useTheme();
  const { isRefreshing, pullDistance, containerRef } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled,
  });

  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const shouldShowIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto">
      {/* Pull to Refresh Indicator */}
      {shouldShowIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 transition-opacity"
          style={{
            height: `${Math.min(pullDistance, threshold * 1.5)}px`,
            opacity: shouldShowIndicator ? 1 : 0,
            transform: `translateY(${Math.min(pullDistance - threshold, 0)}px)`,
          }}
        >
          <div className="flex flex-col items-center space-y-2">
            <div
              className={`w-10 h-10 rounded-full border-4 ${
                theme === 'dark'
                  ? 'border-blue-400 border-t-transparent'
                  : 'border-blue-600 border-t-transparent'
              } transition-transform`}
              style={{
                transform: isRefreshing
                  ? 'rotate(360deg)'
                  : `rotate(${progress * 3.6}deg)`,
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span
              className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              {isRefreshing ? 'Aggiornamento...' : 'Trascina per aggiornare'}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          transform: `translateY(${Math.max(0, pullDistance)}px)`,
          transition: isRefreshing ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default PullToRefresh;
