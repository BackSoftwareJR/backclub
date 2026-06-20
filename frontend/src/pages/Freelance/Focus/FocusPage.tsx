import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Zap, MessageCircle, Plus, Settings, ScanSearch,
  CheckCircle2, AlertCircle, RefreshCw, CalendarDays,
} from 'lucide-react';
import { focusApi } from '../../../api/focus';
import type {
  AgendaItem,
  AnalysisReport,
  AnalysisResult,
  ChatMessage,
  DailyCheckin,
  FocusSession,
  FocusSessionSlot,
  FocusTask,
  UserFocusPreferences,
} from '../../../types/focus';
import FocusTimeline         from './components/FocusTimeline';
import FocusWeekView         from './components/FocusWeekView';
import FocusSpotlight        from './components/FocusSpotlight';
import FocusAssistant        from './components/FocusAssistant';
import FocusTaskModal        from './components/FocusTaskModal';
import FocusPreferencesPanel from './components/FocusPreferencesPanel';
import FocusBacklog          from './components/FocusBacklog';
import FocusAnalysisPanel    from './components/FocusAnalysisPanel';
import FocusDailyCheckin     from './components/FocusDailyCheckin';
import './FocusPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MORNING_GREETING: Omit<ChatMessage, 'id' | 'timestamp'> = {
  role: 'assistant',
  content: 'Buongiorno! 👋 Come stai oggi? Dimmi come ti senti così posso adattare la tua giornata.',
  suggested_replies: ['Carico 💪', 'Stanco 😴', 'Ho poco tempo ⏱', 'Sono concentrato ⚡'],
};

const AFTERNOON_GREETING: Omit<ChatMessage, 'id' | 'timestamp'> = {
  role: 'assistant',
  content: 'Siamo a metà giornata. Vuoi che adatti il pomeriggio in base a come è andata finora?',
  suggested_replies: ['Sì, alleggeriscilo', 'No, mantieni il piano', 'Dammi solo task veloci'],
};

const EVENING_GREETING: Omit<ChatMessage, 'id' | 'timestamp'> = {
  role: 'assistant',
  content: 'È quasi sera! Come è andata la giornata? Possiamo pianificare qualcosa per domani.',
  suggested_replies: ['Bene, pianifica domani', 'Sono esausto', 'Rivedi i task saltati'],
};

function getInitialCoachMsg(): Omit<ChatMessage, 'id' | 'timestamp'> {
  const hour = new Date().getHours();
  if (hour < 12) return MORNING_GREETING;
  if (hour < 17) return AFTERNOON_GREETING;
  return EVENING_GREETING;
}

