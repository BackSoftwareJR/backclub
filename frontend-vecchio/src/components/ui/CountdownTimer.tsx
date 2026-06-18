/**
 * Timer con countdown per scadenza codice 2FA
 */

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  initialSeconds: number;
  onExpire?: () => void;
}

export function CountdownTimer({ initialSeconds, onExpire }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onExpire]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const percentage = (seconds / initialSeconds) * 100;
  
  const getColor = () => {
    if (percentage > 50) return 'text-green-600';
    if (percentage > 20) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBgColor = () => {
    if (percentage > 50) return 'bg-green-100';
    if (percentage > 20) return 'bg-amber-100';
    return 'bg-red-100';
  };

  return (
    <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gray-50 border border-gray-200">
      <svg className={`w-4 h-4 ${getColor()}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className={`text-sm font-semibold tabular-nums ${getColor()}`}>
        {minutes}:{remainingSeconds.toString().padStart(2, '0')}
      </div>
      {percentage < 30 && (
        <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getColor()} ${getBgColor()}`}>
          Scade presto
        </div>
      )}
    </div>
  );
}

