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
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

// Public Routes for Directory
Route::get('ruangans', [RuanganController::class, 'index']);
Route::get('ruangans/{ruangan}', [RuanganController::class, 'show']);
Route::get('asets', [AsetController::class, 'index']);
Route::get('asets/{aset}', [AsetController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::apiResource('gedungs', GedungController::class);
    Route::apiResource('ruangans', RuanganController::class)->except(['index', 'show']);
    Route::apiResource('kategoris', KategoriController::class);
    Route::apiResource('sumber-danas', SumberDanaController::class);
    Route::apiResource('kondisis', KondisiController::class);
    
    Route::apiResource('asets', AsetController::class)->except(['index', 'show']);
    Route::post('/asets/{aset}/fotos', [FotoAsetController::class, 'store']);
    Route::delete('/fotos/{foto}', [FotoAsetController::class, 'destroy']);
    
    Route::apiResource('histories', HistoryController::class)->only(['index', 'show']);
});
