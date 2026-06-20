<?php

namespace App\Enums;

enum CognitiveLoad: string
{
    case DeepWork   = 'deep_work';
    case Creative   = 'creative';
    case Repetitive = 'repetitive';
    case Meetings   = 'meetings';
    case Admin      = 'admin';
}
