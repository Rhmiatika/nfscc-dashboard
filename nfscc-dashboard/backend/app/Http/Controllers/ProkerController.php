<?php

namespace App\Http\Controllers;

use App\Models\Proker;
use Illuminate\Http\Request;

class ProkerController extends Controller
{
    private function transform(Proker $p): array
    {
        return [
            'id' => $p->id,
            'periodId' => (string) $p->periode,
            'title' => $p->nama,
            'divisi' => $p->divisi,
            'date' => $p->tanggal_mulai,
            'endDate' => $p->tanggal_selesai,
            'pic' => $p->pic,
            'budget' => $p->anggaran,
            'note' => $p->deskripsi,
            'status' => $p->status,
            'proposalLink' => $p->proposal_link,
            'docLink' => $p->doc_link,
            'notulensiLink' => $p->notulensi_link,
            'hiddenFromProkerPage' => (bool) $p->hidden_from_proker_page,
            'archived' => (bool) $p->archived,
            'pageRemovedAt' => $p->page_removed_at,
            'pageRemovedBy' => $p->page_removed_by,
            'createdAt' => $p->created_at,
            'updatedAt' => $p->updated_at,
        ];
    }

    public function index(Request $request)
    {
        $q = Proker::where('hidden_from_proker_page', false);

        if ($request->filled('periode')) {
            $q->where('periode', $request->periode);
        }

        return response()->json(
            $q->latest()->get()->map(fn ($p) => $this->transform($p))
        );
    }

    public function archivedIndex(Request $request)
    {
        $q = Proker::query();

        if ($request->filled('periode')) {
            $q->where('periode', $request->periode);
        }

        return response()->json(
            $q->latest('page_removed_at')->latest()->get()->map(fn ($p) => $this->transform($p))
        );
    }

    public function store(Request $request)
    {
        $p = Proker::create($request->all());
        return response()->json($this->transform($p), 201);
    }

    public function update(Request $request, $id)
    {
        $p = Proker::findOrFail($id);
        $p->update($request->all());

        return response()->json($this->transform($p->fresh()));
    }

    public function archive(Request $request, $id)
    {
        $p = Proker::findOrFail($id);

        $p->update([
            'hidden_from_proker_page' => true,
            'archived' => true,
            'page_removed_at' => now(),
            'page_removed_by' => $request->input('page_removed_by'),
        ]);

        return response()->json($this->transform($p->fresh()));
    }

    public function restore($id)
    {
        $p = Proker::findOrFail($id);

        $p->update([
            'hidden_from_proker_page' => false,
            'archived' => false,
            'page_removed_at' => null,
            'page_removed_by' => null,
        ]);

        return response()->json($this->transform($p->fresh()));
    }

    public function destroy($id)
    {
        Proker::findOrFail($id)->delete();

        return response()->json(['message' => 'deleted']);
    }
}