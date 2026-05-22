import React, { useEffect, useRef } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[]; // Array di altezze in percentuale (es. [50, 90])
  defaultSnap?: number; // Indice del snap point di default
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [50, 90],
  defaultSnap = 0,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const currentSnapIndex = useRef<number>(defaultSnap);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset to default snap point when opening
      currentSnapIndex.current = defaultSnap;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(0)`;
      }
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, defaultSnap, snapPoints]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) return;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;

    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    // Only allow dragging down
    if (deltaY > 0) {
      const maxHeight = (snapPoints[snapPoints.length - 1] / 100) * window.innerHeight;
      const currentHeight = maxHeight - deltaY;
      const clampedHeight = Math.max(0, Math.min(maxHeight, currentHeight));
      
      sheetRef.current.style.transition = 'none';
      sheetRef.current.style.transform = `translateY(${maxHeight - clampedHeight}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || !sheetRef.current) return;

    isDragging.current = false;
    const deltaY = currentY.current - startY.current;
    const threshold = 50; // Minimum drag distance to trigger snap

    if (deltaY > threshold) {
      // Dragging down - move to next lower snap point or close
      if (currentSnapIndex.current > 0) {
        currentSnapIndex.current -= 1;
        sheetRef.current.style.transition = 'transform 0.3s ease-out';
        sheetRef.current.style.transform = `translateY(0)`;
        setTimeout(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transition = '';
          }
        }, 300);
      } else {
        // Close if at bottom snap point
        onClose();
      }
    } else {
      // Snap back to current position
      sheetRef.current.style.transition = 'transform 0.3s ease-out';
      sheetRef.current.style.transform = `translateY(0)`;
      setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.transition = '';
        }
      }, 300);
    }
  };

  if (!isOpen) return null;

  const maxHeight = (snapPoints[snapPoints.length - 1] / 100) * window.innerHeight;

  return (
    <>
      {/* Overlay - iOS Style */}
      <div
        ref={overlayRef}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 99,
          transition: 'opacity 0.3s ease',
          opacity: isOpen ? 1 : 0,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Bottom Sheet - iOS Style */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          backgroundColor: 'var(--ios-secondary-system-grouped-background)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: `${maxHeight}px`,
          height: `${maxHeight}px`,
          transform: 'translateY(0)',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle - iOS Style */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '12px',
            paddingBottom: '8px',
            cursor: 'grab',
          }}
        >
          <div
            className="ios-sheet-handle"
            style={{
              width: '36px',
              height: '5px',
              backgroundColor: 'var(--ios-tertiary-label)',
              borderRadius: '3px',
            }}
          />
        </div>

        {/* Header - iOS Style */}
        {title && (
          <div
            style={{
              padding: '0 16px 16px',
              borderBottom: '0.5px solid var(--ios-separator)',
            }}
          >
            <h2
              className="ios-title-2"
              style={{
                padding: 0,
                margin: 0,
                color: 'var(--ios-label)',
                fontFamily: 'var(--ios-font-family)',
                fontSize: '22px',
                fontWeight: 700,
                lineHeight: '28px',
              }}
            >
              {title}
            </h2>
          </div>
        )}

        {/* Content - scrollabile per mostrare tutto (es. Logout in menu Altro) */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default BottomSheet;
