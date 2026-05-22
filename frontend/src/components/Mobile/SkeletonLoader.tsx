import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'tile' | 'text' | 'avatar' | 'kpi-tile' | 'action-row' | 'page-header' | 'toolbar' | 'chart-block';
  count?: number;
  className?: string;
}

/** Theme-aware skeleton: uses CSS vars (--ios-*) so dark/light mode work via data-theme */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = 'card',
  count = 1,
  className = '',
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`skeleton-card skeleton-bg ${className}`}>
            <div className="skeleton-card-inner">
              <div className="skeleton-avatar skeleton-pulse-fill" />
              <div className="skeleton-text-group">
                <div className="skeleton-line skeleton-pulse-fill w-3/4" />
                <div className="skeleton-line skeleton-pulse-fill w-1/2 short" />
              </div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className={`skeleton-list skeleton-bg ${className}`}>
            <div className="skeleton-list-inner">
              <div className="skeleton-line skeleton-pulse-fill w-full" />
              <div className="skeleton-line skeleton-pulse-fill w-5/6" />
              <div className="skeleton-line skeleton-pulse-fill w-4/6" />
            </div>
          </div>
        );

      case 'tile':
        return (
          <div className={`skeleton-tile skeleton-bg ${className}`}>
            <div className="skeleton-tile-inner">
              <div className="skeleton-block skeleton-pulse-fill w-1/2 tall" />
              <div className="skeleton-block skeleton-pulse-fill w-3/4 value" />
              <div className="skeleton-block skeleton-pulse-fill w-1/3 short" />
            </div>
          </div>
        );

      case 'kpi-tile':
        return (
          <div className={`skeleton-kpi-tile skeleton-bg ${className}`}>
            <div className="skeleton-kpi-top">
              <div className="skeleton-kpi-icon skeleton-pulse-fill" />
              <div className="skeleton-kpi-value skeleton-pulse-fill" />
            </div>
            <div className="skeleton-kpi-label skeleton-pulse-fill" />
          </div>
        );

      case 'action-row':
        return (
          <div className={`skeleton-action-row skeleton-bg ${className}`}>
            <div className="skeleton-action-icon skeleton-pulse-fill" />
            <div className="skeleton-action-text skeleton-pulse-fill" />
            <div className="skeleton-action-chevron skeleton-pulse-fill" />
          </div>
        );

      case 'page-header':
        return (
          <div className={`skeleton-page-header ${className}`}>
            <div className="skeleton-page-header-left">
              <div className="skeleton-line skeleton-pulse-fill w-3/4 title" />
              <div className="skeleton-line skeleton-pulse-fill w-1/2 short" />
            </div>
            <div className="skeleton-page-header-btn skeleton-pulse-fill" />
          </div>
        );

      case 'toolbar':
        return (
          <div className={`skeleton-toolbar ${className}`}>
            <div className="skeleton-toolbar-search skeleton-pulse-fill" />
            <div className="skeleton-toolbar-pills">
              <div className="skeleton-pill skeleton-pulse-fill" />
              <div className="skeleton-pill skeleton-pulse-fill" />
            </div>
          </div>
        );

      case 'chart-block':
        return (
          <div className={`skeleton-chart-block skeleton-bg ${className}`}>
            <div className="skeleton-chart-header">
              <div className="skeleton-line skeleton-pulse-fill w-1/3 short" />
              <div className="skeleton-line skeleton-pulse-fill w-1/4 short" />
            </div>
            <div className="skeleton-chart-area skeleton-pulse-fill" />
          </div>
        );

      case 'text':
        return (
          <div className={`skeleton-text-wrap ${className}`}>
            <div className="skeleton-line skeleton-pulse-fill w-full" />
            <div className="skeleton-line skeleton-pulse-fill w-5/6" />
          </div>
        );

      case 'avatar':
        return (
          <div className={`skeleton-avatar skeleton-pulse-fill ${className}`} />
        );

      default:
        return null;
    }
  };

  if (count > 1) {
    return (
      <div className="skeleton-group">
        {Array.from({ length: count }).map((_, index) => (
          <React.Fragment key={index}>{renderSkeleton()}</React.Fragment>
        ))}
      </div>
    );
  }

  return renderSkeleton();
};

export default SkeletonLoader;
