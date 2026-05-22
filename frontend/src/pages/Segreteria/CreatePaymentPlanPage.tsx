import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  DollarSign, 
  FileText, 
  Download, 
  User,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import contractsApi from '../../api/contracts';
import { paymentPlansApi } from '../../api/paymentPlans';
import { quotesApi } from '../../api/quotes';
import type { Contract } from '../../types/sellers';
import './CreatePaymentPlanPage.css';

interface Installment {
  due_date: string;
  amount: number;
  original_amount: number;
  discount_amount: number;
  discount_reason?: string;
  description: string;
  payment_type: 'installment' | 'renewal' | 'reimbursement' | 'one_time';
  payment_schedule_type?: '30_40_30' | '30_60_days' | 'installments' | 'tantum' | 'custom';
}

interface Renewal {
  renewal_type: 'fixed' | 'variable';
  frequency: 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly' | 'one_time';
  start_date: string;
  end_date?: string;
  months_count: number;
  fixed_amount?: number;
  variable_amounts?: Array<{ amount: number; label: string }>;
  item_description?: string;
}

const CreatePaymentPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showWizard, setShowWizard] = useState(false);
  const [signedDocuments, setSignedDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const data = await contractsApi.getById(Number(contractId));
      setContract(data);
      
      if (data.start_date) {
        setStartDate(new Date(data.start_date).toISOString().split('T')[0]);
      } else {
        setStartDate(new Date().toISOString().split('T')[0]);
      }

      // Carica documenti firmati
      try {
        const docs = await contractsApi.getSignedDocuments(Number(contractId));
        setSignedDocuments(docs);
      } catch (error) {
        console.error('Errore nel caricamento documenti firmati:', error);
      }
    } catch (error) {
      console.error('Errore nel caricamento contratto:', error);
      alert('Errore nel caricamento del contratto');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQuote = async () => {
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
      alert('Errore nella generazione del PDF del preventivo');
    }
  };

  const handleDownloadContract = async () => {
    if (!contract) return;

    try {
      const blob = await contractsApi.downloadFile(contract.id, 'contract');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contratto_${contract.contract_number}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nel download contratto:', error);
      alert(error.response?.data?.error || 'Errore nel download del contratto');
    }
  };

  const handleDownloadPolicy = async (documentId: number) => {
    if (!contract) return;

    try {
      const blob = await contractsApi.downloadSignedDocument(contract.id, documentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `policy_${contract.contract_number}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nel download policy:', error);
      alert(error.response?.data?.error || 'Errore nel download della policy');
    }
  };

  const handleViewClient = () => {
    if (!contract?.client_id) return;
    navigate(`/segreteria/contatti/${contract.client_id}`);
  };

  const generateInitialInstallments = () => {
    if (!contract || !contract.quote?.items) return;

    const newInstallments: Installment[] = [];
    const baseDate = startDate ? new Date(startDate) : new Date();

    contract.quote.items.forEach((item) => {
      const itemTotal = item.total;
      const paymentOption = typeof item.payment_option === 'string' 
        ? JSON.parse(item.payment_option) 
        : item.payment_option;

      if (!paymentOption || !paymentOption.type) {
        newInstallments.push({
          due_date: baseDate.toISOString().split('T')[0],
          amount: itemTotal,
          original_amount: itemTotal,
          discount_amount: 0,
          description: `${item.description || 'Servizio'} - Pagamento Unico`,
          payment_type: 'one_time',
          payment_schedule_type: 'tantum',
        });
        return;
      }

      const paymentType = paymentOption.type;

      switch (paymentType) {
        case 'tantum':
          newInstallments.push({
            due_date: baseDate.toISOString().split('T')[0],
            amount: itemTotal,
            original_amount: itemTotal,
            discount_amount: 0,
            description: `${item.description || 'Servizio'} - Pagamento Unico`,
            payment_type: 'one_time',
            payment_schedule_type: 'tantum',
          });
          break;

        case 'installments':
        case 'rate':
          const numInstallments = paymentOption.installments || 2;
          const installmentAmount = itemTotal / numInstallments;
          for (let i = 0; i < numInstallments; i++) {
            const dueDate = new Date(baseDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            newInstallments.push({
              due_date: dueDate.toISOString().split('T')[0],
              amount: installmentAmount,
              original_amount: installmentAmount,
              discount_amount: 0,
              description: `${item.description || 'Servizio'} - Rata ${i + 1}/${numInstallments}`,
              payment_type: 'installment',
              payment_schedule_type: 'installments',
            });
          }
          break;

        case 'split_30_40_30':
        case '30_40_30':
          newInstallments.push({
            due_date: baseDate.toISOString().split('T')[0],
            amount: itemTotal * 0.30,
            original_amount: itemTotal * 0.30,
            discount_amount: 0,
            description: `${item.description || 'Servizio'} - Acconto 30%`,
            payment_type: 'installment',
            payment_schedule_type: '30_40_30',
          });
          const midDate = new Date(baseDate);
          midDate.setMonth(midDate.getMonth() + 1);
          newInstallments.push({
            due_date: midDate.toISOString().split('T')[0],
            amount: itemTotal * 0.40,
            original_amount: itemTotal * 0.40,
            discount_amount: 0,
            description: `${item.description || 'Servizio'} - Pagamento 40%`,
            payment_type: 'installment',
            payment_schedule_type: '30_40_30',
          });
          const endDate = new Date(baseDate);
          endDate.setMonth(endDate.getMonth() + 2);
          newInstallments.push({
            due_date: endDate.toISOString().split('T')[0],
            amount: itemTotal * 0.30,
            original_amount: itemTotal * 0.30,
            discount_amount: 0,
            description: `${item.description || 'Servizio'} - Saldo 30%`,
            payment_type: 'installment',
            payment_schedule_type: '30_40_30',
          });
          break;

        case '30_60_days':
        case '30gg':
          const dueDate30 = new Date(baseDate);
          dueDate30.setDate(dueDate30.getDate() + 30);
          newInstallments.push({
            due_date: dueDate30.toISOString().split('T')[0],
            amount: itemTotal,
            original_amount: itemTotal,
            discount_amount: 0,
            description: `${item.description || 'Servizio'} - Pagamento 30 giorni`,
            payment_type: 'installment',
            payment_schedule_type: '30_60_days',
          });
          break;

        case '60gg':
          const dueDate60 = new Date(baseDate);
          dueDate60.setDate(dueDate60.getDate() + 60);
          newInstallments.push({
            due_date: dueDate60.toISOString().split('T')[0],
            amount: itemTotal,
            original_amount: itemTotal,
            discount_amount: 0,
            description: `${item.description || 'Servizio'} - Pagamento 60 giorni`,
            payment_type: 'installment',
            payment_schedule_type: '30_60_days',
          });
          break;
      }
    });

    newInstallments.sort((a, b) => 
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    setInstallments(newInstallments);
  };

  const extractRenewalsFromQuote = () => {
    if (!contract || !contract.quote?.items) return [];

    const extractedRenewals: Renewal[] = [];
    const baseDate = startDate ? new Date(startDate) : new Date();

    contract.quote.items.forEach((item) => {
      // Controlla renewal_option (singolo)
      let renewalOption: any = item.renewal_option;
      if (typeof renewalOption === 'string') {
        try {
          renewalOption = JSON.parse(renewalOption);
        } catch (e) {
          renewalOption = undefined;
        }
      }

      // Controlla renewal_options (array)
      let renewalOptions: any = item.renewal_options;
      if (typeof renewalOptions === 'string') {
        try {
          renewalOptions = JSON.parse(renewalOptions);
        } catch (e) {
          renewalOptions = undefined;
        }
      }

      // Mappa duration a frequency
      const mapDurationToFrequency = (duration: string): 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly' => {
        switch (duration) {
          case 'monthly': return 'monthly';
          case 'quarterly': return 'quarterly';
          case 'semiannual': return 'semiannual';
          case 'annual': return 'yearly';
          default: return 'monthly';
        }
      };

      if (renewalOption && renewalOption.duration) {
        // Rinnovo singolo - sempre fisso
        const renewalStartDate = new Date(baseDate);
        renewalStartDate.setMonth(renewalStartDate.getMonth() + 1);

        extractedRenewals.push({
          renewal_type: 'fixed',
          frequency: mapDurationToFrequency(renewalOption.duration),
          start_date: renewalStartDate.toISOString().split('T')[0],
          months_count: 12,
          fixed_amount: renewalOption.price || item.total / 12,
          item_description: item.description || 'Servizio',
        });
      } else if (renewalOptions && Array.isArray(renewalOptions) && renewalOptions.length > 0) {
        // Multi-rinnovo: variabile con più opzioni
        // Trova l'opzione meno cara come default
        const cheapestOption = renewalOptions.reduce((min, opt) => 
          opt.price < (min?.price || Infinity) ? opt : min, 
          renewalOptions[0]
        );

        const renewalStartDate = new Date(baseDate);
        renewalStartDate.setMonth(renewalStartDate.getMonth() + 1);

        // Converti le opzioni nel formato variable_amounts
        const variableAmounts = renewalOptions.map(opt => ({
          amount: opt.price,
          label: opt.description || `Opzione ${opt.duration || 'mensile'}`,
        }));

        extractedRenewals.push({
          renewal_type: 'variable',
          frequency: mapDurationToFrequency(cheapestOption.duration || 'monthly'),
          start_date: renewalStartDate.toISOString().split('T')[0],
          months_count: 12,
          fixed_amount: cheapestOption.price, // Importo default (meno caro)
          variable_amounts: variableAmounts,
          item_description: item.description || 'Servizio',
        });
      }
    });

    return extractedRenewals;
  };

  const handleStartWizard = () => {
    generateInitialInstallments();
    const extractedRenewals = extractRenewalsFromQuote();
    setRenewals(extractedRenewals);
    setShowWizard(true);
    setCurrentStep(1);
  };

  const handleUpdateInstallment = (index: number, field: string, value: any) => {
    const updated = [...installments];
    const installment = { ...updated[index] };

    if (field === 'due_date') {
      installment.due_date = value;
    } else if (field === 'amount') {
      const numValue = parseFloat(value) || 0;
      installment.amount = numValue;
      if (!installment.original_amount) {
        installment.original_amount = numValue;
      }
    } else if (field === 'original_amount') {
      const numValue = parseFloat(value) || 0;
      installment.original_amount = numValue;
      if (installment.discount_amount) {
        installment.amount = numValue - installment.discount_amount;
      } else {
        installment.amount = numValue;
      }
    } else if (field === 'discount_amount') {
      const numValue = parseFloat(value) || 0;
      installment.discount_amount = numValue;
      if (installment.original_amount) {
        installment.amount = installment.original_amount - numValue;
      }
    } else if (field === 'discount_reason') {
      installment.discount_reason = value;
    } else if (field === 'description') {
      installment.description = value;
    }

    updated[index] = installment;
    setInstallments(updated);
  };

  const handleAddInstallment = () => {
    const lastInstallment = installments[installments.length - 1];
    const newDate = lastInstallment 
      ? new Date(new Date(lastInstallment.due_date).getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(startDate || new Date());
    
    const newInstallment: Installment = {
      due_date: newDate.toISOString().split('T')[0],
      amount: 0,
      original_amount: 0,
      discount_amount: 0,
      description: 'Nuova rata',
      payment_type: 'installment',
      payment_schedule_type: 'custom',
    };
    
    setInstallments([...installments, newInstallment]);
  };

  const handleRemoveInstallment = (index: number) => {
    if (!confirm('Sei sicuro di voler rimuovere questa rata?')) {
      return;
    }
    const updated = installments.filter((_, i) => i !== index);
    setInstallments(updated);
  };

  const handleUpdateRenewal = (index: number, field: string, value: any) => {
    const updated = [...renewals];
    const renewal = { ...updated[index] };

    if (field === 'renewal_type') {
      renewal.renewal_type = value;
    } else if (field === 'frequency') {
      renewal.frequency = value;
    } else if (field === 'start_date') {
      renewal.start_date = value;
    } else if (field === 'months_count') {
      renewal.months_count = parseInt(value) || 12;
    } else if (field === 'fixed_amount') {
      renewal.fixed_amount = parseFloat(value) || 0;
    }

    updated[index] = renewal;
    setRenewals(updated);
  };

  const handleSave = async () => {
    if (!contract) return;

    if (installments.length === 0) {
      alert('Aggiungi almeno una rata al piano di pagamento');
      return;
    }

    const totalAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);
    const lastInstallment = installments[installments.length - 1];
    const endDate = lastInstallment ? new Date(lastInstallment.due_date) : null;
    if (endDate) {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    try {
      setSaving(true);
      await paymentPlansApi.create({
        contract_id: contract.id,
        quote_id: contract.quote_id || undefined,
        project_id: contract.crm_project_id || undefined,
        client_id: contract.client_id,
        total_amount: totalAmount,
        start_date: startDate,
        end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
        installments: installments.map(inst => ({
          due_date: inst.due_date,
          amount: inst.amount,
          original_amount: inst.original_amount,
          discount_amount: inst.discount_amount || 0,
          discount_reason: inst.discount_reason,
          description: inst.description,
          payment_type: inst.payment_type,
          payment_schedule_type: inst.payment_schedule_type,
        })),
        renewals: renewals.map(ren => ({
          renewal_type: ren.renewal_type,
          frequency: ren.frequency,
          start_date: ren.start_date,
          end_date: ren.end_date,
          months_count: ren.months_count,
          fixed_amount: ren.fixed_amount,
          variable_amounts: ren.variable_amounts,
        })),
      });

      alert('Piano di pagamento creato con successo!');
      navigate('/segreteria/piani-pagamento-in-attesa');
    } catch (error: any) {
      console.error('Errore nella creazione piano:', error);
      alert(error.response?.data?.message || 'Errore nella creazione del piano di pagamento');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const totalAmount = installments.reduce((sum, inst) => sum + inst.amount, 0);
  const hasRenewals = renewals.length > 0;

  if (loading) {
    return (
      <div className="segreteria-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="segreteria-empty-state">
        <p>Contratto non trovato</p>
        <button onClick={() => navigate(-1)}>Torna indietro</button>
      </div>
    );
  }

  return (
    <div className="create-payment-plan-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/segreteria/piani-pagamento-in-attesa')}>
          <ArrowLeft size={18} />
          Indietro
        </button>
        <div>
          <h1 className="page-title">Crea Piano di Pagamento</h1>
          <p className="page-subtitle">Configura le rate per il contratto {contract.contract_number}</p>
        </div>
      </div>

      <div className="content-grid">
        {/* Informazioni Contratto */}
        <div className="info-card">
          <div className="card-title">
            <FileText size={20} />
            Informazioni Contratto
          </div>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Contratto:</span>
              <span className="info-value">{contract.contract_number}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Cliente:</span>
              <span className="info-value">{contract.client?.company_name}</span>
            </div>
            {contract.project && (
              <div className="info-item">
                <span className="info-label">Progetto:</span>
                <span className="info-value">{contract.project.name}</span>
              </div>
            )}
            {contract.quote && (
              <div className="info-item">
                <span className="info-label">Preventivo:</span>
                <span className="info-value">{contract.quote.quote_number}</span>
              </div>
            )}
            <div className="info-item highlight">
              <span className="info-label">Valore Totale:</span>
              <span className="info-value">{formatCurrency(contract.total_value || 0)}</span>
            </div>
          </div>

          {/* Pulsanti Azioni */}
          <div className="action-buttons-section">
            <button className="action-btn" onClick={handleDownloadQuote} disabled={!contract.quote}>
              <Download size={16} />
              Scarica Preventivo
            </button>
            <button className="action-btn" onClick={handleDownloadContract}>
              <Download size={16} />
              Scarica Contratto
            </button>
            {signedDocuments.filter(doc => doc.document_type === 'privacy_policy').map((doc) => (
              <button 
                key={doc.id} 
                className="action-btn" 
                onClick={() => handleDownloadPolicy(doc.id)}
              >
                <Download size={16} />
                Scarica Policy
              </button>
            ))}
            <button className="action-btn" onClick={handleViewClient}>
              <User size={16} />
              Vedi Dettaglio Cliente
            </button>
          </div>
        </div>

        {/* Configurazione Piano */}
        {!showWizard ? (
          <div className="config-card">
            <div className="card-title">
              <Calendar size={20} />
              Configurazione Piano
            </div>
            <div className="form-group">
              <label>Data Inizio *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <button className="btn-primary btn-start-wizard" onClick={handleStartWizard}>
              <ChevronRight size={16} />
              Avvia Piano di Pagamento
            </button>
          </div>
        ) : (
          <div className="wizard-container">
            {/* Step Indicator */}
            <div className="wizard-steps">
              <div className={`wizard-step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
                <div className="step-number">1</div>
                <div className="step-label">Configurazione Rate</div>
              </div>
              <div className="wizard-step-divider" />
              <div className={`wizard-step ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
                <div className="step-number">2</div>
                <div className="step-label">Gestione Rinnovi</div>
              </div>
            </div>

            {/* Step 1: Configurazione Rate */}
            {currentStep === 1 && (
              <div className="wizard-step-content">
                <div className="installments-card">
                  <div className="card-header">
                    <div className="card-title">
                      <DollarSign size={20} />
                      Rate del Piano
                    </div>
                    <button className="btn-add" onClick={handleAddInstallment}>
                      Aggiungi Rata
                    </button>
                  </div>

                  <div className="installments-table-container">
                    <table className="installments-table">
                      <thead>
                        <tr>
                          <th>Data Scadenza</th>
                          <th>Importo Originale</th>
                          <th>Sconto</th>
                          <th>Motivazione Sconto</th>
                          <th>Importo Finale</th>
                          <th>Descrizione</th>
                          <th>Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installments.map((installment, index) => (
                          <tr key={index}>
                            <td>
                              <input
                                type="date"
                                value={installment.due_date}
                                onChange={(e) => handleUpdateInstallment(index, 'due_date', e.target.value)}
                                className="table-input"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={installment.original_amount}
                                onChange={(e) => handleUpdateInstallment(index, 'original_amount', e.target.value)}
                                className="table-input"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={installment.discount_amount}
                                onChange={(e) => handleUpdateInstallment(index, 'discount_amount', e.target.value)}
                                className="table-input"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={installment.discount_reason || ''}
                                onChange={(e) => handleUpdateInstallment(index, 'discount_reason', e.target.value)}
                                className="table-input"
                                placeholder="Motivazione..."
                              />
                            </td>
                            <td className="final-amount">
                              {formatCurrency(installment.amount)}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={installment.description}
                                onChange={(e) => handleUpdateInstallment(index, 'description', e.target.value)}
                                className="table-input"
                              />
                            </td>
                            <td>
                              <button
                                className="btn-remove"
                                onClick={() => handleRemoveInstallment(index)}
                              >
                                Rimuovi
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="total-summary">
                    <div className="total-item">
                      <span className="total-label">Totale Piano:</span>
                      <span className="total-value">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="wizard-navigation">
                  <button className="btn-secondary" onClick={() => setShowWizard(false)}>
                    Annulla
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => setCurrentStep(2)}
                    disabled={installments.length === 0}
                  >
                    Avanti
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Gestione Rinnovi */}
            {currentStep === 2 && (
              <div className="wizard-step-content">
                {hasRenewals ? (
                  <div className="renewals-card">
                    <div className="card-title">
                      <RefreshCw size={20} />
                      Rinnovi Configurati
                    </div>
                    {renewals.map((renewal, index) => (
                      <div key={index} className="renewal-item">
                        <div className="renewal-header">
                          <h4>{renewal.item_description || 'Rinnovo'}</h4>
                        </div>
                        <div className="renewal-form">
                          <div className="form-row">
                            <div className="form-group">
                              <label>Tipo Rinnovo</label>
                              <select
                                value={renewal.renewal_type}
                                onChange={(e) => handleUpdateRenewal(index, 'renewal_type', e.target.value)}
                                className="form-input"
                              >
                                <option value="fixed">Fisso</option>
                                <option value="variable">Variabile</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Frequenza</label>
                              <select
                                value={renewal.frequency}
                                onChange={(e) => handleUpdateRenewal(index, 'frequency', e.target.value)}
                                className="form-input"
                              >
                                <option value="monthly">Mensile</option>
                                <option value="bimonthly">Bimestrale</option>
                                <option value="quarterly">Trimestrale</option>
                                <option value="semiannual">Semestrale</option>
                                <option value="yearly">Annuale</option>
                              </select>
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Data Inizio</label>
                              <input
                                type="date"
                                value={renewal.start_date}
                                onChange={(e) => handleUpdateRenewal(index, 'start_date', e.target.value)}
                                className="form-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>Numero Mesi</label>
                              <input
                                type="number"
                                value={renewal.months_count}
                                onChange={(e) => handleUpdateRenewal(index, 'months_count', e.target.value)}
                                className="form-input"
                                min="1"
                              />
                            </div>
                          </div>
                          {renewal.renewal_type === 'fixed' && (
                            <div className="form-group">
                              <label>Importo Fisso Mensile</label>
                              <input
                                type="number"
                                step="0.01"
                                value={renewal.fixed_amount || 0}
                                onChange={(e) => handleUpdateRenewal(index, 'fixed_amount', e.target.value)}
                                className="form-input"
                              />
                            </div>
                          )}
                          {renewal.renewal_type === 'variable' && renewal.variable_amounts && (
                            <div className="form-group">
                              <label>Opzioni Disponibili</label>
                              <div className="variable-options">
                                {renewal.variable_amounts.map((option, optIndex) => (
                                  <div key={optIndex} className="variable-option">
                                    <span>{option.label}: {formatCurrency(option.amount)}</span>
                                  </div>
                                ))}
                                <p className="info-text">
                                  <AlertCircle size={16} />
                                  Per i rinnovi variabili, l'opzione meno cara ({formatCurrency(
                                    renewal.variable_amounts.reduce((min, opt) => 
                                      opt.amount < (min?.amount || Infinity) ? opt : min, 
                                      renewal.variable_amounts[0]
                                    ).amount
                                  )}) sarà selezionata di default. Potrai modificare mese per mese.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-renewals">
                    <AlertCircle size={48} />
                    <p>Nessun rinnovo configurato nel preventivo</p>
                  </div>
                )}

                <div className="wizard-navigation">
                  <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
                    <ChevronLeft size={16} />
                    Indietro
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={handleSave}
                    disabled={saving || installments.length === 0}
                  >
                    <Save size={16} />
                    {saving ? 'Salvataggio...' : 'Conferma e Avvia Piano'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePaymentPlanPage;
