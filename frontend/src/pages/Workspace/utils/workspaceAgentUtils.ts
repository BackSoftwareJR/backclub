import type { WorkspaceAgent, WorkspaceAgentStatus } from '../../../types/workspace';

export type AgentSectionKey = 'running' | 'queued' | 'completed' | 'failed';

export interface AgentStatusConfig {
  color: string;
  label: string;
  pulse: boolean;
  section: AgentSectionKey;
}

const STATUS_CONFIGS: Record<WorkspaceAgentStatus, AgentStatusConfig> = {
  pending: { color: 'var(--ws-warning)', label: 'In coda', pulse: false, section: 'queued' },
  running: { color: 'var(--ws-accent)', label: 'In corso', pulse: true, section: 'running' },
  review: { color: 'var(--ws-warning)', label: 'In revisione', pulse: true, section: 'running' },
  completed: { color: 'var(--ws-success)', label: 'Completato', pulse: false, section: 'completed' },
  failed: { color: 'var(--ws-danger)', label: 'Fallito', pulse: false, section: 'failed' },
  stopped: { color: 'var(--ws-text-tertiary)', label: 'Fermato', pulse: false, section: 'failed' },
};

export const SECTION_LABELS: Record<AgentSectionKey, string> = {
  running: 'In corso',
  queued: 'In coda',
  completed: 'Completati',
  failed: 'Falliti',
};

export const SECTION_ORDER: AgentSectionKey[] = ['running', 'queued', 'completed', 'failed'];

export function getAgentStatusConfig(status: WorkspaceAgentStatus): AgentStatusConfig {
  return STATUS_CONFIGS[status] ?? STATUS_CONFIGS.pending;
}

export function getAgentSection(status: WorkspaceAgentStatus): AgentSectionKey {
  return getAgentStatusConfig(status).section;
}

export function groupAgentsBySection(agents: WorkspaceAgent[]): Record<AgentSectionKey, WorkspaceAgent[]> {
  const groups: Record<AgentSectionKey, WorkspaceAgent[]> = {
    running: [],
    queued: [],
    completed: [],
    failed: [],
  };

  agents.forEach((agent) => {
    groups[getAgentSection(agent.status)].push(agent);
  });

  groups.queued.sort((a, b) => {
    const posA = a.queue_position ?? Number.MAX_SAFE_INTEGER;
    const posB = b.queue_position ?? Number.MAX_SAFE_INTEGER;
    if (posA !== posB) return posA - posB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return groups;
}

export function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Ora';
  if (diffMins < 60) return `${diffMins}m fa`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h fa`;
  return new Date(timestamp).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function getActivityTimestamp(agent: WorkspaceAgent): string | null {
  return agent.updated_at || agent.started_at || agent.created_at;
}

export function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function getPromptExcerpt(agent: WorkspaceAgent): string {
  const firstLine = agent.prompt.split('\n')[0]?.trim() ?? agent.prompt;
  return truncateText(firstLine, 90);
}

export function getExecutionSnippet(executionId: string | null): string | null {
  if (!executionId) return null;
  if (executionId.length <= 10) return executionId;
  return `${executionId.slice(0, 8)}…`;
}

export function getLastLogLine(logs: string | null): string | null {
  if (!logs?.trim()) return null;

  try {
    const parsed = JSON.parse(logs);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const last = parsed[parsed.length - 1];
      if (typeof last === 'string') return truncateText(last, 100);
      if (last && typeof last === 'object') {
        const obj = last as Record<string, unknown>;
        const message = obj.message ?? obj.text ?? obj.log ?? obj.title;
        if (typeof message === 'string' && message.trim()) {
          return truncateText(message, 100);
        }
      }
    }
  } catch {
    // fall through
  }

  const lines = logs.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return truncateText(lines[lines.length - 1], 100);
}

export function needsLivePolling(agents: WorkspaceAgent[]): boolean {
  return agents.some((a) => ['running', 'review', 'pending'].includes(a.status));
}
