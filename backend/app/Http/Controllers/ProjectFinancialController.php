<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ProjectFinancialController extends Controller
{
    /**
     * GET /api/crm-projects/{id}/financial-transactions
     * Lista tutte le transazioni finanziarie del progetto (entrate e uscite)
     */
    public function index(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);

        // Transazioni dalla tabella financial_transactions
        $financialTransactions = DB::table('financial_transactions')
            ->where('project_id', $id)
            ->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // Aggiungi aumenti di budget come "entrate" dai settings
        $transactions = [];
        
        if ($project->settings && isset($project->settings['extra_budget'])) {
            foreach ($project->settings['extra_budget'] as $item) {
                $transactions[] = [
                    'id' => 'entrata-budget-' . ($item['added_at'] ?? ''),
                    'type' => 'entrata',
                    'amount_cocchi' => $item['amount'] ?? 0,
                    'description' => 'Aumento budget da ' . ($item['crm_name'] ?? 'CRM'),
                    'category' => 'budget_increase',
                    'transaction_date' => $item['added_at'] ? date('Y-m-d', strtotime($item['added_at'])) : date('Y-m-d'),
                    'reference_number' => null,
                    'document_path' => null,
                    'created_at' => $item['added_at'] ?? now()->toISOString(),
                ];
            }
        }

        // Aggiungi transazioni finanziarie esistenti
        foreach ($financialTransactions as $trans) {
            $transactions[] = [
                'id' => $trans->id,
                'type' => $trans->type,
                'amount_cocchi' => $trans->amount_cocchi,
                'description' => $trans->description,
                'category' => $trans->category,
                'transaction_date' => $trans->transaction_date,
                'reference_number' => $trans->reference_number,
                'document_path' => $trans->document_path,
                'created_at' => $trans->created_at,
            ];
        }

        // Ordina per data
        usort($transactions, function($a, $b) {
            return strtotime($b['transaction_date']) - strtotime($a['transaction_date']);
        });

        // Calcola totali
        $totals = [
            'entrate' => collect($transactions)->where('type', 'entrata')->sum('amount_cocchi'),
            'uscite' => collect($transactions)->where('type', 'uscita')->sum('amount_cocchi'),
        ];
        $totals['saldo'] = $totals['entrate'] - $totals['uscite'];

        return response()->json([
            'success' => true,
            'data' => $transactions,
            'totals' => $totals,
        ]);
    }

    /**
     * POST /api/crm-projects/{id}/financial-transactions
     * Crea una nuova transazione finanziaria
     */
    public function store(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'type' => 'required|in:entrata,uscita',
            'amount_cocchi' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:1000',
            'category' => 'nullable|string|max:100',
            'transaction_date' => 'required|date',
            'reference_number' => 'nullable|string|max:100',
            'document_path' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();
        try {
            $transactionId = DB::table('financial_transactions')->insertGetId([
                'type' => $request->type,
                'amount_cocchi' => $request->amount_cocchi,
                'description' => $request->description,
                'category' => $request->category,
                'project_id' => $id,
                'client_id' => $project->client_id,
                'user_id' => Auth::id(),
                'transaction_date' => $request->transaction_date,
                'reference_number' => $request->reference_number,
                'document_path' => $request->document_path,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Se è un'uscita, aggiorna spent_cocchi del progetto
            if ($request->type === 'uscita') {
                $project->spent_cocchi = ($project->spent_cocchi ?? 0) + $request->amount_cocchi;
                $project->save();
            }

            DB::commit();

            $transaction = DB::table('financial_transactions')->where('id', $transactionId)->first();

            return response()->json([
                'success' => true,
                'message' => 'Transazione creata con successo',
                'data' => $transaction,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating financial transaction: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Errore nella creazione della transazione: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/crm-projects/{id}/crm-involved
     * Lista i CRM coinvolti nel progetto
     */
    public function getCrmInvolved($id)
    {
        $project = CrmProject::findOrFail($id);

        $crmList = [];
        
        // Da settings extra_budget
        if ($project->settings && isset($project->settings['extra_budget']) && is_array($project->settings['extra_budget'])) {
            $uniqueCrm = [];
            foreach ($project->settings['extra_budget'] as $item) {
                $crmId = $item['crm_id'] ?? null;
                if ($crmId) {
                    if (!isset($uniqueCrm[$crmId])) {
                        $crm = DB::table('crm_departments')->where('id', $crmId)->first();
                        if ($crm) {
                            $uniqueCrm[$crmId] = [
                                'id' => $crm->id,
                                'name' => $crm->name,
                                'code' => $crm->code,
                                'total_budget_added' => 0,
                                'first_added_at' => $item['added_at'] ?? null,
                            ];
                        }
                    }
                    if (isset($uniqueCrm[$crmId])) {
                        $uniqueCrm[$crmId]['total_budget_added'] += floatval($item['amount'] ?? 0);
                    }
                }
            }
            $crmList = array_values($uniqueCrm);
        }

        // Da crm_assignments nei settings
        if ($project->settings && isset($project->settings['crm_assignments']) && is_array($project->settings['crm_assignments'])) {
            foreach ($project->settings['crm_assignments'] as $assignment) {
                $crmId = $assignment['crm_department_id'] ?? null;
                if ($crmId) {
                    $found = false;
                    foreach ($crmList as &$crm) {
                        if ($crm['id'] == $crmId) {
                            $found = true;
                            break;
                        }
                    }
                    if (!$found) {
                        $crmObj = DB::table('crm_departments')->where('id', $crmId)->first();
                        if ($crmObj) {
                            $crmList[] = [
                                'id' => $crmObj->id,
                                'name' => $crmObj->name,
                                'code' => $crmObj->code,
                                'total_budget_added' => 0,
                                'first_added_at' => isset($assignment['assigned_at']) ? $assignment['assigned_at'] : null,
                            ];
                        }
                    }
                }
            }
        }

        // Aggiungi anche il CRM principale del progetto
        if ($project->crm_department_id) {
            $found = false;
            foreach ($crmList as $crm) {
                if ($crm['id'] == $project->crm_department_id) {
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $crm = DB::table('crm_departments')->where('id', $project->crm_department_id)->first();
                if ($crm) {
                    $crmList[] = [
                        'id' => $crm->id,
                        'name' => $crm->name,
                        'code' => $crm->code,
                        'total_budget_added' => 0,
                        'first_added_at' => null,
                    ];
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $crmList,
        ]);
    }
}

