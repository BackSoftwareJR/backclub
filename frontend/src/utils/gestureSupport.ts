/**
 * Gesture Support Utility
 * Provides swipe gesture detection for mobile devices
 */

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
}

const SWIPE_THRESHOLD = 50; // Minimum distance in pixels
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity
const MAX_SWIPE_TIME = 300; // Maximum time in ms

/**
 * Setup swipe gesture detection on an element
 * @param element - Element to attach swipe detection to
 * @param handlers - Swipe event handlers
 * @returns Cleanup function
 */
export const setupSwipeGesture = (
  element: HTMLElement | null,
  handlers: SwipeHandlers
): (() => void) => {
  if (!element) {
    return () => {};
  }

  let swipeState: SwipeState | null = null;

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    swipeState = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!swipeState) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeState.startX;
    const deltaY = touch.clientY - swipeState.startY;
    const deltaTime = Date.now() - swipeState.startTime;

    // Check if swipe is fast enough
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > SWIPE_THRESHOLD && velocityX > SWIPE_VELOCITY_THRESHOLD && deltaTime < MAX_SWIPE_TIME) {
        if (deltaX > 0 && handlers.onSwipeRight) {
          handlers.onSwipeRight();
        } else if (deltaX < 0 && handlers.onSwipeLeft) {
          handlers.onSwipeLeft();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > SWIPE_THRESHOLD && velocityY > SWIPE_VELOCITY_THRESHOLD && deltaTime < MAX_SWIPE_TIME) {
        if (deltaY > 0 && handlers.onSwipeDown) {
          handlers.onSwipeDown();
        } else if (deltaY < 0 && handlers.onSwipeUp) {
          handlers.onSwipeUp();
        }
      }
    }

    swipeState = null;
  };

  const handleTouchCancel = () => {
    swipeState = null;
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });
  element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchCancel);
  };
};

/**
 * React hook for swipe gestures
 * Note: Import React in your component file to use this hook
 */
// export const useSwipeGesture = (
//   handlers: SwipeHandlers,
//   deps: React.DependencyList = []
// ): React.RefCallback<HTMLElement> => {
//   return React.useCallback(
//     (element: HTMLElement | null) => {
//       if (!element) return;
//       return setupSwipeGesture(element, handlers);
//     },
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     deps
//   );
// };
