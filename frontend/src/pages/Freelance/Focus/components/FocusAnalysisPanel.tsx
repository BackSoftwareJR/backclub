import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, RefreshCw, X } from 'lucide-react';
import type { AnalysisReport, ReportStatus } from '../../../../types/focus';

// ── helpers ───────────────────────────────────────────────────────────────────

function statusIcon(status: ReportStatus): React.ReactNode {
  switch (status) {
    case 'ready':     return <CheckCircle2 size={14} className="fap-icon fap-icon--ready" />;
    case 'analyzing': return <span className="fap-spinner" aria-label="Analizzando…" />;
    case 'pending':   return <Clock size={14} className="fap-icon fap-icon--pending" />;
    case 'stale':     return <AlertTriangle size={14} className="fap-icon fap-icon--stale" />;
  }
}

function statusLabel(status: ReportStatus): string {
  switch (status) {
    case 'ready':     return 'completato';
    case 'analyzing': return 'analizzando…';
    case 'pending':   return 'in attesa';
    case 'stale':     return 'non aggiornato';
  }
}

function urgencyBadge(urgency: string): string {
  switch (urgency) {
    case 'high':   return '🔴';
    case 'medium': return '🟡';
    case 'low':    return '🟢';
    default:       return '⚪';
  }
}

function riskBadge(risk: string): string {
  switch (risk) {
    case 'high':   return '🔴 Alto';
    case 'medium': return '🟡 Medio';
    case 'low':    return '🟢 Basso';
    default:       return risk;
  }
}

// ── ReportCard ────────────────────────────────────────────────────────────────

interface ReportCardProps {
  report: AnalysisReport;
}

