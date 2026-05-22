import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sellerCommissionsApi } from '../../api/sellerCommissions';
import { amministrazioneGuideSections } from '../../data/supportData';
import './AmministrazioneModal.css';

interface AmministrazioneModalProps {
  onClose: () => void;
  themeClass?: string;
}

const AmministrazioneModal: React.FC<AmministrazioneModalProps> = ({ onClose, themeClass = 'theme-light' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [commissionRate, setCommissionRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['intro-commissione', 'come-si-calcolano', 'crediti-presunti-attesa-disponibili']));

  useEffect(() => {
    if (user?.seller_id) {
      sellerCommissionsApi.getContracts()
        .then((res: { data?: { data?: unknown[]; summary?: { commission_rate?: number } }; success?: boolean }) => {
          const inner = res?.data;
          const summary = inner && typeof inner === 'object' && 'summary' in inner ? (inner as { summary?: { commission_rate?: number } }).summary : undefined;
          if (summary?.commission_rate != null) {
            setCommissionRate(Number(summary.commission_rate));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingRate(false));
    } else {
      setLoadingRate(false);
    }
  }, [user?.seller_id]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGoToCommissions = () => {
    onClose();
    navigate('/seller/commissioni');
  };

  return (
    <div className="support-modal-overlay amministrazione-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="amministrazione-modal-title">
      <div className={`support-modal-content amministrazione-modal-content ${themeClass}`} onClick={e => e.stopPropagation()}>
        <div className="support-modal-header amministrazione-modal-header">
          <div className="support-modal-title-section">
            <Wallet className="support-modal-icon amministrazione-modal-icon" size={32} />
            <h2 id="amministrazione-modal-title">Amministrazione & Provvigioni</h2>
          </div>
          <button type="button" className="support-modal-close" onClick={onClose} aria-label="Chiudi">
            <X size={24} />
          </button>
        </div>

        <div className="support-modal-body amministrazione-modal-body">
          {/* La tua commissione - valore da DB */}
          <div className="amministrazione-commission-badge">
            <span className="amministrazione-commission-label">La tua commissione</span>
            {loadingRate ? (
              <span className="amministrazione-commission-value loading">—</span>
            ) : commissionRate != null ? (
              <span className="amministrazione-commission-value">{commissionRate}%</span>
            ) : (
              <span className="amministrazione-commission-value">Consulta la sezione Commissioni</span>
            )}
            <p className="amministrazione-commission-note">
              La percentuale è quella associata al tuo profilo venditore.
            </p>
          </div>

          {/* Sezioni guida (espandibili) */}
          <div className="amministrazione-guide-sections">
            {amministrazioneGuideSections.map(section => {
              const isExpanded = expandedSections.has(section.id);
              return (
                <div key={section.id} className="support-modal-section amministrazione-guide-section">
                  <button
                    type="button"
                    className="amministrazione-guide-section-title"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isExpanded}
                  >
                    <span>{section.title}</span>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {isExpanded && (
                    <div className="amministrazione-guide-section-content">
                      <p>{section.content}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA Commissioni */}
          <div className="amministrazione-modal-cta">
            <button type="button" className="amministrazione-cta-btn" onClick={handleGoToCommissions}>
              <Wallet size={20} />
              Vai a Commissioni
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmministrazioneModal;
