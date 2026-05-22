import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, Plus, Trash2, Edit2, X, Check,
  Calendar, Layers, ChevronRight, Loader2, AlertCircle, Eye, Copy,
} from 'lucide-react';
import ContextMenu, { type ContextMenuItem } from '../../components/ContextMenu/ContextMenu';
import { timelineApi, type Timeline, type CreateTimelinePayload } from '../../api/timeline';

const COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#ef4444',
];

function progressColor(pct: number) {
  if (pct >= 80) return '#10b981';
  if (pct >= 40) return '#f59e0b';
  return '#6366f1';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Create / Edit Modal ────────────────────────────────────
interface TimelineModalProps {
  initial?: Timeline;
  onClose: () => void;
  onSave: (payload: CreateTimelinePayload) => Promise<void>;
}

const TimelineModal: React.FC<TimelineModalProps> = ({ initial, onClose, onSave }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [color, setColor] = useState(initial?.color ?? COLOR_PRESETS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Il nome è obbligatorio'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() || undefined, color });
      onClose();
    } catch {
      setError('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full max-w-md glass-card overflow-hidden"
        style={{ borderRadius: 20 }}
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      >
        {/* Color stripe top */}
        <div className="h-1 w-full" style={{ background: color }} />

        <div className="flex items-center justify-between px-6 py-5">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {initial ? 'Modifica Timeline' : 'Nuova Timeline'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'var(--glass-bg-medium)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 10,
              padding: '6px 8px',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)',
                borderRadius: 12, padding: '10px 14px',
                color: 'var(--color-error)', fontSize: 13,
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                Nome *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Es. Lancio Prodotto 2026"
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  background: 'var(--glass-bg-light)',
                  border: '1px solid var(--color-border-primary)',
                  color: 'var(--color-text-primary)', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                Descrizione
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descrizione opzionale…"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12, resize: 'none',
                  background: 'var(--glass-bg-light)',
                  border: '1px solid var(--color-border-primary)',
                  color: 'var(--color-text-primary)', fontSize: 14,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Color */}
            <div>
              <label style={{ display: 'block', marginBottom: 10, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                Colore
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: c, border: 'none', cursor: 'pointer',
                      position: 'relative',
                      outline: color === c ? `3px solid ${c}` : 'none',
                      outlineOffset: 3,
                      transform: color === c ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {color === c && (
                      <Check size={14} strokeWidth={3} style={{ color: '#fff', position: 'absolute', inset: 0, margin: 'auto' }} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 600, fontSize: 14,
                  background: 'var(--glass-bg-light)', border: '1px solid var(--color-border-primary)',
                  color: 'var(--color-text-secondary)', cursor: 'pointer',
                }}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, fontWeight: 600, fontSize: 14,
                  background: color, border: 'none', color: '#fff', cursor: 'pointer',
                  opacity: saving ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: `0 4px 20px ${color}55`,
                }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
                {initial ? 'Salva modifiche' : 'Crea Timeline'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Timeline Card ──────────────────────────────────────────
interface TimelineCardProps {
  timeline: Timeline;
  onEdit: (t: Timeline) => void;
  onDelete: (id: number) => void;
  onClick: (id: number) => void;
  onContextMenu?: (t: Timeline, e: React.MouseEvent) => void;
}

const TimelineCard: React.FC<TimelineCardProps> = ({ timeline, onEdit, onDelete, onClick, onContextMenu }) => {
  const totalPhases = timeline.phases.length;
  const totalSteps = timeline.total_steps;
  const completedSteps = timeline.completed_steps;
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const accent = timeline.color;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="glass-card"
      style={{
        borderRadius: 18,
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
      }}
      onClick={() => onClick(timeline.id)}
      onContextMenu={e => { e.preventDefault(); onContextMenu?.(timeline, e); }}
    >
      {/* Top accent stripe */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}88)`, flexShrink: 0 }} />

      {/* Subtle glow overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at top left, ${accent}12 0%, transparent 60%)`,
      }} />

      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              background: `${accent}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GitBranch size={22} style={{ color: accent }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                {timeline.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-quaternary)', marginTop: 2 }}>
                {formatDate(timeline.created_at)}
              </div>
            </div>
          </div>

          {/* Edit / Delete */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              onClick={e => { e.stopPropagation(); onEdit(timeline); }}
              style={{
                padding: '6px 8px', borderRadius: 8, border: '1px solid var(--color-border-secondary)',
                background: 'var(--glass-bg-light)', color: 'var(--color-text-tertiary)',
                cursor: 'pointer', display: 'flex',
              }}
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(timeline.id); }}
              style={{
                padding: '6px 8px', borderRadius: 8, border: '1px solid var(--color-border-secondary)',
                background: 'var(--glass-bg-light)', color: 'var(--color-text-tertiary)',
                cursor: 'pointer', display: 'flex',
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Description */}
        {timeline.description && (
          <p style={{
            fontSize: 13, color: 'var(--color-text-tertiary)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            margin: 0,
          }}>
            {timeline.description}
          </p>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-quaternary)' }}>
            <Calendar size={12} />
            {totalPhases} {totalPhases === 1 ? 'fase' : 'fasi'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-quaternary)' }}>
            <Layers size={12} />
            {completedSteps}/{totalSteps} step
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-quaternary)' }}>Progresso</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: progressColor(pct) }}>{pct}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', borderRadius: 99, background: progressColor(pct) }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: accent, display: 'flex', alignItems: 'center', gap: 4 }}>
            Apri <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ── Dashboard ──────────────────────────────────────────────
const TimelineDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Timeline | undefined>();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; timeline: Timeline } | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  const loadTimelines = useCallback(async () => {
    try {
      setLoading(true);
      const data = await timelineApi.getAll();
      setTimelines(data);
    } catch {
      setError('Impossibile caricare le timeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTimelines(); }, [loadTimelines]);

  const handleCreate = async (payload: CreateTimelinePayload) => {
    const created = await timelineApi.create(payload);
    setTimelines(prev => [created, ...prev]);
  };

  const handleEdit = async (payload: CreateTimelinePayload) => {
    if (!editTarget) return;
    const updated = await timelineApi.update(editTarget.id, payload);
    setTimelines(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eliminare questa timeline? L\'azione è irreversibile.')) return;
    setDeletingId(id);
    try {
      await timelineApi.delete(id);
      setTimelines(prev => prev.filter(t => t.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (t: Timeline) => { setEditTarget(t); setShowModal(true); setContextMenu(null); };
  const openCreate = () => { setEditTarget(undefined); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditTarget(undefined); };

  const handleDuplicate = async (t: Timeline) => {
    setContextMenu(null);
    setDuplicatingId(t.id);
    try {
      const created = await timelineApi.duplicate(t.id);
      setTimelines(prev => [created, ...prev]);
      navigate(`/timeline/${created.id}`);
    } catch {
      // keep menu closed, error could be shown via toast
    } finally {
      setDuplicatingId(null);
    }
  };

  const contextMenuItems: ContextMenuItem[] = contextMenu ? [
    { id: 'open', label: 'Apri', icon: <ChevronRight size={14} />, action: () => { navigate(`/timeline/${contextMenu.timeline.id}`); setContextMenu(null); } },
    { id: 'div1', label: '', divider: true, action: () => {} },
    { id: 'edit', label: 'Modifica', icon: <Edit2 size={14} />, action: () => openEdit(contextMenu.timeline) },
    { id: 'duplicate', label: 'Duplica timeline', icon: <Copy size={14} />, action: () => handleDuplicate(contextMenu.timeline), disabled: duplicatingId === contextMenu.timeline.id },
    { id: 'div2', label: '', divider: true, action: () => {} },
    { id: 'delete', label: 'Elimina', icon: <Trash2 size={14} />, action: () => { handleDelete(contextMenu.timeline.id); setContextMenu(null); }, danger: true },
  ] : [];

  return (
    <div data-context-menu="timeline" style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '36px 32px' }}>

      {/* Page Header */}
      <div style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          }}>
            <GitBranch size={26} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, letterSpacing: -0.5 }}>
              Timeline
            </h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>
              Visualizza e gestisci le tue timeline di progetto
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {timelines.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/timeline/all')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 20px', borderRadius: 14,
                border: '1px solid rgba(99,102,241,0.4)',
                background: 'rgba(99,102,241,0.1)',
                color: '#a5b4fc', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              <Eye size={16} />
              Vedi tutte insieme
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 22px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            }}
          >
            <Plus size={17} strokeWidth={2.5} />
            Nuova Timeline
          </motion.button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: '#6366f1' }} />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, padding: '60px 0', color: 'var(--color-error)' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && timelines.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{
            borderRadius: 24, padding: '80px 40px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center',
          }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(99,102,241,0.2)',
          }}>
            <GitBranch size={38} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              Nessuna timeline ancora
            </p>
            <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', margin: '8px 0 0' }}>
              Crea la prima timeline per organizzare i tuoi progetti
            </p>
          </div>
          <button
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 28px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              marginTop: 8,
            }}
          >
            <Plus size={17} /> Crea la prima Timeline
          </button>
        </motion.div>
      )}

      {/* Grid */}
      {!loading && !error && timelines.length > 0 && (
        <motion.div
          layout
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          <AnimatePresence mode="popLayout">
            {timelines.map(t => (
              <div
                key={t.id}
                style={{ opacity: deletingId === t.id ? 0.4 : 1, pointerEvents: deletingId === t.id ? 'none' : 'auto', transition: 'opacity 0.2s' }}
              >
                <TimelineCard
                  timeline={t}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onClick={id => navigate(`/timeline/${id}`)}
                  onContextMenu={(tl, e) => setContextMenu({ x: e.clientX, y: e.clientY, timeline: tl })}
                />
              </div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <TimelineModal
            initial={editTarget}
            onClose={closeModal}
            onSave={editTarget ? handleEdit : handleCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimelineDashboard;
