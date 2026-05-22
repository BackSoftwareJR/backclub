import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  DollarSign, 
  Zap, 
  PlayCircle,
  CheckCircle
} from 'lucide-react';
import type { GuideStep } from '../components/Guide/GuideTour';
import { dashboardTourSteps } from './guideTours';

/**
 * Hook to get translated tour steps
 * This ensures all tour content is properly translated
 */
export const useTranslatedTourSteps = () => {
  const { t } = useTranslation();

  const getTranslatedCompleteTourSteps = (): GuideStep[] => {
    return [
      {
        target: '.seller-sidebar',
        content: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <PlayCircle size={20} style={{ color: '#6366F1' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {t('tour.steps.complete.title')}
              </h3>
            </div>
            <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
              {t('tour.steps.complete.description')}
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
              <strong>{t('tour.steps.complete.sections')}</strong>
            </p>
            <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
              <li>{t('menu.dashboard')} - {t('dashboard.subtitle')}</li>
              <li>{t('menu.listini')} - Prodotti e servizi</li>
              <li>{t('menu.preventivi')} - Gestione preventivi</li>
              <li>{t('menu.contratti')} - Contratti attivi</li>
              <li>{t('menu.clienti')} - Portafoglio clienti</li>
              <li>{t('menu.commissioni')} - Monitoraggio provvigioni</li>
              <li>{t('menu.contatti')} - Gestione leads</li>
              <li>{t('menu.agenda')} - Calendario attività</li>
            </ul>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
              {t('tour.steps.complete.start')}
            </p>
          </div>
        ),
        placement: 'right',
        disableBeacon: true,
      },
      {
        target: '.venditori-page-header',
        content: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <BarChart3 size={20} style={{ color: '#6366F1' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {t('tour.steps.dashboard.title')}
              </h3>
            </div>
            <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
              {t('tour.steps.dashboard.description')}
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
              {t('tour.steps.dashboard.tip')}
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.kpi-status-bar',
        content: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <BarChart3 size={20} style={{ color: '#6366F1' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {t('tour.steps.kpi.title')}
              </h3>
            </div>
            <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
              {t('tour.steps.kpi.description')}
            </p>
            <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: '0 0 12px 0', lineHeight: '1.8' }}>
              <li><strong>{t('dashboard.kpi.pending_quotes')}:</strong> {t('tour.steps.kpi.quotes')}</li>
              <li><strong>{t('dashboard.kpi.active_contracts')}:</strong> {t('tour.steps.kpi.contracts')}</li>
              <li><strong>{t('dashboard.kpi.total_clients')}:</strong> {t('tour.steps.kpi.clients')}</li>
              <li><strong>{t('dashboard.kpi.leads_to_contact')}:</strong> {t('tour.steps.kpi.leads')}</li>
            </ul>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
              <strong>{t('tour.steps.kpi.tip')}</strong>
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
              {t('tour.steps.kpi.arrows')}
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '.overview-revenue-card',
        content: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <DollarSign size={20} style={{ color: '#10B981' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {t('tour.steps.revenue.title')}
              </h3>
            </div>
            <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
              {t('tour.steps.revenue.description')}
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
              <strong>{t('tour.steps.revenue.info')}</strong>
            </p>
            <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
              <li>{t('tour.steps.revenue.total')}</li>
              <li>{t('tour.steps.revenue.month')}</li>
              <li>{t('tour.steps.revenue.change')}</li>
            </ul>
          </div>
        ),
        placement: 'right',
      },
      {
        target: '.quick-actions-bar',
        content: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Zap size={20} style={{ color: '#F59E0B' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {t('tour.steps.quick_actions.title')}
              </h3>
            </div>
            <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
              {t('tour.steps.quick_actions.description')}
            </p>
            <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
              <li><strong>{t('dashboard.quick_actions.new_quote')}:</strong> {t('tour.steps.quick_actions.new_quote')}</li>
              <li><strong>{t('dashboard.quick_actions.new_contact')}:</strong> {t('tour.steps.quick_actions.new_contact')}</li>
              <li><strong>{t('dashboard.quick_actions.view_agenda')}:</strong> {t('tour.steps.quick_actions.view_agenda')}</li>
            </ul>
          </div>
        ),
        placement: 'bottom',
      },
      // Add more translated steps from dashboardTourSteps...
      ...dashboardTourSteps.slice(4), // Skip first 4 as we've translated them above
      {
        target: '.seller-sidebar',
        content: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <CheckCircle size={20} style={{ color: '#10B981' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {t('tour.steps.complete_finish.title')}
              </h3>
            </div>
            <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
              {t('tour.steps.complete_finish.description')}
            </p>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px' }}>
              <strong>{t('tour.steps.complete_finish.remember')}</strong>
            </p>
            <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
              <li>{t('tour.steps.complete_finish.restart')}</li>
              <li>{t('tour.steps.complete_finish.specific')}</li>
              <li>{t('tour.steps.complete_finish.progress')}</li>
            </ul>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
              {t('tour.steps.complete_finish.good_luck')}
            </p>
          </div>
        ),
        placement: 'right',
      },
    ];
  };

  return {
    getTranslatedCompleteTourSteps,
  };
};
