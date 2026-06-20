import React from 'react';
import type { TaskSeriesSourceType } from '../../types/taskSeries';

interface TaskSeriesProcessingStepProps {
  sourceType?: TaskSeriesSourceType;
  sourceLabel?: string;
}

const TaskSeriesProcessingStep: React.FC<TaskSeriesProcessingStepProps> = ({
  sourceType,
  sourceLabel,
}) => {
  const isText = sourceType === 'text';

  return (
    <div className="tsm-processing">
      <div className="tsm-spinner" />
      <p className="tsm-processing-title">Analisi in corso…</p>
      <p className="tsm-processing-hint">
        {isText ? (
          <>Stiamo analizzando <strong>il testo inserito</strong> con l&apos;AI per estrarre e proporre i task del progetto.</>
        ) : sourceLabel ? (
          <>Stiamo analizzando <strong>{sourceLabel}</strong> con l&apos;AI per estrarre e proporre i task del progetto.</>
        ) : (
          'L\'AI sta elaborando il documento per proporre i task del progetto.'
        )}
        <br />
        Potrebbe richiedere fino a 30 secondi.
      </p>
      {sourceType && (
        <span className="tsm-source-badge">
          {isText ? 'Analisi da testo' : sourceLabel ?? 'Documento'}
        </span>
      )}
    </div>
  );
};

export default TaskSeriesProcessingStep;
