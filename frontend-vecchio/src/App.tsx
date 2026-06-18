import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import LoginV2 from './pages/LoginV2';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';
import { Activity } from 'lucide-react';
import { type ReactElement } from 'react';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Tasks from './pages/Tasks';

import Clients from './pages/Clients';
import TaskRequests from './pages/TaskRequests';
import Users from './pages/Users';
import Settings from './pages/Settings';
import PrivacyTerms from './pages/PrivacyTerms';
import PrivacyConsentPage from './pages/PrivacyConsentPage';
import Secreteria from './pages/Secreteria';
import Master from './pages/Master';

function PrivateRoute({ children }: { children: ReactElement }) {
  const { token, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500">
        <Activity className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  // Check for mandatory consent for admins
  if (user?.role === 'admin' && !user?.has_consented) {
    // Allow access only to the consent page
    if (window.location.hash !== '#/privacy-consent-required') {
      return <Navigate to="/privacy-consent-required" />;
    }
  }

  return children;
}



function AdminRoute({ children }: { children: ReactElement }) {
  const { isLoading, canAccessMaster } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500">
        <Activity className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return canAccessMaster() ? children : <Navigate to="/" />;
}

function SecreteriaRoute({ children }: { children: ReactElement }) {
  const { isLoading, canAccessSecreteria } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-blue-500">
        <Activity className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return canAccessSecreteria() ? children : <Navigate to="/" />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth V2 - Sistema Nuovo */}
          <Route path="/login" element={<LoginV2 />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Auth V1 - Vecchio Sistema (deprecato, solo fallback) */}
          <Route path="/login-old" element={<Login />} />
          
          <Route path="/register" element={<Register />} />
          <Route
            path="/privacy-consent-required"
            element={
              <PrivateRoute>
                <PrivacyConsentPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <PrivateRoute>
                <Projects />
              </PrivateRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <PrivateRoute>
                <ProjectDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <PrivateRoute>
                <Tasks />
              </PrivateRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <AdminRoute>
                <Clients />
              </AdminRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <PrivateRoute>
                <TaskRequests />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AdminRoute>
                <Users />
              </AdminRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
          <Route
            path="/privacy-terms"
            element={
              <PrivateRoute>
                <PrivacyTerms />
              </PrivateRoute>
            }
          />
          <Route
            path="/master"
            element={
              <AdminRoute>
                <Master />
              </AdminRoute>
            }
          />
          <Route
            path="/segreteria"
            element={
              <SecreteriaRoute>
                <Secreteria />
              </SecreteriaRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
