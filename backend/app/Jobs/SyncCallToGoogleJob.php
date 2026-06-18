<?php

namespace App\Jobs;

use App\Services\FreelanceCallService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SyncCallToGoogleJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(
        public int $callId,
        public int $userId,
        public string $action = 'create'
    ) {}

    public function handle(FreelanceCallService $callService): void
    {
        $callService->syncToGoogle($this->callId, $this->userId, $this->action);
    }
}
