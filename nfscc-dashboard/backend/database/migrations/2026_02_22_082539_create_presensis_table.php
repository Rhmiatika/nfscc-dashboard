<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presensis', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->enum('type', ['Internal', 'Eksternal'])->default('Internal');
            $table->date('date')->nullable();
            $table->string('location')->nullable();
            $table->json('hadir')->nullable();
            $table->json('izin')->nullable();
            $table->json('izin_reasons')->nullable();
            $table->string('created_by')->nullable();
            $table->string('periode')->default('2026');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presensis');
    }
};