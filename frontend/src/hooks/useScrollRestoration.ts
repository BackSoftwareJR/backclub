import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Hook per salvare e ripristinare la posizione di scroll della pagina
 * Salva automaticamente lo scroll quando si naviga via e lo ripristina al ritorno
 */
export const useScrollRestoration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Salva la posizione di scroll prima di navigare via
  useEffect(() => {
    const saveScrollPosition = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      scrollPositions.current.set(location.pathname + location.search, scrollY);
    };

    // Salva quando si naviga via
    return () => {
      saveScrollPosition();
    };
  }, [location.pathname, location.search]);

  // Ripristina la posizione di scroll quando si torna alla pagina
  useEffect(() => {
    const scrollKey = location.pathname + location.search;
    const savedPosition = scrollPositions.current.get(scrollKey);

    if (savedPosition !== undefined) {
      // Usa requestAnimationFrame per assicurarsi che il DOM sia renderizzato
      requestAnimationFrame(() => {
        window.scrollTo({
          top: savedPosition,
          behavior: 'instant' as ScrollBehavior,
        });
      });
    } else {
      // Se non c'è una posizione salvata, vai in cima
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [location.pathname, location.search]);

  // Funzione per navigare indietro mantenendo lo scroll
  const goBack = () => {
    navigate(-1);
  };

  return {
    goBack,
    scrollContainerRef,
  };
};

