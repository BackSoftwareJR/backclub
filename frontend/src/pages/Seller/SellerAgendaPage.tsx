import React from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import SellerCalendar from '../../components/SellerCalendar/SellerCalendar';
import SellerAgendaMobile from './SellerAgendaMobile';
import GuideTour from '../../components/Guide/GuideTour';
import { agendaTourSteps, completeTourSteps } from '../../config/guideTours';
import './SellerAgendaPage.css';

const SellerAgendaPage: React.FC = () => {
  const isMobile = useIsMobile();

  // Render mobile version if on mobile
  if (isMobile) {
    return <SellerAgendaMobile />;
  }

  return (
    <div className="seller-agenda-page">
      <GuideTour steps={agendaTourSteps} tourId="agenda-tour" />
      <GuideTour steps={completeTourSteps} tourId="complete-tour" />
      <SellerCalendar />
    </div>
  );
};

export default SellerAgendaPage;

