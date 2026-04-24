<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'email' => [
                'required',
                'string',
                'max:255',
                Rule::unique('users', 'email'),
            ],
            'name' => 'required|string|max:255',
            'password' => 'nullable|min:6',
            'role' => 'nullable|in:admin,ec,staff',
            'periode' => 'nullable|string|max:20',
        ]);

        $role = strtolower($validated['role'] ?? 'staff');
        $periode = (string) ($validated['periode'] ?? '2026');
        $email = strtolower(trim($validated['email']));

        $user = User::create([
            'name' => $validated['name'],
            'email' => $email,
            'password' => $validated['password'] ?? null,
            'role' => $role,
            'periode' => $periode,
        ]);

        return response()->json([
            'message' => 'Register berhasil',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'nama' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_admin' => $user->role === 'admin',
                'is_ec' => $user->role === 'ec',
                'periode' => $user->periode,
                'divisi' => $user->role === 'admin'
                    ? 'Admin'
                    : ($user->role === 'ec' ? 'EC' : 'Staff'),
            ]
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $email = strtolower(trim($validated['email']));
        $plainPassword = $validated['password'];

        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if (!$user) {
            return response()->json([
                'message' => 'User tidak ditemukan',
                'code' => 'USER_NOT_FOUND',
            ], 404);
        }

        if (empty($user->password)) {
            return response()->json([
                'message' => 'Password belum dibuat. Silakan buat password terlebih dahulu.',
                'code' => 'PASSWORD_NOT_SET',
            ], 422);
        }

        if (!Hash::check($plainPassword, $user->password)) {
            return response()->json([
                'message' => 'Password salah',
                'code' => 'INVALID_PASSWORD',
            ], 422);
        }

        $member = Member::whereRaw('LOWER(email) = ?', [$email])->first();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $member->nama ?? $user->name,
                'nama' => $member->nama ?? $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'periode' => (string) ($member->periode ?? $user->periode ?? '2025'),
                'divisi' => $member->divisi ?? ($user->role === 'admin' ? 'Admin' : ($user->role === 'ec' ? 'EC' : 'Staff')),
                'jabatan' => $member->jabatan ?? null,
                'tahun_angkatan' => $member->tahun_angkatan ?? null,
                'foto' => $member->foto ?? null,
                'is_admin' => $user->role === 'admin',
                'is_ec' => $user->role === 'ec',
            ],
        ]);
    }

    public function createPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required', 'string', 'min:3', 'confirmed'],
        ]);

        $email = strtolower(trim($validated['email']));

        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if (!$user) {
            return response()->json([
                'message' => 'User tidak ditemukan',
                'code' => 'USER_NOT_FOUND',
            ], 404);
        }

        if (!empty($user->password)) {
            return response()->json([
                'message' => 'Password sudah dibuat. Gunakan menu login atau hubungi admin untuk reset password.',
                'code' => 'PASSWORD_ALREADY_SET',
            ], 422);
        }

        $user->password = $validated['password'];
        $user->save();

        return response()->json([
            'message' => 'Password berhasil dibuat.',
        ]);
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'password' => ['required', 'string', 'min:3', 'confirmed'],
        ]);

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 401);
        }

        $user->password = $validated['password'];
        $user->save();

        return response()->json([
            'message' => 'Password berhasil diubah'
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logout berhasil'
        ]);
    }
}