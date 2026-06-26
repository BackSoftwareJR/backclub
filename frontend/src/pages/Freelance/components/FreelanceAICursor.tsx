import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, animate } from 'framer-motion';
import ReactDOM from 'react-dom';

interface Props {
  x: number;
  y: number;
  visible: boolean;
  clicking: boolean;
}

// Animated AI virtual cursor (portal-rendered to avoid stacking context issues)
export function FreelanceAICursor({ x, y, visible, clicking }: Props) {
  const mx = useMotionValue(x);
  const my = useMotionValue(y);

  const sx = useSpring(mx, { stiffness: 280, damping: 28 });
  const sy = useSpring(my, { stiffness: 280, damping: 28 });

  useEffect(() => {
    animate(mx, x, { type: 'spring', stiffness: 280, damping: 28 });
  }, [x, mx]);

  useEffect(() => {
    animate(my, y, { type: 'spring', stiffness: 280, damping: 28 });
  }, [y, my]);

  if (!visible) return null;

  return ReactDOM.createPortal(
    <motion.div
      style={{
        position: 'fixed',
        left: sx,
        top: sy,
        x: '-50%',
        y: '-50%',
        pointerEvents: 'none',
        zIndex: 99999,
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: visible ? 1 : 0, scale: clicking ? 0.7 : 1 }}
      transition={{ duration: 0.18 }}
    >
      {/* Outer ring */}
      <motion.div
        style={{
          position: 'absolute',
          inset: -10,
          borderRadius: '50%',
          border: '1.5px solid rgba(94,92,230,0.6)',
        }}
        animate={{ scale: clicking ? 1.6 : 1, opacity: clicking ? 0 : 0.7 }}
        transition={{ duration: 0.3 }}
      />
      {/* Core dot */}
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #a78bfa, #5e5ce6)',
          boxShadow: '0 0 12px rgba(94,92,230,0.8), 0 0 4px rgba(167,139,250,0.6)',
        }}
      />
      {/* AI label */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 8,
          whiteSpace: 'nowrap',
          fontSize: 10,
          fontWeight: 600,
          color: '#a78bfa',
          background: 'rgba(10,10,18,0.75)',
          backdropFilter: 'blur(8px)',
          padding: '1px 5px',
          borderRadius: 4,
          letterSpacing: 0.5,
          border: '1px solid rgba(94,92,230,0.3)',
        }}
      >
        AI
      </div>
    </motion.div>,
    document.body,
  );
}

// ─── Cursor state hook (used by palette to coordinate cursor moves) ───────────

export function useAICursorState() {
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const visibleRef = useRef(false);
  const clickingRef = useRef(false);

  return {
    getPos: () => pos.current,
    setPos: (x: number, y: number) => { pos.current = { x, y }; },
    isVisible: () => visibleRef.current,
    setVisible: (v: boolean) => { visibleRef.current = v; },
    isClicking: () => clickingRef.current,
    setClicking: (v: boolean) => { clickingRef.current = v; },
  };
}
