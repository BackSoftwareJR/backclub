<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\FinancialTransaction;
use App\Models\Project;
use App\Models\Client;

class FinancialController extends Controller
{
    /**
     * Lista transazioni finanziarie
     */
    public function index(Request $request)
    {
        $query = FinancialTransaction::with(['project', 'client', 'user'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc');

        // Filtri
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->filled('date_from')) {
            $query->where('transaction_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('transaction_date', '<=', $request->date_to);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $transactions = $query->paginate($request->get('per_page', 50));

        return response()->json($transactions);
    }

    /**
     * Crea nuova transazione
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:entrata,uscita',
            'amount_cocchi' => 'required|numeric|min:0',
            'description' => 'required|string',
            'category' => 'nullable|string|max:100',
            'project_id' => 'nullable|exists:projects,id',
            'client_id' => 'nullable|exists:clients,id',
            'transaction_date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',
            'document_path' => 'nullable|string',
        ]);

        $validated['user_id'] = Auth::id();

        $transaction = FinancialTransaction::create($validated);

        // Aggiorna spent_cocchi del progetto se è un'uscita
        if ($validated['type'] === 'uscita' && $validated['project_id']) {
            $project = Project::find($validated['project_id']);
            if ($project) {
                $project->increment('spent_cocchi', $validated['amount_cocchi']);
            }
        }

        return response()->json($transaction->load(['project', 'client', 'user']), 201);
    }

    /**
     * Dettagli transazione
     */
    public function show(FinancialTransaction $financialTransaction)
    {
        return response()->json($financialTransaction->load(['project', 'client', 'user']));
    }

    /**
     * Aggiorna transazione
     */
    public function update(Request $request, FinancialTransaction $financialTransaction)
    {
        $validated = $request->validate([
            'type' => 'in:entrata,uscita',
            'amount_cocchi' => 'numeric|min:0',
            'description' => 'string',
            'category' => 'nullable|string|max:100',
            'project_id' => 'nullable|exists:projects,id',
            'client_id' => 'nullable|exists:clients,id',
            'transaction_date' => 'date',
            'reference_number' => 'nullable|string|max:100',
            'document_path' => 'nullable|string',
        ]);

        $oldAmount = $financialTransaction->amount_cocchi;
        $oldProjectId = $financialTransaction->project_id;
        $oldType = $financialTransaction->type;

        $financialTransaction->update($validated);

        // Aggiorna spent_cocchi del progetto se necessario
        if ($oldType === 'uscita' && $oldProjectId) {
            $oldProject = Project::find($oldProjectId);
            if ($oldProject) {
                $oldProject->decrement('spent_cocchi', $oldAmount);
            }
        }

        if ($validated['type'] === 'uscita' && isset($validated['project_id'])) {
            $newProject = Project::find($validated['project_id']);
            if ($newProject) {
                $newProject->increment('spent_cocchi', $validated['amount_cocchi'] ?? $oldAmount);
            }
        }

        return response()->json($financialTransaction->load(['project', 'client', 'user']));
    }

    /**
     * Elimina transazione
     */
    public function destroy(FinancialTransaction $financialTransaction)
    {
        // Ripristina spent_cocchi del progetto se era un'uscita
        if ($financialTransaction->type === 'uscita' && $financialTransaction->project_id) {
            $project = Project::find($financialTransaction->project_id);
            if ($project) {
                $project->decrement('spent_cocchi', $financialTransaction->amount_cocchi);
            }
        }

        $financialTransaction->delete();
        return response()->json(null, 204);
    }

    /**
     * Report finanziari
     */
    public function reports(Request $request)
    {
        $dateFrom = $request->get('date_from', now()->startOfMonth()->toDateString());
        $dateTo = $request->get('date_to', now()->endOfMonth()->toDateString());

        $entrate = FinancialTransaction::where('type', 'entrata')
            ->whereBetween('transaction_date', [$dateFrom, $dateTo])
            ->sum('amount_cocchi');

        $uscite = FinancialTransaction::where('type', 'uscita')
            ->whereBetween('transaction_date', [$dateFrom, $dateTo])
            ->sum('amount_cocchi');

        $byCategory = FinancialTransaction::select('category', \DB::raw('SUM(amount_cocchi) as total'))
            ->whereBetween('transaction_date', [$dateFrom, $dateTo])
            ->groupBy('category')
            ->get();

        $byProject = FinancialTransaction::select('projects.name', \DB::raw('SUM(financial_transactions.amount_cocchi) as total'))
            ->join('projects', 'financial_transactions.project_id', '=', 'projects.id')
            ->whereBetween('financial_transactions.transaction_date', [$dateFrom, $dateTo])
            ->groupBy('projects.id', 'projects.name')
            ->get();

        return response()->json([
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'summary' => [
                'entrate' => (float) $entrate,
                'uscite' => (float) $uscite,
                'saldo' => (float) ($entrate - $uscite),
            ],
            'by_category' => $byCategory,
            'by_project' => $byProject,
        ]);
    }
}

