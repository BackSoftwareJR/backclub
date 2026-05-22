<?php

namespace App\Http\Controllers;

use App\Models\Contract;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ContractController extends Controller
{
    /**
     * Lista contratti
     */
    public function index(Request $request)
    {
        $query = Contract::with(['client', 'seller.user', 'project', 'quote', 'creator']);

        // Filtro per cliente
        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        // Filtro per venditore
        if ($request->has('seller_id')) {
            $query->where('seller_id', $request->seller_id);
        }

        // Filtro per progetto
        if ($request->has('project_id')) {
            $query->where('crm_project_id', $request->project_id);
        }

        // Filtro per stato
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filtro per tipo contratto
        if ($request->has('contract_type')) {
            $query->where('contract_type', $request->contract_type);
        }

        // Filtro per contratti in scadenza
        if ($request->boolean('expiring_soon')) {
            $query->expiringSoon($request->input('expiring_days', 30));
        }

        // Filtro per contratti firmati
        if ($request->has('signed')) {
            if ($request->boolean('signed')) {
                $query->whereNotNull('signed_at')->whereNotNull('signed_file');
            } else {
                $query->whereNull('signed_at');
            }
        }

        // Ricerca
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('contract_number', 'LIKE', "%{$search}%")
                  ->orWhere('title', 'LIKE', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('company_name', 'LIKE', "%{$search}%");
                  });
            });
        }

        // Ordinamento
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Vista raggruppata per
        $groupBy = $request->input('group_by');
        if ($groupBy) {
            // TODO: implementare raggruppamento
        }

        $contracts = $query->paginate($request->input('per_page', 15));

        return response()->json($contracts);
    }

    /**
     * Dettaglio contratto
     */
    public function show($id)
    {
        $contract = Contract::with([
            'client',
            'seller.user',
            'project.crmDepartment',
            'quote.items',
            'quote.client',
            'quote.seller.user',
            'creator',
            'revisions.creator',
            'signedDocuments.creator'
        ])->findOrFail($id);

        // Forza il caricamento esplicito dei signedDocuments
        $contract->load('signedDocuments.creator');

        // Aggiungi statistiche extra
        $contract->statistics = [
            'days_remaining' => $contract->daysRemaining(),
            'is_signed' => $contract->isSigned(),
            'is_active' => $contract->isActive(),
        ];

        // Converti in array e poi in JSON per assicurarsi che tutte le relazioni siano incluse
        $contractArray = $contract->toArray();
        
        // Debug: verifica che i signedDocuments siano presenti
        \Log::info('Contract show - signedDocuments in array: ' . (isset($contractArray['signed_documents']) ? 'YES' : 'NO'));
        if (isset($contractArray['signed_documents'])) {
            \Log::info('Contract show - signedDocuments count: ' . count($contractArray['signed_documents']));
        }

        return response()->json($contractArray);
    }

    /**
     * Crea nuovo contratto
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'quote_id' => 'nullable|exists:quotes,id',
            'client_id' => 'required|exists:clients,id',
            'seller_id' => 'nullable|exists:sellers,id',
            'crm_project_id' => 'nullable|exists:crm_projects,id',
            'title' => 'required|string|max:255',
            'contract_type' => 'nullable|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'total_value' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:draft,requested,pending_signature,active,suspended,completed,terminated',
        ]);

        $contract = Contract::create([
            ...$validated,
            'status' => $validated['status'] ?? 'draft',
            'created_by' => auth()->id(),
        ]);

        $contract->load(['client', 'seller.user', 'project', 'quote']);

        return response()->json($contract, 201);
    }

    /**
     * Aggiorna contratto
     */
    public function update(Request $request, $id)
    {
        $contract = Contract::findOrFail($id);

        $validated = $request->validate([
            'quote_id' => 'nullable|exists:quotes,id',
            'client_id' => 'sometimes|required|exists:clients,id',
            'seller_id' => 'nullable|exists:sellers,id',
            'crm_project_id' => 'nullable|exists:crm_projects,id',
            'title' => 'sometimes|required|string|max:255',
            'contract_type' => 'nullable|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'total_value' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:draft,requested,pending_signature,active,suspended,completed,terminated',
        ]);

        $contract->update($validated);

        $contract->load(['client', 'seller.user', 'project', 'quote']);

        return response()->json($contract);
    }

    /**
     * Elimina contratto
     */
    public function destroy($id)
    {
        $contract = Contract::findOrFail($id);

        // Non permettere eliminazione se attivo
        if ($contract->status === 'active') {
            return response()->json(['error' => 'Impossibile eliminare un contratto attivo. Cambiare prima lo stato.'], 400);
        }

        DB::beginTransaction();
        try {
            // Elimina file associati se presenti
            if ($contract->contract_file) {
                Storage::delete($contract->contract_file);
            }
            if ($contract->signed_file) {
                Storage::delete($contract->signed_file);
            }

            $contract->delete();

            DB::commit();

            return response()->json(['message' => 'Contratto eliminato con successo']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nell\'eliminazione del contratto: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Upload file contratto
     */
    public function uploadFile(Request $request, $id)
    {
        $contract = Contract::findOrFail($id);

        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx|max:10240', // Max 10MB
            'is_revision' => 'nullable|boolean',
            'revision_notes' => 'nullable|string',
        ]);

        if ($request->hasFile('file')) {
            $isRevision = $request->boolean('is_revision', false);

            if ($isRevision) {
                // Crea una nuova revisione
                $lastRevision = \App\Models\ContractRevision::where('contract_id', $contract->id)
                    ->orderBy('revision_number', 'desc')
                    ->first();
                
                $revisionNumber = $lastRevision ? $lastRevision->revision_number + 1 : 1;
                
                $path = $request->file('file')->store('contracts/revisions', 'public');
                
                $revision = \App\Models\ContractRevision::create([
                    'contract_id' => $contract->id,
                    'revision_number' => $revisionNumber,
                    'contract_file' => $path,
                    'notes' => $validated['revision_notes'] ?? null,
                    'created_by' => auth()->id(),
                ]);

                // Aggiorna anche il file principale del contratto
                if ($contract->contract_file) {
                    Storage::delete($contract->contract_file);
                }
                $contract->update(['contract_file' => $path]);

                return response()->json([
                    'message' => 'Revisione contratto caricata con successo',
                    'revision' => $revision,
                    'contract_file' => $path,
                    'contract_url' => Storage::url($path),
                ]);
            } else {
            // Elimina vecchio file se esiste
            if ($contract->contract_file) {
                Storage::delete($contract->contract_file);
            }

            // Salva nuovo file
            $path = $request->file('file')->store('contracts', 'public');
            
                // Se lo stato è 'requested' o 'draft', passa automaticamente a 'pending_signature'
                $updateData = ['contract_file' => $path];
                if (in_array($contract->status, ['requested', 'draft'])) {
                    $updateData['status'] = 'pending_signature';
                }
                
                $contract->update($updateData);

            return response()->json([
                'message' => 'File contratto caricato con successo',
                'contract_file' => $path,
                'contract_url' => Storage::url($path),
                    'status' => $contract->status,
            ]);
            }
        }

        return response()->json(['error' => 'Nessun file caricato'], 400);
    }

    /**
     * Upload contratto firmato
     */
    public function uploadSignedFile(Request $request, $id)
    {
        $contract = Contract::findOrFail($id);

        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240', // Solo PDF per firmati
            'signed_at' => 'nullable|date',
        ]);

        if ($request->hasFile('file')) {
            // Elimina vecchio file se esiste
            if ($contract->signed_file) {
                Storage::delete($contract->signed_file);
            }

            // Salva nuovo file
            $path = $request->file('file')->store('contracts/signed', 'public');
            
            $contract->update([
                'signed_file' => $path,
                'signed_at' => $validated['signed_at'] ?? now(),
            ]);

            return response()->json([
                'message' => 'Contratto firmato caricato con successo',
                'signed_file' => $path,
                'signed_url' => Storage::url($path),
                'signed_at' => $contract->signed_at,
            ]);
        }

        return response()->json(['error' => 'Nessun file caricato'], 400);
    }

    /**
     * Ottieni revisioni contratto
     */
    public function getRevisions($id)
    {
        $contract = Contract::findOrFail($id);
        $revisions = \App\Models\ContractRevision::where('contract_id', $contract->id)
            ->with('creator')
            ->orderBy('revision_number', 'asc')
            ->get();

        return response()->json($revisions);
    }

    /**
     * Avvia progetto da contratto firmato
     */
    public function startProject(Request $request, $id)
    {
        $contract = Contract::with(['quote', 'quote.items', 'client', 'seller', 'seller.user'])->findOrFail($id);

        // Verifica che il contratto sia firmato e attivo
        if (!$contract->isSigned() || $contract->status !== 'active') {
            return response()->json(['error' => 'Il contratto deve essere firmato e attivo prima di avviare il progetto'], 400);
        }

        // Verifica che non esista già un progetto collegato
        if ($contract->crm_project_id) {
            return response()->json([
                'error' => 'Esiste già un progetto collegato a questo contratto',
                'project_id' => $contract->crm_project_id
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Trova il CRM "PROGETTI IN ATTESA"
            $waitingDepartment = \App\Models\CrmDepartment::where('code', 'PROGETTI IN ATTESA')
                ->orWhere('name', 'LIKE', '%PROGETTI IN ATTESA%')
                ->first();

            if (!$waitingDepartment) {
                throw new \Exception('CRM "PROGETTI IN ATTESA" non trovato. Assicurati che esista nel database.');
            }

            // Prepara la descrizione completa del progetto
            $description = "Progetto creato automaticamente da contratto {$contract->contract_number}\n\n";
            $description .= "Contratto: {$contract->title}\n";
            if ($contract->quote) {
                $description .= "Preventivo: {$contract->quote->quote_number}\n";
                if ($contract->quote->description) {
                    $description .= "Descrizione preventivo: {$contract->quote->description}\n";
                }
            }
            if ($contract->notes) {
                $description .= "\nNote contratto: {$contract->notes}\n";
            }
            if ($contract->total_value) {
                $description .= "\nValore totale: € " . number_format($contract->total_value, 2, ',', '.') . "\n";
            }

            // Prepara le informazioni del progetto nelle settings
            $settings = [
                'contract_id' => $contract->id,
                'contract_number' => $contract->contract_number,
                'quote_id' => $contract->quote_id,
                'quote_number' => $contract->quote ? $contract->quote->quote_number : null,
                'created_from' => 'contract',
                'created_at' => now()->toIso8601String(),
            ];

            // Se c'è un preventivo, aggiungi informazioni sugli items
            if ($contract->quote && $contract->quote->items) {
                $settings['quote_items'] = $contract->quote->items->map(function ($item) {
                    return [
                        'description' => $item->description,
                        'quantity' => $item->quantity,
                        'unit_price' => $item->unit_price,
                        'total' => $item->total,
                    ];
                })->toArray();
            }

            // Crea progetto completo dal contratto
            $projectData = [
                'name' => $contract->title ?: 'Progetto - ' . $contract->contract_number,
                'description' => $description,
                'client_id' => $contract->client_id,
                'seller_id' => $contract->seller_id,
                'crm_department_id' => $waitingDepartment->id,
                'status' => 'in_attesa_presa_carico', // Stato iniziale: in attesa di presa in carico dal project manager
                'start_date' => $contract->start_date ?: now(),
                'end_date' => $contract->end_date,
                'budget_cocchi' => $contract->total_value ?: 0,
                'spent_cocchi' => 0,
                'settings' => $settings,
            ];

            // Aggiungi created_by se il campo esiste nella tabella
            $project = \App\Models\CrmProject::create($projectData);

            // Collega contratto al progetto
            $contract->update([
                'crm_project_id' => $project->id,
                'status' => 'active',
            ]);

            // Aggiorna lo stato del preventivo associato a 'started' quando viene avviato il progetto
            if ($contract->quote) {
                $contract->quote->update(['status' => 'started']);
            }

            DB::commit();

            // Ricarica il progetto con tutte le relazioni
            $project->load(['client', 'seller.user', 'crmDepartment', 'contracts']);

            return response()->json([
                'message' => 'Progetto creato con successo e assegnato a "PROGETTI IN ATTESA"',
                'project' => $project,
                'contract' => $contract->load('project'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Errore nell\'avvio progetto da contratto: ' . $e->getMessage(), [
                'contract_id' => $id,
                'error' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Errore nell\'avvio del progetto: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Aggiorna stato contratto
     */
    public function updateStatus(Request $request, $id)
    {
        $contract = Contract::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:draft,requested,pending_signature,active,suspended,completed,terminated',
        ]);

        $contract->update(['status' => $validated['status']]);

        $contract->load(['client', 'seller.user', 'project', 'quote']);

        return response()->json([
            'message' => 'Stato contratto aggiornato con successo',
            'contract' => $contract,
        ]);
    }

    /**
     * Collega contratto a progetto
     */
    public function linkToProject(Request $request, $id)
    {
        $contract = Contract::findOrFail($id);

        $validated = $request->validate([
            'crm_project_id' => 'required|exists:crm_projects,id',
        ]);

        $contract->update(['crm_project_id' => $validated['crm_project_id']]);

        $contract->load('project');

        return response()->json([
            'message' => 'Contratto collegato al progetto con successo',
            'contract' => $contract,
        ]);
    }

    /**
     * Ottieni documenti firmati aggiuntivi
     */
    public function getSignedDocuments($id)
    {
        $contract = Contract::findOrFail($id);
        $documents = \App\Models\ContractSignedDocument::where('contract_id', $contract->id)
            ->with('creator')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
    }

    /**
     * Upload documento firmato aggiuntivo
     */
    public function uploadSignedDocument(Request $request, $id)
    {
        $contract = Contract::findOrFail($id);

        $validated = $request->validate([
            'file' => 'nullable|file|mimes:pdf|max:10240', // Opzionale se c'è external_url
            'external_url' => 'nullable|url|max:500', // URL esterno (es. Google Drive)
            'document_type' => 'required|in:privacy_policy,consent_personal_data,other',
            'document_name' => 'required|string|max:255',
            'signed_at' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        // Per consent_personal_data, accetta solo external_url
        if ($validated['document_type'] === 'consent_personal_data') {
            if (empty($validated['external_url'])) {
                return response()->json(['error' => 'Per il consenso trattamento dati è richiesto un link di Google Drive'], 400);
            }
            
            // Verifica se esiste già un consenso per questo contratto e aggiornalo invece di crearne uno nuovo
            $existingConsent = \App\Models\ContractSignedDocument::where('contract_id', $contract->id)
                ->where('document_type', 'consent_personal_data')
                ->first();
            
            if ($existingConsent) {
                // Aggiorna il documento esistente
                $existingConsent->update([
                    'external_url' => $validated['external_url'],
                    'file_path' => null,
                    'document_name' => $validated['document_name'],
                    'signed_at' => $validated['signed_at'] ?? now(),
                    'notes' => $validated['notes'] ?? null,
                ]);
                $document = $existingConsent->fresh();
            } else {
                // Crea un nuovo documento
                $document = \App\Models\ContractSignedDocument::create([
                    'contract_id' => $contract->id,
                    'document_type' => $validated['document_type'],
                    'document_name' => $validated['document_name'],
                    'external_url' => $validated['external_url'],
                    'file_path' => null,
                    'signed_at' => $validated['signed_at'] ?? now(),
                    'notes' => $validated['notes'] ?? null,
                    'created_by' => auth()->id(),
                ]);
            }
        } else {
            // Per altri tipi di documento, accetta file O external_url
            if ($request->hasFile('file')) {
            // Salva file
            $path = $request->file('file')->store('contracts/signed-documents', 'public');
            
            $document = \App\Models\ContractSignedDocument::create([
                'contract_id' => $contract->id,
                'document_type' => $validated['document_type'],
                'document_name' => $validated['document_name'],
                'file_path' => $path,
                'external_url' => $validated['external_url'] ?? null,
                'signed_at' => $validated['signed_at'] ?? now(),
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);
            } elseif (!empty($validated['external_url'])) {
                // Usa external_url se fornito
                $document = \App\Models\ContractSignedDocument::create([
                    'contract_id' => $contract->id,
                    'document_type' => $validated['document_type'],
                    'document_name' => $validated['document_name'],
                    'file_path' => null,
                    'external_url' => $validated['external_url'],
                    'signed_at' => $validated['signed_at'] ?? now(),
                    'notes' => $validated['notes'] ?? null,
                    'created_by' => auth()->id(),
                ]);
            } else {
                return response()->json(['error' => 'È richiesto un file o un URL esterno per questo tipo di documento'], 400);
            }
        }

        // Ricarica il contratto con tutte le relazioni per assicurarsi che i dati siano aggiornati
        $contract->refresh();
        $contract->load('signedDocuments.creator');

        return response()->json([
            'message' => 'Documento firmato caricato con successo',
            'document' => $document->load('creator'),
            'file_url' => $document->file_path ? Storage::url($document->file_path) : null,
            'external_url' => $document->external_url,
            'contract' => $contract->load([
                'client',
                'seller.user',
                'project',
                'quote.items',
                'quote.client',
                'quote.seller.user',
                'creator',
                'revisions.creator',
                'signedDocuments.creator'
            ]),
        ], 201);
    }

    /**
     * Elimina documento firmato aggiuntivo
     */
    public function deleteSignedDocument($id, $documentId)
    {
        $contract = Contract::findOrFail($id);
        $document = \App\Models\ContractSignedDocument::where('contract_id', $contract->id)
            ->findOrFail($documentId);

        DB::beginTransaction();
        try {
            // Elimina file
            if ($document->file_path) {
                Storage::delete($document->file_path);
            }

            $document->delete();

            DB::commit();

            return response()->json(['message' => 'Documento eliminato con successo']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nell\'eliminazione del documento: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Download file contratto
     */
    public function downloadFile($id, $type = 'contract')
    {
        $contract = Contract::findOrFail($id);

        $filePath = null;
        $fileName = null;

        switch ($type) {
            case 'contract':
                if (!$contract->contract_file) {
                    return response()->json(['error' => 'File contratto non trovato'], 404);
                }
                $filePath = $contract->contract_file;
                $fileName = 'contratto_' . $contract->contract_number . '.pdf';
                break;
            case 'signed':
                if (!$contract->signed_file) {
                    return response()->json(['error' => 'File contratto firmato non trovato'], 404);
                }
                $filePath = $contract->signed_file;
                $fileName = 'contratto_firmato_' . $contract->contract_number . '.pdf';
                break;
            default:
                return response()->json(['error' => 'Tipo di file non valido'], 400);
        }

        if (!Storage::disk('public')->exists($filePath)) {
            return response()->json(['error' => 'File non trovato sul server'], 404);
        }

        return Storage::disk('public')->download($filePath, $fileName);
    }

    /**
     * Download documento firmato aggiuntivo
     */
    public function downloadSignedDocument($id, $documentId)
    {
        $contract = Contract::findOrFail($id);
        $document = \App\Models\ContractSignedDocument::where('contract_id', $contract->id)
            ->findOrFail($documentId);

        if ($document->external_url) {
            // Se è un URL esterno, restituisci l'URL
            return response()->json(['external_url' => $document->external_url]);
        }

        if (!$document->file_path) {
            return response()->json(['error' => 'File non trovato'], 404);
        }

        if (!Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['error' => 'File non trovato sul server'], 404);
        }

        return Storage::disk('public')->download($document->file_path, $document->document_name . '.pdf');
    }

    /**
     * Download revisione contratto
     */
    public function downloadRevision($id, $revisionId)
    {
        $contract = Contract::findOrFail($id);
        $revision = \App\Models\ContractRevision::where('contract_id', $contract->id)
            ->findOrFail($revisionId);

        if (!Storage::disk('public')->exists($revision->contract_file)) {
            return response()->json(['error' => 'File revisione non trovato sul server'], 404);
        }

        $fileName = 'revisione_' . $revision->revision_number . '_' . $contract->contract_number . '.pdf';
        return Storage::disk('public')->download($revision->contract_file, $fileName);
    }
}

