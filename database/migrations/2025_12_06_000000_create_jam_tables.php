<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jam_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('host_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('seed_type');
            $table->string('seed_id');
            $table->boolean('allow_controls')->default(true);
            $table->timestamps();
        });

        Schema::create('jam_participants', function (Blueprint $table) {
            $table->uuid('jam_id');
            $table->foreign('jam_id')->references('id')->on('jam_sessions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role')->default('guest');
            $table->timestamp('joined_at')->useCurrent();
            $table->primary(['jam_id', 'user_id']);
        });

        Schema::create('jam_queue_items', function (Blueprint $table) {
            $table->uuid('jam_id');
            $table->foreign('jam_id')->references('id')->on('jam_sessions')->cascadeOnDelete();
            $table->unsignedInteger('position');
            $table->uuid('track_id');
            $table->foreign('track_id')->references('id')->on('tracks')->cascadeOnDelete();
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source')->nullable();
            $table->timestamps();
            $table->primary(['jam_id', 'position']);
        });

        Schema::create('jam_playback_states', function (Blueprint $table) {
            $table->uuid('jam_id')->primary();
            $table->foreign('jam_id')->references('id')->on('jam_sessions')->cascadeOnDelete();
            $table->unsignedInteger('position')->default(0);
            $table->unsignedInteger('offset_ms')->default(0);
            $table->boolean('is_playing')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jam_playback_states');
        Schema::dropIfExists('jam_queue_items');
        Schema::dropIfExists('jam_participants');
        Schema::dropIfExists('jam_sessions');
    }
};
