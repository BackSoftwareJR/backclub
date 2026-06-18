import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react';
import { sellerCommissionsApi } from '../../api/sellerCommissions';
import type { SellerCommissionDetail } from '../../types/sellerCommissions';
import SkeletonLoader from '../../components/Mobile/SkeletonLoader';
import './SellerCommissionDetailPage.css';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const, delay: i * 0.08 },
  }),
};

const SellerCommissionDetailPage: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<SellerCommissionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contractId) {
      loadDetail();
    }
  }, [contractId]);

  const loadDetail = async () => {
    if (!contractId) return;

    try {
      setLoading(true);
      const response = await sellerCommissionsApi.getByContract(parseInt(contractId));
      setDetail(response.data || null);
    } catch (error) {
      console.error('Errore nel caricamento dettaglio:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      pending:            { label: 'In Attesa',                   class: 'status-pending' },
      pending_collection: { label: 'In Attesa di Riscossione',    class: 'status-pending-collection' },
      collected:          { label: 'Riscossa',                    class: 'status-collected' },
    };
    return badges[status] || { label: status, class: 'status-default' };
  };

  const getClientInitials = (companyName: string | undefined): string => {
    if (!companyName) return '?';
    const parts = companyName.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return companyName.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string | undefined): string => {
    if (!name) return 'var(--seller-accent)';
    const colors = [
      '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
      '#a855f7', '#ec4899', '#14b8a6', '#06b6d4', '#f97316',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className="commission-detail-page commission-detail-skeleton">
        <div className="seller-detail-skeleton-header">
          <div className="skeleton-line skeleton-pulse-fill w-1/4 short" style={{ height: 24 }} />
          <div className="skeleton-line skeleton-pulse-fill w-1/2" style={{ height: 32, marginTop: 8 }} />
        </div>
        <div className="seller-detail-skeleton-content">
          <SkeletonLoader type="list" count={6} />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="commission-detail-empty-state">
        <h3>Dettaglio non trovato</h3>
      </div>
    );
  }

  const totalPending           = detail.commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
  const totalPendingCollection = detail.commissions.filter(c => c.status === 'pending_collection').reduce((sum, c) => sum + c.amount, 0);
  const totalCollected         = detail.commissions.filter(c => c.status === 'collected').reduce((sum, c) => sum + c.amount, 0);
  const totalCommission        = totalPending + totalPendingCollection + totalCollected;

  const totalInstallments = detail.timeline?.length || 0;
  const paidInstallments  = detail.timeline?.filter(item =>
    item.commission?.status === 'collected' ||
    (item.invoice?.status === 'paid' && item.commission)
  ).length || 0;
  const progressPercentage = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;

  const contractStatus = detail.payment_plan?.status || 'active';
  const getContractStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      active:    'Attivo',
      completed: 'Completato',
      cancelled: 'Annullato',
      pending:   'In Attesa',
      paid:      'Pagato',
      overdue:   'Scaduto',
    };
    return statusMap[status] || status;
  };

  const clientName     = detail.contract.client?.company_name || 'Cliente non specificato';
  const clientInitials = getClientInitials(detail.contract.client?.company_name);
  const avatarColor    = getAvatarColor(detail.contract.client?.company_name);

  return (
    <div className="commission-detail-page">
      <motion.button
        className="commission-detail-back-btn"
        onClick={() => navigate('/seller/commissioni')}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      >
        <ArrowLeft size={18} />
        Indietro
      </motion.button>

      {/* Statement Header */}
      <motion.div
        className="commission-statement-header"
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        {/* Column 1: Identity */}
        <div className="statement-col-identity">
          <h1 className="statement-contract-title">
            {detail.contract.title || detail.contract.contract_number}
          </h1>
          <div className="statement-client-info">
            <div
              className="statement-client-avatar"
              style={{ background: avatarColor }}
            >
              {clientInitials}
            </div>
            <div className="statement-client-name">{clientName}</div>
          </div>
          <div className={`statement-status-badge status-${contractStatus}`}>
            {getContractStatusLabel(contractStatus)}
          </div>
        </div>

        {/* Column 2: Progress */}
        <div className="statement-col-progress">
          <div className="statement-progress-label">Avanzamento Incassi</div>
          <div className="statement-progress-bar-container">
            <div
              className="statement-progress-bar"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="statement-progress-stats">
            Rate Saldate: {paidInstallments}/{totalInstallments}
          </div>
        </div>

        {/* Column 3: The Money */}
        <div className="statement-col-money">
          <div className="statement-total-commission">
            {formatCurrency(totalCommission)}
          </div>
          <div className="statement-breakdown">
            <span className="statement-breakdown-item collected">
              <CheckCircle size={14} className="statement-breakdown-icon" />
              Riscossi: <span className="statement-breakdown-amount">{formatCurrency(totalCollected)}</span>
            </span>
            <span className="statement-breakdown-item pending">
              <Clock size={14} className="statement-breakdown-icon" />
              In Attesa: <span className="statement-breakdown-amount">{formatCurrency(totalPending + totalPendingCollection)}</span>
            </span>
          </div>
        </div>
      </motion.div>

      {/* Transactions Table */}
      {detail.timeline && detail.timeline.length > 0 && (
        <motion.div
          className="commission-transactions-card"
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <h2 className="transactions-card-title">Piano Rateale &amp; Commissioni</h2>
          <div className="transactions-table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th className="table-col-scadenza">Scadenza</th>
                  <th className="table-col-rata">Rata</th>
                  <th className="table-col-importo">Importo Contratto</th>
                  <th className="table-col-commissione">COMMISSIONE</th>
                  <th className="table-col-stato">Stato</th>
                </tr>
              </thead>
              <tbody>
                {detail.timeline.map((item) => {
                  const installment = item.installment;
                  const commission  = item.commission;
                  const statusBadge = commission ? getStatusBadge(commission.status) : null;
                  const isPaid      = commission?.status === 'collected' || item.invoice?.status === 'paid';

                  return (
                    <tr key={installment.id} className="transaction-row">
                      <td className="table-col-scadenza">
                        <span className="transaction-date">{formatDate(installment.due_date)}</span>
                      </td>
                      <td className="table-col-rata">
                        <span className="transaction-installment">
                          Rata {installment.installment_number}/{totalInstallments}
                        </span>
                      </td>
                      <td className="table-col-importo">
                        <span className="transaction-amount">{formatCurrency(installment.amount)}</span>
                      </td>
                      <td className="table-col-commissione">
                        {commission ? (
                          <span className={`transaction-commission ${isPaid ? 'commission-paid' : 'commission-pending'}`}>
                            {formatCurrency(commission.amount)}
                          </span>
                        ) : item.expected_commission ? (
                          <span className="transaction-commission commission-expected">
                            {formatCurrency(item.expected_commission)}
                          </span>
                        ) : (
                          <span className="transaction-commission commission-na">—</span>
                        )}
                      </td>
                      <td className="table-col-stato">
                        {statusBadge ? (
                          <span className={`transaction-status-pill ${statusBadge.class}`}>
                            {statusBadge.label}
                          </span>
                        ) : (
                          <span className="transaction-status-pill status-no-commission">
                            Non creata
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SellerCommissionDetailPage;
