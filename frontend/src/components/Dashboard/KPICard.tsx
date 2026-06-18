import React from 'react';
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './KPICard.css';

interface KPICardProps {
    title: string;
    value: string | number;
    delta?: number;
    deltaLabel?: string;
    icon?: ReactNode;
    accentColor?: string;
    loading?: boolean;
    onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    delta,
    deltaLabel,
    icon,
    accentColor = '#0A84FF',
    loading = false,
    onClick,
}) => {
    if (loading) {
        return <div className="kpi-card-skeleton" />;
    }

    const isPositive = delta !== undefined && delta >= 0;
    const deltaColor = delta === undefined ? undefined : isPositive ? '#34C759' : '#FF453A';

    return (
        <div
            className={`kpi-card${onClick ? ' kpi-card-clickable' : ''}`}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <div className="kpi-card-header">
                <div className="kpi-card-label-row">
                    <span className="kpi-dot" style={{ background: accentColor }} />
                    <span className="kpi-card-label">{title}</span>
                </div>
                {icon && <span className="kpi-card-icon">{icon}</span>}
            </div>
            <div className="kpi-card-value">{value}</div>
            {delta !== undefined && (
                <div className="kpi-card-delta">
                    {isPositive ? (
                        <TrendingUp size={11} style={{ color: deltaColor, flexShrink: 0 }} />
                    ) : (
                        <TrendingDown size={11} style={{ color: deltaColor, flexShrink: 0 }} />
                    )}
                    <span className={isPositive ? 'kpi-delta-positive' : 'kpi-delta-negative'}>
                        {isPositive ? '+' : ''}{delta.toFixed(1)}%
                    </span>
                    {deltaLabel && <span className="kpi-delta-label">{deltaLabel}</span>}
                </div>
            )}
        </div>
    );
};

export default KPICard;
