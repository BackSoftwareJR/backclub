import React, { useState, useEffect } from 'react';
import { Building, User, FileText, Link as LinkIcon, Key } from 'lucide-react';
import type { CreateClientData } from '../../api/clients';
import './ClientInfoStep.css';

interface ClientInfoStepProps {
    clientData: CreateClientData | null;
    onUpdate: (data: CreateClientData) => void;
    onSkip: () => void;
}

const ClientInfoStep: React.FC<ClientInfoStepProps> = ({ clientData, onUpdate, onSkip }) => {
    const [activeTab, setActiveTab] = useState<'base' | 'contacts' | 'fiscal' | 'links' | 'access'>('base');
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
        if (clientData) {
            setFormData({
                company_name: clientData.company_name || '',
                ragione_sociale: clientData.ragione_sociale || '',
                contact_person: clientData.contact_person || '',
                referente_nome: clientData.referente_nome || '',
                referente_cognome: clientData.referente_cognome || '',
                referente_telefono: clientData.referente_telefono || '',
                referente_email: clientData.referente_email || '',
                partita_iva: clientData.partita_iva || '',
                codice_fiscale: clientData.codice_fiscale || '',
                vat_number: clientData.vat_number || '',
                tax_code: clientData.tax_code || '',
                address: clientData.address || '',
                phone: clientData.phone || '',
                email: clientData.email || '',
                iban: clientData.iban || '',
                swift: clientData.swift || '',
                sdi_code: clientData.sdi_code || '',
                pec: clientData.pec || '',
                sito_web: clientData.sito_web || '',
                drive_link_foto: clientData.drive_link_foto || '',
                drive_link_video: clientData.drive_link_video || '',
                drive_link_materiali: clientData.drive_link_materiali || '',
                facebook_profile: clientData.facebook_profile || '',
                google_ads_account: clientData.google_ads_account || '',
                google_my_business: clientData.google_my_business || '',
                visura_camerale_url: clientData.visura_camerale_url || '',
                visura_camerale_reminder: clientData.visura_camerale_reminder || false,
                privacy_sheet_url: clientData.privacy_sheet_url || '',
                carta_servizi_url: clientData.carta_servizi_url || '',
                carta_identita_url: clientData.carta_identita_url || '',
                payment_terms: clientData.payment_terms || '',
                credit_limit_cocchi: clientData.credit_limit_cocchi,
                notes: clientData.notes || '',
                access_enabled: clientData.access_enabled || false,
                access_password: '',
                is_active: clientData.is_active !== undefined ? clientData.is_active : true,
            });
        }
    }, [clientData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSave = () => {
        onUpdate(formData);
    };

    const hasRequiredFields = formData.company_name && formData.email;

    return (
        <div className="client-info-step">
            <div className="step-header">
                <h2>Completa Anagrafica Cliente</h2>
                <p>Verifica e completa tutti i dati del cliente per procedere con l'assegnazione del progetto.</p>
            </div>

            <div className="client-info-tabs">
                <button
                    className={`tab-button ${activeTab === 'base' ? 'active' : ''}`}
                    onClick={() => setActiveTab('base')}
                >
                    <Building size={18} />
                    Dati Base
                </button>
                <button
                    className={`tab-button ${activeTab === 'contacts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('contacts')}
                >
                    <User size={18} />
                    Contatti
                </button>
                <button
                    className={`tab-button ${activeTab === 'fiscal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fiscal')}
                >
                    <FileText size={18} />
                    Fiscali
                </button>
                <button
                    className={`tab-button ${activeTab === 'links' ? 'active' : ''}`}
                    onClick={() => setActiveTab('links')}
                >
                    <LinkIcon size={18} />
                    Link & Documenti
                </button>
                <button
                    className={`tab-button ${activeTab === 'access' ? 'active' : ''}`}
                    onClick={() => setActiveTab('access')}
                >
                    <Key size={18} />
                    Accesso & Pagamenti
                </button>
            </div>

            <div className="client-info-content">
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
                                <label>Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="info@azienda.it"
                                    required
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
                                    placeholder="pec@azienda.it"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>VAT Number</label>
                                <input
                                    type="text"
                                    name="vat_number"
                                    value={formData.vat_number}
                                    onChange={handleChange}
                                    placeholder="IT12345678901"
                                />
                            </div>
                            <div className="form-group">
                                <label>Tax Code</label>
                                <input
                                    type="text"
                                    name="tax_code"
                                    value={formData.tax_code}
                                    onChange={handleChange}
                                    placeholder="Tax code internazionale"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Links Tab */}
                {activeTab === 'links' && (
                    <div className="form-tab">
                        <h3><LinkIcon size={18} /> Link & Documenti</h3>
                        
                        <div className="form-row">
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
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Drive Link Foto</label>
                                <input
                                    type="url"
                                    name="drive_link_foto"
                                    value={formData.drive_link_foto}
                                    onChange={handleChange}
                                    placeholder="https://drive.google.com/..."
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Drive Link Video</label>
                                <input
                                    type="url"
                                    name="drive_link_video"
                                    value={formData.drive_link_video}
                                    onChange={handleChange}
                                    placeholder="https://drive.google.com/..."
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Drive Link Materiali</label>
                                <input
                                    type="url"
                                    name="drive_link_materiali"
                                    value={formData.drive_link_materiali}
                                    onChange={handleChange}
                                    placeholder="https://drive.google.com/..."
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Facebook Profile</label>
                                <input
                                    type="url"
                                    name="facebook_profile"
                                    value={formData.facebook_profile}
                                    onChange={handleChange}
                                    placeholder="https://facebook.com/..."
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Google Ads Account</label>
                                <input
                                    type="text"
                                    name="google_ads_account"
                                    value={formData.google_ads_account}
                                    onChange={handleChange}
                                    placeholder="Account ID o email"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Google My Business</label>
                                <input
                                    type="url"
                                    name="google_my_business"
                                    value={formData.google_my_business}
                                    onChange={handleChange}
                                    placeholder="https://business.google.com/..."
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Visura Camerale URL</label>
                                <input
                                    type="url"
                                    name="visura_camerale_url"
                                    value={formData.visura_camerale_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Privacy Sheet URL</label>
                                <input
                                    type="url"
                                    name="privacy_sheet_url"
                                    value={formData.privacy_sheet_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Carta Servizi URL</label>
                                <input
                                    type="url"
                                    name="carta_servizi_url"
                                    value={formData.carta_servizi_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Carta Identità URL</label>
                                <input
                                    type="url"
                                    name="carta_identita_url"
                                    value={formData.carta_identita_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Access Tab */}
                {activeTab === 'access' && (
                    <div className="form-tab">
                        <h3><Key size={18} /> Accesso & Pagamenti</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>IBAN</label>
                                <input
                                    type="text"
                                    name="iban"
                                    value={formData.iban}
                                    onChange={handleChange}
                                    placeholder="IT60 X054 2811 1010 0000 0123 456"
                                />
                            </div>
                            <div className="form-group">
                                <label>SWIFT</label>
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
                                    placeholder="Es: 30 giorni, bonifico"
                                />
                            </div>
                            <div className="form-group">
                                <label>Limite Credito (Cocchi)</label>
                                <input
                                    type="number"
                                    name="credit_limit_cocchi"
                                    value={formData.credit_limit_cocchi || ''}
                                    onChange={handleChange}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="access_enabled"
                                    checked={formData.access_enabled}
                                    onChange={handleChange}
                                />
                                <span>Abilita accesso cliente</span>
                            </label>
                        </div>

                        {formData.access_enabled && (
                            <div className="form-group">
                                <label>Password Accesso</label>
                                <input
                                    type="password"
                                    name="access_password"
                                    value={formData.access_password}
                                    onChange={handleChange}
                                    placeholder="Minimo 6 caratteri"
                                    minLength={6}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="client-info-actions">
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={onSkip}
                >
                    Salta (usa dati esistenti)
                </button>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={!hasRequiredFields}
                >
                    Salva e Continua
                </button>
            </div>
        </div>
    );
};

export default ClientInfoStep;

