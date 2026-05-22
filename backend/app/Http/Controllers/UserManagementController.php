<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class UserManagementController extends Controller
{
    // ============================================================
    // SEARCH & LIST
    // ============================================================
    
    /**
     * GET /api/users/search
     * AJAX search with filters
     */
    public function search(Request $request)
    {
        try {
            $query = User::query();

            // Text search
            if ($request->has('q') && $request->q) {
                $search = $request->q;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%");
                });
            }

            // Filter by role
            if ($request->has('role') && $request->role) {
                $query->where('role', $request->role);
            }

            // Filter by active status (is_active: 1=active, 0=inactive)
            if ($request->has('status') && $request->status) {
                $isActive = $request->status === 'active' ? 1 : 0;
                $query->where('is_active', $isActive);
            }

            // Sort
            $sortBy = $request->get('sort_by', 'name');
            $sortDir = $request->get('sort_dir', 'asc');
            $query->orderBy($sortBy, $sortDir);

            // Pagination
            $perPage = $request->get('per_page', 20);
            $users = $query->paginate($perPage);

            // Add stats to each user
            $users->getCollection()->transform(function ($user) {
                $user->total_hours = DB::table('user_work_hours')
                    ->where('user_id', $user->id)
                    ->sum('hours');
                
                $user->total_payments = DB::table('uscite_cocchi')
                    ->where('team_member_id', $user->id)
                    ->where('status', 'paid')
                    ->sum('amount');
                
                $user->active_projects = DB::table('project_team')
                    ->where('user_id', $user->id)
                    ->count();

                return $user;
            });

            return response()->json([
                'success' => true,
                'data' => $users->items(),
                'pagination' => [
                    'total' => $users->total(),
                    'per_page' => $users->perPage(),
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/users/{id}/detail
     * Complete user detail
     */
    public function show($id)
    {
        try {
            $user = User::findOrFail($id);

            // Get current compensation
            $currentCompensation = DB::table('user_compensation')
                ->where('user_id', $id)
                ->where('effective_from', '<=', now())
                ->where(function($q) {
                    $q->whereNull('effective_to')
                      ->orWhere('effective_to', '>=', now());
                })
                ->orderBy('effective_from', 'desc')
                ->first();

            // Calculate stats
            $stats = [
                'total_hours_month' => DB::table('user_work_hours')
                    ->where('user_id', $id)
                    ->whereMonth('date', now()->month)
                    ->whereYear('date', now()->year)
                    ->sum('hours'),
                
                'total_hours_year' => DB::table('user_work_hours')
                    ->where('user_id', $id)
                    ->whereYear('date', now()->year)
                    ->sum('hours'),
                
                'total_payments' => DB::table('uscite_cocchi')
                    ->where('team_member_id', $id)
                    ->where('status', 'paid')
                    ->sum('amount'),
                
                'pending_payments' => DB::table('uscite_cocchi')
                    ->where('team_member_id', $id)
                    ->where('status', 'pending')
                    ->sum('amount'),
                
                'active_projects' => DB::table('project_team')
                    ->where('user_id', $id)
                    ->count(),
                
                'completed_projects' => DB::table('project_team')
                    ->join('projects', 'project_team.project_id', '=', 'projects.id')
                    ->where('project_team.user_id', $id)
                    ->where('projects.status', 'completed')
                    ->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user,
                    'current_compensation' => $currentCompensation,
                    'stats' => $stats,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============================================================
    // WORK HOURS
    // ============================================================
    
    /**
     * GET /api/users/{id}/work-hours
     */
    public function getWorkHours($id, Request $request)
    {
        try {
            $query = DB::table('user_work_hours')
                ->where('user_id', $id)
                ->leftJoin('projects', 'user_work_hours.project_id', '=', 'projects.id')
                ->select('user_work_hours.*', 'projects.name as project_name');

            // Date filters
            if ($request->has('date_from')) {
                $query->where('user_work_hours.date', '>=', $request->date_from);
            }
            if ($request->has('date_to')) {
                $query->where('user_work_hours.date', '<=', $request->date_to);
            }

            // Project filter
            if ($request->has('project_id')) {
                $query->where('user_work_hours.project_id', $request->project_id);
            }

            $hours = $query->orderBy('user_work_hours.date', 'desc')->get();

            $total = $hours->sum('hours');
            $totalPaid = $hours->sum(function($h) {
                return $h->hours * ($h->hourly_rate ?? 0);
            });

            return response()->json([
                'success' => true,
                'data' => $hours,
                'summary' => [
                    'total_hours' => round($total, 2),
                    'total_amount' => round($totalPaid, 2),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/users/{id}/work-hours
     */
    public function storeWorkHours($id, Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'hours' => 'required|numeric|min:0.25|max:24',
            'project_id' => 'nullable|exists:projects,id',
            'hourly_rate' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $hourId = DB::table('user_work_hours')->insertGetId([
                'user_id' => $id,
                'project_id' => $request->project_id,
                'date' => $request->date,
                'hours' => $request->hours,
                'hourly_rate' => $request->hourly_rate,
                'description' => $request->description,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Ore registrate con successo',
                'data' => DB::table('user_work_hours')->find($hourId),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/users/{id}/work-hours/{hourId}
     */
    public function updateWorkHours($id, $hourId, Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'sometimes|required|date',
            'hours' => 'sometimes|required|numeric|min:0.25|max:24',
            'project_id' => 'nullable|exists:projects,id',
            'hourly_rate' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::table('user_work_hours')
                ->where('id', $hourId)
                ->where('user_id', $id)
                ->update(array_merge(
                    $validator->validated(),
                    ['updated_at' => now()]
                ));

            return response()->json([
                'success' => true,
                'message' => 'Ore aggiornate con successo',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/users/{id}/work-hours/{hourId}
     */
    public function deleteWorkHours($id, $hourId)
    {
        try {
            DB::table('user_work_hours')
                ->where('id', $hourId)
                ->where('user_id', $id)
                ->delete();

            return response()->json([
                'success' => true,
                'message' => 'Ore eliminate con successo',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============================================================
    // COMPENSATION
    // ============================================================
    
    /**
     * GET /api/users/{id}/compensation
     */
    public function getCompensation($id)
    {
        try {
            $compensation = DB::table('user_compensation')
                ->where('user_id', $id)
                ->orderBy('effective_from', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $compensation,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/users/{id}/compensation
     */
    public function storeCompensation($id, Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:hourly,task,project',
            'base_rate' => 'required|numeric|min:0',
            'effective_from' => 'required|date',
            'effective_to' => 'nullable|date|after:effective_from',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $compId = DB::table('user_compensation')->insertGetId([
                'user_id' => $id,
                'type' => $request->type,
                'base_rate' => $request->base_rate,
                'effective_from' => $request->effective_from,
                'effective_to' => $request->effective_to,
                'notes' => $request->notes,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Compenso creato con successo',
                'data' => DB::table('user_compensation')->find($compId),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/users/{id}/compensation/{compId}
     */
    public function updateCompensation($id, $compId, Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'sometimes|required|in:hourly,task,project',
            'base_rate' => 'sometimes|required|numeric|min:0',
            'effective_from' => 'sometimes|required|date',
            'effective_to' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            DB::table('user_compensation')
                ->where('id', $compId)
                ->where('user_id', $id)
                ->update(array_merge(
                    $validator->validated(),
                    ['updated_at' => now()]
                ));

            return response()->json([
                'success' => true,
                'message' => 'Compenso aggiornato con successo',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============================================================
    // PROJECTS
    // ============================================================
    
    /**
     * GET /api/users/{id}/projects
     */
    public function getProjects($id)
    {
        try {
            $projects = DB::table('project_team')
                ->join('projects', 'project_team.project_id', '=', 'projects.id')
                ->where('project_team.user_id', $id)
                ->select('projects.*', 'project_team.role as team_role')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $projects,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============================================================
    // PAYMENTS
    // ============================================================
    
    /**
     * GET /api/users/{id}/payments
     */
    public function getPayments($id, Request $request)
    {
        try {
            $query = DB::table('uscite_cocchi')
                ->where('team_member_id', $id);

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('date_from')) {
                $query->where('payment_date', '>=', $request->date_from);
            }
            if ($request->has('date_to')) {
                $query->where('payment_date', '<=', $request->date_to);
            }

            $payments = $query->orderBy('payment_date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $payments,
                'summary' => [
                    'total' => $payments->sum('amount'),
                    'paid' => $payments->where('status', 'paid')->sum('amount'),
                    'pending' => $payments->where('status', 'pending')->sum('amount'),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============================================================
    // NOTES
    // ============================================================
    
    /**
     * GET /api/users/{id}/notes
     */
    public function getNotes($id)
    {
        try {
            $notes = DB::table('user_notes')
                ->where('user_id', $id)
                ->leftJoin('users', 'user_notes.created_by', '=', 'users.id')
                ->select('user_notes.*', 'users.name as author_name')
                ->orderBy('user_notes.created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $notes,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/users/{id}/notes
     */
    public function storeNote($id, Request $request)
    {
        $validator = Validator::make($request->all(), [
            'note' => 'required|string',
            'is_private' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $noteId = DB::table('user_notes')->insertGetId([
                'user_id' => $id,
                'note' => $request->note,
                'is_private' => $request->is_private ?? false,
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Nota aggiunta con successo',
                'data' => DB::table('user_notes')->find($noteId),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/users/{id}/notes/{noteId}
     */
    public function deleteNote($id, $noteId)
    {
        try {
            DB::table('user_notes')
                ->where('id', $noteId)
                ->where('user_id', $id)
                ->delete();

            return response()->json([
                'success' => true,
                'message' => 'Nota eliminata con successo',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ============================================================
    // STATISTICS
    // ============================================================
    
    /**
     * GET /api/users/{id}/stats
     */
    public function getStats($id, Request $request)
    {
        try {
            $period = $request->get('period', 'month'); // month, year, custom
            
            $dateFrom = $request->has('date_from') 
                ? $request->date_from 
                : ($period === 'year' ? now()->startOfYear() : now()->startOfMonth());
            
            $dateTo = $request->has('date_to')
                ? $request->date_to
                : now();

            $stats = [
                'hours' => [
                    'total' => DB::table('user_work_hours')
                        ->where('user_id', $id)
                        ->whereBetween('date', [$dateFrom, $dateTo])
                        ->sum('hours'),
                    'by_project' => DB::table('user_work_hours')
                        ->join('projects', 'user_work_hours.project_id', '=', 'projects.id')
                        ->where('user_work_hours.user_id', $id)
                        ->whereBetween('user_work_hours.date', [$dateFrom, $dateTo])
                        ->select('projects.name', DB::raw('SUM(user_work_hours.hours) as total'))
                        ->groupBy('projects.id', 'projects.name')
                        ->get(),
                ],
                'payments' => [
                    'total' => DB::table('uscite_cocchi')
                        ->where('team_member_id', $id)
                        ->where('status', 'paid')
                        ->whereBetween('payment_date', [$dateFrom, $dateTo])
                        ->sum('amount'),
                    'count' => DB::table('uscite_cocchi')
                        ->where('team_member_id', $id)
                        ->where('status', 'paid')
                        ->whereBetween('payment_date', [$dateFrom, $dateTo])
                        ->count(),
                ],
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'period' => [
                    'from' => $dateFrom,
                    'to' => $dateTo,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }
}
