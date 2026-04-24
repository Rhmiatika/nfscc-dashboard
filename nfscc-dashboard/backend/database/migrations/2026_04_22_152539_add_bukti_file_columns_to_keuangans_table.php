<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('keuangans', function (Blueprint $table) {
            $table->string('bukti_tipe')->nullable();
            $table->string('bukti_path')->nullable();
            $table->text('bukti_url')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('keuangans', function (Blueprint $table) {
            $table->dropColumn(['bukti_path', 'bukti_url']);
        });
    }
};