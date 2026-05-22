<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use App\Models\CrmDepartment;
use App\Models\Serbatoio;
use App\Models\SerbatoioTransaction;
use App\Models\Contract;
use App\Models\Quote;
use App\Models\Seller;
use App\Models\PaymentPlan;
use App\Models\PaymentPlanInstallment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CrmProjectController extends Controller
{
    /**
     * GET /api/crm-projects
     * Lista tutti i progetti CRM con filtri
     */
    public function index(Request $request)
    {
        $query = CrmProject::with([
            'client',
            'seller.user',
            'manager',
            'crmDepartment',
            'contracts',
            'teamMembers.user'
        ]);

        // Filtro per CRM department
        if ($request->has('crm_department_id') && $request->crm_department_id) {
            $query->where('crm_department_id', $request->crm_department_id);
        }

        // Filtro per code del CRM department
        if ($request->has('crm_department_code') && $request->crm_department_code) {
            // Se si cerca "PROGETTI IN ATTESA", includi anche progetti senza crm_department_id
            if ($request->crm_department_code === 'PROGETTI IN ATTESA') {
                $query->where(function ($q) use ($request) {
                    $q->whereHas('crmDepartment', function ($subQ) use ($request) {
                        $subQ->where('code', $request->crm_department_code);
                    })
                    ->orWhere(function ($subQ) {
                        // Progetti senza crm_department_id e in attesa di presa in carico
                        $subQ->whereNull('crm_department_id')
                             ->where('status', 'in_attesa_presa_carico');
                    });
                });
            } else {
                $query->whereHas('crmDepartment', function ($q) use ($request) {
                    $q->where('code', $request->crm_department_code);
                });
            }
        }

        // Filtro per status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filtro per ricerca
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%')
                  ->orWhereHas('client', function ($clientQuery) use ($search) {
                      $clientQuery->where('company_name', 'like', '%' . $search . '%')
                                   ->orWhere('contact_person', 'like', '%' . $search . '%');
                  })
                  ->orWhereHas('seller.user', function ($sellerQuery) use ($search) {
                      $sellerQuery->where('name', 'like', '%' . $search . '%')
                                   ->orWhere('email', 'like', '%' . $search . '%');
                  });
            });
        }

        // Filtro per cliente
        if ($request->has('client_id') && $request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        // Filtro per venditore
        if ($request->has('seller_id') && $request->seller_id) {
            $query->where('seller_id', $request->seller_id);
        }

        // Ordinamento
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Paginazione
        $perPage = $request->get('per_page', 20);
        $projects = $query->paginate($perPage);

        // Calcola il budget dal piano di pagamento per progetti che non hanno ancora budget assegnato
        foreach ($projects->items() as $project) {
            // Se il progetto non ha budget_cocchi o è 0, calcolalo dal piano di pagamento
            if (!$project->budget_cocchi || $project->budget_cocchi == 0) {
                $calculatedBudget = $this->calculateProjectBudgetFromPaymentPlan($project);
                // Assegna il budget calcolato all'oggetto (non lo salviamo nel DB, solo per la visualizzazione)
                $project->budget_cocchi = $calculatedBudget;
            }
            $this->appendCoverPhotoUrl($project);
        }

        // Calcola statistiche con la stessa logica del filtro principale
        $statsQuery = CrmProject::query();
        
        // Applica gli stessi filtri della query principale
        if ($request->has('crm_department_id') && $request->crm_department_id) {
            $statsQuery->where('crm_department_id', $request->crm_department_id);
        }
        
        if ($request->has('crm_department_code') && $request->crm_department_code) {
            if ($request->crm_department_code === 'PROGETTI IN ATTESA') {
                $statsQuery->where(function ($q) use ($request) {
                    $q->whereHas('crmDepartment', function ($subQ) use ($request) {
                        $subQ->where('code', $request->crm_department_code);
                    })
                    ->orWhere(function ($subQ) {
                        $subQ->whereNull('crm_department_id')
                             ->where('status', 'in_attesa_presa_carico');
                    });
                });
            } else {
                $statsQuery->whereHas('crmDepartment', function ($q) use ($request) {
                    $q->where('code', $request->crm_department_code);
                });
            }
        }
        
        $stats = [
            'total' => (clone $statsQuery)->count(),
            'in_attesa_presa_carico' => (clone $statsQuery)->where('status', 'in_attesa_presa_carico')->count(),
            'preso_in_carico' => (clone $statsQuery)->where('status', 'preso_in_carico')->count(),
            'avviato' => (clone $statsQuery)->where('status', 'avviato')->count(),
            'active' => (clone $statsQuery)->where('status', 'active')->count(),
            'paused' => (clone $statsQuery)->where('status', 'paused')->count(),
            'completed' => (clone $statsQuery)->where('status', 'completed')->count(),
            'archived' => (clone $statsQuery)->where('status', 'archived')->count(),
            'total_budget' => (clone $statsQuery)->sum('budget_cocchi'),
            'total_spent' => (clone $statsQuery)->sum('spent_cocchi'),
        ];

        return response()->json([
            'success' => true,
            'data' => $projects->items(),
            'pagination' => [
                'current_page' => $projects->currentPage(),
                'last_page' => $projects->lastPage(),
                'per_page' => $projects->perPage(),
                'total' => $projects->total(),
            ],
            'stats' => $stats,
        ]);
    }

    /**
     * GET /api/crm-projects/freelance/my-projects
     * Ottiene tutti i progetti dove l'utente corrente è un team member attivo
     */
    public function getFreelanceProjects(Request $request)
    {
        try {
            $userId = Auth::id();
            
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utente non autenticato'
                ], 401);
            }

            // Ottieni tutti i progetti dove l'utente è un team member attivo
            $projects = CrmProject::join('crm_project_team_members', 'crm_projects.id', '=', 'crm_project_team_members.crm_project_id')
                ->where('crm_project_team_members.user_id', $userId)
                ->where('crm_project_team_members.is_active', true)
                ->select('crm_projects.*')
                ->distinct()
                ->with([
                    'client',
                    'seller.user',
                    'manager',
                    'crmDepartment',
                    'teamMembers.user'
                ])
                ->orderBy('crm_projects.created_at', 'desc')
                ->get();

            // Arricchisci ogni progetto con informazioni aggiuntive
            $enrichedProjects = [];
            foreach ($projects as $project) {
                // Calcola il budget dal piano di pagamento se non è ancora assegnato
                try {
                    if (!$project->budget_cocchi || $project->budget_cocchi == 0) {
                        $calculatedBudget = $this->calculateProjectBudgetFromPaymentPlan($project);
                        $project->budget_cocchi = $calculatedBudget;
                    }
                } catch (\Exception $e) {
                    // Se il calcolo del budget fallisce, continua comunque
                    Log::warning("Error calculating budget for project {$project->id}: " . $e->getMessage());
                }

                $enrichedProjects[] = $project;
            }

            return response()->json([
                'success' => true,
                'data' => $enrichedProjects
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getFreelanceProjects: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Errore nel caricamento dei progetti: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/crm-projects/{id}
     * Dettaglio singolo progetto CRM
     */
    public function show($id)
    {
        $project = CrmProject::with([
            'client',
            'seller.user',
            'manager',
            'crmDepartment',
            'contracts.client',
            'contracts.seller.user',
            'contracts.quote',
            'contracts.quote.items',
            'contracts.signedDocuments.creator',
            'teamMembers.user',
            'tasks.assignments.user',
        ])->findOrFail($id);

        // Carica anche i preventivi collegati ai contratti
        if ($project->contracts) {
            foreach ($project->contracts as $contract) {
                if ($contract->quote_id) {
                    $contract->load('quote.items');
                }
            }
        }

        // Calcola il budget dal piano di pagamento se non è ancora assegnato
        if (!$project->budget_cocchi || $project->budget_cocchi == 0) {
            $calculatedBudget = $this->calculateProjectBudgetFromPaymentPlan($project);
            // Assegna il budget calcolato all'oggetto (non lo salviamo nel DB, solo per la visualizzazione)
            $project->budget_cocchi = $calculatedBudget;
        }

        $this->appendCoverPhotoUrl($project);

        return response()->json([
            'success' => true,
            'data' => $project,
        ]);
    }

    /**
     * POST /api/crm-projects
     * Crea nuovo progetto CRM
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'client_id' => 'required|exists:clients,id',
            'seller_id' => 'nullable|exists:sellers,id',
            'crm_department_id' => 'nullable|exists:crm_departments,id',
            'manager_id' => 'nullable|exists:users,id',
            'status' => 'required|in:in_attesa_presa_carico,preso_in_carico,avviato,active,paused,completed,archived',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'budget_cocchi' => 'nullable|numeric|min:0',
            'settings' => 'nullable|array',
            'github_url' => 'nullable|url|max:500',
            'website_url' => 'nullable|url|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $project = CrmProject::create($request->all());

        $project->load(['client', 'seller.user', 'manager', 'crmDepartment']);

        return response()->json([
            'success' => true,
            'message' => 'Progetto creato con successo',
            'data' => $project,
        ], 201);
    }

    /**
     * PUT /api/crm-projects/{id}
     * Aggiorna progetto CRM
     */
    public function update(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'client_id' => 'sometimes|required|exists:clients,id',
            'seller_id' => 'nullable|exists:sellers,id',
            'crm_department_id' => 'nullable|exists:crm_departments,id',
            'manager_id' => 'nullable|exists:users,id',
            'status' => 'sometimes|required|in:in_attesa_presa_carico,preso_in_carico,avviato,active,paused,completed,archived',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'budget_cocchi' => 'nullable|numeric|min:0',
            'spent_cocchi' => 'nullable|numeric|min:0',
            'settings' => 'nullable|array',
            'cover_photo' => 'nullable|string|max:500',
            'github_url' => 'nullable|url|max:500',
            'website_url' => 'nullable|url|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $project->update($request->all());
        $project->load(['client', 'seller.user', 'manager', 'crmDepartment']);
        $this->appendCoverPhotoUrl($project);

        return response()->json([
            'success' => true,
            'message' => 'Progetto aggiornato con successo',
            'data' => $project,
        ]);
    }

    /**
     * DELETE /api/crm-projects/{id}
     * Elimina progetto CRM
     */
    public function destroy($id)
    {
        $project = CrmProject::findOrFail($id);
        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Progetto eliminato con successo',
        ]);
    }

    /**
     * GET /api/crm-projects/dashboard/stats
     * Statistiche dashboard per CRM department
     */
    public function dashboardStats(Request $request)
    {
        $crmDepartmentId = $request->get('crm_department_id');
        $crmDepartmentCode = $request->get('crm_department_code');

        $query = CrmProject::query();

        if ($crmDepartmentId) {
            $query->where('crm_department_id', $crmDepartmentId);
        } elseif ($crmDepartmentCode) {
            // Se si cerca "PROGETTI IN ATTESA", includi anche progetti senza crm_department_id
            if ($crmDepartmentCode === 'PROGETTI IN ATTESA') {
                $query->where(function ($q) use ($crmDepartmentCode) {
                    $q->whereHas('crmDepartment', function ($subQ) use ($crmDepartmentCode) {
                        $subQ->where('code', $crmDepartmentCode);
                    })
                    ->orWhere(function ($subQ) {
                        // Progetti senza crm_department_id e in attesa di presa in carico
                        $subQ->whereNull('crm_department_id')
                             ->where('status', 'in_attesa_presa_carico');
                    });
                });
            } else {
                $query->whereHas('crmDepartment', function ($q) use ($crmDepartmentCode) {
                    $q->where('code', $crmDepartmentCode);
                });
            }
        }

        $stats = [
            'total_projects' => (clone $query)->count(),
            'in_attesa_presa_carico' => (clone $query)->where('status', 'in_attesa_presa_carico')->count(),
            'preso_in_carico' => (clone $query)->where('status', 'preso_in_carico')->count(),
            'avviato' => (clone $query)->where('status', 'avviato')->count(),
            'active_projects' => (clone $query)->where('status', 'active')->count(),
            'paused_projects' => (clone $query)->where('status', 'paused')->count(),
            'completed_projects' => (clone $query)->where('status', 'completed')->count(),
            'archived_projects' => (clone $query)->where('status', 'archived')->count(),
            'total_budget' => (clone $query)->sum('budget_cocchi'),
            'total_spent' => (clone $query)->sum('spent_cocchi'),
            'budget_remaining' => (clone $query)->sum(DB::raw('budget_cocchi - spent_cocchi')),
            'average_budget' => (clone $query)->avg('budget_cocchi'),
            'projects_by_status' => (clone $query)
                ->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * PUT /api/crm-projects/{id}/take-charge
     * Prende in carico un progetto (cambia status da 'in_attesa_presa_carico' a 'preso_in_carico')
     */
    public function takeCharge(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);

        if ($project->status !== 'in_attesa_presa_carico') {
            return response()->json([
                'success' => false,
                'error' => 'Il progetto non è in attesa di presa in carico',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'manager_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $project->update([
            'status' => 'preso_in_carico',
            'manager_id' => $request->manager_id,
        ]);

        $project->load(['client', 'seller.user', 'manager', 'crmDepartment', 'contracts']);

        return response()->json([
            'success' => true,
            'message' => 'Progetto preso in carico con successo',
            'data' => $project,
        ]);
    }

    /**
     * GET /api/crm-projects/{id}/assignment-data
     * Ottiene i dati necessari per l'assegnazione del progetto
     */
    public function getAssignmentData($id)
    {
        Log::info("=== getAssignmentData START per progetto ID: {$id} ===");
        
        $project = CrmProject::with([
            'contracts',
            'contracts.quote',
            'client',
            'seller'
        ])->findOrFail($id);

        Log::info("Progetto trovato: ID={$project->id}, Nome={$project->name}, Client ID={$project->client_id}, Seller ID={$project->seller_id}");

        // Calcola il totale della fattura dal piano di pagamento, contratto o preventivo
        $invoiceTotal = 0;
        $contractId = null;
        $quoteId = null;
        $quote = null;
        
        // Cerca contratto dalla relazione o dai settings (PRIORITÀ: prima trova il contratto)
        $contract = null;
        if ($project->contracts && $project->contracts->count() > 0) {
            $contract = $project->contracts->first();
            $contractId = $contract->id;
            Log::info("Contratto trovato dalla relazione: ID={$contract->id}");
        } elseif ($project->settings && isset($project->settings['contract_id'])) {
            // Se non c'è relazione diretta, cerca il contratto dai settings
            $contract = Contract::with('quote.items.priceListItem')->find($project->settings['contract_id']);
            if ($contract) {
                $contractId = $contract->id;
                Log::info("Contratto trovato dai settings: ID={$contract->id}");
            } else {
                Log::warning("Contratto ID {$project->settings['contract_id']} dai settings non trovato");
            }
        } else {
            Log::info("Nessun contratto trovato per il progetto");
        }

        // Priorità massima: Piano di pagamento associato al contratto (definito dalla segreteria)
        $paymentPlan = null;
        $paymentPlanFound = false;
        
        if ($contract && $invoiceTotal == 0) {
            Log::info("Cercando piano di pagamento per contratto ID: {$contract->id}");
            $paymentPlan = PaymentPlan::where('contract_id', $contract->id)
                ->orderBy('created_at', 'desc')
                ->first();
            
            if ($paymentPlan) {
                $paymentPlanFound = true;
                Log::info("Piano di pagamento trovato per contratto: ID={$paymentPlan->id}");
                // Calcola il totale dalle rate servizi (escludendo rinnovi, poi rinnovi, poi 0)
                $serviceTotal = $this->calculatePaymentPlanServiceTotal($paymentPlan);
                Log::info("Totale calcolato dalle rate: {$serviceTotal}");
                // Usa sempre il risultato, anche se è 0 (significa che non ci sono rate)
                $invoiceTotal = $serviceTotal;
                Log::info("Invoice Total impostato a: {$invoiceTotal} (anche se 0, perché piano di pagamento esiste)");
            } else {
                Log::info("Nessun piano di pagamento trovato per contratto ID: {$contract->id}");
            }
        }
        
        // Priorità 2: Piano di pagamento associato direttamente al progetto
        if (!$paymentPlan && $invoiceTotal == 0) {
            Log::info("Cercando piano di pagamento per progetto ID: {$project->id}");
            $paymentPlan = PaymentPlan::where('project_id', $project->id)
                ->orderBy('created_at', 'desc')
                ->first();
            
            if ($paymentPlan) {
                $paymentPlanFound = true;
                Log::info("Piano di pagamento trovato per progetto: ID={$paymentPlan->id}");
                // Calcola il totale dalle rate servizi (escludendo rinnovi, poi rinnovi, poi 0)
                $serviceTotal = $this->calculatePaymentPlanServiceTotal($paymentPlan);
                Log::info("Totale calcolato dalle rate: {$serviceTotal}");
                // Usa sempre il risultato, anche se è 0 (significa che non ci sono rate)
                $invoiceTotal = $serviceTotal;
                Log::info("Invoice Total impostato a: {$invoiceTotal} (anche se 0, perché piano di pagamento esiste)");
                // Se il piano ha un contratto associato, usalo
                if ($paymentPlan->contract_id && !$contractId) {
                    $contractId = $paymentPlan->contract_id;
                    if (!$contract) {
                        $contract = Contract::with('quote.items.priceListItem')->find($contractId);
                    }
                }
                // Se il piano ha un preventivo associato, usalo
                if ($paymentPlan->quote_id && !$quoteId) {
                    $quoteId = $paymentPlan->quote_id;
                    if (!$quote) {
                        $quote = Quote::with('items.priceListItem')->find($quoteId);
                    }
                }
            } else {
                Log::info("Nessun piano di pagamento trovato per progetto ID: {$project->id}");
            }
        }
        
        // Priorità 3: Piano di pagamento associato al cliente del progetto
        if (!$paymentPlan && $invoiceTotal == 0 && $project->client_id) {
            Log::info("Cercando piano di pagamento per cliente ID: {$project->client_id}");
            $paymentPlan = PaymentPlan::where('client_id', $project->client_id)
                ->orderBy('created_at', 'desc')
                ->first();
            
            if ($paymentPlan) {
                $paymentPlanFound = true;
                Log::info("Piano di pagamento trovato per cliente: ID={$paymentPlan->id}");
                // Calcola il totale dalle rate servizi (escludendo rinnovi, poi rinnovi, poi 0)
                $serviceTotal = $this->calculatePaymentPlanServiceTotal($paymentPlan);
                Log::info("Totale calcolato dalle rate: {$serviceTotal}");
                // Usa sempre il risultato, anche se è 0 (significa che non ci sono rate)
                $invoiceTotal = $serviceTotal;
                Log::info("Invoice Total impostato a: {$invoiceTotal} (anche se 0, perché piano di pagamento esiste)");
            } else {
                Log::info("Nessun piano di pagamento trovato per cliente ID: {$project->client_id}");
            }
        }
        
        // IMPORTANTE: Se abbiamo trovato un piano di pagamento, NON cercare fallback in contratti/quote
        // Il piano di pagamento è la fonte di verità, anche se non ha rate (restituisce 0€)
        if ($paymentPlanFound) {
            Log::info("Piano di pagamento trovato, uso SOLO le rate installments. Invoice Total: {$invoiceTotal}");
        } else {
            // Solo se NON abbiamo trovato un piano di pagamento, cerca fallback in contratti/quote
            // Se abbiamo un contratto ma non abbiamo ancora trovato un totale dal piano di pagamento
            if ($contract && $invoiceTotal == 0) {
                // Priorità 2: total_value del contratto
                if ($contract->total_value && $contract->total_value > 0) {
                    $invoiceTotal = floatval($contract->total_value);
                } 
                // Priorità 3: quote associato al contratto
                elseif ($contract->quote_id) {
                    $quote = Quote::with('items.priceListItem')->find($contract->quote_id);
                    if ($quote) {
                        $quoteId = $quote->id;
                        // Se il preventivo non ha total_amount, ricalcolalo
                        if (!$quote->total_amount || $quote->total_amount == 0) {
                            $quote->recalculateTotals();
                            $quote->refresh();
                        }
                        if ($quote->total_amount && $quote->total_amount > 0) {
                            $invoiceTotal = floatval($quote->total_amount);
                        } else {
                            // Calcola dalla somma degli items se total_amount è ancora 0
                            $invoiceTotal = $this->calculateQuoteTotalFromItems($quote);
                        }
                    }
                }
                // Priorità 4: quote caricato dalla relazione
                elseif ($contract->quote) {
                    $quote = $contract->quote;
                    if (!$quote->relationLoaded('items')) {
                        $quote->load('items.priceListItem');
                    } elseif (!$quote->items->first() || !$quote->items->first()->relationLoaded('priceListItem')) {
                        $quote->load('items.priceListItem');
                    }
                    $quoteId = $quote->id;
                    // Se il preventivo non ha total_amount, ricalcolalo
                    if (!$quote->total_amount || $quote->total_amount == 0) {
                        $quote->recalculateTotals();
                        $quote->refresh();
                    }
                    if ($quote->total_amount && $quote->total_amount > 0) {
                        $invoiceTotal = floatval($quote->total_amount);
                    } else {
                        // Calcola dalla somma degli items se total_amount è ancora 0
                        $invoiceTotal = $this->calculateQuoteTotalFromItems($quote);
                    }
                }
            }
            
            // Se non c'è contratto e non abbiamo ancora trovato un totale, cerca preventivo nei settings
            if ($invoiceTotal == 0 && $project->settings && isset($project->settings['quote_id'])) {
                $quote = Quote::with('items.priceListItem')->find($project->settings['quote_id']);
                if ($quote) {
                    $quoteId = $quote->id;
                    // Se il preventivo non ha total_amount, ricalcolalo
                    if (!$quote->total_amount || $quote->total_amount == 0) {
                        $quote->recalculateTotals();
                        $quote->refresh();
                    }
                    if ($quote->total_amount && $quote->total_amount > 0) {
                        $invoiceTotal = floatval($quote->total_amount);
                    } else {
                        // Calcola dalla somma degli items se total_amount è ancora 0
                        $invoiceTotal = $this->calculateQuoteTotalFromItems($quote);
                    }
                }
            }
            
            // Ultimo tentativo: cerca preventivo collegato al cliente del progetto
            if ($invoiceTotal == 0 && $project->client_id) {
                $quote = Quote::with('items.priceListItem')
                    ->where('client_id', $project->client_id)
                    ->whereIn('status', ['approved', 'contract_requested', 'started', 'completed'])
                    ->orderBy('created_at', 'desc')
                    ->first();
                if ($quote) {
                    $quoteId = $quote->id;
                    // Se il preventivo non ha total_amount, ricalcolalo
                    if (!$quote->total_amount || $quote->total_amount == 0) {
                        $quote->recalculateTotals();
                        $quote->refresh();
                    }
                    if ($quote->total_amount && $quote->total_amount > 0) {
                        $invoiceTotal = floatval($quote->total_amount);
                    } else {
                        // Calcola dalla somma degli items se total_amount è ancora 0
                        $invoiceTotal = $this->calculateQuoteTotalFromItems($quote);
                    }
                }
            }
        }

        Log::info("Invoice Total finale prima del calcolo commissione: {$invoiceTotal}");
        
        // Calcola commissione venditore
        $sellerCommission = 0;
        $sellerCommissionRate = 0;
        $sellerData = null;
        if ($project->seller_id) {
            Log::info("Cercando venditore ID: {$project->seller_id}");
            $seller = Seller::with('user')->find($project->seller_id);
            if ($seller) {
                Log::info("Venditore trovato: ID={$seller->id}, Commission Rate={$seller->commission_rate}");
                if ($seller->commission_rate) {
                    $sellerCommissionRate = floatval($seller->commission_rate);
                    $sellerCommission = $invoiceTotal * ($sellerCommissionRate / 100);
                    Log::info("Commissione calcolata: Rate={$sellerCommissionRate}%, Amount={$sellerCommission}");
                } else {
                    Log::warning("Venditore ID {$seller->id} non ha commission_rate impostato");
                }
                $sellerData = [
                    'id' => $seller->id,
                    'user_id' => $seller->user_id,
                    'commission_rate' => floatval($seller->commission_rate ?? 0),
                    'is_active' => $seller->is_active ?? true,
                    'user' => $seller->user ? [
                        'id' => $seller->user->id,
                        'name' => $seller->user->name,
                        'email' => $seller->user->email,
                    ] : null,
                ];
            } else {
                Log::warning("Venditore ID {$project->seller_id} non trovato");
            }
        } else {
            Log::info("Progetto non ha seller_id associato");
        }

        // Carica riserve (serbatoi con auto_distribution_enabled)
        $serbatoi = Serbatoio::where('is_active', true)
            ->where('auto_distribution_enabled', true)
            ->orderBy('priority_order')
            ->get();

        $reserves = $serbatoi->map(function ($serbatoio) {
            return [
                'id' => $serbatoio->id,
                'name' => $serbatoio->name,
                'percentage' => floatval($serbatoio->auto_distribution_percentage),
                'amount' => 0, // Calcolato dinamicamente nel frontend
                'enabled' => $serbatoio->auto_distribution_enabled,
            ];
        })->toArray();

        // Calcola budget disponibile iniziale (senza riserve selezionate)
        // Nota: invoiceTotal può essere 0 per progetti gratuiti, va bene
        $availableBudget = max(0, $invoiceTotal - $sellerCommission);

        Log::info("=== RISULTATO FINALE ===");
        Log::info("Invoice Total: {$invoiceTotal}");
        Log::info("Seller Commission Rate: {$sellerCommissionRate}%");
        Log::info("Seller Commission: {$sellerCommission}");
        Log::info("Available Budget: {$availableBudget}");
        Log::info("Contract ID: {$contractId}");
        Log::info("Quote ID: {$quoteId}");
        Log::info("Payment Plan ID: " . ($paymentPlan ? $paymentPlan->id : 'null'));
        Log::info("=== getAssignmentData END ===");

        // Restituisci sempre i dati, anche se invoiceTotal è 0 (progetto gratuito)
        return response()->json([
            'success' => true,
            'data' => [
                'invoice_total' => floatval($invoiceTotal), // Sempre un numero, anche se 0
                'seller_commission' => floatval($sellerCommission),
                'seller_commission_rate' => floatval($sellerCommissionRate),
                'seller' => $sellerData,
                'reserves' => $reserves,
                'available_budget' => floatval($availableBudget),
                'contract_id' => $contractId,
                'quote_id' => $quoteId,
                'quote_number' => $quote ? $quote->quote_number : null,
                'contract_number' => $contract ? $contract->contract_number : null,
                'client' => $project->client ? [
                    'id' => $project->client->id,
                    'company_name' => $project->client->company_name,
                    'email' => $project->client->email,
                    'phone' => $project->client->phone,
                    'address' => $project->client->address,
                    'vat_number' => $project->client->vat_number,
                    'partita_iva' => $project->client->partita_iva,
                    'codice_fiscale' => $project->client->codice_fiscale,
                    'ragione_sociale' => $project->client->ragione_sociale,
                    'referente_nome' => $project->client->referente_nome,
                    'referente_cognome' => $project->client->referente_cognome,
                    'referente_telefono' => $project->client->referente_telefono,
                    'referente_email' => $project->client->referente_email,
                    'contact_person' => $project->client->contact_person,
                    'sdi_code' => $project->client->sdi_code,
                    'pec' => $project->client->pec,
                    'iban' => $project->client->iban,
                    'swift' => $project->client->swift,
                    'sito_web' => $project->client->sito_web,
                    'payment_terms' => $project->client->payment_terms,
                    'credit_limit_cocchi' => $project->client->credit_limit_cocchi,
                    'notes' => $project->client->notes,
                ] : null,
            ],
        ]);
    }

    /**
     * Calcola il totale del preventivo dalla somma degli items
     * Usato come fallback quando total_amount non è disponibile
     */
    private function calculateQuoteTotalFromItems($quote): float
    {
        if (!$quote || !$quote->items || $quote->items->count() == 0) {
            return 0;
        }

        // Assicurati che priceListItem sia caricato per tutti gli items
        if (!$quote->items->first() || !$quote->items->first()->relationLoaded('priceListItem')) {
            $quote->load('items.priceListItem');
        }

        // Calcola subtotale dalla somma degli items
        $subtotal = $quote->items->sum(function ($item) {
            // Se l'item ha già un total calcolato e > 0, usalo
            if ($item->total && $item->total > 0) {
                return floatval($item->total);
            }
            
            // Determina il prezzo unitario da usare
            $unitPrice = floatval($item->unit_price);
            
            // Se unit_price è 0, prova a recuperarlo dal price_list_item
            if ($unitPrice == 0 && $item->price_list_item_id) {
                if ($item->priceListItem && $item->priceListItem->base_price) {
                    $unitPrice = floatval($item->priceListItem->base_price);
                } else {
                    // Carica il price_list_item se non è già caricato
                    $priceListItem = \App\Models\PriceListItem::find($item->price_list_item_id);
                    if ($priceListItem && $priceListItem->base_price) {
                        $unitPrice = floatval($priceListItem->base_price);
                    }
                }
            }
            
            // Se ancora 0, non possiamo calcolare il totale
            if ($unitPrice == 0) {
                return 0;
            }
            
            // Calcola subtotale item
            $itemSubtotal = floatval($item->quantity) * $unitPrice;
            $discountAmount = $itemSubtotal * (floatval($item->discount) / 100);
            return $itemSubtotal - $discountAmount;
        });

        // Applica sconto globale se presente
        $discountAmount = 0;
        if ($quote->discount_percentage && $quote->discount_percentage > 0) {
            $discountAmount = $subtotal * (floatval($quote->discount_percentage) / 100);
        } elseif ($quote->discount_amount && $quote->discount_amount > 0) {
            $discountAmount = floatval($quote->discount_amount);
        }

        $subtotalAfterDiscount = $subtotal - $discountAmount;

        // Applica IVA
        $taxPercentage = $quote->tax_percentage ?? 22.00;
        $taxAmount = $subtotalAfterDiscount * (floatval($taxPercentage) / 100);

        // Totale finale
        return $subtotalAfterDiscount + $taxAmount;
    }

    /**
     * Calcola il totale dalle rate servizi del piano di pagamento
     * Priorità: 1) Rate servizi, 2) Rate rinnovi, 3) 0
     * Esclude le rate di rinnovo quando calcola le rate servizi
     */
    private function calculatePaymentPlanServiceTotal($paymentPlan): float
    {
        Log::info("=== calculatePaymentPlanServiceTotal START per piano ID: {$paymentPlan->id} ===");
        
        if (!$paymentPlan) {
            Log::warning("PaymentPlan è null");
            return 0;
        }

        // Carica le rate del piano di pagamento
        $installments = PaymentPlanInstallment::where('payment_plan_id', $paymentPlan->id)
            ->get();

        Log::info("Rate trovate: " . $installments->count());

        // Se non ci sono rate, restituisci 0
        if ($installments->isEmpty()) {
            Log::info("Nessuna rata trovata, restituisco 0");
            return 0;
        }

        // Log di tutte le rate
        foreach ($installments as $inst) {
            Log::info("Rata ID={$inst->id}, Type={$inst->payment_type}, Amount={$inst->amount}, Description={$inst->description}");
        }

        // Filtra solo le rate servizi (escludendo rinnovi)
        $serviceInstallments = $installments->filter(function ($installment) {
            // Se ha payment_type 'renewal', è sicuramente un rinnovo
            if ($installment->payment_type === 'renewal') {
                Log::info("Rata ID {$installment->id} esclusa: payment_type = renewal");
                return false;
            }
            // Se la descrizione contiene "Rinnovo", è un rinnovo anche se il tipo non è corretto
            if ($installment->description && stripos($installment->description, 'rinnovo') !== false) {
                Log::info("Rata ID {$installment->id} esclusa: descrizione contiene 'rinnovo'");
                return false;
            }
            // Solo rate servizi (installment o one_time)
            $isService = $installment->payment_type === 'installment' || $installment->payment_type === 'one_time';
            if ($isService) {
                Log::info("Rata ID {$installment->id} inclusa come servizio: Type={$installment->payment_type}, Amount={$installment->amount}");
            }
            return $isService;
        });

        Log::info("Rate servizi trovate: " . $serviceInstallments->count());

        // PRIORITÀ 1: Se ci sono rate servizi, usa quelle
        if (!$serviceInstallments->isEmpty()) {
            $total = $serviceInstallments->sum(function ($installment) {
                $amount = $installment->amount;
                if ($amount === null) {
                    Log::warning("Rata ID {$installment->id} ha amount null");
                    return 0;
                }
                $floatAmount = floatval($amount);
                Log::info("Aggiungo importo rata servizio ID {$installment->id}: {$floatAmount}");
                return $floatAmount;
            });
            Log::info("Totale calcolato dalle rate servizi: {$total}");
            Log::info("=== calculatePaymentPlanServiceTotal END: {$total} ===");
            return $total;
        }

        // PRIORITÀ 2: Se non ci sono rate servizi, usa SOLO i rinnovi
        $renewalInstallments = $installments->filter(function ($installment) {
            // Rate con payment_type 'renewal'
            if ($installment->payment_type === 'renewal') {
                Log::info("Rata ID {$installment->id} inclusa come rinnovo: Type={$installment->payment_type}, Amount={$installment->amount}");
                return true;
            }
            // Rate con descrizione che contiene "Rinnovo" (per sicurezza)
            if ($installment->description && stripos($installment->description, 'rinnovo') !== false) {
                Log::info("Rata ID {$installment->id} inclusa come rinnovo: descrizione contiene 'rinnovo', Amount={$installment->amount}");
                return true;
            }
            return false;
        });

        Log::info("Rate rinnovi trovate: " . $renewalInstallments->count());

        if (!$renewalInstallments->isEmpty()) {
            $total = $renewalInstallments->sum(function ($installment) {
                $amount = $installment->amount;
                if ($amount === null) {
                    Log::warning("Rata ID {$installment->id} ha amount null");
                    return 0;
                }
                $floatAmount = floatval($amount);
                Log::info("Aggiungo importo rata rinnovo ID {$installment->id}: {$floatAmount}");
                return $floatAmount;
            });
            Log::info("Totale calcolato dalle rate rinnovi: {$total}");
            Log::info("=== calculatePaymentPlanServiceTotal END: {$total} ===");
            return $total;
        }

        // PRIORITÀ 3: Se non ci sono neanche rinnovi, restituisci 0
        Log::info("Nessuna rata servizio né rinnovo trovata, restituisco 0");
        Log::info("=== calculatePaymentPlanServiceTotal END: 0 ===");
        return 0;
    }

    /**
     * Calcola il budget del progetto dal piano di pagamento
     * Usa la stessa logica di calculatePaymentPlanServiceTotal
     */
    private function calculateProjectBudgetFromPaymentPlan($project): float
    {
        // Carica le relazioni necessarie se non sono già caricate
        if (!$project->relationLoaded('contracts')) {
            $project->load('contracts');
        }

        // Cerca contratto dalla relazione o dai settings
        $contract = null;
        if ($project->contracts && $project->contracts->count() > 0) {
            $contract = $project->contracts->first();
        } elseif ($project->settings && isset($project->settings['contract_id'])) {
            $contract = Contract::find($project->settings['contract_id']);
        }

        // Priorità 1: Piano di pagamento associato al contratto
        $paymentPlan = null;
        if ($contract) {
            $paymentPlan = PaymentPlan::where('contract_id', $contract->id)
                ->orderBy('created_at', 'desc')
                ->first();
        }

        // Priorità 2: Piano di pagamento associato direttamente al progetto
        if (!$paymentPlan) {
            $paymentPlan = PaymentPlan::where('project_id', $project->id)
                ->orderBy('created_at', 'desc')
                ->first();
        }

        // Priorità 3: Piano di pagamento associato al cliente del progetto
        if (!$paymentPlan && $project->client_id) {
            $paymentPlan = PaymentPlan::where('client_id', $project->client_id)
                ->orderBy('created_at', 'desc')
                ->first();
        }

        // Se abbiamo un piano di pagamento, calcola il totale
        if ($paymentPlan) {
            return $this->calculatePaymentPlanServiceTotal($paymentPlan);
        }

        // Se non c'è piano di pagamento, restituisci 0
        return 0;
    }

    /**
     * POST /api/crm-projects/{id}/assign
     * Assegna il progetto con budget, riserve e CRM
     */
    public function assign(Request $request, $id)
    {
        $project = CrmProject::with(['contracts', 'seller'])->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'budget' => 'required|numeric|min:0',
            'seller_commission' => 'required|numeric|min:0',
            'reserves' => 'required|array',
            'reserves.*.serbatoio_id' => 'required|exists:serbatoi,id',
            'reserves.*.percentage' => 'required|numeric|min:0|max:100',
            'reserves.*.amount' => 'required|numeric|min:0',
            'crm_assignments' => 'required|array|min:1',
            'crm_assignments.*.crm_department_id' => 'required|exists:crm_departments,id',
            'crm_assignments.*.description' => 'required|string',
            'crm_assignments.*.manager_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Aggiorna il progetto con il budget
            $project->update([
                'budget_cocchi' => $request->budget,
                'status' => 'preso_in_carico',
            ]);

            // Salva le allocazioni delle riserve (per ora solo in settings, poi si aggiorneranno quando si incassa la fattura)
            $settings = $project->settings ?? [];
            $settings['assignment'] = [
                'budget' => $request->budget,
                'seller_commission' => $request->seller_commission,
                'reserves' => $request->reserves,
                'assigned_at' => now()->toISOString(),
                'assigned_by' => Auth::id(),
            ];
            $project->settings = $settings;
            $project->save();

            // Crea le assegnazioni CRM (responsabili di reparto, non Project Manager)
            // Il Project Manager unico si imposta solo dal tab "Project Manager" nel dettaglio progetto
            $firstAssignment = $request->crm_assignments[0];
            $project->update([
                'crm_department_id' => $firstAssignment['crm_department_id'],
                // manager_id (PM unico) non viene impostato qui: si assegna solo dalla scheda Project Manager
            ]);

            // Salva tutte le assegnazioni nei settings per riferimento futuro
            $settings['crm_assignments'] = $request->crm_assignments;
            $project->settings = $settings;
            $project->save();

            // TODO: Quando si incassa una fattura, aggiornare i serbatoi con le riserve
            // e emettere la fattura di pagamento al venditore

            DB::commit();

            $project->load(['client', 'seller.user', 'manager', 'crmDepartment', 'contracts']);

            return response()->json([
                'success' => true,
                'message' => 'Progetto assegnato con successo',
                'data' => $project,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'assegnazione del progetto: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/crm-projects/{id}/add-extra-budget
     * Aggiunge budget extra al progetto prelevandolo dai CRM selezionati
     */
    public function addExtraBudget(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'budget_items' => 'required|array|min:1',
            'budget_items.*.crm_id' => 'required|exists:crm_departments,id',
            'budget_items.*.crm_name' => 'required|string',
            'budget_items.*.amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        DB::beginTransaction();
        try {
            $totalExtraBudget = 0;
            $budgetItems = [];

            foreach ($request->budget_items as $item) {
                $crm = CrmDepartment::findOrFail($item['crm_id']);
                $amount = floatval($item['amount']);

                // Verifica che il CRM abbia budget disponibile sufficiente
                if ($crm->budget_remaining < $amount) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => "Il CRM '{$crm->name}' non ha budget disponibile sufficiente. Disponibile: € " . number_format($crm->budget_remaining, 2, ',', '.'),
                    ], 422);
                }

                // Aggiorna budget_spent del CRM
                $crm->budget_spent += $amount;
                $crm->save();

                // Aggiorna budget_cocchi del progetto
                $project->budget_cocchi = ($project->budget_cocchi ?? 0) + $amount;
                $totalExtraBudget += $amount;

                // Salva informazioni nel settings del progetto
                $settings = $project->settings ?? [];
                if (!isset($settings['extra_budget'])) {
                    $settings['extra_budget'] = [];
                }
                $settings['extra_budget'][] = [
                    'crm_id' => $crm->id,
                    'crm_name' => $crm->name,
                    'amount' => $amount,
                    'reason' => $request->reason,
                    'added_at' => now()->toISOString(),
                    'added_by' => Auth::id(),
                ];
                $project->settings = $settings;
                $project->save();

                $budgetItems[] = [
                    'crm_id' => $crm->id,
                    'crm_name' => $crm->name,
                    'amount' => $amount,
                ];

                // Crea transazione per tracciare il prelievo dal CRM
                // Nota: potremmo voler creare una transazione anche nel serbatoio Budget se necessario
                // Per ora tracciamo solo nel progetto
            }

            DB::commit();

            $project->refresh();

            return response()->json([
                'success' => true,
                'message' => 'Budget extra aggiunto con successo',
                'data' => [
                    'project' => $project,
                    'total_extra_budget' => $totalExtraBudget,
                    'budget_items' => $budgetItems,
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Errore nell\'aggiunta del budget extra: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/crm-projects/{id}/cover-photo
     * Carica la foto copertina del progetto
     */
    public function uploadCover(Request $request, $id)
    {
        $project = CrmProject::findOrFail($id);

        // Accetta 'cover' o 'file' (alcuni client inviano con nome diverso)
        $file = $request->file('cover') ?? $request->file('file');

        $validator = Validator::make($request->all(), [
            'cover' => 'nullable|file|image|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'file' => 'nullable|file|image|mimes:jpeg,jpg,png,gif,webp|max:5120',
        ]);

        if ($validator->fails() || !$file) {
            return response()->json([
                'success' => false,
                'errors' => $file ? $validator->errors() : ['cover' => ['Nessun file immagine ricevuto. Verifica che il form invii il campo "cover" come multipart/form-data.']],
            ], 422);
        }
        // File salvati in storage/app/public/crm-projects/cover-photos/
        $directory = 'crm-projects/cover-photos';
        if (!Storage::disk('public')->exists($directory)) {
            Storage::disk('public')->makeDirectory($directory, 0755, true);
        }

        // Rimuovi vecchia cover (cover_photo può essere link o path legacy)
        if ($project->cover_photo) {
            if (str_starts_with($project->cover_photo, 'http')) {
                $pathToDelete = preg_replace('#^.*/storage/app/public/#', '', $project->cover_photo);
                if ($pathToDelete === $project->cover_photo) {
                    $pathToDelete = preg_replace('#^.*/storage/#', '', $project->cover_photo);
                }
            } else {
                $pathToDelete = $project->cover_photo;
            }
            if ($pathToDelete && Storage::disk('public')->exists($pathToDelete)) {
                Storage::disk('public')->delete($pathToDelete);
            }
        }

        $path = $file->store($directory, 'public');
        // Salva il link completo nel DB (senza /public nel base: .../backend/storage/app/public/...)
        $base = rtrim($request->getSchemeAndHttpHost() . $request->getBasePath(), '/');
        $base = preg_replace('#/public$#', '', $base);
        $coverLink = $base . '/storage/app/public/' . ltrim($path, '/');
        $project->update(['cover_photo' => $coverLink]);
        $project->load(['client', 'seller.user', 'manager', 'crmDepartment']);
        $this->appendCoverPhotoUrl($project);

        return response()->json([
            'success' => true,
            'message' => 'Foto copertina caricata con successo',
            'data' => $project,
        ]);
    }

    /**
     * Imposta cover_photo_url: se cover_photo è già un link lo usa, altrimenti costruisce (legacy path).
     */
    private function appendCoverPhotoUrl($project): void
    {
        if (!$project->cover_photo) {
            $project->cover_photo_url = null;
            return;
        }
        if (str_starts_with($project->cover_photo, 'http')) {
            $url = $project->cover_photo;
            $url = preg_replace('#/public/storage/#', '/storage/', $url);
            if (str_contains($url, '/storage/') && !str_contains($url, '/storage/app/public/')) {
                $url = preg_replace('#/storage/(?!app/public/)#', '/storage/app/public/', $url);
            }
            $project->cover_photo_url = $url;
            return;
        }
        $request = request();
        $base = $request
            ? rtrim($request->getSchemeAndHttpHost() . $request->getBasePath(), '/')
            : rtrim(config('app.url'), '/');
        $base = preg_replace('#/public$#', '', $base);
        $project->cover_photo_url = $base . '/storage/app/public/' . ltrim($project->cover_photo, '/');
    }
}

