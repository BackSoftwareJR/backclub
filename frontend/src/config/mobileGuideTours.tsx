import { 
  BarChart3, 
  Zap, 
  PlayCircle,
  CheckCircle,
  FileText,
  MoreHorizontal
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GuideStep } from '../components/Guide/GuideTour';

/**
 * Mobile-specific tour steps
 * These use mobile-specific selectors and are optimized for mobile UI
 */
export const getMobileCompleteTourSteps = (): GuideStep[] => {
  // We need to use a function that returns steps because we need useTranslation hook
  // This will be called from a component that has access to the hook
  return [];
};

/**
 * Hook to get mobile tour steps with translations
 */
export const useMobileTourSteps = () => {
  const { t } = useTranslation();

  const getMobileCompleteTourSteps = (): GuideStep[] => {
    return [
      {
        target: '.dashboard-mobile-health',
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
              <li>{t('menu.preventivi')} - {t('tour.steps.complete.quotes_management')}</li>
              <li>{t('menu.contatti')} - {t('tour.steps.complete.leads_management')}</li>
              <li>{t('menu.agenda')} - {t('tour.steps.complete.activities_calendar')}</li>
              <li>{t('menu.more')} - {t('tour.steps.complete.other_menus')}</li>
            </ul>
            <p style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '12px' }}>
              {t('tour.steps.complete.start')}
            </p>
          </div>
        ),
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '.dashboard-header',
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
        target: '.stats-grid',
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
        target: '.quick-actions',
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
            </ul>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '.recent-quotes',
        content: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <FileText size={20} style={{ color: '#6366F1' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {t('tour.steps.recent_quotes.title')}
              </h3>
            </div>
            <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
              {t('tour.steps.recent_quotes.description')}
            </p>
          </div>
        ),
        placement: 'bottom',
      },
      {
        target: '.seller-mobile-nav-bar',
        content: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <MoreHorizontal size={20} style={{ color: '#6366F1' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {t('tour.steps.mobile_navigation.title')}
              </h3>
            </div>
            <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>
              {t('tour.steps.mobile_navigation.description')}
            </p>
            <ul style={{ fontSize: '13px', color: '#9CA3AF', paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
              <li><strong>{t('menu.dashboard')}:</strong> {t('tour.steps.mobile_navigation.dashboard_desc')}</li>
              <li><strong>{t('menu.contatti')}:</strong> {t('tour.steps.mobile_navigation.contacts_desc')}</li>
              <li><strong>{t('menu.preventivi')}:</strong> {t('tour.steps.mobile_navigation.quotes_desc')}</li>
              <li><strong>{t('menu.agenda')}:</strong> {t('tour.steps.mobile_navigation.agenda_desc')}</li>
              <li><strong>{t('menu.more')}:</strong> {t('tour.steps.mobile_navigation.more_desc')}</li>
            </ul>
          </div>
        ),
        placement: 'top',
      },
      {
        target: '.dashboard-mobile-health',
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
        placement: 'bottom',
      },
    ];
  };

  return {
    getMobileCompleteTourSteps,
  };
};
