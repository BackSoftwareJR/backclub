<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\PriceListItem;
use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PriceListController extends Controller
{
    /**
     * Lista listino
     */
    public function index(Request $request)
    {
        $query = PriceListItem::with('department');

        // Filtro per settore
        if ($request->has('department_id')) {
            $query->where('crm_department_id', $request->department_id);
        }

        // Filtro per stato attivo
        if ($request->has('is_active')) {
            $isActive = $request->is_active;
            // Converti true/false in 1/0 se necessario
            if (is_bool($isActive)) {
                $isActive = $isActive ? 1 : 0;
            }
            $query->where('is_active', $isActive);
        }

        // Filtro per tipo prezzo
        if ($request->has('price_type')) {
            $query->where('price_type', $request->price_type);
        }

        // Ricerca
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        // Ordinamento
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $items = $query->paginate($request->input('per_page', 15));

        return response()->json($items);
    }

    /**
     * Dettaglio item listino
     */
    public function show($id)
    {
        $item = PriceListItem::with('department')->findOrFail($id);

        return response()->json($item);
    }

    /**
     * Crea nuovo item
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'crm_department_id' => 'nullable|exists:crm_departments,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'operational_notes' => 'nullable|string',
            'landing_page_url' => 'nullable|url|max:500',
            'technical_sheet_url' => 'nullable|url|max:500',
            'base_price' => 'required|numeric|min:0',
            'price_type' => 'required|in:fisso,variabile,personalizzato',
            'payment_options' => 'nullable|array',
            'min_installment_amount' => 'nullable|numeric|min:0',
            'max_installments' => 'nullable|integer|min:1',
            'margin_percentage' => 'nullable|numeric|min:0|max:100',
            'features' => 'nullable|array',
            'renewal_options' => 'nullable|array',
            'renewal_type' => 'nullable|in:obbligatorio,facoltativo,multi',
            'is_active' => 'boolean',
        ]);

        $item = PriceListItem::create($validated);

        $item->load('department');

        return response()->json($item, 201);
    }

    /**
     * Aggiorna item
     */
    public function update(Request $request, $id)
    {
        $item = PriceListItem::findOrFail($id);

        $validated = $request->validate([
            'crm_department_id' => 'nullable|exists:crm_departments,id',
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'operational_notes' => 'nullable|string',
            'landing_page_url' => 'nullable|url|max:500',
            'technical_sheet_url' => 'nullable|url|max:500',
            'base_price' => 'sometimes|required|numeric|min:0',
            'price_type' => 'sometimes|required|in:fisso,variabile,personalizzato',
            'payment_options' => 'nullable|array',
            'min_installment_amount' => 'nullable|numeric|min:0',
            'max_installments' => 'nullable|integer|min:1',
            'margin_percentage' => 'nullable|numeric|min:0|max:100',
            'features' => 'nullable|array',
            'renewal_options' => 'nullable|array',
            'renewal_type' => 'nullable|in:obbligatorio,facoltativo,multi',
            'is_active' => 'boolean',
        ]);

        $item->update($validated);

        $item->load('department');

        return response()->json($item);
    }

    /**
     * Elimina item
     */
    public function destroy($id)
    {
        $item = PriceListItem::findOrFail($id);

        // Verifica se è usato in preventivi
        $usedInQuotes = $item->quoteItems()->count() > 0;

        if ($usedInQuotes) {
            // Disattiva invece di eliminare
            $item->update(['is_active' => 0]);
            return response()->json(['message' => 'Item disattivato (è utilizzato in preventivi esistenti)']);
        }

        $item->delete();

        return response()->json(['message' => 'Item eliminato con successo']);
    }

    /**
     * Items per settore
     */
    public function byDepartment($departmentId)
    {
        $items = PriceListItem::where('crm_department_id', $departmentId)
                             ->where('is_active', 1)
                             ->orderBy('name')
                             ->get();

        return response()->json($items);
    }

    /**
     * Upload documento informativo PDF
     */
    public function uploadInformativeDocument(Request $request, $id)
    {
        $item = PriceListItem::findOrFail($id);

        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240', // Max 10MB, solo PDF
        ]);

        if ($request->hasFile('file')) {
            // Elimina vecchio file se esiste
            if ($item->informative_document_path) {
                Storage::disk('public')->delete($item->informative_document_path);
            }

            // Salva nuovo file
            $path = $request->file('file')->store('price-list/informative-documents', 'public');
            
            $item->update(['informative_document_path' => $path]);

            return response()->json([
                'message' => 'Documento informativo caricato con successo',
                'informative_document_path' => $path,
                'informative_document_url' => Storage::url($path),
            ]);
        }

        return response()->json(['error' => 'Nessun file caricato'], 400);
    }

    /**
     * Download documento informativo PDF
     */
    public function downloadInformativeDocument($id)
    {
        $item = PriceListItem::findOrFail($id);

        if (!$item->informative_document_path) {
            return response()->json(['error' => 'Documento informativo non trovato'], 404);
        }

        if (!Storage::disk('public')->exists($item->informative_document_path)) {
            return response()->json(['error' => 'File non trovato'], 404);
        }

        return Storage::disk('public')->download(
            $item->informative_document_path,
            'documento-informativo-' . $item->id . '.pdf'
        );
    }

    /**
     * Preview HTML della pagina di preventivo per un item di listino.
     * Usa lo stesso layout del PDF per mostrare al venditore l'anteprima.
     */
    public function quotePreview(Request $request)
    {
        // Permetti sia preview da item salvato (id) che da dati in editing
        $validated = $request->validate([
            'id' => 'nullable|exists:price_list_items,id',
            'crm_department_id' => 'nullable|integer',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'operational_notes' => 'nullable|string',
            'features' => 'nullable|array',
            'features.*' => 'string',
        ]);

        if (!empty($validated['id'])) {
            $item = PriceListItem::with('department')->findOrFail($validated['id']);
            // Sovrascrivi i campi con quelli presenti nella richiesta (stato corrente del form)
            $item->name = $validated['name'];
            $item->description = $validated['description'] ?? null;
            $item->operational_notes = $validated['operational_notes'] ?? null;
            if (array_key_exists('features', $validated)) {
                $item->features = $validated['features'] ?? [];
            }
        } else {
            $item = new PriceListItem();
            $item->name = $validated['name'];
            $item->description = $validated['description'] ?? null;
            $item->operational_notes = $validated['operational_notes'] ?? null;
            $item->features = $validated['features'] ?? [];
        }

        return response()->view('quotes.price_list_preview', ['item' => $item]);
    }

    /**
     * Genera un PDF di anteprima del preventivo per un singolo item di listino,
     * usando lo stesso template del PDF definitivo.
     */
    public function quotePreviewPdf(Request $request)
    {
        $validated = $request->validate([
            'id' => 'nullable|exists:price_list_items,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'operational_notes' => 'nullable|string',
            'features' => 'nullable|array',
            'features.*' => 'string',
            'base_price' => 'nullable|numeric|min:0',
            'margin_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        if (!empty($validated['id'])) {
            $item = PriceListItem::with('department')->findOrFail($validated['id']);
        } else {
            $item = new PriceListItem();
        }

        // Applica i dati correnti del form al modello in memoria
        $item->name = $validated['name'];
        $item->description = $validated['description'] ?? null;
        $item->operational_notes = $validated['operational_notes'] ?? null;
        if (array_key_exists('features', $validated)) {
            $item->features = $validated['features'] ?? [];
        }
        $item->base_price = $validated['base_price'] ?? ($item->base_price ?? 0);
        $item->margin_percentage = $validated['margin_percentage'] ?? $item->margin_percentage;

        // Costruisci un preventivo "virtuale" non salvato, solo per la preview
        $quote = new Quote();
        $quote->quote_number = 'PREVIEW';
        $quote->created_at = now();
        $quote->title = $item->name;
        $quote->valid_until = now()->addDays(30);

        $subtotal = $item->base_price ?? 0;
        $taxRate = 22.0;
        $taxAmount = round($subtotal * ($taxRate / 100), 2);

        $quote->subtotal = $subtotal;
        $quote->discount_amount = 0;
        $quote->discount_percentage = 0;
        $quote->vat_rate = $taxRate;
        $quote->tax_amount = $taxAmount;
        $quote->total_amount = $subtotal + $taxAmount;

        // Cliente fittizio solo per visualizzare il layout
        $client = new Client();
        $client->company_name = 'Cliente di esempio';
        $client->address = '';
        $quote->setRelation('client', $client);

        // Crea una singola voce di preventivo basata sull'item di listino
        $quoteItem = new QuoteItem();
        $quoteItem->description = $item->name;
        $quoteItem->quantity = 1;
        $quoteItem->unit_price = $item->base_price ?? 0;
        $quoteItem->discount = 0;
        $quoteItem->total = $quoteItem->unit_price;
        $quoteItem->setRelation('priceListItem', $item);

        $quote->setRelation('items', collect([$quoteItem]));

        // Usa lo stesso template PDF dei preventivi reali
        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('quotes.pdf', ['quote' => $quote]);

            return response($pdf->output(), 200)
                ->header('Content-Type', 'application/pdf');
        }

        // Fallback HTML se DomPDF non è disponibile
        return response()->view('quotes.pdf', ['quote' => $quote], 200)
            ->header('Content-Type', 'text/html; charset=utf-8');
    }
}

