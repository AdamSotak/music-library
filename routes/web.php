<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('index');
});

Route::get('/login', [AuthController::class, 'login']);
Route::get('/signup', [AuthController::class, 'signup']);

Route::get('/categories', [CategoryController::class, 'show']);
Route::get('/categories/{id}', [CategoryController::class, 'showById']);
