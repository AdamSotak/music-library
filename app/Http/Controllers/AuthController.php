<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function login()
    {
        return Inertia::render('auth/login');
    }

    public function signup()
    {
        return Inertia::render('auth/signup');
    }

    public function account()
    {
        return Inertia::render('auth/account');
    }

    public function storeLogin(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();

            return redirect()->intended('/');
        }

        return back()->withErrors([
            'email' => 'Invalid credentials',
        ]);
    }

    public function storeSignup(Request $request)
    {
        if (User::where('email', $request->email)->exists()) {
            return back()->withErrors([
                'email' => 'User already exists',
            ]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        Auth::login($user);

        return redirect('/')->with('success', 'Account created successfully');
    }

    public function guestLogin(Request $request)
    {
        // Create a new guest user
        $guestUser = User::createGuest();
        
        // Log in the guest user
        Auth::login($guestUser);
        
        return redirect('/')->with('success', 'Welcome! You are now browsing as a guest.');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    public function destroy(Request $request)
    {
        $user = Auth::user();
        $user->delete();
        $this->logout($request);
    }
}
