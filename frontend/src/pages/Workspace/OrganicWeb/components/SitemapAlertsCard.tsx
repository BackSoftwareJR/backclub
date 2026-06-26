import React from 'react';
import { Bell, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { SitemapAlert } from '../../../../api/organicWeb';

interface SitemapAlertsCardProps {
    alerts: SitemapAlert[];
    loading?: boolean;
}

const SEVERITY_CONFIG = {
    critical: {
        icon: <AlertCircle size={13} />,
        color: 'var(--ws-red)',
        bg: 'rgba(255, 59, 48, 0.08)',
        badgeClass: 'ow-badge--red',
        label: 'Critico',
    },
    warning: {
        icon: <AlertTriangle size={13} />,
        color: 'var(--ws-orange)',
        bg: 'rgba(255, 149, 0, 0.08)',
        badgeClass: 'ow-badge--yellow',
        label: 'Avviso',
    },
    info: {
        icon: <Info size={13} />,
        color: 'var(--ws-accent)',
        bg: 'rgba(0, 122, 255, 0.08)',
        badgeClass: 'ow-badge--blue',
        label: 'Info',
    },
} as const;

const SitemapAlertsCard: React.FC<SitemapAlertsCardProps> = ({ alerts, loading }) => {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;

    return (
        <div className="ow-gsc-bento-card ow-sitemap-alerts-card">
            <div className="ow-gsc-bento-card-header">
                <Bell size={15} style={{ color: criticalCount > 0 ? 'var(--ws-red)' : 'var(--ws-text-secondary)' }} />
                <span className="ow-gsc-bento-card-title">Alert Attivi</span>
                {alerts.length > 0 && (
                    <span className={`ow-badge ow-badge--sm ${criticalCount > 0 ? 'ow-badge--red' : 'ow-badge--yellow'}`} style={{ marginLeft: 'auto' }}>
                        {alerts.length}
                    </span>
                )}
            </div>

            {loading ? (
                <div className="ow-gsc-bento-loading">Caricamento…</div>
            ) : alerts.length === 0 ? (
                <div className="ow-gsc-bento-empty ow-gsc-bento-empty--success">
                    <Bell size={20} />
                    <span>Nessun alert attivo</span>
                </div>
            ) : (
                <div className="ow-sitemap-alerts-list">
                    {criticalCount > 0 && (
                        <div className="ow-sitemap-alerts-summary">
                            <span className="ow-badge ow-badge--sm ow-badge--red">{criticalCount} critico{criticalCount > 1 ? 'i' : ''}</span>
                            {warningCount > 0 && (
                                <span className="ow-badge ow-badge--sm ow-badge--yellow">{warningCount} avviso{warningCount > 1 ? 'i' : ''}</span>
                            )}
                        </div>
                    )}
                    {alerts.map(alert => {
                        const cfg = SEVERITY_CONFIG[alert.severity];
                        return (
                            <div
                                key={alert.id}
                                className="ow-sitemap-alert-item"
                                style={{ background: cfg.bg, borderLeftColor: cfg.color }}
                            >
                                <span style={{ color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
                                <span className="ow-sitemap-alert-msg">{alert.message}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SitemapAlertsCard;
