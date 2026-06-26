import React from 'react';
import type { SkillRunStatus } from '../../../../api/organicWeb';

interface SkillRunStatusBadgeProps {
    status: SkillRunStatus;
    size?: 'sm' | 'md';
}

const STATUS_LABELS: Record<SkillRunStatus, string> = {
    pending: 'In attesa',
    running: 'In esecuzione',
    waiting_human: 'Azione richiesta',
    completed: 'Completato',
    failed: 'Fallito',
    cancelled: 'Cancellato',
};

const STATUS_CLASSES: Record<SkillRunStatus, string> = {
    pending: 'ow-badge ow-badge--gray',
    running: 'ow-badge ow-badge--blue ow-badge--pulse',
    waiting_human: 'ow-badge ow-badge--yellow',
    completed: 'ow-badge ow-badge--green',
    failed: 'ow-badge ow-badge--red',
    cancelled: 'ow-badge ow-badge--gray',
};

const SkillRunStatusBadge: React.FC<SkillRunStatusBadgeProps> = ({ status, size = 'md' }) => {
    return (
        <span className={`${STATUS_CLASSES[status]} ${size === 'sm' ? 'ow-badge--sm' : ''}`}>
            {status === 'running' && <span className="ow-badge-dot" />}
            {STATUS_LABELS[status]}
        </span>
    );
};

export default SkillRunStatusBadge;
