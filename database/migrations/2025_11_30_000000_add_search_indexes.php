<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tracks', function (Blueprint $table) {
            $table->index('name');
            $table->index('artist_id');
        });

        Schema::table('artists', function (Blueprint $table) {
            $table->index('name');
        });

        Schema::table('albums', function (Blueprint $table) {
            $table->index('name');
            $table->index('artist_id');
        });
    }

    public function down(): void
    {
        Schema::table('tracks', function (Blueprint $table) {
            $table->dropIndex(['name']);
            $table->dropIndex(['artist_id']);
        });

        Schema::table('artists', function (Blueprint $table) {
            $table->dropIndex(['name']);
        });

        Schema::table('albums', function (Blueprint $table) {
            $table->dropIndex(['name']);
            $table->dropIndex(['artist_id']);
        });
    }
};
