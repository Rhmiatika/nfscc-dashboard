<?php

namespace App\Http\Controllers;

use App\Models\Kegiatan;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class KegiatanController extends Controller
{
    private function transformKegiatan(Kegiatan $kegiatan): array
    {
        return [
            'id' => $kegiatan->id,
            'periodId' => (string) ($kegiatan->periode ?? ''),
            'title' => $kegiatan->nama_kegiatan ?? '',
            'tanggal' => $kegiatan->tanggal ?? '',
            'lokasi' => $kegiatan->lokasi ?? '',
            'pic' => $kegiatan->pic ?? '',
            'dokLink' => $kegiatan->foto_kegiatan ?? '',
            'notulensiLink' => $kegiatan->notulensi_link ?? '',
            'eventId' => $kegiatan->event_id,
            'deskripsi' => $kegiatan->deskripsi ?? '',
            'hiddenFromKegiatanPage' => (bool) $kegiatan->hidden_from_kegiatan_page,
            'pageRemovedAt' => $kegiatan->page_removed_at,
            'pageRemovedBy' => $kegiatan->page_removed_by ?? '',
            'createdAt' => $kegiatan->created_at,
            'updatedAt' => $kegiatan->updated_at,
        ];
    }

    public function index(Request $request)
    {
        $query = Kegiatan::query()
            ->where('hidden_from_kegiatan_page', false);

        if ($request->filled('periode')) {
            $query->where('periode', (string) $request->periode);
        }

        $items = $query
            ->latest('tanggal')
            ->latest()
            ->get()
            ->map(fn ($item) => $this->transformKegiatan($item));

        return response()->json($items);
    }

    public function archivedIndex(Request $request)
    {
        $query = Kegiatan::query();

        if ($request->filled('periode')) {
            $query->where('periode', (string) $request->periode);
        }

        $items = $query
            ->latest('page_removed_at')
            ->latest('tanggal')
            ->latest()
            ->get()
            ->map(fn ($item) => $this->transformKegiatan($item));

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_kegiatan' => ['required', 'string', 'max:255'],
            'deskripsi' => ['nullable', 'string'],
            'tanggal' => ['required', 'date'],
            'lokasi' => ['nullable', 'string', 'max:255'],
            'pic' => ['nullable', 'string', 'max:255'],
            'event_id' => ['nullable', Rule::exists('events', 'id')],
            'foto_kegiatan' => ['nullable', 'string'],
            'notulensi_link' => ['nullable', 'string'],
            'hidden_from_kegiatan_page' => ['nullable', 'boolean'],
            'page_removed_at' => ['nullable', 'date'],
            'page_removed_by' => ['nullable', 'string', 'max:255'],
            'periode' => ['nullable', 'string', 'max:20'],
        ]);

        $validated['periode'] = $validated['periode'] ?? '2025';
        $validated['hidden_from_kegiatan_page'] = $validated['hidden_from_kegiatan_page'] ?? false;

        $kegiatan = Kegiatan::create($validated);

        return response()->json($this->transformKegiatan($kegiatan), 201);
    }

    public function show(string $id)
    {
        $kegiatan = Kegiatan::findOrFail($id);
        return response()->json($this->transformKegiatan($kegiatan));
    }

    public function update(Request $request, string $id)
    {
        $kegiatan = Kegiatan::findOrFail($id);

        $validated = $request->validate([
            'nama_kegiatan' => ['sometimes', 'string', 'max:255'],
            'deskripsi' => ['nullable', 'string'],
            'tanggal' => ['sometimes', 'date'],
            'lokasi' => ['nullable', 'string', 'max:255'],
            'pic' => ['nullable', 'string', 'max:255'],
            'event_id' => ['nullable', Rule::exists('events', 'id')],
            'foto_kegiatan' => ['nullable', 'string'],
            'notulensi_link' => ['nullable', 'string'],
            'hidden_from_kegiatan_page' => ['nullable', 'boolean'],
            'page_removed_at' => ['nullable', 'date'],
            'page_removed_by' => ['nullable', 'string', 'max:255'],
            'periode' => ['nullable', 'string', 'max:20'],
        ]);

        $kegiatan->update($validated);

        return response()->json($this->transformKegiatan($kegiatan->fresh()));
    }

    public function archive(Request $request, string $id)
    {
        $kegiatan = Kegiatan::findOrFail($id);

        $kegiatan->update([
            'hidden_from_kegiatan_page' => true,
            'page_removed_at' => now(),
            'page_removed_by' => $request->input('page_removed_by'),
        ]);

        return response()->json($this->transformKegiatan($kegiatan->fresh()));
    }

    public function restore(string $id)
    {
        $kegiatan = Kegiatan::findOrFail($id);

        $kegiatan->update([
            'hidden_from_kegiatan_page' => false,
            'page_removed_at' => null,
            'page_removed_by' => null,
        ]);

        return response()->json($this->transformKegiatan($kegiatan->fresh()));
    }

    public function destroy(string $id)
    {
        Kegiatan::findOrFail($id)->delete();

        return response()->json([
            'message' => 'Deleted',
        ]);
    }
}