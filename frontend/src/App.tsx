import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { ContextMenuProvider } from './context/ContextMenuContext.tsx';
import { GuideProvider } from './context/GuideContext.tsx';
import OnboardingRoute from './components/Onboarding/OnboardingRoute.tsx';
import ThemeSync from './components/ThemeSync.tsx';
import MainLayout from './components/Layout/MainLayout.tsx';
import BackclubLayout from './components/BackclubLayout.tsx';

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', background: 'var(--color-bg-primary)' }}>
    <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid var(--color-bg-tertiary)', borderTopColor: 'var(--color-accent-blue)', borderRadius: '50%' }} />
  </div>
);

const Login = lazy(() => import('./pages/Login.tsx'));
const PortfolioPage = lazy(() => import('./pages/Portfolio/PortfolioPage.tsx'));
const RichiediAccessoBackclub = lazy(() => import('./pages/RichiediAccessoBackclub.tsx'));
const RoleChange = lazy(() => import('./pages/RoleChange.tsx'));
const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const Cocchi = lazy(() => import('./pages/Cocchi/Cocchi.tsx'));
const ProgettoDetail = lazy(() => import('./pages/Cocchi/ProgettoDetail.tsx'));
const TransazioneDetail = lazy(() => import('./pages/Cocchi/TransazioneDetail.tsx'));
const Calendario = lazy(() => import('./pages/Cocchi/Calendario.tsx'));
const CentroNotifiche = lazy(() => import('./pages/Notifiche/CentroNotifiche.tsx'));
const NotificaDetail = lazy(() => import('./pages/Notifiche/NotificaDetail.tsx'));
const Clienti = lazy(() => import('./pages/Clienti/Clienti.tsx'));
const ClienteDetail = lazy(() => import('./pages/Clienti/ClienteDetail.tsx'));
const SegreteriaLayout = lazy(() => import('./pages/Segreteria/SegreteriaLayout.tsx'));
const DashboardPage = lazy(() => import('./pages/Segreteria/DashboardPage.tsx'));
const ContattiPage = lazy(() => import('./pages/Segreteria/ContattiPage.tsx'));
const PreventiviSegreteriaPage = lazy(() => import('./pages/Segreteria/PreventiviPage.tsx'));
const ContrattiSegreteriaPage = lazy(() => import('./pages/Segreteria/ContrattiPage.tsx'));
const ClienteDetailPage = lazy(() => import('./pages/Segreteria/ClienteDetailPage.tsx'));
const QuoteDetailPageSegreteria = lazy(() => import('./pages/Segreteria/QuoteDetailPage.tsx'));
const ContractDetailPageSegreteria = lazy(() => import('./pages/Segreteria/ContractDetailPage.tsx'));
const FatturePage = lazy(() => import('./pages/Segreteria/FatturePage.tsx'));
const SegreteriaSellerCommissionsPage = lazy(() => import('./pages/Segreteria/SegreteriaSellerCommissionsPage.tsx'));
const PendingPaymentPlansPage = lazy(() => import('./pages/Segreteria/PendingPaymentPlansPage.tsx'));
const CreatePaymentPlanPage = lazy(() => import('./pages/Segreteria/CreatePaymentPlanPage.tsx'));
const EditPaymentPlanPage = lazy(() => import('./pages/Segreteria/EditPaymentPlanPage.tsx'));
const SpesePage = lazy(() => import('./pages/Segreteria/SpesePage.tsx'));
const EmailPage = lazy(() => import('./pages/Segreteria/EmailPage.tsx'));
const AgendaPage = lazy(() => import('./pages/Segreteria/AgendaPage.tsx'));
const AgendaDayDetailPage = lazy(() => import('./pages/Segreteria/AgendaDayDetailPage.tsx'));
const Spese = lazy(() => import('./pages/Spese/Spese.tsx'));
const VenditoriLayout = lazy(() => import('./pages/Venditori/VenditoriLayout.tsx'));
const OverviewPage = lazy(() => import('./pages/Venditori/OverviewPage.tsx'));
const AmministrazioneVenditoriPage = lazy(() => import('./pages/Venditori/AmministrazioneVenditoriPage.tsx'));
const VenditoreFormPage = lazy(() => import('./pages/Venditori/VenditoreFormPage.tsx'));
const ConfigurazioneListiniPage = lazy(() => import('./pages/Venditori/ConfigurazioneListiniPage.tsx'));
const PreventiviPage = lazy(() => import('./pages/Venditori/PreventiviPage.tsx'));
const ContrattiPage = lazy(() => import('./pages/Venditori/ContrattiPage.tsx'));
const LeadsPage = lazy(() => import('./pages/Venditori/LeadsPage.tsx'));
const LeadDetailPage = lazy(() => import('./pages/Venditori/LeadDetailPage.tsx'));
const ClientiVenditoriPage = lazy(() => import('./pages/Venditori/ClientiVenditoriPage.tsx'));
const ClienteVenditoriDetailPage = lazy(() => import('./pages/Venditori/ClienteVenditoriDetailPage.tsx'));
const ProgettiVenditoriPage = lazy(() => import('./pages/Venditori/ProgettiVenditoriPage.tsx'));
const PriceListItemFormPage = lazy(() => import('./pages/Venditori/PriceListItemFormPage.tsx'));
const PriceListItemDetailPage = lazy(() => import('./pages/Venditori/PriceListItemDetailPage.tsx'));
const QuoteWizardPage = lazy(() => import('./pages/Venditori/QuoteWizardPage.tsx'));
const QuoteDetailPage = lazy(() => import('./pages/Venditori/QuoteDetailPage.tsx'));
const QuoteEditPage = lazy(() => import('./pages/Venditori/QuoteEditPage.tsx'));
const ContractDetailPage = lazy(() => import('./pages/Venditori/ContractDetailPage.tsx'));
const SellerLayout = lazy(() => import('./pages/Seller/SellerLayout.tsx'));
const SellerDashboardPage = lazy(() => import('./pages/Seller/SellerDashboardPage.tsx'));
const SellerPriceListPage = lazy(() => import('./pages/Seller/SellerPriceListPage.tsx'));
const SellerPriceListDetailPage = lazy(() => import('./pages/Seller/SellerPriceListDetailPage.tsx'));
const SellerQuotesPage = lazy(() => import('./pages/Seller/SellerQuotesPage.tsx'));
const SellerQuoteDetailPage = lazy(() => import('./pages/Seller/SellerQuoteDetailPage.tsx'));
const SellerQuoteWizardPage = lazy(() => import('./pages/Seller/SellerQuoteWizardPage.tsx'));
const SellerQuoteEditPage = lazy(() => import('./pages/Seller/SellerQuoteEditPage.tsx'));
const SellerQuoteCommissionPage = lazy(() => import('./pages/Seller/SellerQuoteCommissionPage.tsx'));
const SellerContractsPage = lazy(() => import('./pages/Seller/SellerContractsPage.tsx'));
const SellerContractDetailPage = lazy(() => import('./pages/Seller/SellerContractDetailPage.tsx'));
const SellerClientsPage = lazy(() => import('./pages/Seller/SellerClientsPage.tsx'));
const SellerClientDetailPage = lazy(() => import('./pages/Seller/SellerClientDetailPage.tsx'));
const SellerCommissionsPage = lazy(() => import('./pages/Seller/SellerCommissionsPage.tsx'));
const SellerCommissionDetailPage = lazy(() => import('./pages/Seller/SellerCommissionDetailPage.tsx'));
const SellerLeadsPage = lazy(() => import('./pages/Seller/SellerLeadsPage.tsx'));
const SellerLeadDetailPage = lazy(() => import('./pages/Seller/SellerLeadDetailPage.tsx'));
const SellerEmailComposePage = lazy(() => import('./pages/Seller/SellerEmailComposePage.tsx'));
const SellerEmailHistoryPage = lazy(() => import('./pages/Seller/SellerEmailHistoryPage.tsx'));
const SellerEmailDetailPage = lazy(() => import('./pages/Seller/SellerEmailDetailPage.tsx'));
const SellerAgendaPage = lazy(() => import('./pages/Seller/SellerAgendaPage.tsx'));
const SellerSupportPage = lazy(() => import('./pages/Seller/SellerSupportPage.tsx'));
const SellerSupportNewTicketPage = lazy(() => import('./pages/Seller/SellerSupportNewTicketPage.tsx'));
const AmministrazioneProvvigioniPage = lazy(() => import('./pages/Seller/AmministrazioneProvvigioniPage.tsx'));
const SalesKitProdottiPage = lazy(() => import('./pages/Seller/SalesKitProdottiPage.tsx'));
const ContrattualisticaPage = lazy(() => import('./pages/Seller/ContrattualisticaPage.tsx'));
const TecnicoCrmPage = lazy(() => import('./pages/Seller/TecnicoCrmPage.tsx'));
const SellerSettingsMobile = lazy(() => import('./pages/Seller/SellerSettingsMobile.tsx'));
const FreelanceLayout = lazy(() => import('./pages/Freelance/FreelanceLayout.tsx'));
const FreelanceDashboardPage = lazy(() => import('./pages/Freelance/FreelanceDashboardPage.tsx'));
const FreelanceProjectsPage = lazy(() => import('./pages/Freelance/FreelanceProjectsPage.tsx'));
const FreelanceTasksPage = lazy(() => import('./pages/Freelance/FreelanceTasksPage.tsx'));
const FreelanceTaskDetailPage = lazy(() => import('./pages/Freelance/FreelanceTaskDetailPage.tsx'));
const FreelanceRequestsPage = lazy(() => import('./pages/Freelance/FreelanceRequestsPage.tsx'));
const FreelanceChatPage = lazy(() => import('./pages/Freelance/FreelanceChatPage.tsx'));
const FreelanceAgendaPage = lazy(() => import('./pages/Freelance/FreelanceAgendaPage.tsx'));
const FreelanceProjectDetailPage = lazy(() => import('./pages/Freelance/FreelanceProjectDetailPage.tsx'));
const FreelanceSupportPage = lazy(() => import('./pages/Freelance/FreelanceSupportPage.tsx'));
const FreelanceNotificationsPage = lazy(() => import('./pages/Freelance/FreelanceNotificationsPage.tsx'));
const FreelanceSettingsPage = lazy(() => import('./pages/Freelance/FreelanceSettingsPage.tsx'));
const FreelanceCrmHub = lazy(() => import('./pages/Freelance/FreelanceCrmHub.tsx'));
const FocusPage = lazy(() => import('./pages/Freelance/Focus/FocusPage.tsx'));
const WorkspaceTypeSelectorPage = lazy(() => import('./pages/Workspace/WorkspaceTypeSelectorPage.tsx'));
const WorkspaceDeveloperLayout = lazy(() => import('./pages/Workspace/WorkspaceDeveloperLayout.tsx'));
const WorkspaceProjectsPage = lazy(() => import('./pages/Workspace/WorkspaceProjectsPage.tsx'));
const WorkspaceProjectPage = lazy(() => import('./pages/Workspace/WorkspaceProjectPage.tsx'));
const WorkspaceAgentsPage = lazy(() => import('./pages/Workspace/WorkspaceAgentsPage.tsx'));
const WorkspaceAgentDetailPage = lazy(() => import('./pages/Workspace/WorkspaceAgentDetailPage.tsx'));
const WorkspaceTasksPage = lazy(() => import('./pages/Workspace/WorkspaceTasksPage.tsx'));
const WorkspaceAreaRoute = lazy(() => import('./pages/Workspace/WorkspaceAreaRoute.tsx'));
const WorkspaceAreaIndex = lazy(() =>
  import('./pages/Workspace/WorkspaceAreaRoute.tsx').then((m) => ({ default: m.WorkspaceAreaIndex }))
);
const OrganicWebDashboard = lazy(() => import('./pages/Workspace/OrganicWeb/OrganicWebDashboard.tsx'));
const OrganicWebProjectDetail = lazy(() => import('./pages/Workspace/OrganicWeb/OrganicWebProjectDetail.tsx'));
const OrganicWebSkillRunDetail = lazy(() => import('./pages/Workspace/OrganicWeb/OrganicWebSkillRunDetail.tsx'));
const OrganicWebHumanTaskInbox = lazy(() => import('./pages/Workspace/OrganicWeb/OrganicWebHumanTaskInbox.tsx'));
const Progetti = lazy(() => import('./pages/Progetti/Progetti.tsx'));
const ProgettiInAttesaPage = lazy(() => import('./pages/ProgettiInAttesa/ProgettiInAttesaPage.tsx'));
const GestioneProgettiPage = lazy(() => import('./pages/GestioneProgetti/GestioneProgettiPage.tsx'));
const ProjectDetailPage = lazy(() => import('./pages/GestioneProgetti/ProjectDetailPage.tsx'));
const PmDashboard = lazy(() => import('./pages/PmDashboard/PmDashboard.tsx'));
const AssegnaProgettoWizard = lazy(() => import('./pages/AssegnaProgetto/AssegnaProgettoWizard.tsx'));
const GestioneClienti = lazy(() => import('./pages/GestioneClienti/GestioneClienti.tsx'));
const TemplateAdmin = lazy(() => import('./pages/TemplateAdmin/TemplateAdmin.tsx'));
const Impostazioni = lazy(() => import('./pages/Impostazioni/Impostazioni.tsx'));
const Team = lazy(() => import('./pages/Team/Team.tsx'));
const GestioneUtenti = lazy(() => import('./pages/GestioneUtenti/GestioneUtenti.tsx'));
const GestioneSupporto = lazy(() => import('./pages/GestioneSupporto/GestioneSupporto.tsx'));
const TimelineDashboard = lazy(() => import('./pages/Timeline/TimelineDashboard'));
const TimelineDetailPage = lazy(() => import('./pages/Timeline/TimelineDetailPage'));
const AllTimelinesView = lazy(() => import('./pages/Timeline/AllTimelinesView'));
const PublicTimelinePage = lazy(() => import('./pages/Timeline/PublicTimelinePage'));
const UsciteCocchi = lazy(() => import('./pages/UsciteCocchi/UsciteCocchi.tsx'));
const UsciteCocchiDetail = lazy(() => import('./pages/UsciteCocchi/UsciteCocchiDetail.tsx'));
const UsciteCocchiCrmDashboard = lazy(() => import('./pages/UsciteCocchi/UsciteCocchiCrmDashboard.tsx'));
const UsciteCocchiCrmDetail = lazy(() => import('./pages/UsciteCocchi/UsciteCocchiCrmDetail.tsx'));
const UsciteCocchiUsers = lazy(() => import('./pages/UsciteCocchi/UsciteCocchiUsers.tsx'));
const UsciteCocchiUserDetail = lazy(() => import('./pages/UsciteCocchi/UserDetail.tsx'));
const UsciteCocchiAnalytics = lazy(() => import('./pages/UsciteCocchi/UsciteCocchiAnalytics.tsx'));
const UserDetail = lazy(() => import('./pages/Users/UserDetail.tsx'));
const Serbatoi = lazy(() => import('./pages/Serbatoi/Serbatoi.tsx'));
const BudgetDashboard = lazy(() => import('./pages/Budget/BudgetDashboard.tsx'));
const CrmDetail = lazy(() => import('./pages/Budget/CrmDetail.tsx'));
const Wallet = lazy(() => import('./pages/Wallet/Wallet.tsx'));
const ExpenseDashboard = lazy(() => import('./pages/Expenses/ExpenseDashboard.tsx'));
const ReimbursementRequest = lazy(() => import('./pages/Expenses/ReimbursementRequest.tsx'));
const ReimbursementApprovals = lazy(() => import('./pages/Expenses/ReimbursementApprovals.tsx'));
const BackclubHome = lazy(() => import('./pages/Backclub/Home.tsx'));
const BackclubFilosofia = lazy(() => import('./pages/Backclub/Filosofia.tsx'));
const BackclubContatti = lazy(() => import('./pages/Backclub/Contatti.tsx'));
const RestylingStruttureAccoglienza = lazy(() => import('./pages/schede-tecniche/RestylingStruttureAccoglienza.tsx'));
const AllInOneVisibilityBooster = lazy(() => import('./pages/schede-tecniche/AllInOneVisibilityBooster.tsx'));
import './styles/tailwind.css';
import './styles/globals.css';
import './styles/design-system.css';
import './styles/design-system-light.css';
import './styles/animations.css';
import './styles/backclub.css';
import './styles/seller-design-system.css';
import './styles/mobile-safe-area.css';
import './styles/ios-design-system.css';
import { getHomeRouteForUser, isFreelanceUser, isSellerUser, canAccessAdminArea, canAccessStaffArea } from './utils/userRoles.ts';
import { WorkspaceProvider } from './context/WorkspaceContext.tsx';
import WorkspaceDeveloperRoute from './components/Routes/WorkspaceDeveloperRoute.tsx';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg-primary)'
      }}>
        <div className="animate-spin" style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--color-bg-tertiary)',
          borderTopColor: 'var(--color-accent-blue)',
          borderRadius: '50%'
        }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show onboarding FIRST for ALL users who haven't completed it
  // This must be checked before any other routing logic
  // Check for false, null, or undefined (DB might return null/undefined for new users)
  const needsOnboarding = user.onboarding_completed === false || 
                          user.onboarding_completed === null || 
                          user.onboarding_completed === undefined;
  
  if (needsOnboarding) {
    console.log('ProtectedRoute: User needs onboarding', {
      user_id: user.id,
      onboarding_completed: user.onboarding_completed,
      type: typeof user.onboarding_completed
    });
    return <OnboardingRoute>{children}</OnboardingRoute>;
  }

  return <>{children}</>;
};

