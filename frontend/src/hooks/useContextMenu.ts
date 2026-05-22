import { useCallback } from 'react';
import { useContextMenu as useContextMenuContext } from '../context/ContextMenuContext.tsx';
import type { ContextMenuItem } from '../components/ContextMenu/ContextMenu.tsx';

/**
 * Hook per facilitare l'uso del context menu nei componenti
 * 
 * @example
 * const { onContextMenu } = useContextMenu();
 * 
 * <div onContextMenu={(e) => onContextMenu(e, [
 *   { id: 'copy', label: 'Copia', action: () => copy() },
 *   { id: 'paste', label: 'Incolla', action: () => paste() },
 * ])}>
 */
export const useContextMenu = () => {
  const { showContextMenu, hideContextMenu, isVisible } = useContextMenuContext();

  const onContextMenu = useCallback(
    (e: React.MouseEvent, items: ContextMenuItem[]) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(items, { x: e.clientX, y: e.clientY });
    },
    [showContextMenu]
  );

  return {
    onContextMenu,
    hideContextMenu,
    isVisible,
  };
};

