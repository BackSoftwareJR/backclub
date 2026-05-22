<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeadController extends Controller
{
    /**
     * Lista leads
     */
    public function index(Request $request)
    {
        $query = Lead::with(['seller.user', 'department', 'convertedClient', 'creator', 'referralUser'])
                     ->withCount('activities');

        // Filtro per venditore
        if ($request->has('seller_id')) {
            if ($request->seller_id === 'unassigned') {
                $query->whereNull('assigned_seller_id');
            } else {
                $query->where('assigned_seller_id', $request->seller_id);
            }
        }

        // Filtro per settore
        if ($request->has('department_id')) {
            $query->where('crm_department_id', $request->department_id);
        }

        // Filtro per stato
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filtro per priorità
        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        // Filtro per leads da seguire
        if ($request->boolean('needs_followup')) {
            $query->needsFollowup();
        }

        // Filtro per leads nuovi
        if ($request->boolean('new_only')) {
            $query->new();
        }

        // Filtro per leads convertiti
        if ($request->has('converted')) {
            if ($request->boolean('converted')) {
                $query->whereNotNull('converted_to_client_id');
            } else {
                $query->whereNull('converted_to_client_id');
            }
        }

        // Filtro per source
        if ($request->has('source')) {
            $query->where('source', $request->source);
        }

        // Filtro per regione
        if ($request->has('region')) {
            $query->where('region', $request->region);
        }

        // Ricerca
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'LIKE', "%{$search}%")
                  ->orWhere('contact_person', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        // Ordinamento
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $leads = $query->paginate($request->input('per_page', 20));

        return response()->json($leads);
    }

    /**
     * Dettaglio lead
     */
    public function show($id)
    {
        $lead = Lead::with([
            'seller.user',
            'department',
            'convertedClient',
            'creator',
            'referralUser',
            'activities.user'
        ])->findOrFail($id);

        // Aggiungi statistiche extra
        $lead->statistics = [
            'is_converted' => $lead->isConverted(),
            'needs_followup' => $lead->needsFollowup(),
            'primary_phone' => $lead->getPrimaryPhone(),
            'primary_email' => $lead->getPrimaryEmail(),
        ];

        return response()->json($lead);
    }

    /**
     * Crea nuovo lead
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'assigned_seller_id' => 'nullable|exists:sellers,id',
            'company_name' => 'required|string|max:255',
            'tipologia' => 'nullable|string|max:100',
            'contact_person' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'phones' => 'nullable|array',
            'phones.*.number' => 'required|string',
            'phones.*.label' => 'nullable|string',
            'phones.*.isPrimary' => 'boolean',
            'emails' => 'nullable|array',
            'emails.*.email' => 'required|email',
            'emails.*.label' => 'nullable|string',
            'emails.*.isPrimary' => 'boolean',
            'crm_department_id' => 'nullable|exists:crm_departments,id',
            'websites' => 'nullable|array',
            'websites.*' => 'url',
            'description' => 'nullable|string',
            'digital_status' => 'nullable|string',
            'pitch_strategy' => 'nullable|string',
            'status' => 'nullable|in:new,contacted,qualified,proposal,negotiation,won,lost',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'estimated_value' => 'nullable|numeric|min:0',
            'expected_close_date' => 'nullable|date',
            'source' => 'nullable|string|max:100',
            'last_contact_date' => 'nullable|date',
            'next_followup_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'referral_user_id' => 'nullable|exists:users,id',
        ]);

        $lead = Lead::create([
            ...$validated,
            'status' => $validated['status'] ?? 'new',
            'priority' => $validated['priority'] ?? 'medium',
            'created_by' => auth()->id(),
        ]);

        // Aggiungi attività di creazione
        $lead->addActivity('note', 'Lead creato', null, auth()->id());

        $lead->load(['seller.user', 'department', 'creator']);

        return response()->json($lead, 201);
    }

    /**
     * Aggiorna lead
     */
    public function update(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);

        $validated = $request->validate([
            'assigned_seller_id' => 'nullable|exists:sellers,id',
            'company_name' => 'sometimes|required|string|max:255',
            'tipologia' => 'nullable|string|max:100',
            'contact_person' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'phones' => 'nullable|array',
            'phones.*.number' => 'required|string',
            'phones.*.label' => 'nullable|string',
            'phones.*.isPrimary' => 'boolean',
            'emails' => 'nullable|array',
            'emails.*.email' => 'required|email',
            'emails.*.label' => 'nullable|string',
            'emails.*.isPrimary' => 'boolean',
            'crm_department_id' => 'nullable|exists:crm_departments,id',
            'websites' => 'nullable|array',
            'websites.*' => 'url',
            'description' => 'nullable|string',
            'digital_status' => 'nullable|string',
            'pitch_strategy' => 'nullable|string',
            'status' => 'nullable|in:new,contacted,qualified,proposal,negotiation,won,lost',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'estimated_value' => 'nullable|numeric|min:0',
            'expected_close_date' => 'nullable|date',
            'source' => 'nullable|string|max:100',
            'last_contact_date' => 'nullable|date',
            'next_followup_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'referral_user_id' => 'nullable|exists:users,id',
        ]);

        $oldStatus = $lead->status;
        
        $lead->update($validated);

        // Se lo stato è cambiato, aggiungi attività
        if (isset($validated['status']) && $oldStatus !== $validated['status']) {
            $lead->addActivity(
                'status_change',
                "Stato cambiato da '{$oldStatus}' a '{$validated['status']}'",
                null,
                auth()->id()
            );
        }

        $lead->load(['seller.user', 'department', 'convertedClient']);

        return response()->json($lead);
    }

    /**
     * Elimina lead
     */
    public function destroy($id)
    {
        $lead = Lead::findOrFail($id);

        // Non permettere eliminazione se convertito
        if ($lead->isConverted()) {
            return response()->json(['error' => 'Impossibile eliminare un lead convertito in cliente'], 400);
        }

        DB::beginTransaction();
        try {
            $lead->activities()->delete();
            $lead->delete();

            DB::commit();

            return response()->json(['message' => 'Lead eliminato con successo']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nell\'eliminazione del lead: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Assegna lead a venditore
     */
    public function assign(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);

        $validated = $request->validate([
            'seller_id' => 'required|exists:sellers,id',
        ]);

        $oldSellerId = $lead->assigned_seller_id;
        $lead->update(['assigned_seller_id' => $validated['seller_id']]);

        // Aggiungi attività
        $sellerName = $lead->seller->user->name ?? 'N/A';
        $lead->addActivity(
            'note',
            $oldSellerId 
                ? "Lead riassegnato a {$sellerName}" 
                : "Lead assegnato a {$sellerName}",
            null,
            auth()->id()
        );

        $lead->load('seller.user');

        return response()->json([
            'message' => 'Lead assegnato con successo',
            'lead' => $lead,
        ]);
    }

    /**
     * Converti lead in cliente
     */
    public function convertToClient(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);

        if ($lead->isConverted()) {
            return response()->json(['error' => 'Lead già convertito in cliente'], 400);
        }

        $validated = $request->validate([
            'copy_data' => 'boolean',
        ]);

        DB::beginTransaction();
        try {
            // Crea cliente
            $clientData = [
                'seller_id' => $lead->assigned_seller_id,
                'company_name' => $lead->company_name,
                'contact_person' => $lead->contact_person,
                'is_active' => 1,
            ];

            // Copia dati se richiesto
            if ($validated['copy_data'] ?? true) {
                $primaryEmail = $lead->getPrimaryEmail();
                $primaryPhone = $lead->getPrimaryPhone();
                
                if ($primaryEmail) {
                    $clientData['email'] = $primaryEmail;
                }
                if ($primaryPhone) {
                    $clientData['phone'] = $primaryPhone;
                }
                if ($lead->websites && count($lead->websites) > 0) {
                    $clientData['sito_web'] = $lead->websites[0];
                }
                if ($lead->description) {
                    $clientData['notes'] = $lead->description;
                }
            }

            $client = Client::create($clientData);

            // Aggiorna lead
            $lead->update([
                'converted_to_client_id' => $client->id,
                'status' => 'won',
            ]);

            // Aggiungi attività
            $lead->addActivity(
                'status_change',
                "Lead convertito in cliente: {$client->company_name}",
                'Conversione completata',
                auth()->id()
            );

            DB::commit();

            return response()->json([
                'message' => 'Lead convertito in cliente con successo',
                'lead' => $lead->load('convertedClient'),
                'client' => $client,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nella conversione del lead: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Aggiungi attività a lead
     */
    public function addActivity(Request $request, $id)
    {
        $lead = Lead::findOrFail($id);

        $validated = $request->validate([
            'activity_type' => 'required|in:call,email,meeting,note,status_change',
            'description' => 'required|string',
            'outcome' => 'nullable|string|max:255',
        ]);

        $activity = $lead->addActivity(
            $validated['activity_type'],
            $validated['description'],
            $validated['outcome'] ?? null,
            auth()->id()
        );

        // Aggiorna data ultimo contatto se è una call, email o meeting
        if (in_array($validated['activity_type'], ['call', 'email', 'meeting'])) {
            $lead->update(['last_contact_date' => now()]);
        }

        $activity->load('user');

        return response()->json([
            'message' => 'Attività aggiunta con successo',
            'activity' => $activity,
        ], 201);
    }

    /**
     * Ottieni timeline attività lead
     */
    public function getActivities($id)
    {
        $lead = Lead::findOrFail($id);

        $activities = $lead->activities()
                          ->with('user')
                          ->orderBy('created_at', 'desc')
                          ->get();

        // Assicurati che email_details sia parsato correttamente
        $activities->transform(function ($activity) {
            if ($activity->activity_type === 'email' && $activity->email_details) {
                // Se email_details è una stringa, parsala
                if (is_string($activity->email_details)) {
                    try {
                        $activity->email_details = json_decode($activity->email_details, true);
                    } catch (\Exception $e) {
                        \Log::error('Errore nel parsing email_details', [
                            'activity_id' => $activity->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }
            return $activity;
        });

        return response()->json($activities);
    }

    /**
     * Importa leads da CSV
     */
    public function importCsv(Request $request)
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240', // 10MB max
            'region' => 'required|string|max:255',
            'seller_id' => 'required|integer|exists:sellers,id',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        $imported = 0;
        $errors = [];
        $lineNumber = 1;

        // Leggi il file CSV
        if (($handle = fopen($path, 'r')) !== false) {
            // Leggi header
            $headers = fgetcsv($handle);
            $lineNumber++;

            // Normalizza header (rimuovi spazi, converti in lowercase)
            $normalizedHeaders = array_map(function($h) {
                return strtolower(trim($h));
            }, $headers);

            // Mappa colonne CSV ai campi del database
            $columnMap = [
                'tipologia' => 'tipologia',
                'nome cliente' => 'company_name',
                'email' => 'email',
                'cellulare' => 'phone',
                'sito web' => 'website',
                'indirizzo' => 'address',
                'stato digitale attuale' => 'digital_status',
                'strategia di pitch & opportunità' => 'pitch_strategy',
            ];

            // Trova gli indici delle colonne
            $columnIndices = [];
            foreach ($columnMap as $csvName => $dbField) {
                $index = array_search($csvName, $normalizedHeaders);
                if ($index !== false) {
                    $columnIndices[$dbField] = $index;
                }
            }

            if (empty($columnIndices)) {
                return response()->json([
                    'error' => 'Formato CSV non valido. Colonne richieste non trovate.',
                    'headers_found' => $normalizedHeaders,
                ], 400);
            }

            // Processa ogni riga
            while (($row = fgetcsv($handle)) !== false) {
                $lineNumber++;
                
                try {
                    $leadData = [
                        'status' => 'new',
                        'priority' => 'medium',
                        'source' => 'csv_import',
                        'created_by' => auth()->id(),
                        'assigned_seller_id' => $validated['seller_id'],
                        'region' => $validated['region'],
                    ];

                    // Estrai dati dalle colonne mappate
                    if (isset($columnIndices['company_name']) && !empty($row[$columnIndices['company_name']])) {
                        $leadData['company_name'] = trim($row[$columnIndices['company_name']]);
                    } else {
                        $errors[] = "Riga $lineNumber: Nome Cliente mancante";
                        continue;
                    }

                    if (isset($columnIndices['tipologia']) && !empty($row[$columnIndices['tipologia']])) {
                        $leadData['tipologia'] = trim($row[$columnIndices['tipologia']]);
                    }

                    if (isset($columnIndices['email']) && !empty($row[$columnIndices['email']])) {
                        $email = trim($row[$columnIndices['email']]);
                        if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                            $leadData['emails'] = [[
                                'email' => $email,
                                'label' => 'Principale',
                                'isPrimary' => true,
                            ]];
                        }
                    }

                    if (isset($columnIndices['phone']) && !empty($row[$columnIndices['phone']])) {
                        $phone = trim($row[$columnIndices['phone']]);
                        $leadData['phones'] = [[
                            'number' => $phone,
                            'label' => 'Cellulare',
                            'isPrimary' => true,
                        ]];
                    }

                    if (isset($columnIndices['website']) && !empty($row[$columnIndices['website']])) {
                        $website = trim($row[$columnIndices['website']]);
                        // Aggiungi http:// se mancante
                        if (!preg_match('/^https?:\/\//', $website)) {
                            $website = 'http://' . $website;
                        }
                        $leadData['websites'] = [$website];
                    }

                    if (isset($columnIndices['address']) && !empty($row[$columnIndices['address']])) {
                        $leadData['address'] = trim($row[$columnIndices['address']]);
                    }

                    if (isset($columnIndices['digital_status']) && !empty($row[$columnIndices['digital_status']])) {
                        $leadData['digital_status'] = trim($row[$columnIndices['digital_status']]);
                    }

                    if (isset($columnIndices['pitch_strategy']) && !empty($row[$columnIndices['pitch_strategy']])) {
                        $leadData['pitch_strategy'] = trim($row[$columnIndices['pitch_strategy']]);
                    }

                    // Crea il lead
                    $lead = Lead::create($leadData);
                    $lead->addActivity('note', 'Lead importato da CSV', null, auth()->id());
                    $imported++;

                } catch (\Exception $e) {
                    $errors[] = "Riga $lineNumber: " . $e->getMessage();
                }
            }

            fclose($handle);
        }

        return response()->json([
            'message' => "Importazione completata",
            'imported' => $imported,
            'errors' => $errors,
            'total_errors' => count($errors),
        ], 200);
    }

    /**
     * Prepara dati lead per wizard preventivo
     */
    public function prepareForQuote($id)
    {
        $lead = Lead::with(['seller', 'department'])->findOrFail($id);

        // Prepara i dati per il wizard preventivo
        $quoteData = [
            'lead_id' => $lead->id,
            'client_info' => [
                'company_name' => $lead->company_name,
                'email' => $lead->getPrimaryEmail() ?? '',
                'phone' => $lead->getPrimaryPhone() ?? '',
                'address' => $lead->address ?? '',
            ],
            'seller_id' => $lead->assigned_seller_id,
            'title' => "Preventivo per {$lead->company_name}",
            'description' => $lead->description ?? '',
            'notes' => $lead->notes ?? '',
        ];

        // Aggiungi informazioni aggiuntive se disponibili
        if ($lead->digital_status) {
            $quoteData['notes'] .= ($quoteData['notes'] ? "\n\n" : '') . "Stato Digitale Attuale: {$lead->digital_status}";
        }
        if ($lead->pitch_strategy) {
            $quoteData['notes'] .= ($quoteData['notes'] ? "\n\n" : '') . "Strategia di Pitch: {$lead->pitch_strategy}";
        }

        // Aggiorna stato lead
        if ($lead->status === 'new') {
            $lead->update(['status' => 'proposal']);
            $lead->addActivity(
                'status_change',
                'Preventivo avviato da lead',
                'Preparazione preventivo',
                auth()->id()
            );
        }

        return response()->json([
            'quote_data' => $quoteData,
            'lead' => $lead,
        ]);
    }

    /**
     * Genera PDF scheda contatto
     */
    public function generatePDF($id)
    {
        $lead = Lead::with(['seller.user', 'department', 'activities.user', 'creator'])
                   ->findOrFail($id);

        try {
            // Verifica se DomPDF è disponibile
            if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
                try {
                    // Usa DomPDF
                    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('leads.pdf', ['lead' => $lead]);
                    
                    $filename = 'scheda_contatto_' . str_replace([' ', '/', '\\'], '_', $lead->company_name) . '_' . date('Y-m-d') . '.pdf';
                    
                    // Restituisci il PDF come download
                    return response($pdf->output(), 200)
                        ->header('Content-Type', 'application/pdf')
                        ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                        ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
                        ->header('Pragma', 'no-cache')
                        ->header('Expires', '0');
                } catch (\Exception $pdfError) {
                    \Log::error('Errore nella generazione PDF con DomPDF: ' . $pdfError->getMessage());
                    // Fallback alla view HTML
                    return response()->view('leads.pdf', ['lead' => $lead], 200)
                        ->header('Content-Type', 'text/html; charset=utf-8');
                }
            } else {
                // DomPDF non disponibile, restituisci HTML
                return response()->view('leads.pdf', ['lead' => $lead], 200)
                    ->header('Content-Type', 'text/html; charset=utf-8');
            }
        } catch (\Exception $e) {
            \Log::error('Errore nella generazione PDF scheda contatto: ' . $e->getMessage());
            return response()->json([
                'error' => 'Errore nella generazione del PDF',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Invia email a contatto
     */
    public function sendEmail(Request $request, $id)
    {
        $validated = $request->validate([
            'to' => 'required|email',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240', // 10MB max per file
        ]);

        try {
            $lead = Lead::with(['seller.user'])->findOrFail($id);

            // Get recipient name
            $recipientName = $lead->contact_person ?? $lead->company_name ?? 'Cliente';
            
            // Get sender name
            $senderName = auth()->user()->name ?? 'BackSoftware';

            // Handle attachments
            $attachmentPaths = [];
            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $path = $file->store('email_attachments', 'public');
                    $attachmentPaths[] = storage_path('app/public/' . $path);
                }
            }

            // Initialize MailService
            $mailService = new \App\Services\MailService();

            // Send email
            $result = $mailService->sendContactEmail(
                $validated['to'],
                $recipientName,
                $validated['subject'],
                $validated['body'],
                $senderName,
                $attachmentPaths
            );

            if ($result['success']) {
                // Verifica che html_body sia presente nel risultato
                $htmlBody = $result['html_body'] ?? null;
                
                // Se html_body non è presente, rigenera l'HTML dal template
                if (empty($htmlBody)) {
                    \Log::warning('html_body non presente nel risultato, rigenerazione dal template', [
                        'lead_id' => $lead->id,
                        'to' => $validated['to']
                    ]);
                    
                    // Rigenera HTML dal template
                    $templatePath = resource_path('views/emails/leads/contatto.php');
                    if (file_exists($templatePath)) {
                        extract([
                            'recipientName' => $recipientName,
                            'body' => $validated['body'],
                            'senderName' => $senderName
                        ]);
                        ob_start();
                        include $templatePath;
                        $htmlBody = ob_get_clean();
                    } else {
                        $htmlBody = nl2br(htmlspecialchars($validated['body'], ENT_QUOTES, 'UTF-8'));
                    }
                }
                
                // Salva i dettagli completi dell'email
                $emailDetails = [
                    'to' => $validated['to'],
                    'to_name' => $recipientName,
                    'from' => auth()->user()->email ?? '',
                    'from_name' => $senderName,
                    'subject' => $validated['subject'],
                    'body' => $validated['body'], // Testo originale inserito dal venditore
                    'html_body' => $htmlBody, // HTML completo generato dal template
                    'attachments' => array_map(function($path) {
                        return basename($path);
                    }, $attachmentPaths),
                    'sent_at' => now()->toISOString()
                ];
                
                // Log per debug
                \Log::info('Saving email details', [
                    'lead_id' => $lead->id,
                    'has_html_body' => !empty($emailDetails['html_body']),
                    'html_body_length' => strlen($emailDetails['html_body'] ?? ''),
                    'html_body_preview' => substr($emailDetails['html_body'] ?? '', 0, 100)
                ]);
                
                // Log activity con dettagli email
                // Usa il cast del model invece di json_encode manuale
                $activity = $lead->activities()->create([
                    'user_id' => auth()->id(),
                    'activity_type' => 'email',
                    'description' => "Email inviata a {$validated['to']}",
                    'outcome' => "Oggetto: {$validated['subject']}",
                    'email_details' => $emailDetails, // Il model farà il cast automatico
                    'created_at' => now(),
                ]);

                // Update last contact date
                $lead->update(['last_contact_date' => now()]);

                \Log::info('Contact email sent successfully', [
                    'lead_id' => $lead->id,
                    'recipient' => $validated['to']
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Email inviata con successo',
                    'data' => [
                        'lead_id' => $lead->id,
                        'recipient' => $validated['to']
                    ]
                ]);
            } else {
                \Log::error('Failed to send contact email', [
                    'lead_id' => $lead->id,
                    'recipient' => $validated['to'],
                    'error' => $result['message'],
                    'error_details' => $result['error'] ?? null
                ]);

                return response()->json([
                    'success' => false,
                    'error' => $result['message'],
                    'error_details' => $result['error'] ?? null
                ], 500);
            }

        } catch (\Exception $e) {
            \Log::error('Exception while sending contact email', [
                'lead_id' => $id,
                'recipient' => $validated['to'] ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Errore nell\'invio dell\'email: ' . $e->getMessage(),
                'error_details' => $e->getTraceAsString()
            ], 500);
        }
    }
}

