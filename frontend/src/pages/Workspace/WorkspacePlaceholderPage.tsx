import React from 'react';
import { Construction } from 'lucide-react';
import { getWorkspaceTypeConfig } from './config/workspaceTypes';
import type { WorkspaceTypeCode } from '../../types/workspace';
import './WorkspacePlaceholderPage.css';

interface WorkspacePlaceholderPageProps {
  areaCode: WorkspaceTypeCode;
}

const WorkspacePlaceholderPage: React.FC<WorkspacePlaceholderPageProps> = ({ areaCode }) => {
  const config = getWorkspaceTypeConfig(areaCode);

  return (
    <div className="workspace-placeholder-page">
      <div className="workspace-placeholder-content">
        <div className="workspace-placeholder-icon">
          {config ? <config.icon size={40} /> : <Construction size={40} />}
        </div>
        <h1 className="workspace-placeholder-title">{config?.name ?? 'WorkSpace'}</h1>
        <p className="workspace-placeholder-description">
          {config?.description ?? 'Area workspace in configurazione.'}
        </p>
        <span className="workspace-placeholder-badge">In sviluppo</span>
      </div>
    </div>
  );
};

export default WorkspacePlaceholderPage;
