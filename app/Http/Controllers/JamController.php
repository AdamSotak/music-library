<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class JamController extends Controller
{
    public function show(string $id)
    {
        // Lightweight landing page so shared links/QRs don’t 404
        return Inertia::render('jam/show', [
            'jamId' => $id,
        ]);
    }
}
