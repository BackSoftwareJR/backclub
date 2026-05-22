import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, Search, Upload, FileText, X, CheckCircle } from 'lucide-react';
// import { expenseDashboardApi } from '../../api/expenses'; // TODO: Use when API is ready
import './SpesePage.css';

interface Expense {
  id: number;
  title: string;
  amount: number;
  date: string;
  category: string;
  vendor?: string;
  status: string;
  document_path?: string;
}

const SpesePage: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual expenses API
      // const overview = await expenseDashboardApi.getOverview();
      // Mock data per ora
      setExpenses([]);
    } catch (error) {
      console.error('Errore nel caricamento spese:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type === 'application/pdf' || file.type.startsWith('image/')
    );

    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
      // TODO: Upload files to server
      console.log('Files dropped:', files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...files]);
      // TODO: Upload files to server
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="segreteria-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="segreteria-spese-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Spese</h1>
          <p className="venditori-page-subtitle">Gestisci le spese e i documenti</p>
        </div>
        <button 
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate('/segreteria/spese/nuova')}
        >
          <Plus size={18} />
          Nuova Spesa
        </button>
      </div>

      <div className="venditori-content-card">
        {/* Drag & Drop Upload Area */}
        <div 
          className={`segreteria-upload-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-upload" className="segreteria-upload-label">
            <Upload size={32} />
            <div className="segreteria-upload-text">
              <strong>Trascina qui i documenti</strong>
              <span>oppure clicca per selezionare</span>
            </div>
            <span className="segreteria-upload-hint">PDF, JPG, PNG (max 10MB)</span>
          </label>
        </div>

        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="segreteria-uploaded-files">
            <h3 className="segreteria-uploaded-title">File caricati</h3>
            <div className="segreteria-files-list">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="segreteria-file-item">
                  <FileText size={20} />
                  <div className="segreteria-file-info">
                    <span className="segreteria-file-name">{file.name}</span>
                    <span className="segreteria-file-size">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <button
                    className="segreteria-file-remove"
                    onClick={() => removeFile(index)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div className="venditori-actions-bar" style={{ marginTop: 'var(--spacing-6)' }}>
          <div className="venditori-search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="venditori-search-input"
              placeholder="Cerca spese..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="venditori-empty-state">
            <Receipt size={64} className="venditori-empty-state-icon" />
            <h3>Nessuna spesa registrata</h3>
            <p>Carica i documenti delle spese o crea una nuova spesa</p>
            <button 
              className="venditori-btn venditori-btn-primary"
              onClick={() => navigate('/segreteria/spese/nuova')}
            >
              <Plus size={18} />
              Nuova Spesa
            </button>
          </div>
        ) : (
          <div className="segreteria-table-wrapper">
            <table className="venditori-table">
              <thead>
                <tr>
                  <th>Descrizione</th>
                  <th>Fornitore</th>
                  <th>Importo</th>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Stato</th>
                  <th>Documento</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.title}</td>
                    <td>{expense.vendor || '-'}</td>
                    <td>
                      <span className="segreteria-amount">
                        {formatCurrency(expense.amount)}
                      </span>
                    </td>
                    <td>{new Date(expense.date).toLocaleDateString('it-IT')}</td>
                    <td>{expense.category || '-'}</td>
                    <td>
                      <span className="venditori-badge venditori-badge-success">
                        {expense.status}
                      </span>
                    </td>
                    <td>
                      {expense.document_path ? (
                        <CheckCircle size={16} color="var(--color-success)" />
                      ) : (
                        <span className="segreteria-no-doc">Nessun documento</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => navigate(`/segreteria/spese/${expense.id}`)}
                          title="Visualizza"
                        >
                          <FileText size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpesePage;

