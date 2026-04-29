<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MemberController extends Controller
{
    private function transformMember(Member $member): array
    {
        return [
            'id' => $member->id,
            'name' => $member->nama,
            'loginId' => $member->email,
            'divisi' => $member->divisi,
            'position' => $member->jabatan,
            'tahunAngkatan' => $member->tahun_angkatan,
            'isEC' => (bool) $member->is_ec,
            'periodId' => (string) ($member->periode ?? ''),
            'photo' => $member->foto,
            'isActive' => true,
            'archived' => (bool) $member->archived,
            'archivedAt' => $member->archived_at,
            'archivedBy' => $member->archived_by,
            'archiveReason' => $member->archive_reason,
            'createdAt' => $member->created_at,
            'updatedAt' => $member->updated_at,
        ];
    }

    // fix deploy

    private function resolveRole(?string $jabatan, bool $isEC): string
    {
        $jabatan = strtolower(trim((string) $jabatan));

        if ($jabatan === 'admin') {
            return 'admin';
        }

        if (in_array($jabatan, ['lead', 'vice lead', 'executive committee']) || $isEC) {
            return 'ec';
        }

        return 'staff';
    }

    private function normalizeEmail(?string $email): string
    {
        return strtolower(trim((string) $email));
    }

    private function resolveIncomingPeriod(array $validated, ?string $fallback = null): string
    {
        $period = $validated['periode'] ?? $validated['periodId'] ?? $fallback;

        return trim((string) $period);
    }

    private function syncUserFromMember(Member $member, ?string $oldEmail = null): void
    {
        $newEmail = $this->normalizeEmail($member->email);
        $oldEmail = $this->normalizeEmail($oldEmail ?: $member->email);
        $role = $this->resolveRole($member->jabatan, (bool) $member->is_ec);

        $periode = trim((string) $member->periode);

        DB::transaction(function () use ($member, $oldEmail, $newEmail, $role, $periode) {
            $oldUser = $oldEmail !== ''
                ? User::whereRaw('LOWER(email) = ?', [$oldEmail])->first()
                : null;

            $newUser = $newEmail !== ''
                ? User::whereRaw('LOWER(email) = ?', [$newEmail])->first()
                : null;

            $user = $oldUser ?: $newUser;

            if (!$user) {
                $user = new User();
            }

            $existingPassword = $oldUser?->password ?: $newUser?->password;
            $existingPeriod = trim((string) ($oldUser?->periode ?: $newUser?->periode ?: ''));

            $user->name = $member->nama;
            $user->email = $newEmail;
            $user->role = $role;
            $user->periode = $periode !== '' ? $periode : $existingPeriod;

            if ($existingPassword !== null && $existingPassword !== '') {
                $user->password = $existingPassword;
            } elseif (!$user->exists) {
                $user->password = null;
            }

            $user->save();

            if ($oldUser && $newUser && $oldUser->id !== $newUser->id) {
                if ($oldUser->id === $user->id) {
                    $newUser->delete();
                } else {
                    $oldUser->delete();
                }
            }

            if ($oldEmail !== '' && $oldEmail !== $newEmail) {
                User::whereRaw('LOWER(email) = ?', [$oldEmail])
                    ->where('id', '!=', $user->id)
                    ->delete();
            }
        });
    }

    public function index(Request $request): JsonResponse
    {
        $query = Member::query()->where('archived', false);

        if ($request->filled('periode')) {
            $query->where('periode', (string) $request->periode);
        }

        $members = $query
            ->orderBy('nama')
            ->get()
            ->map(fn ($member) => $this->transformMember($member));

        return response()->json($members);
    }

    public function archivedIndex(Request $request)
    {
        $periode = $request->query('periode');

        $query = Member::where('archived', true);

        if (!empty($periode)) {
            $query->where('periode', $periode);
        }

        return response()->json($query->orderBy('archived_at', 'desc')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['nullable', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],

            'email' => ['nullable', 'string', 'max:255', 'unique:anggotas,email'],
            'loginId' => ['nullable', 'string', 'max:255', 'unique:anggotas,email'],

            'divisi' => ['nullable', 'string', 'max:255'],

            'jabatan' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],

            'tahun_angkatan' => ['nullable', 'string', 'max:20'],
            'tahunAngkatan' => ['nullable', 'string', 'max:20'],

            'foto' => ['nullable', 'string'],
            'photo' => ['nullable', 'string'],

            'is_ec' => ['nullable', 'boolean'],
            'isEC' => ['nullable', 'boolean'],

            'periode' => ['nullable', 'string', 'max:20'],
            'periodId' => ['nullable', 'string', 'max:20'],
        ]);

        $nama = trim((string) ($validated['nama'] ?? $validated['name'] ?? ''));
        $email = $this->normalizeEmail($validated['email'] ?? $validated['loginId'] ?? '');
        $periode = $this->resolveIncomingPeriod($validated);

        if ($nama === '') {
            return response()->json(['message' => 'Nama wajib diisi'], 422);
        }

        if ($email === '') {
            return response()->json(['message' => 'Login ID wajib diisi'], 422);
        }

        if ($periode === '') {
            return response()->json(['message' => 'Periode wajib dikirim saat membuat member'], 422);
        }

        $member = Member::create([
            'nama' => $nama,
            'email' => $email,
            'divisi' => $validated['divisi'] ?? null,
            'jabatan' => $validated['jabatan'] ?? $validated['position'] ?? null,
            'tahun_angkatan' => $validated['tahun_angkatan'] ?? $validated['tahunAngkatan'] ?? null,
            'foto' => $request->input('foto') ?? $request->input('photo'),
            'password' => null,
            'is_ec' => (bool) ($validated['is_ec'] ?? $validated['isEC'] ?? false),
            'periode' => $periode,
            'archived' => false,
            'archived_at' => null,
            'archived_by' => null,
            'archive_reason' => null,
        ]);

        $this->syncUserFromMember($member);

        return response()->json($this->transformMember($member->fresh()), 201);
    }

    public function show(string $id): JsonResponse
    {
        $member = Member::findOrFail($id);

        return response()->json($this->transformMember($member));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $member = Member::findOrFail($id);
        $oldEmail = $this->normalizeEmail($member->email);

        $validated = $request->validate([
            'nama' => ['nullable', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],

            'email' => ['nullable', 'string', 'max:255', Rule::unique('anggotas', 'email')->ignore($id)],
            'loginId' => ['nullable', 'string', 'max:255', Rule::unique('anggotas', 'email')->ignore($id)],

            'divisi' => ['nullable', 'string', 'max:255'],

            'jabatan' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],

            'tahun_angkatan' => ['nullable', 'string', 'max:20'],
            'tahunAngkatan' => ['nullable', 'string', 'max:20'],

            'foto' => ['nullable', 'string'],
            'photo' => ['nullable', 'string'],

            'is_ec' => ['nullable', 'boolean'],
            'isEC' => ['nullable', 'boolean'],

            'periode' => ['nullable', 'string', 'max:20'],
            'periodId' => ['nullable', 'string', 'max:20'],
        ]);

        $updateData = [];

        if (array_key_exists('nama', $validated) || array_key_exists('name', $validated)) {
            $updateData['nama'] = trim((string) ($validated['nama'] ?? $validated['name'] ?? ''));
        }

        if (array_key_exists('email', $validated) || array_key_exists('loginId', $validated)) {
            $updateData['email'] = $this->normalizeEmail($validated['email'] ?? $validated['loginId'] ?? '');
        }

        if (array_key_exists('divisi', $validated)) {
            $updateData['divisi'] = $validated['divisi'];
        }

        if (array_key_exists('jabatan', $validated) || array_key_exists('position', $validated)) {
            $updateData['jabatan'] = $validated['jabatan'] ?? $validated['position'];
        }

        if (array_key_exists('tahun_angkatan', $validated) || array_key_exists('tahunAngkatan', $validated)) {
            $updateData['tahun_angkatan'] = $validated['tahun_angkatan'] ?? $validated['tahunAngkatan'];
        }

        if ($request->has('foto') || $request->has('photo')) {
            $updateData['foto'] = $request->input('foto') ?? $request->input('photo');
        }

        if (array_key_exists('is_ec', $validated) || array_key_exists('isEC', $validated)) {
            $updateData['is_ec'] = (bool) ($validated['is_ec'] ?? $validated['isEC']);
        }

        if (array_key_exists('periode', $validated) || array_key_exists('periodId', $validated)) {
            $resolvedPeriod = $this->resolveIncomingPeriod($validated, (string) $member->periode);

            if ($resolvedPeriod !== '') {
                $updateData['periode'] = $resolvedPeriod;
            }
        }

        $member->update($updateData);

        $this->syncUserFromMember($member->fresh(), $oldEmail);

        return response()->json($this->transformMember($member->fresh()));
    }

    public function destroy(string $id): JsonResponse
    {
        $member = Member::findOrFail($id);
        $email = $this->normalizeEmail($member->email);

        $member->delete();
        User::whereRaw('LOWER(email) = ?', [$email])->delete();

        return response()->json([
            'message' => 'Member deleted',
        ]);
    }

    public function archive(Request $request, string $id): JsonResponse
    {
        $member = Member::findOrFail($id);

        $member->update([
            'archived' => true,
            'archived_at' => now(),
            'archived_by' => $request->input('archived_by', $request->input('archivedBy')),
            'archive_reason' => $request->input('archive_reason', $request->input('reason', 'periode_dinonaktifkan')),
        ]);

        return response()->json($this->transformMember($member->fresh()));
    }

    public function archiveByPeriod(Request $request): JsonResponse
    {
        $periode = (string) $request->input('periode');

        if ($periode === '') {
            return response()->json(['message' => 'Periode wajib diisi'], 422);
        }

        $count = Member::where('periode', $periode)
            ->where(function ($q) {
                $q->where('archived', false)
                ->orWhereNull('archived');
            })
            ->update([
                'archived' => true,
                'archived_at' => now(),
                'archived_by' => $request->input('archived_by', $request->input('archivedBy', 'admin')),
                'archive_reason' => $request->input('archive_reason', $request->input('reason', 'periode_dinonaktifkan')),
            ]);

        return response()->json([
            'message' => "Anggota periode {$periode} berhasil diarsipkan",
            'count' => $count,
        ]);
    }

    public function restore(string $id): JsonResponse
    {
        $member = Member::findOrFail($id);

        $member->update([
            'archived' => false,
            'archived_at' => null,
            'archived_by' => null,
            'archive_reason' => null,
        ]);

        return response()->json($this->transformMember($member->fresh()));
    }
}