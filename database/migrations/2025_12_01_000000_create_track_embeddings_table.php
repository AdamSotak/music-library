<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('track_embeddings', function (Blueprint $table) {
            $table->string('track_id')->primary();
            $table->foreign('track_id')->references('id')->on('tracks')->cascadeOnDelete();
            $table->json('embedding');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('track_embeddings');
    }
};
