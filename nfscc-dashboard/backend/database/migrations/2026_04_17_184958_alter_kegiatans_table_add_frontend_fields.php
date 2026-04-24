<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kegiatans', function (Blueprint $table) {
            if (!Schema::hasColumn('kegiatans', 'pic')) {
                $table->string('pic')->nullable();
            }

            if (!Schema::hasColumn('kegiatans', 'proposal')) {
                $table->string('proposal')->nullable();
            }

            if (!Schema::hasColumn('kegiatans', 'dokumentasi')) {
                $table->string('dokumentasi')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('kegiatans', function (Blueprint $table) {
            if (Schema::hasColumn('kegiatans', 'pic')) {
                $table->dropColumn('pic');
            }

            if (Schema::hasColumn('kegiatans', 'proposal')) {
                $table->dropColumn('proposal');
            }

            if (Schema::hasColumn('kegiatans', 'dokumentasi')) {
                $table->dropColumn('dokumentasi');
            }
        });
    }
};