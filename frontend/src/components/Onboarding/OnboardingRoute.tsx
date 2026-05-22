import React from 'react';
import { useAuth } from '../../context/AuthContext';
import OnboardingWizard from './OnboardingWizard';
import type { ReactNode } from 'react';

interface OnboardingRouteProps {
  children: ReactNode;
}

/**
 * Component that checks if user has completed onboarding.
 * If not, shows the OnboardingWizard instead of the children.
 */
const OnboardingRoute: React.FC<OnboardingRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // If user exists and hasn't completed onboarding, show wizard
  // Check for false, null, or undefined (DB might return null/undefined for new users)
  const needsOnboarding = user && (
    user.onboarding_completed === false || 
    user.onboarding_completed === null || 
    user.onboarding_completed === undefined
  );
  
  if (needsOnboarding) {
    console.log('OnboardingRoute: Showing onboarding wizard', {
      user_id: user.id,
      onboarding_completed: user.onboarding_completed,
      type: typeof user.onboarding_completed
    });
    return <OnboardingWizard />;
  }

  // Otherwise, show the protected content
  return <>{children}</>;
};

export default OnboardingRoute;
