import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { WORKSPACE_TYPE_CODES, isDeveloperWorkspace } from './config/workspaceTypes';
import WorkspaceAreaLayout from './WorkspaceAreaLayout';
import WorkspacePlaceholderPage from './WorkspacePlaceholderPage';
import type { WorkspaceTypeCode } from '../../types/workspace';

const WorkspaceAreaRoute: React.FC = () => {
  const { areaCode } = useParams<{ areaCode: string }>();

  if (!areaCode || isDeveloperWorkspace(areaCode)) {
    return <Navigate to="/workspace/type-selector" replace />;
  }

  if (!WORKSPACE_TYPE_CODES.includes(areaCode as WorkspaceTypeCode)) {
    return <Navigate to="/workspace/type-selector" replace />;
  }

  return <WorkspaceAreaLayout />;
};

export const WorkspaceAreaIndex: React.FC = () => {
  const { areaCode } = useParams<{ areaCode: string }>();
  const code = areaCode as WorkspaceTypeCode;

  if (!WORKSPACE_TYPE_CODES.includes(code)) {
    return <Navigate to="/workspace/type-selector" replace />;
  }

  return <WorkspacePlaceholderPage areaCode={code} />;
};

export default WorkspaceAreaRoute;
