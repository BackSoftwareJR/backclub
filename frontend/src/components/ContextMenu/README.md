# Context Menu System

Sistema di menu contestuali personalizzati (tasto destro) per la webapp, simile ad Adobe Express.

## Caratteristiche

- ✅ Intercetta il menu di sistema (Windows/Mac) e lo sostituisce con menu personalizzati
- ✅ Design Apple-style coerente con il design system
- ✅ Supporto per icone, shortcut, divider e azioni pericolose
- ✅ Posizionamento intelligente (evita di uscire dai bordi dello schermo)
- ✅ Supporto per tema chiaro/scuro
- ✅ Animazioni fluide

## Utilizzo Base

### 1. Usare l'hook `useContextMenu` in un componente

```tsx
import { useContextMenu } from '../../hooks/useContextMenu.tsx';
import { Copy, Trash2, Edit } from 'lucide-react';

const MyComponent = () => {
  const { onContextMenu } = useContextMenu();

  const handleCopy = () => {
    // Logica per copiare
  };

  const handleDelete = () => {
    // Logica per eliminare
  };

  return (
    <div
      onContextMenu={(e) => onContextMenu(e, [
        {
          id: 'copy',
          label: 'Copia',
          icon: <Copy size={16} />,
          action: handleCopy,
          shortcut: '⌘C',
        },
        {
          id: 'edit',
          label: 'Modifica',
          icon: <Edit size={16} />,
          action: () => console.log('Edit'),
        },
        {
          id: 'divider-1',
          divider: true,
          label: '',
          action: () => {},
        },
        {
          id: 'delete',
          label: 'Elimina',
          icon: <Trash2 size={16} />,
          action: handleDelete,
          danger: true,
        },
      ])}
    >
      Contenuto cliccabile con tasto destro
    </div>
  );
};
```

### 2. Usare direttamente il Context

```tsx
import { useContextMenu as useContextMenuContext } from '../../context/ContextMenuContext.tsx';

const MyComponent = () => {
  const { showContextMenu } = useContextMenuContext();

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu([
      { id: 'action1', label: 'Azione 1', action: () => {} },
      { id: 'action2', label: 'Azione 2', action: () => {} },
    ], { x: e.clientX, y: e.clientY });
  };

  return <div onContextMenu={handleRightClick}>...</div>;
};
```

## Opzioni del Menu Item

```typescript
interface ContextMenuItem {
  id: string;                    // ID univoco
  label: string;                 // Testo da mostrare
  icon?: React.ReactNode;        // Icona (es. da lucide-react)
  action: () => void;            // Funzione da eseguire al click
  disabled?: boolean;            // Disabilita l'item
  divider?: boolean;             // Mostra come divider
  danger?: boolean;              // Stile rosso per azioni pericolose
  shortcut?: string;             // Testo shortcut (es. "⌘C")
}
```

## Disabilitare il Menu Personalizzato

Per permettere il menu di sistema su elementi specifici, aggiungi l'attributo `data-no-context-menu`:

```tsx
<input 
  data-no-context-menu 
  type="text" 
  placeholder="Menu di sistema abilitato"
/>
```

## Esempi Pratici

### Menu per una Card

```tsx
<div
  className="card"
  onContextMenu={(e) => onContextMenu(e, [
    { id: 'view', label: 'Visualizza', action: () => navigate(`/item/${id}`) },
    { id: 'edit', label: 'Modifica', action: () => setEditMode(true) },
    { id: 'divider', divider: true, label: '', action: () => {} },
    { id: 'duplicate', label: 'Duplica', action: handleDuplicate },
    { id: 'delete', label: 'Elimina', action: handleDelete, danger: true },
  ])}
>
  Card content
</div>
```

### Menu per una Tabella

```tsx
<tr
  onContextMenu={(e) => onContextMenu(e, [
    { id: 'open', label: 'Apri', action: () => openRow(row.id) },
    { id: 'edit', label: 'Modifica', action: () => editRow(row.id) },
    { id: 'divider', divider: true, label: '', action: () => {} },
    { id: 'copy-id', label: 'Copia ID', action: () => copyToClipboard(row.id) },
  ])}
>
  {/* Row content */}
</tr>
```

## Note

- Il menu viene automaticamente posizionato per non uscire dai bordi dello schermo
- Il menu si chiude automaticamente quando:
  - Si clicca fuori dal menu
  - Si preme ESC
  - Si seleziona un'azione
- Gli elementi editabili (input, textarea) mantengono il menu di sistema per default
- Il menu è già integrato globalmente nel `MainLayout` con un menu di default

