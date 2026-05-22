<?php

namespace App\Http\Controllers;

use App\Models\ProjectType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectTypeController extends Controller
{
    /**
     * GET /api/project-types
     * Get all project types/templates
     */
    public function index(Request $request)
    {
        $query = ProjectType::query();

        if ($request->has('active_only') && $request->active_only) {
            $query->where('is_active', true);
        }

        $types = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $types,
        ]);
    }

    /**
     * GET /api/project-types/{id}
     * Get single project type
     */
    public function show($id)
    {
        try {
            $type = ProjectType::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $type,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Project type not found',
            ], 404);
        }
    }

    /**
     * POST /api/project-types
     * Create new project type
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50|unique:project_types,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'required_fields' => 'nullable|json',
            'default_duration_days' => 'nullable|integer|min:1',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $type = ProjectType::create($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Project type created successfully',
                'data' => $type,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating project type: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/project-types/{id}
     * Update project type
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'sometimes|string|max:50|unique:project_types,code,' . $id,
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'required_fields' => 'nullable|json',
            'default_duration_days' => 'nullable|integer|min:1',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $type = ProjectType::findOrFail($id);
            $type->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Project type updated successfully',
                'data' => $type->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating project type: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/project-types/{id}
     * Delete project type
     */
    public function destroy($id)
    {
        try {
            $type = ProjectType::findOrFail($id);
            $type->delete();

            return response()->json([
                'success' => true,
                'message' => 'Project type deleted successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error deleting project type: ' . $e->getMessage(),
            ], 500);
        }
    }
}
