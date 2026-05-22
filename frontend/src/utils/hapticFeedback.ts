/**
 * Haptic Feedback Utility
 * Provides haptic feedback for iOS and Android devices
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback
 */
export const triggerHaptic = (type: HapticType = 'light'): void => {
  if (typeof window === 'undefined' || !('navigator' in window)) {
    return;
  }

  // Check if Vibration API is available
  if ('vibrate' in navigator) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(20);
          break;
        case 'heavy':
          navigator.vibrate(30);
          break;
        case 'success':
          navigator.vibrate([10, 50, 10]);
          break;
        case 'warning':
          navigator.vibrate([20, 50, 20]);
          break;
        case 'error':
          navigator.vibrate([30, 100, 30, 100, 30]);
          break;
        case 'selection':
          navigator.vibrate(5);
          break;
        default:
          navigator.vibrate(10);
      }
    } catch (error) {
      // Silently fail if vibration is blocked or not supported
      console.debug('Haptic feedback not available:', error);
    }
  }

  // iOS Haptic Feedback (if available)
  // @ts-ignore - iOS specific API
  if (window.DeviceMotionEvent && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
    // iOS 13+ requires permission
    // This is handled by the app requesting permission on first use
  }
};

/**
 * Trigger haptic feedback on button press
 */
export const hapticButtonPress = (): void => {
  triggerHaptic('light');
};

/**
 * Trigger haptic feedback on selection change
 */
export const hapticSelection = (): void => {
  triggerHaptic('selection');
};

/**
 * Trigger haptic feedback on success action
 */
export const hapticSuccess = (): void => {
  triggerHaptic('success');
};

/**
 * Trigger haptic feedback on error
 */
export const hapticError = (): void => {
  triggerHaptic('error');
};
