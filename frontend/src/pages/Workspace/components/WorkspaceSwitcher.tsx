import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useWorkspace } from '../../../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import './WorkspaceSwitcher.css';

type WorkspaceTypeOption = {
  code: string;
  label: string;
  color: string;
  available: boolean;
};

const WORKSPACE_TYPES: WorkspaceTypeOption[] = [
  {
    code: 'developer',
    label: 'Developer',
    color: '#0066ff',
    available: true,
  },
  // Future workspace types
  {
    code: 'designer',
    label: 'Designer',
    color: '#ff6600',
    available: false,
  },
  {
    code: 'manager',
    label: 'Manager', 
    color: '#00cc66',
    available: false,
  },
];

const WorkspaceSwitcher: React.FC = () => {
  const { workspaceType, setWorkspaceType } = useWorkspace();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentType = WORKSPACE_TYPES.find(t => t.code === workspaceType) || WORKSPACE_TYPES[0];

  // Close dropdown when clicking outside
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

  const handleTypeSelect = async (newType: WorkspaceTypeOption) => {
    if (!newType.available || newType.code === workspaceType || isLoading) {
      setIsOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsOpen(false);

      await setWorkspaceType(newType.code as any);
      
      // Navigate to the new workspace home
      navigate(`/workspace/${newType.code}`);
    } catch (error) {
      console.error('Failed to switch workspace type:', error);
      // TODO: show toast error message
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="workspace-switcher" ref={dropdownRef}>
      <button
        className="workspace-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        title="Cambia tipo di workspace"
      >
        <div className="workspace-switcher-current">
          <div 
            className="workspace-switcher-badge"
            style={{ backgroundColor: currentType.color }}
          >
            {currentType.label}
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
            <span>Scegli workspace</span>
          </div>
          <div className="workspace-switcher-options">
            {WORKSPACE_TYPES.map((type) => (
              <button
                key={type.code}
                className={`workspace-switcher-option ${
                  type.code === workspaceType ? 'active' : ''
                } ${!type.available ? 'disabled' : ''}`}
                onClick={() => handleTypeSelect(type)}
                disabled={!type.available}
              >
                <div className="workspace-switcher-option-content">
                  <div 
                    className="workspace-switcher-option-badge"
                    style={{ backgroundColor: type.color }}
                  >
                    {type.label}
                  </div>
                  {!type.available && (
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
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;