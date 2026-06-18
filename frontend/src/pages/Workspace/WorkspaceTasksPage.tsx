import React from 'react';
import { CheckSquare } from 'lucide-react';
import './WorkspacePlaceholderPage.css';

const WorkspaceTasksPage: React.FC = () => {
  return (
    <div className="workspace-placeholder-page">
      <div className="workspace-placeholder-content">
        <div className="workspace-placeholder-icon">
          <CheckSquare size={64} />
        </div>
        <h1 className="workspace-placeholder-title">Task Personali</h1>
        <p className="workspace-placeholder-description">
          Visualizza e gestisci le tue task personali.
        </p>
        <div className="workspace-placeholder-badge">
          Coming in Phase 2
        </div>
      </div>
    </div>
  );
};

export default WorkspaceTasksPage;