<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('anggotas', function (Blueprint $table) {
            if (!Schema::hasColumn('anggotas', 'tahun_angkatan')) {
                $table->string('tahun_angkatan')->nullable()->after('jabatan');
            }

            if (!Schema::hasColumn('anggotas', 'foto')) {
                $table->longText('foto')->nullable()->after('tahun_angkatan');
            }
        });
    }

    public function down(): void
    {
        Schema::table('anggotas', function (Blueprint $table) {
            if (Schema::hasColumn('anggotas', 'tahun_angkatan')) {
                $table->dropColumn('tahun_angkatan');
            }

            if (Schema::hasColumn('anggotas', 'foto')) {
                $table->dropColumn('foto');
            }
        });
    }
};