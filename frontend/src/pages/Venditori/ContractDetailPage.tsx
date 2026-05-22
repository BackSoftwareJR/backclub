import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  User, 
  Building2, 
  Upload,
  FileCheck,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import contractsApi from '../../api/contracts';
import quotesApi from '../../api/quotes';
import { paymentPlansApi } from '../../api/paymentPlans';
import type { Contract } from '../../types/sellers';
import './ContractDetailPage.css';

const ContractDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const [startingProject, setStartingProject] = useState(false);
  const [isRevision, setIsRevision] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [verifyingDocuments, setVerifyingDocuments] = useState(false);
  const [documentType, setDocumentType] = useState<'privacy_policy' | 'consent_personal_data' | 'other'>('other');
  const [documentName, setDocumentName] = useState('');
  const [consentGoogleDriveUrl, setConsentGoogleDriveUrl] = useState('');
  const [creatingPaymentPlan, setCreatingPaymentPlan] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contractSignedFileInputRef = useRef<HTMLInputElement>(null);
  const documentFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadContract();
    }
  }, [id]);

  // Debug: monitora i cambiamenti del contratto e signedDocuments
  useEffect(() => {
    if (contract) {
      const hasConsent = contract.signedDocuments?.some(doc => doc.document_type === 'consent_personal_data') || false;
      console.log('Contract updated - hasConsent:', hasConsent, 'signedDocuments:', contract.signedDocuments);
    }
  }, [contract]);

  const loadContract = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      console.log('Caricamento contratto ID:', id);
      
      // Aggiungi un timestamp per evitare cache
      const data = await contractsApi.getById(Number(id));
      
      console.log('=== DETTAGLI RISPOSTA API ===');
      console.log('Tipo di data:', typeof data);
      console.log('Data completa:', data);
      console.log('Data.signedDocuments:', data.signedDocuments);
      console.log('Data.signed_documents:', (data as any).signed_documents);
      console.log('Chiavi di data:', Object.keys(data));
      console.log('Data.signedDocuments tipo:', typeof data.signedDocuments);
      console.log('Data.signedDocuments è array?', Array.isArray(data.signedDocuments));
      console.log('Numero signedDocuments:', data.signedDocuments?.length || 0);
      
      // Prova sia camelCase che snake_case (Laravel potrebbe usare snake_case quando converte in array)
      const signedDocs = data.signedDocuments || (data as any).signed_documents || [];
      console.log('SignedDocs (camelCase o snake_case):', signedDocs);
      console.log('SignedDocs è array?', Array.isArray(signedDocs));
      console.log('SignedDocs length:', signedDocs.length);
      
      if (Array.isArray(signedDocs) && signedDocs.length > 0) {
        console.log('Primo signedDocument:', signedDocs[0]);
        const consentDoc = signedDocs.find((doc: any) => doc.document_type === 'consent_personal_data');
        console.log('ConsentDoc trovato:', consentDoc);
        if (consentDoc) {
          console.log('ConsentDoc external_url:', consentDoc.external_url);
        }
      } else {
        console.warn('ATTENZIONE: signedDocuments è vuoto o undefined!');
      }
      
      // Forza un nuovo oggetto per assicurare che React rilevi il cambiamento
      const contractData = {
        ...data,
        signedDocuments: Array.isArray(signedDocs) ? signedDocs.map((doc: any) => ({ ...doc })) : []
      };
      
      // Crea un nuovo oggetto completamente nuovo per forzare il re-render
      const newContract = JSON.parse(JSON.stringify(contractData));
      
      console.log('=== CONTRATTO DA IMPOSTARE ===');
      console.log('newContract.signedDocuments:', newContract.signedDocuments);
      console.log('newContract.signedDocuments.length:', newContract.signedDocuments?.length || 0);
      
      setContract(newContract);
      
      // Debug: verifica che i signedDocuments siano caricati
      console.log('=== CONTRATTO RICARICATO ===');
      console.log('ID:', newContract.id);
      console.log('SignedDocuments:', newContract.signedDocuments);
      console.log('SignedDocumentsCount:', newContract.signedDocuments?.length || 0);
      console.log('hasConsent:', newContract.signedDocuments?.some((doc: any) => doc.document_type === 'consent_personal_data') || false);
      console.log('consentDoc:', newContract.signedDocuments?.find((doc: any) => doc.document_type === 'consent_personal_data'));
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
    const badges: Record<string, { label: string; class: string; icon: any }> = {
      draft: { label: 'Bozza', class: 'warning', icon: FileText },
      requested: { label: 'Richiesta', class: 'info', icon: Clock },
      pending_signature: { label: 'In Attesa di Firma', class: 'warning', icon: AlertCircle },
      active: { label: 'Attivo', class: 'success', icon: CheckCircle2 },
      suspended: { label: 'Sospeso', class: 'danger', icon: XCircle },
      completed: { label: 'Completato', class: 'info', icon: CheckCircle2 },
      terminated: { label: 'Terminato', class: 'danger', icon: XCircle },
    };
    return badges[status] || { label: status, class: '', icon: FileText };
  };

  const handleUploadContract = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contract) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      if (isRevision) {
        formData.append('is_revision', 'true');
        if (revisionNotes) {
          formData.append('revision_notes', revisionNotes);
        }
      }

      await contractsApi.uploadFile(contract.id, file, isRevision, revisionNotes);
      
      if (!isRevision) {
        // Se non è una revisione, lo stato passa automaticamente a "pending_signature"
        alert('Contratto caricato con successo! Lo stato è stato aggiornato a "In Attesa di Firma".');
      } else {
        alert('Revisione caricata con successo!');
      }
      
      setIsRevision(false);
      setRevisionNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadContract();
    } catch (error: any) {
      console.error('Errore nel caricamento contratto:', error);
      alert(error.response?.data?.error || 'Errore nel caricamento del contratto');
    } finally {
      setUploading(false);
    }
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
      const response = await contractsApi.uploadSignedDocumentUrl(
        contract.id,
        consentGoogleDriveUrl,
        'consent_personal_data',
        'Consenso Trattamento Dati Personali'
      );
      console.log('Consenso salvato, risposta completa:', response);
      
      setConsentGoogleDriveUrl('');
      
      // Svuota il campo input
      setConsentGoogleDriveUrl('');
      
      // Aspetta un po' per assicurarsi che il database abbia committato la transazione
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Forza sempre un ricaricamento completo del contratto per assicurarsi che i dati siano aggiornati
      console.log('Ricaricamento contratto dopo salvataggio...');
      await loadContract(false);
      
      // Verifica che il contratto sia stato aggiornato correttamente
      setTimeout(() => {
        const currentContract = contract;
        const hasConsent = currentContract?.signedDocuments?.some((doc: any) => doc.document_type === 'consent_personal_data' && doc.external_url) || false;
        console.log('Verifica finale - hasConsent:', hasConsent);
        if (!hasConsent) {
          console.warn('Il consenso non è stato trovato, ricarico di nuovo...');
          loadContract(false);
        }
      }, 500);
      
      alert('Link Google Drive salvato con successo!');
    } catch (error: any) {
      console.error('Errore nel salvataggio consenso:', error);
      alert(error.response?.data?.error || 'Errore nel salvataggio del link');
    } finally {
      setUploadingDocument(false);
    }
  };


  const handleStartProject = async () => {
    if (!contract) return;

    if (!confirm('Vuoi avviare il progetto da questo contratto?')) {
      return;
    }

    try {
      setStartingProject(true);
      await contractsApi.startProject(contract.id);
      alert('Progetto avviato con successo!');
      loadContract();
    } catch (error: any) {
      console.error('Errore nell\'avvio progetto:', error);
      alert(error.response?.data?.error || 'Errore nell\'avvio del progetto');
    } finally {
      setStartingProject(false);
    }
  };

  const handleCreatePaymentPlan = async () => {
    if (!contract) return;

    if (!confirm('Vuoi generare automaticamente il piano di pagamento da questo contratto?\n\nIl sistema creerà le rate in base alle modalità di pagamento del preventivo.')) {
      return;
    }

    try {
      setCreatingPaymentPlan(true);
      await paymentPlansApi.generateFromContract(contract.id);
      alert('Piano di pagamento creato con successo!');
      // Naviga alla pagina dei piani di pagamento
      navigate('/segreteria/fatture?tab=piani');
    } catch (error: any) {
      console.error('Errore nella creazione piano di pagamento:', error);
      alert(error.response?.data?.message || error.response?.data?.error || 'Errore nella creazione del piano di pagamento');
    } finally {
      setCreatingPaymentPlan(false);
    }
  };

  const handleVerifyAndActivate = async () => {
    if (!contract) return;

    const message = `Hai controllato che:
• Le firme siano su tutte le pagine
• Ci sia la data su ogni firma
• Il contratto sia controfirmato da entrambe le parti
• Il consenso trattamento dati sia completo e firmato

Vuoi attivare il contratto?`;

    if (!confirm(message)) {
      return;
    }

    try {
      setVerifyingDocuments(true);
      await contractsApi.updateStatus(contract.id, 'active');
      alert('Contratto attivato con successo!');
      loadContract();
    } catch (error: any) {
      console.error('Errore nell\'attivazione contratto:', error);
      alert(error.response?.data?.error || 'Errore nell\'attivazione del contratto');
    } finally {
      setVerifyingDocuments(false);
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

  const handleDownloadQuotePDF = async () => {
    if (!contract?.quote) return;

    try {
      const response = await quotesApi.generatePDF(contract.quote.id);
      
      const blob = response.data instanceof Blob 
        ? response.data 
        : new Blob([response.data], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `preventivo_${contract.quote.quote_number}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nella generazione PDF:', error);
      alert('Errore nella generazione del PDF');
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    if (!filePath || !contract) return;

    try {
      // Usa l'endpoint API per scaricare il file
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
      // Usa l'endpoint API per scaricare il file firmato
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

  const handleDownloadRevision = async (revisionId: number, fileName: string) => {
    if (!contract) return;

    try {
      const blob = await contractsApi.downloadRevision(contract.id, revisionId);
      
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
      console.error('Errore nel download della revisione:', error);
      alert('Errore nel download del file: ' + (error.response?.data?.error || error.message || 'Errore sconosciuto'));
    }
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="venditori-empty-state">
        <h3>Contratto non trovato</h3>
        <button 
          className="venditori-btn venditori-btn-primary"
          onClick={() => navigate(-1)}
        >
          Torna alla lista
        </button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(contract.status);
  const StatusIcon = statusBadge.icon;
  const isSigned = contract.signed_file && contract.signed_at;
  const canStartProject = isSigned && !contract.crm_project_id;
  
  // Verifica documenti obbligatori
  const hasContractSigned = !!contract.signed_file;
  const hasConsent = contract.signedDocuments?.some(doc => doc.document_type === 'consent_personal_data') || false;
  const allDocumentsReady = hasContractSigned && hasConsent;

  return (
    <div className="contract-detail-page">
      <div className="detail-header">
        <button 
          className="btn-back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          Indietro
        </button>
        <div className="detail-header-content">
          <div>
            <h1 className="venditori-page-title">{contract.title || contract.contract_number}</h1>
            <div className="quote-header-info">
              <span className="quote-number-badge">{contract.contract_number}</span>
              <span className={`venditori-badge venditori-badge-${statusBadge.class}`}>
                <StatusIcon size={14} />
                {statusBadge.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-content-grid">
        {/* Informazioni Principali */}
        <div className="detail-card">
          <div className="detail-card-title">
            <FileText size={20} />
            Informazioni Contratto
          </div>
          <div className="detail-info-list">
            <div className="detail-info-item">
              <span className="info-label">Numero Contratto</span>
              <span className="info-value">{contract.contract_number}</span>
            </div>
            <div className="detail-info-item">
              <span className="info-label">Titolo</span>
              <span className="info-value">{contract.title || '-'}</span>
            </div>
            {contract.contract_type && (
              <div className="detail-info-item">
                <span className="info-label">Tipo Contratto</span>
                <span className="info-value">{contract.contract_type}</span>
              </div>
            )}
            <div className="detail-info-item">
              <span className="info-label">Data Creazione</span>
              <span className="info-value">
                {new Date(contract.created_at).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {contract.start_date && (
              <div className="detail-info-item">
                <span className="info-label">Data Inizio</span>
                <span className="info-value">
                  {new Date(contract.start_date).toLocaleDateString('it-IT')}
                </span>
              </div>
            )}
            {contract.end_date && (
              <div className="detail-info-item">
                <span className="info-label">Data Fine</span>
                <span className="info-value">
                  {new Date(contract.end_date).toLocaleDateString('it-IT')}
                </span>
              </div>
            )}
            {contract.total_value && (
              <div className="detail-info-item highlight">
                <span className="info-label">Valore Totale</span>
                <span className="info-value price-value total-value">
                  € {contract.total_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>


        {/* Cliente */}
        <div className="detail-card">
          <div className="detail-card-title">
            <Building2 size={20} />
            Cliente
          </div>
          <div className="detail-info-list">
            <div className="detail-info-item">
              <span className="info-label">Ragione Sociale</span>
              <span className="info-value">{contract.client?.company_name || '-'}</span>
            </div>
            {contract.client?.email && (
              <div className="detail-info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{contract.client.email}</span>
              </div>
            )}
            {contract.client?.phone && (
              <div className="detail-info-item">
                <span className="info-label">Telefono</span>
                <span className="info-value">{contract.client.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Venditore */}
        {contract.seller && (
          <div className="detail-card">
            <div className="detail-card-title">
              <User size={20} />
              Venditore
            </div>
            <div className="detail-info-list">
              <div className="detail-info-item">
                <span className="info-label">Nome</span>
                <span className="info-value">{contract.seller.user?.name || '-'}</span>
              </div>
              {contract.seller.user?.email && (
                <div className="detail-info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{contract.seller.user.email}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preventivo Associato */}
        {contract.quote && (
          <div className="detail-card full-width">
            <div className="detail-card-title">
              <FileText size={20} />
              Preventivo Associato
            </div>
            <div className="detail-info-list">
              <div className="detail-info-item">
                <span className="info-label">Numero Preventivo</span>
                <span className="info-value">{contract.quote.quote_number}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Titolo</span>
                <span className="info-value">{contract.quote.title || '-'}</span>
              </div>
              <div className="detail-info-item">
                <span className="info-label">Totale</span>
                <span className="info-value price-value">
                  € {contract.quote.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                className="venditori-btn venditori-btn-secondary"
                onClick={handleDownloadQuotePDF}
                style={{ marginTop: 'var(--spacing-4)' }}
              >
                <Download size={16} />
                Scarica PDF Preventivo
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Carica Contratto */}
        {(contract.status === 'requested' || contract.status === 'draft' || contract.contract_file || contract.status === 'pending_signature') && (
          <div className="detail-card full-width workflow-step">
            <div className="workflow-step-header">
              <div className="workflow-step-number">1</div>
              <div className="workflow-step-title">
                <Upload size={20} />
                <div>
                  <h3>Carica Contratto</h3>
                  <p className="workflow-step-description">
                    Carica il contratto da inviare al cliente. Una volta caricato, lo stato passerà automaticamente a "In Attesa di Firma".
                  </p>
                </div>
              </div>
            </div>
            
            <div className="upload-section">
              {contract.contract_file ? (
                <div className="file-info">
                  <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
                  <div>
                    <div className="file-name">Contratto caricato</div>
                    <div className="file-date">
                      Caricato il {new Date(contract.updated_at).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(contract.contract_file!, `contratto_${contract.contract_number}.pdf`)}
                    className="venditori-btn venditori-btn-secondary"
                  >
                    <Download size={16} />
                    Scarica
                  </button>
                </div>
              ) : (
                <p className="no-file">Nessun contratto caricato</p>
              )}
              
              <div className="upload-actions">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isRevision}
                    onChange={(e) => setIsRevision(e.target.checked)}
                  />
                  <span>Carica come revisione</span>
                </label>
                
                {isRevision && (
                  <textarea
                    className="revision-notes"
                    placeholder="Note sulla revisione (opzionale)"
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    rows={3}
                  />
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleUploadContract}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                <button
                  className="venditori-btn venditori-btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload size={16} />
                  {uploading ? 'Caricamento...' : (isRevision ? 'Carica Revisione' : 'Carica Contratto')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Carica Documenti Firmati Obbligatori */}
        {contract.contract_file && contract.status === 'pending_signature' && (
          <div className="detail-card full-width workflow-step">
            <div className="workflow-step-header">
              <div className="workflow-step-number">2</div>
              <div className="workflow-step-title">
                <FileCheck size={20} />
                <div>
                  <h3>Carica Documenti Firmati</h3>
                  <p className="workflow-step-description">
                    Carica i documenti firmati obbligatori. Una volta completati, potrai attivare il contratto.
                  </p>
                </div>
              </div>
            </div>

            <div className="upload-section">
              {/* Checklist Documenti Obbligatori */}
              <div className="documents-checklist">
                <div className={`checklist-item ${hasContractSigned ? 'completed' : ''}`}>
                  <div className="checklist-icon">
                    {hasContractSigned ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="checklist-content">
                    <div className="checklist-title">Contratto Firmato</div>
                    <div className="checklist-description">Contratto firmato da entrambe le parti</div>
                    {hasContractSigned && contract.signed_at && (
                      <div className="checklist-date">
                        Firmato il {new Date(contract.signed_at).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </div>
                  {hasContractSigned ? (
                    <button
                      onClick={() => handleDownloadSignedFile(`contratto_firmato_${contract.contract_number}.pdf`)}
                      className="venditori-btn venditori-btn-secondary"
                    >
                      <Download size={16} />
                      Scarica
                    </button>
                  ) : (
                    <>
                      <input
                        ref={contractSignedFileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleUploadContractSigned}
                        disabled={uploadingSigned}
                        style={{ display: 'none' }}
                      />
                      <button
                        className="venditori-btn venditori-btn-primary"
                        onClick={() => contractSignedFileInputRef.current?.click()}
                        disabled={uploadingSigned}
                      >
                        <Upload size={16} />
                        {uploadingSigned ? 'Caricamento...' : 'Carica'}
                      </button>
                    </>
                  )}
                </div>

                <div className={`checklist-item ${hasConsent ? 'completed' : ''}`}>
                  <div className="checklist-icon">
                    {hasConsent ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="checklist-content">
                    <div className="checklist-title">Consenso Trattamento Dati Personali</div>
                    <div className="checklist-description">Link Google Drive del documento di consenso firmato</div>
                    {hasConsent && contract.signedDocuments?.find(doc => doc.document_type === 'consent_personal_data')?.signed_at && (
                      <div className="checklist-date">
                        Salvato il {new Date(contract.signedDocuments.find(doc => doc.document_type === 'consent_personal_data')!.signed_at!).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </div>
                  {hasConsent ? (
                    (() => {
                      const consentDoc = contract.signedDocuments?.find(doc => doc.document_type === 'consent_personal_data');
                      const url = consentDoc?.external_url;
                      return url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="venditori-btn venditori-btn-secondary"
                        >
                          <Download size={16} />
                          Apri Link
                        </a>
                      ) : null;
                    })()
                  ) : (
                    <div className="consent-url-input-group">
                      <input
                        type="url"
                        value={consentGoogleDriveUrl}
                        onChange={(e) => setConsentGoogleDriveUrl(e.target.value)}
                        placeholder="Incolla qui il link di Google Drive"
                        className="venditori-input"
                        disabled={uploadingDocument}
                        style={{ minWidth: '300px', marginRight: 'var(--spacing-2)' }}
                      />
                      <button
                        className="venditori-btn venditori-btn-primary"
                        onClick={handleSaveConsentUrl}
                        disabled={uploadingDocument || !consentGoogleDriveUrl.trim()}
                      >
                        {uploadingDocument ? 'Salvataggio...' : 'Salva Link'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messaggio di verifica e attivazione */}
              {allDocumentsReady && contract.status === 'pending_signature' && (
                <div className="verification-box">
                  <div className="verification-header">
                    <AlertCircle size={24} />
                    <h4>Verifica Documenti</h4>
                  </div>
                  <div className="verification-checklist">
                    <p>Prima di attivare il contratto, verifica che:</p>
                    <ul>
                      <li>Le firme siano presenti su tutte le pagine</li>
                      <li>Ci sia la data su ogni firma</li>
                      <li>Il contratto sia controfirmato da entrambe le parti</li>
                      <li>Il consenso trattamento dati sia completo e firmato</li>
                    </ul>
                  </div>
                  <button
                    className="venditori-btn venditori-btn-primary"
                    onClick={handleVerifyAndActivate}
                    disabled={verifyingDocuments}
                  >
                    <CheckCircle2 size={18} />
                    {verifyingDocuments ? 'Attivazione in corso...' : 'Sì, ho verificato - Attiva Contratto'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documenti Firmati Obbligatori - Sempre visibili per download */}
        {(hasContractSigned || hasConsent) && (
          <div className="detail-card full-width">
            <div className="detail-card-title">
              <FileCheck size={20} />
              Documenti Firmati Obbligatori
            </div>
            <div className="upload-section">
              <div className="documents-checklist">
                {hasContractSigned && (
                  <div className="checklist-item completed">
                    <div className="checklist-icon">
                      <CheckCircle2 size={20} />
                    </div>
                    <div className="checklist-content">
                      <div className="checklist-title">Contratto Firmato</div>
                      <div className="checklist-description">Contratto firmato da entrambe le parti</div>
                      {contract.signed_at && (
                        <div className="checklist-date">
                          Firmato il {new Date(contract.signed_at).toLocaleDateString('it-IT')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownloadSignedFile(`contratto_firmato_${contract.contract_number}.pdf`)}
                      className="venditori-btn venditori-btn-secondary"
                    >
                      <Download size={16} />
                      Scarica
                    </button>
                  </div>
                )}

                {hasConsent && (() => {
                  const consentDoc = contract.signedDocuments?.find(doc => doc.document_type === 'consent_personal_data');
                  const url = consentDoc?.external_url;
                  return (
                    <div className="checklist-item completed">
                      <div className="checklist-icon">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="checklist-content">
                        <div className="checklist-title">Consenso Trattamento Dati Personali</div>
                        <div className="checklist-description">Link Google Drive del documento di consenso firmato</div>
                        {consentDoc?.signed_at && (
                          <div className="checklist-date">
                            Salvato il {new Date(consentDoc.signed_at).toLocaleDateString('it-IT')}
                          </div>
                        )}
                      </div>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="venditori-btn venditori-btn-secondary"
                        >
                          <Download size={16} />
                          Apri Link
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Documenti Firmati Supplementari - Sempre visibile */}
        <div className="detail-card full-width">
          <div className="detail-card-title">
            <FileCheck size={20} />
            Documenti Firmati Supplementari
          </div>
          <div className="upload-section">
            <p className="section-description">
              Carica documenti aggiuntivi firmati (privacy policy, altri documenti, ecc.)
            </p>
              
              {/* Form caricamento nuovo documento */}
              <div className="document-upload-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo Documento</label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value as any)}
                      className="venditori-input"
                    >
                      <option value="privacy_policy">Privacy Policy</option>
                      <option value="consent_personal_data">Consenso Trattamento Dati</option>
                      <option value="other">Altro</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Nome Documento</label>
                    <input
                      type="text"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      placeholder="Es: Privacy Policy v2.0"
                      className="venditori-input"
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <input
                    ref={documentFileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleUploadDocument}
                    disabled={uploadingDocument}
                    style={{ display: 'none' }}
                  />
                  <button
                    className="venditori-btn venditori-btn-primary"
                    onClick={() => documentFileInputRef.current?.click()}
                    disabled={uploadingDocument || !documentName.trim()}
                  >
                    <Upload size={16} />
                    {uploadingDocument ? 'Caricamento...' : 'Carica Documento'}
                  </button>
                </div>
              </div>

              {/* Lista documenti supplementari (esclusi quelli obbligatori) */}
              {contract.signedDocuments && contract.signedDocuments.length > 0 && (
                <div className="supplementary-documents-list">
                  {contract.signedDocuments
                    .filter(doc => {
                      // Mostra solo documenti che non sono il consenso obbligatorio già mostrato in STEP 2
                      // oppure documenti di tipo 'other' o 'privacy_policy'
                      return doc.document_type !== 'consent_personal_data' || 
                             (doc.document_type === 'consent_personal_data' && contract.signedDocuments!.filter(d => d.document_type === 'consent_personal_data').length > 1);
                    })
                    .map((doc) => (
                      <div key={doc.id} className="document-item">
                        <div className="document-info">
                          <FileText size={16} />
                          <div>
                            <div className="document-name">{doc.document_name}</div>
                            <div className="document-meta">
                              {doc.document_type === 'privacy_policy' && 'Privacy Policy'}
                              {doc.document_type === 'consent_personal_data' && 'Consenso Dati Personali'}
                              {doc.document_type === 'other' && 'Altro'}
                              {doc.signed_at && ` • Firmato il ${new Date(doc.signed_at).toLocaleDateString('it-IT')}`}
                            </div>
                          </div>
                        </div>
                        <div className="document-actions">
                          {doc.external_url ? (
                            <a
                              href={doc.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="venditori-btn venditori-btn-secondary"
                            >
                              <Download size={14} />
                              Apri Link
                            </a>
                          ) : doc.file_path ? (
                            <button
                              onClick={() => handleDownloadDocument(doc.id, doc.document_name || 'documento.pdf')}
                              className="venditori-btn venditori-btn-secondary"
                            >
                              <Download size={14} />
                              Scarica
                            </button>
                          ) : null}
                          <button
                            className="venditori-btn venditori-btn-danger"
                            onClick={() => handleDeleteDocument(doc.id)}
                            style={{ marginLeft: 'var(--spacing-2)' }}
                          >
                            <XCircle size={14} />
                            Elimina
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

        {/* Revisioni */}
        {contract.revisions && contract.revisions.length > 0 && (
          <div className="detail-card full-width">
            <div className="detail-card-title">
              <FileText size={20} />
              Revisioni ({contract.revisions.length})
            </div>
            <div className="revisions-list">
              {contract.revisions.map((revision) => (
                <div key={revision.id} className="revision-item">
                  <div className="revision-header">
                    <span className="revision-number">Revisione {revision.revision_number}</span>
                    <span className="revision-date">
                      {new Date(revision.created_at).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  {revision.notes && (
                    <div className="revision-notes-text">{revision.notes}</div>
                  )}
                  <button
                    onClick={() => handleDownloadRevision(revision.id, `revisione_${revision.revision_number}_${contract.contract_number}.pdf`)}
                    className="revision-download"
                  >
                    <Download size={14} />
                    Scarica
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avvia Progetto */}
        {canStartProject && (
          <div className="detail-card full-width highlight-card">
            <div className="detail-card-title">
              <Play size={20} />
              Avvia Progetto
            </div>
            <p className="action-description">
              Il contratto è stato firmato. Puoi ora avviare il progetto associato.
            </p>
            <button
              className="venditori-btn venditori-btn-primary"
              onClick={handleStartProject}
              disabled={startingProject}
            >
              <Play size={18} />
              {startingProject ? 'Avvio in corso...' : 'Avvia Progetto'}
            </button>
          </div>
        )}

        {/* Progetto Collegato */}
        {contract.crm_project_id && contract.project && (
          <div className="detail-card full-width">
            <div className="detail-card-title">
              <FileText size={20} />
              Progetto Collegato
            </div>
            <div className="detail-info-list">
              <div className="detail-info-item">
                <span className="info-label">Nome Progetto</span>
                <span className="info-value">{contract.project.name || '-'}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-4)', flexWrap: 'wrap' }}>
              <button
                className="venditori-btn venditori-btn-secondary"
                onClick={() => navigate('/progetti-in-attesa')}
              >
                Vai al Progetto
              </button>
                <button
                  className="venditori-btn venditori-btn-primary"
                  onClick={handleCreatePaymentPlan}
                  disabled={creatingPaymentPlan}
                >
                  <CreditCard size={16} />
                  {creatingPaymentPlan ? 'Creazione...' : 'Crea Piano di Pagamento'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractDetailPage;