function ReportCard({ report }: ReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isExpandable = report.status === 'ready' && !!report.content;

  return (
    <div className={`fap-card fap-card--${report.status}`}>
      <button
        className="fap-card__header"
        onClick={() => isExpandable && setExpanded(p => !p)}
        disabled={!isExpandable}
        type="button"
        aria-expanded={expanded}
      >
        <span className="fap-card__icon">{statusIcon(report.status)}</span>
        <span className="fap-card__name">{report.subject_name}</span>
        <span className={`fap-card__badge fap-card__badge--${report.status}`}>
          {statusLabel(report.status)}
        </span>
        {isExpandable && (
          <span className="fap-card__chevron">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </span>
        )}
      </button>

      {report.status === 'stale' && report.error_message && (
        <p className="fap-card__error">{report.error_message}</p>
      )}

      {expanded && report.content && (
        <div className="fap-card__body">
          {report.report_type === 'overview' && (
            <>
              {report.content.recommendation && (
                <p className="fap-card__recommendation">💡 {report.content.recommendation}</p>
              )}
              {report.content.total_workload_hours !== undefined && (
                <p className="fap-card__stat">
                  <strong>Ore totali stimate:</strong> {report.content.total_workload_hours}h
                </p>
              )}
              {report.content.priority_ranking && report.content.priority_ranking.length > 0 && (
                <div className="fap-card__section">
                  <p className="fap-card__section-title">Ranking priorità:</p>
                  <ul className="fap-card__list">
                    {report.content.priority_ranking.map((p, i) => (
                      <li key={i} className="fap-card__list-item">
                        {urgencyBadge(p.urgency)} <strong>{p.name}</strong>
                        {p.reason && <span className="fap-card__reason"> — {p.reason}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.content.risk_projects && report.content.risk_projects.length > 0 && (
                <div className="fap-card__section">
                  <p className="fap-card__section-title">Progetti a rischio:</p>
                  <ul className="fap-card__list">
                    {report.content.risk_projects.map((p, i) => (
                      <li key={i} className="fap-card__list-item fap-card__list-item--risk">⚠️ {p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {report.report_type === 'project' && (
            <>
              {report.content.risk_level && (
                <p className="fap-card__stat">
                  <strong>Rischio:</strong> {riskBadge(report.content.risk_level)}
                </p>
              )}
              {report.content.notes && (
                <p className="fap-card__recommendation">💡 {report.content.notes}</p>
              )}
              {report.content.bottleneck && (
                <p className="fap-card__stat">
                  <strong>Collo di bottiglia:</strong> {report.content.bottleneck}
                </p>
              )}
              {report.content.estimated_completion_days !== undefined &&
                report.content.estimated_completion_days > 0 && (
                <p className="fap-card__stat">
                  <strong>Completamento stimato:</strong> {report.content.estimated_completion_days} giorni
                </p>
              )}
              {report.content.top_3_next_tasks && report.content.top_3_next_tasks.length > 0 && (
                <div className="fap-card__section">
                  <p className="fap-card__section-title">Prossime task consigliate:</p>
                  <ul className="fap-card__list">
                    {report.content.top_3_next_tasks.map((t, i) => (
                      <li key={i} className="fap-card__list-item">▶ {t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── FlowA — first-time preparation screen ────────────────────────────────────

interface FlowAProps {
  reports: AnalysisReport[];
  progress: number;
  onClose: () => void;
}

function FlowAScreen({ reports, progress, onClose }: FlowAProps) {
  return (
    <div className="fap-firsttime" role="status" aria-live="polite">
      <button className="fap-firsttime__close" onClick={onClose} type="button" aria-label="Chiudi">
        <X size={14} />
      </button>

      <div className="fap-firsttime__icon">🔍</div>
      <h3 className="fap-firsttime__title">Preparazione in corso</h3>
      <p className="fap-firsttime__subtitle">
        Il tuo assistente sta studiando il tuo lavoro per la prima volta.
        Questo richiede qualche minuto.
      </p>

      {/* Progress bar */}
      <div className="fap-firsttime__progress-wrap">
        <div className="focus-analysis-progress">
          <div
            className="focus-analysis-progress__fill"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className="fap-firsttime__percent">{progress}%</span>
      </div>

      {/* Step list */}
      <ul className="fap-firsttime__steps">
        {reports.map(r => (
          <li key={r.id} className={`fap-firsttime__step fap-firsttime__step--${r.status}`}>
            {statusIcon(r.status)}
            <span className="fap-firsttime__step-name">{r.subject_name}</span>
          </li>
        ))}
      </ul>

      <p className="fap-firsttime__hint">
        Puoi continuare a lavorare, ti avviso quando ho finito.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  reports: AnalysisReport[];
  isRunning: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const FocusAnalysisPanel: React.FC<Props> = ({
  open,
  reports,
  isRunning,
  onClose,
  onRefresh,
}) => {
  const readyCount  = reports.filter(r => r.status === 'ready').length;
  const totalCount  = reports.length;
  const progress    = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
  const isFirstTime = readyCount === 0 && totalCount > 0;
  const allReady    = totalCount > 0 && readyCount === totalCount;
  const hasPending  = reports.some(r => r.status === 'pending' || r.status === 'analyzing');

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fap-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Flow A — first time: full preparation screen */}
      {isFirstTime ? (
        <aside className="fap-drawer fap-drawer--firsttime" role="complementary" aria-label="Analisi AI">
          <FlowAScreen reports={reports} progress={progress} onClose={onClose} />
        </aside>
      ) : (
        /* Flow B/C — compact drawer with cards */
        <aside className="fap-drawer" role="complementary" aria-label="Analisi AI">
          {/* Header */}
          <div className="fap-header">
            <div className="fap-header__left">
              <span className="fap-header__icon">🔍</span>
              <span className="fap-header__title">Analisi AI</span>
              {allReady ? (
                <span className="fap-header__badge fap-header__badge--green">✓ Aggiornato</span>
              ) : totalCount > 0 ? (
                <span className="fap-header__badge">{readyCount}/{totalCount}</span>
              ) : null}
            </div>
            <div className="fap-header__actions">
              <button
                className={`fap-btn fap-btn--icon${isRunning ? ' fap-btn--spinning' : ''}`}
                onClick={onRefresh}
                disabled={isRunning}
                title="Aggiorna analisi"
                aria-label="Aggiorna analisi"
                type="button"
              >
                <RefreshCw size={14} />
              </button>
              <button
                className="fap-btn fap-btn--icon"
                onClick={onClose}
                title="Chiudi"
                aria-label="Chiudi pannello analisi"
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Progress bar (visible while running) */}
          {totalCount > 0 && !allReady && (
            <div className="fap-progress">
              <div
                className="fap-progress__bar"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={readyCount}
                aria-valuemin={0}
                aria-valuemax={totalCount}
              />
            </div>
          )}

          {/* Body */}
          <div className="fap-body">
            {reports.length === 0 ? (
              <div className="fap-empty">
                <span style={{ fontSize: 28 }}>🔍</span>
                <span>Nessuna analisi trovata.</span>
                <button className="fap-btn fap-btn--primary" onClick={onRefresh} type="button">
                  Avvia analisi
                </button>
              </div>
            ) : (
              <div className="fap-list">
                {reports.map(report => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>

          {/* Footer — running indicator */}
          {hasPending && (
            <div className="fap-footer">
              <span className="fap-spinner fap-spinner--xs" />
              Analisi in corso…
            </div>
          )}
        </aside>
      )}
    </>
  );
};

export default FocusAnalysisPanel;
