export const WORKSPACE_ONBOARDING_KEY = 'workspace_developer_onboarding_v1';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector dell'elemento da evidenziare
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const DEVELOPER_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Benvenuto nel WorkSpace Developer',
    description: 'Il tuo spazio dedicato per lavorare su progetti, branch, agenti AI e task personali.',
    position: 'center',
  },
  {
    id: 'projects',
    title: 'I tuoi progetti',
    description: 'Qui trovi tutti i progetti in cui sei coinvolto come developer o project manager.',
    targetSelector: '.workspace-projects-grid',
    position: 'top',
  },
  {
    id: 'workspace-type',
    title: 'Cambia workspace',
    description: 'Da qui puoi cambiare il tipo di workspace quando diventano disponibili nuove aree.',
    targetSelector: '.workspace-switcher',
    position: 'bottom',
  },
  {
    id: 'agents',
    title: 'Agenti AI',
    description: 'Dentro ogni progetto puoi avviare agenti AI che lavorano automaticamente sul tuo staging.',
    position: 'center',
  },
];