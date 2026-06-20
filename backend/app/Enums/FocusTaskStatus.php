<?php

namespace App\Enums;

enum FocusTaskStatus: string
{
    case Pending    = 'pending';
    case InProgress = 'in_progress';
    case Completed  = 'completed';
    case Skipped    = 'skipped';
}
