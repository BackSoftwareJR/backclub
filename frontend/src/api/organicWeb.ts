import apiClient from './client';

// ==================== Types ====================

export type BlogPlatform = 'wordpress' | 'webflow' | 'custom' | 'other';
export type SkillRunStatus = 'pending' | 'running' | 'waiting_human' | 'completed' | 'failed' | 'cancelled';
export type SkillStepStatus = 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'skipped';
export type SkillStepType = 'ai' | 'human' | 'code' | 'api' | 'condition';
export type HumanTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type HumanTaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type BlogPostStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'failed';

export interface GscConnectionStatus {
    connected: boolean;
    connected_at: string | null;
    property_url: string | null;
}

export interface GscPerformanceDaily {
    id: number;
    organic_web_project_id: number;
    date: string;
    clicks: number;
    impressions: number;
    ctr: number | null;
    position: number | null;
    created_at: string;
    updated_at: string;
}

export interface GscSitemap {
    id: number;
    organic_web_project_id: number;
    path: string;
    last_submitted: string | null;
    last_downloaded: string | null;
    status: string | null;
    downloaded_urls: number;
    indexed_urls?: number;
    errors: string | null;
    created_at: string;
    updated_at: string;
}

export interface GscIndexingError {
    id: number;
    organic_web_project_id: number;
    url: string;
    verdict: string | null;
    coverage_state: string | null;
    last_scanned_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface GscData {
    performance: GscPerformanceDaily[];
    sitemaps: GscSitemap[];
    indexing_errors: GscIndexingError[];
}

export interface GscRefreshResponse {
    success: boolean;
    message: string;
    synced: {
        performance?: number;
        sitemaps?: number;
        indexing_errors?: number;
    };
}

export interface GscProperty {
    url: string;
    permission_level: string;
}

export interface OrganicWebProject {
    id: number;
    crm_project_id: number;
    website_url: string;
    blog_platform: BlogPlatform;
    blog_api_url: string | null;
    blog_api_key_encrypted: string | null;
    blog_api_token_encrypted: string | null;
    gsc_property_id: string | null;
    target_keywords: string[] | null;
    tone_of_voice: string | null;
    target_audience: string | null;
    posting_frequency: number | null;
    active_skills: string[] | null;
    language: string | null;
    is_active: boolean;
    last_audit_at: string | null;
    created_at: string;
    updated_at: string;
    // Counts from withCount
    skill_runs_count?: number;
    blog_posts_count?: number;
    human_tasks_count?: number;
    // Relations
    crmProject?: {
        id: number;
        name: string;
        client_id: number;
        client?: { id: number; name: string };
    };
}

export interface SkillStatus {
    skill_id: string;
    skill_name: string;
    last_run_status: SkillRunStatus | null;
    last_run_at: string | null;
    pending_human_tasks: number;
}

export interface OrganicSkillRun {
    id: number;
    organic_project_id: number;
    skill_id: string;
    status: SkillRunStatus;
    current_step_index: number;
    trigger_type: string | null;
    trigger_data: Record<string, unknown> | null;
    context: Record<string, unknown> | null;
    started_at: string | null;
    completed_at: string | null;
    failed_at: string | null;
    error_message: string | null;
    created_by: number | null;
    created_at: string;
    updated_at: string;
    // Counts
    steps_count?: number;
    // Relations
    creator?: { id: number; name: string; email: string };
    organicProject?: { id: number; website_url: string; crm_project_id: number };
    steps?: OrganicSkillStep[];
}

export interface OrganicSkillStep {
    id: number;
    skill_run_id: number;
    step_index: number;
    step_key: string;
    step_type: SkillStepType;
    status: SkillStepStatus;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    started_at: string | null;
    completed_at: string | null;
    completed_by: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    humanTask?: OrganicHumanTask;
}

export interface OrganicHumanTask {
    id: number;
    skill_step_id: number;
    organic_project_id: number;
    assignee_id: number | null;
    title: string;
    description: string | null;
    instructions: string | null;
    upload_instructions: string | null;
    upload_data: Record<string, unknown> | null;
    upload_filename: string | null;
    status: HumanTaskStatus;
    priority: HumanTaskPriority;
    due_at: string | null;
    reminded_at: string | null;
    completed_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // Relations
    skillStep?: OrganicSkillStep & {
        skillRun?: OrganicSkillRun & {
            organicProject?: OrganicWebProject;
        };
    };
    organicProject?: OrganicWebProject;
    assignee?: { id: number; name: string; email: string };
}

export interface OrganicBlogPost {
    id: number;
    organic_project_id: number;
    skill_run_id: number | null;
    title: string;
    slug: string | null;
    content: string | null;
    excerpt: string | null;
    focus_keyword: string | null;
    target_keywords: string[] | null;
    status: BlogPostStatus;
    seo_score: number | null;
    scheduled_at: string | null;
    published_at: string | null;
    external_post_id: string | null;
    approved_by: number | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
    approvedByUser?: { id: number; name: string };
    skillRun?: { id: number; skill_id: string; status: SkillRunStatus };
}

export interface OrganicSeoAudit {
    id: number;
    organic_project_id: number;
    skill_run_id: number | null;
    audit_date: string;
    overall_score: number | null;
    critical_issues: number;
    warning_issues: number;
    info_issues: number;
    issues: AuditIssue[] | null;
    raw_data: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    skillRun?: { id: number; skill_id: string; status: SkillRunStatus };
}

export interface AuditIssue {
    severity: 'critical' | 'warning' | 'info';
    code: string;
    message: string;
    url?: string;
}

export interface SkillDefinition {
    id: string;
    name: string;
    description: string;
    trigger_type: 'manual' | 'scheduled' | 'event';
    steps: SkillStepDefinition[];
}

export interface SkillStepDefinition {
    key: string;
    name: string;
    type: SkillStepType;
    description?: string;
}

export interface OrganicStats {
    active_projects: number;
    pending_human_tasks: number;
    overdue_human_tasks: number;
    running_skill_runs: number;
    waiting_human_runs: number;
    completed_this_month: number;
    failed_this_month: number;
    skill_breakdown_month: Record<string, Record<string, number>>;
}

export interface CrmProjectOption {
    id: number;
    name: string;
    client_name: string;
}

// ── Page Queries (Keyword per pagina) ──

export interface PageQuery {
    id: number;
    organic_web_project_id: number;
    date: string;
    page_url: string;
    query: string;
    clicks: number;
    impressions: number;
    ctr: number | null;
    position: number | null;
}

export interface SeoAdvisorResult {
    health_score: number;
    main_problem: string;
    actionable_advice: string[];
}

// ── Sitemap Tab Types ──

export interface SitemapAlert {
    id: number;
    type: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
}

export interface CoverageSummary {
    total_urls_sitemap: number;
    indexed: number;
    errors: number;
    missing_from_sitemap: number;
    urls_tracked?: number;
}

export interface HealthTrendPoint {
    score: number;
    recorded_at: string;
}

export interface SitemapOverview {
    health_score: number;
    health_breakdown: Record<string, number>;
    health_trend: HealthTrendPoint[];
    alerts: SitemapAlert[];
    coverage: CoverageSummary;
}

export interface GscUrlDetail {
    url: string;
    indexing_status: string | null;
    last_crawled: string | null;
    canonical_url: string | null;
    mobile_usability: string | null;
    coverage_state: string | null;
    blocked_by_robots: boolean;
    errors: string[];
}

export interface RobotsTxtData {
    content: string | null;
    url: string | null;
    fetched_at: string;
    error?: string;
}

// ── Enterprise AI Audit (Step 10) ──

export interface AiAudit {
    id: number;
    organic_web_project_id: number;
    analysis_type: string;
    model_used: string | null;
    generated_markdown: string | null;
    action_plan: string[] | null;
    created_at: string;
}

// ==================== Create/Update Data Types ====================

export interface CreateProjectData {
    crm_project_id: number;
    website_url: string;
    blog_platform: BlogPlatform;
    blog_api_url?: string;
    blog_api_key_encrypted?: string;
    blog_api_token_encrypted?: string;
    gsc_property_id?: string;
    target_keywords?: string[];
    tone_of_voice?: string;
    target_audience?: string;
    posting_frequency?: number;
    active_skills?: string[];
    language?: string;
    is_active?: boolean;
}

// ==================== Pagination Wrapper ====================

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

// ==================== API Client ====================

export const organicWebApi = {
    // ── Projects ──

    getProjects: async (activeOnly = false): Promise<PaginatedResponse<OrganicWebProject>> => {
        const response = await apiClient.get<PaginatedResponse<OrganicWebProject>>('/organic-web/projects', {
            params: activeOnly ? { active_only: 1 } : {},
        });
        return response.data;
    },

    getProject: async (id: number): Promise<{ project: OrganicWebProject; skill_status: SkillStatus[]; gsc: GscConnectionStatus }> => {
        const response = await apiClient.get<{ project: OrganicWebProject; skill_status: SkillStatus[]; gsc: GscConnectionStatus }>(
            `/organic-web/projects/${id}`
        );
        return response.data;
    },

    createProject: async (data: CreateProjectData): Promise<{ message: string; project: OrganicWebProject }> => {
        const response = await apiClient.post<{ message: string; project: OrganicWebProject }>(
            '/organic-web/projects',
            data
        );
        return response.data;
    },

    updateProject: async (
        id: number,
        data: Partial<CreateProjectData>
    ): Promise<{ message: string; project: OrganicWebProject }> => {
        const response = await apiClient.put<{ message: string; project: OrganicWebProject }>(
            `/organic-web/projects/${id}`,
            data
        );
        return response.data;
    },

    deleteProject: async (id: number): Promise<{ message: string }> => {
        const response = await apiClient.delete<{ message: string }>(`/organic-web/projects/${id}`);
        return response.data;
    },

    // ── Skill Runs ──

    getSkillRuns: async (
        projectId: number,
        filters?: { skill_id?: string; status?: SkillRunStatus }
    ): Promise<PaginatedResponse<OrganicSkillRun>> => {
        const response = await apiClient.get<PaginatedResponse<OrganicSkillRun>>(
            `/organic-web/projects/${projectId}/skill-runs`,
            { params: filters }
        );
        return response.data;
    },

    startSkillRun: async (
        projectId: number,
        skillId: string,
        triggerData?: Record<string, unknown>
    ): Promise<{ message: string; run: OrganicSkillRun }> => {
        const response = await apiClient.post<{ message: string; run: OrganicSkillRun }>(
            `/organic-web/projects/${projectId}/skill-runs`,
            { skill_id: skillId, trigger_data: triggerData ?? {} }
        );
        return response.data;
    },

    getSkillRun: async (
        runId: number
    ): Promise<{ run: OrganicSkillRun; skill_definition: SkillDefinition | null }> => {
        const response = await apiClient.get<{ run: OrganicSkillRun; skill_definition: SkillDefinition | null }>(
            `/organic-web/skill-runs/${runId}`
        );
        return response.data;
    },

    cancelSkillRun: async (runId: number): Promise<{ message: string }> => {
        const response = await apiClient.post<{ message: string }>(
            `/organic-web/skill-runs/${runId}/cancel`
        );
        return response.data;
    },

    // ── Human Tasks ──

    getAllHumanTasks: async (): Promise<{ tasks: OrganicHumanTask[] }> => {
        const response = await apiClient.get<{ tasks: OrganicHumanTask[] }>('/organic-web/human-tasks');
        return response.data;
    },

    getProjectHumanTasks: async (projectId: number): Promise<{ tasks: OrganicHumanTask[] }> => {
        const response = await apiClient.get<{ tasks: OrganicHumanTask[] }>(
            `/organic-web/projects/${projectId}/human-tasks`
        );
        return response.data;
    },

    completeHumanTask: async (
        taskId: number,
        data: { output?: Record<string, unknown>; notes?: string; upload_data?: Record<string, unknown> }
    ): Promise<{ message: string; task: OrganicHumanTask }> => {
        const response = await apiClient.post<{ message: string; task: OrganicHumanTask }>(
            `/organic-web/human-tasks/${taskId}/complete`,
            data
        );
        return response.data;
    },

    uploadHumanTaskFile: async (
        taskId: number,
        file: File
    ): Promise<{ message: string; task: OrganicHumanTask; parsed_rows: number }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post<{ message: string; task: OrganicHumanTask; parsed_rows: number }>(
            `/organic-web/human-tasks/${taskId}/upload`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    // ── Blog Posts ──

    getBlogPosts: async (
        projectId: number,
        status?: BlogPostStatus
    ): Promise<PaginatedResponse<OrganicBlogPost>> => {
        const response = await apiClient.get<PaginatedResponse<OrganicBlogPost>>(
            `/organic-web/projects/${projectId}/blog-posts`,
            { params: status ? { status } : {} }
        );
        return response.data;
    },

    // ── SEO Audits ──

    getSeoAudits: async (projectId: number): Promise<PaginatedResponse<OrganicSeoAudit>> => {
        const response = await apiClient.get<PaginatedResponse<OrganicSeoAudit>>(
            `/organic-web/projects/${projectId}/seo-audits`
        );
        return response.data;
    },

    // ── Skill Definitions ──

    getSkillDefinitions: async (): Promise<{ skills: SkillDefinition[] }> => {
        const response = await apiClient.get<{ skills: SkillDefinition[] }>('/organic-web/skill-definitions');
        return response.data;
    },

    // ── Global Stats ──

    getStats: async (): Promise<OrganicStats> => {
        const response = await apiClient.get<OrganicStats>('/organic-web/stats');
        return response.data;
    },

    getOverdueTasks: async (): Promise<{ count: number; tasks: OrganicHumanTask[] }> => {
        const response = await apiClient.get<{ count: number; tasks: OrganicHumanTask[] }>(
            '/organic-web/human-tasks/overdue'
        );
        return response.data;
    },

    // ── Available CRM Projects ──

    getAvailableCrmProjects: async (): Promise<{ projects: CrmProjectOption[] }> => {
        const response = await apiClient.get<{ projects: CrmProjectOption[] }>(
            '/organic-web/available-crm-projects'
        );
        return response.data;
    },

    // ── AI Suggest ──

    aiSuggest: async (
        projectId: number,
        field: 'tone_of_voice' | 'target_audience' | 'target_keywords'
    ): Promise<{ field: string; suggestion: string | string[] }> => {
        const response = await apiClient.post<{ field: string; suggestion: string | string[] }>(
            `/organic-web/projects/${projectId}/ai-suggest`,
            { field }
        );
        return response.data;
    },

    // ── Google OAuth (per-progetto) ──

    getGoogleAuthUrl: async (projectId: number): Promise<string> => {
        const response = await apiClient.get<{ success: boolean; url: string }>('/oauth/google/redirect', {
            params: { project_id: projectId },
        });
        return response.data.url;
    },

    checkGoogleConnection: async (projectId: number): Promise<{ connected: boolean; connected_at: string | null }> => {
        const response = await apiClient.get<{ connected: boolean; connected_at: string | null }>('/oauth/google/status', {
            params: { project_id: projectId },
        });
        return response.data;
    },

    disconnectGoogle: async (projectId: number): Promise<void> => {
        await apiClient.delete('/oauth/google/disconnect-project', {
            params: { project_id: projectId },
        });
    },

    // ── Google Search Console Data ──

    getGscData: async (projectId: number): Promise<GscData> => {
        const response = await apiClient.get<GscData>(`/organic-web/projects/${projectId}/gsc-data`);
        return response.data;
    },

    refreshGscData: async (projectId: number): Promise<GscRefreshResponse> => {
        const response = await apiClient.post<GscRefreshResponse>(
            `/organic-web/projects/${projectId}/gsc-refresh`
        );
        return response.data;
    },

    getGscProperties: async (projectId: number): Promise<{ success: boolean; properties: GscProperty[] }> => {
        const response = await apiClient.get<{ success: boolean; properties: GscProperty[] }>(
            `/organic-web/projects/${projectId}/gsc-properties`
        );
        return response.data;
    },

    selectGscProperty: async (projectId: number, propertyUrl: string): Promise<{ success: boolean; message: string; property_url: string }> => {
        const response = await apiClient.post<{ success: boolean; message: string; property_url: string }>(
            `/organic-web/projects/${projectId}/gsc-property`,
            { property_url: propertyUrl }
        );
        return response.data;
    },

    // ── Sitemap Tab ──

    getSitemapOverview: async (projectId: number): Promise<SitemapOverview> => {
        const response = await apiClient.get<SitemapOverview>(
            `/organic-web/projects/${projectId}/sitemap/overview`
        );
        return response.data;
    },

    getSitemapList: async (projectId: number): Promise<{ sitemaps: GscSitemap[] }> => {
        const response = await apiClient.get<{ sitemaps: GscSitemap[] }>(
            `/organic-web/projects/${projectId}/sitemap/list`
        );
        return response.data;
    },

    submitSitemap: async (projectId: number, sitemapUrl: string): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.post<{ success: boolean; message: string }>(
            `/organic-web/projects/${projectId}/sitemap/submit`,
            { sitemap_url: sitemapUrl }
        );
        return response.data;
    },

    deleteSitemap: async (projectId: number, sitemapId: number): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(
            `/organic-web/projects/${projectId}/sitemap/${sitemapId}`
        );
        return response.data;
    },

