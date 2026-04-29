<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\KegiatanController;
use App\Http\Controllers\PresensiController;
use App\Http\Controllers\KeuanganController;
use App\Http\Controllers\ProkerController;
use App\Http\Controllers\TemplateSuratController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\AppStateController;

Route::get('/', function () {
    return response()->json([
        'status' => 'API NFSCC jalan'
    ]);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/create-password', [AuthController::class, 'createPassword']);
Route::post('/update-password', [AuthController::class, 'updatePassword'])->middleware('auth:sanctum');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

Route::get('/state/{periode}', [AppStateController::class, 'show']);
Route::put('/state/{periode}', [AppStateController::class, 'update']);

// PUBLIC READ-ONLY
Route::get('/members-archived', [MemberController::class, 'archivedIndex']);
Route::get('/proker-archived', [ProkerController::class, 'archivedIndex']);
Route::get('/kegiatan-archived', [KegiatanController::class, 'archivedIndex']);
Route::get('/template-surat', [TemplateSuratController::class, 'index']);
Route::get('/template-surat/{template_surat}', [TemplateSuratController::class, 'show']);

Route::get('/proker', [ProkerController::class, 'index']);
Route::get('/kegiatan', [KegiatanController::class, 'index']);
Route::get('/presensi', [PresensiController::class, 'index']);

Route::get('/members', [MemberController::class, 'index']);
Route::get('/members/{member}', [MemberController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/members/archive-by-period', [MemberController::class, 'archiveByPeriod']);

    Route::apiResource('members', MemberController::class)->except(['index', 'show']);

    Route::post('/members/{id}/reset-password', [MemberController::class, 'resetPassword']);
    Route::post('/members/{id}/archive', [MemberController::class, 'archive']);
    Route::post('/members/{id}/restore', [MemberController::class, 'restore']);

    Route::post('/proker/{id}/archive', [ProkerController::class, 'archive']);
    Route::post('/proker/{id}/restore', [ProkerController::class, 'restore']);

    Route::post('/kegiatan/{id}/archive', [KegiatanController::class, 'archive']);
    Route::post('/kegiatan/{id}/restore', [KegiatanController::class, 'restore']);

    Route::get('/keuangan', [KeuanganController::class, 'index']);
    Route::get('/keuangan/{id}/bukti', [KeuanganController::class, 'bukti']);

    Route::apiResource('kegiatan', KegiatanController::class)->except(['index']);
    Route::apiResource('presensi', PresensiController::class)->except(['index']);
    Route::apiResource('keuangan', KeuanganController::class)->except(['index']);
    Route::apiResource('proker', ProkerController::class)->except(['index']);

    Route::post('/template-surat', [TemplateSuratController::class, 'store']);
    Route::put('/template-surat/{template_surat}', [TemplateSuratController::class, 'update']);
    Route::delete('/template-surat/{template_surat}', [TemplateSuratController::class, 'destroy']);

    Route::apiResource('events', EventController::class);
});