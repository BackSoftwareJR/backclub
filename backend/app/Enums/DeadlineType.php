<?php

namespace App\Enums;

enum DeadlineType: string
{
    case Hard = 'hard';
    case Soft = 'soft';
    case None = 'none';
}
