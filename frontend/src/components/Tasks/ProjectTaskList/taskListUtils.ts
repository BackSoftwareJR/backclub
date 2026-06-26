import { type CrmProjectTask, type TaskExecutionMode } from '../../../api/crmProjects';

export type ExecutionFilter = 'all' | 'agents' | 'humans';

// ── Classification ────────────────────────────────────────────────────────────

export function isAgentTask(task: CrmProjectTask): boolean {
  return task.execution_mode === 'agent' || task.execution_mode === 'agent_human';
}

export function isHumanTask(task: CrmProjectTask): boolean {
  return !task.execution_mode || task.execution_mode === 'human';
}

export function applyExecutionFilter(
  tasks: CrmProjectTask[],
  filter: ExecutionFilter,
): CrmProjectTask[] {
  if (filter === 'agents') return tasks.filter(isAgentTask);
  if (filter === 'humans') return tasks.filter(isHumanTask);
  return tasks;
}

// ── Day grouping ──────────────────────────────────────────────────────────────

export interface AgentDayGroup {
  key: string;         // e.g. "2026-06-21"
  label: string;       // e.g. "Oggi", "Ieri", "lunedì 16 giugno"
  tasks: CrmProjectTask[];
  isActiveGroup: boolean; // has in-progress tasks → stays open by default
}

/**
 * Returns the date to use for grouping an agent task.
 * Priority: n8n_completed_at → completed_date → created_at
 */
function agentGroupDate(task: CrmProjectTask): Date {
  const raw =
    task.n8n_completed_at ||
    task.completed_date ||
    task.created_at;
  return new Date(raw);
}

function toLocalDateKey(date: Date): string {
  return date.toLocaleDateString('sv-SE'); // "2026-06-21"
}

const DAYS_IT = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MONTHS_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

export function formatDayLabel(key: string): string {
  const todayKey = toLocalDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterday);

  if (key === todayKey) return 'Oggi';
  if (key === yesterdayKey) return 'Ieri';

  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAYS_IT[date.getDay()];
  const monthName = MONTHS_IT[date.getMonth()];
  return `${dayName} ${d} ${monthName}`;
}

export function groupAgentTasksByDay(tasks: CrmProjectTask[]): AgentDayGroup[] {
  const map = new Map<string, CrmProjectTask[]>();

  for (const task of tasks) {
    const key = toLocalDateKey(agentGroupDate(task));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(task);
  }

  // Sort keys descending (newest first)
  const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const dayTasks = map.get(key)!;
    const isActiveGroup = dayTasks.some(
      (t) =>
        t.n8n_status === 'processing' ||
        t.n8n_status === 'pending' ||
        t.status === 'in_progress',
    );
    return {
      key,
      label: formatDayLabel(key),
      tasks: dayTasks,
      isActiveGroup,
    };
  });
}

// ── Default collapsed state ───────────────────────────────────────────────────

export function buildDefaultCollapsed(groups: AgentDayGroup[]): Set<string> {
  const todayKey = toLocalDateKey(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterday);

  const collapsed = new Set<string>();
  for (const g of groups) {
    // Keep open: today, yesterday if it has active tasks, any group with active tasks
    const isToday = g.key === todayKey;
    const isYesterdayActive = g.key === yesterdayKey && g.isActiveGroup;
    if (!isToday && !isYesterdayActive && !g.isActiveGroup) {
      collapsed.add(g.key);
    }
  }
  return collapsed;
}

// ── n8n status helpers ────────────────────────────────────────────────────────

export type N8nBadgeVariant = 'processing' | 'pending' | 'completed' | 'failed' | 'review' | 'skipped';

interface N8nBadgeInfo {
  label: string;
  variant: N8nBadgeVariant;
}

export function getN8nBadge(task: CrmProjectTask): N8nBadgeInfo | null {
  if (!isAgentTask(task)) return null;
  const s = task.n8n_status;
  if (!s) return null;
  const map: Record<string, N8nBadgeInfo> = {
    pending:    { label: 'In coda',       variant: 'pending' },
    processing: { label: 'In esecuzione', variant: 'processing' },
    completed:  { label: 'Completato',    variant: 'completed' },
    failed:     { label: 'Fallito',       variant: 'failed' },
    review:     { label: 'Revisione',     variant: 'review' },
    skipped:    { label: 'Saltato',       variant: 'skipped' },
  };
  return map[s] ?? null;
}

// ── Execution mode display ────────────────────────────────────────────────────

export function executionModeLabel(mode: TaskExecutionMode | undefined): string {
  if (mode === 'agent') return 'Agente IA';
  if (mode === 'agent_human') return 'Agente + Umano';
  return 'Umano';
}

// ── localStorage persistence ─────────────────────────────────────────────────

const LS_KEY_PREFIX = 'ptl_collapsed_';

export function loadCollapsedFromStorage(projectId: number): Set<string> | null {
  try {
    const raw = localStorage.getItem(`${LS_KEY_PREFIX}${projectId}`);
    if (!raw) return null;
    return new Set<string>(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCollapsedToStorage(projectId: number, collapsed: Set<string>): void {
  try {
    localStorage.setItem(`${LS_KEY_PREFIX}${projectId}`, JSON.stringify(Array.from(collapsed)));
  } catch {
    // ignore
  }
}
