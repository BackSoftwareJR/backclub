<?php

namespace App\Http\Controllers;

use App\Models\Seller;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Contract;
use App\Models\Quote;
use App\Models\CrmDepartment;
use App\Models\CrmProject;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class SellerController extends Controller
{
    /**
     * Ottiene lista utenti esistenti che non sono venditori
     * Utile per selezionare un utente esistente da associare come venditore
     */
    public function getAvailableUsers(Request $request)
    {
        $query = User::whereDoesntHave('seller')
            ->where('is_active', 1)
            ->with('userRoles');

        // Ricerca per nome o email
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        // Limite risultati
        $limit = $request->get('limit', 50);
        $users = $query->orderBy('name', 'asc')->limit($limit)->get();

        // Aggiungi informazioni sui ruoli
        $users->each(function($user) {
            $user->roles = $user->userRoles()->pluck('role')->toArray();
        });

        return response()->json($users);
    }

    /**
     * Lista venditori
     */
    public function index(Request $request)
    {
        $query = Seller::with(['user', 'departments', 'currentDepartment']);

        // Filtro per stato attivo
        if ($request->has('is_active')) {
            $isActive = $request->is_active;
            // Converti true/false in 1/0 se necessario
            if (is_bool($isActive) || $isActive === 'true' || $isActive === 'false') {
                $isActive = ($isActive === true || $isActive === 'true' || $isActive === 1) ? 1 : 0;
            }
            $query->where('is_active', $isActive);
        }

        // Filtro per contratti in scadenza
        if ($request->has('expiring_contracts')) {
            $query->expiringContracts($request->input('expiring_contracts', 30));
        }

        // Ricerca
        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        // Include statistiche
        if ($request->boolean('with_stats')) {
            $query->withCount(['clients', 'quotes', 'contracts', 'leads', 'projects']);
        }

        $sellers = $query->orderBy('created_at', 'desc')->get();

        return response()->json($sellers);
    }

    /**
     * Dettaglio venditore
     */
    public function show($id)
    {
        $seller = Seller::with([
            'user',
            'departments.department',
            'clients',
            'quotes',
            'contracts',
            'leads',
            'projects'
        ])->withCount([
            'clients',
            'quotes',
            'contracts',
            'leads',
            'projects'
        ])->findOrFail($id);

        // Aggiungi statistiche extra
        $seller->statistics = [
            'total_contracts_value' => $seller->contracts()->where('status', 'active')->sum('total_value'),
            'pending_quotes_value' => $seller->quotes()->where('status', 'pending')->sum('total_amount'),
            'active_projects_count' => $seller->projects()->where('status', 'active')->count(),
            'leads_by_status' => $seller->leads()
                ->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->pluck('count', 'status'),
            'contract_days_remaining' => $seller->contractDaysRemaining(),
            'is_contract_expired' => $seller->isContractExpired(),
        ];

        return response()->json($seller);
    }

    /**
     * Crea nuovo venditore
     * Supporta sia creazione nuovo utente che associazione a utente esistente
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id', // Se fornito, usa utente esistente
            'name' => 'required_without:user_id|string|max:255',
            'email' => ['required_without:user_id', 'email', Rule::unique('users', 'email')->ignore($request->user_id)],
            'password' => 'required_without:user_id|string|min:8',
            'phone' => 'nullable|string|max:255',
            'contract_start_date' => 'nullable|date',
            'contract_end_date' => 'nullable|date|after:contract_start_date',
            'territory' => 'nullable|array',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'departments' => 'nullable|array',
            'departments.*' => 'exists:crm_departments,id',
        ]);

        DB::beginTransaction();
        try {
            // Verifica se l'utente esiste già come venditore
            if ($request->has('user_id')) {
                $existingUser = User::findOrFail($request->user_id);
                
                // Verifica che non sia già un venditore
                if ($existingUser->seller()->exists()) {
                    DB::rollBack();
                    return response()->json(['error' => 'Questo utente è già un venditore'], 400);
                }
                
                $user = $existingUser;
                
                // Aggiorna dati utente se forniti
                if (isset($validated['name'])) {
                    $user->name = $validated['name'];
                }
                if (isset($validated['email'])) {
                    $user->email = $validated['email'];
                }
                if (isset($validated['phone'])) {
                    $user->phone = $validated['phone'];
                }
                $user->save();
                
                // Aggiungi ruolo "venditori" se non esiste già
                if (!$user->hasRole('venditori')) {
                    // Verifica se l'utente ha già altri ruoli
                    $hasOtherRoles = $user->userRoles()->exists();
                    
                    UserRole::create([
                        'user_id' => $user->id,
                        'role' => 'venditori',
                        'is_primary' => !$hasOtherRoles, // Primary solo se non ha altri ruoli
                    ]);
                }
            } else {
                // Crea nuovo utente
                $user = User::create([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'password' => Hash::make($validated['password']),
                    'phone' => $validated['phone'] ?? null,
                    'role' => 'venditori',
                    'is_active' => 1,
                ]);
                
                // Crea ruolo venditori come ruolo principale
                UserRole::create([
                    'user_id' => $user->id,
                    'role' => 'venditori',
                    'is_primary' => true,
                ]);
                
                // Imposta current_role
                $user->current_role = 'venditori';
                $user->save();
            }

            // Crea venditore
            $seller = Seller::create([
                'user_id' => $user->id,
                'contract_start_date' => $validated['contract_start_date'] ?? null,
                'contract_end_date' => $validated['contract_end_date'] ?? null,
                'territory' => $validated['territory'] ?? null,
                'commission_rate' => $validated['commission_rate'] ?? 10.00,
                'is_active' => 1,
            ]);

            // Assegna settori
            if (!empty($validated['departments'])) {
                foreach ($validated['departments'] as $deptId) {
                    $seller->departments()->attach($deptId, [
                        'is_active' => 1,
                        'currently_working' => 0,
                    ]);
                }
            }

            DB::commit();

            $seller->load(['user', 'departments']);

            return response()->json($seller, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nella creazione del venditore: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Aggiorna venditore
     */
    public function update(Request $request, $id)
    {
        $seller = Seller::with('user')->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($seller->user_id)],
            'phone' => 'nullable|string|max:255',
            'contract_start_date' => 'nullable|date',
            'contract_end_date' => 'nullable|date|after:contract_start_date',
            'territory' => 'nullable|array',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'is_active' => 'sometimes|boolean',
        ]);

        DB::beginTransaction();
        try {
            // Aggiorna utente
            if (isset($validated['name']) || isset($validated['email']) || isset($validated['phone'])) {
                $seller->user->update(array_filter([
                    'name' => $validated['name'] ?? null,
                    'email' => $validated['email'] ?? null,
                    'phone' => $validated['phone'] ?? null,
                ]));
            }

            // Aggiorna venditore
            $seller->update(array_filter([
                'contract_start_date' => $validated['contract_start_date'] ?? null,
                'contract_end_date' => $validated['contract_end_date'] ?? null,
                'territory' => $validated['territory'] ?? null,
                'commission_rate' => $validated['commission_rate'] ?? null,
                'is_active' => $validated['is_active'] ?? null,
            ], function ($value) {
                return !is_null($value);
            }));

            DB::commit();

            $seller->load(['user', 'departments']);

            return response()->json($seller);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nell\'aggiornamento del venditore: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Elimina venditore
     */
    public function destroy($id)
    {
        $seller = Seller::findOrFail($id);

        // Verifica se ha dati associati
        $hasData = $seller->clients()->count() > 0 
                || $seller->quotes()->count() > 0 
                || $seller->contracts()->count() > 0;

        if ($hasData) {
            // Disattiva invece di eliminare
            $seller->update(['is_active' => 0]);
            return response()->json(['message' => 'Venditore disattivato (ha dati associati)']);
        }

        DB::beginTransaction();
        try {
            $user = $seller->user;
            $seller->delete();
            $user->delete();

            DB::commit();

            return response()->json(['message' => 'Venditore eliminato con successo']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nell\'eliminazione del venditore: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Upload contratto
     */
    public function uploadContract(Request $request, $id)
    {
        $seller = Seller::findOrFail($id);

        $validated = $request->validate([
            'contract' => 'required|file|mimes:pdf,doc,docx|max:10240', // Max 10MB
        ]);

        if ($request->hasFile('contract')) {
            // Elimina vecchio file se esiste
            if ($seller->contract_file) {
                Storage::delete($seller->contract_file);
            }

            // Salva nuovo file
            $path = $request->file('contract')->store('contracts/sellers', 'public');
            
            $seller->update(['contract_file' => $path]);

            return response()->json([
                'message' => 'Contratto caricato con successo',
                'contract_file' => $path,
                'contract_url' => Storage::url($path),
            ]);
        }

        return response()->json(['error' => 'Nessun file caricato'], 400);
    }

    /**
     * Aggiorna settori assegnati
     */
    public function updateDepartments(Request $request, $id)
    {
        $seller = Seller::findOrFail($id);

        $validated = $request->validate([
            'departments' => 'required|array',
            'departments.*.id' => 'required|exists:crm_departments,id',
            'departments.*.is_active' => 'boolean',
            'departments.*.currently_working' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            // Sincronizza settori
            $syncData = [];
            foreach ($validated['departments'] as $dept) {
                $syncData[$dept['id']] = [
                    'is_active' => $dept['is_active'] ?? 1,
                    'currently_working' => $dept['currently_working'] ?? 0,
                ];
            }

            $seller->departments()->sync($syncData);

            DB::commit();

            $seller->load('departments');

            return response()->json($seller->departments);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nell\'aggiornamento dei settori: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Aggiorna territorio
     */
    public function updateTerritory(Request $request, $id)
    {
        $seller = Seller::findOrFail($id);

        $validated = $request->validate([
            'territory' => 'required|array',
        ]);

        $seller->update(['territory' => $validated['territory']]);

        return response()->json(['message' => 'Territorio aggiornato con successo', 'territory' => $seller->territory]);
    }

    /**
     * Statistiche dashboard per venditore specifico
     */
    public function dashboardStats(Request $request, $sellerId = null)
    {
        // Se sellerId non è fornito, usa l'utente autenticato
        if (!$sellerId) {
            $user = $request->user();
            if (!$user || !$user->seller_id) {
                return response()->json(['error' => 'Venditore non trovato'], 404);
            }
            $sellerId = $user->seller_id;
        }

        $seller = Seller::findOrFail($sellerId);
        
        // Periodo corrente (ultimo mese)
        $currentPeriodStart = Carbon::now()->startOfMonth();
        $currentPeriodEnd = Carbon::now()->endOfMonth();
        
        // Periodo precedente (mese scorso)
        $previousPeriodStart = Carbon::now()->subMonth()->startOfMonth();
        $previousPeriodEnd = Carbon::now()->subMonth()->endOfMonth();

        // Statistiche preventivi
        $pendingQuotes = $seller->quotes()->where('status', 'pending')->count();
        $approvedQuotes = $seller->quotes()->where('status', 'approved')->count();
        $currentMonthQuotes = $seller->quotes()
            ->whereBetween('created_at', [$currentPeriodStart, $currentPeriodEnd])
            ->count();
        $previousMonthQuotes = $seller->quotes()
            ->whereBetween('created_at', [$previousPeriodStart, $previousPeriodEnd])
            ->count();
        $quotesChange = $previousMonthQuotes > 0 
            ? (($currentMonthQuotes - $previousMonthQuotes) / $previousMonthQuotes) * 100 
            : ($currentMonthQuotes > 0 ? 100 : 0);

        // Statistiche contratti
        $activeContracts = $seller->contracts()->where('status', 'active')->count();
        $totalContractsValue = $seller->contracts()->where('status', 'active')->sum('total_value');
        $currentMonthContracts = $seller->contracts()
            ->where('status', 'active')
            ->whereBetween('created_at', [$currentPeriodStart, $currentPeriodEnd])
            ->count();
        $previousMonthContracts = $seller->contracts()
            ->where('status', 'active')
            ->whereBetween('created_at', [$previousPeriodStart, $previousPeriodEnd])
            ->count();
        $contractsChange = $previousMonthContracts > 0 
            ? (($currentMonthContracts - $previousMonthContracts) / $previousMonthContracts) * 100 
            : ($currentMonthContracts > 0 ? 100 : 0);

        // Statistiche clienti
        $totalClients = $seller->clients()->count();
        $newClientsThisMonth = $seller->clients()
            ->whereBetween('created_at', [$currentPeriodStart, $currentPeriodEnd])
            ->count();

        // Statistiche leads
        $leadsToContact = $seller->leads()
            ->whereIn('status', ['new', 'contacted', 'follow_up'])
            ->where(function($q) {
                $q->whereNull('next_followup_date')
                  ->orWhere('next_followup_date', '<=', Carbon::now());
            })
            ->count();
        $totalLeads = $seller->leads()->count();
        $convertedLeads = $seller->leads()->whereNotNull('converted_to_client_id')->count();
        $conversionRate = $totalLeads > 0 ? ($convertedLeads / $totalLeads) * 100 : 0;

        // Statistiche progetti
        $activeProjects = $seller->projects()->where('status', 'active')->count();
        $totalProjects = $seller->projects()->count();

        // Fatturato mese corrente (da contratti attivati questo mese)
        $currentMonthRevenue = $seller->contracts()
            ->where('status', 'active')
            ->whereBetween('created_at', [$currentPeriodStart, $currentPeriodEnd])
            ->sum('total_value');
        
        // Fatturato mese precedente
        $previousMonthRevenue = $seller->contracts()
            ->where('status', 'active')
            ->whereBetween('created_at', [$previousPeriodStart, $previousPeriodEnd])
            ->sum('total_value');
        
        $revenueChange = $previousMonthRevenue > 0 
            ? (($currentMonthRevenue - $previousMonthRevenue) / $previousMonthRevenue) * 100 
            : ($currentMonthRevenue > 0 ? 100 : 0);

        // Grafico vendite ultimi 30 giorni
        $period = (int) $request->get('period', 30);
        $salesTrend = $this->getSellerSalesTrend($seller, $period);

        // Leads urgenti (da chiamare oggi/questa settimana)
        $urgentLeads = $seller->leads()
            ->whereIn('status', ['new', 'contacted', 'follow_up'])
            ->where(function($q) {
                $q->whereNull('next_followup_date')
                  ->orWhere('next_followup_date', '<=', Carbon::now()->addDays(7));
            })
            ->orderBy('next_followup_date', 'asc')
            ->limit(5)
            ->get()
            ->map(function($lead) {
                return [
                    'id' => $lead->id,
                    'company_name' => $lead->company_name,
                    'contact_person' => $lead->contact_person,
                    'status' => $lead->status,
                    'next_followup_date' => $lead->next_followup_date,
                    'priority' => $lead->priority,
                ];
            });

        // Preventivi recenti
        $recentQuotes = $seller->quotes()
            ->with(['client'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function($quote) {
                return [
                    'id' => $quote->id,
                    'client_name' => $quote->client ? $quote->client->company_name : 'N/A',
                    'total_amount' => $quote->total_amount,
                    'status' => $quote->status,
                    'created_at' => $quote->created_at,
                ];
            });

        // Attività recenti
        $recentActivities = $this->getSellerRecentActivities($sellerId, 10);

        return response()->json([
            'success' => true,
            'data' => [
                // KPI Cards
                'pending_quotes' => $pendingQuotes,
                'active_contracts' => $activeContracts,
                'total_clients' => $totalClients,
                'leads_to_contact' => $leadsToContact,
                'total_revenue' => (float) $totalContractsValue,
                'current_month_revenue' => (float) $currentMonthRevenue,
                'revenue_change' => round($revenueChange, 1),
                'quotes_change' => round($quotesChange, 1),
                'contracts_change' => round($contractsChange, 1),
                'conversion_rate' => round($conversionRate, 1),
                'active_projects' => $activeProjects,
                'new_clients_this_month' => $newClientsThisMonth,
                
                // Grafici
                'sales_trend' => $salesTrend,
                
                // Liste
                'urgent_leads' => $urgentLeads,
                'recent_quotes' => $recentQuotes,
                'recent_activities' => $recentActivities,
            ],
        ]);
    }

    /**
     * Statistiche overview per dashboard venditori (admin)
     */
    public function overviewStats(Request $request)
    {
        // Periodo corrente (ultimo mese)
        $currentPeriodStart = Carbon::now()->startOfMonth();
        $currentPeriodEnd = Carbon::now()->endOfMonth();
        
        // Periodo precedente (mese scorso)
        $previousPeriodStart = Carbon::now()->subMonth()->startOfMonth();
        $previousPeriodEnd = Carbon::now()->subMonth()->endOfMonth();

        // Fatturato totale (somma di tutti i contratti attivi)
        $totalRevenue = Contract::where('status', 'active')
            ->sum('total_value');
        
        // Fatturato del mese corrente (contratti attivati questo mese)
        $currentMonthRevenue = Contract::where('status', 'active')
            ->whereBetween('created_at', [$currentPeriodStart, $currentPeriodEnd])
            ->sum('total_value');
        
        // Fatturato del mese scorso (contratti attivati mese scorso)
        $previousMonthRevenue = Contract::where('status', 'active')
            ->whereBetween('created_at', [$previousPeriodStart, $previousPeriodEnd])
            ->sum('total_value');
        
        $revenueChange = $previousMonthRevenue > 0 
            ? (($currentMonthRevenue - $previousMonthRevenue) / $previousMonthRevenue) * 100 
            : ($currentMonthRevenue > 0 ? 100 : 0);

        // Contratti attivi (tutti)
        $activeContracts = Contract::where('status', 'active')->count();
        
        // Contratti attivati questo mese
        $currentMonthContracts = Contract::where('status', 'active')
            ->whereBetween('created_at', [$currentPeriodStart, $currentPeriodEnd])
            ->count();
        
        // Contratti attivati mese scorso
        $previousMonthContracts = Contract::where('status', 'active')
            ->whereBetween('created_at', [$previousPeriodStart, $previousPeriodEnd])
            ->count();
        
        $contractsChange = $previousMonthContracts > 0 
            ? (($currentMonthContracts - $previousMonthContracts) / $previousMonthContracts) * 100 
            : ($currentMonthContracts > 0 ? 100 : 0);

        // Preventivi pending (tutti)
        $pendingQuotes = Quote::where('status', 'pending')->count();
        
        // Preventivi pending creati questo mese
        $currentMonthPendingQuotes = Quote::where('status', 'pending')
            ->whereBetween('created_at', [$currentPeriodStart, $currentPeriodEnd])
            ->count();
        
        // Preventivi pending creati mese scorso
        $previousMonthPendingQuotes = Quote::where('status', 'pending')
            ->whereBetween('created_at', [$previousPeriodStart, $previousPeriodEnd])
            ->count();
        
        $quotesChange = $previousMonthPendingQuotes > 0 
            ? (($currentMonthPendingQuotes - $previousMonthPendingQuotes) / $previousMonthPendingQuotes) * 100 
            : ($currentMonthPendingQuotes > 0 ? 100 : 0);

        // Venditori attivi
        $activeSellers = Seller::where('is_active', 1)->count();

        // Dati per grafico Andamento Vendite (ultimi 30 giorni)
        $period = (int) $request->get('period', 30); // 7, 30, 90, 365
        $salesTrend = $this->getSalesTrend($period);

        // Dati per grafico Distribuzione per Settore
        $sectorDistribution = $this->getSectorDistribution();

        // Attività recenti
        $recentActivities = $this->getRecentActivities();

        return response()->json([
            'success' => true,
            'data' => [
                'total_revenue' => (float) $totalRevenue,
                'active_contracts' => $activeContracts,
                'pending_quotes' => $pendingQuotes,
                'active_sellers' => $activeSellers,
                'revenue_change' => round($revenueChange, 1),
                'contracts_change' => round($contractsChange, 1),
                'quotes_change' => round($quotesChange, 1),
                'sales_trend' => $salesTrend,
                'sector_distribution' => $sectorDistribution,
                'recent_activities' => $recentActivities,
            ],
        ]);
    }

    /**
     * Dati per grafico Andamento Vendite
     * Prende i dati dai preventivi, considerando la data di avvio del progetto come data di chiusura
     */
    private function getSalesTrend($days = 30)
    {
        $startDate = Carbon::now()->subDays($days)->startOfDay();
        $endDate = Carbon::now()->endOfDay();

        // Prendi tutti i preventivi con le relazioni necessarie
        $quotes = Quote::with(['contract' => function ($query) {
            $query->with('project');
        }])
            ->whereNotNull('total_amount')
            ->where('total_amount', '>', 0)
            ->get();

        // Raggruppa per data di vendita (data avvio progetto o data creazione preventivo)
        $salesByDate = [];
        
        foreach ($quotes as $quote) {
            // Determina la data di vendita
            $saleDate = Carbon::parse($quote->created_at);
            
            // Se il preventivo ha un contratto con progetto avviato, usa la data di avvio del progetto
            if ($quote->contract && $quote->contract->crm_project_id && $quote->contract->project) {
                $project = $quote->contract->project;
                if ($project->start_date) {
                    $saleDate = Carbon::parse($project->start_date);
                }
            }
            
            // Filtra solo le date nel periodo richiesto
            if ($saleDate >= $startDate && $saleDate <= $endDate) {
                $dateKey = $saleDate->format('Y-m-d');
                
                if (!isset($salesByDate[$dateKey])) {
                    $salesByDate[$dateKey] = [
                        'date' => $dateKey,
                        'revenue' => 0,
                        'count' => 0,
                    ];
                }
                
                $salesByDate[$dateKey]['revenue'] += (float) $quote->total_amount;
                $salesByDate[$dateKey]['count'] += 1;
            }
        }

        // Crea array completo di tutti i giorni (o ogni 7 giorni se periodo > 90)
        $trend = [];
        $current = $startDate->copy();
        $step = $days > 90 ? 7 : 1; // Per periodi lunghi, mostra ogni settimana
        
        while ($current <= $endDate) {
            $dateStr = $current->format('Y-m-d');
            
            // Per periodi lunghi, mostra solo date multiple di 7
            if ($step === 7 && $current->dayOfWeek !== 1) {
                $current->addDay();
                continue;
            }
            
            $trend[] = [
                'date' => $current->format('d/m'),
                'revenue' => (float) ($salesByDate[$dateStr]['revenue'] ?? 0),
                'count' => (int) ($salesByDate[$dateStr]['count'] ?? 0),
            ];
            
            $current->addDays($step);
        }

        return $trend;
    }

    /**
     * Dati per grafico Distribuzione per Settore
     */
    private function getSectorDistribution()
    {
        $distribution = Quote::select(
                'crm_department_id',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(total_amount) as total')
            )
            ->whereNotNull('crm_department_id')
            ->groupBy('crm_department_id')
            ->get()
            ->map(function ($item) {
                $department = CrmDepartment::find($item->crm_department_id);
                return [
                    'department_id' => $item->crm_department_id,
                    'department_name' => $department ? $department->name : 'N/A',
                    'department_code' => $department ? $department->code : 'N/A',
                    'count' => (int) $item->count,
                    'total' => (float) $item->total,
                ];
            })
            ->sortByDesc('total')
            ->values()
            ->toArray();

        return $distribution;
    }

    /**
     * Attività recenti
     */
    private function getRecentActivities($limit = 10)
    {
        $activities = [];

        // Ultimi preventivi creati
        $recentQuotes = Quote::with(['client', 'seller.user', 'department'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        foreach ($recentQuotes as $quote) {
            $activities[] = [
                'type' => 'quote_created',
                'title' => 'Nuovo preventivo creato',
                'description' => $quote->client ? $quote->client->company_name : 'Cliente sconosciuto',
                'timestamp' => $quote->created_at,
                'icon' => 'FileText',
            ];
        }

        // Ultimi contratti attivati
        $recentContracts = Contract::with(['client', 'seller.user'])
            ->where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        foreach ($recentContracts as $contract) {
            $activities[] = [
                'type' => 'contract_activated',
                'title' => 'Contratto attivato',
                'description' => $contract->client ? $contract->client->company_name : 'Cliente sconosciuto',
                'timestamp' => $contract->created_at,
                'icon' => 'TrendingUp',
            ];
        }

        // Ordina per timestamp e prendi i più recenti
        usort($activities, function ($a, $b) {
            return $b['timestamp']->timestamp - $a['timestamp']->timestamp;
        });

        // Formatta timestamp per il frontend
        return array_slice(array_map(function ($activity) {
            $activity['time_ago'] = $this->formatTimeAgo($activity['timestamp']);
            $activity['timestamp'] = $activity['timestamp']->toIso8601String();
            return $activity;
        }, $activities), 0, $limit);
    }

    /**
     * Dati per grafico Andamento Vendite per venditore specifico
     */
    private function getSellerSalesTrend($seller, $days = 30)
    {
        $startDate = Carbon::now()->subDays($days)->startOfDay();
        $endDate = Carbon::now()->endOfDay();

        // Prendi tutti i preventivi del venditore con le relazioni necessarie
        $quotes = $seller->quotes()
            ->with(['contract' => function ($query) {
                $query->with('project');
            }])
            ->whereNotNull('total_amount')
            ->where('total_amount', '>', 0)
            ->get();

        // Raggruppa per data di vendita (data avvio progetto o data creazione preventivo)
        $salesByDate = [];
        
        foreach ($quotes as $quote) {
            // Determina la data di vendita
            $saleDate = Carbon::parse($quote->created_at);
            
            // Se il preventivo ha un contratto con progetto avviato, usa la data di avvio del progetto
            if ($quote->contract && $quote->contract->crm_project_id && $quote->contract->project) {
                $project = $quote->contract->project;
                if ($project->start_date) {
                    $saleDate = Carbon::parse($project->start_date);
                }
            }
            
            // Filtra solo le date nel periodo richiesto
            if ($saleDate >= $startDate && $saleDate <= $endDate) {
                $dateKey = $saleDate->format('Y-m-d');
                
                if (!isset($salesByDate[$dateKey])) {
                    $salesByDate[$dateKey] = [
                        'date' => $dateKey,
                        'revenue' => 0,
                        'count' => 0,
                    ];
                }
                
                $salesByDate[$dateKey]['revenue'] += (float) $quote->total_amount;
                $salesByDate[$dateKey]['count'] += 1;
            }
        }

        // Crea array completo di tutti i giorni (o ogni 7 giorni se periodo > 90)
        $trend = [];
        $current = $startDate->copy();
        $step = $days > 90 ? 7 : 1; // Per periodi lunghi, mostra ogni settimana
        
        while ($current <= $endDate) {
            $dateStr = $current->format('Y-m-d');
            
            // Per periodi lunghi, mostra solo date multiple di 7
            if ($step === 7 && $current->dayOfWeek !== 1) {
                $current->addDay();
                continue;
            }
            
            $trend[] = [
                'date' => $current->format('d/m'),
                'revenue' => (float) ($salesByDate[$dateStr]['revenue'] ?? 0),
                'count' => (int) ($salesByDate[$dateStr]['count'] ?? 0),
            ];
            
            $current->addDays($step);
        }

        return $trend;
    }

    /**
     * Attività recenti per venditore specifico
     */
    private function getSellerRecentActivities($sellerId, $limit = 10)
    {
        $seller = Seller::findOrFail($sellerId);
        $activities = [];

        // Ultimi preventivi creati
        $recentQuotes = $seller->quotes()
            ->with(['client'])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        foreach ($recentQuotes as $quote) {
            $activities[] = [
                'type' => 'quote_created',
                'title' => 'Preventivo creato',
                'description' => $quote->client ? $quote->client->company_name : 'Cliente sconosciuto',
                'timestamp' => $quote->created_at,
                'icon' => 'FileText',
            ];
        }

        // Ultimi contratti attivati
        $recentContracts = $seller->contracts()
            ->with(['client'])
            ->where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        foreach ($recentContracts as $contract) {
            $activities[] = [
                'type' => 'contract_activated',
                'title' => 'Contratto attivato',
                'description' => $contract->client ? $contract->client->company_name : 'Cliente sconosciuto',
                'timestamp' => $contract->created_at,
                'icon' => 'TrendingUp',
            ];
        }

        // Ordina per timestamp e prendi i più recenti
        usort($activities, function ($a, $b) {
            return $b['timestamp']->timestamp - $a['timestamp']->timestamp;
        });

        // Formatta timestamp per il frontend
        return array_slice(array_map(function ($activity) {
            $activity['time_ago'] = $this->formatTimeAgo($activity['timestamp']);
            $activity['timestamp'] = $activity['timestamp']->toIso8601String();
            return $activity;
        }, $activities), 0, $limit);
    }

    /**
     * Formatta timestamp in formato "X ore fa", "X giorni fa", ecc.
     */
    private function formatTimeAgo($timestamp)
    {
        $now = Carbon::now();
        $diff = $now->diffInMinutes($timestamp);

        if ($diff < 60) {
            return $diff . ' minuti fa';
        } elseif ($diff < 1440) {
            $hours = floor($diff / 60);
            return $hours . ($hours === 1 ? ' ora fa' : ' ore fa');
        } else {
            $days = floor($diff / 1440);
            return $days . ($days === 1 ? ' giorno fa' : ' giorni fa');
        }
    }
}

