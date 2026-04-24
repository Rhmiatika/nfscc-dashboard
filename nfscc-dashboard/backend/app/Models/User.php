<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Facades\Hash;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'periode',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    public function setEmailAttribute($value)
    {
        $this->attributes['email'] = strtolower(trim((string) $value));
    }

    public function setPasswordAttribute($value)
    {
        if (empty($value)) {
            $this->attributes['password'] = null;
            return;
        }

        $info = password_get_info($value);

        if (($info['algo'] ?? null) !== null) {
            $this->attributes['password'] = $value;
            return;
        }

        $this->attributes['password'] = Hash::make($value);
    }
}