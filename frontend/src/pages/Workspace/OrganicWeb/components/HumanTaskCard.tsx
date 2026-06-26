import React, { useState, useRef } from 'react';
import { CheckCircle, Upload, AlertCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import type { OrganicHumanTask } from '../../../../api/organicWeb';
import organicWebApi from '../../../../api/organicWeb';

interface HumanTaskCardProps {
    task: OrganicHumanTask;
    onCompleted?: (task: OrganicHumanTask) => void;
    showProject?: boolean;
}

const HumanTaskCard: React.FC<HumanTaskCardProps> = ({ task, onCompleted, showProject = false }) => {
    const [expanded, setExpanded] = useState(false);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const requiresUpload = Boolean(task.upload_instructions);
    const isOverdue = task.due_at ? new Date(task.due_at) < new Date() : false;
    const isCompleted = task.status === 'completed';

    const projectName = task.organicProject?.crmProject?.name ?? `Progetto #${task.organic_project_id}`;
    const skillName = task.skillStep?.skillRun?.skill_id ?? 'Skill';

    const handleComplete = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await organicWebApi.completeHumanTask(task.id, { notes });
            onCompleted?.(result.task);
        } catch {
            setError('Errore durante il completamento del task.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        setLoading(true);
        setError(null);
        try {
            await organicWebApi.uploadHumanTaskFile(task.id, file);
            const result = await organicWebApi.completeHumanTask(task.id, { notes });
            onCompleted?.(result.task);
        } catch {
            setError('Errore durante il caricamento del file.');
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    return (
        <div className={`ow-human-task-card ${isOverdue ? 'ow-human-task-card--overdue' : ''} ${isCompleted ? 'ow-human-task-card--completed' : ''}`}>
            <div className="ow-human-task-card-header" onClick={() => setExpanded(v => !v)}>
                <div className="ow-human-task-card-info">
                    <div className="ow-human-task-card-title-row">
                        <span className="ow-human-task-card-title">{task.title}</span>
                        {task.priority === 'urgent' && (
                            <span className="ow-badge ow-badge--red ow-badge--sm">Urgente</span>
                        )}
                        {task.priority === 'high' && (
                            <span className="ow-badge ow-badge--orange ow-badge--sm">Alta priorità</span>
                        )}
                    </div>
                    <div className="ow-human-task-card-meta">
                        {showProject && (
                            <span className="ow-human-task-card-project">{projectName}</span>
                        )}
                        <span className="ow-human-task-card-skill">{skillName}</span>
                        <span className="ow-badge ow-badge--yellow ow-badge--sm">Azione umana</span>
                        {task.due_at && (
                            <span className={`ow-human-task-card-due ${isOverdue ? 'ow-human-task-card-due--overdue' : ''}`}>
                                <Clock size={11} />
                                {isOverdue ? 'Scaduto' : 'Scade'}: {new Date(task.due_at).toLocaleDateString('it-IT')}
                            </span>
                        )}
                    </div>
                </div>
                <div className="ow-human-task-card-actions-header">
                    {isCompleted ? (
                        <CheckCircle size={16} className="ow-human-task-card-done-icon" />
                    ) : (
                        expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                </div>
            </div>

            {expanded && !isCompleted && (
                <div className="ow-human-task-card-body">
                    {task.description && (
                        <p className="ow-human-task-card-description">{task.description}</p>
                    )}
                    {task.instructions && (
                        <div className="ow-human-task-card-instructions">
                            <strong>Istruzioni:</strong>
                            <p>{task.instructions}</p>
                        </div>
                    )}

                    {requiresUpload ? (
                        <>
                            {task.upload_instructions && (
                                <p className="ow-human-task-card-upload-instructions">
                                    {task.upload_instructions}
                                </p>
                            )}
                            <div
                                className={`ow-upload-zone ${dragActive ? 'ow-upload-zone--active' : ''}`}
                                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={20} />
                                <span>Trascina un file qui oppure clicca per selezionare</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(file);
                                    }}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <textarea
                                className="ow-textarea"
                                placeholder="Note (facoltativo)…"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                            />
                        </>
                    )}

                    {error && (
                        <div className="ow-error-row">
                            <AlertCircle size={13} />
                            {error}
                        </div>
                    )}

                    {!requiresUpload && (
                        <button
                            className="ow-btn ow-btn--primary"
                            onClick={handleComplete}
                            disabled={loading}
                        >
                            {loading ? 'Salvataggio…' : 'Segna completato'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default HumanTaskCard;
