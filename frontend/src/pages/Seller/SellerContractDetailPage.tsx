import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Upload,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Plus,
  X,
  DollarSign,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import contractsApi from '../../api/contracts';
import type { Contract } from '../../types/sellers';
import { sellerCache } from '../../utils/sellerCache';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerContractDetailPage.css';

const SellerContractDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentType, setDocumentType] = useState<'privacy_policy' | 'consent_personal_data' | 'other'>('other');
  const [documentName, setDocumentName] = useState('');
  const [consentGoogleDriveUrl, setConsentGoogleDriveUrl] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const contractSignedFileInputRef = useRef<HTMLInputElement>(null);
  const documentFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadContract();
    }
  }, [id]);

  const loadContract = async (showLoading = true) => {
    const contractId = Number(id);
    const cached = sellerCache.detail.contract.get<Contract>(contractId);
    if (cached) {
      setContract(cached);
      if (showLoading) setLoading(false);
    } else if (showLoading) {
      setLoading(true);
    }

    try {
      const data = await contractsApi.getById(contractId);
      const signedDocs = data.signedDocuments || (data as any).signed_documents || [];
      const contractData = {
        ...data,
        signedDocuments: Array.isArray(signedDocs) ? signedDocs.map((doc: any) => ({ ...doc })) : [],
      };
      const newContract = JSON.parse(JSON.stringify(contractData));
      setContract(newContract);
      sellerCache.detail.contract.set(contractId, newContract);
    } catch (error) {
      console.error('Errore nel caricamento contratto:', error);
      if (showLoading) {
        alert('Errore nel caricamento del contratto');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; badgeClass: string; icon: any }> = {
      draft: { label: 'Bozza', badgeClass: 'seller-badge seller-badge-draft', icon: FileText },
      requested: { label: 'Richiesta', badgeClass: 'seller-badge seller-badge-primary', icon: Clock },
      pending_signature: { label: 'In Attesa di Firma', badgeClass: 'seller-badge seller-badge-pending', icon: AlertCircle },
      active: { label: 'Attivo', badgeClass: 'seller-badge seller-badge-active', icon: CheckCircle2 },
      suspended: { label: 'Sospeso', badgeClass: 'seller-badge seller-badge-cancelled', icon: XCircle },
      completed: { label: 'Completato', badgeClass: 'seller-badge seller-badge-active', icon: CheckCircle2 },
      terminated: { label: 'Terminato', badgeClass: 'seller-badge seller-badge-cancelled', icon: XCircle },
    };
    return badges[status] || { label: status, badgeClass: 'seller-badge seller-badge-secondary', icon: FileText };
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleUploadContractSigned = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contract) return;

    try {
      setUploadingSigned(true);
      await contractsApi.uploadSignedFile(contract.id, file);
      alert('Contratto firmato caricato con successo!');
      if (contractSignedFileInputRef.current) {
        contractSignedFileInputRef.current.value = '';
      }
      loadContract();
    } catch (error: any) {
      console.error('Errore nel caricamento contratto firmato:', error);
      alert(error.response?.data?.error || 'Errore nel caricamento del contratto firmato');
    } finally {
      setUploadingSigned(false);
    }
  };

  const handleSaveConsentUrl = async () => {
    if (!consentGoogleDriveUrl.trim() || !contract) return;

    // Valida che sia un URL valido
    try {
      new URL(consentGoogleDriveUrl);
    } catch {
      alert('Inserisci un URL valido di Google Drive');
      return;
    }

    try {
      setUploadingDocument(true);
      await contractsApi.uploadSignedDocumentUrl(
        contract.id,
        consentGoogleDriveUrl,
        'consent_personal_data',
        'Consenso Trattamento Dati Personali'
      );
      
      setConsentGoogleDriveUrl('');
      
      // Aspetta un po' per assicurarsi che il database abbia committato la transazione
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Forza sempre un ricaricamento completo del contratto per assicurarsi che i dati siano aggiornati
      await loadContract(false);
      
      alert('Link Google Drive salvato con successo!');
    } catch (error: any) {
      console.error('Errore nel salvataggio consenso:', error);
      alert(error.response?.data?.error || 'Errore nel salvataggio del link');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleUploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contract) return;

    if (!documentName.trim()) {
      alert('Inserisci un nome per il documento');
      return;
    }

    try {
      setUploadingDocument(true);
      await contractsApi.uploadSignedDocument(
        contract.id,
        file,
        documentType,
        documentName
      );
      alert('Documento caricato con successo!');
      setDocumentName('');
      setDocumentType('other');
      setShowUploadModal(false);
      if (documentFileInputRef.current) {
        documentFileInputRef.current.value = '';
      }
      loadContract();
    } catch (error: any) {
      console.error('Errore nel caricamento documento:', error);
      alert(error.response?.data?.error || 'Errore nel caricamento del documento');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!contract) return;

    if (!confirm('Vuoi eliminare questo documento?')) {
      return;
    }

    try {
      await contractsApi.deleteSignedDocument(contract.id, documentId);
      alert('Documento eliminato con successo!');
      loadContract();
    } catch (error: any) {
      console.error('Errore nell\'eliminazione documento:', error);
      alert(error.response?.data?.error || 'Errore nell\'eliminazione del documento');
    }
  };

  const handleDownloadFile = async (fileName: string) => {
    if (!contract) return;

    try {
      const blob = await contractsApi.downloadFile(contract.id, 'contract');
      
      // Verifica che sia un PDF valido
      const firstBytes = await blob.slice(0, 4).arrayBuffer();
      const pdfHeader = new Uint8Array(firstBytes);
      const isPDF = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46; // %PDF
      
      if (!isPDF) {
        const text = await blob.slice(0, 100).text();
        if (text.trim().startsWith('{')) {
          try {
            const errorData = JSON.parse(text);
            alert('Errore: ' + (errorData.error || errorData.message || 'Errore nel download del file'));
            return;
          } catch (e) {
            // Non è JSON
          }
        }
        alert('Errore: Il file ricevuto non è un PDF valido');
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nel download del file:', error);
      alert('Errore nel download del file: ' + (error.response?.data?.error || error.message || 'Errore sconosciuto'));
    }
  };

  const handleDownloadSignedFile = async (fileName: string) => {
    if (!contract) return;

    try {
      const blob = await contractsApi.downloadFile(contract.id, 'signed');
      
      // Verifica che sia un PDF valido
      const firstBytes = await blob.slice(0, 4).arrayBuffer();
      const pdfHeader = new Uint8Array(firstBytes);
      const isPDF = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46; // %PDF
      
      if (!isPDF) {
        const text = await blob.slice(0, 100).text();
        if (text.trim().startsWith('{')) {
          try {
            const errorData = JSON.parse(text);
            alert('Errore: ' + (errorData.error || errorData.message || 'Errore nel download del file'));
            return;
          } catch (e) {
            // Non è JSON
          }
        }
        alert('Errore: Il file ricevuto non è un PDF valido');
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nel download del file firmato:', error);
      alert('Errore nel download del file: ' + (error.response?.data?.error || error.message || 'Errore sconosciuto'));
    }
  };

  const handleDownloadDocument = async (documentId: number, fileName: string) => {
    if (!contract) return;

    try {
      const blob = await contractsApi.downloadSignedDocument(contract.id, documentId);
      
      // Verifica che sia un PDF valido
      const firstBytes = await blob.slice(0, 4).arrayBuffer();
      const pdfHeader = new Uint8Array(firstBytes);
      const isPDF = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46; // %PDF
      
      if (!isPDF) {
        const text = await blob.slice(0, 100).text();
        if (text.trim().startsWith('{')) {
          try {
            const errorData = JSON.parse(text);
            alert('Errore: ' + (errorData.error || errorData.message || 'Errore nel download del file'));
            return;
          } catch (e) {
            // Non è JSON
          }
        }
        alert('Errore: Il file ricevuto non è un PDF valido');
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nel download del documento:', error);
      alert('Errore nel download del file: ' + (error.response?.data?.error || error.message || 'Errore sconosciuto'));
    }
  };

  if (loading) {
    return (
      <div className="seller-contract-detail-page seller-contract-detail-skeleton">
        <div className="seller-detail-skeleton-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
          <div className="skeleton-line skeleton-pulse-fill w-1/2" style={{ height: 32, marginTop: 8 }} />
        </div>
        <div className="seller-detail-skeleton-content">
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="seller-contract-detail-empty">
        <h3>Contratto non trovato</h3>
        <button 
          className="seller-contract-detail-download-btn"
          onClick={() => navigate('/seller/contratti')}
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(contract.status);
  
  // Verifica documenti obbligatori
  const hasContractSigned = !!contract.signed_file;
  const hasConsent = contract.signedDocuments?.some(doc => doc.document_type === 'consent_personal_data') || false;
  
  // Get supplementary documents (exclude mandatory consent if only one exists)
  const supplementaryDocuments = contract.signedDocuments?.filter(doc => {
    if (doc.document_type === 'consent_personal_data') {
      const consentDocs = contract.signedDocuments!.filter(d => d.document_type === 'consent_personal_data');
      return consentDocs.length > 1; // Only show if there are multiple consent docs
    }
    return true;
  }) || [];

  const clientInitials = getInitials(contract.client?.company_name || 'Cliente');

  return (
    <div className="seller-contract-detail-page">
      {/* Unified Header */}
      <div className="seller-contract-detail-header">
        <div className="seller-contract-detail-header-left">
          <button 
            className="seller-contract-detail-back-btn"
            onClick={() => navigate('/seller/contratti')}
            aria-label="Indietro"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="seller-contract-detail-header-title-group">
            <h1 className="seller-contract-detail-title">{contract.title || contract.contract_number}</h1>
            <div className="seller-contract-detail-header-meta">
              <span className="seller-contract-detail-id-badge">{contract.contract_number}</span>
              <span className={statusBadge.badgeClass}>
                {statusBadge.label}
              </span>
            </div>
          </div>
        </div>
        <div className="seller-contract-detail-header-actions">
          {contract.contract_file && (
            <button
              className="seller-contract-detail-download-btn"
              onClick={() => handleDownloadFile(`contratto_${contract.contract_number}.pdf`)}
            >
              <Download size={16} />
              Scarica Contratto
            </button>
          )}
        </div>
      </div>

      {/* Main Content - Asymmetric Grid */}
      <div className="seller-contract-detail-container">
        <div className="seller-contract-detail-grid">
          {/* Left Column - Main Content (Span 2) */}
          <div className="seller-contract-detail-main-column">
            {/* Card 1: Contract Scope */}
            <div className="seller-contract-detail-card">
              <div className="seller-contract-detail-card-title">
                <FileText size={20} />
                <span>Ambito Contratto</span>
              </div>
              {contract.title && (
                <div className="seller-contract-detail-scope-content">
                  {contract.title}
                </div>
              )}
              {contract.description && (
                <div className="seller-contract-detail-scope-content">
                  {contract.description}
                </div>
              )}
              
              {/* Linked Quote Reference Row (iOS Settings Style) */}
              {contract.quote && (
                <div 
                  className="seller-contract-detail-quote-link"
                  onClick={() => navigate(`/seller/preventivi/${contract.quote!.id}`)}
                >
                  <div className="seller-contract-detail-quote-link-icon">
                    <FileText size={18} />
                  </div>
                  <div className="seller-contract-detail-quote-link-content">
                    <div className="seller-contract-detail-quote-link-label">Preventivo Associato</div>
                    <div className="seller-contract-detail-quote-link-title">
                      {contract.quote.quote_number} - {contract.quote.title || 'Preventivo'}
                    </div>
                  </div>
                  <div className="seller-contract-detail-quote-link-amount">
                    € {contract.quote.total_amount?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0,00'}
                  </div>
                  <ChevronRight size={18} className="seller-contract-detail-quote-link-chevron" />
                </div>
              )}
            </div>

            {/* Card 2: Document Manager (iOS Files Style) */}
            <div className="seller-contract-detail-card">
              <div className="seller-contract-detail-card-title">
                <FileCheck size={20} />
                <span>Documenti & Allegati</span>
              </div>
              
              {/* Existing Documents List */}
              <div className="seller-contract-detail-documents-list">
                {/* Contract File */}
                {contract.contract_file && (
                  <div className="seller-contract-detail-document-row">
                    <div className="seller-contract-detail-document-icon">
                      <FileText size={20} />
                    </div>
                    <div className="seller-contract-detail-document-info">
                      <div className="seller-contract-detail-document-name">Contratto</div>
                      <div className="seller-contract-detail-document-date">
                        Caricato il {new Date(contract.updated_at).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                    <div className="seller-contract-detail-document-actions">
                      <button
                        className="seller-contract-detail-document-action-btn"
                        onClick={() => handleDownloadFile(`contratto_${contract.contract_number}.pdf`)}
                        title="Scarica"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Signed Contract File */}
                {hasContractSigned && (
                  <div className="seller-contract-detail-document-row">
                    <div className="seller-contract-detail-document-icon">
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="seller-contract-detail-document-info">
                      <div className="seller-contract-detail-document-name">Contratto Firmato</div>
                      <div className="seller-contract-detail-document-date">
                        {contract.signed_at 
                          ? `Firmato il ${new Date(contract.signed_at).toLocaleDateString('it-IT')}`
                          : 'Firmato'
                        }
                      </div>
                    </div>
                    <div className="seller-contract-detail-document-actions">
                      <button
                        className="seller-contract-detail-document-action-btn"
                        onClick={() => handleDownloadSignedFile(`contratto_firmato_${contract.contract_number}.pdf`)}
                        title="Scarica"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Consent Document */}
                {hasConsent && (() => {
                  const consentDoc = contract.signedDocuments?.find(doc => doc.document_type === 'consent_personal_data');
                  return consentDoc ? (
                    <div className="seller-contract-detail-document-row">
                      <div className="seller-contract-detail-document-icon">
                        <FileCheck size={20} />
                      </div>
                      <div className="seller-contract-detail-document-info">
                        <div className="seller-contract-detail-document-name">Consenso Trattamento Dati</div>
                        <div className="seller-contract-detail-document-date">
                          {consentDoc.signed_at 
                            ? `Salvato il ${new Date(consentDoc.signed_at).toLocaleDateString('it-IT')}`
                            : 'Salvato'
                          }
                        </div>
                      </div>
                      <div className="seller-contract-detail-document-actions">
                        {consentDoc.external_url ? (
                          <a
                            href={consentDoc.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="seller-contract-detail-document-action-btn"
                            title="Apri Link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={16} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Supplementary Documents */}
                {supplementaryDocuments.map((doc) => (
                  <div key={doc.id} className="seller-contract-detail-document-row">
                    <div className="seller-contract-detail-document-icon">
                      <FileText size={20} />
                    </div>
                    <div className="seller-contract-detail-document-info">
                      <div className="seller-contract-detail-document-name">{doc.document_name || 'Documento'}</div>
                      <div className="seller-contract-detail-document-date">
                        {doc.signed_at 
                          ? `Firmato il ${new Date(doc.signed_at).toLocaleDateString('it-IT')}`
                          : 'Documento'
                        }
                      </div>
                    </div>
                    <div className="seller-contract-detail-document-actions">
                      {doc.external_url ? (
                        <a
                          href={doc.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="seller-contract-detail-document-action-btn"
                          title="Apri Link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={16} />
                        </a>
                      ) : doc.file_path ? (
                        <button
                          className="seller-contract-detail-document-action-btn"
                          onClick={() => handleDownloadDocument(doc.id, doc.document_name || 'documento.pdf')}
                          title="Scarica"
                        >
                          <Download size={16} />
                        </button>
                      ) : null}
                      <button
                        className="seller-contract-detail-document-action-btn seller-contract-detail-document-action-btn-danger"
                        onClick={() => handleDeleteDocument(doc.id)}
                        title="Elimina"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Document Button / Upload Area */}
              {contract.status === 'pending_signature' && (
                <div className="seller-contract-detail-upload-area">
                  <button
                    className="seller-contract-detail-add-document-btn"
                    onClick={() => setShowUploadModal(true)}
                  >
                    <Plus size={16} />
                    Aggiungi Documento
                  </button>
                </div>
              )}

              {/* Upload Signed Contract (if pending signature) */}
              {contract.contract_file && contract.status === 'pending_signature' && !hasContractSigned && (
                <div className="seller-contract-detail-upload-area" style={{ marginTop: '1rem' }}>
                  <input
                    ref={contractSignedFileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleUploadContractSigned}
                    disabled={uploadingSigned}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="seller-contract-detail-add-document-btn"
                    onClick={() => contractSignedFileInputRef.current?.click()}
                    disabled={uploadingSigned}
                  >
                    <Upload size={16} />
                    {uploadingSigned ? 'Caricamento...' : 'Carica Contratto Firmato'}
                  </button>
                </div>
              )}

              {/* Consent URL Input (if pending signature) - Hidden in modal */}
              {contract.contract_file && contract.status === 'pending_signature' && !hasConsent && (
                <div className="seller-contract-detail-upload-area" style={{ marginTop: '1rem' }}>
                  <button
                    className="seller-contract-detail-add-document-btn"
                    onClick={() => {
                      // Open a simple prompt for URL
                      const url = prompt('Incolla qui il link di Google Drive per il consenso:');
                      if (url && url.trim()) {
                        setConsentGoogleDriveUrl(url.trim());
                        setTimeout(() => handleSaveConsentUrl(), 100);
                      }
                    }}
                    disabled={uploadingDocument}
                  >
                    <Plus size={16} />
                    Aggiungi Link Consenso
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sticky Sidebar (Span 1) */}
          <div className="seller-contract-detail-sidebar">
            {/* Card 1: Value & Timeline */}
            <div className="seller-contract-detail-inspector-card seller-contract-detail-value-card">
              <div className="seller-contract-detail-inspector-card-header">
                <DollarSign size={20} />
                <span>Valore & Timeline</span>
              </div>
              {contract.total_value && (
                <div className="seller-contract-detail-value-amount">
                  € {contract.total_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </div>
              )}
              <div className="seller-contract-detail-timeline">
                {contract.start_date && (
                  <div className="seller-contract-detail-timeline-item">
                    <div className="seller-contract-detail-timeline-label">Data Inizio</div>
                    <div className="seller-contract-detail-timeline-value">
                      {new Date(contract.start_date).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                {contract.end_date && (
                  <div className="seller-contract-detail-timeline-item">
                    <div className="seller-contract-detail-timeline-label">Data Fine</div>
                    <div className="seller-contract-detail-timeline-value">
                      {new Date(contract.end_date).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                <div className="seller-contract-detail-timeline-item">
                  <div className="seller-contract-detail-timeline-label">Data Creazione</div>
                  <div className="seller-contract-detail-timeline-value">
                    {new Date(contract.created_at).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Client Info */}
            {contract.client && (
              <div className="seller-contract-detail-inspector-card seller-contract-detail-client-card">
                <div className="seller-contract-detail-client-row">
                  <div className="seller-contract-detail-client-avatar">
                    {clientInitials}
                  </div>
                  <div className="seller-contract-detail-client-info">
                    <div className="seller-contract-detail-client-name">
                      {contract.client.company_name || '-'}
                    </div>
                    {contract.client.email && (
                      <div className="seller-contract-detail-client-email">
                        {contract.client.email}
                      </div>
                    )}
                  </div>
                  {contract.client_id && (
                    <button
                      className="seller-contract-detail-document-action-btn"
                      onClick={() => navigate(`/seller/clienti/${contract.client_id}`)}
                      title="Vai al Cliente"
                    >
                      <User size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
      {showUploadModal && (
        <motion.div
          className="seller-contract-detail-upload-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => setShowUploadModal(false)}
        >
          <motion.div
            className="seller-contract-detail-upload-modal-content"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="seller-contract-detail-upload-modal-header">
              <h3 className="seller-contract-detail-upload-modal-title">Aggiungi Documento</h3>
              <button
                className="seller-contract-detail-upload-modal-close"
                onClick={() => setShowUploadModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="seller-contract-detail-upload-form-group">
              <label className="seller-contract-detail-upload-form-label">Tipo Documento</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as any)}
                className="seller-contract-detail-upload-form-select"
              >
                <option value="privacy_policy">Privacy Policy</option>
                <option value="consent_personal_data">Consenso Trattamento Dati</option>
                <option value="other">Altro</option>
              </select>
            </div>
            <div className="seller-contract-detail-upload-form-group">
              <label className="seller-contract-detail-upload-form-label">Nome Documento</label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Es: Privacy Policy v2.0"
                className="seller-contract-detail-upload-form-input"
              />
            </div>
            <div className="seller-contract-detail-upload-form-actions">
              <button
                className="seller-contract-detail-upload-form-btn seller-contract-detail-upload-form-btn-secondary"
                onClick={() => {
                  setShowUploadModal(false);
                  setDocumentName('');
                  setDocumentType('other');
                }}
              >
                Annulla
              </button>
              <input
                ref={documentFileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleUploadDocument}
                disabled={uploadingDocument}
                style={{ display: 'none' }}
              />
              <button
                className="seller-contract-detail-upload-form-btn seller-contract-detail-upload-form-btn-primary"
                onClick={() => documentFileInputRef.current?.click()}
                disabled={uploadingDocument || !documentName.trim()}
              >
                <Upload size={16} />
                {uploadingDocument ? 'Caricamento...' : 'Carica Documento'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default SellerContractDetailPage;
