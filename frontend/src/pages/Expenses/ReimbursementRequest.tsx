import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reimbursementsApi } from '../../api/expenses';
import { Upload, X, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import './ReimbursementRequest.css';

const ReimbursementRequest: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        amount: '',
        category: '',
        expense_date: '',
        crm_code: '',
        project_id: '',
    });

    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError('Il file non può superare 10MB');
                return;
            }

            setReceiptFile(file);
            setError(null);

            // Preview per immagini
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setReceiptPreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setReceiptPreview(null);
            }
        }
    };

    const removeFile = () => {
        setReceiptFile(null);
        setReceiptPreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!receiptFile) {
            setError('La ricevuta è obbligatoria');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = new FormData();
            data.append('title', formData.title);
            data.append('description', formData.description);
            data.append('amount', formData.amount);
            data.append('category', formData.category);
            data.append('expense_date', formData.expense_date);
            if (formData.crm_code) data.append('crm_code', formData.crm_code);
            if (formData.project_id) data.append('project_id', formData.project_id);
            data.append('receipt_file', receiptFile);

            await reimbursementsApi.create(data);
            
            setSuccess(true);
            setTimeout(() => {
                navigate('/expenses/reimbursements/my');
            }, 2000);

        } catch (err: any) {
            setError(err.response?.data?.message || 'Errore durante l\'invio');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="reimbursement-request">
                <div className="success-container">
                    <CheckCircle size={64} color="#34C759" />
                    <h2>Richiesta Inviata!</h2>
                    <p>La tua richiesta di rimborso è stata inviata con successo.</p>
                    <p>Riceverai una notifica quando verrà approvata.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reimbursement-request">
            <div className="request-header">
                <h1>Richiedi Rimborso Spesa</h1>
                <p>Compila il form e allega la ricevuta per richiedere il rimborso</p>
            </div>

            <form onSubmit={handleSubmit} className="request-form">
                {/* Titolo */}
                <div className="form-group">
                    <label htmlFor="title">Titolo Spesa *</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        placeholder="es: Taxi per incontro cliente"
                    />
                </div>

                {/* Descrizione */}
                <div className="form-group">
                    <label htmlFor="description">Descrizione</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Dettagli aggiuntivi sulla spesa..."
                    />
                </div>

                <div className="form-row">
                    {/* Importo */}
                    <div className="form-group">
                        <label htmlFor="amount">Importo (€) *</label>
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                        />
                    </div>

                    {/* Data Spesa */}
                    <div className="form-group">
                        <label htmlFor="expense_date">Data Spesa *</label>
                        <input
                            type="date"
                            id="expense_date"
                            name="expense_date"
                            value={formData.expense_date}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                <div className="form-row">
                    {/* Categoria */}
                    <div className="form-group">
                        <label htmlFor="category">Categoria</label>
                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                        >
                            <option value="">Seleziona...</option>
                            <option value="TRASPORTI">Trasporti</option>
                            <option value="CARBURANTE">Carburante</option>
                            <option value="PASTI">Pasti</option>
                            <option value="HOTEL">Hotel</option>
                            <option value="MATERIALI">Materiali</option>
                            <option value="SOFTWARE">Software</option>
                            <option value="ALTRO">Altro</option>
                        </select>
                    </div>

                    {/* CRM */}
                    <div className="form-group">
                        <label htmlFor="crm_code">CRM di Riferimento</label>
                        <select
                            id="crm_code"
                            name="crm_code"
                            value={formData.crm_code}
                            onChange={handleChange}
                        >
                            <option value="">Nessuno</option>
                            <option value="SITI_WEB">Siti Web</option>
                            <option value="CRM_PM">CRM PM</option>
                            <option value="MARKETING">Marketing</option>
                            <option value="VIDEO_GRAFICA">Video e Grafica</option>
                        </select>
                    </div>
                </div>

                {/* Upload Ricevuta */}
                <div className="form-group">
                    <label>Ricevuta / Scontrino *</label>
                    <div className="upload-area">
                        {!receiptFile ? (
                            <label htmlFor="receipt-upload" className="upload-label">
                                <Upload size={32} />
                                <span>Clicca per caricare o trascina qui</span>
                                <small>PDF, JPG, PNG (max 10MB)</small>
                                <input
                                    type="file"
                                    id="receipt-upload"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        ) : (
                            <div className="file-preview">
                                {receiptPreview ? (
                                    <img src={receiptPreview} alt="Preview" className="preview-image" />
                                ) : (
                                    <FileText size={48} />
                                )}
                                <div className="file-info">
                                    <span className="file-name">{receiptFile.name}</span>
                                    <span className="file-size">{(receiptFile.size / 1024).toFixed(0)} KB</span>
                                </div>
                                <button type="button" onClick={removeFile} className="btn-remove">
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="form-actions">
                    <button type="button" onClick={() => navigate(-1)} className="btn-secondary" disabled={loading}>
                        Annulla
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader className="spinner" size={18} />
                                Invio in corso...
                            </>
                        ) : (
                            'Invia Richiesta'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReimbursementRequest;

