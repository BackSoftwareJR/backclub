import { useState, useEffect } from 'react';

/**
 * Hook per rilevare se il viewport è mobile (< 768px)
 * @returns {boolean} true se il viewport è mobile
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // Check initial viewport size
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isMobile;
};
