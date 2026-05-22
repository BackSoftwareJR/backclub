<?php

namespace App\Http\Controllers;

use App\Models\Vendor;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function index(Request $request)
    {
        $query = Vendor::query();

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('q')) {
            $query->search($request->q);
        }

        $vendors = $query->orderBy('name', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $vendors,
        ]);
    }

    public function show($id)
    {
        $vendor = Vendor::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $vendor,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'business_name' => 'nullable|string|max:255',
            'vat_number' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:50',
            'iban' => 'nullable|string|max:34',
            'payment_terms_days' => 'nullable|integer|min:0',
        ]);

        $vendor = Vendor::create($validated);

        return response()->json([
            'success' => true,
            'data' => $vendor,
        ], 201);
    }

    public function update($id, Request $request)
    {
        $vendor = Vendor::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:50',
            'is_active' => 'boolean',
        ]);

        $vendor->update($validated);

        return response()->json([
            'success' => true,
            'data' => $vendor,
        ]);
    }

    public function destroy($id)
    {
        $vendor = Vendor::findOrFail($id);
        $vendor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Fornitore eliminato',
        ]);
    }
}

