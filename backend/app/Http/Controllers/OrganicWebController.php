<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Models\OrganicWebProject;
use App\Models\OrganicSkillRun;
use App\Models\OrganicHumanTask;
use App\Models\OrganicBlogPost;
use App\Models\OrganicSeoAudit;
use App\Services\OrganicWeb\OrganicCodeService;
use App\Services\OrganicWeb\OrganicAiService;
use App\Services\OrganicWeb\SkillDefinitionService;
use App\Services\OrganicWeb\SkillEngineService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class OrganicWebController extends Controller
{
    public function __construct(
        private readonly SkillDefinitionService $skillDefinition,
        private readonly SkillEngineService $skillEngine,
        private readonly OrganicCodeService $organicCode
    ) {}

    // ─────────────────────────────────────────────────────
    // PROJECTS
    // ─────────────────────────────────────────────────────

    /**
     * GET /api/organic-web/projects
     */
    public function indexProjects(Request $request): JsonResponse
    {
        $query = OrganicWebProject::with(['crmProject:id,name,client_id', 'crmProject.client:id,company_name'])
            ->withCount(['skillRuns', 'blogPosts', 'humanTasks'])
            ->orderBy('created_at', 'desc');

        if ($request->boolean('active_only', false)) {
            $query->where('is_active', true);
        }

        $projects = $query->paginate($request->integer('per_page', 20));

        return response()->json($projects);
    }

    /**
     * POST /api/organic-web/projects
     */
    public function storeProject(Request $request): JsonResponse
    {
        $data = $request->validate([
            'crm_project_id' => 'required|integer|exists:crm_projects,id',
            'website_url' => 'required|url|max:255',
            'blog_platform' => 'required|in:wordpress,webflow,custom,other',
            'blog_api_url' => 'nullable|url|max:255',
            'blog_api_key_encrypted' => 'nullable|string',
            'blog_api_token_encrypted' => 'nullable|string',
            'gsc_property_id' => 'nullable|string|max:255',
            'target_keywords' => 'nullable|array',
            'tone_of_voice' => 'nullable|string|max:2000',
            'target_audience' => 'nullable|string|max:2000',
            'posting_frequency' => 'nullable|integer|min:1|max:30',
            'active_skills' => 'nullable|array',
            'active_skills.*' => 'string|in:' . implode(',', $this->skillDefinition->getSkillIds()),
            'language' => 'nullable|string|max:10',
            'is_active' => 'nullable|boolean',
        ]);

        if (OrganicWebProject::where('crm_project_id', $data['crm_project_id'])->exists()) {
            return response()->json([
                'message' => 'Esiste già un progetto Organic Web per questo CRM project.',
            ], 422);
        }

        $project = OrganicWebProject::create($data);

        return response()->json([
            'message' => 'Progetto Organic Web creato con successo.',
            'project' => $project->load('crmProject:id,name'),
        ], 201);
    }

    /**
     * GET /api/organic-web/projects/{id}
     */
    public function showProject(int $id): JsonResponse
    {
        $project = OrganicWebProject::with([
            'crmProject:id,name,client_id',
            'crmProject.client:id,company_name',
            'googleIntegration:id,organic_web_project_id,connected_at,gsc_property_url',
        ])->findOrFail($id);

        $skillStatus = $this->skillEngine->getProjectSkillStatus($id);
        $integration = $project->googleIntegration;

        return response()->json([
            'project' => $project,
            'skill_status' => $skillStatus,
            'gsc' => [
                'connected' => $integration !== null && $integration->connected_at !== null,
                'connected_at' => $integration?->connected_at,
                'property_url' => $integration?->gsc_property_url,
            ],
        ]);
    }

    /**
     * PUT /api/organic-web/projects/{id}
     */
    public function updateProject(Request $request, int $id): JsonResponse
    {
        $project = OrganicWebProject::findOrFail($id);

        $data = $request->validate([
            'website_url' => 'sometimes|url|max:255',
            'blog_platform' => 'sometimes|in:wordpress,webflow,custom,other',
            'blog_api_url' => 'nullable|url|max:255',
            'blog_api_key_encrypted' => 'nullable|string',
            'blog_api_token_encrypted' => 'nullable|string',
            'gsc_property_id' => 'nullable|string|max:255',
            'target_keywords' => 'nullable|array',
            'tone_of_voice' => 'nullable|string|max:2000',
            'target_audience' => 'nullable|string|max:2000',
            'posting_frequency' => 'nullable|integer|min:1|max:30',
            'active_skills' => 'nullable|array',
            'active_skills.*' => 'string|in:' . implode(',', $this->skillDefinition->getSkillIds()),
            'language' => 'nullable|string|max:10',
            'is_active' => 'nullable|boolean',
        ]);

        $project->update($data);

        return response()->json([
            'message' => 'Progetto aggiornato con successo.',
            'project' => $project->fresh('crmProject'),
        ]);
    }

    /**
     * DELETE /api/organic-web/projects/{id}
     */
    public function destroyProject(int $id): JsonResponse
    {
        $project = OrganicWebProject::findOrFail($id);
        $project->delete();

        return response()->json(['message' => 'Progetto eliminato con successo.']);
    }

    // ─────────────────────────────────────────────────────
    // SKILL RUNS
    // ─────────────────────────────────────────────────────

    /**
     * GET /api/organic-web/projects/{id}/skill-runs
     */
    public function indexSkillRuns(Request $request, int $id): JsonResponse
    {
        OrganicWebProject::findOrFail($id);

        $query = OrganicSkillRun::where('organic_project_id', $id)
            ->with(['creator:id,name,email'])
            ->withCount('steps')
            ->orderBy('created_at', 'desc');

        if ($request->has('skill_id')) {
            $query->where('skill_id', $request->skill_id);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $runs = $query->paginate($request->integer('per_page', 20));

        return response()->json($runs);
    }

    /**
     * POST /api/organic-web/projects/{id}/skill-runs
     */
    public function startSkillRun(Request $request, int $id): JsonResponse
    {
        OrganicWebProject::findOrFail($id);

        $data = $request->validate([
            'skill_id' => 'required|string|in:' . implode(',', $this->skillDefinition->getSkillIds()),
            'trigger_data' => 'nullable|array',
        ]);

        try {
            $run = $this->skillEngine->startSkillRun(
                $id,
                $data['skill_id'],
                $data['trigger_data'] ?? [],
                Auth::id()
            );

            return response()->json([
                'message' => 'Skill run avviata con successo.',
                'run' => $run->load('steps'),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('[OrganicWeb] Errore avvio skill run', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Errore interno durante l\'avvio della skill run.'], 500);
        }
    }

    /**
     * GET /api/organic-web/skill-runs/{runId}
     */
    public function showSkillRun(int $runId): JsonResponse
    {
        $run = OrganicSkillRun::with([
            'steps.humanTask.assignee:id,name,email',
            'creator:id,name,email',
            'organicProject:id,website_url,crm_project_id',
        ])->findOrFail($runId);

        $skillDef = $this->skillDefinition->getSkillById($run->skill_id);

        return response()->json([
            'run' => $run,
            'skill_definition' => $skillDef,
        ]);
    }

    /**
     * POST /api/organic-web/skill-runs/{runId}/cancel
     */
    public function cancelSkillRun(int $runId): JsonResponse
    {
        $run = OrganicSkillRun::findOrFail($runId);

        if (in_array($run->status, ['completed', 'failed', 'cancelled'])) {
            return response()->json([
                'message' => 'La skill run non può essere cancellata nello stato attuale.',
            ], 422);
        }

        $run->update([
            'status' => 'cancelled',
            'completed_at' => now(),
        ]);

        $run->steps()->whereIn('status', ['pending', 'running', 'waiting'])->update(['status' => 'skipped']);

        $run->humanTasks()->whereIn('status', ['pending', 'in_progress'])->update(['status' => 'skipped']);

        return response()->json(['message' => 'Skill run cancellata.']);
    }

    // ─────────────────────────────────────────────────────
    // HUMAN TASKS
    // ─────────────────────────────────────────────────────

    /**
     * GET /api/organic-web/human-tasks
     * Lista globale task umani in pending (inbox globale).
     */
    public function indexHumanTasks(Request $request): JsonResponse
    {
        $tasks = $this->skillEngine->getPendingHumanTasks();

        return response()->json(['tasks' => $tasks]);
    }

    /**
     * GET /api/organic-web/projects/{id}/human-tasks
     */
    public function indexProjectHumanTasks(Request $request, int $id): JsonResponse
    {
        OrganicWebProject::findOrFail($id);

        $tasks = $this->skillEngine->getPendingHumanTasks($id);

        return response()->json(['tasks' => $tasks]);
    }

    /**
     * POST /api/organic-web/human-tasks/{taskId}/complete
     */
    public function completeHumanTask(Request $request, int $taskId): JsonResponse
    {
        $task = OrganicHumanTask::with('skillStep')->findOrFail($taskId);

        if ($task->status === 'completed') {
            return response()->json(['message' => 'Il task è già stato completato.'], 422);
        }

        $data = $request->validate([
            'output' => 'nullable|array',
            'notes' => 'nullable|string|max:5000',
            'upload_data' => 'nullable|array',
        ]);

        if (!empty($data['upload_data'])) {
            $task->update(['upload_data' => $data['upload_data']]);
        }

        $output = $data['output'] ?? [];

        if (!empty($data['upload_data'])) {
            $output['upload_data'] = $data['upload_data'];
        }

        try {
            $this->skillEngine->completeHumanTask($task, $output, $data['notes'] ?? '');

            return response()->json([
                'message' => 'Task completato. La skill run è stata ripresa.',
                'task' => $task->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[OrganicWeb] Errore completamento human task', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Errore interno durante il completamento del task.'], 500);
        }
    }

    /**
     * POST /api/organic-web/human-tasks/{taskId}/upload
     * Accetta multipart/form-data con campo `file`.
     */
    public function uploadHumanTaskFile(Request $request, int $taskId): JsonResponse
    {
        $task = OrganicHumanTask::findOrFail($taskId);

        $request->validate([
            'file' => 'required|file|max:10240',
        ]);

        $file         = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $ext          = strtolower($file->getClientOriginalExtension());

        $storagePath = $file->store('organic-web/uploads');

        $parsedData = [];
        if ($ext === 'csv') {
            $csvContent = Storage::get($storagePath);
            $lowerName  = strtolower($originalName);

            if (
                str_contains($lowerName, 'gsc')
                || str_contains($lowerName, 'search-console')
                || str_contains($lowerName, 'search_console')
            ) {
                $parsedData = $this->organicCode->parseGscCsv($csvContent);
            } else {
                $parsedData = $this->organicCode->parseKeywordCsv($csvContent);
            }
        }

        $task->update([
            'upload_filename' => $storagePath,
            'upload_data'     => !empty($parsedData) ? $parsedData : null,
            'status'          => 'in_progress',
        ]);

        return response()->json([
            'message'     => 'File caricato con successo.',
            'task'        => $task->fresh(),
            'parsed_rows' => count($parsedData),
        ]);
    }

    // ─────────────────────────────────────────────────────
    // BLOG POSTS
    // ─────────────────────────────────────────────────────

    /**
     * GET /api/organic-web/projects/{id}/blog-posts
     */
    public function indexBlogPosts(Request $request, int $id): JsonResponse
    {
        OrganicWebProject::findOrFail($id);

        $query = OrganicBlogPost::where('organic_project_id', $id)
            ->with(['approvedByUser:id,name', 'skillRun:id,skill_id,status'])
            ->orderBy('created_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $posts = $query->paginate($request->integer('per_page', 20));

        return response()->json($posts);
    }

    // ─────────────────────────────────────────────────────
    // SEO AUDITS
    // ─────────────────────────────────────────────────────

    /**
     * GET /api/organic-web/projects/{id}/seo-audits
     */
    public function indexSeoAudits(Request $request, int $id): JsonResponse
    {
        OrganicWebProject::findOrFail($id);

        $audits = OrganicSeoAudit::where('organic_project_id', $id)
            ->with(['skillRun:id,skill_id,status'])
            ->orderBy('audit_date', 'desc')
            ->paginate($request->integer('per_page', 20));

        return response()->json($audits);
    }

    // ─────────────────────────────────────────────────────
    // SKILL DEFINITIONS (utility endpoint)
    // ─────────────────────────────────────────────────────

    /**
     * GET /api/organic-web/skill-definitions
     */
    public function indexSkillDefinitions(): JsonResponse
    {
        return response()->json([
            'skills' => $this->skillDefinition->getAllSkills(),
        ]);
    }

    // ─────────────────────────────────────────────────────
    // HUMAN TASKS — OVERDUE
    // ─────────────────────────────────────────────────────

    /**
     * GET /api/organic-web/human-tasks/overdue
     * Task scaduti (per badge/alert frontend).
     */
    public function overdueHumanTasks(Request $request): JsonResponse
    {
        $tasks = OrganicHumanTask::with([
            'organicProject:id,website_url,crm_project_id',
            'assignee:id,name,email',
        ])
            ->whereIn('status', ['pending', 'in_progress'])
            ->where('due_at', '<', now())
            ->orderBy('due_at', 'asc')
            ->get();

        return response()->json([
            'count' => $tasks->count(),
            'tasks' => $tasks,
        ]);
    }

    // ─────────────────────────────────────────────────────
    // GLOBAL STATS
    // ─────────────────────────────────────────────────────

    /**
     * GET /api/organic-web/stats
     * Stats globali: progetti attivi, task pending, run in corso.
     */
    public function globalStats(): JsonResponse
    {
        $activeProjects = OrganicWebProject::where('is_active', true)->count();

        $pendingTasks = OrganicHumanTask::whereIn('status', ['pending', 'in_progress'])->count();

        $overdueTasks = OrganicHumanTask::whereIn('status', ['pending', 'in_progress'])
            ->where('due_at', '<', now())
            ->count();

        $runningRuns = OrganicSkillRun::where('status', 'running')->count();

        $waitingRuns = OrganicSkillRun::where('status', 'waiting_human')->count();

        $completedThisMonth = OrganicSkillRun::where('status', 'completed')
            ->where('completed_at', '>=', now()->startOfMonth())
            ->count();

        $failedThisMonth = OrganicSkillRun::where('status', 'failed')
            ->where('failed_at', '>=', now()->startOfMonth())
            ->count();

        $skillBreakdown = OrganicSkillRun::selectRaw('skill_id, status, count(*) as count')
            ->where('created_at', '>=', now()->startOfMonth())
            ->groupBy('skill_id', 'status')
            ->get()
            ->groupBy('skill_id')
            ->map(fn($rows) => $rows->mapWithKeys(fn($r) => [$r->status => $r->count]));

        return response()->json([
            'active_projects'       => $activeProjects,
            'pending_human_tasks'   => $pendingTasks,
            'overdue_human_tasks'   => $overdueTasks,
            'running_skill_runs'    => $runningRuns,
            'waiting_human_runs'    => $waitingRuns,
            'completed_this_month'  => $completedThisMonth,
            'failed_this_month'     => $failedThisMonth,
            'skill_breakdown_month' => $skillBreakdown,
        ]);
    }

    // ─────────────────────────────────────────────────────
    // AVAILABLE CRM PROJECTS
    // ─────────────────────────────────────────────────────

    /**
     * GET /api/organic-web/available-crm-projects
     * Ritorna i progetti CRM non ancora collegati a un progetto Organic Web.
     */
    public function availableCrmProjects(): JsonResponse
    {
        // Recupera tutti i CRM project con nome client — mostra l'intera lista
        // Il filtro "non ancora collegati" è opzionale: passa ?unlinked_only=1 per attivarlo
        $query = CrmProject::select('id', 'name', 'client_id')
            ->with('client:id,company_name')
            ->orderBy('name');

        if (request()->boolean('unlinked_only')) {
            try {
                $usedIds = OrganicWebProject::pluck('crm_project_id')->toArray();
                if (!empty($usedIds)) {
                    $query->whereNotIn('id', $usedIds);
                }
            } catch (\Throwable $e) {
                // tabella non ancora esistente — ignora il filtro
            }
        }

        $projects = $query->get()->map(fn($p) => [
            'id'          => $p->id,
            'name'        => $p->name,
            'client_name' => $p->client?->company_name ?? '',
        ]);

        return response()->json(['projects' => $projects]);
    }

    /**
     * POST /api/organic-web/projects/{id}/ai-suggest
     * Genera suggerimenti AI per un campo del progetto (tone_of_voice, target_audience, target_keywords).
     */
    public function aiSuggest(int $id, Request $request): JsonResponse
    {
        $project = OrganicWebProject::with(['crmProject:id,name,client_id'])->findOrFail($id);

        $field = $request->input('field');
        $allowed = ['tone_of_voice', 'target_audience', 'target_keywords'];

        if (!in_array($field, $allowed)) {
            return response()->json(['error' => 'Campo non supportato.'], 422);
        }

        try {
            $ai = app(OrganicAiService::class);
            $websiteUrl = $project->website_url;
            $projectName = $project->crmProject?->name ?? '';
            $existingKeywords = is_array($project->target_keywords) ? implode(', ', $project->target_keywords) : '';

            $suggestion = match ($field) {
                'tone_of_voice' => $ai->suggestToneOfVoice($websiteUrl, $projectName, $project->language ?? 'it'),
                'target_audience' => $ai->suggestTargetAudience($websiteUrl, $projectName, $existingKeywords),
                'target_keywords' => $ai->suggestKeywords($websiteUrl, $projectName, $project->language ?? 'it'),
                default => null,
            };

            return response()->json(['field' => $field, 'suggestion' => $suggestion]);
        } catch (\Throwable $e) {
            Log::error('OrganicWeb aiSuggest error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Errore nella generazione del suggerimento.'], 500);
        }
    }
}
