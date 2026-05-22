<?php

namespace App\Http\Controllers;

use App\Models\ClientSpecialPrice;
use App\Models\ClientOffer;
use App\Models\WebNewsArticle;
use App\Models\PriceListItem;
use App\Models\Client;
use App\Models\ClientOrder;
use App\Models\ClientGift;
use App\Models\BackClubAccessRequest;
use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GestioneClientiController extends Controller
{
    // ==================== CLIENT SPECIAL PRICES ====================

    /**
     * GET /api/gestione-clienti/prices
     * Lista tutti i prezzi speciali
     */
    public function getPrices(Request $request)
    {
        $query = ClientSpecialPrice::with(['client', 'service', 'creator']);

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $prices = $query->orderBy('created_at', 'desc')->get();

        // Formatta i dati per il frontend
        $prices = $prices->map(function ($price) {
            return [
                'id' => $price->id,
                'client_id' => $price->client_id,
                'client_name' => $price->client->company_name ?? null,
                'service_id' => $price->service_id,
                'service_name' => $price->service->name ?? null,
                'price' => (float) $price->price,
                'original_price' => (float) $price->original_price,
                'discount_percentage' => (float) $price->discount_percentage,
                'is_active' => $price->is_active,
                'valid_from' => $price->valid_from?->format('Y-m-d'),
                'valid_until' => $price->valid_until?->format('Y-m-d'),
                'notes' => $price->notes,
                'created_at' => $price->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $price->updated_at->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json(['success' => true, 'data' => $prices]);
    }

    /**
     * POST /api/gestione-clienti/prices
     * Crea nuovo prezzo speciale
     */
    public function createPrice(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|exists:clients,id',
            'service_id' => 'required|exists:price_list_items,id',
            'price' => 'required|numeric|min:0',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date|after_or_equal:valid_from',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $service = PriceListItem::findOrFail($request->service_id);
        $originalPrice = $service->base_price;
        $discountPercentage = (($originalPrice - $request->price) / $originalPrice) * 100;

        $price = ClientSpecialPrice::create([
            'client_id' => $request->client_id,
            'service_id' => $request->service_id,
            'price' => $request->price,
            'original_price' => $originalPrice,
            'discount_percentage' => round($discountPercentage, 2),
            'valid_from' => $request->valid_from,
            'valid_until' => $request->valid_until,
            'notes' => $request->notes,
            'is_active' => true,
            'created_by' => auth()->id(),
        ]);

        $price->load(['client', 'service']);

        return response()->json(['success' => true, 'data' => $price], 201);
    }

    /**
     * PUT /api/gestione-clienti/prices/{id}
     * Aggiorna prezzo speciale
     */
    public function updatePrice(Request $request, $id)
    {
        $price = ClientSpecialPrice::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'price' => 'sometimes|required|numeric|min:0',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date|after_or_equal:valid_from',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only(['valid_from', 'valid_until', 'is_active', 'notes']);

        if ($request->has('price')) {
            $data['price'] = $request->price;
            $discountPercentage = (($price->original_price - $request->price) / $price->original_price) * 100;
            $data['discount_percentage'] = round($discountPercentage, 2);
        }

        $price->update($data);
        $price->load(['client', 'service']);

        return response()->json(['success' => true, 'data' => $price]);
    }

    /**
     * DELETE /api/gestione-clienti/prices/{id}
     * Elimina prezzo speciale
     */
    public function deletePrice($id)
    {
        $price = ClientSpecialPrice::findOrFail($id);
        $price->delete();

        return response()->json(['success' => true, 'message' => 'Prezzo speciale eliminato']);
    }

    // ==================== CLIENT OFFERS ====================

    /**
     * GET /api/gestione-clienti/offers
     * Lista tutte le offerte
     */
    public function getOffers(Request $request)
    {
        $query = ClientOffer::with('creator');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $offers = $query->orderBy('created_at', 'desc')->get();

        return response()->json(['success' => true, 'data' => $offers]);
    }

    /**
     * POST /api/gestione-clienti/offers
     * Crea nuova offerta
     */
    public function createOffer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'discount_percentage' => 'required|numeric|min:0|max:100',
            'service_ids' => 'nullable|array',
            'service_ids.*' => 'exists:price_list_items,id',
            'client_ids' => 'nullable|array',
            'client_ids.*' => 'exists:clients,id',
            'valid_from' => 'required|date',
            'valid_until' => 'required|date|after_or_equal:valid_from',
            'image_url' => 'nullable|url|max:500',
            'terms_conditions' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $offer = ClientOffer::create([
            'title' => $request->title,
            'description' => $request->description,
            'discount_percentage' => $request->discount_percentage,
            'service_ids' => $request->service_ids ?? [],
            'client_ids' => $request->client_ids ?? null,
            'valid_from' => $request->valid_from,
            'valid_until' => $request->valid_until,
            'image_url' => $request->image_url,
            'terms_conditions' => $request->terms_conditions,
            'is_active' => true,
            'created_by' => auth()->id(),
        ]);

        return response()->json(['success' => true, 'data' => $offer], 201);
    }

    /**
     * PUT /api/gestione-clienti/offers/{id}
     * Aggiorna offerta
     */
    public function updateOffer(Request $request, $id)
    {
        $offer = ClientOffer::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'discount_percentage' => 'sometimes|required|numeric|min:0|max:100',
            'service_ids' => 'nullable|array',
            'service_ids.*' => 'exists:price_list_items,id',
            'client_ids' => 'nullable|array',
            'client_ids.*' => 'exists:clients,id',
            'valid_from' => 'sometimes|required|date',
            'valid_until' => 'sometimes|required|date|after_or_equal:valid_from',
            'image_url' => 'nullable|url|max:500',
            'terms_conditions' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $offer->update($request->only([
            'title', 'description', 'discount_percentage', 'service_ids', 'client_ids',
            'valid_from', 'valid_until', 'image_url', 'terms_conditions', 'is_active'
        ]));

        return response()->json(['success' => true, 'data' => $offer]);
    }

    /**
     * DELETE /api/gestione-clienti/offers/{id}
     * Elimina offerta
     */
    public function deleteOffer($id)
    {
        $offer = ClientOffer::findOrFail($id);
        $offer->delete();

        return response()->json(['success' => true, 'message' => 'Offerta eliminata']);
    }

    // ==================== WEB NEWS ARTICLES ====================

    /**
     * GET /api/gestione-clienti/news
     * Lista tutte le notizie
     */
    public function getNews(Request $request)
    {
        $query = WebNewsArticle::with('creator');

        if ($request->has('is_published')) {
            $query->where('is_published', $request->is_published);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        $news = $query->orderBy('created_at', 'desc')->get();

        return response()->json(['success' => true, 'data' => $news]);
    }

    /**
     * POST /api/gestione-clienti/news
     * Crea nuova notizia
     */
    public function createNews(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string',
            'image_url' => 'nullable|url|max:500',
            'author' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'is_published' => 'boolean',
            'published_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $news = WebNewsArticle::create([
            'title' => $request->title,
            'content' => $request->content,
            'excerpt' => $request->excerpt ?? substr(strip_tags($request->content), 0, 200),
            'image_url' => $request->image_url,
            'author' => $request->author,
            'category' => $request->category ?? 'generale',
            'tags' => $request->tags ?? [],
            'is_published' => $request->is_published ?? false,
            'published_at' => $request->published_at ?? ($request->is_published ? now() : null),
            'created_by' => auth()->id(),
        ]);

        return response()->json(['success' => true, 'data' => $news], 201);
    }

    /**
     * PUT /api/gestione-clienti/news/{id}
     * Aggiorna notizia
     */
    public function updateNews(Request $request, $id)
    {
        $news = WebNewsArticle::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required|string',
            'excerpt' => 'nullable|string',
            'image_url' => 'nullable|url|max:500',
            'author' => 'sometimes|required|string|max:255',
            'category' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'is_published' => 'boolean',
            'published_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only([
            'title', 'content', 'excerpt', 'image_url', 'author', 'category', 'tags', 'is_published', 'published_at'
        ]);

        // Se viene pubblicata per la prima volta, imposta published_at
        if ($request->is_published && !$news->is_published && !$request->has('published_at')) {
            $data['published_at'] = now();
        }

        $news->update($data);

        return response()->json(['success' => true, 'data' => $news]);
    }

    /**
     * DELETE /api/gestione-clienti/news/{id}
     * Elimina notizia
     */
    public function deleteNews($id)
    {
        $news = WebNewsArticle::findOrFail($id);
        $news->delete();

        return response()->json(['success' => true, 'message' => 'Notizia eliminata']);
    }

    // ==================== SERVICES ====================

    /**
     * GET /api/gestione-clienti/services
     * Lista tutti i servizi (usa PriceListItem)
     */
    public function getServices(Request $request)
    {
        $query = PriceListItem::with('department');

        if ($request->has('is_visible_to_clients')) {
            $query->where('is_visible_to_clients', $request->is_visible_to_clients);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $services = $query->orderBy('name')->get();

        // Assicurati che base_price sia sempre un numero
        $services = $services->map(function ($service) {
            $service->base_price = (float) $service->base_price;
            return $service;
        });

        return response()->json(['success' => true, 'data' => $services]);
    }

    // ==================== ACTIVE CLIENTS ====================

    /**
     * GET /api/gestione-clienti/active-clients
     * Lista clienti con accesso abilitato
     */
    public function getActiveClients()
    {
        $clients = Client::where('access_enabled', true)
            ->where('is_active', true)
            ->withCount(['projects', 'crmProjects as active_projects_count' => function($query) {
                $query->whereIn('status', ['planning', 'active']);
            }])
            ->orderBy('company_name')
            ->get();

        return response()->json(['success' => true, 'data' => $clients]);
    }

    // ==================== ORDERS ====================

    /**
     * GET /api/gestione-clienti/orders
     * Lista ordini
     */
    public function getOrders(Request $request)
    {
        $query = \App\Models\ClientOrder::with(['client', 'creator', 'referralUser', 'quote']);

        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('order_source')) {
            $query->where('order_source', $request->order_source);
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

        $orders = $orders->map(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'client_id' => $order->client_id,
                'client_name' => $order->client->company_name ?? null,
                'order_source' => $order->order_source ?? 'cliente_diretto',
                'status' => $order->status,
                'total_amount' => (float) $order->total_amount,
                'discount_amount' => (float) $order->discount_amount,
                'final_amount' => (float) $order->final_amount,
                'items' => $order->items,
                'project_info' => $order->project_info,
                'notes' => $order->notes,
                'order_date' => $order->order_date->format('Y-m-d'),
                'delivery_date' => $order->delivery_date?->format('Y-m-d'),
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'quote_id' => $order->quote_id,
                'sent_to_sellers' => $order->sent_to_sellers ?? false,
                'referral_user_id' => $order->referral_user_id,
                'referral_user_name' => $order->referralUser->name ?? null,
                'created_at' => $order->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $order->updated_at->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json(['success' => true, 'data' => $orders]);
    }

    /**
     * POST /api/gestione-clienti/orders
     * Crea nuovo ordine
     */
    public function createOrder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|exists:clients,id',
            'order_source' => 'nullable|in:dal_sito,referral,cliente_diretto',
            'items' => 'required|array|min:1',
            'items.*.service_id' => 'required|exists:price_list_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'project_info' => 'nullable|array',
            'notes' => 'nullable|string',
            'delivery_date' => 'nullable|date',
            'payment_method' => 'nullable|string|max:50',
            'referral_user_id' => 'nullable|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // Calcola totali
        $totalAmount = collect($request->items)->sum(function ($item) {
            return $item['price'] * $item['quantity'];
        });
        $discountAmount = $request->discount_amount ?? 0;
        $finalAmount = $totalAmount - $discountAmount;

        // Genera numero ordine
        $orderNumber = 'ORD-' . date('Ymd') . '-' . str_pad(\App\Models\ClientOrder::count() + 1, 4, '0', STR_PAD_LEFT);

        $order = \App\Models\ClientOrder::create([
            'order_number' => $orderNumber,
            'client_id' => $request->client_id,
            'order_source' => $request->order_source ?? 'cliente_diretto',
            'status' => 'pending',
            'total_amount' => $totalAmount,
            'discount_amount' => $discountAmount,
            'final_amount' => $finalAmount,
            'items' => $request->items,
            'project_info' => $request->project_info,
            'notes' => $request->notes,
            'order_date' => now(),
            'delivery_date' => $request->delivery_date,
            'payment_method' => $request->payment_method,
            'payment_status' => 'pending',
            'referral_user_id' => $request->referral_user_id,
            'created_by' => auth()->id(),
        ]);

        $order->load(['client', 'referralUser']);

        return response()->json(['success' => true, 'data' => $order], 201);
    }

    /**
     * PUT /api/gestione-clienti/orders/{id}
     * Aggiorna ordine
     */
    public function updateOrder(Request $request, $id)
    {
        $order = \App\Models\ClientOrder::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|in:pending,confirmed,processing,completed,cancelled',
            'payment_status' => 'sometimes|in:pending,partial,paid,refunded',
            'notes' => 'nullable|string',
            'delivery_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $order->update($request->only(['status', 'payment_status', 'notes', 'delivery_date']));
        $order->load(['client']);

        return response()->json(['success' => true, 'data' => $order]);
    }

    /**
     * DELETE /api/gestione-clienti/orders/{id}
     * Elimina ordine
     */
    public function deleteOrder($id)
    {
        $order = \App\Models\ClientOrder::findOrFail($id);
        $order->delete();

        return response()->json(['success' => true, 'message' => 'Ordine eliminato']);
    }

    /**
     * POST /api/gestione-clienti/orders/{id}/send-to-sellers
     * Invia ordine ai venditori come preventivo
     */
    public function sendOrderToSellers($id)
    {
        $order = \App\Models\ClientOrder::with(['client', 'items'])->findOrFail($id);

        if ($order->sent_to_sellers) {
            return response()->json([
                'success' => false,
                'message' => 'Questo ordine è già stato inviato ai venditori'
            ], 400);
        }

        // Crea preventivo dall'ordine
        $quote = \App\Models\Quote::create([
            'quote_number' => \App\Models\Quote::generateQuoteNumber(),
            'client_id' => $order->client_id,
            'status' => 'pending',
            'title' => "Preventivo da Ordine {$order->order_number}",
            'description' => $order->project_info['obiettivi'] ?? $order->notes ?? "Preventivo generato dall'ordine {$order->order_number}",
            'subtotal' => $order->total_amount,
            'discount_amount' => $order->discount_amount,
            'total_amount' => $order->final_amount,
            'notes' => $order->notes . ($order->project_info ? "\n\nInfo Progetto:\n" . json_encode($order->project_info, JSON_PRETTY_PRINT) : ''),
            'created_by' => auth()->id(),
        ]);

        // Crea items preventivo dagli items ordine
        foreach ($order->items as $item) {
            \App\Models\QuoteItem::create([
                'quote_id' => $quote->id,
                'price_list_item_id' => $item['service_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['price'],
                'total' => $item['total'],
            ]);
        }

        // Aggiorna ordine
        $order->update([
            'quote_id' => $quote->id,
            'sent_to_sellers' => true,
        ]);

        $quote->recalculateTotals();

        return response()->json([
            'success' => true,
            'quote_id' => $quote->id,
            'message' => 'Ordine inviato ai venditori come preventivo'
        ]);
    }

    // ==================== GIFTS ====================

    /**
     * GET /api/gestione-clienti/gifts
     * Lista regali
     */
    public function getGifts(Request $request)
    {
        $query = \App\Models\ClientGift::with(['service', 'creator']);

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        if ($request->has('email_status')) {
            $query->where('email_status', $request->email_status);
        }

        $gifts = $query->orderBy('created_at', 'desc')->get();

        // Aggiungi nomi clienti
        $gifts = $gifts->map(function ($gift) {
            $clientIds = $gift->client_ids ?? [];
            $clients = Client::whereIn('id', $clientIds)->pluck('company_name')->toArray();
            
            return [
                'id' => $gift->id,
                'title' => $gift->title,
                'description' => $gift->description,
                'gift_type' => $gift->gift_type,
                'discount_percentage' => $gift->discount_percentage ? (float) $gift->discount_percentage : null,
                'credit_amount' => $gift->credit_amount ? (float) $gift->credit_amount : null,
                'service_id' => $gift->service_id,
                'service_name' => $gift->service->name ?? null,
                'client_ids' => $clientIds,
                'client_names' => $clients,
                'valid_from' => $gift->valid_from->format('Y-m-d'),
                'valid_until' => $gift->valid_until->format('Y-m-d'),
                'email_subject' => $gift->email_subject,
                'email_body' => $gift->email_body,
                'email_status' => $gift->email_status,
                'email_sent_at' => $gift->email_sent_at?->format('Y-m-d H:i:s'),
                'is_active' => $gift->is_active,
                'created_at' => $gift->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $gift->updated_at->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json(['success' => true, 'data' => $gifts]);
    }

    /**
     * POST /api/gestione-clienti/gifts
     * Crea nuovo regalo
     */
    public function createGift(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'gift_type' => 'required|in:discount,service,credit,custom',
            'discount_percentage' => 'nullable|required_if:gift_type,discount|numeric|min:0|max:100',
            'credit_amount' => 'nullable|required_if:gift_type,credit|numeric|min:0',
            'service_id' => 'nullable|required_if:gift_type,service|exists:price_list_items,id',
            'client_ids' => 'required|array|min:1',
            'client_ids.*' => 'exists:clients,id',
            'valid_from' => 'required|date',
            'valid_until' => 'required|date|after_or_equal:valid_from',
            'email_subject' => 'nullable|string',
            'email_body' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $gift = \App\Models\ClientGift::create([
            'title' => $request->title,
            'description' => $request->description,
            'gift_type' => $request->gift_type,
            'discount_percentage' => $request->discount_percentage,
            'credit_amount' => $request->credit_amount,
            'service_id' => $request->service_id,
            'client_ids' => $request->client_ids,
            'valid_from' => $request->valid_from,
            'valid_until' => $request->valid_until,
            'email_subject' => $request->email_subject,
            'email_body' => $request->email_body,
            'email_status' => 'draft',
            'is_active' => true,
            'created_by' => auth()->id(),
        ]);

        return response()->json(['success' => true, 'data' => $gift], 201);
    }

    /**
     * PUT /api/gestione-clienti/gifts/{id}
     * Aggiorna regalo
     */
    public function updateGift(Request $request, $id)
    {
        $gift = \App\Models\ClientGift::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'email_subject' => 'nullable|string',
            'email_body' => 'nullable|string',
            'is_active' => 'boolean',
            'email_status' => 'sometimes|in:draft,scheduled,sent,failed',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $gift->update($request->only([
            'title', 'description', 'email_subject', 'email_body', 'is_active', 'email_status'
        ]));

        return response()->json(['success' => true, 'data' => $gift]);
    }

    /**
     * POST /api/gestione-clienti/gifts/{id}/send-emails
     * Invia email regalo
     */
    public function sendGiftEmails($id)
    {
        $gift = \App\Models\ClientGift::findOrFail($id);

        if ($gift->email_status === 'sent') {
            return response()->json([
                'success' => false,
                'message' => 'Le email sono già state inviate per questo regalo'
            ], 400);
        }

        // TODO: Implementare invio email
        // Per ora aggiorniamo solo lo stato
        $gift->update([
            'email_status' => 'sent',
            'email_sent_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Email inviate con successo',
            'sent_count' => count($gift->client_ids ?? [])
        ]);
    }

    /**
     * DELETE /api/gestione-clienti/gifts/{id}
     * Elimina regalo
     */
    public function deleteGift($id)
    {
        $gift = \App\Models\ClientGift::findOrFail($id);
        $gift->delete();

        return response()->json(['success' => true, 'message' => 'Regalo eliminato']);
    }

    /**
     * GET /api/gestione-clienti/backclub-requests
     * Lista richieste di accesso al BackClub (pagina richiedi-accesso)
     */
    public function getBackclubRequests()
    {
        $requests = BackClubAccessRequest::orderBy('created_at', 'desc')->get();

        $data = $requests->map(function ($req) {
            return [
                'id' => $req->id,
                'email' => $req->email,
                'created_at' => $req->created_at->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json(['success' => true, 'data' => $data]);
    }
}

