<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('index');
});

Route::get('/login', function () {
    return Inertia::render('auth/login');
});

Route::get('/signup', function () {
    return Inertia::render('auth/signup');
});
