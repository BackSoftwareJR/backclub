import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessWorkspace } from '../../utils/userRoles';

interface WorkspaceDeveloperRouteProps {
  children: React.ReactNode;
}

const WorkspaceDeveloperRoute: React.FC<WorkspaceDeveloperRouteProps> = ({ children }) => {
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
  const needsOnboarding = user.onboarding_completed === false || 
                          user.onboarding_completed === null || 
                          user.onboarding_completed === undefined;
  
  if (needsOnboarding) {
    console.log('WorkspaceDeveloperRoute: User needs onboarding', {
      user_id: user.id,
      onboarding_completed: user.onboarding_completed
    });
    // Let the onboarding system handle this
    return <Navigate to="/dashboard" replace />;
  }

  // Check if user has workspace access (freelance or developer role)
  if (!canAccessWorkspace(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default WorkspaceDeveloperRoute;