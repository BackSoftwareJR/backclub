import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Types & Config ──────────────────────────────────────────────────────────

type Mode = 'work' | 'break' | 'long';

interface ModeConfig {
  label: string;
  emoji: string;
  duration: number;
  color: string;
  trackColor: string;
  bg: string;
}

const MODE_CFG: Record<Mode, ModeConfig> = {
  work:  { label: 'Focus',        emoji: '🧠', duration: 25 * 60, color: '#0A84FF', trackColor: 'rgba(10,132,255,0.12)',  bg: 'rgba(10,132,255,0.08)' },
  break: { label: 'Pausa breve',  emoji: '☕', duration:  5 * 60, color: '#34C759', trackColor: 'rgba(52,199,89,0.12)',   bg: 'rgba(52,199,89,0.08)'  },
  long:  { label: 'Pausa lunga',  emoji: '🌿', duration: 15 * 60, color: '#5E5CE6', trackColor: 'rgba(94,92,230,0.12)',  bg: 'rgba(94,92,230,0.08)'  },
};

const MAX_SESSIONS = 8;
const LONG_BREAK_EVERY = 4;

// ─── SVG Ring ────────────────────────────────────────────────────────────────

const ProgressRing: React.FC<{
  progress: number;
  color: string;
  size: number;
  strokeW?: number;
  children?: React.ReactNode;
}> = ({ progress, color, size, strokeW = 7, children }) => {
  const R = (size - strokeW * 2) / 2;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeW}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={R}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s ease' }}
        />
      </svg>
      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {children}
      </div>
    </div>
  );
};

// ─── Session dots ────────────────────────────────────────────────────────────

const SessionDots: React.FC<{ sessions: number }> = ({ sessions }) => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
    {Array.from({ length: MAX_SESSIONS }).map((_, i) => {
      const filled = i < sessions % MAX_SESSIONS || (sessions > 0 && sessions % MAX_SESSIONS === 0);
      const isLongBreakMarker = (i + 1) % LONG_BREAK_EVERY === 0;
      return (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{
            width: filled ? 8 : 6,
            height: filled ? 8 : 6,
            borderRadius: '50%',
            background: filled ? '#FF3B30' : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s',
            boxShadow: filled ? '0 0 6px rgba(255,59,48,0.5)' : 'none',
          }} />
          {isLongBreakMarker && (
            <div style={{ width: 1, height: 3, background: 'rgba(255,255,255,0.15)' }} />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const FocusTimerWidget: React.FC = () => {
  const [mode, setMode] = useState<Mode>('work');
  const [seconds, setSeconds] = useState(MODE_CFG.work.duration);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [pulse, setPulse] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cfg = MODE_CFG[mode];
  const progress = 1 - seconds / cfg.duration;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const complete = useCallback(() => {
    clearTimer();
    setRunning(false);
    setPulse(true);
    setTimeout(() => setPulse(false), 800);
    if (mode === 'work') {
      const next = sessions + 1;
      setSessions(next);
      setMode(next % LONG_BREAK_EVERY === 0 ? 'long' : 'break');
      setSeconds(next % LONG_BREAK_EVERY === 0 ? MODE_CFG.long.duration : MODE_CFG.break.duration);
    } else {
      setMode('work');
      setSeconds(MODE_CFG.work.duration);
    }
  }, [clearTimer, mode, sessions]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) { complete(); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [running, clearTimer, complete]);

  const switchMode = (m: Mode) => {
    clearTimer();
    setRunning(false);
    setMode(m);
    setSeconds(MODE_CFG[m].duration);
  };

  const reset = () => {
    clearTimer();
    setRunning(false);
    setSeconds(cfg.duration);
  };

  const skipNext = () => {
    clearTimer();
    setRunning(false);
    if (mode === 'work') {
      const next = sessions + 1;
      setSessions(next);
      switchMode(next % LONG_BREAK_EVERY === 0 ? 'long' : 'break');
    } else {
      switchMode('work');
    }
  };

  return (
    <div
      className="flex flex-col items-center h-full"
      style={{
        padding: '10px',
        gap: '8px',
        background: running ? `linear-gradient(180deg, ${cfg.bg} 0%, transparent 60%)` : 'transparent',
        transition: 'background 0.5s ease',
      }}
    >
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
        {(Object.keys(MODE_CFG) as Mode[]).map((m) => {
          const c = MODE_CFG[m];
          return (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                fontSize: 9,
                padding: '3px 0',
                borderRadius: 6,
                border: `1px solid ${mode === m ? `${c.color}40` : 'transparent'}`,
                cursor: 'pointer',
                fontWeight: mode === m ? 600 : 400,
                background: mode === m ? c.trackColor : 'rgba(255,255,255,0.03)',
                color: mode === m ? c.color : 'rgba(255,255,255,0.28)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
              }}
            >
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>

      {/* Progress ring */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={pulse ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <ProgressRing progress={progress} color={cfg.color} size={120}>
            {/* Inner seconds ring */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 28,
                fontWeight: 100,
                color: '#fff',
                letterSpacing: -1,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {mm}:{ss}
              </div>
              <div style={{ fontSize: 9, color: cfg.color, fontWeight: 600, marginTop: 2, letterSpacing: '0.05em' }}>
                {cfg.emoji} {cfg.label.toUpperCase()}
              </div>
            </div>
          </ProgressRing>
        </motion.div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={reset}
          title="Ricomincia"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 4, display: 'flex', transition: 'color 0.15s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)'; }}
        >
          <RotateCcw size={15} />
        </button>

        {/* Play/pause */}
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: cfg.color,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: running ? `0 0 20px ${cfg.color}55, 0 4px 12px ${cfg.color}40` : `0 4px 12px ${cfg.color}40`,
            transition: 'box-shadow 0.4s ease',
          }}
        >
          {running
            ? <Pause size={18} />
            : <Play size={18} style={{ marginLeft: 2 }} />}
        </button>

        <button
          type="button"
          onClick={skipNext}
          title="Prossima fase"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 4, display: 'flex', transition: 'color 0.15s' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)'; }}
        >
          <SkipForward size={15} />
        </button>
      </div>

      {/* Session dots + counter */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <SessionDots sessions={sessions} />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
          {sessions === 0 ? 'Prima sessione' : `${sessions} session${sessions === 1 ? 'e' : 'i'} completat${sessions === 1 ? 'a' : 'e'}`}
        </span>
      </div>
    </div>
  );
};

export default FocusTimerWidget;
