<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Client;
use App\Models\Project;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class ClientController extends Controller
{
    /**
     * Get all clients with optional filters
     */
    public function index(Request $request)
    {
        $query = Client::query();

        // Search filter
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('vat_number', 'like', "%{$search}%")
                  ->orWhere('ragione_sociale', 'like', "%{$search}%")
                  ->orWhere('referente_nome', 'like', "%{$search}%")
                  ->orWhere('referente_cognome', 'like', "%{$search}%");
            });
        }

        // Active only filter
        if ($request->has('active_only') && $request->active_only) {
            $query->active();
        }

        // With access enabled filter
        if ($request->has('with_access') && $request->with_access) {
            $query->withAccessEnabled();
        }

        // Filter by seller_id (for venditori section)
        // Include clients that either:
        // 1. Have seller_id directly set on the client record, OR
        // 2. Have quotes with this seller_id (even if client doesn't have seller_id set)
        if ($request->has('seller_id') && $request->seller_id) {
            $query->where(function ($q) use ($request) {
                $q->where('seller_id', $request->seller_id)
                  ->orWhereHas('quotes', function ($quoteQuery) use ($request) {
                      $quoteQuery->where('seller_id', $request->seller_id);
                  });
            });
        }

        // Include relationships
        $query->with(['seller:id,user_id', 'seller.user:id,name,email'])
              ->withCount(['projects', 'activeProjects', 'crmProjects', 'contracts', 'quotes'])
              ->withAggregate('quotes as first_quote_date', 'created_at', 'min')
              ->withAggregate('quotes as last_quote_date', 'created_at', 'max');

        $clients = $query->orderBy('company_name')->get();

        return response()->json([
            'success' => true,
            'data' => $clients
        ]);
    }

    /**
     * Get single client with full details
     */
    public function show($id)
    {
        $client = Client::with([
            'seller:id,user_id',
            'seller.user:id,name,email',
            'projects' => function ($query) {
                $query->with(['manager:id,name,email', 'projectType:id,name,icon,color'])
                      ->orderBy('created_at', 'desc');
            },
            'crmProjects' => function ($query) {
                $query->with(['manager:id,name,email', 'crmDepartment:id,code,name,color,icon'])
                      ->orderBy('created_at', 'desc');
            },
            'contracts' => function ($query) {
                $query->with(['quote:id,quote_number,title', 'project:id,name'])
                      ->orderBy('created_at', 'desc');
            },
            'quotes' => function ($query) {
                $query->with(['seller:id,user_id', 'seller.user:id,name,email'])
                      ->orderBy('created_at', 'desc');
            }
        ])->withCount(['projects', 'activeProjects', 'crmProjects', 'contracts', 'quotes'])
          ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $client
        ]);
    }

    /**
     * Create new client
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'company_name' => 'required|string|max:255',
            'ragione_sociale' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'referente_nome' => 'nullable|string|max:255',
            'referente_cognome' => 'nullable|string|max:255',
            'referente_telefono' => 'nullable|string|max:50',
            'referente_email' => 'nullable|email|max:255',
            'partita_iva' => 'nullable|string|max:50',
            'codice_fiscale' => 'nullable|string|max:50',
            'vat_number' => 'nullable|string|max:50',
            'tax_code' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'iban' => 'nullable|string|max:50',
            'swift' => 'nullable|string|max:50',
            'sdi_code' => 'nullable|string|max:50',
            'pec' => 'nullable|email|max:255',
            'sito_web' => 'nullable|url|max:255',
            'drive_link_foto' => 'nullable|url',
            'drive_link_video' => 'nullable|url',
            'drive_link_materiali' => 'nullable|url',
            'facebook_profile' => 'nullable|url',
            'google_ads_account' => 'nullable|string|max:255',
            'google_my_business' => 'nullable|url',
            'visura_camerale_url' => 'nullable|url',
            'visura_camerale_reminder' => 'boolean',
            'privacy_sheet_url' => 'nullable|url',
            'carta_servizi_url' => 'nullable|url',
            'carta_identita_url' => 'nullable|url',
            'payment_terms' => 'nullable|string|max:255',
            'credit_limit_cocchi' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'access_enabled' => 'boolean',
            'access_password' => 'nullable|string|min:6',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        
        // Hash password if provided
        if (isset($data['access_password'])) {
            $data['access_password'] = Hash::make($data['access_password']);
        }

        $client = Client::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Cliente creato con successo',
            'data' => $client
        ], 201);
    }

    /**
     * Update client
     */
    public function update(Request $request, $id)
    {
        $client = Client::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'company_name' => 'string|max:255',
            'ragione_sociale' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'referente_nome' => 'nullable|string|max:255',
            'referente_cognome' => 'nullable|string|max:255',
            'referente_telefono' => 'nullable|string|max:50',
            'referente_email' => 'nullable|email|max:255',
            'partita_iva' => 'nullable|string|max:50',
            'codice_fiscale' => 'nullable|string|max:50',
            'vat_number' => 'nullable|string|max:50',
            'tax_code' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'iban' => 'nullable|string|max:50',
            'swift' => 'nullable|string|max:50',
            'sdi_code' => 'nullable|string|max:50',
            'pec' => 'nullable|email|max:255',
            'sito_web' => 'nullable|url|max:255',
            'drive_link_foto' => 'nullable|url',
            'drive_link_video' => 'nullable|url',
            'drive_link_materiali' => 'nullable|url',
            'facebook_profile' => 'nullable|url',
            'google_ads_account' => 'nullable|string|max:255',
            'google_my_business' => 'nullable|url',
            'visura_camerale_url' => 'nullable|url',
            'visura_camerale_reminder' => 'boolean',
            'privacy_sheet_url' => 'nullable|url',
            'carta_servizi_url' => 'nullable|url',
            'carta_identita_url' => 'nullable|url',
            'payment_terms' => 'nullable|string|max:255',
            'credit_limit_cocchi' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'access_enabled' => 'boolean',
            'access_password' => 'nullable|string|min:6',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        
        // Hash password if provided and changed
        if (isset($data['access_password'])) {
            $data['access_password'] = Hash::make($data['access_password']);
        }

        $client->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Cliente aggiornato con successo',
            'data' => $client->fresh()
        ]);
    }

    /**
     * Delete client
     */
    public function destroy($id)
    {
        $client = Client::findOrFail($id);
        
        // Check if client has projects
        if ($client->projects()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Impossibile eliminare: il cliente ha progetti associati'
            ], 400);
        }

        $client->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cliente eliminato con successo'
        ]);
    }

    /**
     * Get client projects
     */
    public function getProjects($id)
    {
        $client = Client::findOrFail($id);
        
        $projects = $client->projects()
            ->with(['manager:id,name,email', 'projectType:id,name,icon,color'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $projects
        ]);
    }

    /**
     * Toggle client access
     */
    public function toggleAccess($id)
    {
        $client = Client::findOrFail($id);
        $client->access_enabled = !$client->access_enabled;
        $client->save();

        return response()->json([
            'success' => true,
            'message' => 'Accesso cliente ' . ($client->access_enabled ? 'abilitato' : 'disabilitato'),
            'data' => $client
        ]);
    }

    /**
     * Reset client password
     */
    public function resetPassword(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string|min:6'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $client = Client::findOrFail($id);
        $client->access_password = Hash::make($request->password);
        $client->save();

        return response()->json([
            'success' => true,
            'message' => 'Password aggiornata con successo'
        ]);
    }
}
