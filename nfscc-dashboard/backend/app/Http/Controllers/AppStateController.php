<?php

namespace App\Http\Controllers;

use App\Models\AppState;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppStateController extends Controller
{
    public function show(string $periode)
    {
        $state = AppState::where('periode', $periode)->first();

        if (!$state) {
            return response()->json([
                'periode' => $periode,
                'data' => null,
            ]);
        }

        return response()->json([
            'id' => $state->id,
            'periode' => $state->periode,
            'data' => $state->data,
            'updated_at' => $state->updated_at,
        ]);
    }

    public function update(Request $request, string $periode)
    {
        $validated = $request->validate([
            'data' => ['required', 'array'],
        ]);

        $data = $validated['data'];
        $periodeId = (string) $periode;

        $periods = collect($data['periods'] ?? []);
        $matchedPeriod = $periods->first(function ($item) use ($periodeId) {
            return StringablePeriodId($item['id'] ?? null) === $periodeId;
        });

        $isEnabled = is_array($matchedPeriod)
            ? (bool) ($matchedPeriod['isEnabled'] ?? true)
            : true;

        DB::transaction(function () use ($periodeId, $data, $isEnabled) {
            AppState::updateOrCreate(
                ['periode' => $periodeId],
                ['data' => $data]
            );

            if ($isEnabled) {
                Member::where('periode', $periodeId)
                    ->where('archived', true)
                    ->update([
                        'archived' => false,
                        'archived_at' => null,
                        'archived_by' => null,
                        'archive_reason' => null,
                    ]);
            } else {
                Member::where('periode', $periodeId)
                    ->where('archived', false)
                    ->update([
                        'archived' => true,
                        'archived_at' => now(),
                        'archive_reason' => 'periode_dinonaktifkan',
                    ]);
            }
        });

        return response()->json([
            'message' => 'State periode berhasil diperbarui',
            'periode' => $periodeId,
            'isEnabled' => $isEnabled,
            'data' => $data,
        ]);
    }
}

/**
 * Helper kecil biar aman ubah ke string.
 */
function StringablePeriodId($value): string
{
    return (string) ($value ?? '');
}