<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Services\TaskDetailAiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class TaskDetailAiController extends Controller
{
    public function __construct(
        private readonly TaskDetailAiService $aiService
    ) {}

    /**
     * GET /api/crm-projects/{id}/tasks/{taskId}/ai/brief
     */
    public function brief($id, $taskId)
    {
        [$project, $task, $user] = $this->resolveTask($id, $taskId);

        $brief = $this->aiService->getBrief($task, $project, $user);

        return response()->json([
            'success' => true,
            'data' => $brief,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/tasks/{taskId}/ai/ask
     */
    public function ask(Request $request, $id, $taskId)
    {
        [$project, $task, $user] = $this->resolveTask($id, $taskId);

        $validator = Validator::make($request->all(), [
            'question' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $answer = $this->aiService->ask($task, $project, $user, $request->question);

        return response()->json([
            'success' => true,
            'data' => $answer,
        ]);
    }

    /**
     * @return array{0: CrmProject, 1: CrmProjectTask, 2: \App\Models\User}
     */
    private function resolveTask($id, $taskId): array
    {
        $user = Auth::user();
        $project = CrmProject::findOrFail($id);
        $task = CrmProjectTask::where('crm_project_id', $project->id)->findOrFail($taskId);

        if (!$this->userCanAccessTask($user, $project, $task)) {
            abort(403, 'Non hai accesso a questo task');
        }

        return [$project, $task, $user];
    }

    private function userCanAccessTask($user, CrmProject $project, CrmProjectTask $task): bool
    {
        if ($user->role === 'admin') {
            return true;
        }
        if ((int) $project->manager_id === (int) $user->id) {
            return true;
        }
        $isAssigned = $task->assignments()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();
        if ($isAssigned) {
            return true;
        }

        return $project->teamMembers()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();
    }
}
