<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GedungController;
use App\Http\Controllers\Api\RuanganController;
use App\Http\Controllers\Api\KategoriController;
use App\Http\Controllers\Api\SumberDanaController;
use App\Http\Controllers\Api\KondisiController;
use App\Http\Controllers\Api\AsetController;
use App\Http\Controllers\Api\FotoAsetController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\ServisController;
use App\Http\Controllers\Api\PeminjamanController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

// Public Routes for Directory
Route::get('ruangans', [RuanganController::class, 'index']);
Route::get('ruangans/{ruangan}', [RuanganController::class, 'show']);
Route::get('asets', [AsetController::class, 'index']);
Route::get('asets/{aset}', [AsetController::class, 'show']);
Route::get('stats', [AsetController::class, 'publicStats']);
Route::get('gedungs', [GedungController::class, 'index']);
Route::get('kategoris', [KategoriController::class, 'index']);
Route::get('servises', [ServisController::class, 'index']);
Route::get('peminjamans', [PeminjamanController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::apiResource('gedungs', GedungController::class)->except(['index']);
    Route::apiResource('ruangans', RuanganController::class)->except(['index', 'show']);
    Route::apiResource('kategoris', KategoriController::class)->except(['index']);
    Route::apiResource('sumber-danas', SumberDanaController::class);
    Route::apiResource('kondisis', KondisiController::class);

    Route::post('asets/import', [AsetController::class, 'importExcel']);
    Route::apiResource('asets', AsetController::class)->except(['index', 'show']);
    Route::post('/asets/{aset}/fotos', [FotoAsetController::class, 'store']);
    Route::delete('/fotos/{foto}', [FotoAsetController::class, 'destroy']);

    Route::apiResource('histories', HistoryController::class)->only(['index', 'show']);
    Route::apiResource('servises', ServisController::class)->except(['index']);
    Route::apiResource('peminjamans', PeminjamanController::class)->except(['index']);
});
