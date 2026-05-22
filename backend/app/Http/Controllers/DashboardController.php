<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Project;
use App\Models\Task;
use App\Models\CrmProjectTask;
use App\Models\UscitaCocchi;
use App\Models\User;
use App\Models\AgendaItem;
use App\Models\Quote;
use App\Models\Client;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        $user = Auth::user();
        $userId = $user->id;
        $isAdmin = $user->role === 'admin';

        // Calcolo periodi
        $now = now();
        $thirtyDaysAgo = $now->copy()->subDays(30);
        $sevenDaysAgo = $now->copy()->subDays(7);
        $thisWeekStart = $now->copy()->startOfWeek();
        $lastWeekStart = $thisWeekStart->copy()->subWeek();
        $lastWeekEnd = $thisWeekStart->copy()->subDay();
        $lastMonthStart = $now->copy()->subMonth()->startOfMonth();
        $lastMonthEnd = $now->copy()->subMonth()->endOfMonth();

        // ============================================
        // 1. TASK PERFORMANCE
        // ============================================
        $taskStats = $this->getTaskStats($isAdmin, $userId, $thirtyDaysAgo, $thisWeekStart, $lastWeekStart, $lastWeekEnd);

        // ============================================
        // 2. PAYMENT ANALYTICS (Cocchi)
        // ============================================
        $paymentStats = $this->getPaymentStats($thirtyDaysAgo, $now);

        // ============================================
        // 3. TEAM EFFICIENCY
        // ============================================
        $teamStats = $this->getTeamStats($isAdmin, $userId);

        // ============================================
        // 4. NOTIFICHE (Recent Activity)
        // ============================================
        $notifications = $this->getNotifications($isAdmin, $userId);

        // ============================================
        // 5. BACHECA (Agenda Items)
        // ============================================
        $agendaItems = $this->getAgendaItems($isAdmin, $userId);

        return response()->json([
            'task_performance' => $taskStats,
            'payment_analytics' => $paymentStats,
            'team_efficiency' => $teamStats,
            'notifications' => $notifications,
            'agenda_items' => $agendaItems,
        ]);
    }

    /**
     * Statistiche Task Performance
     */
    private function getTaskStats($isAdmin, $userId, $thirtyDaysAgo, $thisWeekStart, $lastWeekStart, $lastWeekEnd)
    {
        // Query base per tasks
        $baseQuery = DB::table('tasks');
        if (!$isAdmin) {
            $baseQuery->join('task_assignees', 'tasks.id', '=', 'task_assignees.task_id')
                     ->where('task_assignees.user_id', $userId);
        }

        // Tasks completate negli ultimi 30 giorni
        $completed30Days = (clone $baseQuery)
            ->where('status', 'completed')
            ->where('updated_at', '>=', $thirtyDaysAgo)
            ->count();

        // Tasks in ritardo (due_date passata e status non completato)
        $overdueTasks = (clone $baseQuery)
            ->where('status', '!=', 'completed')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->count();

        // Tasks completate questa settimana
        $completedThisWeek = (clone $baseQuery)
            ->where('status', 'completed')
            ->where('updated_at', '>=', $thisWeekStart)
            ->count();

        // Tasks completate settimana scorsa (per calcolare incremento)
        $completedLastWeek = (clone $baseQuery)
            ->where('status', 'completed')
            ->whereBetween('updated_at', [$lastWeekStart, $lastWeekEnd])
            ->count();

        // Calcolo incremento percentuale
        $increment = 0;
        if ($completedLastWeek > 0) {
            $increment = round((($completedThisWeek - $completedLastWeek) / $completedLastWeek) * 100, 1);
        } elseif ($completedThisWeek > 0) {
            $increment = 100; // Da 0 a qualsiasi numero = 100% incremento
        }

        // Include anche CRM Project Tasks
        $crmBaseQuery = DB::table('crm_project_tasks');
        if (!$isAdmin) {
            $crmBaseQuery->join('crm_project_task_assignments', 'crm_project_tasks.id', '=', 'crm_project_task_assignments.crm_project_task_id')
                        ->where('crm_project_task_assignments.user_id', $userId)
                        ->where('crm_project_task_assignments.is_active', true);
        }

        $crmCompleted30Days = (clone $crmBaseQuery)
            ->where('status', 'completed')
            ->where('updated_at', '>=', $thirtyDaysAgo)
            ->count();

        $crmOverdueTasks = (clone $crmBaseQuery)
            ->where('status', '!=', 'completed')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->count();

        $crmCompletedThisWeek = (clone $crmBaseQuery)
            ->where('status', 'completed')
            ->where('updated_at', '>=', $thisWeekStart)
            ->count();

        $crmCompletedLastWeek = (clone $crmBaseQuery)
            ->where('status', 'completed')
            ->whereBetween('updated_at', [$lastWeekStart, $lastWeekEnd])
            ->count();

        // Somma tasks normali + CRM tasks
        $totalCompleted30Days = $completed30Days + $crmCompleted30Days;
        $totalOverdue = $overdueTasks + $crmOverdueTasks;
        $totalCompletedThisWeek = $completedThisWeek + $crmCompletedThisWeek;
        $totalCompletedLastWeek = $completedLastWeek + $crmCompletedLastWeek;

        // Ricalcola incremento con dati totali
        $totalIncrement = 0;
        if ($totalCompletedLastWeek > 0) {
            $totalIncrement = round((($totalCompletedThisWeek - $totalCompletedLastWeek) / $totalCompletedLastWeek) * 100, 1);
        } elseif ($totalCompletedThisWeek > 0) {
            $totalIncrement = 100;
        }

        return [
            'completed_30d' => $totalCompleted30Days,
            'overdue' => $totalOverdue,
            'completed_this_week' => $totalCompletedThisWeek,
            'increment_percentage' => $totalIncrement,
        ];
    }

    /**
     * Statistiche Payment Analytics (Cocchi)
     */
    private function getPaymentStats($thirtyDaysAgo, $now)
    {
        // Cocchi pagati negli ultimi 30 giorni
        $cocchiPaid30Days = UscitaCocchi::where('status', 'paid')
            ->where('payment_date', '>=', $thirtyDaysAgo->toDateString())
            ->sum('amount');

        // Cocchi in ritardo (pending con due_date passata)
        $cocchiOverdue = UscitaCocchi::where('status', 'pending')
            ->whereNotNull('due_date')
            ->where('due_date', '<', $now->toDateString())
            ->sum('amount');

        // Rate pagate (payment_plan_installments)
        // Usa updated_at quando lo status è 'paid' (la colonna paid_at non esiste)
        $installmentsPaid = DB::table('payment_plan_installments')
            ->where('status', 'paid')
            ->where('updated_at', '>=', $thirtyDaysAgo)
            ->count();

        return [
            'cocchi_paid_30d' => round((float)$cocchiPaid30Days, 2),
            'cocchi_overdue' => round((float)$cocchiOverdue, 2),
            'installments_paid' => $installmentsPaid,
        ];
    }

    /**
     * Statistiche Team Efficiency
     */
    private function getTeamStats($isAdmin, $userId)
    {
        // Utenti attivi (escludi clienti)
        $activeUsers = User::where('is_active', true)
            ->whereNotIn('role', ['clienti'])
            ->get();

        $teamMembers = [];

        foreach ($activeUsers as $member) {
            // Tasks completate (normali + CRM)
            $completedTasks = DB::table('tasks')
                ->join('task_assignees', 'tasks.id', '=', 'task_assignees.task_id')
                ->where('task_assignees.user_id', $member->id)
                ->where('tasks.status', 'completed')
                ->count();

            $crmCompletedTasks = DB::table('crm_project_tasks')
                ->join('crm_project_task_assignments', 'crm_project_tasks.id', '=', 'crm_project_task_assignments.crm_project_task_id')
                ->where('crm_project_task_assignments.user_id', $member->id)
                ->where('crm_project_task_assignments.is_active', true)
                ->where('crm_project_tasks.status', 'completed')
                ->count();

            $totalCompleted = $completedTasks + $crmCompletedTasks;

            // Totale tasks assegnate
            $totalTasks = DB::table('tasks')
                ->join('task_assignees', 'tasks.id', '=', 'task_assignees.task_id')
                ->where('task_assignees.user_id', $member->id)
                ->count();

            $crmTotalTasks = DB::table('crm_project_tasks')
                ->join('crm_project_task_assignments', 'crm_project_tasks.id', '=', 'crm_project_task_assignments.crm_project_task_id')
                ->where('crm_project_task_assignments.user_id', $member->id)
                ->where('crm_project_task_assignments.is_active', true)
                ->count();

            $totalAssigned = $totalTasks + $crmTotalTasks;

            // Percentuale completamento
            $percentage = $totalAssigned > 0 ? round(($totalCompleted / $totalAssigned) * 100, 1) : 0;

            // Iniziali nome
            $nameParts = explode(' ', $member->name);
            $initials = '';
            foreach ($nameParts as $part) {
                if (!empty($part)) {
                    $initials .= strtoupper(substr($part, 0, 1));
                }
            }
            if (empty($initials) && !empty($member->name)) {
                $initials = strtoupper(substr($member->name, 0, 2));
            }

            $teamMembers[] = [
                'id' => $member->id,
                'initials' => $initials,
                'name' => $member->name,
                'completed' => $totalCompleted,
                'percentage' => $percentage,
            ];
        }

        // Ordina per completate (decrescente) e limita a top 10
        usort($teamMembers, function($a, $b) {
            return $b['completed'] - $a['completed'];
        });

        return array_slice($teamMembers, 0, 10);
    }

    /**
     * Notifiche (Recent Activity)
     */
    private function getNotifications($isAdmin, $userId)
    {
        $notifications = [];

        // Tasks completate recenti
        $recentTasks = DB::table('tasks')
            ->join('task_assignees', 'tasks.id', '=', 'task_assignees.task_id')
            ->join('projects', 'tasks.project_id', '=', 'projects.id')
            ->join('users', 'task_assignees.user_id', '=', 'users.id')
            ->where('tasks.status', 'completed')
            ->where('tasks.updated_at', '>=', now()->subDays(7))
            ->select('tasks.title', 'tasks.updated_at', 'projects.name as project_name', 'users.name as user_name')
            ->orderBy('tasks.updated_at', 'desc')
            ->limit(5)
            ->get();

        foreach ($recentTasks as $task) {
            $nameParts = explode(' ', $task->user_name);
            $initials = '';
            foreach ($nameParts as $part) {
                if (!empty($part)) {
                    $initials .= strtoupper(substr($part, 0, 1));
                }
            }

            $notifications[] = [
                'id' => uniqid('task_'),
                'avatar' => $initials,
                'title' => $task->user_name,
                'message' => 'ha completato il task "' . $task->title . '"',
                'time' => Carbon::parse($task->updated_at)->diffForHumans(),
                'read' => false,
                'urgent' => false,
            ];
        }

        // Preventivi approvati recenti
        $recentQuotes = Quote::with('client')
            ->where('status', 'approved')
            ->where('updated_at', '>=', now()->subDays(7))
            ->orderBy('updated_at', 'desc')
            ->limit(3)
            ->get();

        foreach ($recentQuotes as $quote) {
            $clientName = $quote->client ? $quote->client->company_name : 'Cliente';
            $nameParts = explode(' ', $clientName);
            $initials = '';
            foreach ($nameParts as $part) {
                if (!empty($part)) {
                    $initials .= strtoupper(substr($part, 0, 1));
                }
            }

            $notifications[] = [
                'id' => uniqid('quote_'),
                'avatar' => $initials,
                'title' => $clientName,
                'message' => 'Preventivo ' . $quote->quote_number . ' approvato',
                'time' => Carbon::parse($quote->updated_at)->diffForHumans(),
                'read' => false,
                'urgent' => false,
            ];
        }

        // Nuovi clienti
        $recentClients = Client::where('created_at', '>=', now()->subDays(7))
            ->orderBy('created_at', 'desc')
            ->limit(2)
            ->get();

        foreach ($recentClients as $client) {
            $nameParts = explode(' ', $client->company_name);
            $initials = '';
            foreach ($nameParts as $part) {
                if (!empty($part)) {
                    $initials .= strtoupper(substr($part, 0, 1));
                }
            }

            $notifications[] = [
                'id' => uniqid('client_'),
                'avatar' => $initials,
                'title' => $client->company_name,
                'message' => 'Nuovo cliente aggiunto al sistema',
                'time' => Carbon::parse($client->created_at)->diffForHumans(),
                'read' => false,
                'urgent' => false,
            ];
        }

        // Ordina per tempo (più recenti prima)
        usort($notifications, function($a, $b) {
            return strtotime($b['time']) - strtotime($a['time']);
        });

        return array_slice($notifications, 0, 10);
    }

    /**
     * Agenda Items (Bacheca)
     */
    private function getAgendaItems($isAdmin, $userId)
    {
        $query = AgendaItem::with('user')
            ->where('status', 'active');

        if (!$isAdmin) {
            $query->where('user_id', $userId);
        }

        $items = $query->orderBy('is_pinned', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return $items->map(function ($item) {
            // Determina tipo per badge
            $tipo = match($item->type) {
                'memo' => 'appunto',
                'reminder' => 'avviso',
                'checklist' => 'appunto',
                'event' => 'comunicazione',
                default => 'appunto',
            };

            return [
                'id' => $item->id,
                'tipo' => $tipo,
                'titolo' => $item->title ?? 'Senza titolo',
                'contenuto' => $item->content ?? $item->description ?? '',
                'data' => $item->date ? $item->date->format('Y-m-d') : $item->created_at->format('Y-m-d'),
                'pinnato' => $item->is_pinned,
                'autore' => $item->user ? $item->user->name : 'Sistema',
            ];
        })->toArray();
    }
}
