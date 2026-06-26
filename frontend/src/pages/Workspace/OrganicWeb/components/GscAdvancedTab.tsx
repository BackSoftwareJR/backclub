import React from 'react';
import GscBentoDashboard from './GscBentoDashboard';
import KeywordIntelligencePanel from './KeywordIntelligencePanel';

interface GscAdvancedTabProps {
    projectId: number;
    gscPropertyKey?: string;
}

/**
 * GscAdvancedTab — Enterprise GSC tab combining:
 * 1. GscBentoDashboard — performance KPIs + trend chart + sitemaps + indexing errors
 * 2. KeywordIntelligencePanel — granular page/query keyword data with AI SEO Advisor
 */
const GscAdvancedTab: React.FC<GscAdvancedTabProps> = ({ projectId, gscPropertyKey }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Section 1: Performance metrics + trend chart */}
            <GscBentoDashboard
                projectId={projectId}
                key={gscPropertyKey ?? String(projectId)}
            />

            {/* Section 2: Keyword Intelligence + SEO Advisor */}
            <KeywordIntelligencePanel projectId={projectId} />
        </div>
    );
};

export default GscAdvancedTab;
