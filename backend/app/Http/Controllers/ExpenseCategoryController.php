<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    public function index()
    {
        $categories = ExpenseCategory::with('children')
            ->active()
            ->rootCategories()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    public function show($id)
    {
        $category = ExpenseCategory::with(['parent', 'children'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'parent_id' => 'nullable|exists:expense_categories,id',
            'code' => 'required|string|max:50|unique:expense_categories',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:7',
            'budget_monthly' => 'nullable|numeric|min:0',
            'requires_approval' => 'boolean',
            'approval_threshold' => 'nullable|numeric|min:0',
        ]);

        $category = ExpenseCategory::create($validated);

        return response()->json([
            'success' => true,
            'data' => $category,
        ], 201);
    }

    public function update($id, Request $request)
    {
        $category = ExpenseCategory::findOrFail($id);

        if ($category->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'Non puoi modificare categorie di sistema',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'budget_monthly' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);

        return response()->json([
            'success' => true,
            'data' => $category,
        ]);
    }

    public function destroy($id)
    {
        $category = ExpenseCategory::findOrFail($id);

        if ($category->is_system) {
            return response()->json([
                'success' => false,
                'message' => 'Non puoi eliminare categorie di sistema',
            ], 403);
        }

        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Categoria eliminata',
        ]);
    }
}

