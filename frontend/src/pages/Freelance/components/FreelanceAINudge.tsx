import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAINudges } from '../../../hooks/useAINudges';
import type { AINudge } from '../../../hooks/useAINudges';

// ─── Single nudge chip ────────────────────────────────────────────────────────

const NudgeChip: React.FC<{ nudge: AINudge; onDismiss: () => void }> = ({ nudge, onDismiss }) => {
  useEffect(() => {
    if (!nudge.ttl) return;
    const t = setTimeout(onDismiss, nudge.ttl);
    return () => clearTimeout(t);
  }, [nudge.ttl, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.85, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 14,
        background: 'rgba(10, 10, 20, 0.88)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: `1px solid ${nudge.color}44`,
        boxShadow: `0 8px 24px rgba(0,0,0,0.45), 0 0 0 1px ${nudge.color}22 inset`,
        maxWidth: 310,
        cursor: 'default',
      }}
    >
      {/* Accent dot */}
      <motion.div
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 8, height: 8, borderRadius: '50%',
          background: nudge.color,
          boxShadow: `0 0 8px ${nudge.color}`,
          flexShrink: 0,
        }}
      />

      {/* Icon */}
      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1 }}>{nudge.icon}</span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, fontWeight: 500 }}>
          {nudge.message}
        </div>
        {nudge.cta && nudge.action && (
          <button
            onClick={() => { nudge.action!(); onDismiss(); }}
            style={{
              marginTop: 4,
              fontSize: 11,
              fontWeight: 600,
              color: nudge.color,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              letterSpacing: 0.2,
            }}
          >
            {nudge.cta} →
          </button>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: 'none',
          borderRadius: 6,
          width: 22, height: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <X size={10} color="rgba(255,255,255,0.45)" />
      </button>
    </motion.div>
  );
};

// ─── Stack container (portal, bottom-right, above palette) ───────────────────

function NudgeStack() {
  const { nudges, dismiss } = useAINudges();

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 99985,
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: 8,
      pointerEvents: 'none',
    }}>
      <AnimatePresence mode="popLayout">
        {nudges.map((n) => (
          <div key={n.id} style={{ pointerEvents: 'auto' }}>
            <NudgeChip nudge={n} onDismiss={() => dismiss(n.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Portal export ────────────────────────────────────────────────────────────

export function FreelanceAINudges() {
  return ReactDOM.createPortal(<NudgeStack />, document.body);
}

export default FreelanceAINudges;
