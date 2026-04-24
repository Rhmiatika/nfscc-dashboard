<?php

namespace App\Http\Controllers;

use App\Models\Presensi;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PresensiController extends Controller
{
    public function index(Request $request)
    {
        $query = Presensi::query();

        if ($request->filled('periode')) {
            $query->where('periode', (string) $request->periode);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['Internal', 'Eksternal'])],
            'date' => ['nullable', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
            'hadir' => ['nullable', 'array'],
            'izin' => ['nullable', 'array'],
            'izin_reasons' => ['nullable', 'array'],
            'created_by' => ['nullable', 'string', 'max:255'],
            'periode' => ['nullable', 'string', 'max:20'],
        ]);

        $validated['periode'] = $validated['periode'] ?? '2026';
        $validated['hadir'] = array_values($validated['hadir'] ?? []);
        $validated['izin'] = array_values($validated['izin'] ?? []);
        $validated['izin_reasons'] = $validated['izin_reasons'] ?? [];

        $presensi = Presensi::create($validated);

        return response()->json($presensi, 201);
    }

    public function show(string $id)
    {
        return response()->json(Presensi::findOrFail($id));
    }

    public function update(Request $request, string $id)
    {
        $presensi = Presensi::findOrFail($id);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', Rule::in(['Internal', 'Eksternal'])],
            'date' => ['nullable', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
            'hadir' => ['nullable', 'array'],
            'izin' => ['nullable', 'array'],
            'izin_reasons' => ['nullable', 'array'],
            'created_by' => ['nullable', 'string', 'max:255'],
            'periode' => ['nullable', 'string', 'max:20'],
        ]);

        if (array_key_exists('hadir', $validated)) {
            $validated['hadir'] = array_values($validated['hadir'] ?? []);
        }

        if (array_key_exists('izin', $validated)) {
            $validated['izin'] = array_values($validated['izin'] ?? []);
        }

        if (array_key_exists('izin_reasons', $validated)) {
            $validated['izin_reasons'] = $validated['izin_reasons'] ?? [];
        }

        $presensi->update($validated);

        return response()->json($presensi);
    }

    public function destroy(string $id)
    {
        $presensi = Presensi::findOrFail($id);
        $presensi->delete();

        return response()->json([
            'message' => 'Presensi berhasil dihapus',
        ]);
    }
}