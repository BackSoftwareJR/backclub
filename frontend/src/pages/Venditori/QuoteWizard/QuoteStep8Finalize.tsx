import React, { useState, useRef } from 'react';
import { FileText, Mail, CheckCircle2, ChevronRight, Send } from 'lucide-react';
import { quotesApi } from '../../../api/quotes';
import { createClient } from '../../../api/clients';
import type { QuoteWizardData } from '../../../types/quotes';
import './QuoteWizardSteps.css';
import './QuoteStep8Finalize.css';

interface QuoteStep8FinalizeProps {
  wizardData: QuoteWizardData;
  onComplete: () => void;
  isEditMode?: boolean;
  quoteId?: number;
}

const QuoteStep8Finalize: React.FC<QuoteStep8FinalizeProps> = ({
  wizardData,
  onComplete,
  isEditMode = false,
  quoteId: initialQuoteId,
}) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(wizardData.client_info.email || '');
  const [sending, setSending] = useState(false);
  const [quoteId, setQuoteId] = useState<number | null>(initialQuoteId || null);
  const createInProgressRef = useRef(false);

  const handleCreateQuote = async () => {
    if (quoteId) return;
    if (createInProgressRef.current || loading) return;
    createInProgressRef.current = true;
    try {
      setLoading(true);

      // Prepara i dati per la creazione
      const quoteItems = [
        ...wizardData.selectedServices.map(service => {
          const renewalType = service.price_list_item.renewal_type;
          
          const item: any = {
            price_list_item_id: service.price_list_item_id,
            description: service.price_list_item.name,
            quantity: service.quantity,
            unit_price: service.unit_price,
            discount: service.discount,
            total: service.total,
            payment_option: service.payment_option || null,
            notes: service.price_list_item.description || null,
          };
          
          // Gestione rinnovi: se è multi-rinnovo, usa renewal_options (array)
          // Altrimenti usa renewal_option (singolo)
          if (renewalType === 'multi' && service.selected_renewals && service.selected_renewals.length > 0) {
            // Multi-rinnovo: invia array
            item.renewal_options = service.selected_renewals.map(r => ({
              ...r,
              price: r.price,
            }));
            item.renewal_option = null;
          } else if (service.selected_renewal) {
            // Rinnovo singolo (obbligatorio/facoltativo)
            item.renewal_option = {
              ...service.selected_renewal,
              price: service.selected_renewal.price,
            };
            item.renewal_options = null;
          } else {
            // Nessun rinnovo
            item.renewal_option = null;
            item.renewal_options = null;
          }
          
          // Debug: verifica rinnovi
          console.log('QuoteStep8Finalize - Preparazione item:', {
            serviceName: service.price_list_item.name,
            renewalType,
            hasRenewalOption: !!item.renewal_option,
            hasRenewalOptions: !!item.renewal_options,
            renewalOptionsCount: item.renewal_options?.length || 0,
            item: item,
          });
          
          return item;
        }),
        ...wizardData.additionalItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: 0,
          total: item.quantity * item.unit_price,
        })),
      ];

      // Calcola totali
      const subtotal = quoteItems.reduce((sum, item) => sum + item.total, 0);
      
      // Se non c'è un client_id ma ci sono i dati del cliente, crea il cliente
      let finalClientId = wizardData.client_id;
      
      if (!finalClientId && wizardData.client_info.company_name && wizardData.client_info.email) {
        try {
          // Crea il nuovo cliente
          const newClient = await createClient({
            company_name: wizardData.client_info.company_name,
            email: wizardData.client_info.email,
            phone: wizardData.client_info.phone,
            vat_number: wizardData.client_info.vat_number || undefined,
            address: wizardData.client_info.address || undefined,
            is_active: true,
          });
          finalClientId = newClient.id;
        } catch (error: any) {
          console.error('Errore nella creazione cliente:', error);
          throw new Error(`Errore nella creazione del cliente: ${error.message || 'Dati cliente non validi'}`);
        }
      }

      // Verifica che client_id sia presente
      if (!finalClientId) {
        throw new Error('Cliente non selezionato. Torna allo step precedente per selezionare o creare un cliente.');
      }

      // Se è un venditore, gli sconti devono essere sempre 0 (solo admin può applicare sconti)
      const isSeller = !!wizardData.seller_id;
      const finalDiscountPercentage = isSeller ? 0 : (wizardData.discount_percentage || 0);
      const finalDiscountAmount = isSeller ? 0 : (subtotal * (wizardData.discount_percentage / 100));
      const finalSubtotalAfterDiscount = subtotal - finalDiscountAmount;
      const finalTaxAmount = finalSubtotalAfterDiscount * (wizardData.tax_percentage / 100);
      const finalTotalAmount = finalSubtotalAfterDiscount + finalTaxAmount;

      const quoteData = {
        client_id: finalClientId,
        seller_id: wizardData.seller_id,
        title: wizardData.title,
        description: wizardData.description,
        notes: wizardData.notes,
        discount_percentage: finalDiscountPercentage,
        discount_amount: finalDiscountAmount,
        tax_percentage: wizardData.tax_percentage,
        tax_amount: finalTaxAmount,
        subtotal,
        total_amount: finalTotalAmount,
        valid_until: wizardData.valid_until,
        items: quoteItems,
      };

      let quote;
      if (isEditMode && quoteId) {
        quote = await quotesApi.update(quoteId, quoteData);
        setQuoteId(quoteId);
      } else {
        quote = await quotesApi.create(quoteData);
        if (quote) setQuoteId(quote.id);
      }

      return quote;
    } catch (error: any) {
      console.error('Errore nella creazione preventivo:', error);
      createInProgressRef.current = false;
      alert(error.response?.data?.error || 'Errore nella creazione del preventivo');
      throw error;
    } finally {
      setLoading(false);
      createInProgressRef.current = false;
    }
  };

  const handleGeneratePDF = async () => {
    let currentQuoteId = quoteId;
    if (!currentQuoteId) {
      const quote = await handleCreateQuote();
      if (quote) {
        setQuoteId(quote.id);
        currentQuoteId = quote.id;
      }
    }
    if (!currentQuoteId) return;

    try {
      setLoading(true);
      // Il backend restituisce direttamente il PDF come blob
      const response = await quotesApi.generatePDF(currentQuoteId);
      
      // Verifica se la risposta è un errore JSON
      if (response.headers?.['content-type']?.includes('application/json')) {
        // È un errore JSON, mostra il messaggio
        const errorData = typeof response.data === 'string' 
          ? JSON.parse(response.data) 
          : response.data;
        alert('Errore: ' + (errorData.error || errorData.message || 'Errore sconosciuto'));
        return;
      }
      
      // Verifica il Content-Type della risposta
      const contentType = response.headers?.['content-type'] || response.headers?.['Content-Type'] || '';
      
      // Crea il blob dalla risposta
      const blob = response.data instanceof Blob 
        ? response.data 
        : new Blob([response.data], { type: contentType || 'application/pdf' });
      
      // Verifica che il blob non sia vuoto
      if (blob.size === 0) {
        throw new Error('PDF vuoto');
      }
      
      // Se è HTML invece di PDF, mostra errore
      if (contentType.includes('text/html')) {
        const text = await blob.text();
        alert('Errore nella generazione del PDF. Verifica che DomPDF sia installato sul server.');
        console.error('Risposta HTML invece di PDF:', text.substring(0, 500));
        return;
      }
      
      // Verifica che sia un PDF valido leggendo i primi byte
      const firstBytes = await blob.slice(0, 4).arrayBuffer();
      const pdfHeader = new Uint8Array(firstBytes);
      const isPDF = pdfHeader[0] === 0x25 && pdfHeader[1] === 0x50 && pdfHeader[2] === 0x44 && pdfHeader[3] === 0x46; // %PDF
      
      if (!isPDF) {
        // Verifica se è JSON (errore)
        const text = await blob.slice(0, 100).text();
        if (text.trim().startsWith('{')) {
          try {
            const errorData = JSON.parse(text);
            alert('Errore: ' + (errorData.error || errorData.message || 'Errore nella generazione del PDF'));
            return;
          } catch (e) {
            // Non è JSON
          }
        }
        alert('Errore: Il file ricevuto non è un PDF valido');
        return;
      }
      
      // Forza il download del PDF
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `preventivo_${currentQuoteId}.pdf`;
      link.style.display = 'none'; // Nascondi il link
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nella generazione PDF:', error);
      
      // Se è un errore HTTP, mostra il messaggio
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.error || errorData.message) {
          alert('Errore: ' + (errorData.error || errorData.message));
          return;
        }
      }
      
      alert('Errore nella generazione del PDF. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      alert('Inserisci un indirizzo email');
      return;
    }

    let currentQuoteId = quoteId;
    if (!currentQuoteId) {
      const quote = await handleCreateQuote();
      if (quote) {
        setQuoteId(quote.id);
        currentQuoteId = quote.id;
      }
    }
    if (!currentQuoteId) return;

    try {
      setSending(true);
      const clientName = wizardData.client_info.company_name || wizardData.client_info.email;
      await quotesApi.sendEmail(currentQuoteId, email, clientName);
      alert('Email inviata con successo');
    } catch (error: any) {
      console.error('Errore nell\'invio email:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Errore nell\'invio dell\'email';
      alert('Errore: ' + errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleComplete = async () => {
    if (!quoteId) {
      await handleCreateQuote();
    }
    onComplete();
  };

  return (
    <div className="finalize-success-container">
      {loading && !quoteId ? (
        <div className="finalize-loading">
          <div className="loading-spinner"></div>
          <p>Creazione preventivo in corso...</p>
        </div>
      ) : quoteId ? (
        <div className="finalize-success-content">
          {/* Hero Success Element */}
          <div className="finalize-hero">
            <CheckCircle2 size={96} className="finalize-success-icon" />
            <h1 className="finalize-success-title">Preventivo Creato!</h1>
            <p className="finalize-success-subtitle">
              Numero preventivo: #{quoteId}
            </p>
        </div>

          {/* Quick Actions Group */}
          <div className="finalize-actions-group">
            {/* PDF Action */}
              <button
                type="button"
              className="finalize-action-row"
                onClick={handleGeneratePDF}
                disabled={loading}
              >
              <div className="finalize-action-icon">
                <FileText size={20} />
              </div>
              <div className="finalize-action-content">
                <span className="finalize-action-label">Scarica Documento</span>
                <span className="finalize-action-hint">PDF del preventivo</span>
              </div>
              <ChevronRight size={20} className="finalize-action-chevron" />
              </button>

            {/* Email Action */}
            <div className="finalize-action-row finalize-action-email">
              <div className="finalize-action-icon">
                <Mail size={20} />
            </div>
              <div className="finalize-email-input-wrapper">
                <input
                  type="email"
                  className="finalize-email-input"
                  placeholder="Invia via email a..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && email) {
                      handleSendEmail();
                    }
                  }}
                />
                <button
                  type="button"
                  className="finalize-email-send-btn"
                  onClick={handleSendEmail}
                  disabled={!email || sending}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer Button */}
          <div className="finalize-footer">
            <button
              type="button"
              className="finalize-primary-btn"
              onClick={handleComplete}
            >
              Torna alla Dashboard
            </button>
          </div>
        </div>
      ) : (
        <div className="finalize-actions">
          <button
            type="button"
            className="finalize-primary-btn"
            onClick={handleCreateQuote}
            disabled={loading}
          >
            {loading ? 'Creazione...' : 'Crea Preventivo'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuoteStep8Finalize;

