<?php

namespace App\Http\Controllers;

use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use PragmaRX\Google2FA\Google2FA;

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

    public function showTwoFactorVerify()
    {
        return Inertia::render('auth/verify-2fa');
    }

    public function storeLogin(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();

            // Check if user has 2FA enabled
            if (auth()->user()->two_factor_enabled) {
                return redirect()->route('2fa.verify');
            }

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

    public function setupTwoFactor(Request $request)
    {
        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();

        // Validate secret was generated properly
        if (! $secret || strlen($secret) < 16) {
            return response()->json(['error' => 'Failed to generate 2FA secret'], 500);
        }

        auth()->user()->update(['two_factor_secret' => $secret]);

        $qrCodeUrl = $google2fa->getQRCodeUrl(
            'Spotify Clone',
            auth()->user()->email,
            $secret
        );

        $renderer = new ImageRenderer(
            new RendererStyle(300),
            new SvgImageBackEnd
        );
        $writer = new Writer($renderer);
        $qrCodeSvg = $writer->writeString($qrCodeUrl);

        return response()->json([
            'qrCode' => $qrCodeSvg,
            'secret' => $secret,
        ]);
    }

    public function verifyTwoFactor(Request $request)
    {
        $google2fa = new Google2FA;

        $valid = $google2fa->verifyKey(
            auth()->user()->two_factor_secret,
            $request->code
        );

        if ($valid) {
            auth()->user()->update(['two_factor_enabled' => true]);

            // Auto-verify the session so user doesn't need to re-login
            session(['2fa_verified' => true]);

            return response()->json(['success' => true]);
        }

        return response()->json(['success' => false]);
    }

    public function verifyTwoFactorLogin(Request $request)
    {
        $user = auth()->user();

        // Check if user has 2FA enabled and has a secret
        if (! $user->two_factor_enabled || ! $user->two_factor_secret) {
            return redirect('/')->with('error', '2FA is not properly configured');
        }

        $secret = $user->two_factor_secret;

        // Additional validation for secret length
        if (strlen($secret) < 16) {
            return redirect('/')->with('error', '2FA secret is invalid. Please disable and re-enable 2FA.');
        }

        $google2fa = new Google2FA;

        $valid = $google2fa->verifyKey(
            $secret,
            $request->code,
            2
        );

        if ($valid) {
            session(['2fa_verified' => true]);

            return redirect()->intended('/');
        }

        return back()->withErrors(['code' => 'Invalid code']);
    }

    public function disableTwoFactor()
    {
        auth()->user()->update([
            'two_factor_secret' => null,
            'two_factor_enabled' => false,
        ]);

        session()->forget('2fa_verified');

        return response()->json(['success' => true]);
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