function makeMsg(partial: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
  return {
    ...partial,
    id:        `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
  };
}

function getCurrentTimeStr(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMondayOfWeek(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function findActiveSlotIndex(slots: FocusSessionSlot[], currentTime: string): number {
  const [h, m] = currentTime.split(':').map(Number);
  const nowMin = h * 60 + m;
  return slots.findIndex(s => {
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    return nowMin >= sh * 60 + sm && nowMin < eh * 60 + em;
  });
}

const ENERGY_EMOJIS = ['', '😴', '😕', '😐', '😊', '💪'];

// ── Tab types ──────────────────────────────────────────────────────────────────

type MobileTab = 'today' | 'backlog' | 'week';

// ── Component ─────────────────────────────────────────────────────────────────

const FocusPage: React.FC = () => {
  const [session,       setSession]       = useState<FocusSession | null>(null);
  const [slots,         setSlots]         = useState<FocusSessionSlot[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [regenerating,  setRegenerating]  = useState(false);
  const [chatMessages,  setChatMessages]  = useState<ChatMessage[]>([]);
  const [chatLoading,   setChatLoading]   = useState(false);
  const [currentTime,   setCurrentTime]   = useState(getCurrentTimeStr());
  const [toast,         setToast]         = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [mobileTab,     setMobileTab]     = useState<MobileTab>('today');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedDate] = useState(todayIso());
  const [agendaItems,   setAgendaItems]   = useState<AgendaItem[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [preferences,   setPreferences]   = useState<UserFocusPreferences | null>(null);
  const [showPreferences,   setShowPreferences]   = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [showAssistant,     setShowAssistant]     = useState(false);
  const [analysisReports,   setAnalysisReports]   = useState<AnalysisReport[]>([]);
  const [analysisRunning,   setAnalysisRunning]   = useState(false);
  const [inProgressId,      setInProgressId]      = useState<string | null>(null);

  // Check-in state
  const [checkin,      setCheckin]      = useState<DailyCheckin | null>(null);
  const [checkinLoaded, setCheckinLoaded] = useState(false);
  const [showCheckin,   setShowCheckin]  = useState(false);

  const chatInitialised    = useRef(false);
  const analysisPollActive = useRef(false);

  // ── Tick ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(getCurrentTimeStr()), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Toast ─────────────────────────────────────────────────────────────────────

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Load today's check-in ─────────────────────────────────────────────────────

  const loadCheckin = useCallback(async () => {
    try {
      const data = await focusApi.getTodayCheckin();
      setCheckin(data);
      setCheckinLoaded(true);
      if (!data) setShowCheckin(true);
    } catch {
      // TODO: rimuovere mock quando backend è pronto
      setCheckin(null);
      setCheckinLoaded(true);
      setShowCheckin(true);
    }
  }, []);

  // ── Load session ───────────────────────────────────────────────────────────────

  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await focusApi.getTodaySession();
      setSession(data.session);
      setSlots(data.slots ?? data.session.slots ?? []);
    } catch (err) {
      console.error('Focus: failed to load session', err);
      setError('Impossibile caricare la sessione di oggi.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load agenda ────────────────────────────────────────────────────────────────

  const loadAgenda = useCallback(async (date: string) => {
    try {
      setAgendaLoading(true);
      const data = await focusApi.getAgenda({ view: 'day', date });
      setAgendaItems(data.items);
      if (data.slots?.length) setSlots(data.slots);
      const inProg = data.items.find(i => i.status === 'in_progress');
      if (inProg) setInProgressId(inProg.id);
    } catch (err) {
      console.error('Focus: failed to load agenda', err);
    } finally {
      setAgendaLoading(false);
    }
  }, []);

  // ── Load preferences ──────────────────────────────────────────────────────────

  const loadPreferences = useCallback(async () => {
    try {
      const data = await focusApi.getPreferences();
      setPreferences(data);
      if (!data.id) setShowPreferences(true);
    } catch (err) {
      console.error('Focus: failed to load preferences', err);
    }
  }, []);

  const handleSavePreferences = useCallback(async (data: Partial<UserFocusPreferences>) => {
    const saved = await focusApi.savePreferences(data);
    setPreferences(saved);
    showToast('success', 'Preferenze salvate!');
  }, [showToast]);

  // ── Analysis pipeline ─────────────────────────────────────────────────────────

  const pumpAnalysisPipeline = useCallback(async () => {
    if (analysisPollActive.current) return;
    analysisPollActive.current = true;
    setAnalysisRunning(true);
    try {
      let hasMore = true;
      while (hasMore) {
        const result = await focusApi.runNextAnalysisStep();
        if (result.report) {
          setAnalysisReports(prev =>
            prev.map(r => r.id === result.report!.id ? result.report! : r)
          );
        }
        hasMore = result.has_more;
        if (hasMore) await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (err) {
      console.error('FocusPage: analysis pipeline error', err);
    } finally {
      analysisPollActive.current = false;
      setAnalysisRunning(false);
    }
  }, []);

  const loadAnalysisReports = useCallback(async () => {
    try {
      const reports = await focusApi.getAnalysisReports();
      setAnalysisReports(reports);
      if (reports.some(r => r.status === 'pending' || r.status === 'analyzing')) {
        pumpAnalysisPipeline();
      }
    } catch (err) {
      console.error('FocusPage: failed to load analysis reports', err);
    }
  }, [pumpAnalysisPipeline]);

  const handleAnalysisRefresh = useCallback(async () => {
    if (analysisPollActive.current) return;
    try {
      const reports = await focusApi.invalidateAnalysis();
      setAnalysisReports(reports);
      pumpAnalysisPipeline();
    } catch (err) {
      console.error('FocusPage: analysis refresh failed', err);
    }
  }, [pumpAnalysisPipeline]);

  const handleAnalyzeText = useCallback(async (
    text: string,
    question?: string,
  ): Promise<AnalysisResult> => {
    return focusApi.analyzeText(text, question);
  }, []);

  // ── Mount effects ─────────────────────────────────────────────────────────────

  useEffect(() => { loadCheckin(); }, [loadCheckin]);
  useEffect(() => { loadSession(); }, [loadSession]);
  useEffect(() => { loadAgenda(selectedDate); }, [selectedDate, loadAgenda]);
  useEffect(() => { loadPreferences(); }, [loadPreferences]);
  useEffect(() => { loadAnalysisReports(); }, [loadAnalysisReports]);

  useEffect(() => {
    if (!chatInitialised.current && !loading && !error) {
      chatInitialised.current = true;
      setChatMessages([makeMsg(getInitialCoachMsg())]);
    }
  }, [loading, error]);

  // ── Regenerate ────────────────────────────────────────────────────────────────

  const handleRegenerate = useCallback(async () => {
    try {
      setRegenerating(true);
      const updated = await focusApi.regenerateSession();
      setSession(updated);
      setSlots(updated.slots ?? []);
      showToast('success', 'Giornata rigenerata!');
      await loadAgenda(selectedDate);
    } catch {
      showToast('error', 'Errore nella rigenerazione.');
    } finally {
      setRegenerating(false);
    }
  }, [showToast, selectedDate, loadAgenda]);

  // ── Complete task ─────────────────────────────────────────────────────────────

  const handleCompleteTask = useCallback(async (
    taskId: number,
    actualMinutes: number,
    fatigue: 1 | 2 | 3 | 4 | 5,
  ) => {
    await focusApi.completeTask(taskId, { actual_minutes: actualMinutes, mental_fatigue: fatigue });
    await loadSession();
    await loadAgenda(selectedDate);
    showToast('success', 'Task completata!');
    setChatMessages(prev => [...prev, makeMsg({
      role: 'assistant',
      content: 'Ottimo lavoro! 🎉 Com\'è andata questa task?',
      suggested_replies: ['Bene, avanti!', 'Ci ho messo più del previsto', 'Sono esausto'],
    })]);
  }, [loadSession, loadAgenda, showToast, selectedDate]);

  // ── Create task ───────────────────────────────────────────────────────────────

  const handleCreateTask = useCallback(async (taskData: Partial<FocusTask>) => {
    await focusApi.createTask(taskData);
    await loadSession();
    await loadAgenda(selectedDate);
    showToast('success', 'Task aggiunta alla coda');
  }, [loadSession, loadAgenda, showToast, selectedDate]);

  const handleUpdateTask = useCallback(async (id: number, taskData: Partial<FocusTask>) => {
    await focusApi.updateTask(id, taskData);
    await loadSession();
    await loadAgenda(selectedDate);
    showToast('success', 'Task aggiornata!');
  }, [loadSession, loadAgenda, showToast, selectedDate]);

  // ── Start now ─────────────────────────────────────────────────────────────────

  const handleStartNow = useCallback(async (agendaItemId: string) => {
    try {
      let focusTaskId: number;
      if (agendaItemId.startsWith('focus_')) {
        focusTaskId = parseInt(agendaItemId.replace('focus_', ''), 10);
      } else {
        const wrapper = await focusApi.ensureWrapper(agendaItemId);
        focusTaskId = wrapper.id;
      }
      await focusApi.updateTask(focusTaskId, { status: 'in_progress' });
      setInProgressId(agendaItemId);
      await loadAgenda(selectedDate);
      showToast('success', 'Hai iniziato! Buon lavoro 💪');
    } catch {
      showToast('error', 'Impossibile avviare la task.');
    }
  }, [selectedDate, loadAgenda, showToast]);

  // ── Priority change ───────────────────────────────────────────────────────────

  const handlePriorityChange = useCallback(async (agendaItemId: string, priorityScore: number) => {
    try {
      let focusTaskId: number;
      if (agendaItemId.startsWith('focus_')) {
        focusTaskId = parseInt(agendaItemId.replace('focus_', ''), 10);
      } else {
        const wrapper = await focusApi.ensureWrapper(agendaItemId);
        focusTaskId = wrapper.id;
      }
      await focusApi.updatePriority(focusTaskId, priorityScore);
      setAgendaItems(prev => prev.map(item =>
        item.id === agendaItemId ? { ...item, priority_score: priorityScore } : item
      ));
    } catch {
      showToast('error', 'Errore aggiornamento priorità.');
    }
  }, [showToast]);

  // ── Reorder ───────────────────────────────────────────────────────────────────

  const handleReorder = useCallback(async (reordered: AgendaItem[]) => {
    setAgendaItems(reordered);
    await Promise.all(
      reordered
        .filter(item => item.priority_score !== undefined)
        .map(async item => {
          try {
            let focusTaskId: number;
            if (item.id.startsWith('focus_')) {
              focusTaskId = parseInt(item.id.replace('focus_', ''), 10);
            } else {
              const wrapper = await focusApi.ensureWrapper(item.id);
              focusTaskId = wrapper.id;
            }
            await focusApi.updatePriority(focusTaskId, item.priority_score!);
          } catch {
            // Non-critical
          }
        })
    );
  }, []);

  // ── Chat ──────────────────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(async (text: string) => {
    setChatMessages(prev => [...prev, makeMsg({ role: 'user', content: text })]);
    setChatLoading(true);
    try {
      const resp = await focusApi.sendChat({
        message:    text,
        session_id: session?.id ?? null,
      });
      const suggestedReplies = resp.suggested_replies?.length
        ? resp.suggested_replies
        : ['Mettila come priorità alta', 'Sposta a domani', 'Rimuovila dal piano'];
      setChatMessages(prev => [...prev, makeMsg({
        role: 'assistant',
        content: resp.response,
        suggested_replies: suggestedReplies,
      })]);
      if (resp.priority_action) {
        await loadAgenda(selectedDate);
        showToast('success', `Priorità aggiornata: ${resp.priority_action.task_title}`);
      }
      if (resp.session_updated) {
        showToast('success', 'Timeline aggiornata!');
        if (resp.session) {
          setSession(resp.session);
          setSlots(resp.session.slots ?? []);
        } else {
          await loadSession();
        }
        await loadAgenda(selectedDate);
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        makeMsg({ role: 'assistant', content: 'Errore nella risposta. Riprova tra poco.' }),
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [session, showToast, loadSession, loadAgenda, selectedDate]);

  // ── Check-in handlers ─────────────────────────────────────────────────────────

  const handleCheckinComplete = useCallback((newCheckin: DailyCheckin) => {
    setCheckin(newCheckin);
    setShowCheckin(false);
    // Regenerate timeline based on checkin data
    handleRegenerate();
  }, [handleRegenerate]);

  const handleCheckinSkip = useCallback(() => {
    setShowCheckin(false);
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────────

  const activeSlotIdx = findActiveSlotIndex(slots, currentTime);
  const activeSlot    = activeSlotIdx !== -1 ? slots[activeSlotIdx] : null;
  const nextSlot      = activeSlotIdx !== -1 && activeSlotIdx < slots.length - 1
    ? slots[activeSlotIdx + 1]
    : null;

  const weekStart = useMemo(() => getMondayOfWeek(selectedDate), [selectedDate]);

  const dayLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [selectedDate]);

  const inProgressItem = useMemo(
    () => inProgressId ? agendaItems.find(i => i.id === inProgressId) ?? null : null,
    [inProgressId, agendaItems]
  );

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (loading && !checkinLoaded) {
    return (
      <div className="focus-page">
        <div className="focus-state-center">
          <div className="focus-spinner" />
          <span>Caricamento Focus…</span>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="focus-page">
        <div className="focus-state-center">
          <span style={{ fontSize: 28 }}>⚠️</span>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{error}</span>
          <button className="focus-btn focus-btn--outline" onClick={loadSession} type="button">
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="focus-page">
      {/* Toast */}
      {toast && (
        <div className={`focus-toast focus-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Daily Check-in Modal */}
      {showCheckin && checkinLoaded && (
        <FocusDailyCheckin
          onComplete={handleCheckinComplete}
          onSkip={handleCheckinSkip}
          existingCheckin={checkin}
        />
      )}

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="focus-header focus-header--v2">
        <div className="focus-header__left">
          <h1 className="focus-header__title">Focus</h1>
          <span className="focus-header__date">{dayLabel}</span>

          {/* Check-in badge */}
          {checkinLoaded && (
            checkin ? (
              <button
                type="button"
                className="focus-checkin-badge focus-checkin-badge--done"
                onClick={() => setShowCheckin(true)}
                title="Check-in completato — clicca per rivedere"
              >
                <CheckCircle2 size={12} />
                Check-in
                {checkin.energy_level && (
                  <span className="focus-checkin-energy">
                    {ENERGY_EMOJIS[checkin.energy_level]}
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="focus-checkin-badge focus-checkin-badge--missing"
                onClick={() => setShowCheckin(true)}
                title="Fai il check-in giornaliero"
              >
                <AlertCircle size={12} />
                Check-in mancante
              </button>
            )
          )}
        </div>

        <div className="focus-header__controls">
          {/* Rigenera timeline */}
          <button
            className={`focus-fab focus-fab--inline${regenerating ? ' focus-fab--spinning' : ''}`}
            onClick={handleRegenerate}
            type="button"
            title="Rigenera timeline"
            aria-label="Rigenera timeline"
            disabled={regenerating}
          >
            <RefreshCw size={15} />
          </button>

          {/* Analysis */}
          <button
            className="focus-fab focus-fab--inline focus-fab--analysis"
            onClick={() => setShowAnalysisPanel(p => !p)}
            type="button"
            title="Analisi AI"
          >
            <ScanSearch size={15} />
            {analysisRunning ? (
              <span className="focus-badge focus-badge--spinning">⟳</span>
            ) : analysisReports.length > 0 && analysisReports.every(r => r.status === 'ready') ? (
              <span className="focus-badge focus-badge--green">✓</span>
            ) : analysisReports.length > 0 ? (
              <span className="focus-badge focus-badge--pending">
                {analysisReports.filter(r => r.status === 'ready').length}/{analysisReports.length}
              </span>
            ) : null}
          </button>

          {/* Assistant toggle */}
          <button
            className={`focus-fab focus-fab--inline${showAssistant ? ' focus-fab--active' : ''}`}
            onClick={() => setShowAssistant(p => !p)}
            type="button"
            title="Assistente AI"
          >
            <MessageCircle size={15} />
          </button>

          {/* Preferences */}
          <button
            className="focus-fab focus-fab--inline"
            onClick={() => setShowPreferences(true)}
            type="button"
            title="Preferenze"
          >
            <Settings size={15} />
          </button>

          {/* New task */}
          <button
            className="focus-fab focus-fab--inline focus-fab--primary"
            onClick={() => setShowTaskModal(true)}
            type="button"
            title="Aggiungi task"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* ── Mobile tab bar ─────────────────────────────────────────────────── */}
      <div className="focus-mobile-tabs">
        <button
          className={`focus-mobile-tab${mobileTab === 'backlog' ? ' focus-mobile-tab--active' : ''}`}
          onClick={() => setMobileTab('backlog')}
          type="button"
        >
          📋 Backlog
        </button>
        <button
          className={`focus-mobile-tab${mobileTab === 'today' ? ' focus-mobile-tab--active' : ''}`}
          onClick={() => setMobileTab('today')}
          type="button"
        >
          <Zap size={12} /> Oggi
        </button>
        <button
          className={`focus-mobile-tab${mobileTab === 'week' ? ' focus-mobile-tab--active' : ''}`}
          onClick={() => setMobileTab('week')}
          type="button"
        >
          <CalendarDays size={12} /> Settimana
        </button>
      </div>

      {/* ── 3-column grid ──────────────────────────────────────────────────── */}
      <div className="focus-grid focus-grid--three-col">

        {/* Left column: BACKLOG */}
        <div className={`focus-col focus-col--left${mobileTab === 'backlog' ? ' focus-col--visible' : ''}`}>
          <FocusBacklog
            items={agendaItems}
            inProgressId={inProgressId}
            onPriorityChange={handlePriorityChange}
            onStartNow={handleStartNow}
            onReorder={handleReorder}
          />
        </div>

        {/* Center column: TIMELINE + SPOTLIGHT */}
        <div className={`focus-col focus-col--center${mobileTab === 'today' ? ' focus-col--visible' : ''}`}>
          {/* Compact spotlight strip at top */}
          <div className="focus-spotlight-strip">
            <FocusSpotlight
              activeSlot={activeSlot}
              nextSlot={nextSlot}
              inProgressItem={inProgressItem}
              onComplete={handleCompleteTask}
              onStartNow={handleStartNow}
            />
          </div>

          {/* Timeline */}
          <div className="focus-timeline-pane">
            <FocusTimeline
              slots={slots}
              agendaItems={agendaItems}
              currentTime={currentTime}
              activeSlotId={activeSlot?.id ?? null}
              onSlotClick={() => {}}
              onRegenerate={handleRegenerate}
              regenerating={regenerating || agendaLoading}
            />
          </div>
        </div>

        {/* Right column: WEEK PLANNER */}
        <div className={`focus-col focus-col--right-week${mobileTab === 'week' ? ' focus-col--visible' : ''}`}>
          <FocusWeekView
            agendaItems={agendaItems}
            weekStart={weekStart}
          />
        </div>
      </div>

      {/* ── AI Assistant drawer ─────────────────────────────────────────────── */}
      {showAssistant && (
        <>
          <div
            className="fap-backdrop"
            onClick={() => setShowAssistant(false)}
          />
          <div className="fap-drawer focus-assistant-drawer">
            <FocusAssistant
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onSuggestedReply={handleSendMessage}
              onAnalyzeText={handleAnalyzeText}
              loading={chatLoading}
              sessionId={session?.id ?? null}
            />
          </div>
        </>
      )}

      {/* ── Modals / panels ──────────────────────────────────────────────────── */}

      <FocusTaskModal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={handleCreateTask}
        onUpdate={handleUpdateTask}
      />

      <FocusPreferencesPanel
        open={showPreferences}
        initial={preferences}
        onClose={() => setShowPreferences(false)}
        onSave={handleSavePreferences}
      />

      <FocusAnalysisPanel
        open={showAnalysisPanel}
        reports={analysisReports}
        isRunning={analysisRunning}
        onClose={() => setShowAnalysisPanel(false)}
        onRefresh={handleAnalysisRefresh}
      />
    </div>
  );
};

export default FocusPage;
