import React from 'react';
import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import './KPICard.css';

interface KPIStat {
    label: string;
    value: string;
    trend?: string;
    trendDirection?: 'up' | 'down';
}

interface KPICardProps {
    title: string;
    icon: ReactNode;
    value?: string | number;
    stats?: KPIStat[];
    subtitle?: string;
    color: 'emerald' | 'blue' | 'purple' | 'orange' | 'red';
    onClick?: () => void;
}

const KPICard: React.FC<KPICardProps> = ({
    title,
    icon,
    value,
    stats,
    subtitle,
    color,
    onClick
}) => {
    return (
        <button
            className={`kpi-card glass-card kpi-${color} ${onClick ? 'clickable' : ''}`}
            onClick={onClick}
            disabled={!onClick}
        >
            <div className="kpi-header">
                <div className={`kpi-icon kpi-icon-${color}`}>
                    {icon}
                </div>
                <h3 className="kpi-title">{title}</h3>
            </div>

            <div className="kpi-content">
                {value !== undefined && (
                    <div className="kpi-main-value">
                        {value}
                    </div>
                )}

                {subtitle && (
                    <div className="kpi-subtitle">{subtitle}</div>
                )}

                {stats && stats.length > 0 && (
                    <div className="kpi-stats">
                        {stats.map((stat, index) => (
                            <div key={index} className="kpi-stat-item">
                                <div className="kpi-stat-label">{stat.label}</div>
                                <div className="kpi-stat-value-row">
                                    <span className="kpi-stat-value">{stat.value}</span>
                                    {stat.trend && (
                                        <span className={`kpi-trend kpi-trend-${stat.trendDirection || 'up'}`}>
                                            {stat.trendDirection === 'down' ? (
                                                <TrendingDown size={14} />
                                            ) : (
                                                <TrendingUp size={14} />
                                            )}
                                            {stat.trend}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </button>
    );
};

export default KPICard;
