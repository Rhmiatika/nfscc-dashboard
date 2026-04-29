<?php

namespace App\Http\Controllers;

use App\Models\Keuangan;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

class KeuanganController extends Controller
{
    public function index(Request $request)
    {
        $query = Keuangan::query();

        if ($request->filled('periode')) {
            $query->where('periode', (string) $request->periode);
        }

        $items = $query->latest('tanggal')->latest()->get();

        if (!$this->canAccessBukti($request)) {
            $items->transform(function ($item) {
                $item->bukti_url = null;
                $item->bukti_path = null;
                return $item;
            });
        }

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'keterangan' => ['required', 'string', 'max:255'],
            'jenis' => ['required', Rule::in(['pemasukan', 'pengeluaran'])],
            'jumlah' => ['required', 'integer', 'min:0'],
            'tanggal' => ['required', 'date'],
            'periode' => ['nullable', 'string', 'max:20'],

            'kind' => ['nullable', 'string', 'max:20'],
            'member_id' => ['nullable', 'string', 'max:255'],
            'member_name' => ['nullable', 'string', 'max:255'],
            'member_divisi' => ['nullable', 'string', 'max:255'],
            'divisi' => ['nullable', 'string', 'max:255'],
            'tipe' => ['nullable', 'string', 'max:50'],
            'kategori' => ['nullable', 'string', 'max:255'],
            'catatan' => ['nullable', 'string'],
            'bukti_nama' => ['nullable', 'string', 'max:255'],
            'bukti_tipe' => ['nullable', 'string', 'max:255'],
            'bukti' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:4096'],
            'dibuat_oleh' => ['nullable', 'string', 'max:255'],
            'start_month' => ['nullable', 'string', 'max:100'],
            'end_month' => ['nullable', 'string', 'max:100'],
            'months_count' => ['nullable', 'integer', 'min:0'],
            'nominal_per_bulan' => ['nullable', 'integer', 'min:0'],
        ]);

        $validated['periode'] = isset($validated['periode']) && $validated['periode'] !== ''
            ? (string) $validated['periode']
            : null;

        if ($request->hasFile('bukti')) {
            $file = $request->file('bukti');
            $path = $file->store('bukti-keuangan', 'public');

            $validated['bukti_nama'] = $file->getClientOriginalName();
            $validated['bukti_tipe'] = $file->getMimeType();
            $validated['bukti_path'] = $path;
            $validated['bukti_url'] = asset('storage/' . $path);
        } else {
            $validated['bukti_path'] = null;
            $validated['bukti_url'] = null;
        }

        $item = Keuangan::create($validated);
        return response()->json($item->fresh(), 201);
    }

    public function show($id)
    {
        return response()->json(Keuangan::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $keuangan = Keuangan::findOrFail($id);

        $validated = $request->validate([
            'keterangan' => ['sometimes', 'string', 'max:255'],
            'jenis' => ['sometimes', Rule::in(['pemasukan', 'pengeluaran'])],
            'jumlah' => ['sometimes', 'integer', 'min:0'],
            'tanggal' => ['sometimes', 'date'],
            'periode' => ['nullable', 'string', 'max:20'],

            'kind' => ['nullable', 'string', 'max:20'],
            'member_id' => ['nullable', 'string', 'max:255'],
            'member_name' => ['nullable', 'string', 'max:255'],
            'member_divisi' => ['nullable', 'string', 'max:255'],
            'divisi' => ['nullable', 'string', 'max:255'],
            'tipe' => ['nullable', 'string', 'max:50'],
            'kategori' => ['nullable', 'string', 'max:255'],
            'catatan' => ['nullable', 'string'],
            'bukti_nama' => ['nullable', 'string', 'max:255'],
            'bukti_tipe' => ['nullable', 'string', 'max:255'],
            'bukti' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:4096'],
            'dibuat_oleh' => ['nullable', 'string', 'max:255'],
            'start_month' => ['nullable', 'string', 'max:100'],
            'end_month' => ['nullable', 'string', 'max:100'],
            'months_count' => ['nullable', 'integer', 'min:0'],
            'nominal_per_bulan' => ['nullable', 'integer', 'min:0'],
        ]);

        $keuangan->update($validated);
        if ($request->hasFile('bukti')) {
            if ($keuangan->bukti_path && Storage::disk('public')->exists($keuangan->bukti_path)) {
                Storage::disk('public')->delete($keuangan->bukti_path);
            }

            $file = $request->file('bukti');
            $path = $file->store('bukti-keuangan', 'public');

            $validated['bukti_nama'] = $file->getClientOriginalName();
            $validated['bukti_tipe'] = $file->getMimeType();
            $validated['bukti_path'] = $path;
            $validated['bukti_url'] = asset('storage/' . $path);
        }
        return response()->json($keuangan->fresh());
    }

    public function destroy($id)
    {
        $keuangan = Keuangan::findOrFail($id);

        if ($keuangan->bukti_path && Storage::disk('public')->exists($keuangan->bukti_path)) {
            Storage::disk('public')->delete($keuangan->bukti_path);
        }

        $keuangan->delete();

        return response()->json(['message' => 'Deleted']);
    }

    private function canAccessBukti(Request $request): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        $divisi = strtolower((string) ($user->divisi ?? ''));
        $role = strtolower((string) ($user->role ?? ''));

        return $role === 'admin' || $divisi === 'treasurer';
    }

    public function bukti(Request $request, $id)
    {
        if (!$this->canAccessBukti($request)) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses untuk melihat bukti transaksi.'
            ], 403);
        }

        $keuangan = Keuangan::findOrFail($id);

        if (!$keuangan->bukti_path || !Storage::disk('public')->exists($keuangan->bukti_path)) {
            return response()->json([
                'message' => 'Bukti transaksi tidak ditemukan.'
            ], 404);
        }

        return Storage::disk('public')->response(
            $keuangan->bukti_path,
            $keuangan->bukti_nama
        );
    }
}