    getSitemapUrls: async (
        projectId: number,
        params: { page?: number; status?: string; per_page?: number }
    ): Promise<PaginatedResponse<GscUrlDetail>> => {
        const response = await apiClient.get<PaginatedResponse<GscUrlDetail>>(
            `/organic-web/projects/${projectId}/sitemap/urls`,
            { params }
        );
        return response.data;
    },

    inspectUrl: async (projectId: number, url: string): Promise<GscUrlDetail> => {
        const response = await apiClient.post<GscUrlDetail>(
            `/organic-web/projects/${projectId}/sitemap/inspect-url`,
            { url }
        );
        return response.data;
    },

    requestIndexing: async (projectId: number, urls: string[]): Promise<{ success: boolean; queued: number }> => {
        const response = await apiClient.post<{ success: boolean; queued: number }>(
            `/organic-web/projects/${projectId}/sitemap/request-indexing`,
            { urls }
        );
        return response.data;
    },

    getCoverageReport: async (projectId: number): Promise<CoverageSummary> => {
        const response = await apiClient.get<CoverageSummary>(
            `/organic-web/projects/${projectId}/sitemap/coverage`
        );
        return response.data;
    },

    syncSitemapUrls: async (projectId: number): Promise<{ success: boolean; message: string; synced: { synced_urls: number; sitemaps_processed: number }; coverage: CoverageSummary }> => {
        const response = await apiClient.post<{ success: boolean; message: string; synced: { synced_urls: number; sitemaps_processed: number }; coverage: CoverageSummary }>(
            `/organic-web/projects/${projectId}/sitemap/sync-urls`
        );
        return response.data;
    },

