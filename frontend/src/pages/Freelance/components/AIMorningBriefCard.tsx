import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { apiClient } from '../../../api/client';
import { useFreelanceAIStore } from '../../../stores/useFreelanceAIStore';

interface BriefData {
  headline:      string;
  body:          string;
  priority_task: string | null;
  mood:          'productive' | 'focused' | 'gentle' | 'urgent' | 'neutral';
  overdue_count: number;
  today_count:   number;
  cached?:       boolean;
}

const MOOD_CONFIG: Record<string, { gradient: string; accent: string; icon: string }> = {
  productive: { gradient: 'linear-gradient(135deg, rgba(94,92,230,0.18), rgba(10,132,255,0.12))', accent: '#5e5ce6', icon: '⚡' },
  focused:    { gradient: 'linear-gradient(135deg, rgba(48,209,88,0.14),  rgba(10,132,255,0.1))', accent: '#30d158', icon: '🎯' },
  gentle:     { gradient: 'linear-gradient(135deg, rgba(255,214,10,0.12), rgba(255,159,10,0.1))', accent: '#ffd60a', icon: '☀️' },
  urgent:     { gradient: 'linear-gradient(135deg, rgba(255,69,58,0.18),  rgba(255,159,10,0.12))', accent: '#ff453a', icon: '🔥' },
  neutral:    { gradient: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))', accent: '#8e8e93', icon: '👋' },
};

const SESSION_KEY = 'ai-morning-brief-dismissed';

export const AIMorningBriefCard: React.FC = () => {
  const [brief, setBrief]       = useState<BriefData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [dismissed, setDismiss] = useState(() => {
    // Dismiss resets each calendar day
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return false;
    const { date } = JSON.parse(stored);
    return date === new Date().toDateString();
  });
  const aiStore = useFreelanceAIStore();

  useEffect(() => {
    if (dismissed) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<BriefData>('/freelance/ai-morning-brief');
        setBrief(res.data);
      } catch { /* silent — card just won't show */ } finally {
        setLoading(false);
      }
    })();
  }, [dismissed]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ date: new Date().toDateString() }));
    setDismiss(true);
  };

  if (dismissed || (!loading && !brief)) return null;

  const cfg = brief ? (MOOD_CONFIG[brief.mood] ?? MOOD_CONFIG.neutral) : MOOD_CONFIG.neutral;

  return (
    <AnimatePresence>
      {(loading || brief) && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          style={{
            background: cfg.gradient,
            border: `1px solid ${cfg.accent}28`,
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background shimmer */}
          <div style={{
            position: 'absolute', inset: 0, opacity: 0.04,
            background: `radial-gradient(ellipse at 20% 50%, ${cfg.accent}, transparent 60%)`,
            pointerEvents: 'none',
          }} />

          {/* Dismiss */}
          <button
            onClick={dismiss}
            style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6,
              width: 22, height: 22, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={10} color="rgba(255,255,255,0.4)" />
          </button>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.div
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(94,92,230,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                <Sparkles size={13} color="#a78bfa" />
              </motion.div>
              <div>
                <div style={{ width: 140, height: 11, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 6 }} />
                <div style={{ width: 200, height: 9, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
              </div>
            </div>
          ) : brief && (
            <div>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: `${cfg.accent}22`,
                  border: `1px solid ${cfg.accent}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15,
                }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                    {brief.headline}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.58)', lineHeight: 1.5 }}>
                    {brief.body}
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {brief.today_count > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 9px', borderRadius: 7,
                    background: 'rgba(10,132,255,0.15)',
                    border: '1px solid rgba(10,132,255,0.25)',
                    fontSize: 10.5, color: '#0a84ff', fontWeight: 600,
                  }}>
                    <CheckCircle2 size={9} />
                    {brief.today_count} oggi
                  </div>
                )}
                {brief.overdue_count > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 9px', borderRadius: 7,
                    background: 'rgba(255,69,58,0.14)',
                    border: '1px solid rgba(255,69,58,0.25)',
                    fontSize: 10.5, color: '#ff453a', fontWeight: 600,
                  }}>
                    <AlertTriangle size={9} />
                    {brief.overdue_count} scadut{brief.overdue_count === 1 ? 'a' : 'e'}
                  </div>
                )}
                {brief.priority_task && (
                  <button
                    onClick={() => {
                      aiStore.open(`Focus sulla task prioritaria: ${brief.priority_task}`);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '3px 9px', borderRadius: 7,
                      background: `${cfg.accent}18`,
                      border: `1px solid ${cfg.accent}30`,
                      fontSize: 10.5, color: cfg.accent, fontWeight: 600,
                      cursor: 'pointer',
                      maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    <Sparkles size={9} />
                    {brief.priority_task}
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIMorningBriefCard;
