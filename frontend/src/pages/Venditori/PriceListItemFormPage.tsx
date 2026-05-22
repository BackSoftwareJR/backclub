import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X, RefreshCw } from 'lucide-react';
import priceListApi from '../../api/priceList';
import budgetApi from '../../api/budget';
import type { PriceListFormData, PaymentOption, RenewalOption } from '../../types/sellers';
import type { CrmDepartment } from '../../api/budget';
import QuestionBuilder from '../../components/Venditori/QuestionBuilder';
import './PriceListItemFormPage.css';

const PriceListItemFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState<PriceListFormData>({
    crm_department_id: undefined,
    name: '',
    description: '',
    operational_notes: '',
    landing_page_url: '',
    technical_sheet_url: '',
    base_price: 0,
    price_type: 'fisso',
    payment_options: [],
    min_installment_amount: undefined,
    max_installments: undefined,
    margin_percentage: undefined,
    features: [],
    renewal_options: [],
    renewal_type: undefined,
    is_active: true,
  });

  const [departments, setDepartments] = useState<CrmDepartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [renewalIncludeInput, setRenewalIncludeInput] = useState('');
  const [informativeDocumentPath, setInformativeDocumentPath] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadDepartments();
    if (isEdit && id) {
      loadItem();
    }
  }, [id, isEdit]);

  // Preview live del PDF del preventivo usando il template lato backend
  useEffect(() => {
    if (!isEdit || !id) {
      return;
    }

    setPreviewLoading(true);

    const timeoutId = window.setTimeout(async () => {
      let newUrl: string | null = null;
      try {
        const blob = await priceListApi.getQuotePreviewPdf({
          id: Number(id),
          name: formData.name || 'Nome prodotto/servizio',
          description: formData.description || '',
          operational_notes: formData.operational_notes || '',
          features: formData.features || [],
          base_price: formData.base_price,
          margin_percentage: formData.margin_percentage,
        });

        newUrl = URL.createObjectURL(blob);
        // Libera l'URL precedente per evitare memory leak
        setPreviewPdfUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev);
          }
          return newUrl;
        });
      } catch (error) {
        console.error('Errore nel caricamento preview preventivo (PDF):', error);
      } finally {
        setPreviewLoading(false);
        if (!newUrl) {
          setPreviewPdfUrl((prev) => {
            if (prev) {
              URL.revokeObjectURL(prev);
            }
            return null;
          });
        }
      }
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isEdit, id, formData.name, formData.description, formData.operational_notes, formData.features]);

  const loadDepartments = async () => {
    try {
      const response = await budgetApi.getCrmList({ active_only: true });
      setDepartments(response.data);
    } catch (error) {
      console.error('Errore nel caricamento settori:', error);
    }
  };

  const loadItem = async () => {
    try {
      setLoading(true);
      const item = await priceListApi.getById(Number(id));
      setFormData({
        crm_department_id: item.crm_department_id || undefined,
        name: item.name,
        description: item.description || '',
        operational_notes: item.operational_notes || '',
        landing_page_url: item.landing_page_url || '',
        technical_sheet_url: item.technical_sheet_url || '',
        base_price: item.base_price,
        price_type: item.price_type,
        payment_options: item.payment_options || [],
        min_installment_amount: item.min_installment_amount || undefined,
        max_installments: item.max_installments || undefined,
        margin_percentage: item.margin_percentage || undefined,
        features: item.features || [],
        renewal_options: item.renewal_options || [],
        renewal_type: item.renewal_type || undefined,
        is_active: item.is_active,
      });
      setInformativeDocumentPath(item.informative_document_path || null);
    } catch (error) {
      console.error('Errore nel caricamento prodotto:', error);
      alert('Errore nel caricamento del prodotto');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Rimuovi informative_document_path dal formData (viene gestito separatamente con upload)
      const { informative_document_path, ...submitData } = formData as any;
      
      if (isEdit && id) {
        await priceListApi.update(Number(id), submitData);
      } else {
        await priceListApi.create(submitData);
      }
      navigate('/venditori/configurazione-listini');
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error);
      alert(error.response?.data?.error || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const addPaymentOption = (type: string) => {
    const newOption: PaymentOption = {
      type,
      label: type,
    };

    if (type === 'rate') {
      newOption.installments = 3;
      newOption.label = 'Rate';
    } else if (type === '30/40/30') {
      newOption.percentages = [30, 40, 30];
      newOption.label = 'Pagamento 30/40/30';
    } else if (type === '30gg' || type === '60gg') {
      newOption.days = type === '30gg' ? 30 : 60;
      newOption.label = `Pagamento a ${type}`;
    } else {
      newOption.label = 'Pagamento Unico';
    }

    setFormData({
      ...formData,
      payment_options: [...(formData.payment_options || []), newOption],
    });
  };

  const removePaymentOption = (index: number) => {
    const options = [...(formData.payment_options || [])];
    options.splice(index, 1);
    setFormData({ ...formData, payment_options: options });
  };

  const updatePaymentOption = (index: number, updates: Partial<PaymentOption>) => {
    const options = [...(formData.payment_options || [])];
    options[index] = { ...options[index], ...updates };
    setFormData({ ...formData, payment_options: options });
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    const features = [...(formData.features || [])];
    features.splice(index, 1);
    setFormData({ ...formData, features });
  };

  const addRenewalOption = () => {
    const newOption: RenewalOption = {
      id: Date.now().toString(),
      duration: 'monthly',
      price: 0,
      description: '',
      includes: [],
      is_active: true,
    };
    setFormData({
      ...formData,
      renewal_options: [...(formData.renewal_options || []), newOption],
    });
  };

  const removeRenewalOption = (index: number) => {
    const options = [...(formData.renewal_options || [])];
    options.splice(index, 1);
    setFormData({ ...formData, renewal_options: options });
  };

  const updateRenewalOption = (index: number, updates: Partial<RenewalOption>) => {
    const options = [...(formData.renewal_options || [])];
    options[index] = { ...options[index], ...updates };
    setFormData({ ...formData, renewal_options: options });
  };

  const addRenewalInclude = (renewalIndex: number) => {
    if (renewalIncludeInput.trim()) {
      const options = [...(formData.renewal_options || [])];
      const includes = [...(options[renewalIndex].includes || []), renewalIncludeInput.trim()];
      options[renewalIndex] = { ...options[renewalIndex], includes };
      setFormData({ ...formData, renewal_options: options });
      setRenewalIncludeInput('');
    }
  };

  const removeRenewalInclude = (renewalIndex: number, includeIndex: number) => {
    const options = [...(formData.renewal_options || [])];
    const includes = [...(options[renewalIndex].includes || [])];
    includes.splice(includeIndex, 1);
    options[renewalIndex] = { ...options[renewalIndex], includes };
    setFormData({ ...formData, renewal_options: options });
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="price-list-item-form-page">
      <div className="form-header">
        <button
          className="btn-back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          Indietro
        </button>
        <div className="form-header-main">
          <span className="form-header-eyebrow">
            {isEdit ? 'Configurazione listino' : 'Nuovo elemento di listino'}
          </span>
          <h1 className="venditori-page-title">
            {isEdit ? 'Modifica Prodotto/Servizio' : 'Nuovo Prodotto/Servizio'}
          </h1>
          <p className="form-header-subtitle">
            Rivedi tutte le informazioni chiave che il cliente vedrà nel preventivo, nel PDF e nel flusso di vendita.
          </p>
        </div>
        <div className="form-header-pill">
          {isEdit ? 'Stai modificando un prodotto esistente' : 'Stai creando un nuovo prodotto'}
        </div>
      </div>

      <div className="price-list-item-form-layout">
        <div className="price-list-item-form-column">
          <form id="price-list-item-form" onSubmit={handleSubmit} className="price-list-form">
            {/* Informazioni Base */}
            <div className="form-section">
          <h3 className="form-section-title">Informazioni Base</h3>
          <p className="form-section-description">
            Nome, descrizione e note operative che compaiono nelle schermate di vendita e nei documenti condivisi con il cliente.
          </p>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Nome Prodotto/Servizio *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Es: Sito Web Professionale"
              />
            </div>
            <div className="form-group full-width">
              <label>Descrizione</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrizione dettagliata del prodotto o servizio..."
              />
            </div>
            <div className="form-group full-width">
              <label>Note Operative</label>
              <textarea
                rows={3}
                value={formData.operational_notes || ''}
                onChange={(e) => setFormData({ ...formData, operational_notes: e.target.value })}
                placeholder="Note operative che verranno mostrate nel preventivo per questo prodotto/servizio..."
              />
              <p className="form-hint">Queste note verranno visualizzate nel PDF del preventivo per fornire informazioni aggiuntive al cliente.</p>
            </div>
            <div className="form-group">
              <label>Settore</label>
              <select
                value={formData.crm_department_id || ''}
                onChange={(e) => setFormData({ ...formData, crm_department_id: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">Seleziona settore...</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Landing Page URL (Presenta)</label>
              <input
                type="url"
                value={formData.landing_page_url}
                onChange={(e) => setFormData({ ...formData, landing_page_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label>Scheda Tecnica URL</label>
              <input
                type="url"
                value={formData.technical_sheet_url}
                onChange={(e) => setFormData({ ...formData, technical_sheet_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label>Documento Informativo PDF</label>
              <input
                type="file"
                accept=".pdf"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && isEdit && id) {
                    try {
                      setUploadingDocument(true);
                      const result = await priceListApi.uploadInformativeDocument(Number(id), file);
                      setInformativeDocumentPath(result.informative_document_path);
                      alert('Documento caricato con successo!');
                    } catch (error: any) {
                      console.error('Errore nel caricamento documento:', error);
                      alert(error.response?.data?.error || 'Errore nel caricamento del documento');
                    } finally {
                      setUploadingDocument(false);
                      e.target.value = ''; // Reset input
                    }
                  }
                }}
                disabled={uploadingDocument || !isEdit}
              />
              {informativeDocumentPath && (
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#10b981' }}>
                  ✓ Documento caricato: {informativeDocumentPath.split('/').pop()}
                </div>
              )}
              {uploadingDocument && (
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>
                  Caricamento in corso...
                </div>
              )}
            </div>
          </div>
            </div>

            {/* Prezzo e Margini */}
            <div className="form-section">
          <h3 className="form-section-title">Prezzo e Margini</h3>
          <p className="form-section-description">
            Definisci il prezzo di listino e il margine previsto per questo prodotto o servizio.
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label>Prezzo Base (€) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Tipo Prezzo *</label>
              <select
                required
                value={formData.price_type}
                onChange={(e) => setFormData({ ...formData, price_type: e.target.value as any })}
              >
                <option value="fisso">Fisso</option>
                <option value="variabile">Variabile</option>
                <option value="personalizzato">Personalizzato</option>
              </select>
            </div>
            <div className="form-group">
              <label>Margine (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.margin_percentage || ''}
                onChange={(e) => setFormData({ ...formData, margin_percentage: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Es: 20"
              />
            </div>
          </div>
            </div>

            {/* Opzioni di Pagamento */}
            <div className="form-section">
          <h3 className="form-section-title">Opzioni di Pagamento</h3>
          <p className="form-section-description">
            Seleziona le modalità di pagamento accettate per questo prodotto/servizio
          </p>
          
          <div className="payment-options-quick-add">
            <button
              type="button"
              className="btn-payment-option"
              onClick={() => addPaymentOption('tantum')}
            >
              <Plus size={16} />
              Pagamento Unico
            </button>
            <button
              type="button"
              className="btn-payment-option"
              onClick={() => addPaymentOption('rate')}
            >
              <Plus size={16} />
              Rate
            </button>
            <button
              type="button"
              className="btn-payment-option"
              onClick={() => addPaymentOption('30/40/30')}
            >
              <Plus size={16} />
              30/40/30
            </button>
            <button
              type="button"
              className="btn-payment-option"
              onClick={() => addPaymentOption('30gg')}
            >
              <Plus size={16} />
              Pagamento 30gg
            </button>
            <button
              type="button"
              className="btn-payment-option"
              onClick={() => addPaymentOption('60gg')}
            >
              <Plus size={16} />
              Pagamento 60gg
            </button>
          </div>

          {formData.payment_options && formData.payment_options.length > 0 && (
            <div className="payment-options-list">
              {formData.payment_options.map((option, index) => (
                <div key={index} className="payment-option-item">
                  <div className="payment-option-header">
                    <span className="payment-option-label">{option.label}</span>
                    <button
                      type="button"
                      className="btn-remove-option"
                      onClick={() => removePaymentOption(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  {option.type === 'rate' && (
                    <div className="payment-option-details">
                      <div className="form-group">
                        <label>Numero Rate</label>
                        <input
                          type="number"
                          min="2"
                          max="24"
                          value={option.installments || 3}
                          onChange={(e) => updatePaymentOption(index, { installments: parseInt(e.target.value) || 3 })}
                        />
                      </div>
                    </div>
                  )}

                  {option.type === '30/40/30' && (
                    <div className="payment-option-details">
                      <div className="form-group">
                        <label>Percentuali</label>
                        <div className="percentages-input">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={option.percentages?.[0] || 30}
                            onChange={(e) => {
                              const percentages = option.percentages || [30, 40, 30];
                              percentages[0] = parseInt(e.target.value) || 30;
                              updatePaymentOption(index, { percentages });
                            }}
                          />
                          <span>/</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={option.percentages?.[1] || 40}
                            onChange={(e) => {
                              const percentages = option.percentages || [30, 40, 30];
                              percentages[1] = parseInt(e.target.value) || 40;
                              updatePaymentOption(index, { percentages });
                            }}
                          />
                          <span>/</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={option.percentages?.[2] || 30}
                            onChange={(e) => {
                              const percentages = option.percentages || [30, 40, 30];
                              percentages[2] = parseInt(e.target.value) || 30;
                              updatePaymentOption(index, { percentages });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {formData.payment_options && formData.payment_options.some(opt => opt.type === 'rate') && (
            <div className="form-grid" style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Importo Minimo Rata (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.min_installment_amount || ''}
                  onChange={(e) => setFormData({ ...formData, min_installment_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Es: 100"
                />
              </div>
              <div className="form-group">
                <label>Numero Massimo Rate</label>
                <input
                  type="number"
                  min="2"
                  max="24"
                  value={formData.max_installments || ''}
                  onChange={(e) => setFormData({ ...formData, max_installments: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Es: 12"
                />
              </div>
            </div>
          )}
            </div>

            {/* Opzioni di Rinnovo */}
            <div className="form-section">
          <h3 className="form-section-title">
            <RefreshCw size={20} />
            Opzioni di Rinnovo
          </h3>
          <p className="form-section-description">
            Configura le opzioni di rinnovo per questo prodotto/servizio (es: hosting mensile, manutenzione annuale, ecc.)
          </p>

          {/* Tipo Rinnovo */}
          <div className="form-group full-width" style={{ marginBottom: '20px' }}>
            <label>Tipo di Rinnovo</label>
            <select
              value={formData.renewal_type || ''}
              onChange={(e) => setFormData({ ...formData, renewal_type: e.target.value as 'obbligatorio' | 'facoltativo' | 'multi' | undefined || undefined })}
            >
              <option value="">Nessun tipo specifico (comportamento legacy: facoltativo)</option>
              <option value="obbligatorio">Obbligatorio - Il venditore deve selezionare una opzione</option>
              <option value="facoltativo">Facoltativo - Il venditore può scegliere se selezionare o no</option>
              <option value="multi">Multi-Rinnovo - Tutte le opzioni selezionate di default, cliente può scegliere di mese in mese</option>
            </select>
            <p className="form-hint">
              <strong>Obbligatorio:</strong> Se c'è solo 1 opzione, viene selezionata automaticamente. Se ci sono più opzioni, il venditore deve selezionarne una.
              <br />
              <strong>Facoltativo:</strong> Il venditore può scegliere se selezionare una opzione di rinnovo o no.
              <br />
              <strong>Multi-Rinnovo:</strong> Tutte le opzioni sono selezionate di default. Il cliente può scegliere quale attivare di mese in mese.
            </p>
          </div>

          <button
            type="button"
            className="btn-add-renewal"
            onClick={addRenewalOption}
          >
            <Plus size={18} />
            Aggiungi Opzione Rinnovo
          </button>

          {formData.renewal_options && formData.renewal_options.length > 0 && (
            <div className="renewal-options-list">
              {formData.renewal_options.map((option, index) => (
                <div key={option.id || index} className="renewal-option-item">
                  <div className="renewal-option-header">
                    <span className="renewal-option-number">Opzione {index + 1}</span>
                    <button
                      type="button"
                      className="btn-remove-option"
                      onClick={() => removeRenewalOption(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Durata *</label>
                      <select
                        value={option.duration}
                        onChange={(e) => {
                          const updates: Partial<RenewalOption> = { duration: e.target.value };
                          if (e.target.value !== 'custom') {
                            updates.duration_months = undefined;
                          }
                          updateRenewalOption(index, updates);
                        }}
                      >
                        <option value="monthly">Mensile</option>
                        <option value="quarterly">Trimestrale (3 mesi)</option>
                        <option value="semiannual">Semestrale (6 mesi)</option>
                        <option value="annual">Annuale (12 mesi)</option>
                        <option value="custom">Personalizzata</option>
                      </select>
                    </div>

                    {option.duration === 'custom' && (
                      <div className="form-group">
                        <label>Durata in Mesi *</label>
                        <input
                          type="number"
                          min="1"
                          value={option.duration_months || ''}
                          onChange={(e) => updateRenewalOption(index, { duration_months: parseInt(e.target.value) || undefined })}
                          placeholder="Es: 18"
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label>Prezzo Rinnovo (€) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={option.price}
                        onChange={(e) => updateRenewalOption(index, { price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Descrizione</label>
                      <textarea
                        rows={2}
                        value={option.description || ''}
                        onChange={(e) => updateRenewalOption(index, { description: e.target.value })}
                        placeholder="Descrizione dell'opzione di rinnovo..."
                      />
                    </div>
                  </div>

                  <div className="renewal-includes-section">
                    <label className="renewal-includes-label">Cosa Comprende</label>
                    <div className="renewal-includes-input-group">
                      <input
                        type="text"
                        placeholder="Aggiungi elemento incluso (es: Manutenzione, Aggiornamenti, Supporto...)"
                        value={renewalIncludeInput}
                        onChange={(e) => setRenewalIncludeInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addRenewalInclude(index);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addRenewalInclude(index)}
                        className="btn-add-include"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {option.includes && option.includes.length > 0 && (
                      <div className="renewal-includes-list">
                        {option.includes.map((include, includeIndex) => (
                          <span key={includeIndex} className="include-tag">
                            {include}
                            <button
                              type="button"
                              onClick={() => removeRenewalInclude(index, includeIndex)}
                              className="tag-remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={option.is_active !== false}
                        onChange={(e) => updateRenewalOption(index, { is_active: e.target.checked })}
                      />
                      <span>Opzione attiva</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>

            {/* Domande Servizio */}
            {isEdit && id && (
          <div className="form-section">
            <h3 className="form-section-title">Domande per il Venditore</h3>
            <p className="form-section-description">
              Personalizza le domande che guidano il venditore nella raccolta delle informazioni necessarie per questo prodotto.
            </p>
            <QuestionBuilder priceListItemId={Number(id)} isEdit={isEdit} />
          </div>
            )}

            {/* Caratteristiche */}
            <div className="form-section">
          <h3 className="form-section-title">Caratteristiche Prodotto</h3>
          <p className="form-section-description">
            Elenca i punti di forza che verranno evidenziati nelle presentazioni commerciali e nei preventivi.
          </p>
          <div className="features-input-group">
            <input
              type="text"
              placeholder="Aggiungi caratteristica (es: Responsive Design, SEO incluso...)"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addFeature();
                }
              }}
            />
            <button type="button" onClick={addFeature} className="btn-add-feature">
              <Plus size={18} />
              Aggiungi
            </button>
          </div>
          {formData.features && formData.features.length > 0 && (
            <div className="features-list">
              {formData.features.map((feature, index) => (
                <span key={index} className="feature-tag">
                  {feature}
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
            </div>

            {/* Stato */}
            <div className="form-section">
          <h3 className="form-section-title">Stato</h3>
          <p className="form-section-description">
            Decidi se questo prodotto è disponibile per l&rsquo;utilizzo nei nuovi preventivi.
          </p>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>Prodotto attivo</span>
            </label>
          </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="venditori-btn venditori-btn-secondary"
                onClick={() => navigate(-1)}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="venditori-btn venditori-btn-primary"
                disabled={saving}
              >
                <Save size={18} />
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </form>
        </div>

        <aside className="price-list-item-preview-column">
          <div className="price-list-item-preview-sticky">
            <div className="price-list-item-preview-header">
              <div>
                <div className="preview-eyebrow">Preview preventivo</div>
                <div className="preview-title">
                  {formData.name || 'Nome prodotto/servizio'}
                </div>
                <div className="preview-subtitle">
                  Questa anteprima usa lo stesso layout del PDF definitivo.
                </div>
              </div>
              <div className="preview-actions">
                <button
                  type="button"
                  className="venditori-btn venditori-btn-secondary"
                  onClick={() => {
                    if (previewPdfUrl) {
                      window.open(previewPdfUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  disabled={!previewPdfUrl}
                >
                  Ingrandisci
                </button>
                <button
                  type="button"
                  className="venditori-btn venditori-btn-secondary"
                  onClick={() => navigate(-1)}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  form="price-list-item-form"
                  className="venditori-btn venditori-btn-primary"
                  disabled={saving}
                >
                  <Save size={18} />
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </div>

            <div className="price-list-item-preview-card">
              {previewLoading && (
                <div className="preview-loading">
                  Genero il PDF di anteprima del preventivo...
                </div>
              )}
              {!previewLoading && previewPdfUrl && (
                <iframe
                  title="Anteprima PDF preventivo"
                  src={previewPdfUrl}
                  className="preview-pdf-frame"
                />
              )}
              {!previewLoading && !previewPdfUrl && (
                <div className="preview-empty">
                  Compila almeno il nome e il prezzo per vedere la preview del preventivo in PDF.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PriceListItemFormPage;

