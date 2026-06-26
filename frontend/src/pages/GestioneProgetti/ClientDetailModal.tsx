import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Loader, Mail, Phone, X } from 'lucide-react';
import { getClient, type Client } from '../../api/clients';
import './ClientDetailModal.css';

interface ClientDetailModalProps {
  clientId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface InfoField {
  label: string;
  value: string | null | undefined;
  type?: 'text' | 'email' | 'phone' | 'link';
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ clientId, isOpen, onClose }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !clientId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setClient(null);

    getClient(clientId)
      .then((data) => {
        if (!cancelled) setClient(data);
      })
      .catch(() => {
        if (!cancelled) setError('Impossibile caricare i dettagli del cliente.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, clientId]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const referente =
    client?.referente_nome || client?.referente_cognome
      ? `${client.referente_nome || ''} ${client.referente_cognome || ''}`.trim()
      : client?.contact_person;

  const fields: InfoField[] = client
    ? [
        { label: 'Ragione sociale', value: client.ragione_sociale || client.company_name },
        { label: 'Azienda', value: client.company_name },
        { label: 'Partita IVA', value: client.partita_iva || client.vat_number },
        { label: 'Codice fiscale', value: client.codice_fiscale || client.tax_code },
        { label: 'Email', value: client.email, type: 'email' },
        { label: 'Telefono', value: client.phone, type: 'phone' },
        { label: 'PEC', value: client.pec, type: 'email' },
        { label: 'Indirizzo', value: client.address },
        { label: 'Referente', value: referente },
        { label: 'Email referente', value: client.referente_email, type: 'email' },
        { label: 'Telefono referente', value: client.referente_telefono, type: 'phone' },
        { label: 'Sito web', value: client.sito_web, type: 'link' },
        { label: 'IBAN', value: client.iban },
        { label: 'Codice SDI', value: client.sdi_code },
        { label: 'Termini di pagamento', value: client.payment_terms },
        { label: 'Note', value: client.notes },
      ]
    : [];

  const renderValue = (field: InfoField) => {
    if (!field.value) return <span className="cdm-value-empty">—</span>;

    if (field.type === 'email') {
      return (
        <a href={`mailto:${field.value}`} className="cdm-value-link">
          <Mail size={13} />
          {field.value}
        </a>
      );
    }

    if (field.type === 'phone') {
      return (
        <a href={`tel:${field.value}`} className="cdm-value-link">
          <Phone size={13} />
          {field.value}
        </a>
      );
    }

    if (field.type === 'link') {
      const href = field.value.startsWith('http') ? field.value : `https://${field.value}`;
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="cdm-value-link">
          {field.value}
        </a>
      );
    }

    return <span>{field.value}</span>;
  };

  return createPortal(
    <div className="cdm-overlay" onClick={onClose} role="presentation">
      <div
        className="cdm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cdm-title"
      >
        <div className="cdm-header">
          <div className="cdm-header-main">
            <div className="cdm-icon">
              <Building2 size={22} />
            </div>
            <div className="cdm-header-text">
              <span className="cdm-eyebrow">Dettagli cliente</span>
              <h2 id="cdm-title" className="cdm-title">
                {client?.company_name ?? 'Cliente'}
              </h2>
              {referente && <p className="cdm-subtitle">{referente}</p>}
            </div>
          </div>
          <button type="button" className="cdm-close" onClick={onClose} aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>

        <div className="cdm-body">
          {loading && (
            <div className="cdm-state">
              <Loader size={22} className="cdm-spinner" />
              <span>Caricamento dettagli…</span>
            </div>
          )}

          {!loading && error && (
            <div className="cdm-state cdm-state--error">
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && client && (
            <div className="cdm-grid">
              {fields.map((field) => (
                <div
                  key={field.label}
                  className={`cdm-field${field.label === 'Indirizzo' || field.label === 'Note' ? ' cdm-field--wide' : ''}`}
                >
                  <span className="cdm-label">{field.label}</span>
                  <div className="cdm-value">{renderValue(field)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cdm-footer">
          <button type="button" className="cdm-close-btn" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ClientDetailModal;
