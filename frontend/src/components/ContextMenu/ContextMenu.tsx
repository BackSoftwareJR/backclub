import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
  shortcut?: string;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, position, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Delay per evitare che il click che ha aperto il menu lo chiuda immediatamente
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }, 100);

    document.addEventListener('keydown', handleEscape);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Aggiusta la posizione se il menu esce dai bordi
      let adjustedX = position.x;
      let adjustedY = position.y;

      if (position.x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }
      if (position.y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }
      if (adjustedX < 10) adjustedX = 10;
      if (adjustedY < 10) adjustedY = 10;

      menu.style.left = `${adjustedX}px`;
      menu.style.top = `${adjustedY}px`;
    }
  }, [position]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    item.action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={`divider-${index}`} className="context-menu-divider" />;
        }

        return (
          <button
            key={item.id}
            className={`context-menu-item ${item.disabled ? 'disabled' : ''} ${item.danger ? 'danger' : ''}`}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
          >
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            <span className="context-menu-label">{item.label}</span>
            {item.shortcut && (
              <span className="context-menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;

