/**
 * Fix per problemi di viewport su iOS
 * Su iOS, 100vh include la barra degli indirizzi quando è visibile,
 * causando problemi quando la barra si nasconde/mostra durante lo scroll
 */

export const setupIOSViewportFix = () => {
  if (typeof window === 'undefined') return;

  // Rileva se siamo su iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (!isIOS) return;

  // Funzione per aggiornare l'altezza del viewport
  const setViewportHeight = () => {
    // Usa window.innerHeight invece di 100vh per ottenere l'altezza reale
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Imposta l'altezza iniziale
  setViewportHeight();

  // Aggiorna quando la finestra cambia dimensione (quando la barra degli indirizzi si nasconde/mostra)
  let resizeTimeout: number;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(setViewportHeight, 100);
  };

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => {
    setTimeout(setViewportHeight, 500); // Aspetta che l'orientamento sia cambiato
  });

  // Cleanup (non necessario ma buona pratica)
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
  };
};