    getSitemapAlerts: async (projectId: number): Promise<{ alerts: SitemapAlert[] }> => {
        const response = await apiClient.get<{ alerts: SitemapAlert[] }>(
            `/organic-web/projects/${projectId}/sitemap/alerts`
        );
        return response.data;
    },

    getRobotsTxt: async (projectId: number): Promise<RobotsTxtData> => {
        const response = await apiClient.get<RobotsTxtData>(
            `/organic-web/projects/${projectId}/robots-txt`
        );
        return response.data;
    },

    // ── Page Queries (Keyword per pagina) ──

    getPageQueries: async (
        projectId: number,
        params?: { page_url?: string; per_page?: number; page?: number }
    ): Promise<PaginatedResponse<PageQuery>> => {
        const response = await apiClient.get<PaginatedResponse<PageQuery>>(
            `/organic-web/projects/${projectId}/page-queries`,
            { params }
        );
        return response.data;
    },

    syncPageQueries: async (projectId: number): Promise<{ success: boolean; message: string; synced: number }> => {
        const response = await apiClient.post<{ success: boolean; message: string; synced: number }>(
            `/organic-web/projects/${projectId}/page-queries/sync`
        );
        return response.data;
    },

    // ── SEO Advisor (Groq AI) ──

    analyzeUrl: async (projectId: number, url: string): Promise<SeoAdvisorResult> => {
        const response = await apiClient.post<SeoAdvisorResult>(
            `/organic-web/projects/${projectId}/advisor/analyze-url`,
            { url }
        );
        return response.data;
    },

