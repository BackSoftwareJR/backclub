<?php

namespace App\Http\Controllers;

use App\Models\CrmProject;
use Illuminate\Http\Request;

class PublicProjectsController extends Controller
{
    /**
     * GET /api/public/projects
     * Lista progetti CRM pubblici per il sito BackSoftware.
     */
    public function index(Request $request)
    {
        $query = CrmProject::query()
            ->where('is_public', true)
            ->with(['client']);

        if ($request->filled('category')) {
            $query->where('public_category', $request->get('category'));
        }

        $projects = $query
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (CrmProject $project) {
                return $this->transformProject($project);
            });

        return response()->json([
            'success' => true,
            'data' => $projects,
        ]);
    }

    /**
     * GET /api/public/projects/{slug}
     * Dettaglio singolo progetto pubblico.
     */
    public function show(string $slug)
    {
        $project = CrmProject::where('public_slug', $slug)
            ->where('is_public', true)
            ->with(['client'])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $this->transformProject($project, true),
        ]);
    }

    /**
     * Trasforma il modello CrmProject in payload pubblico per il sito BackSoftware.
     *
     * @param  CrmProject  $project
     * @param  bool        $includeLongDescription
     * @return array
     */
    protected function transformProject(CrmProject $project, bool $includeLongDescription = false): array
    {
        return [
            'id' => $project->id,
            'slug' => $project->public_slug,
            'title' => $project->public_title ?? $project->name,
            'subtitle' => $project->public_subtitle,
            'description' => $project->public_short_description,
            'long_description' => $includeLongDescription ? $project->public_long_description : null,
            'client' => $project->client ? $project->client->company_name : null,
            'category' => $project->public_category,
            'status' => $project->public_status_label,
            'image' => $project->public_hero_image_url ?? $project->cover_photo_url,
            'year' => optional($project->start_date)->format('Y'),
            'technologies' => $project->public_technologies ?? [],
            'gallery' => $project->public_gallery ?? [],
        ];
    }
}

