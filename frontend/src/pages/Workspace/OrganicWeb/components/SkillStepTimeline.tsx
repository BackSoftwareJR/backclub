import React from 'react';
import { User, Cpu, Code2, Globe, GitBranch, CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';
import type { OrganicSkillStep } from '../../../../api/organicWeb';
import HumanTaskCard from './HumanTaskCard';

interface SkillStepTimelineProps {
    steps: OrganicSkillStep[];
    currentStepIndex?: number;
    onHumanTaskCompleted?: () => void;
}

const STEP_TYPE_ICONS: Record<string, React.ReactNode> = {
    ai: <Cpu size={14} />,
    human: <User size={14} />,
    code: <Code2 size={14} />,
    api: <Globe size={14} />,
    condition: <GitBranch size={14} />,
};

const STEP_TYPE_LABELS: Record<string, string> = {
    ai: 'AI',
    human: 'Umano',
    code: 'Codice',
    api: 'API',
    condition: 'Condizione',
};

const stepStatusIcon = (status: string) => {
    switch (status) {
        case 'completed': return <CheckCircle size={16} className="ow-timeline-status-icon ow-timeline-status-icon--completed" />;
        case 'running': return <Loader size={16} className="ow-timeline-status-icon ow-timeline-status-icon--running ws-spin" />;
        case 'waiting': return <Clock size={16} className="ow-timeline-status-icon ow-timeline-status-icon--waiting" />;
        case 'failed': return <AlertCircle size={16} className="ow-timeline-status-icon ow-timeline-status-icon--failed" />;
        case 'skipped': return <AlertCircle size={16} className="ow-timeline-status-icon ow-timeline-status-icon--skipped" />;
        default: return <Clock size={16} className="ow-timeline-status-icon ow-timeline-status-icon--pending" />;
    }
};

const SkillStepTimeline: React.FC<SkillStepTimelineProps> = ({ steps, currentStepIndex, onHumanTaskCompleted }) => {
    if (steps.length === 0) {
        return <p className="ow-empty-text">Nessuno step registrato.</p>;
    }

    return (
        <div className="ow-timeline">
            {steps.map((step, idx) => {
                const isCurrent = step.step_index === currentStepIndex;
                const isHumanWaiting = step.step_type === 'human' && step.status === 'waiting' && step.humanTask;

                return (
                    <div
                        key={step.id}
                        className={`ow-timeline-step ${isCurrent ? 'ow-timeline-step--current' : ''} ow-timeline-step--${step.status}`}
                    >
                        <div className="ow-timeline-connector">
                            <div className="ow-timeline-dot">
                                {stepStatusIcon(step.status)}
                            </div>
                            {idx < steps.length - 1 && <div className="ow-timeline-line" />}
                        </div>

                        <div className="ow-timeline-content">
                            <div className="ow-timeline-step-header">
                                <div className="ow-timeline-step-type">
                                    {STEP_TYPE_ICONS[step.step_type] ?? <Code2 size={14} />}
                                    <span className="ow-timeline-step-type-label">
                                        {STEP_TYPE_LABELS[step.step_type] ?? step.step_type}
                                    </span>
                                </div>
                                <span className="ow-timeline-step-name">{step.step_key}</span>
                                <span className={`ow-badge ow-badge--sm ow-badge--${step.status === 'completed' ? 'green' : step.status === 'running' ? 'blue' : step.status === 'waiting' ? 'yellow' : step.status === 'failed' ? 'red' : 'gray'}`}>
                                    {step.status}
                                </span>
                                {step.completed_at && (
                                    <span className="ow-timeline-step-time">
                                        {new Date(step.completed_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>

                            {step.output && Object.keys(step.output).length > 0 && step.status === 'completed' && (
                                <div className="ow-timeline-step-output">
                                    {step.output.summary ? (
                                        <p className="ow-timeline-step-summary">{String(step.output.summary)}</p>
                                    ) : null}
                                </div>
                            )}

                            {isHumanWaiting && step.humanTask && (
                                <div className="ow-timeline-human-task">
                                    <HumanTaskCard
                                        task={step.humanTask}
                                        onCompleted={onHumanTaskCompleted ? () => onHumanTaskCompleted() : undefined}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SkillStepTimeline;