    // ── Ping Sitemap ──

    pingSitemap: async (projectId: number, sitemapUrl: string): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.post<{ success: boolean; message: string }>(
            `/organic-web/projects/${projectId}/sitemap/ping`,
            { sitemap_url: sitemapUrl }
        );
        return response.data;
    },

    // ── Enterprise AI (Step 10) ──

    generateAudit: async (projectId: number): Promise<{ success: boolean; audit: AiAudit }> => {
        const response = await apiClient.post<{ success: boolean; audit: AiAudit }>(
            `/organic-web/projects/${projectId}/ai/generate-audit`
        );
        return response.data;
    },

    chatWithAudit: async (
        projectId: number,
        auditId: number,
        message: string,
        history: { role: string; content: string }[]
    ): Promise<{ success: boolean; reply: string }> => {
        const response = await apiClient.post<{ success: boolean; reply: string }>(
            `/organic-web/projects/${projectId}/ai/chat`,
            { audit_id: auditId, message, history }
        );
        return response.data;
    },

    getLatestAudit: async (projectId: number): Promise<{ audit: AiAudit | null }> => {
        const response = await apiClient.get<{ audit: AiAudit | null }>(
            `/organic-web/projects/${projectId}/ai/latest-audit`
        );
        return response.data;
    },
};

export default organicWebApi;
