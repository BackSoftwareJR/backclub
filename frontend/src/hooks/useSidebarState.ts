import { useState, useEffect } from 'react';

/**
 * Hook personalizzato per gestire lo stato persistente delle sidebar
 * @param storageKey - Chiave univoca per salvare lo stato in localStorage
 * @param defaultValue - Valore di default se non c'è uno stato salvato
 * @returns [collapsed, setCollapsed] - Stato e funzione per cambiarlo
 */
export const useSidebarState = (storageKey: string, defaultValue: boolean = false) => {
  // Leggi lo stato iniziale da localStorage
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error(`Errore nel leggere ${storageKey} da localStorage:`, error);
    }
    return defaultValue;
  });

  // Salva lo stato in localStorage quando cambia
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(collapsed));
    } catch (error) {
      console.error(`Errore nel salvare ${storageKey} in localStorage:`, error);
    }
  }, [collapsed, storageKey]);

  // Funzione per cambiare lo stato
  const setCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    setCollapsedState(value);
  };

  return [collapsed, setCollapsed] as const;
};

