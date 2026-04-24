<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('keuangans', function (Blueprint $table) {
            $table->string('bukti_path')->nullable()->after('bukti_tipe');
            $table->text('bukti_url')->nullable()->after('bukti_path');
        });
    }

    public function down(): void
    {
        Schema::table('keuangans', function (Blueprint $table) {
            $table->dropColumn(['bukti_path', 'bukti_url']);
        });
    }
};