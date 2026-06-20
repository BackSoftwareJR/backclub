import React, { useState } from 'react';
import { Copy, Check, Edit2, Mail, X } from 'lucide-react';
import type { CommunicationDraft } from '../../../../api/taskDetailAi';

interface TaskDraftCardProps {
  draft: CommunicationDraft;
}

const typeLabel: Record<CommunicationDraft['type'], string> = {
  email: 'Email',
  message: 'Messaggio',
  whatsapp: 'WhatsApp',
};

const TaskDraftCard: React.FC<TaskDraftCardProps> = ({ draft }) => {
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedBody, setEditedBody] = useState(draft.body);
  const [editedSubject, setEditedSubject] = useState(draft.subject ?? '');

  const handleCopy = async () => {
    const textToCopy = draft.type === 'email' && editedSubject
      ? `Oggetto: ${editedSubject}\n\n${editedBody}`
      : editedBody;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const el = document.createElement('textarea');
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const mailtoHref =
    draft.type === 'email'
      ? `mailto:?subject=${encodeURIComponent(editedSubject)}&body=${encodeURIComponent(editedBody)}`
      : undefined;

  return (
    <div className="arm-draft-card">
      <div className="arm-draft-header">
        <div className="arm-draft-badge-row">
          <span className="arm-draft-badge">Bozza pronta</span>
          <span className="arm-draft-type-label">{typeLabel[draft.type]}</span>
        </div>
        <div className="arm-draft-actions">
          <button
            type="button"
            className={`arm-draft-icon-btn${editMode ? ' active' : ''}`}
            onClick={() => setEditMode(!editMode)}
            title={editMode ? 'Chiudi modifica' : 'Modifica'}
            aria-label={editMode ? 'Chiudi modifica' : 'Modifica bozza'}
          >
            {editMode ? <X size={13} /> : <Edit2 size={13} />}
          </button>
          {mailtoHref && (
            <a
              href={mailtoHref}
              className="arm-draft-icon-btn"
              title="Apri in Mail"
              aria-label="Apri in Mail"
            >
              <Mail size={13} />
            </a>
          )}
          <button
            type="button"
            className={`arm-draft-copy-btn${copied ? ' copied' : ''}`}
            onClick={handleCopy}
            aria-label={copied ? 'Copiato' : 'Copia testo'}
          >
            {copied ? (
              <>
                <Check size={13} />
                <span>Copiato</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copia</span>
              </>
            )}
          </button>
        </div>
      </div>

      {draft.type === 'email' && (
        <div className="arm-draft-subject-row">
          <span className="arm-draft-subject-label">Oggetto</span>
          {editMode ? (
            <input
              type="text"
              className="arm-draft-subject-input"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              placeholder="Oggetto email..."
            />
          ) : (
            <span className="arm-draft-subject-value">{editedSubject || '—'}</span>
          )}
        </div>
      )}

      <div className="arm-draft-body-wrap">
        {editMode ? (
          <textarea
            className="arm-draft-textarea"
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            rows={10}
            spellCheck
          />
        ) : (
          <pre className="arm-draft-body">{editedBody}</pre>
        )}
      </div>

      {draft.variables_used && draft.variables_used.length > 0 && (
        <div className="arm-draft-vars">
          {draft.variables_used.map((v) => (
            <span key={v} className="arm-draft-var-tag">{v}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskDraftCard;
