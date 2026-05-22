<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Models\UscitaCocchi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    /**
     * GET /api/subscriptions
     * Lista tutti gli abbonamenti
     */
    public function index(Request $request)
    {
        $query = SubscriptionPlan::with(['uscita', 'assignedTo', 'paymentMethodModel']);

        // Filtri
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('crm_code')) {
            $query->where('crm_code', $request->crm_code);
        }

        if ($request->has('provider')) {
            $query->byProvider($request->provider);
        }

        if ($request->has('expiring_soon')) {
            $days = $request->get('expiring_days', 30);
            $query->expiringSoon($days);
        }

        // Search
        if ($request->has('q')) {
            $search = $request->q;
            $query->where(function($q) use ($search) {
                $q->where('service_name', 'like', "%{$search}%")
                  ->orWhere('provider', 'like', "%{$search}%");
            });
        }

        $subscriptions = $query->orderBy('renewal_date', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $subscriptions,
        ]);
    }

    /**
     * GET /api/subscriptions/active
     * Solo abbonamenti attivi
     */
    public function active()
    {
        $subscriptions = SubscriptionPlan::with(['uscita', 'assignedTo'])
            ->active()
            ->orderBy('renewal_date', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $subscriptions,
            'count' => $subscriptions->count(),
            'total_monthly' => $subscriptions->sum('monthly_amount'),
        ]);
    }

    /**
     * GET /api/subscriptions/expiring
     * Abbonamenti in scadenza
     */
    public function expiring()
    {
        $subscriptions = SubscriptionPlan::with(['uscita', 'assignedTo'])
            ->active()
            ->expiringSoon(30)
            ->orderBy('renewal_date', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $subscriptions,
        ]);
    }

    /**
     * GET /api/subscriptions/{id}
     * Dettaglio singolo abbonamento
     */
    public function show($id)
    {
        $subscription = SubscriptionPlan::with([
            'uscita', 
            'assignedTo', 
            'paymentMethodModel'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $subscription,
        ]);
    }

    /**
     * POST /api/subscriptions
     * Crea nuovo abbonamento
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_name' => 'required|string|max:255',
            'provider' => 'nullable|string|max:255',
            'plan_type' => 'nullable|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'renewal_date' => 'required|date',
            'billing_cycle' => 'required|in:weekly,monthly,quarterly,yearly',
            'monthly_amount' => 'required|numeric|min:0',
            'yearly_amount' => 'nullable|numeric|min:0',
            'setup_fee' => 'nullable|numeric|min:0',
            'auto_renew' => 'boolean',
            'seats' => 'nullable|integer|min:1',
            'crm_code' => 'nullable|string|max:50',
            'assigned_to_user_id' => 'nullable|exists:users,id',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'account_email' => 'nullable|email',
            'account_url' => 'nullable|url',
            'license_key' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Crea uscita cocchi ricorrente
            $uscita = UscitaCocchi::create([
                'title' => "Abbonamento: {$validated['service_name']}",
                'description' => $validated['notes'] ?? null,
                'amount' => $validated['monthly_amount'],
                'type' => 'abbonamento',
                'category' => 'SOFTWARE',
                'payment_date' => $validated['start_date'],
                'is_recurring' => true,
                'payment_frequency' => $validated['billing_cycle'],
                'next_payment_date' => $validated['renewal_date'],
                'crm_code' => $validated['crm_code'] ?? null,
                'status' => 'pending',
                'created_by' => auth()->id(),
            ]);

            // Crea subscription plan
            $subscription = SubscriptionPlan::create(array_merge($validated, [
                'uscita_id' => $uscita->id,
            ]));

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Abbonamento creato con successo',
                'data' => $subscription->load('uscita'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore durante la creazione: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/subscriptions/{id}
     * Aggiorna abbonamento
     */
    public function update($id, Request $request)
    {
        $subscription = SubscriptionPlan::findOrFail($id);

        $validated = $request->validate([
            'service_name' => 'sometimes|string|max:255',
            'provider' => 'nullable|string|max:255',
            'plan_type' => 'nullable|string|max:100',
            'monthly_amount' => 'sometimes|numeric|min:0',
            'renewal_date' => 'sometimes|date',
            'billing_cycle' => 'sometimes|in:weekly,monthly,quarterly,yearly',
            'auto_renew' => 'boolean',
            'seats' => 'nullable|integer|min:1',
            'assigned_to_user_id' => 'nullable|exists:users,id',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'notes' => 'nullable|string',
        ]);

        $subscription->update($validated);

        // Aggiorna anche uscita collegata
        if (isset($validated['monthly_amount'])) {
            $subscription->uscita->update(['amount' => $validated['monthly_amount']]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Abbonamento aggiornato',
            'data' => $subscription->fresh(['uscita', 'assignedTo']),
        ]);
    }

    /**
     * PUT /api/subscriptions/{id}/suspend
     * Sospendi abbonamento
     */
    public function suspend($id)
    {
        $subscription = SubscriptionPlan::findOrFail($id);
        $subscription->suspend();

        return response()->json([
            'success' => true,
            'message' => 'Abbonamento sospeso',
            'data' => $subscription,
        ]);
    }

    /**
     * PUT /api/subscriptions/{id}/activate
     * Riattiva abbonamento
     */
    public function activate($id)
    {
        $subscription = SubscriptionPlan::findOrFail($id);
        $subscription->activate();

        return response()->json([
            'success' => true,
            'message' => 'Abbonamento riattivato',
            'data' => $subscription,
        ]);
    }

    /**
     * PUT /api/subscriptions/{id}/renew
     * Rinnova abbonamento manualmente
     */
    public function renew($id)
    {
        $subscription = SubscriptionPlan::findOrFail($id);
        $subscription->renew();

        return response()->json([
            'success' => true,
            'message' => 'Abbonamento rinnovato',
            'data' => $subscription,
        ]);
    }

    /**
     * DELETE /api/subscriptions/{id}
     * Elimina abbonamento
     */
    public function destroy($id)
    {
        $subscription = SubscriptionPlan::findOrFail($id);
        
        // Disattiva invece di eliminare
        $subscription->is_active = false;
        $subscription->end_date = now()->toDateString();
        $subscription->save();

        return response()->json([
            'success' => true,
            'message' => 'Abbonamento terminato',
        ]);
    }

    /**
     * GET /api/subscriptions/stats
     * Statistiche abbonamenti
     */
    public function stats()
    {
        $activeSubscriptions = SubscriptionPlan::active()->get();

        $stats = [
            'total_active' => $activeSubscriptions->count(),
            'total_monthly_cost' => $activeSubscriptions->sum('monthly_amount'),
            'total_annual_cost' => $activeSubscriptions->sum(function($sub) {
                return $sub->annual_cost;
            }),
            'expiring_this_month' => SubscriptionPlan::active()->expiringSoon(30)->count(),
            'by_billing_cycle' => SubscriptionPlan::active()
                ->selectRaw('billing_cycle, COUNT(*) as count, SUM(monthly_amount) as total')
                ->groupBy('billing_cycle')
                ->get(),
            'by_crm' => SubscriptionPlan::active()
                ->selectRaw('crm_code, COUNT(*) as count, SUM(monthly_amount) as total')
                ->whereNotNull('crm_code')
                ->groupBy('crm_code')
                ->get(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}

