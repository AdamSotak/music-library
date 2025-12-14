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
        // Add is_shared column to playlists table
        Schema::table('playlists', function (Blueprint $table) {
            $table->boolean('is_shared')->default(false)->after('is_default');
        });

        // Create the shared_playlist_users pivot table
        Schema::create('shared_playlist_users', function (Blueprint $table) {
            $table->uuid('playlist_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('added_by'); // The owner who added this user
            $table->timestamp('added_at')->useCurrent();

            $table->primary(['playlist_id', 'user_id']);

            $table->foreign('playlist_id')
                ->references('id')
                ->on('playlists')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('added_by')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shared_playlist_users');

        Schema::table('playlists', function (Blueprint $table) {
            $table->dropColumn('is_shared');
        });
    }
};
