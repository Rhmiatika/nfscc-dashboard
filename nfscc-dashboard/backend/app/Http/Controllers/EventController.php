<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $query = Event::query();

        if ($request->filled('periode')) {
            $query->where('periode', $request->string('periode'));
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_event' => ['required', 'string', 'max:255'],
            'tanggal' => ['required', 'date'],
            'deskripsi' => ['nullable', 'string'],
            'lokasi' => ['nullable', 'string', 'max:255'],
            'periode' => ['nullable', 'string', 'max:20'],
        ]);

        $validated['periode'] = $validated['periode'] ?? '2025';

        return response()->json(Event::create($validated), 201);
    }

    public function show($id)
    {
        return response()->json(Event::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $event = Event::findOrFail($id);

        $validated = $request->validate([
            'nama_event' => ['sometimes', 'string', 'max:255'],
            'tanggal' => ['sometimes', 'date'],
            'deskripsi' => ['nullable', 'string'],
            'lokasi' => ['nullable', 'string', 'max:255'],
            'periode' => ['nullable', 'string', 'max:20'],
        ]);

        $event->update($validated);
        return response()->json($event);
    }

    public function destroy($id)
    {
        Event::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted']);
    }
}