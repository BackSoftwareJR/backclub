import React from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '../../hooks/useIsMobile';
import SellerCalendar from '../../components/SellerCalendar/SellerCalendar';
import SellerAgendaMobile from './SellerAgendaMobile';
import GuideTour from '../../components/Guide/GuideTour';
import { agendaTourSteps, completeTourSteps } from '../../config/guideTours';
import './SellerAgendaPage.css';

const SellerAgendaPage: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <SellerAgendaMobile />;
  }

  return (
    <motion.div
      className="seller-agenda-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }}
    >
      <GuideTour steps={agendaTourSteps} tourId="agenda-tour" />
      <GuideTour steps={completeTourSteps} tourId="complete-tour" />

      <div className="seller-agenda-header">
        <div>
          <h1 className="seller-agenda-title">Agenda</h1>
          <p className="seller-agenda-subtitle">Gestisci appuntamenti e scadenze</p>
        </div>
      </div>

      <div className="seller-agenda-calendar-wrap">
        <SellerCalendar />
      </div>
    </motion.div>
  );
};

export default SellerAgendaPage;
