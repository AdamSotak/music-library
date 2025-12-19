<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jam_sessions', function (Blueprint $table) {
            if (! Schema::hasColumn('jam_sessions', 'queue_version')) {
                $table->unsignedInteger('queue_version')->default(0)->after('allow_controls');
            }
        });

        Schema::table('jam_queue_items', function (Blueprint $table) {
            if (! Schema::hasColumn('jam_queue_items', 'id')) {
                // Use a separate UUID column for stable queue item identity.
                $table->uuid('id')->nullable()->after('jam_id');
                $table->unique('id');
            }
        });

        // Backfill ids for existing rows.
        $existing = DB::table('jam_queue_items')->whereNull('id')->get();
        foreach ($existing as $row) {
            DB::table('jam_queue_items')
                ->where('jam_id', $row->jam_id)
                ->where('position', $row->position)
                ->update(['id' => (string) \Illuminate\Support\Str::uuid()]);
        }

    }

    public function down(): void
    {
        Schema::table('jam_queue_items', function (Blueprint $table) {
            if (Schema::hasColumn('jam_queue_items', 'id')) {
                $table->dropUnique(['id']);
                $table->dropColumn('id');
            }
        });

        Schema::table('jam_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('jam_sessions', 'queue_version')) {
                $table->dropColumn('queue_version');
            }
        });
    }
};