// Seller Only Route wrapper
const SellerOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--seller-bg-primary)'
      }}>
        <div className="seller-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show onboarding FIRST for ALL users who haven't completed it
  // This must be checked before any role-specific routing
  // Check for false, null, or undefined (DB might return null/undefined for new users)
  const needsOnboarding = user.onboarding_completed === false || 
                          user.onboarding_completed === null || 
                          user.onboarding_completed === undefined;
  
  if (needsOnboarding) {
    console.log('SellerOnlyRoute: User needs onboarding', {
      user_id: user.id,
      onboarding_completed: user.onboarding_completed
    });
    return <OnboardingRoute>{children}</OnboardingRoute>;
  }

  if (!isSellerUser(user)) {
    return <Navigate to={getHomeRouteForUser(user)} replace />;
  }

  return <>{children}</>;
};

// Freelance Only Route wrapper
const FreelanceOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg-primary)'
      }}>
        <div className="animate-spin" style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--color-bg-tertiary)',
          borderTopColor: 'var(--color-accent-blue)',
          borderRadius: '50%'
        }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show onboarding FIRST for ALL users who haven't completed it
  // This must be checked before any role-specific routing
  // Check for false, null, or undefined (DB might return null/undefined for new users)
  const needsOnboarding = user.onboarding_completed === false || 
                          user.onboarding_completed === null || 
                          user.onboarding_completed === undefined;
  
  if (needsOnboarding) {
    console.log('FreelanceOnlyRoute: User needs onboarding', {
      user_id: user.id,
      onboarding_completed: user.onboarding_completed
    });
    return <OnboardingRoute>{children}</OnboardingRoute>;
  }

  if (!isFreelanceUser(user)) {
    return <Navigate to={getHomeRouteForUser(user)} replace />;
  }

  return <>{children}</>;
};

