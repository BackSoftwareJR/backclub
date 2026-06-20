import React, { useEffect, useState } from 'react';
import { Upload, FileText, Trash2, Download, ImageIcon } from 'lucide-react';
import { crmProjectTasksApi, type CrmProjectTaskAttachment } from '../../../../api/crmProjects';

interface TaskAttachmentZoneProps {
  projectId: number;
  taskId: number;
  onAttachmentChange?: () => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageMime = (mime: string | null) => mime?.startsWith('image/') ?? false;

const TaskAttachmentZone: React.FC<TaskAttachmentZoneProps> = ({ projectId, taskId, onAttachmentChange }) => {
  const [attachments, setAttachments] = useState<CrmProjectTaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadAttachments = async () => {
    try {
      const response = await crmProjectTasksApi.getAttachments(projectId, taskId);
      setAttachments(response.data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [projectId, taskId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await crmProjectTasksApi.uploadAttachment(projectId, taskId, file);
      }
      await loadAttachments();
      onAttachmentChange?.();
    } catch (error) {
      console.error('Error uploading attachment:', error);
      alert('Errore durante il caricamento del file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: number) => {
    if (!confirm('Eliminare questo allegato?')) return;
    try {
      await crmProjectTasksApi.deleteAttachment(projectId, taskId, attachmentId);
      await loadAttachments();
      onAttachmentChange?.();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Errore durante l\'eliminazione');
    }
  };

  return (
    <div className="task-sidebar-card task-upload-card">
      <h3 className="task-sidebar-card-title">File e Materiali</h3>
      <p className="task-upload-hint">Documenti, immagini e foto per questa task</p>

      <div className="task-files">
        <div className="task-files-list">
          {loading ? (
            <div className="task-attachment-skeleton-grid">
              {[1, 2].map((i) => (
                <div key={i} className="task-attachment-skeleton" />
              ))}
            </div>
          ) : attachments.length === 0 ? (
            <div className="task-files-empty-state">
              <div className="task-files-empty-icon">
                <FileText size={20} strokeWidth={1.5} />
              </div>
              <p>Nessun file caricato</p>
            </div>
          ) : (
            <div className="task-attachment-grid">
              {attachments.map((file) => {
                const isImage = isImageMime(file.mime_type);
                return (
                  <div key={file.id} className="task-attachment-tile">
                    <div className="task-attachment-thumb">
                      {isImage && file.file_url ? (
                        <img src={file.file_url} alt={file.file_name} className="task-attachment-thumb-img" />
                      ) : (
                        <div className="task-attachment-thumb-icon">
                          {isImage ? <ImageIcon size={22} /> : <FileText size={22} />}
                        </div>
                      )}
                      <div className="task-attachment-overlay">
                        {file.file_url && (
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="task-attachment-overlay-btn"
                            title="Scarica"
                          >
                            <Download size={16} />
                          </a>
                        )}
                        <button
                          type="button"
                          className="task-attachment-overlay-btn task-attachment-overlay-btn-danger"
                          onClick={() => handleDelete(file.id)}
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="task-attachment-meta">
                      <span className="task-file-name" title={file.file_name}>{file.file_name}</span>
                      <span className="task-file-size">{formatFileSize(file.file_size)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <label className={`task-upload-area${uploading ? ' uploading' : ''}`}>
          <Upload size={22} className="task-upload-icon" strokeWidth={1.5} />
          <p className="task-upload-text">{uploading ? 'Caricamento...' : 'Trascina qui o tocca per caricare'}</p>
          <p className="task-upload-formats">PDF, Word, immagini (JPG, PNG…)</p>
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
            className="task-upload-input"
            disabled={uploading}
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
};

export default TaskAttachmentZone;
