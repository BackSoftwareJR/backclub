<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\QuoteItemAnswer;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class QuoteController extends Controller
{
    /**
     * Lista preventivi
     */
    public function index(Request $request)
    {
        $query = Quote::with(['client', 'seller.user', 'department', 'creator', 'items.priceListItem']);

        // Filtro per cliente
        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        // Filtro per venditore
        if ($request->has('seller_id')) {
            $query->where('seller_id', $request->seller_id);
        }

        // Filtro per settore
        if ($request->has('department_id')) {
            $query->where('crm_department_id', $request->department_id);
        }

        // Filtro per stato
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filtro per preventivi in scadenza
        if ($request->boolean('expiring_soon')) {
            $query->expiringSoon($request->input('expiring_days', 7));
        }

        // Ricerca
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('quote_number', 'LIKE', "%{$search}%")
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

        // Carica sempre gli items con i loro payment_option per il calcolo dei piani di pagamento
        $query->with(['items.priceListItem']);

        $quotes = $query->paginate($request->input('per_page', 15));

        return response()->json($quotes);
    }

    /**
     * Dettaglio preventivo
     */
    public function show($id)
    {
        $quote = Quote::with([
            'client',
            'seller.user',
            'department',
            'creator',
            'items.priceListItem.department',
            'items.answers.question',
            'items.answers.answer.conditions',
            'contract'
        ])->findOrFail($id);

        // Assicurati che i campi JSON vengano decodificati correttamente
        // Laravel dovrebbe farlo automaticamente con i cast, ma verifichiamo
        $quote->items->each(function ($item) {
            // I cast nel model dovrebbero già gestire la decodifica JSON
            // Ma assicuriamoci che i campi siano sempre array/oggetti quando presenti
            if ($item->payment_option && is_string($item->payment_option)) {
                $item->payment_option = json_decode($item->payment_option, true);
            }
            if ($item->renewal_option && is_string($item->renewal_option)) {
                $item->renewal_option = json_decode($item->renewal_option, true);
            }
            if ($item->renewal_options && is_string($item->renewal_options)) {
                $item->renewal_options = json_decode($item->renewal_options, true);
            }
            if ($item->selected_features && is_string($item->selected_features)) {
                $item->selected_features = json_decode($item->selected_features, true);
            }
        });

        return response()->json($quote);
    }

    /**
     * Crea nuovo preventivo
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'seller_id' => 'nullable|exists:sellers,id',
            'crm_department_id' => 'nullable|exists:crm_departments,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
            'valid_until' => 'nullable|date',
            'status' => 'nullable|in:pending,approved,rejected,started,completed,contract_requested',
            'items' => 'required|array|min:1',
            'items.*.price_list_item_id' => 'nullable|exists:price_list_items,id',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0|max:100',
            'items.*.payment_option' => 'nullable|array',
            'items.*.renewal_option' => 'nullable|array',
            'items.*.renewal_options' => 'nullable|array',
            'items.*.selected_features' => 'nullable|array',
            'items.*.notes' => 'nullable|string',
        ]);

        $maxRetries = 3;
        $retry = 0;
        
        while ($retry < $maxRetries) {
            DB::beginTransaction();
            try {
                // Se il preventivo è creato da un venditore, gli sconti devono essere 0 (solo admin può applicare sconti)
                $isSeller = $validated['seller_id'] ?? false;
                $discountPercentage = $isSeller ? 0 : ($validated['discount_percentage'] ?? 0);
                $discountAmount = $isSeller ? 0 : ($validated['discount_amount'] ?? 0);
                
                // Genera numero preventivo prima della creazione per evitare race conditions
                $quoteNumber = Quote::generateQuoteNumber();
                
                // Crea preventivo
                $quote = Quote::create([
                    'quote_number' => $quoteNumber, // Imposta esplicitamente per evitare doppia generazione
                    'client_id' => $validated['client_id'],
                    'seller_id' => $validated['seller_id'] ?? null,
                    'crm_department_id' => $validated['crm_department_id'] ?? null,
                    'title' => $validated['title'],
                    'description' => $validated['description'] ?? null,
                    'discount_percentage' => $discountPercentage,
                    'discount_amount' => $discountAmount,
                    'tax_percentage' => $validated['tax_percentage'] ?? 22.00,
                    'notes' => $validated['notes'] ?? null,
                    'valid_until' => $validated['valid_until'] ?? null,
                    'status' => $validated['status'] ?? 'pending',
                    'created_by' => auth()->id(),
                ]);

                // Crea voci preventivo
                foreach ($validated['items'] as $itemData) {
                    $itemToCreate = [
                        'quote_id' => $quote->id,
                        'price_list_item_id' => $itemData['price_list_item_id'] ?? null,
                        'description' => $itemData['description'],
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                        'discount' => $itemData['discount'] ?? 0,
                        'total' => 0, // Sarà calcolato automaticamente dal model
                        'payment_option' => isset($itemData['payment_option']) ? json_encode($itemData['payment_option']) : null,
                        'selected_features' => isset($itemData['selected_features']) ? json_encode($itemData['selected_features']) : null,
                        'notes' => $itemData['notes'] ?? null,
                    ];
                    
                    // Gestione rinnovo: se c'è renewal_options (array) per multi-rinnovo, usa quello
                    // Altrimenti usa renewal_option (singolo)
                    if (isset($itemData['renewal_options']) && is_array($itemData['renewal_options']) && count($itemData['renewal_options']) > 0) {
                        // Multi-rinnovo: salva array in renewal_options
                        $itemToCreate['renewal_options'] = json_encode($itemData['renewal_options']);
                        $itemToCreate['renewal_option'] = null; // Non usare renewal_option per multi-rinnovo
                    } elseif (isset($itemData['renewal_option']) && $itemData['renewal_option'] !== null) {
                        // Rinnovo singolo: salva in renewal_option
                        $itemToCreate['renewal_option'] = json_encode($itemData['renewal_option']);
                        $itemToCreate['renewal_options'] = null;
                    } else {
                        // Nessun rinnovo
                        $itemToCreate['renewal_option'] = null;
                        $itemToCreate['renewal_options'] = null;
                    }
                    
                    // Salva risposte domande se presenti
                    $questionAnswers = $itemData['question_answers'] ?? [];
                    $itemToCreate['question_answers'] = !empty($questionAnswers) ? json_encode($questionAnswers) : null;
                    
                    $quoteItem = QuoteItem::create($itemToCreate);
                    
                    // Salva risposte alle domande
                    if (!empty($questionAnswers)) {
                        foreach ($questionAnswers as $answerData) {
                            QuoteItemAnswer::create([
                                'quote_item_id' => $quoteItem->id,
                                'question_id' => $answerData['question_id'],
                                'answer_id' => $answerData['answer_id'] ?? null,
                                'text_answer' => $answerData['text_answer'] ?? null,
                                'number_answer' => $answerData['number_answer'] ?? null,
                            ]);
                        }
                        
                        // Calcola aggiustamenti prezzo basati su risposte
                        $quoteItem->calculatePriceAdjustments();
                    }
                }

                // Ricalcola totali (fatto automaticamente dai model events)
                $quote->refresh();

                // Aggiorna il seller_id del cliente se non è già impostato
                // Questo assicura che il cliente appaia nella lista del venditore
                if ($quote->seller_id && $quote->client) {
                    $client = $quote->client;
                    if (!$client->seller_id) {
                        $client->seller_id = $quote->seller_id;
                        $client->save();
                    }
                }

                DB::commit();

                $quote->load(['client', 'seller.user', 'department', 'items']);

                return response()->json($quote, 201);
            } catch (\Illuminate\Database\QueryException $e) {
                DB::rollBack();
                
                // Se è un errore di duplicate key per quote_number, riprova
                if ($e->getCode() == 23000 && strpos($e->getMessage(), 'quote_number') !== false && $retry < $maxRetries - 1) {
                    $retry++;
                    // Piccola pausa prima di riprovare
                    usleep(100000); // 100ms
                    continue;
                }
                
                // Se non è un errore di duplicate o abbiamo esaurito i tentativi, ritorna errore
                return response()->json(['error' => 'Errore nella creazione del preventivo: ' . $e->getMessage()], 500);
            } catch (\Exception $e) {
                DB::rollBack();
                return response()->json(['error' => 'Errore nella creazione del preventivo: ' . $e->getMessage()], 500);
            }
        }
        
        // Se abbiamo esaurito tutti i tentativi
        return response()->json(['error' => 'Errore nella creazione del preventivo: Impossibile generare un numero preventivo univoco dopo diversi tentativi'], 500);
    }

    /**
     * Aggiorna preventivo
     */
    public function update(Request $request, $id)
    {
        $quote = Quote::findOrFail($id);

        // Debug: log richiesta in arrivo
        \Log::info('QuoteController::update - Richiesta ricevuta', [
            'quote_id' => $id,
            'request_data' => $request->all(),
        ]);

        $validated = $request->validate([
            'client_id' => 'sometimes|required|exists:clients,id',
            'seller_id' => 'nullable|exists:sellers,id',
            'crm_department_id' => 'nullable|exists:crm_departments,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:65535', // Permette stringhe vuote
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:65535', // Permette stringhe vuote
            'valid_until' => 'nullable|date',
            'status' => 'nullable|in:pending,approved,rejected,started,completed,contract_requested',
            'items' => 'sometimes|required|array|min:1',
            'items.*.id' => 'nullable|exists:quote_items,id',
            'items.*.price_list_item_id' => 'nullable|exists:price_list_items,id',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0|max:100',
            'items.*.payment_option' => 'nullable|array',
            'items.*.renewal_option' => 'nullable|array',
            'items.*.renewal_options' => 'nullable|array',
            'items.*.selected_features' => 'nullable|array',
            'items.*.notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Debug: log dati validati
            \Log::info('QuoteController::update - Dati validati', [
                'validated' => $validated,
            ]);

            // Aggiorna preventivo - salva anche stringhe vuote per description e notes
            $updateData = [];
            
            // Title è sempre presente
            if (isset($validated['title'])) {
                $updateData['title'] = $validated['title'];
            }
            
            // Description e notes - sempre presenti nella richiesta
            // Usa $request->input() per ottenere il valore originale (anche stringhe vuote)
            // Laravel converte stringhe vuote in null durante la validazione
            if ($request->has('description')) {
                $descValue = $request->input('description');
                $updateData['description'] = ($descValue === '' || $descValue === null) ? null : $descValue;
            }
            if ($request->has('notes')) {
                $notesValue = $request->input('notes');
                $updateData['notes'] = ($notesValue === '' || $notesValue === null) ? null : $notesValue;
            }
            
            if (isset($validated['client_id'])) {
                $updateData['client_id'] = $validated['client_id'];
            }
            if (isset($validated['seller_id'])) {
                $updateData['seller_id'] = $validated['seller_id'];
            }
            if (isset($validated['crm_department_id'])) {
                $updateData['crm_department_id'] = $validated['crm_department_id'];
            }
            // Se il preventivo appartiene a un venditore, gli sconti devono essere 0 (solo admin può applicare sconti)
            if ($quote->seller_id) {
                // Forza sconti a 0 per venditori
                $updateData['discount_percentage'] = 0;
                $updateData['discount_amount'] = 0;
            } else {
                // Solo admin può modificare sconti
                if (isset($validated['discount_percentage'])) {
                    $updateData['discount_percentage'] = $validated['discount_percentage'];
                }
                if (isset($validated['discount_amount'])) {
                    $updateData['discount_amount'] = $validated['discount_amount'];
                }
            }
            if (isset($validated['tax_percentage'])) {
                $updateData['tax_percentage'] = $validated['tax_percentage'];
            }
            if (array_key_exists('valid_until', $validated)) {
                $updateData['valid_until'] = $validated['valid_until'];
            }
            if (isset($validated['status'])) {
                $updateData['status'] = $validated['status'];
            }
            
            // Debug: log dati da aggiornare
            \Log::info('QuoteController::update - Dati da aggiornare', [
                'updateData' => $updateData,
            ]);
            
            $quote->update($updateData);
            
            // Aggiorna il seller_id del cliente se è stato modificato e il cliente non ha già un seller_id
            if (isset($updateData['seller_id']) && $updateData['seller_id'] && $quote->client) {
                $client = $quote->client;
                if (!$client->seller_id) {
                    $client->seller_id = $updateData['seller_id'];
                    $client->save();
                }
            }
            
            // Debug: log dopo update
            \Log::info('QuoteController::update - Preventivo aggiornato', [
                'quote_id' => $quote->id,
                'quote_title' => $quote->title,
                'quote_description' => $quote->description,
                'quote_notes' => $quote->notes,
            ]);

            // Aggiorna voci se presenti
            if (isset($validated['items'])) {
                // Elimina voci esistenti
                $quote->items()->delete();

                // Crea nuove voci
                foreach ($validated['items'] as $index => $itemData) {
                    $itemToCreate = [
                        'quote_id' => $quote->id,
                        'price_list_item_id' => $itemData['price_list_item_id'] ?? null,
                        'description' => $itemData['description'],
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                        'discount' => $itemData['discount'] ?? 0,
                        'total' => 0,
                    ];
                    
                    // Payment option - sempre presente, anche se null
                    if (isset($itemData['payment_option']) && $itemData['payment_option'] !== null) {
                        $itemToCreate['payment_option'] = json_encode($itemData['payment_option']);
                    } else {
                        $itemToCreate['payment_option'] = null;
                    }
                    
                    // Gestione rinnovo: se c'è renewal_options (array) per multi-rinnovo, usa quello
                    // Altrimenti usa renewal_option (singolo)
                    if (isset($itemData['renewal_options']) && is_array($itemData['renewal_options']) && count($itemData['renewal_options']) > 0) {
                        // Multi-rinnovo: salva array in renewal_options
                        $itemToCreate['renewal_options'] = json_encode($itemData['renewal_options']);
                        $itemToCreate['renewal_option'] = null; // Non usare renewal_option per multi-rinnovo
                    } elseif (isset($itemData['renewal_option']) && $itemData['renewal_option'] !== null) {
                        // Rinnovo singolo: salva in renewal_option
                        $itemToCreate['renewal_option'] = json_encode($itemData['renewal_option']);
                        $itemToCreate['renewal_options'] = null;
                    } else {
                        // Nessun rinnovo
                        $itemToCreate['renewal_option'] = null;
                        $itemToCreate['renewal_options'] = null;
                    }
                    
                    // Selected features - sempre presente, anche se array vuoto
                    if (isset($itemData['selected_features']) && is_array($itemData['selected_features'])) {
                        $itemToCreate['selected_features'] = json_encode($itemData['selected_features']);
                    } else {
                        $itemToCreate['selected_features'] = json_encode([]);
                    }
                    
                    // Notes - sempre presente, anche se null o vuoto
                    if (isset($itemData['notes'])) {
                        $itemToCreate['notes'] = ($itemData['notes'] === '' || $itemData['notes'] === null) ? null : $itemData['notes'];
                    } else {
                        $itemToCreate['notes'] = null;
                    }
                    
                    // Salva risposte domande se presenti
                    $questionAnswers = $itemData['question_answers'] ?? [];
                    $itemToCreate['question_answers'] = !empty($questionAnswers) ? json_encode($questionAnswers) : null;
                    
                    $quoteItem = QuoteItem::create($itemToCreate);

                    // Salva risposte alle domande (una sola riga quote_item per payload — prima c'era un secondo create() che duplicava ogni voce)
                    if (!empty($questionAnswers)) {
                        foreach ($questionAnswers as $answerData) {
                            QuoteItemAnswer::create([
                                'quote_item_id' => $quoteItem->id,
                                'question_id' => $answerData['question_id'],
                                'answer_id' => $answerData['answer_id'] ?? null,
                                'text_answer' => $answerData['text_answer'] ?? null,
                                'number_answer' => $answerData['number_answer'] ?? null,
                            ]);
                        }

                        $quoteItem->calculatePriceAdjustments();
                    }

                    \Log::info("QuoteController::update - Item {$index} creato", [
                        'item_id' => $quoteItem->id,
                        'description' => $quoteItem->description,
                    ]);
                }
            }

            DB::commit();

            $quote->refresh();
            $quote->load(['client', 'seller.user', 'department', 'items']);

            return response()->json($quote);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nell\'aggiornamento del preventivo: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Elimina preventivo
     */
    public function destroy(Request $request, $id)
    {
        $quote = Quote::with('contract.project')->findOrFail($id);
        $forceDeleteWithContract = $request->input('force_delete_with_contract', false);

        // Verifica se ha contratto associato
        if ($quote->isConverted() && !$forceDeleteWithContract) {
            return response()->json([
                'error' => 'Impossibile eliminare un preventivo convertito in contratto',
                'has_contract' => true,
                'contract_id' => $quote->contract->id,
                'project_id' => $quote->contract->crm_project_id
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Se ha contratto associato e l'utente ha confermato l'eliminazione completa
            if ($quote->isConverted() && $forceDeleteWithContract) {
                // Carica tutte le relazioni del contratto necessarie per l'eliminazione
                $contract = $quote->contract;
                $contract->load(['signedDocuments', 'revisions', 'paymentPlans', 'project']);
                $project = $contract->project;

                // Elimina file del contratto se presenti
                if ($contract->contract_file) {
                    Storage::delete($contract->contract_file);
                }
                if ($contract->signed_file) {
                    Storage::delete($contract->signed_file);
                }

                // Elimina documenti firmati del contratto
                foreach ($contract->signedDocuments as $document) {
                    if ($document->file_path) {
                        Storage::delete($document->file_path);
                    }
                }
                $contract->signedDocuments()->delete();

                // Elimina revisioni del contratto
                $contract->revisions()->delete();

                // Elimina piani di pagamento del contratto
                $contract->paymentPlans()->delete();

                // Elimina il contratto
                $contract->delete();

                // Elimina il progetto se esiste e se è collegato solo a questo contratto
                // (o sempre se l'utente ha confermato l'eliminazione completa)
                if ($project) {
                    // Verifica se ci sono altri contratti collegati al progetto
                    $otherContracts = \App\Models\Contract::where('crm_project_id', $project->id)
                        ->where('id', '!=', $contract->id)
                        ->count();
                    
                    // Se non ci sono altri contratti, elimina anche il progetto
                    if ($otherContracts === 0) {
                        // Elimina task del progetto
                        $project->tasks()->delete();
                        // Elimina team members del progetto
                        $project->teamMembers()->delete();
                        // Elimina il progetto
                        $project->delete();
                    }
                }
            }

            // Elimina gli items del preventivo
            $quote->items()->delete();
            
            // Elimina il preventivo
            $quote->delete();

            DB::commit();

            $message = $forceDeleteWithContract 
                ? 'Preventivo, contratto e progetto eliminati con successo'
                : 'Preventivo eliminato con successo';

            return response()->json(['message' => $message]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nell\'eliminazione: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Cambia stato preventivo
     */
    public function updateStatus(Request $request, $id)
    {
        $quote = Quote::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected,started,completed,contract_requested',
        ]);

        $quote->update(['status' => $validated['status']]);

        return response()->json(['message' => 'Stato aggiornato con successo', 'quote' => $quote]);
    }

    /**
     * Genera PDF preventivo
     */
    public function generatePDF($id)
    {
        try {
            $quote = Quote::with([
                'client', 
                'seller.user', 
                'department', 
                'items.priceListItem.department'
            ])->findOrFail($id);
        } catch (\Exception $e) {
            \Log::error('Errore nel caricamento preventivo: ' . $e->getMessage());
            return response()->json([
                'error' => 'Preventivo non trovato'
            ], 404);
        }

        try {
            // Verifica se DomPDF è disponibile
            if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
                try {
                    // Usa DomPDF
                    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('quotes.pdf', ['quote' => $quote]);
                    
                    // Salva il PDF nello storage
                    $filename = 'preventivo_' . $quote->quote_number . '_' . date('Y-m-d') . '.pdf';
                    $path = 'quotes/' . $filename;
                    
                    // Crea la directory se non esiste
                    if (!\Storage::disk('public')->exists('quotes')) {
                        \Storage::disk('public')->makeDirectory('quotes');
                    }
                    
                    \Storage::disk('public')->put($path, $pdf->output());
                    
                    // Aggiorna il percorso nel database
                    $quote->update(['pdf_path' => $path]);
                    
                    // Restituisci il PDF come download con headers corretti
                    // Usa 'attachment' invece di 'inline' per forzare il download
                    return response($pdf->output(), 200)
                        ->header('Content-Type', 'application/pdf')
                        ->header('Content-Disposition', 'attachment; filename="' . $filename . '"')
                        ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
                        ->header('Pragma', 'no-cache')
                        ->header('Expires', '0');
                } catch (\Exception $pdfError) {
                    \Log::error('Errore nella generazione PDF con DomPDF: ' . $pdfError->getMessage());
                    \Log::error('Stack trace: ' . $pdfError->getTraceAsString());
                    // Fallback alla view HTML
                    return response()->view('quotes.pdf', ['quote' => $quote], 200)
                        ->header('Content-Type', 'text/html; charset=utf-8');
                }
            } else {
                // Fallback: restituisci la view HTML se DomPDF non è disponibile
                return response()->view('quotes.pdf', ['quote' => $quote], 200)
                    ->header('Content-Type', 'text/html; charset=utf-8');
            }
        } catch (\Exception $e) {
            \Log::error('Errore nella generazione PDF preventivo: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            \Log::error('File: ' . $e->getFile() . ' Line: ' . $e->getLine());
            
            // Prova comunque a restituire la view HTML come ultimo fallback
            try {
                // Assicurati che tutte le relazioni siano caricate
                $quote->loadMissing(['client', 'seller.user', 'department', 'items']);
                
                return response()->view('quotes.pdf', ['quote' => $quote], 200)
                    ->header('Content-Type', 'text/html; charset=utf-8');
            } catch (\Exception $viewError) {
                \Log::error('Errore anche nella view HTML: ' . $viewError->getMessage());
                \Log::error('View error trace: ' . $viewError->getTraceAsString());
                
                // Restituisci un errore JSON dettagliato per debug
                return response()->json([
                    'error' => 'Errore nella generazione del PDF',
                    'message' => $e->getMessage(),
                    'view_error' => $viewError->getMessage(),
                    'quote_id' => $quote->id ?? null,
                ], 500);
            }
        }
    }

    /**
     * Duplica preventivo
     */
    public function duplicate($id)
    {
        $originalQuote = Quote::with('items')->findOrFail($id);

        DB::beginTransaction();
        try {
            // Crea copia del preventivo
            $newQuote = $originalQuote->replicate();
            $newQuote->quote_number = Quote::generateQuoteNumber();
            $newQuote->status = 'pending';
            $newQuote->pdf_path = null;
            $newQuote->created_by = auth()->id();
            $newQuote->save();

            // Copia voci
            foreach ($originalQuote->items as $item) {
                $newItem = $item->replicate();
                $newItem->quote_id = $newQuote->id;
                $newItem->save();
            }

            DB::commit();

            $newQuote->load(['client', 'seller.user', 'department', 'items']);

            return response()->json($newQuote, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nella duplicazione del preventivo: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Richiedi contratto da preventivo
     */
    public function requestContract($id)
    {
        $quote = Quote::with(['client', 'seller'])->findOrFail($id);

        // Verifica se esiste già un contratto per questo preventivo
        if ($quote->contract) {
            return response()->json([
                'error' => 'Esiste già un contratto per questo preventivo',
                'contract_id' => $quote->contract->id
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Crea contratto con stato 'requested'
            $contract = \App\Models\Contract::create([
                'quote_id' => $quote->id,
                'client_id' => $quote->client_id,
                'seller_id' => $quote->seller_id,
                'title' => 'Contratto - ' . $quote->title,
                'total_value' => $quote->total_amount,
                'status' => 'requested',
                'created_by' => auth()->id(),
            ]);

            // Aggiorna lo stato del preventivo a 'approved' quando viene richiesto il contratto
            $quote->update(['status' => 'approved']);

            $contract->load(['client', 'seller.user', 'quote']);

            DB::commit();

            return response()->json([
                'message' => 'Richiesta contratto creata con successo',
                'contract' => $contract,
                'quote' => $quote->fresh(['client', 'seller.user', 'department'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Errore nella creazione della richiesta contratto: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Rifiuta preventivo
     */
    public function reject($id)
    {
        $quote = Quote::findOrFail($id);

        // Verifica se il preventivo può essere rifiutato
        if ($quote->status === 'rejected') {
            return response()->json([
                'error' => 'Il preventivo è già stato rifiutato'
            ], 400);
        }

        if ($quote->isConverted()) {
            return response()->json([
                'error' => 'Impossibile rifiutare un preventivo già convertito in contratto'
            ], 400);
        }

        $quote->update(['status' => 'rejected']);

        $quote->load(['client', 'seller.user', 'department']);

        return response()->json([
            'message' => 'Preventivo rifiutato con successo',
            'quote' => $quote
        ]);
    }

    /**
     * Invia preventivo via email
     */
    public function sendEmail(Request $request, $id)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'client_name' => 'nullable|string|max:255',
        ]);

        try {
            $quote = Quote::with(['client'])->findOrFail($id);

            // Get client email and name
            $recipientEmail = $validated['email'];
            $clientName = $validated['client_name'] ?? $quote->client->company_name ?? $quote->client->name ?? 'Cliente';

            // Generate signed public download link for the PDF (valid for 7 days)
            // This creates a secure public URL that doesn't expose the API structure
            $downloadLink = \Illuminate\Support\Facades\URL::signedRoute(
                'quotes.pdf.public',
                ['id' => $quote->id],
                now()->addDays(7) // Link valido per 7 giorni
            );

            // Initialize MailService
            $mailService = new MailService();

            // Send email (titolo preventivo in mail e oggetto; fallback al numero se titolo vuoto)
            $quoteTitle = !empty(trim($quote->title ?? '')) ? trim($quote->title) : $quote->quote_number;
            $result = $mailService->sendQuoteEmail(
                $recipientEmail,
                $clientName,
                $quoteTitle,
                $downloadLink
            );

            if ($result['success']) {
                // Log successful email send
                Log::info('Quote email sent successfully', [
                    'quote_id' => $quote->id,
                    'quote_number' => $quote->quote_number,
                    'recipient' => $recipientEmail
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Email inviata con successo',
                    'data' => [
                        'quote_id' => $quote->id,
                        'quote_number' => $quote->quote_number,
                        'recipient' => $recipientEmail
                    ]
                ]);
            } else {
                Log::error('Failed to send quote email', [
                    'quote_id' => $quote->id,
                    'error' => $result['message']
                ]);

                return response()->json([
                    'success' => false,
                    'error' => $result['message']
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Exception while sending quote email', [
                'quote_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Errore nell\'invio dell\'email: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Genera PDF preventivo (versione pubblica per email - apre inline)
     */
    public function generatePDFPublic($id)
    {
        try {
            $quote = Quote::with([
                'client', 
                'seller.user', 
                'department', 
                'items.priceListItem.department'
            ])->findOrFail($id);
        } catch (\Exception $e) {
            \Log::error('Errore nel caricamento preventivo: ' . $e->getMessage());
            return response()->json([
                'error' => 'Preventivo non trovato'
            ], 404);
        }

        try {
            // Verifica se DomPDF è disponibile
            if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
                try {
                    // Usa DomPDF
                    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('quotes.pdf', ['quote' => $quote]);
                    
                    // Restituisci il PDF come inline (si apre nel browser)
                    $filename = 'preventivo_' . $quote->quote_number . '_' . date('Y-m-d') . '.pdf';
                    
                    return response($pdf->output(), 200)
                        ->header('Content-Type', 'application/pdf')
                        ->header('Content-Disposition', 'inline; filename="' . $filename . '"')
                        ->header('Cache-Control', 'public, max-age=3600')
                        ->header('X-Content-Type-Options', 'nosniff');
                } catch (\Exception $pdfError) {
                    \Log::error('Errore nella generazione PDF con DomPDF: ' . $pdfError->getMessage());
                    return response()->json([
                        'error' => 'Errore nella generazione del PDF',
                        'message' => $pdfError->getMessage()
                    ], 500);
                }
            } else {
                return response()->json([
                    'error' => 'Servizio PDF non disponibile'
                ], 500);
            }
        } catch (\Exception $e) {
            \Log::error('Errore nella generazione PDF preventivo: ' . $e->getMessage());
            return response()->json([
                'error' => 'Errore nella generazione del PDF',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}

