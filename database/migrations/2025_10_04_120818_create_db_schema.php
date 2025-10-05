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
        Schema::create('artists', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('image_url');
            $table->integer('monthly_listeners');
            $table->boolean('is_verified');
            $table->timestamps();
        });

        Schema::create('albums', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->foreignId('artist_id')->constrained('artists');
            $table->string('image_url');
            $table->date('release_date');
            $table->string('genre');
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->string('slug')->primary();
            $table->string('name');
            $table->string('color');
            $table->string('image_url');
            $table->timestamps();
        });

        Schema::create('tracks', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->foreignId('artist_id')->constrained('artists');
            $table->foreignId('album_id')->constrained('albums');
            $table->integer('duration');
            $table->string('audio_url');
            $table->string('category_slug');
            $table->foreign('category_slug')
                ->references('slug')
                ->on('categories')
                ->onUpdate('cascade')
                ->onDelete('cascade');
            $table->timestamps();
        });

        Schema::create('playlists', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('description');
            $table->boolean('is_default');
            $table->timestamps();
        });

        Schema::create('playlist_tracks', function (Blueprint $table) {
            $table->primary(['playlist_id', 'track_id']);
            $table->foreignId('playlist_id')->on('playlists')->onUpdate('cascade')->onDelete('cascade');
            $table->foreignId('track_id')->on('tracks')->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('artists');
        Schema::dropIfExists('albums');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('tracks');
        Schema::dropIfExists('playlists');
        Schema::dropIfExists('playlist_tracks');
    }
};