// Admin Only Route — only users with admin role can access these pages
const AdminOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg-primary)'
      }}>
        <div className="animate-spin" style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--color-bg-tertiary)',
          borderTopColor: 'var(--color-accent-blue)',
          borderRadius: '50%'
        }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdminArea(user)) {
    // Non-admin staff see dashboard; non-staff users go to their home
    if (!canAccessStaffArea(user)) {
      return <Navigate to={getHomeRouteForUser(user)} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Workspace Gateway: ingresso sempre sulla pagina di selezione reparto
const WorkspaceGateway: React.FC = () => {
  return <Navigate to="/workspace/type-selector" replace />;
};

// Catch-all: authenticated users go to their role-specific home, guests to public home
const CatchAllRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg-primary)'
      }}>
        <div className="animate-spin" style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--color-bg-tertiary)',
          borderTopColor: 'var(--color-accent-blue)',
          borderRadius: '50%'
        }} />
      </div>
    );
  }

  return <Navigate to={user ? getHomeRouteForUser(user) : '/'} replace />;
};

// Public Route wrapper (redirect to dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg-primary)'
      }}>
        <div className="animate-spin" style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--color-bg-tertiary)',
          borderTopColor: 'var(--color-accent-blue)',
          borderRadius: '50%'
        }} />
      </div>
    );
  }

  if (user) {
    // IMPORTANT: Don't redirect if role selection is in progress
    const roleSelectionInProgress = typeof window !== 'undefined' && sessionStorage.getItem('role_selection_in_progress') === 'true';
    if (roleSelectionInProgress) {
      // Allow access to role-selection page
      return <>{children}</>;
    }
    
    return <Navigate to={getHomeRouteForUser(user)} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemeSync />
        <GuideProvider>
          <ContextMenuProvider>
            <Router>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <BackclubLayout>
                    <Login />
                  </BackclubLayout>
                </PublicRoute>
              }
            />
            <Route path="/portfolio-azienda" element={<PortfolioPage />} />
            <Route
              path="/richiedi-accesso"
              element={
                <BackclubLayout>
                  <RichiediAccessoBackclub />
                </BackclubLayout>
              }
            />
            <Route
              path="/role-change"
              element={
                <ProtectedRoute>
                  <RoleChange />
                </ProtectedRoute>
              }
            />
            <Route
              path="/role-selection"
              element={
                <ProtectedRoute>
                  <RoleSelectionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cocchi"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Cocchi />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cocchi/progetto/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ProgettoDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cocchi/transazione/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <TransazioneDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cocchi/calendario"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Calendario />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifiche"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CentroNotifiche />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clienti"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Clienti />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clienti/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ClienteDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifiche/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <NotificaDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/clienti/:id/gestisci"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ClienteDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* Segreteria Gestionale */}
            <Route
              path="/segreteria"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <SegreteriaLayout />
                  </MainLayout>
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="contatti" element={<ContattiPage />} />
              <Route path="contatti/:id" element={<ClienteDetailPage />} />
              <Route path="preventivi" element={<PreventiviSegreteriaPage />} />
              <Route path="preventivi/:id" element={<QuoteDetailPageSegreteria />} />
              <Route path="preventivi/:id/edit" element={<QuoteEditPage />} />
              <Route path="preventivi/nuovo" element={<QuoteEditPage />} />
              <Route path="contratti" element={<ContrattiSegreteriaPage />} />
              <Route path="contratti/:id" element={<ContractDetailPageSegreteria />} />
              <Route path="fatture" element={<FatturePage />} />
              <Route path="commissioni-venditori" element={<SegreteriaSellerCommissionsPage />} />
              <Route path="piani-pagamento-in-attesa" element={<PendingPaymentPlansPage />} />
              <Route path="piani-pagamento/crea/:contractId" element={<CreatePaymentPlanPage />} />
              <Route path="piani-pagamento/:id/modifica" element={<EditPaymentPlanPage />} />
              <Route path="spese" element={<SpesePage />} />
              <Route path="email" element={<EmailPage />} />
              <Route path="agenda" element={<AgendaPage />} />
              <Route path="agenda/:date" element={<AgendaDayDetailPage />} />
            </Route>
            <Route
              path="/spese"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Spese />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* Sistema Gestionale Venditori */}
            <Route
              path="/venditori"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <VenditoriLayout />
                  </MainLayout>
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="amministrazione-venditori" element={<AmministrazioneVenditoriPage />} />
              <Route path="amministrazione-venditori/nuovo" element={<VenditoreFormPage />} />
              <Route path="amministrazione-venditori/:id" element={<VenditoreFormPage />} />
              <Route path="configurazione-listini" element={<ConfigurazioneListiniPage />} />
              <Route path="configurazione-listini/nuovo" element={<PriceListItemFormPage />} />
              <Route path="configurazione-listini/:id" element={<PriceListItemDetailPage />} />
              <Route path="configurazione-listini/:id/edit" element={<PriceListItemFormPage />} />
              <Route path="preventivi" element={<PreventiviPage />} />
              <Route path="preventivi/nuovo" element={<QuoteWizardPage />} />
              <Route path="preventivi/:id" element={<QuoteDetailPage />} />
              <Route path="preventivi/:id/edit" element={<QuoteEditPage />} />
              <Route path="contratti" element={<ContrattiPage />} />
              <Route path="contratti/:id" element={<ContractDetailPage />} />
              <Route path="clienti" element={<ClientiVenditoriPage />} />
              <Route path="clienti/:id" element={<ClienteVenditoriDetailPage />} />
              <Route path="progetti" element={<ProgettiVenditoriPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="leads/:id" element={<LeadDetailPage />} />
            </Route>
            {/* Dashboard Venditori - Seller Only */}
            <Route
              path="/seller"
              element={
                <SellerOnlyRoute>
                  <SellerLayout />
                </SellerOnlyRoute>
              }
            >
              <Route index element={<SellerDashboardPage />} />
              <Route path="dashboard" element={<SellerDashboardPage />} />
              <Route path="listini" element={<SellerPriceListPage />} />
              <Route path="listini/:id" element={<SellerPriceListDetailPage />} />
              <Route path="preventivi" element={<SellerQuotesPage />} />
              <Route path="preventivi/nuovo" element={<SellerQuoteWizardPage />} />
              <Route path="preventivi/:id" element={<SellerQuoteDetailPage />} />
              <Route path="preventivi/:id/commissione" element={<SellerQuoteCommissionPage />} />
              <Route path="preventivi/:id/edit" element={<SellerQuoteEditPage />} />
              <Route path="contratti" element={<SellerContractsPage />} />
              <Route path="contratti/:id" element={<SellerContractDetailPage />} />
              <Route path="clienti" element={<SellerClientsPage />} />
              <Route path="clienti/:id" element={<SellerClientDetailPage />} />
              <Route path="commissioni" element={<SellerCommissionsPage />} />
              <Route path="commissioni/:contractId" element={<SellerCommissionDetailPage />} />
              <Route path="contatti" element={<SellerLeadsPage />} />
              <Route path="contatti/:id" element={<SellerLeadDetailPage />} />
              <Route path="contatti/:id/email" element={<SellerEmailComposePage />} />
              <Route path="contatti/:id/email/storico" element={<SellerEmailHistoryPage />} />
              <Route path="contatti/:id/email/:activityId" element={<SellerEmailDetailPage />} />
              <Route path="agenda" element={<SellerAgendaPage />} />
              <Route path="supporto" element={<SellerSupportPage />} />
              <Route path="supporto/amministrazione-provvigioni" element={<AmministrazioneProvvigioniPage />} />
              <Route path="supporto/sales-kit-prodotti" element={<SalesKitProdottiPage />} />
              <Route path="supporto/contrattualistica" element={<ContrattualisticaPage />} />
              <Route path="supporto/tecnico-crm" element={<TecnicoCrmPage />} />
              <Route path="supporto/nuovo-ticket" element={<SellerSupportNewTicketPage />} />
              <Route path="impostazioni" element={<SellerSettingsMobile />} />
              <Route path="more" element={<div />} />
            </Route>
            {/* Workspace Portal */}
            <Route
              path="/workspace"
              element={
                <WorkspaceDeveloperRoute>
                  <WorkspaceProvider>
                    <WorkspaceGateway />
                  </WorkspaceProvider>
                </WorkspaceDeveloperRoute>
              }
            />
            <Route
              path="/workspace/type-selector"
              element={
                <WorkspaceDeveloperRoute>
                  <WorkspaceProvider>
                    <WorkspaceTypeSelectorPage />
                  </WorkspaceProvider>
                </WorkspaceDeveloperRoute>
              }
            />
            <Route
              path="/workspace/developer/*"
              element={
                <WorkspaceDeveloperRoute>
                  <WorkspaceProvider>
                    <WorkspaceDeveloperLayout />
                  </WorkspaceProvider>
                </WorkspaceDeveloperRoute>
              }
            >
              <Route index element={<Navigate to="progetti" replace />} />
              <Route path="progetti" element={<WorkspaceProjectsPage />} />
              <Route path="progetti/:projectId/lavorazioni/:agentId" element={<WorkspaceAgentDetailPage />} />
              <Route path="progetti/:id" element={<WorkspaceProjectPage />} />
              <Route path="agenti" element={<WorkspaceAgentsPage />} />
              <Route path="task" element={<WorkspaceTasksPage />} />
            </Route>
            {/* Organic Web Workspace — dedicated routes */}
            <Route
              path="/workspace/organic_web"
              element={
                <WorkspaceDeveloperRoute>
                  <WorkspaceProvider>
                    <WorkspaceAreaRoute />
                  </WorkspaceProvider>
                </WorkspaceDeveloperRoute>
              }
            >
              <Route index element={<OrganicWebDashboard />} />
              <Route path="project/:id" element={<OrganicWebProjectDetail />} />
              <Route path="skill-runs/:runId" element={<OrganicWebSkillRunDetail />} />
              <Route path="inbox" element={<OrganicWebHumanTaskInbox />} />
            </Route>
            <Route
              path="/workspace/:areaCode/*"
              element={
                <WorkspaceDeveloperRoute>
                  <WorkspaceProvider>
                    <WorkspaceAreaRoute />
                  </WorkspaceProvider>
                </WorkspaceDeveloperRoute>
              }
            >
              <Route index element={<WorkspaceAreaIndex />} />
            </Route>
            {/* Freelance Portal */}
            <Route
              path="/freelance"
              element={
                <FreelanceOnlyRoute>
                  <FreelanceLayout />
                </FreelanceOnlyRoute>
              }
            >
              <Route index element={<FreelanceDashboardPage />} />
              <Route path="dashboard" element={<FreelanceDashboardPage />} />
              <Route path="progetti" element={<FreelanceProjectsPage />} />
              <Route path="task" element={<FreelanceTasksPage />} />
              <Route path="task/:id" element={<FreelanceTaskDetailPage />} />
              <Route path="richieste" element={<FreelanceRequestsPage />} />
              <Route path="chat" element={<FreelanceChatPage />} />
              <Route path="calendario" element={<FreelanceAgendaPage />} />
              <Route path="progetti/:id" element={<FreelanceProjectDetailPage />} />
              <Route path="progetti/:id/gestione" element={<ProjectDetailPage />} />
              <Route path="supporto" element={<FreelanceSupportPage />} />
              <Route path="notifiche" element={<FreelanceNotificationsPage />} />
              <Route path="impostazioni" element={<FreelanceSettingsPage />} />
              <Route path="focus" element={<FocusPage />} />
              {/* CRM dedicati: vista dedicata per ogni CRM assegnato all'utente */}
              <Route path="crm/:code" element={<FreelanceCrmHub />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<FreelanceDashboardPage />} />
                <Route path="progetti" element={<FreelanceProjectsPage />} />
                <Route path="progetti/:id" element={<FreelanceProjectDetailPage />} />
                <Route path="progetti/:id/gestione" element={<ProjectDetailPage />} />
                <Route path="task" element={<FreelanceTasksPage />} />
                <Route path="task/:id" element={<FreelanceTaskDetailPage />} />
                <Route path="richieste" element={<FreelanceRequestsPage />} />
                <Route path="chat" element={<FreelanceChatPage />} />
                <Route path="calendario" element={<FreelanceAgendaPage />} />
                <Route path="supporto" element={<FreelanceSupportPage />} />
              </Route>
              <Route path="more" element={<div />} />
            </Route>
            <Route
              path="/progetti"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Progetti />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/progetti-in-attesa"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ProgettiInAttesaPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pm"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PmDashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assegna-progetto/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <AssegnaProgettoWizard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestione-progetti"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <GestioneProgettiPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestione-progetti/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ProjectDetailPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/gestione-clienti"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <GestioneClienti />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/template-admin"
              element={
                <AdminOnlyRoute>
                  <MainLayout>
                    <TemplateAdmin />
                  </MainLayout>
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/gestione-utenti"
              element={
                <AdminOnlyRoute>
                  <MainLayout>
                    <GestioneUtenti />
                  </MainLayout>
                </AdminOnlyRoute>
              }
            />
            <Route
              path="/gestione-supporto"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <GestioneSupporto />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/timeline"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <TimelineDashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/timeline/all"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <AllTimelinesView />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/timeline/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <TimelineDetailPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* Public share link: no auth, no sidebar/header */}
            <Route path="/timeline/public/:token" element={<PublicTimelinePage />} />
            <Route
              path="/impostazioni"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Impostazioni />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Team />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/uscite-cocchi"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <UsciteCocchi />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/uscite-cocchi-detail"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <UsciteCocchiDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/uscite-cocchi/crm"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <UsciteCocchiCrmDashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/uscite-cocchi/crm/:code"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <UsciteCocchiCrmDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/uscite-cocchi/users"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <UsciteCocchiUsers />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/uscite-cocchi/users/:userId"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <UsciteCocchiUserDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/uscite-cocchi/analytics"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <UsciteCocchiAnalytics />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <UserDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/serbatoi"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Serbatoi />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/serbatoi/budget"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <BudgetDashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/serbatoi/budget/crm/:code"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CrmDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet/:type/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Wallet />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ExpenseDashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/reimbursements/request"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ReimbursementRequest />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/reimbursements/pending"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ReimbursementApprovals />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* Backclub Public Pages */}
            <Route
              path="/"
              element={
                <BackclubLayout>
                  <BackclubHome />
                </BackclubLayout>
              }
            />
            <Route
              path="/filosofia"
              element={
                <BackclubLayout>
                  <BackclubFilosofia />
                </BackclubLayout>
              }
            />
            <Route
              path="/contatti"
              element={
                <BackclubLayout>
                  <BackclubContatti />
                </BackclubLayout>
              }
            />
            {/* Schede Tecniche - Landing Pages */}
            <Route
              path="/schede-tecniche/restyling-strutture-accoglienza"
              element={<RestylingStruttureAccoglienza />}
            />
            <Route
              path="/schede-tecniche/all-in-one-visibility-booster"
              element={<AllInOneVisibilityBooster />}
            />
            {/* Catch-all: authenticated users go to their role home, guests go to public home */}
            <Route path="*" element={<CatchAllRoute />} />
          </Routes>
          </Suspense>
          </Router>
        </ContextMenuProvider>
        </GuideProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
