import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTheme } from '../../context/ThemeContext';
import {
  WORKSPACE_TYPES,
  getWorkspaceHomePath,
} from './config/workspaceTypes';
import type { WorkspaceTypeCode } from '../../types/workspace';
import './workspace-tokens.css';
import './WorkspaceTypeSelectorPage.css';

const WorkspaceTypeSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const { setWorkspaceType } = useWorkspace();
  const { resolvedTheme } = useTheme();
  const [selectedType, setSelectedType] = useState<WorkspaceTypeCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectType = async (type: WorkspaceTypeCode) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setSelectedType(type);

      await new Promise((resolve) => setTimeout(resolve, 200));

      await setWorkspaceType(type);
      navigate(getWorkspaceHomePath(type));
    } catch (error) {
      console.error('Failed to set workspace type:', error);
      setSelectedType(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="workspace-type-selector workspace-theme-scope" data-theme={resolvedTheme}>
      <div className="workspace-type-selector-container">
        <div className="workspace-type-selector-header">
          <h1 className="workspace-type-selector-title">Scegli il tuo reparto</h1>
          <p className="workspace-type-selector-subtitle">
            Seleziona la macroarea di WorkSpace in cui vuoi lavorare. Potrai cambiarla in qualsiasi momento dal menu laterale.
          </p>
        </div>

        <div className="workspace-type-grid">
          {WORKSPACE_TYPES.map((workspaceType) => {
            const Icon = workspaceType.icon;
            const isSelected = selectedType === workspaceType.code;
            const isCurrentlyLoading = isLoading && isSelected;

            return (
              <button
                key={workspaceType.code}
                className={`workspace-type-card ${isSelected ? 'selected' : ''} ${isCurrentlyLoading ? 'loading' : ''}`}
                onClick={() => handleSelectType(workspaceType.code)}
                disabled={isLoading}
                style={{ '--card-accent-color': workspaceType.color } as React.CSSProperties}
              >
                <div className="workspace-type-card-content">
                  <div className="workspace-type-card-header">
                    <div className="workspace-type-card-icon">
                      <Icon size={32} />
                    </div>
                    <div
                      className={`workspace-type-card-badge ${workspaceType.isAvailable ? '' : 'workspace-type-card-badge-soon'}`}
                    >
                      {workspaceType.badge}
                    </div>
                  </div>

                  <div className="workspace-type-card-info">
                    <h3 className="workspace-type-card-name">{workspaceType.name}</h3>
                    <p className="workspace-type-card-description">{workspaceType.description}</p>
                  </div>

                  {isCurrentlyLoading && (
                    <div className="workspace-type-card-loading">
                      <div className="workspace-type-card-spinner" />
                    </div>
                  )}

                  {isSelected && !isCurrentlyLoading && (
                    <div className="workspace-type-card-selected">
                      <CheckCircle size={24} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceTypeSelectorPage;
