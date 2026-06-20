<?php

namespace App\Enums;

enum FocusSlotType: string
{
    case Task   = 'task';
    case Break  = 'break';
    case Buffer = 'buffer';
    case Lunch  = 'lunch';
}
