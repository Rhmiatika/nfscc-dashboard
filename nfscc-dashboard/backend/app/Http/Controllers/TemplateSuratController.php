<?php

namespace App\Http\Controllers;

use App\Models\TemplateSurat;
use Illuminate\Http\Request;

class TemplateSuratController extends Controller
{
    public function index(Request $request)
    {
        // TAMPILKAN SEMUA DOKUMEN DARI SEMUA PERIODE
        return response()->json(
            TemplateSurat::query()
                ->latest()
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'judul' => ['required', 'string', 'max:255'],
            'isi' => ['required', 'string'],
            'periode' => ['nullable', 'string', 'max:20'],
        ]);

        // tetap simpan periode untuk histori
        $validated['periode'] = $validated['periode'] ?? '2025';

        $template = TemplateSurat::create($validated);

        return response()->json($template, 201);
    }

    public function show(string $id)
    {
        return response()->json(TemplateSurat::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $template = TemplateSurat::findOrFail($id);

        $validated = $request->validate([
            'judul' => ['sometimes', 'string', 'max:255'],
            'isi' => ['sometimes', 'string'],
            'periode' => ['nullable', 'string', 'max:20'],
        ]);

        $template->update($validated);

        return response()->json($template);
    }

    public function destroy(string $id)
    {
        $template = TemplateSurat::findOrFail($id);
        $template->delete();

        return response()->json([
            'message' => 'Template surat deleted'
        ]);
    }
}