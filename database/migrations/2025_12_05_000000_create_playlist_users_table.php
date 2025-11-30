<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('playlist_users', function (Blueprint $table) {
            $table->uuid('playlist_id');
            $table->uuid('user_id');
            $table->string('role')->default('collaborator'); // owner|collaborator|viewer
            $table->timestamps();

            $table->primary(['playlist_id', 'user_id']);
            $table->foreign('playlist_id')->references('id')->on('playlists')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::table('playlists', function (Blueprint $table) {
            $table->boolean('is_collaborative')->default(false)->after('is_default');
            $table->string('invite_token')->nullable()->after('is_collaborative');
        });

        // Backfill: make each playlist creator an owner entry.
        $connection = Schema::getConnection();
        $playlists = $connection->table('playlists')->select('id', 'user_id')->get();
        foreach ($playlists as $playlist) {
            $connection->table('playlist_users')->updateOrInsert(
                ['playlist_id' => $playlist->id, 'user_id' => $playlist->user_id],
                [
                    'role' => 'owner',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        Schema::table('playlists', function (Blueprint $table) {
            $table->dropColumn(['is_collaborative', 'invite_token']);
        });
        Schema::dropIfExists('playlist_users');
    }
};
