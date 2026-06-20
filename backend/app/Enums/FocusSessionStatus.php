<?php

namespace App\Enums;

enum FocusSessionStatus: string
{
    case Draft     = 'draft';
    case Active    = 'active';
    case Completed = 'completed';
}
