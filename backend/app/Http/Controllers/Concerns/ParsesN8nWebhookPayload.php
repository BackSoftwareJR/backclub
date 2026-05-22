<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;

trait ParsesN8nWebhookPayload
{
    /**
     * @return array<string, mixed>
     */
    protected function parseN8nPayload(Request $request): array
    {
        $payload = $request->all();
        if (empty($payload) && $request->getContent()) {
            $decoded = json_decode($request->getContent(), true);
            if (is_array($decoded)) {
                $payload = $decoded;
            }
        }

        return $payload;
    }
}
