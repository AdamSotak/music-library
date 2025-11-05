<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Add is_guest flag
            $table->boolean('is_guest')->default(false)->after('remember_token');
            
            // Make email nullable for guest users
            $table->string('email')->nullable()->change();
            
            // Make password nullable for guest users
            $table->string('password')->nullable()->change();
            
            // Drop unique constraint on email
            $table->dropUnique(['email']);
        });
        
        // Add a unique constraint on email only for non-guest users
        Schema::table('users', function (Blueprint $table) {
            $table->unique(['email'], 'users_email_unique_non_guest');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Remove the conditional unique constraint
            $table->dropUnique('users_email_unique_non_guest');
            
            // Restore original constraints
            $table->string('email')->nullable(false)->change();
            $table->string('password')->nullable(false)->change();
            $table->unique('email');
            
            // Remove is_guest column
            $table->dropColumn('is_guest');
        });
    }
};
