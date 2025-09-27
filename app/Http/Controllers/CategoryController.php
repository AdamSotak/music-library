<?php

namespace App\Http\Controllers;

use App\Constants\Constants;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function show()
    {
        $categories = Constants::CATEGORIES;

        return Inertia::render('categories/all', ['categories' => $categories]);
    }

    public function showById($id)
    {
        $category = collect(Constants::CATEGORIES)->where('id', $id)->first();

        return Inertia::render('categories/id', ['category' => $category]);
    }
}
