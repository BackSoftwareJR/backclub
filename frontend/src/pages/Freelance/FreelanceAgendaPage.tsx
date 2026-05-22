import React from 'react';
import FreelanceCalendar from '../../components/FreelanceCalendar/FreelanceCalendar';
import GuideTour from '../../components/Guide/GuideTour';
import { useFreelanceCrm } from '../../context/FreelanceCrmContext';
import { freelanceCalendarioTourSteps, freelanceCompleteTourSteps } from '../../config/freelanceGuideTours';
import './FreelanceAgendaPage.css';

interface FreelanceAgendaPageProps {
  /** Quando false (vista in cache nascosta) il calendario non carica le API per evitare chiamate multiple. */
  isVisible?: boolean;
}

const FreelanceAgendaPage: React.FC<FreelanceAgendaPageProps> = ({ isVisible = true }) => {
  const { crmDepartmentCode, isCrmScoped } = useFreelanceCrm();
  const crmCode = isCrmScoped ? crmDepartmentCode : null;

  return (
    <div className="freelance-agenda-page">
      <GuideTour steps={freelanceCalendarioTourSteps} tourId="freelance-calendario-tour" />
      <GuideTour steps={freelanceCompleteTourSteps} tourId="freelance-complete-tour" />
      <FreelanceCalendar isVisible={isVisible} crmCode={crmCode} />
    </div>
  );
};

export default FreelanceAgendaPage;
