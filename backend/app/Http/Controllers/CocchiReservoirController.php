<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\CocchiReservoir;
use App\Models\CocchiReservoirTransaction;
use App\Models\Project;

class CocchiReservoirController extends Controller
{
    /**
     * Lista serbatoi
     */
    public function index(Request $request)
    {
        $query = CocchiReservoir::with(['project', 'creator']);

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    /**
     * Crea nuovo serbatoio
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:company,project',
            'project_id' => 'nullable|required_if:type,project|exists:projects,id',
            'initial_balance_cocchi' => 'required|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $validated['current_balance_cocchi'] = $validated['initial_balance_cocchi'];
        $validated['created_by'] = Auth::id();

        $reservoir = CocchiReservoir::create($validated);

        // Crea transazione iniziale
        if ($validated['initial_balance_cocchi'] > 0) {
            $reservoir->transactions()->create([
                'type' => 'deposit',
                'amount_cocchi' => $validated['initial_balance_cocchi'],
                'description' => 'Saldo iniziale',
                'balance_before' => 0,
                'balance_after' => $validated['initial_balance_cocchi'],
                'created_by' => Auth::id(),
            ]);
        }

        return response()->json($reservoir->load(['project', 'creator']), 201);
    }

    /**
     * Dettagli serbatoio
     */
    public function show(CocchiReservoir $cocchiReservoir)
    {
        return response()->json($cocchiReservoir->load([
            'project',
            'creator',
            'transactions' => function($q) {
                $q->orderBy('created_at', 'desc')->limit(50);
            }
        ]));
    }

    /**
     * Versa cocchi nel serbatoio
     */
    public function deposit(Request $request, CocchiReservoir $cocchiReservoir)
    {
        $validated = $request->validate([
            'amount_cocchi' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'related_type' => 'nullable|string',
            'related_id' => 'nullable|integer',
        ]);

        $transaction = $cocchiReservoir->deposit(
            $validated['amount_cocchi'],
            $validated['description'] ?? 'Versamento',
            Auth::id(),
            $validated['related_type'] ?? null,
            $validated['related_id'] ?? null
        );

        return response()->json([
            'message' => 'Versamento effettuato',
            'reservoir' => $cocchiReservoir->fresh(),
            'transaction' => $transaction,
        ]);
    }

    /**
     * Preleva cocchi dal serbatoio
     */
    public function withdraw(Request $request, CocchiReservoir $cocchiReservoir)
    {
        $validated = $request->validate([
            'amount_cocchi' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'related_type' => 'nullable|string',
            'related_id' => 'nullable|integer',
        ]);

        try {
            $transaction = $cocchiReservoir->withdraw(
                $validated['amount_cocchi'],
                $validated['description'] ?? 'Prelievo',
                Auth::id(),
                $validated['related_type'] ?? null,
                $validated['related_id'] ?? null
            );

            return response()->json([
                'message' => 'Prelievo effettuato',
                'reservoir' => $cocchiReservoir->fresh(),
                'transaction' => $transaction,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Trasferisci cocchi tra serbatoi
     */
    public function transfer(Request $request, CocchiReservoir $fromReservoir)
    {
        $validated = $request->validate([
            'to_reservoir_id' => 'required|exists:cocchi_reservoirs,id',
            'amount_cocchi' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
        ]);

        $toReservoir = CocchiReservoir::findOrFail($validated['to_reservoir_id']);

        if ($fromReservoir->current_balance_cocchi < $validated['amount_cocchi']) {
            return response()->json([
                'message' => 'Saldo insufficiente nel serbatoio di origine',
            ], 422);
        }

        // Prelievo da serbatoio origine
        $fromBalanceBefore = $fromReservoir->current_balance_cocchi;
        $fromReservoir->decrement('current_balance_cocchi', $validated['amount_cocchi']);
        $fromBalanceAfter = $fromReservoir->current_balance_cocchi;

        // Versamento in serbatoio destinazione
        $toBalanceBefore = $toReservoir->current_balance_cocchi;
        $toReservoir->increment('current_balance_cocchi', $validated['amount_cocchi']);
        $toBalanceAfter = $toReservoir->current_balance_cocchi;

        // Crea transazioni
        $fromTransaction = CocchiReservoirTransaction::create([
            'reservoir_id' => $fromReservoir->id,
            'type' => 'transfer',
            'amount_cocchi' => $validated['amount_cocchi'],
            'to_reservoir_id' => $toReservoir->id,
            'description' => $validated['description'] ?? "Trasferimento a {$toReservoir->name}",
            'balance_before' => $fromBalanceBefore,
            'balance_after' => $fromBalanceAfter,
            'created_by' => Auth::id(),
        ]);

        CocchiReservoirTransaction::create([
            'reservoir_id' => $toReservoir->id,
            'type' => 'transfer',
            'amount_cocchi' => $validated['amount_cocchi'],
            'from_reservoir_id' => $fromReservoir->id,
            'description' => $validated['description'] ?? "Trasferimento da {$fromReservoir->name}",
            'balance_before' => $toBalanceBefore,
            'balance_after' => $toBalanceAfter,
            'created_by' => Auth::id(),
        ]);

        return response()->json([
            'message' => 'Trasferimento effettuato',
            'from_reservoir' => $fromReservoir->fresh(),
            'to_reservoir' => $toReservoir->fresh(),
            'transaction' => $fromTransaction,
        ]);
    }

    /**
     * Storico transazioni
     */
    public function transactions(Request $request, CocchiReservoir $cocchiReservoir)
    {
        $query = $cocchiReservoir->transactions()
            ->with(['creator', 'fromReservoir', 'toReservoir'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return response()->json($query->paginate($request->get('per_page', 50)));
    }
}

