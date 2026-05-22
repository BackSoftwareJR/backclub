<?php

namespace App\Http\Controllers;

use App\Models\Timeline;
use App\Models\TimelinePhase;
use App\Models\TimelineStep;
use App\Models\TimelineChecklistItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class TimelineController extends Controller
{
    // =========================================================
    // PRIVATE HELPERS
    // =========================================================

    /**
     * Returns true if the authenticated user is an admin or manager.
     * Admins can see and manage ALL timelines regardless of owner.
     */
    private function isAdmin(): bool
    {
        $role = Auth::user()->role ?? '';
        return in_array($role, ['admin', 'manager'], true);
    }

    /**
     * Resolve a Timeline by ID.
     * Admins can access any timeline; others can only access their own.
     */
    private function resolveTimeline(int $id): Timeline
    {
        $query = Timeline::with(['phases.steps.checklistItems']);

        if (!$this->isAdmin()) {
            $query->where('user_id', Auth::id());
        }

        return $query->findOrFail($id);
    }

    // =========================================================
    // TIMELINES
    // =========================================================

    /**
     * GET /api/timelines
     * Admins see all timelines; others see only their own.
     */
    public function index(): JsonResponse
    {
        $query = Timeline::with(['phases.steps.checklistItems'])
            ->orderBy('created_at', 'desc');

        if (!$this->isAdmin()) {
            $query->where('user_id', Auth::id());
        }

        $timelines = $query->get()->map(function ($timeline) {
            $timeline->total_steps     = $timeline->total_steps;
            $timeline->completed_steps = $timeline->completed_steps;
            return $timeline;
        });

        return response()->json(['success' => true, 'data' => $timelines]);
    }

    /**
     * POST /api/timelines
     * Always creates the timeline under the authenticated user.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'color'       => 'nullable|string|max:7',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $timeline = Timeline::create([
            'user_id'     => Auth::id(),
            'name'        => $request->name,
            'description' => $request->description,
            'color'       => $request->color ?? '#6366f1',
        ]);

        $timeline->load('phases.steps.checklistItems');

        return response()->json(['success' => true, 'data' => $timeline, 'message' => 'Timeline creata'], 201);
    }

    /**
     * GET /api/timelines/{id}
     */
    public function show(int $id): JsonResponse
    {
        $timeline = $this->resolveTimeline($id);

        $timeline->total_steps     = $timeline->total_steps;
        $timeline->completed_steps = $timeline->completed_steps;

        return response()->json(['success' => true, 'data' => $timeline]);
    }

    /**
     * PUT /api/timelines/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $timeline = $this->resolveTimeline($id);

        $validator = Validator::make($request->all(), [
            'name'        => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'color'       => 'nullable|string|max:7',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $timeline->update($request->only(['name', 'description', 'color']));
        $timeline->load('phases.steps.checklistItems');

        return response()->json(['success' => true, 'data' => $timeline, 'message' => 'Timeline aggiornata']);
    }

    /**
     * DELETE /api/timelines/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $timeline = $this->resolveTimeline($id);
        $timeline->delete();

        return response()->json(['success' => true, 'message' => 'Timeline eliminata']);
    }

    /**
     * POST /api/timelines/{id}/duplicate
     * Duplicate entire timeline (name + " (Copia)"), all phases, steps, checklist. No share_token.
     */
    public function duplicate(int $id): JsonResponse
    {
        $source = $this->resolveTimeline($id);

        $newTimeline = Timeline::create([
            'user_id'     => Auth::id(),
            'name'        => $source->name . ' (Copia)',
            'description' => $source->description,
            'color'       => $source->color,
        ]);

        foreach ($source->phases as $phase) {
            $newPhase = TimelinePhase::create([
                'timeline_id' => $newTimeline->id,
                'title'       => $phase->title,
                'description' => $phase->description,
                'start_date'  => $phase->start_date,
                'end_date'    => $phase->end_date,
                'color'       => $phase->color,
                'sort_order'  => $phase->sort_order,
            ]);

            foreach ($phase->steps as $step) {
                $newStep = TimelineStep::create([
                    'phase_id'     => $newPhase->id,
                    'title'        => $step->title,
                    'description'  => $step->description,
                    'date_order'   => $step->date_order,
                    'is_completed' => false,
                    'sort_order'   => $step->sort_order,
                ]);

                foreach ($step->checklistItems as $item) {
                    TimelineChecklistItem::create([
                        'step_id'      => $newStep->id,
                        'text'         => $item->text,
                        'is_completed' => false,
                        'sort_order'   => $item->sort_order,
                    ]);
                }
            }
        }

        $newTimeline->load(['phases.steps.checklistItems']);
        $newTimeline->total_steps     = $newTimeline->total_steps;
        $newTimeline->completed_steps = $newTimeline->completed_steps;

        return response()->json(['success' => true, 'data' => $newTimeline, 'message' => 'Timeline duplicata'], 201);
    }

    /**
     * POST /api/timelines/{id}/share
     * Generate a public share token and return the public URL.
     */
    public function share(int $id): JsonResponse
    {
        $timeline = $this->resolveTimeline($id);

        $timeline->update([
            'share_token' => Str::random(48),
        ]);

        $baseUrl = rtrim(config('app.front_url', request()->getSchemeAndHttpHost()), '/');
        $publicPath = "/timeline/public/{$timeline->share_token}";
        $url = str_contains($baseUrl, '://') ? $baseUrl . $publicPath : request()->getSchemeAndHttpHost() . $publicPath;

        return response()->json([
            'success' => true,
            'data'    => [
                'share_token' => $timeline->share_token,
                'public_url'  => $url,
            ],
            'message' => 'Link condivisione creato',
        ]);
    }

    /**
     * DELETE /api/timelines/{id}/share
     * Revoke the public share link.
     */
    public function unshare(int $id): JsonResponse
    {
        $timeline = $this->resolveTimeline($id);

        $timeline->update(['share_token' => null]);

        return response()->json(['success' => true, 'message' => 'Link condivisione revocato']);
    }

    /**
     * GET /api/timelines/public/{token}
     * Public access: returns timeline (with phases, steps, checklist) by share token. No auth.
     */
    public function showPublic(string $token): JsonResponse
    {
        $timeline = Timeline::with(['phases.steps.checklistItems'])
            ->where('share_token', $token)
            ->firstOrFail();

        $timeline->total_steps     = $timeline->total_steps;
        $timeline->completed_steps = $timeline->completed_steps;

        return response()->json(['success' => true, 'data' => $timeline]);
    }

    // =========================================================
    // PHASES
    // =========================================================

    /**
     * POST /api/timelines/{timelineId}/phases
     */
    public function storePhase(Request $request, int $timelineId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);

        $validator = Validator::make($request->all(), [
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'color'       => 'nullable|string|max:7',
            'sort_order'  => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $maxOrder = $timeline->phases()->max('sort_order') ?? -1;

        $phase = TimelinePhase::create([
            'timeline_id' => $timeline->id,
            'title'       => $request->title,
            'description' => $request->description,
            'start_date'  => $request->start_date,
            'end_date'    => $request->end_date,
            'color'       => $request->color ?? '#8b5cf6',
            'sort_order'  => $request->sort_order ?? ($maxOrder + 1),
        ]);

        $phase->load('steps.checklistItems');

        return response()->json(['success' => true, 'data' => $phase, 'message' => 'Fase creata'], 201);
    }

    /**
     * PUT /api/timelines/{timelineId}/phases/{phaseId}
     */
    public function updatePhase(Request $request, int $timelineId, int $phaseId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);

        $validator = Validator::make($request->all(), [
            'title'       => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'start_date'  => 'sometimes|required|date',
            'end_date'    => 'sometimes|required|date',
            'color'       => 'nullable|string|max:7',
            'sort_order'  => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $phase->update($request->only(['title', 'description', 'start_date', 'end_date', 'color', 'sort_order']));
        $phase->load('steps.checklistItems');

        return response()->json(['success' => true, 'data' => $phase, 'message' => 'Fase aggiornata']);
    }

    /**
     * DELETE /api/timelines/{timelineId}/phases/{phaseId}
     */
    public function destroyPhase(int $timelineId, int $phaseId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);
        $phase->delete();

        return response()->json(['success' => true, 'message' => 'Fase eliminata']);
    }

    /**
     * POST /api/timelines/{timelineId}/phases/{phaseId}/duplicate
     * Body: target_timeline_id (optional, default same timeline).
     */
    public function duplicatePhase(Request $request, int $timelineId, int $phaseId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);

        $phase->load('steps.checklistItems');

        $targetTimelineId = $request->input('target_timeline_id', $timeline->id);
        $targetTimeline   = $this->resolveTimeline($targetTimelineId);

        $maxOrder = $targetTimeline->phases()->max('sort_order') ?? -1;
        $newPhase = TimelinePhase::create([
            'timeline_id' => $targetTimeline->id,
            'title'       => $phase->title . ' (Copia)',
            'description' => $phase->description,
            'start_date'  => $phase->start_date,
            'end_date'    => $phase->end_date,
            'color'       => $phase->color,
            'sort_order'  => $maxOrder + 1,
        ]);

        foreach ($phase->steps as $step) {
            $newStep = TimelineStep::create([
                'phase_id'     => $newPhase->id,
                'title'        => $step->title,
                'description'  => $step->description,
                'date_order'   => $step->date_order,
                'is_completed' => false,
                'sort_order'   => $step->sort_order,
            ]);

            foreach ($step->checklistItems as $item) {
                TimelineChecklistItem::create([
                    'step_id'      => $newStep->id,
                    'text'         => $item->text,
                    'is_completed' => false,
                    'sort_order'   => $item->sort_order,
                ]);
            }
        }

        $newPhase->load('steps.checklistItems');

        return response()->json(['success' => true, 'data' => $newPhase, 'message' => 'Fase duplicata'], 201);
    }

    /**
     * POST /api/timelines/{timelineId}/phases/{phaseId}/move
     * Body: target_timeline_id (required).
     */
    public function movePhase(Request $request, int $timelineId, int $phaseId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);

        $targetTimelineId = $request->input('target_timeline_id');
        if (empty($targetTimelineId)) {
            return response()->json(['success' => false, 'error' => 'target_timeline_id richiesto'], 422);
        }

        $targetTimeline = $this->resolveTimeline((int) $targetTimelineId);
        $maxOrder       = $targetTimeline->phases()->max('sort_order') ?? -1;

        $phase->update([
            'timeline_id' => $targetTimeline->id,
            'sort_order'  => $maxOrder + 1,
        ]);
        $phase->load('steps.checklistItems');

        return response()->json(['success' => true, 'data' => $phase, 'message' => 'Fase spostata']);
    }

    // =========================================================
    // STEPS
    // =========================================================

    /**
     * POST /api/timelines/{timelineId}/phases/{phaseId}/steps
     */
    public function storeStep(Request $request, int $timelineId, int $phaseId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);

        $validator = Validator::make($request->all(), [
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'date_order'   => 'nullable|date',
            'is_completed' => 'nullable|boolean',
            'sort_order'   => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $maxOrder = $phase->steps()->max('sort_order') ?? -1;

        $step = TimelineStep::create([
            'phase_id'     => $phase->id,
            'title'        => $request->title,
            'description'  => $request->description,
            'date_order'   => $request->date_order,
            'is_completed' => $request->boolean('is_completed', false),
            'sort_order'   => $request->sort_order ?? ($maxOrder + 1),
        ]);

        $step->load('checklistItems');

        return response()->json(['success' => true, 'data' => $step, 'message' => 'Step creato'], 201);
    }

    /**
     * PUT /api/timelines/{timelineId}/phases/{phaseId}/steps/{stepId}
     */
    public function updateStep(Request $request, int $timelineId, int $phaseId, int $stepId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);
        $step     = TimelineStep::where('phase_id', $phase->id)->findOrFail($stepId);

        $validator = Validator::make($request->all(), [
            'title'        => 'sometimes|required|string|max:255',
            'description'  => 'nullable|string',
            'date_order'   => 'nullable|date',
            'is_completed' => 'nullable|boolean',
            'sort_order'   => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only(['title', 'description', 'date_order', 'is_completed', 'sort_order']);
        if ($request->has('is_completed')) {
            $data['completed_at'] = $request->boolean('is_completed') ? now() : null;
        }
        $step->update($data);
        $step->load('checklistItems');

        return response()->json(['success' => true, 'data' => $step, 'message' => 'Step aggiornato']);
    }

    /**
     * DELETE /api/timelines/{timelineId}/phases/{phaseId}/steps/{stepId}
     */
    public function destroyStep(int $timelineId, int $phaseId, int $stepId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);
        $step     = TimelineStep::where('phase_id', $phase->id)->findOrFail($stepId);
        $step->delete();

        return response()->json(['success' => true, 'message' => 'Step eliminato']);
    }

    /**
     * POST /api/timelines/{timelineId}/phases/{phaseId}/steps/{stepId}/duplicate
     * Body: target_phase_id (optional, default same phase). If target in another timeline, use target_timeline_id + target_phase_id.
     */
    public function duplicateStep(Request $request, int $timelineId, int $phaseId, int $stepId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);
        $step     = TimelineStep::where('phase_id', $phase->id)->with('checklistItems')->findOrFail($stepId);

        $targetPhaseId = $request->input('target_phase_id', $phase->id);
        $targetPhase   = TimelinePhase::where('timeline_id', $timeline->id)->find($targetPhaseId);

        if (!$targetPhase && $request->has('target_timeline_id')) {
            $targetTimeline = $this->resolveTimeline((int) $request->input('target_timeline_id'));
            $targetPhase    = TimelinePhase::where('timeline_id', $targetTimeline->id)->findOrFail($targetPhaseId);
        } elseif (!$targetPhase) {
            $targetPhase = $phase;
        }

        $maxOrder = $targetPhase->steps()->max('sort_order') ?? -1;
        $dateOrder = $step->date_order;
        if ($dateOrder) {
            $start = \Carbon\Carbon::parse($targetPhase->start_date);
            $end   = \Carbon\Carbon::parse($targetPhase->end_date);
            $d     = \Carbon\Carbon::parse($dateOrder);
            if ($d->lt($start)) {
                $dateOrder = $targetPhase->start_date;
            } elseif ($d->gt($end)) {
                $dateOrder = $targetPhase->end_date;
            }
        }

        $newStep = TimelineStep::create([
            'phase_id'     => $targetPhase->id,
            'title'        => $step->title . ' (Copia)',
            'description'  => $step->description,
            'date_order'   => $dateOrder,
            'is_completed' => false,
            'sort_order'   => $maxOrder + 1,
        ]);

        foreach ($step->checklistItems as $item) {
            TimelineChecklistItem::create([
                'step_id'      => $newStep->id,
                'text'         => $item->text,
                'is_completed' => false,
                'sort_order'   => $item->sort_order,
            ]);
        }

        $newStep->load('checklistItems');

        return response()->json(['success' => true, 'data' => $newStep, 'message' => 'Step duplicato'], 201);
    }

    /**
     * POST /api/timelines/{timelineId}/phases/{phaseId}/steps/{stepId}/move
     * Body: target_phase_id (required). Target phase must be in same timeline.
     */
    public function moveStep(Request $request, int $timelineId, int $phaseId, int $stepId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);
        $step     = TimelineStep::where('phase_id', $phase->id)->findOrFail($stepId);

        $targetPhaseId = $request->input('target_phase_id');
        if (empty($targetPhaseId)) {
            return response()->json(['success' => false, 'error' => 'target_phase_id richiesto'], 422);
        }

        $targetPhase = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($targetPhaseId);
        $maxOrder    = $targetPhase->steps()->max('sort_order') ?? -1;

        $dateOrder = $step->date_order;
        if ($dateOrder) {
            $start = \Carbon\Carbon::parse($targetPhase->start_date);
            $end   = \Carbon\Carbon::parse($targetPhase->end_date);
            $d     = \Carbon\Carbon::parse($dateOrder);
            if ($d->lt($start) || $d->gt($end)) {
                $dateOrder = $targetPhase->start_date;
            }
        }

        $step->update([
            'phase_id'   => $targetPhase->id,
            'date_order' => $dateOrder,
            'sort_order' => $maxOrder + 1,
        ]);
        $step->load('checklistItems');

        return response()->json(['success' => true, 'data' => $step, 'message' => 'Step spostato']);
    }

    // =========================================================
    // CHECKLIST ITEMS
    // =========================================================

    /**
     * POST /api/timelines/{timelineId}/phases/{phaseId}/steps/{stepId}/checklist
     */
    public function storeChecklistItem(Request $request, int $timelineId, int $phaseId, int $stepId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);
        $step     = TimelineStep::where('phase_id', $phase->id)->findOrFail($stepId);

        $validator = Validator::make($request->all(), [
            'text'         => 'required|string|max:500',
            'is_completed' => 'nullable|boolean',
            'sort_order'   => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $maxOrder = $step->checklistItems()->max('sort_order') ?? -1;

        $item = TimelineChecklistItem::create([
            'step_id'      => $step->id,
            'text'         => $request->text,
            'is_completed' => $request->boolean('is_completed', false),
            'sort_order'   => $request->sort_order ?? ($maxOrder + 1),
        ]);

        return response()->json(['success' => true, 'data' => $item, 'message' => 'Item checklist creato'], 201);
    }

    /**
     * PUT /api/timelines/{timelineId}/phases/{phaseId}/steps/{stepId}/checklist/{itemId}
     */
    public function updateChecklistItem(Request $request, int $timelineId, int $phaseId, int $stepId, int $itemId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);
        $step     = TimelineStep::where('phase_id', $phase->id)->findOrFail($stepId);
        $item     = TimelineChecklistItem::where('step_id', $step->id)->findOrFail($itemId);

        $validator = Validator::make($request->all(), [
            'text'         => 'sometimes|required|string|max:500',
            'is_completed' => 'nullable|boolean',
            'sort_order'   => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $item->update($request->only(['text', 'is_completed', 'sort_order']));

        return response()->json(['success' => true, 'data' => $item, 'message' => 'Item aggiornato']);
    }

    /**
     * DELETE /api/timelines/{timelineId}/phases/{phaseId}/steps/{stepId}/checklist/{itemId}
     */
    public function destroyChecklistItem(int $timelineId, int $phaseId, int $stepId, int $itemId): JsonResponse
    {
        $timeline = $this->resolveTimeline($timelineId);
        $phase    = TimelinePhase::where('timeline_id', $timeline->id)->findOrFail($phaseId);
        $step     = TimelineStep::where('phase_id', $phase->id)->findOrFail($stepId);
        $item     = TimelineChecklistItem::where('step_id', $step->id)->findOrFail($itemId);
        $item->delete();

        return response()->json(['success' => true, 'message' => 'Item eliminato']);
    }
}
