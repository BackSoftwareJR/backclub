import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, MapPin, User } from 'lucide-react';
import leadsApi from '../../api/leads';
import { sellersApi } from '../../api/sellers';
import type { Seller } from '../../types/sellers';
import './ImportCsvModal.css';

interface ImportCsvModalProps {
  onClose: () => void;
}

// Lista regioni italiane
const ITALIAN_REGIONS = [
  'Abruzzo',
  'Basilicata',
  'Calabria',
  'Campania',
  'Emilia-Romagna',
  'Friuli-Venezia Giulia',
  'Lazio',
  'Liguria',
  'Lombardia',
  'Marche',
  'Molise',
  'Piemonte',
  'Puglia',
  'Sardegna',
  'Sicilia',
  'Toscana',
  'Trentino-Alto Adige',
  'Umbria',
  "Valle d'Aosta",
  'Veneto',
];

const ImportCsvModal: React.FC<ImportCsvModalProps> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[]; total_errors: number } | null>(null);
  const [region, setRegion] = useState<string>('');
  const [sellerId, setSellerId] = useState<number | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      setLoadingSellers(true);
      const sellersList = await sellersApi.getAll({ is_active: true });
      setSellers(sellersList);
    } catch (error) {
      console.error('Errore nel caricamento venditori:', error);
    } finally {
      setLoadingSellers(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        alert('Per favore seleziona un file CSV valido');
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      alert('Per favore seleziona un file CSV');
      return;
    }

    if (!region) {
      alert('Per favore seleziona una regione');
      return;
    }

    if (!sellerId) {
      alert('Per favore seleziona un venditore');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('Importazione CSV - Dati:', {
        fileName: file.name,
        region,
        sellerId,
      });
      
      const response = await leadsApi.importCsv(file, region, sellerId);
      // L'API restituisce direttamente i dati, non wrappati in ApiResponse
      const data = (response as any).imported !== undefined ? response : (response as any).data || response;
      setResult({
        imported: data.imported || 0,
        errors: data.errors || [],
        total_errors: data.total_errors || 0,
      });
    } catch (error: any) {
      console.error('Errore nell\'importazione:', error);
      setResult({
        imported: 0,
        errors: [error.response?.data?.error || error.message || 'Errore sconosciuto'],
        total_errors: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result && result.imported > 0) {
      onClose();
    } else {
      setFile(null);
      setResult(null);
      setRegion('');
      setSellerId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content import-csv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Importa Leads da CSV</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="import-options-section">
            <h3>Opzioni di Importazione</h3>
            
            <div className="form-group">
              <label htmlFor="region-select" className="form-label">
                <MapPin size={16} />
                Regione <span className="required">*</span>
              </label>
              <select
                id="region-select"
                className="form-select"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                required
              >
                <option value="">Seleziona una regione</option>
                {ITALIAN_REGIONS.map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="seller-select" className="form-label">
                <User size={16} />
                Venditore <span className="required">*</span>
              </label>
              {loadingSellers ? (
                <div className="loading-select">Caricamento venditori...</div>
              ) : (
                <select
                  id="seller-select"
                  className="form-select"
                  value={sellerId || ''}
                  onChange={(e) => setSellerId(e.target.value ? Number(e.target.value) : null)}
                  required
                >
                  <option value="">Seleziona un venditore</option>
                  {sellers.map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.user?.name || `Venditore ${seller.id}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="import-instructions">
            <h3>Formato CSV richiesto</h3>
            <p>Il file CSV deve contenere le seguenti colonne (header nella prima riga):</p>
            <ul className="csv-columns-list">
              <li><strong>Tipologia</strong> - Tipo di lead (opzionale)</li>
              <li><strong>Nome Cliente</strong> - Ragione sociale (obbligatorio)</li>
              <li><strong>Email</strong> - Email principale (opzionale)</li>
              <li><strong>Cellulare</strong> - Numero di telefono (opzionale)</li>
              <li><strong>Sito Web</strong> - URL del sito (opzionale)</li>
              <li><strong>Indirizzo</strong> - Indirizzo completo (opzionale)</li>
              <li><strong>Stato Digitale Attuale</strong> - Stato digitale (opzionale)</li>
              <li><strong>Strategia di Pitch & Opportunità</strong> - Strategia (opzionale)</li>
            </ul>
            <p className="note">Nota: Le colonne possono essere in qualsiasi ordine. Il sistema riconoscerà automaticamente i nomi delle colonne.</p>
          </div>

          <div className="file-upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="file-input"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input" className="file-upload-label">
              <Upload size={20} />
              {file ? file.name : 'Seleziona file CSV'}
            </label>
          </div>

          {file && (
            <div className="file-info">
              <FileText size={16} />
              <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
            </div>
          )}

          {result && (
            <div className={`import-result ${result.total_errors === 0 ? 'success' : 'warning'}`}>
              {result.total_errors === 0 ? (
                <CheckCircle size={20} className="result-icon" />
              ) : (
                <AlertCircle size={20} className="result-icon" />
              )}
              <div className="result-content">
                <h4>
                  {result.total_errors === 0 
                    ? 'Importazione completata con successo!' 
                    : 'Importazione completata con errori'}
                </h4>
                <p>
                  <strong>{result.imported}</strong> lead importati con successo
                  {result.total_errors > 0 && (
                    <> - <strong>{result.total_errors}</strong> errori</>
                  )}
                </p>
                {result.errors.length > 0 && (
                  <div className="errors-list">
                    <strong>Errori:</strong>
                    <ul>
                      {result.errors.slice(0, 10).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>... e altri {result.errors.length - 10} errori</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>
            {result && result.imported > 0 ? 'Chiudi' : 'Annulla'}
          </button>
          {!result && (
            <button 
              className="btn-primary" 
              onClick={handleImport}
              disabled={!file || !region || !sellerId || loading}
            >
              {loading ? 'Importazione...' : 'Importa'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportCsvModal;

