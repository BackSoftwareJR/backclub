import React, { useCallback, useRef, useState } from 'react';
import { Paperclip, ArrowUp, X, Mic, MicOff } from 'lucide-react';
import { useVoiceInput } from '../../../../hooks/useVoiceInput';

interface TaskCommentComposerProps {
  onSubmit: (data: { comment: string; files: File[] }) => Promise<void>;
  disabled?: boolean;
}

const TaskCommentComposer: React.FC<TaskCommentComposerProps> = ({ onSubmit, disabled }) => {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = (comment.trim() || files.length > 0) && !sending && !disabled;

  const doSubmit = async () => {
    if ((!comment.trim() && files.length === 0) || sending || disabled) return;
    setSending(true);
    try {
      await onSubmit({ comment: comment.trim(), files });
      setComment('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error sending comment:', error);
      alert("Errore durante l'invio del commento");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSubmit();
  };

  const handleFileSelect = (selected: FileList | null) => {
    if (!selected?.length) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVoiceResult = useCallback((transcript: string, append?: boolean) => {
    setComment((prev) => (append && prev ? prev + ' ' + transcript : transcript));
  }, []);

  const { isListening, isSupported: voiceSupported, toggle: toggleVoice } = useVoiceInput({
    lang: 'it-IT',
    onResult: handleVoiceResult,
  });

  return (
    <form onSubmit={handleSubmit} className="task-comment-form">
      {files.length > 0 && (
        <div className="task-comment-files">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="task-comment-file-chip">
              <Paperclip size={12} />
              <span>{file.name}</span>
              <button type="button" onClick={() => removeFile(index)} aria-label="Rimuovi file">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`task-comment-bar${isListening ? ' task-comment-bar-listening' : ''}`}>
        <button
          type="button"
          className="task-comment-bar-attach"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          aria-label="Allega file"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="task-comment-file-input"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => {
            handleFileSelect(e.target.files);
            e.target.value = '';
          }}
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Scrivi un messaggio..."
          className="task-comment-bar-input"
          rows={1}
          disabled={disabled || sending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSubmit) void doSubmit();
            }
          }}
        />
        {voiceSupported && (
          <button
            type="button"
            className={`task-comment-bar-voice${isListening ? ' active' : ''}`}
            onClick={toggleVoice}
            disabled={disabled || sending}
            aria-label={isListening ? 'Ferma dettatura' : 'Dettatura vocale'}
            title={isListening ? 'Ferma dettatura' : 'Dettatura vocale'}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="task-comment-bar-send"
          aria-label="Invia"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </div>
    </form>
  );
};

export default TaskCommentComposer;
