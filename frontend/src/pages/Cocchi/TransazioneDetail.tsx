import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, XCircle } from 'lucide-react';
import './TransazioneDetail.css';

const TransazioneDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Mock data
    const transazione = {
        id,
        tipo: 'entrata' as const,
        importo: 15000,
        data: '2024-12-20',
        descrizione: 'Acconto 50% Progetto Alpha',
        categoria: 'Pagamento Cliente',
        progetto: 'Progetto Alpha',
        fattura: {
            numero: 'FATT-2024-001',
            dataEmissione: '2024-12-15',
            scadenza: '2024-12-30',
            pagata: true,
            dataPagamento: '2024-12-20',
            metodoPagamento: 'Bonifico Bancario'
        },
        ricevuta: '/path/to/ricevuta.pdf',
        motivazione: 'Acconto del 50% concordato per avvio progetto come da contratto firmato il 01/12/2024',
        note: 'Cliente ha richiesto fattura con split payment'
    };

    const formatCocchi = (amount: number) => amount.toLocaleString('it-IT');

    return (
        <div className="transazione-detail">
            {/* Back Button */}
            <button className="btn-back" onClick={() => navigate(-1)}>
                <ArrowLeft size={18} />
                Indietro
            </button>

            {/* Header */}
            <div className="transazione-header">
                <div className={`transazione-type-badge ${transazione.tipo}`}>
                    {transazione.tipo === 'entrata' ? 'Entrata' : 'Uscita'}
                </div>
                <div className={`transazione-amount-large ${transazione.tipo}`}>
                    {transazione.tipo === 'entrata' ? '+' : '−'}{formatCocchi(transazione.importo)}
                </div>
            </div>

            {/* Info Grid */}
            <div className="info-grid">
                <div className="info-item">
                    <div className="info-label">Descrizione</div>
                    <div className="info-value">{transazione.descrizione}</div>
                </div>

                <div className="info-item">
                    <div className="info-label">Categoria</div>
                    <div className="info-value">{transazione.categoria}</div>
                </div>

                <div className="info-item">
                    <div className="info-label">Progetto</div>
                    <div className="info-value">{transazione.progetto}</div>
                </div>

                <div className="info-item">
                    <div className="info-label">Data</div>
                    <div className="info-value">
                        {new Date(transazione.data).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </div>
                </div>
            </div>

            {/* Fattura Info */}
            {transazione.fattura && (
                <div className="fattura-box">
                    <div className="fattura-header">
                        <div className="fattura-title">
                            <FileText size={18} />
                            Fattura {transazione.fattura.numero}
                        </div>
                        <div className={`fattura-status ${transazione.fattura.pagata ? 'paid' : 'unpaid'}`}>
                            {transazione.fattura.pagata ? (
                                <>
                                    <CheckCircle size={16} />
                                    Pagata
                                </>
                            ) : (
                                <>
                                    <XCircle size={16} />
                                    Non Pagata
                                </>
                            )}
                        </div>
                    </div>

                    <div className="fattura-details">
                        <div className="fattura-detail-item">
                            <span className="fattura-label">Emissione</span>
                            <span className="fattura-value">
                                {new Date(transazione.fattura.dataEmissione).toLocaleDateString('it-IT')}
                            </span>
                        </div>

                        <div className="fattura-detail-item">
                            <span className="fattura-label">Scadenza</span>
                            <span className="fattura-value">
                                {new Date(transazione.fattura.scadenza).toLocaleDateString('it-IT')}
                            </span>
                        </div>

                        {transazione.fattura.pagata && (
                            <>
                                <div className="fattura-detail-item">
                                    <span className="fattura-label">Data Pagamento</span>
                                    <span className="fattura-value">
                                        {new Date(transazione.fattura.dataPagamento!).toLocaleDateString('it-IT')}
                                    </span>
                                </div>

                                <div className="fattura-detail-item">
                                    <span className="fattura-label">Metodo</span>
                                    <span className="fattura-value">{transazione.fattura.metodoPagamento}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Motivazione */}
            <div className="motivazione-box">
                <div className="motivazione-label">Motivazione</div>
                <div className="motivazione-text">{transazione.motivazione}</div>
            </div>

            {/* Note */}
            {transazione.note && (
                <div className="note-box">
                    <div className="note-label">Note</div>
                    <div className="note-text">{transazione.note}</div>
                </div>
            )}

            {/* Ricevuta */}
            {transazione.ricevuta && (
                <div className="ricevuta-box">
                    <div className="ricevuta-label">Ricevuta</div>
                    <a href={transazione.ricevuta} target="_blank" rel="noopener noreferrer" className="ricevuta-link">
                        <FileText size={16} />
                        Visualizza ricevuta
                    </a>
                </div>
            )}
        </div>
    );
};

export default TransazioneDetail;
