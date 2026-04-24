<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin.adm@nfcc'],
            [
                'name' => 'Admin',
                'password' => 'iniadmin!321',
                'role' => 'admin',
                'periode' => '2026',
            ]
        );
    }
}