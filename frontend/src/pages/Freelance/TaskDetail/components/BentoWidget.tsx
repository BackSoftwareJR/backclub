import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { GripVertical, X } from 'lucide-react';

const WIDGET_ACCENTS: Record<string, string> = {
  header:    '#636366',
  copilot:   '#5e5ce6',
  assistant: '#0a84ff',
  activity:  '#30d158',
  pm:        '#ff9f0a',
  notes:     '#ffd60a',
  files:     '#64d2ff',
  checklist: '#bf5af2',
  timer:     '#ff453a',
  clock:     '#8e8e93',
  agent:     '#ac8e68',
};

interface BentoWidgetProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  isEditMode: boolean;
  onHide: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  children: React.ReactNode;
  accentColor?: string;
}

const BentoWidget: React.FC<BentoWidgetProps> = ({
  id,
  title,
  icon,
  isEditMode,
  onHide,
  dragHandleProps,
  children,
  accentColor,
}) => {
  const accent = accentColor ?? WIDGET_ACCENTS[id] ?? '#636366';
  const controls = useAnimation();

  useEffect(() => {
    if (isEditMode) {
      // Gentle iOS-style sway: ±0.35°, ~1.6 Hz, smooth sine-wave via mirror repeat
      controls.start({
        rotate: [-0.35, 0.35],
        transition: {
          rotate: {
            repeat: Infinity,
            repeatType: 'mirror',
            duration: 0.32,
            ease: 'easeInOut',
          },
        },
      });
    } else {
      controls.start({
        rotate: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 },
      });
    }
  }, [isEditMode, controls]);

  return (
    <motion.div
      layout
      layoutId={id}
      animate={controls}
      className="relative flex flex-col w-full h-full overflow-hidden group"
      style={{
        borderRadius: 13,
        background: 'rgb(20 20 26)',
        border: `1px solid ${isEditMode ? 'rgba(255,255,255,0.12)' : `${accent}28`}`,
        boxShadow: isEditMode
          ? '0 0 0 1px rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.4)'
          : `0 2px 10px rgba(0,0,0,0.3), inset 3px 0 0 ${accent}`,
        willChange: 'transform',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {/* Subtle inner top highlight */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 1,
        borderRadius: '13px 13px 0 0',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Widget header bar */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        style={{
          height: 30,
          paddingInline: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(255,255,255,0.02)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Drag handle — only in edit mode */}
        {isEditMode && dragHandleProps && (
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing"
            style={{ color: 'rgba(255,255,255,0.22)', marginRight: 2, display: 'flex', transition: 'color 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.22)'; }}
            title="Trascina per spostare"
          >
            <GripVertical size={13} />
          </div>
        )}

        {/* Icon */}
        <span style={{ color: `${accent}99`, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {icon}
        </span>

        {/* Title */}
        <span
          className="flex-1 truncate"
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.025em',
            color: 'rgba(255,255,255,0.38)',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>

        {/* Hide button — only in edit mode */}
        {isEditMode && (
          <button
            type="button"
            onClick={onHide}
            className="flex items-center justify-center rounded-full"
            style={{
              width: 15,
              height: 15,
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.35)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,59,48,0.75)';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)';
            }}
            title="Nascondi widget"
          >
            <X size={8} />
          </button>
        )}
      </div>

      {/* Content area — scrolls internally, scrollbar hidden */}
      <div
        className="flex-1 min-h-0"
        style={{
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <div className="h-full" style={{ overflowY: 'auto', scrollbarWidth: 'none' }}>
          {children}
        </div>
      </div>
    </motion.div>
  );
};

export default BentoWidget;
