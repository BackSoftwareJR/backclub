import apiClient from './client';

// =========================================================
// TYPES
// =========================================================

export interface TimelineChecklistItem {
  id: number;
  step_id: number;
  text: string;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TimelineStep {
  id: number;
  phase_id: number;
  title: string;
  description: string | null;
  date_order: string | null;  // ISO date "YYYY-MM-DD"
  is_completed: boolean;
  completed_at: string | null; // ISO datetime when step was marked completed
  sort_order: number;
  checklist_items: TimelineChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface TimelinePhase {
  id: number;
  timeline_id: number;
  title: string;
  description: string | null;
  start_date: string;   // "YYYY-MM-DD"
  end_date: string;     // "YYYY-MM-DD"
  color: string;        // hex
  sort_order: number;
  steps: TimelineStep[];
  created_at: string;
  updated_at: string;
}

export interface Timeline {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  color: string;
  share_token: string | null;
  phases: TimelinePhase[];
  total_steps: number;
  completed_steps: number;
  created_at: string;
  updated_at: string;
}

// =========================================================
// CREATE / UPDATE PAYLOADS
// =========================================================

export interface CreateTimelinePayload {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateTimelinePayload extends Partial<CreateTimelinePayload> {}

export interface CreatePhasePayload {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  color?: string;
  sort_order?: number;
}

export interface UpdatePhasePayload extends Partial<CreatePhasePayload> {}

export interface CreateStepPayload {
  title: string;
  description?: string;
  date_order?: string;
  is_completed?: boolean;
  sort_order?: number;
}

export interface UpdateStepPayload extends Partial<CreateStepPayload> {}

export interface CreateChecklistItemPayload {
  text: string;
  is_completed?: boolean;
  sort_order?: number;
}

export interface UpdateChecklistItemPayload extends Partial<CreateChecklistItemPayload> {}

// =========================================================
// API SERVICE
// =========================================================

export const timelineApi = {
  // --- Timelines ---
  async getAll(): Promise<Timeline[]> {
    const res = await apiClient.get('/timelines');
    return res.data.data;
  },

  async getById(id: number): Promise<Timeline> {
    const res = await apiClient.get(`/timelines/${id}`);
    return res.data.data;
  },

  async create(payload: CreateTimelinePayload): Promise<Timeline> {
    const res = await apiClient.post('/timelines', payload);
    return res.data.data;
  },

  async update(id: number, payload: UpdateTimelinePayload): Promise<Timeline> {
    const res = await apiClient.put(`/timelines/${id}`, payload);
    return res.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/timelines/${id}`);
  },

  /** Duplicate entire timeline. Returns the new timeline. */
  async duplicate(id: number): Promise<Timeline> {
    const res = await apiClient.post(`/timelines/${id}/duplicate`);
    return res.data.data;
  },

  /** Generate share link (returns public_url and share_token). Auth required. */
  async share(id: number): Promise<{ share_token: string; public_url: string }> {
    const res = await apiClient.post(`/timelines/${id}/share`);
    return res.data.data;
  },

  /** Revoke share link. Auth required. */
  async unshare(id: number): Promise<void> {
    await apiClient.delete(`/timelines/${id}/share`);
  },

  /** Get timeline by public share token. No auth. */
  async getPublicByToken(token: string): Promise<Timeline> {
    const baseURL = import.meta.env.VITE_API_URL || '';
    const res = await fetch(`${baseURL}/timelines/public/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Timeline non trovata o link non valido');
    const json = await res.json();
    return json.data;
  },

  // --- Phases ---
  async createPhase(timelineId: number, payload: CreatePhasePayload): Promise<TimelinePhase> {
    const res = await apiClient.post(`/timelines/${timelineId}/phases`, payload);
    return res.data.data;
  },

  async updatePhase(timelineId: number, phaseId: number, payload: UpdatePhasePayload): Promise<TimelinePhase> {
    const res = await apiClient.put(`/timelines/${timelineId}/phases/${phaseId}`, payload);
    return res.data.data;
  },

  async deletePhase(timelineId: number, phaseId: number): Promise<void> {
    await apiClient.delete(`/timelines/${timelineId}/phases/${phaseId}`);
  },

  /** Duplicate phase in same or another timeline. */
  async duplicatePhase(
    timelineId: number,
    phaseId: number,
    options?: { target_timeline_id?: number },
  ): Promise<TimelinePhase> {
    const res = await apiClient.post(`/timelines/${timelineId}/phases/${phaseId}/duplicate`, options ?? {});
    return res.data.data;
  },

  /** Move phase to another timeline. */
  async movePhase(timelineId: number, phaseId: number, targetTimelineId: number): Promise<TimelinePhase> {
    const res = await apiClient.post(`/timelines/${timelineId}/phases/${phaseId}/move`, {
      target_timeline_id: targetTimelineId,
    });
    return res.data.data;
  },

  // --- Steps ---
  async createStep(timelineId: number, phaseId: number, payload: CreateStepPayload): Promise<TimelineStep> {
    const res = await apiClient.post(`/timelines/${timelineId}/phases/${phaseId}/steps`, payload);
    return res.data.data;
  },

  async updateStep(timelineId: number, phaseId: number, stepId: number, payload: UpdateStepPayload): Promise<TimelineStep> {
    const res = await apiClient.put(`/timelines/${timelineId}/phases/${phaseId}/steps/${stepId}`, payload);
    return res.data.data;
  },

  async deleteStep(timelineId: number, phaseId: number, stepId: number): Promise<void> {
    await apiClient.delete(`/timelines/${timelineId}/phases/${phaseId}/steps/${stepId}`);
  },

  /** Duplicate step in same or another phase. */
  async duplicateStep(
    timelineId: number,
    phaseId: number,
    stepId: number,
    options?: { target_phase_id?: number; target_timeline_id?: number },
  ): Promise<TimelineStep> {
    const res = await apiClient.post(
      `/timelines/${timelineId}/phases/${phaseId}/steps/${stepId}/duplicate`,
      options ?? {},
    );
    return res.data.data;
  },

  /** Move step to another phase (same timeline). */
  async moveStep(
    timelineId: number,
    phaseId: number,
    stepId: number,
    targetPhaseId: number,
  ): Promise<TimelineStep> {
    const res = await apiClient.post(
      `/timelines/${timelineId}/phases/${phaseId}/steps/${stepId}/move`,
      { target_phase_id: targetPhaseId },
    );
    return res.data.data;
  },

  // --- Checklist Items ---
  async createChecklistItem(
    timelineId: number,
    phaseId: number,
    stepId: number,
    payload: CreateChecklistItemPayload,
  ): Promise<TimelineChecklistItem> {
    const res = await apiClient.post(
      `/timelines/${timelineId}/phases/${phaseId}/steps/${stepId}/checklist`,
      payload,
    );
    return res.data.data;
  },

  async updateChecklistItem(
    timelineId: number,
    phaseId: number,
    stepId: number,
    itemId: number,
    payload: UpdateChecklistItemPayload,
  ): Promise<TimelineChecklistItem> {
    const res = await apiClient.put(
      `/timelines/${timelineId}/phases/${phaseId}/steps/${stepId}/checklist/${itemId}`,
      payload,
    );
    return res.data.data;
  },

  async deleteChecklistItem(
    timelineId: number,
    phaseId: number,
    stepId: number,
    itemId: number,
  ): Promise<void> {
    await apiClient.delete(
      `/timelines/${timelineId}/phases/${phaseId}/steps/${stepId}/checklist/${itemId}`,
    );
  },
};

export default timelineApi;
