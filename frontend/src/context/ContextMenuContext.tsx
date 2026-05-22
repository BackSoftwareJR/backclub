import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import ContextMenu from '../components/ContextMenu/ContextMenu.tsx';
import type { ContextMenuItem } from '../components/ContextMenu/ContextMenu.tsx';

interface ContextMenuContextType {
  showContextMenu: (items: ContextMenuItem[], position: { x: number; y: number }) => void;
  hideContextMenu: () => void;
  isVisible: boolean;
}

const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined);

export const ContextMenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [menuState, setMenuState] = useState<{
    items: ContextMenuItem[];
    position: { x: number; y: number };
    visible: boolean;
  }>({
    items: [],
    position: { x: 0, y: 0 },
    visible: false,
  });

  const showContextMenu = useCallback((items: ContextMenuItem[], position: { x: number; y: number }) => {
    setMenuState({
      items,
      position,
      visible: true,
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setMenuState((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  return (
    <ContextMenuContext.Provider
      value={{
        showContextMenu,
        hideContextMenu,
        isVisible: menuState.visible,
      }}
    >
      {children}
      {menuState.visible && (
        <ContextMenu
          items={menuState.items}
          position={menuState.position}
          onClose={hideContextMenu}
        />
      )}
    </ContextMenuContext.Provider>
  );
};

export const useContextMenu = (): ContextMenuContextType => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider');
  }
  return context;
};

