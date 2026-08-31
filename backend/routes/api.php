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
use App\Http\Controllers\Api\LaporanController;
use App\Http\Controllers\Api\JurusanController;
use App\Http\Controllers\Api\KelasController;
use App\Http\Controllers\Api\AsetPerKelasController;
use App\Http\Controllers\Api\InventarisController;
use App\Http\Controllers\Api\InventarisBarangController;
use App\Http\Controllers\Api\FolderInventarisController;
use App\Http\Controllers\Api\InventarisGudangController;
use App\Http\Controllers\Api\SaranaPrasaranaController;
use App\Http\Controllers\Api\DaftarBelanjaController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

// Public Routes for Directory
Route::get('ruangans', [RuanganController::class, 'index']);
Route::get('ruangans/{ruangan}', [RuanganController::class, 'show']);
Route::get('asets', [AsetController::class, 'index']);
Route::get('asets/{aset}', [AsetController::class, 'show']);
Route::get('stats', [AsetController::class, 'publicStats']);
Route::get('daftar-belanja/summary', [DaftarBelanjaController::class, 'summary']);
Route::get('gedungs', [GedungController::class, 'index']);
Route::get('kategoris', [KategoriController::class, 'index']);
Route::get('sumber-danas', [SumberDanaController::class, 'index']);
Route::get('servises', [ServisController::class, 'index']);
Route::get('peminjamans', [PeminjamanController::class, 'index']);

// Public Routes for Jurusan & Kelas (untuk halaman public)
Route::get('jurusans', [JurusanController::class, 'index']);
Route::get('jurusans/{id}', [JurusanController::class, 'show']);
Route::get('jurusans/kode/{kode}', [JurusanController::class, 'getByKode']);
Route::get('jurusans/{id}/kelas', [KelasController::class, 'getByJurusan']);
Route::get('jurusans/{id}/kelas/{tingkat}', [KelasController::class, 'getByTingkat']);
Route::get('aset-per-kelas/{id}', [AsetPerKelasController::class, 'getAsetByKelas']);
Route::get('aset-per-kelas/summary/jurusan/{id}', [AsetPerKelasController::class, 'getSummaryByJurusan']);
Route::get('aset-per-kelas/summary/kelas/{id}', [AsetPerKelasController::class, 'getSummaryByKelas']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/profile/password', [AuthController::class, 'updatePassword']);

    Route::apiResource('gedungs', GedungController::class)->except(['index']);
    Route::apiResource('ruangans', RuanganController::class)->except(['index', 'show']);
    Route::apiResource('kategoris', KategoriController::class)->except(['index']);
    Route::apiResource('sumber-danas', SumberDanaController::class);
    Route::apiResource('kondisis', KondisiController::class);

    Route::post('asets/import', [AsetController::class, 'importExcel']);
    Route::post('asets/batch-delete', [AsetController::class, 'batchDelete']);
    Route::post('asets/batch-store', [AsetController::class, 'batchStore']);
    Route::apiResource('asets', AsetController::class)->except(['index', 'show']);
    Route::post('/asets/{aset}/fotos', [FotoAsetController::class, 'store']);
    Route::delete('/fotos/{foto}', [FotoAsetController::class, 'destroy']);

    Route::apiResource('histories', HistoryController::class)->only(['index', 'show']);
    Route::apiResource('servises', ServisController::class)->except(['index']);
    Route::apiResource('peminjamans', PeminjamanController::class)->except(['index']);

    // Laporan
    Route::get('laporan/aset',       [LaporanController::class, 'aset']);
    Route::get('laporan/servis',     [LaporanController::class, 'servis']);
    Route::get('laporan/peminjaman', [LaporanController::class, 'peminjaman']);

    // Kelas Management (Admin only - CRUD)
    Route::apiResource('kelas', KelasController::class);

    // Inventaris
    Route::post('inventaris/import', [InventarisController::class, 'importExcel']);
    Route::post('inventaris/import-barang', [InventarisBarangController::class, 'importExcel']); // Format Barang (Kode Rekening + Kode Program)
    Route::get('inventaris/summary', [InventarisController::class, 'summary']);
    Route::apiResource('inventaris', InventarisController::class);
    Route::apiResource('folder-inventaris', FolderInventarisController::class);

    // Sarana Prasarana
    Route::post('sarana-prasaranas/import', [SaranaPrasaranaController::class, 'importExcel']);
    Route::post('sarana-prasaranas/batch-store', [SaranaPrasaranaController::class, 'batchStore']);
    Route::get('sarana-prasaranas/summary', [SaranaPrasaranaController::class, 'summary']);
    Route::apiResource('sarana-prasaranas', SaranaPrasaranaController::class);

    // Inventaris Gudang (Tabel & System Terpisah)
    Route::post('inventaris-gudang/import', [InventarisGudangController::class, 'importExcel']);
    Route::get('inventaris-gudang/summary', [InventarisGudangController::class, 'summary']);
    Route::apiResource('inventaris-gudang', InventarisGudangController::class);

    // Daftar Belanja (Tabel & System Terpisah - Format Kode Rekening + Kode Program)
    Route::post('daftar-belanja/batch-store', [DaftarBelanjaController::class, 'batchStore']);
    Route::post('daftar-belanja/batch-delete', [DaftarBelanjaController::class, 'batchDelete']);
    Route::apiResource('daftar-belanja', DaftarBelanjaController::class);
});
