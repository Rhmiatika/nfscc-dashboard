<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prokers', function (Blueprint $table) {
            $table->string('divisi')->nullable()->after('nama');
            $table->string('pic')->nullable()->after('tanggal_selesai');
            $table->string('anggaran')->nullable()->after('pic');
            $table->text('proposal_link')->nullable()->after('status');
            $table->text('doc_link')->nullable()->after('proposal_link');
            $table->text('notulensi_link')->nullable()->after('doc_link');
            $table->boolean('hidden_from_proker_page')->default(false)->after('notulensi_link');
            $table->boolean('archived')->default(false)->after('hidden_from_proker_page');
            $table->timestamp('page_removed_at')->nullable()->after('archived');
            $table->string('page_removed_by')->nullable()->after('page_removed_at');
        });
    }

    public function down(): void
    {
        Schema::table('prokers', function (Blueprint $table) {
            $table->dropColumn([
                'divisi',
                'pic',
                'anggaran',
                'proposal_link',
                'doc_link',
                'notulensi_link',
                'hidden_from_proker_page',
                'archived',
                'page_removed_at',
                'page_removed_by',
            ]);
        });
    }
};