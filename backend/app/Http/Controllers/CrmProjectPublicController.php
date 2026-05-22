<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CrmProjectPublicController extends Controller
{
    /**
     * GET /api/crm-projects/public-settings
     * Elenco progetti CRM con impostazioni pubbliche per gestione da Gestione Clienti.
     */
    public function index(Request $request)
    {
        $query = CrmProject::with(['client']);

        if ($request->filled('client_id')) {
            $query->where('client_id', $request->get('client_id'));
        }

        $projects = $query
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (CrmProject $project) {
                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'client_id' => $project->client_id,
                    'client_name' => $project->client?->company_name,
                    'status' => $project->status,
                    'is_public' => (bool) $project->is_public,
                    'public_slug' => $project->public_slug,
                    'public_title' => $project->public_title,
                    'public_subtitle' => $project->public_subtitle,
                    'public_short_description' => $project->public_short_description,
                    'public_category' => $project->public_category,
                    'public_status_label' => $project->public_status_label,
                    'public_hero_image_url' => $project->public_hero_image_url,
                    'public_technologies' => $project->public_technologies ?? [],
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $projects,
        ]);
    }

    /**
     * PUT /api/crm-projects/{id}/public-settings
     * Aggiorna le impostazioni pubbliche di un progetto CRM.
     */
    public function update(Request $request, int $id)
    {
        $project = CrmProject::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'is_public' => 'sometimes|boolean',
            'public_slug' => 'nullable|string|max:190|unique:crm_projects,public_slug,' . $project->id,
            'public_title' => 'nullable|string|max:255',
            'public_subtitle' => 'nullable|string|max:255',
            'public_short_description' => 'nullable|string',
            'public_long_description' => 'nullable|string',
            'public_category' => 'nullable|string|max:100',
            'public_status_label' => 'nullable|string|max:100',
            'public_hero_image_url' => 'nullable|string|max:500',
            'public_technologies' => 'nullable|array',
            'public_technologies.*' => 'string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // Normalizza slug se presente
        if (array_key_exists('public_slug', $data) && $data['public_slug']) {
            $data['public_slug'] = \Str::slug($data['public_slug']);
        }

        $project->fill($data);
        $project->save();

        return response()->json([
            'success' => true,
            'data' => $project->only([
                'id',
                'is_public',
                'public_slug',
                'public_title',
                'public_subtitle',
                'public_short_description',
                'public_category',
                'public_status_label',
                'public_hero_image_url',
                'public_technologies',
            ]),
        ]);
    }
}

