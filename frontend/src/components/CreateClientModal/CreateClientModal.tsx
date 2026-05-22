import React, { useState, useEffect } from 'react';
import { X, Building, User, FileText, Link as LinkIcon, AlertCircle, Key, CreditCard, Globe } from 'lucide-react';
import { createClient, updateClient, type Client, type CreateClientData } from '../../api/clients';
import './CreateClientModal.css';

interface CreateClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    client?: Client | null;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({ isOpen, onClose, onSuccess, client }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'base' | 'contacts' | 'fiscal' | 'links' | 'access'>('base');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingClose, setPendingClose] = useState<(() => void) | null>(null);
    const [initialFormData, setInitialFormData] = useState<CreateClientData | null>(null);

    const [formData, setFormData] = useState<CreateClientData>({
        company_name: '',
        ragione_sociale: '',
        contact_person: '',
        referente_nome: '',
        referente_cognome: '',
        referente_telefono: '',
        referente_email: '',
        partita_iva: '',
        codice_fiscale: '',
        vat_number: '',
        tax_code: '',
        address: '',
        phone: '',
        email: '',
        iban: '',
        swift: '',
        sdi_code: '',
        pec: '',
        sito_web: '',
        drive_link_foto: '',
        drive_link_video: '',
        drive_link_materiali: '',
        facebook_profile: '',
        google_ads_account: '',
        google_my_business: '',
        visura_camerale_url: '',
        visura_camerale_reminder: false,
        privacy_sheet_url: '',
        carta_servizi_url: '',
        carta_identita_url: '',
        payment_terms: '',
        credit_limit_cocchi: undefined,
        notes: '',
        access_enabled: false,
        access_password: '',
        is_active: true,
    });

    useEffect(() => {
        if (isOpen && client) {
            // Pre-fill form with client data
            const clientFormData: CreateClientData = {
                company_name: client.company_name || '',
                ragione_sociale: client.ragione_sociale || '',
                contact_person: client.contact_person || '',
                referente_nome: client.referente_nome || '',
                referente_cognome: client.referente_cognome || '',
                referente_telefono: client.referente_telefono || '',
                referente_email: client.referente_email || '',
                partita_iva: client.partita_iva || '',
                codice_fiscale: client.codice_fiscale || '',
                vat_number: client.vat_number || '',
                tax_code: client.tax_code || '',
                address: client.address || '',
                phone: client.phone || '',
                email: client.email || '',
                iban: client.iban || '',
                swift: client.swift || '',
                sdi_code: client.sdi_code || '',
                pec: client.pec || '',
                sito_web: client.sito_web || '',
                drive_link_foto: client.drive_link_foto || '',
                drive_link_video: client.drive_link_video || '',
                drive_link_materiali: client.drive_link_materiali || '',
                facebook_profile: client.facebook_profile || '',
                google_ads_account: client.google_ads_account || '',
                google_my_business: client.google_my_business || '',
                visura_camerale_url: client.visura_camerale_url || '',
                visura_camerale_reminder: client.visura_camerale_reminder || false,
                privacy_sheet_url: client.privacy_sheet_url || '',
                carta_servizi_url: client.carta_servizi_url || '',
                carta_identita_url: client.carta_identita_url || '',
                payment_terms: client.payment_terms || '',
                credit_limit_cocchi: client.credit_limit_cocchi,
                notes: client.notes || '',
                access_enabled: client.access_enabled || false,
                access_password: '',
                is_active: client.is_active !== undefined ? client.is_active : true,
            };
            setFormData(clientFormData);
            setInitialFormData(clientFormData);
        } else if (isOpen && !client) {
            // Reset form
            const emptyForm = getInitialFormData();
            setFormData(emptyForm);
            setInitialFormData(emptyForm);
        }
    }, [isOpen, client]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !showConfirmDialog) {
                handleCloseWithConfirm(() => handleClose());
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => {
                document.removeEventListener('keydown', handleEscape);
            };
        }
    }, [isOpen, showConfirmDialog]);

    const getInitialFormData = (): CreateClientData => {
        return {
            company_name: '',
            ragione_sociale: '',
            contact_person: '',
            referente_nome: '',
            referente_cognome: '',
            referente_telefono: '',
            referente_email: '',
            partita_iva: '',
            codice_fiscale: '',
            vat_number: '',
            tax_code: '',
            address: '',
            phone: '',
            email: '',
            iban: '',
            swift: '',
            sdi_code: '',
            pec: '',
            sito_web: '',
            drive_link_foto: '',
            drive_link_video: '',
            drive_link_materiali: '',
            facebook_profile: '',
            google_ads_account: '',
            google_my_business: '',
            visura_camerale_url: '',
            visura_camerale_reminder: false,
            privacy_sheet_url: '',
            carta_servizi_url: '',
            carta_identita_url: '',
            payment_terms: '',
            credit_limit_cocchi: undefined,
            notes: '',
            access_enabled: false,
            access_password: '',
            is_active: true,
        };
    };

    const resetForm = () => {
        const emptyForm = getInitialFormData();
        setFormData(emptyForm);
        setInitialFormData(emptyForm);
        setActiveTab('base');
    };

    const hasUnsavedChanges = (): boolean => {
        if (!initialFormData) {
            return false;
        }
        
        // Confronta i dati attuali con quelli iniziali
        return Object.keys(formData).some(key => {
            const currentValue = formData[key as keyof CreateClientData];
            const initialValue = initialFormData[key as keyof CreateClientData];
            
            // Ignora access_password se access_enabled è false o se non è stato modificato
            if (key === 'access_password') {
                if (!formData.access_enabled) {
                    return false;
                }
                // Se access_enabled è true, considera solo se la password è stata inserita/modificata
                if (!currentValue) {
                    return false;
                }
            }
            
            // Ignora i campi booleani con valore false (tranne quelli specifici) se erano già false
            if (typeof currentValue === 'boolean' && currentValue === false && 
                !['access_enabled', 'is_active', 'visura_camerale_reminder'].includes(key)) {
                return false;
            }
            
            // Confronta i valori
            if (currentValue !== initialValue) {
                // Se il valore attuale è una stringa vuota e quello iniziale era null/undefined/stringa vuota, non è una modifica
                if (currentValue === '' && (initialValue === null || initialValue === undefined || initialValue === '')) {
                    return false;
                }
                // Se il valore iniziale era una stringa vuota e quello attuale è null/undefined, non è una modifica
                if ((currentValue === null || currentValue === undefined) && initialValue === '') {
                    return false;
                }
                return true;
            }
            return false;
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : undefined }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const validate = (): boolean => {
        if (!formData.company_name?.trim()) {
            setError('Il nome dell\'azienda è obbligatorio');
            setActiveTab('base');
            return false;
        }
        
        if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            setError('Email non valida');
            setActiveTab('contacts');
            return false;
        }

        if (formData.referente_email && !formData.referente_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            setError('Email referente non valida');
            setActiveTab('contacts');
            return false;
        }

        if (formData.pec && !formData.pec.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            setError('PEC non valida');
            setActiveTab('fiscal');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            setLoading(true);
            setError(null);

            // Clean up data (remove empty strings and undefined values)
            const cleanData: any = {};
            Object.entries(formData).forEach(([key, value]) => {
                // Skip empty strings, undefined, null
                if (value === '' || value === undefined || value === null) {
                    return;
                }
                // Skip boolean false values except for specific fields
                if (value === false && !['access_enabled', 'is_active', 'visura_camerale_reminder'].includes(key)) {
                    return;
                }
                cleanData[key] = value;
            });

            console.log('Sending client data:', cleanData);

            if (client) {
                // Update existing client
                await updateClient(client.id, cleanData);
            } else {
                // Create new client
                await createClient(cleanData);
            }

            onSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Error saving client:', err);
            setError(err.toString());
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        resetForm();
        setError(null);
        setShowConfirmDialog(false);
        setPendingClose(null);
        setInitialFormData(null);
        onClose();
    };

    const handleCloseWithConfirm = (closeAction: () => void) => {
        if (hasUnsavedChanges()) {
            setPendingClose(() => closeAction);
            setShowConfirmDialog(true);
        } else {
            closeAction();
        }
    };

    const handleConfirmClose = () => {
        if (pendingClose) {
            pendingClose();
        }
        handleClose();
    };

    const handleCancelClose = () => {
        setShowConfirmDialog(false);
        setPendingClose(null);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-overlay" onClick={() => handleCloseWithConfirm(() => handleClose())}>
                <div className="modal-create-client" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="modal-header">
                        <h2>{client ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
                        <button className="btn-close-modal" onClick={() => handleCloseWithConfirm(() => handleClose())}>
                            <X size={20} />
                        </button>
                    </div>

                {/* Error */}
                {error && (
                    <div className="modal-error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Tabs */}
                <div className="modal-tabs">
                    <button
                        className={activeTab === 'base' ? 'active' : ''}
                        onClick={() => setActiveTab('base')}
                    >
                        <Building size={16} />
                        Base
                    </button>
                    <button
                        className={activeTab === 'contacts' ? 'active' : ''}
                        onClick={() => setActiveTab('contacts')}
                    >
                        <User size={16} />
                        Contatti
                    </button>
                    <button
                        className={activeTab === 'fiscal' ? 'active' : ''}
                        onClick={() => setActiveTab('fiscal')}
                    >
                        <FileText size={16} />
                        Fiscale
                    </button>
                    <button
                        className={activeTab === 'links' ? 'active' : ''}
                        onClick={() => setActiveTab('links')}
                    >
                        <LinkIcon size={16} />
                        Links
                    </button>
                    <button
                        className={activeTab === 'access' ? 'active' : ''}
                        onClick={() => setActiveTab('access')}
                    >
                        <Key size={16} />
                        Accesso
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Base Tab */}
                    {activeTab === 'base' && (
                        <div className="form-tab">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nome Azienda *</label>
                                    <input
                                        type="text"
                                        name="company_name"
                                        value={formData.company_name}
                                        onChange={handleChange}
                                        placeholder="Es: Tech Solutions SRL"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Ragione Sociale</label>
                                    <input
                                        type="text"
                                        name="ragione_sociale"
                                        value={formData.ragione_sociale}
                                        onChange={handleChange}
                                        placeholder="Ragione sociale completa"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Indirizzo</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Via, Città, CAP"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Telefono</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+39 123 456 7890"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="info@azienda.it"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Note</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Note aggiuntive sul cliente..."
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleChange}
                                    />
                                    <span>Cliente attivo</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Contacts Tab */}
                    {activeTab === 'contacts' && (
                        <div className="form-tab">
                            <h3><User size={18} /> Referente</h3>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nome</label>
                                    <input
                                        type="text"
                                        name="referente_nome"
                                        value={formData.referente_nome}
                                        onChange={handleChange}
                                        placeholder="Nome referente"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Cognome</label>
                                    <input
                                        type="text"
                                        name="referente_cognome"
                                        value={formData.referente_cognome}
                                        onChange={handleChange}
                                        placeholder="Cognome referente"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Telefono Referente</label>
                                    <input
                                        type="tel"
                                        name="referente_telefono"
                                        value={formData.referente_telefono}
                                        onChange={handleChange}
                                        placeholder="+39 123 456 7890"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Referente</label>
                                    <input
                                        type="email"
                                        name="referente_email"
                                        value={formData.referente_email}
                                        onChange={handleChange}
                                        placeholder="referente@azienda.it"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Persona di Contatto</label>
                                <input
                                    type="text"
                                    name="contact_person"
                                    value={formData.contact_person}
                                    onChange={handleChange}
                                    placeholder="Nome contatto generico"
                                />
                            </div>
                        </div>
                    )}

                    {/* Fiscal Tab */}
                    {activeTab === 'fiscal' && (
                        <div className="form-tab">
                            <h3><FileText size={18} /> Dati Fiscali</h3>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Partita IVA</label>
                                    <input
                                        type="text"
                                        name="partita_iva"
                                        value={formData.partita_iva}
                                        onChange={handleChange}
                                        placeholder="12345678901"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Codice Fiscale</label>
                                    <input
                                        type="text"
                                        name="codice_fiscale"
                                        value={formData.codice_fiscale}
                                        onChange={handleChange}
                                        placeholder="RSSMRA80A01H501U"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Codice SDI</label>
                                    <input
                                        type="text"
                                        name="sdi_code"
                                        value={formData.sdi_code}
                                        onChange={handleChange}
                                        placeholder="0000000"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>PEC</label>
                                    <input
                                        type="email"
                                        name="pec"
                                        value={formData.pec}
                                        onChange={handleChange}
                                        placeholder="pec@pec.it"
                                    />
                                </div>
                            </div>

                            <h3><CreditCard size={18} /> Dati Bancari</h3>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>IBAN</label>
                                    <input
                                        type="text"
                                        name="iban"
                                        value={formData.iban}
                                        onChange={handleChange}
                                        placeholder="IT60X0542811101000000123456"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>SWIFT/BIC</label>
                                    <input
                                        type="text"
                                        name="swift"
                                        value={formData.swift}
                                        onChange={handleChange}
                                        placeholder="BCITITMM"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Termini di Pagamento</label>
                                    <input
                                        type="text"
                                        name="payment_terms"
                                        value={formData.payment_terms}
                                        onChange={handleChange}
                                        placeholder="30 giorni data fattura"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Limite Credito Cocchi (€)</label>
                                    <input
                                        type="number"
                                        name="credit_limit_cocchi"
                                        value={formData.credit_limit_cocchi || ''}
                                        onChange={handleChange}
                                        placeholder="10000"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Links Tab */}
                    {activeTab === 'links' && (
                        <div className="form-tab">
                            <h3><Globe size={18} /> Web & Social</h3>
                            
                            <div className="form-group">
                                <label>Sito Web</label>
                                <input
                                    type="url"
                                    name="sito_web"
                                    value={formData.sito_web}
                                    onChange={handleChange}
                                    placeholder="https://www.azienda.it"
                                />
                            </div>

                            <div className="form-group">
                                <label>Profilo Facebook</label>
                                <input
                                    type="url"
                                    name="facebook_profile"
                                    value={formData.facebook_profile}
                                    onChange={handleChange}
                                    placeholder="https://facebook.com/..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Google My Business</label>
                                <input
                                    type="url"
                                    name="google_my_business"
                                    value={formData.google_my_business}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Account Google Ads</label>
                                <input
                                    type="text"
                                    name="google_ads_account"
                                    value={formData.google_ads_account}
                                    onChange={handleChange}
                                    placeholder="ID Account Google Ads"
                                />
                            </div>

                            <h3><LinkIcon size={18} /> Drive & Documenti</h3>

                            <div className="form-group">
                                <label>Link Foto</label>
                                <input
                                    type="url"
                                    name="drive_link_foto"
                                    value={formData.drive_link_foto}
                                    onChange={handleChange}
                                    placeholder="https://drive.google.com/..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Link Video</label>
                                <input
                                    type="url"
                                    name="drive_link_video"
                                    value={formData.drive_link_video}
                                    onChange={handleChange}
                                    placeholder="https://drive.google.com/..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Link Materiali</label>
                                <input
                                    type="url"
                                    name="drive_link_materiali"
                                    value={formData.drive_link_materiali}
                                    onChange={handleChange}
                                    placeholder="https://drive.google.com/..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Visura Camerale</label>
                                <input
                                    type="url"
                                    name="visura_camerale_url"
                                    value={formData.visura_camerale_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Privacy Sheet</label>
                                <input
                                    type="url"
                                    name="privacy_sheet_url"
                                    value={formData.privacy_sheet_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Carta Servizi</label>
                                <input
                                    type="url"
                                    name="carta_servizi_url"
                                    value={formData.carta_servizi_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Carta Identità</label>
                                <input
                                    type="url"
                                    name="carta_identita_url"
                                    value={formData.carta_identita_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Access Tab */}
                    {activeTab === 'access' && (
                        <div className="form-tab">
                            <h3><Key size={18} /> Accesso Cliente ai Progetti</h3>
                            
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="access_enabled"
                                        checked={formData.access_enabled}
                                        onChange={handleChange}
                                    />
                                    <span>Abilita accesso portale clienti</span>
                                </label>
                                <p className="field-hint">
                                    Il cliente potrà visualizzare i suoi progetti e documenti
                                </p>
                            </div>

                            {formData.access_enabled && (
                                <div className="form-group">
                                    <label>Password Accesso {client ? '(lascia vuoto per non modificare)' : '*'}</label>
                                    <input
                                        type="password"
                                        name="access_password"
                                        value={formData.access_password}
                                        onChange={handleChange}
                                        placeholder="Minimo 6 caratteri"
                                        minLength={6}
                                        required={!client && formData.access_enabled}
                                    />
                                    <p className="field-hint">
                                        Password per l'accesso del cliente al portale
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleCloseWithConfirm(() => handleClose())}
                            disabled={loading}
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Salvataggio...' : (client ? 'Aggiorna Cliente' : 'Crea Cliente')}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        {/* Confirm Dialog */}
        {showConfirmDialog && (
            <div className="confirm-dialog-overlay" onClick={handleCancelClose}>
                <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                    <div className="confirm-dialog-header">
                        <AlertCircle size={24} className="confirm-dialog-icon" />
                        <h3>Conferma chiusura</h3>
                    </div>
                    <div className="confirm-dialog-content">
                        <p>Sei sicuro di voler chiudere il popup? I dati inseriti non salvati andranno persi.</p>
                    </div>
                    <div className="confirm-dialog-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleCancelClose}
                        >
                            Annulla
                        </button>
                        <button
                            type="button"
                            className="btn-primary danger"
                            onClick={handleConfirmClose}
                        >
                            Chiudi comunque
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default CreateClientModal;

