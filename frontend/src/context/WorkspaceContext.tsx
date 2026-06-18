import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { workspaceApi } from '../api/workspace';
import type { WorkspaceTypeCode } from '../types/workspace';

interface WorkspaceContextValue {
  workspaceType: WorkspaceTypeCode | null;
  isFirstVisit: boolean;
  isLoading: boolean;
  setWorkspaceType: (type: WorkspaceTypeCode) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [workspaceType, setWorkspaceTypeState] = useState<WorkspaceTypeCode | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        const preferences = await workspaceApi.getWorkspacePreferences();
        
        if (preferences?.workspace_type_code) {
          setWorkspaceTypeState(preferences.workspace_type_code);
          setIsFirstVisit(false);
        } else {
          setWorkspaceTypeState(null);
          setIsFirstVisit(true);
        }
      } catch (error) {
        console.error('Failed to load workspace preferences:', error);
        setIsFirstVisit(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const setWorkspaceType = async (type: WorkspaceTypeCode) => {
    try {
      await workspaceApi.updateWorkspacePreferences({ workspace_type_code: type });
      setWorkspaceTypeState(type);
      setIsFirstVisit(false);
    } catch (error) {
      console.error('Failed to update workspace preferences:', error);
      throw error;
    }
  };

  const value: WorkspaceContextValue = {
    workspaceType,
    isFirstVisit,
    isLoading,
    setWorkspaceType,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};