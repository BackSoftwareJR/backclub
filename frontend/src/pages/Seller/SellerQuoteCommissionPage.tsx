import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Info } from 'lucide-react';
import { quotesApi } from '../../api/quotes';
import { sellerCommissionsApi } from '../../api/sellerCommissions';
import type { Quote } from '../../types/sellers';
import { sellerCache } from '../../utils/sellerCache';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerQuoteCommissionPage.css';

const cardVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const, delay: i * 0.08 },
  }),
};

/** Commissione stimata = subtotale servizi × aliquota. Non su rinnovi. */
function getEstimatedCommission(quote: Quote, commissionRate: number): number {
  const base = quote.subtotal ?? 0;
  const rate = Number(commissionRate) || 0;
  return (base * rate) / 100;
}

const SellerQuoteCommissionPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    const quoteId = Number(id);
    if (!quoteId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let q: Quote | null = sellerCache.detail.quote.get<Quote>(quoteId) ?? null;
      if (!q) {
        q = await quotesApi.getById(quoteId);
        sellerCache.detail.quote.set(quoteId, q);
      }
      setQuote(q);

      let rate = q.seller?.commission_rate;
      if (rate == null || rate === undefined) {
        const contractsRes = await sellerCommissionsApi.getContracts();
        rate = contractsRes?.data?.summary?.commission_rate ?? 0;
      }
      setCommissionRate(Number(rate) || 0);
    } catch (error) {
      console.error('Errore caricamento preventivo/commissione:', error);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="seller-quote-commission-page">
        <div className="seller-quote-commission-header">
          <div className="skeleton-line" style={{ width: 40, height: 40, borderRadius: 10 }} />
          <div className="skeleton-line" style={{ flex: 1, height: 24, marginLeft: 12 }} />
        </div>
        <div className="seller-quote-commission-content">
          <SkeletonLoader type="list" count={4} />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="seller-quote-commission-page">
        <div className="seller-quote-commission-header">
          <button
            type="button"
            className="seller-quote-commission-back"
            onClick={() => navigate('/seller/preventivi')}
            aria-label="Indietro"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="seller-quote-commission-title">Commissione stimata</h1>
        </div>
        <div className="seller-quote-commission-empty">
          <p>Preventivo non trovato.</p>
          <button
            type="button"
            className="seller-quote-commission-btn-primary"
            onClick={() => navigate('/seller/preventivi')}
          >
            Torna ai preventivi
          </button>
        </div>
      </div>
    );
  }

  const estimated = getEstimatedCommission(quote, commissionRate);
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);

  return (
    <div className="seller-quote-commission-page">
      <motion.header
        className="seller-quote-commission-header"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <button
          type="button"
          className="seller-quote-commission-back"
          onClick={() => navigate(`/seller/preventivi/${quote.id}`)}
          aria-label="Indietro"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="seller-quote-commission-title">Commissione stimata</h1>
      </motion.header>

      <div className="seller-quote-commission-content">
        <motion.div
          className="seller-quote-commission-card seller-quote-commission-card-hero"
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="seller-quote-commission-hero-label">Preventivo</div>
          <div className="seller-quote-commission-hero-value">{quote.quote_number}</div>
          {quote.title && (
            <div className="seller-quote-commission-hero-sub">{quote.title}</div>
          )}
        </motion.div>

        <motion.div
          className="seller-quote-commission-card"
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="seller-quote-commission-row">
            <span className="seller-quote-commission-label">Base (subtotale servizi)</span>
            <span className="seller-quote-commission-value">{formatCurrency(quote.subtotal ?? 0)}</span>
          </div>
          <div className="seller-quote-commission-row">
            <span className="seller-quote-commission-label">Commissione</span>
            <span className="seller-quote-commission-value">{commissionRate}%</span>
          </div>
          <div className="seller-quote-commission-divider" />
          <div className="seller-quote-commission-row seller-quote-commission-row-final">
            <span className="seller-quote-commission-label">Commissione stimata</span>
            <span className="seller-quote-commission-value-final">{formatCurrency(estimated)}</span>
          </div>
        </motion.div>

        <motion.div
          className="seller-quote-commission-note"
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Info size={18} className="seller-quote-commission-note-icon" />
          <div className="seller-quote-commission-note-text">
            <p>
              La commissione è calcolata sui servizi (subtotale) e non su eventuali rinnovi.
            </p>
            <p>
              Sarà disponibile alla riscossione quando BackSoftware incasserà l&apos;importo del contratto. Se il cliente paga a rate, ad ogni rata effettivamente incassata da BackSoftware verrà reso disponibile alla riscossione il credito di commissione calcolato su quella rata; così fino al completamento del contratto e al saldo completo della commissione.
            </p>
          </div>
        </motion.div>

        <motion.button
          type="button"
          className="seller-quote-commission-btn-primary"
          onClick={() => navigate(`/seller/preventivi/${quote.id}`)}
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          Torna al preventivo
        </motion.button>
      </div>
    </div>
  );
};

export default SellerQuoteCommissionPage;
