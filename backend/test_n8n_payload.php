<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Models\CrmProject;
use App\Models\CrmProjectTask;
use App\Services\TaskN8nService;

// Sample demonstration of the complete payload structure
$samplePayload = [
    "task_id" => 243,
    "project_id" => 38,
    "project_name" => "Associazione Parkinsoniana Canavese",
    "github_url" => "https://github.com/BackSoftwareJR/associazioneparkinson",
    "website_url" => "https://www.parkinsoncanavese.com/",
    "stack" => "html",
    "execution_mode" => "agent",
    "title" => "correggere",
    "description" => "...",
    "status" => "review",
    "n8n_status" => "processing",
    "priority" => "medium",
    "start_date" => null,
    "due_date" => null,
    "assignments" => [],
    "created_by" => [
        "id" => 1, 
        "name" => "Julian Rovera", 
        "email" => "jrovera05@gmail.com"
    ],
    "callback_url" => "https://backclub.it/backend/public/api/webhooks/n8n/task-events",
    "callback_status_url" => "https://backclub.it/backend/public/api/webhooks/n8n/status",
    "callback_completed_url" => "https://backclub.it/backend/public/api/webhooks/n8n/completed",
    "callback_task_log_url" => "https://backclub.it/backend/public/api/webhooks/n8n/task-log",
    "callback_close_task_url" => "https://backclub.it/backend/public/api/webhooks/n8n/close-task",
    "callback_auth_header" => "authbs",
    "triggered_at" => "2026-06-08T07:38:45+00:00",
    "is_revision" => false,
    "revision_feedback" => null
];

echo "Complete N8N Task Payload Structure:\n";
echo json_encode($samplePayload, JSON_PRETTY_PRINT) . "\n\n";

echo "POST to N8N_WEBHOOK_URL with header:\n";
echo "N8N_WEBHOOK_AUTH_HEADER: N8N_WEBHOOK_AUTH_VALUE\n\n";

echo "N8N callbacks will POST to /api/webhooks/n8n/* with auth:\n";
echo "N8N_CALLBACK_AUTH_HEADER: N8N_CALLBACK_AUTH_VALUE\n";