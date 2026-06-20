import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import {
  WORKSPACE_TYPES,
  getWorkspaceHomePath,
  getWorkspaceTypeConfig,
} from '../config/workspaceTypes';
import type { WorkspaceTypeCode } from '../../../types/workspace';
import './WorkspaceSwitcher.css';

const WorkspaceSwitcher: React.FC = () => {
  const { workspaceType, setWorkspaceType } = useWorkspace();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentType = getWorkspaceTypeConfig(workspaceType) ?? WORKSPACE_TYPES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTypeSelect = async (code: WorkspaceTypeCode) => {
    if (code === workspaceType || isLoading) {
      setIsOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsOpen(false);

      await setWorkspaceType(code);
      navigate(getWorkspaceHomePath(code));
    } catch (error) {
      console.error('Failed to switch workspace type:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeDepartment = () => {
    setIsOpen(false);
    navigate('/workspace/type-selector');
  };

  return (
    <div className="workspace-switcher" ref={dropdownRef}>
      <button
        className="workspace-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        title="Cambia reparto WorkSpace"
      >
        <div className="workspace-switcher-current">
          <div
            className="workspace-switcher-badge"
            style={{ backgroundColor: currentType.color }}
          >
            {currentType.name}
          </div>
          <ChevronDown
            size={16}
            className={`workspace-switcher-chevron ${isOpen ? 'open' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="workspace-switcher-dropdown">
          <div className="workspace-switcher-header">
            <span>Reparto WorkSpace</span>
          </div>
          <div className="workspace-switcher-options">
            {WORKSPACE_TYPES.map((type) => (
              <button
                key={type.code}
                className={`workspace-switcher-option ${
                  type.code === workspaceType ? 'active' : ''
                }`}
                onClick={() => handleTypeSelect(type.code)}
              >
                <div className="workspace-switcher-option-content">
                  <div
                    className="workspace-switcher-option-badge"
                    style={{ backgroundColor: type.color }}
                  >
                    {type.name}
                  </div>
                  {!type.isAvailable && (
                    <span className="workspace-switcher-coming-soon">
                      Prossimamente
                    </span>
                  )}
                  {type.code === workspaceType && (
                    <div className="workspace-switcher-option-check">✓</div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="workspace-switcher-change-dept"
            onClick={handleChangeDepartment}
          >
            Cambia reparto
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
