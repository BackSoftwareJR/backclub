<?php

namespace App\Http\Controllers;

use App\Models\UsciteCocchi;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UsciteCocchiUserController extends Controller
{
    /**
     * GET /api/uscite-cocchi/users
     * Lista utenti con search AJAX
     */
    public function index(Request $request)
    {
        try {
            $query = User::query();

            // AJAX Search
            if ($request->has('q') && $request->q) {
                $search = $request->q;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'LIKE', "%{$search}%")
                      ->orWhere('email', 'LIKE', "%{$search}%");
                });
            }

            // Get users with expense data
            $users = $query->get()->map(function ($user) use ($request) {
                $expenseQuery = UsciteCocchi::where('user_id', $user->id);

                // Filter by expense type
                if ($request->has('expense_type')) {
                    $expenseQuery->where('type', $request->expense_type);
                }

                // Filter by period
                if ($request->has('date_from')) {
                    $expenseQuery->where('payment_date', '>=', $request->date_from);
                }
                if ($request->has('date_to')) {
                    $expenseQuery->where('payment_date', '<=', $request->date_to);
                }

                $total = $expenseQuery->sum('amount');
                $count = $expenseQuery->count();
                $lastPayment = UsciteCocchi::where('user_id', $user->id)
                    ->orderBy('payment_date', 'desc')
                    ->first();

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'total_expenses' => $total,
                    'expenses_count' => $count,
                    'last_payment_date' => $lastPayment ? $lastPayment->payment_date : null,
                    'last_payment_amount' => $lastPayment ? $lastPayment->amount : null,
                ];
            });

            // Sort by total expenses desc
            $users = $users->sortByDesc('total_expenses')->values();

            return response()->json([
                'success' => true,
                'data' => $users,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/users/{id}
     * Dettaglio utente con statistiche
     */
    public function show($id)
    {
        try {
            $user = User::findOrFail($id);

            $total = UsciteCocchi::where('user_id', $id)->sum('amount');
            $pending = UsciteCocchi::where('user_id', $id)->where('status', 'pending')->sum('amount');
            $paid = UsciteCocchi::where('user_id', $id)->where('status', 'paid')->sum('amount');
            $count = UsciteCocchi::where('user_id', $id)->count();

            // By type breakdown
            $byType = UsciteCocchi::select('type', DB::raw('SUM(amount) as total'))
                ->where('user_id', $id)
                ->groupBy('type')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user,
                    'total_amount' => $total,
                    'pending_amount' => $pending,
                    'paid_amount' => $paid,
                    'count' => $count,
                    'by_type' => $byType,
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
     * GET /api/uscite-cocchi/users/{id}/payments
     * Lista pagamenti utente
     */
    public function getPayments($id, Request $request)
    {
        try {
            $query = UsciteCocchi::where('user_id', $id)
                ->with(['serbatoio']);

            // Filters
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('type')) {
                $query->where('type', $request->type);
            }

            if ($request->has('date_from')) {
                $query->where('payment_date', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->where('payment_date', '<=', $request->date_to);
            }

            $uscite = $query->orderBy('payment_date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $uscite,
                'total' => $uscite->sum('amount'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/uscite-cocchi/users/{id}/calendar
     * Eventi calendario utente
     */
    public function getCalendarEvents($id, Request $request)
    {
        try {
            $query = UsciteCocchi::where('user_id', $id);

            if ($request->has('start')) {
                $query->where('payment_date', '>=', $request->start);
            }

            if ($request->has('end')) {
                $query->where('payment_date', '<=', $request->end);
            }

            $uscite = $query->get();

            $events = $uscite->map(function ($uscita) {
                return [
                    'id' => $uscita->id,
                    'title' => $uscita->description . ' - €' . number_format($uscita->amount, 2),
                    'start' => $uscita->payment_date,
                    'end' => $uscita->payment_date,
                    'amount' => $uscita->amount,
                    'status' => $uscita->status,
                    'type' => $uscita->type,
                    'backgroundColor' => $this->getEventColor($uscita->status),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $events,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Errore: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function getEventColor($status)
    {
        return match($status) {
            'paid' => '#34C759',
            'pending' => '#0A84FF',
            'cancelled' => '#FF453A',
            default => '#8E8E93',
        };
    }
}
