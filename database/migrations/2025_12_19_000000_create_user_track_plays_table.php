<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_track_plays', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('track_id');
            $table->unsignedInteger('offset_ms')->default(0);
            $table->string('context')->nullable();
            $table->timestamp('played_at')->useCurrent();

            $table->index(['user_id', 'played_at']);
            $table->index(['user_id', 'track_id']);

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('track_id')->references('id')->on('tracks')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_track_plays');
    }
};
