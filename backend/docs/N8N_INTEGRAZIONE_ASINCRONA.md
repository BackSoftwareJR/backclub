# Integrazione N8N asincrona — Task Agente

## Flusso

1. **CRM** crea la task e risponde subito (non blocca il gestionale).
2. **CRM** avvia N8N in background (`dispatchAfterResponse`).
3. **N8N** esegue il workflow (anche 20+ minuti).
4. A **ogni step**, N8N chiama il CRM con un HTTP Request.
5. **CRM** salva il messaggio in chat (`crm_project_task_n8n_steps`) e aggiorna progresso/stato.
6. **Frontend** fa polling su `/n8n-steps` e mostra la chat agente.

## Endpoint callback (N8N → CRM)

Tutti gli endpoint richiedono autenticazione:

- **Header custom** (consigliato): `authbs: <N8N_CALLBACK_AUTH_VALUE>`
- **Alternativa**: `Authorization: Bearer <N8N_WEBHOOK_AUTH_TOKEN>`

Base URL produzione: `https://backclub.it/api/webhooks/n8n/`

| Endpoint | Uso |
|----------|-----|
| `POST /task-events` | Step generici del workflow (granulare) |
| `POST /status` | Agente ha preso in carico il task |
| `POST /completed` | Agente ha finito (summary tecnico → chat) |

### 1. Work in progress — `POST /status`

```json
{
  "task_id": 161,
  "message": "L'agente frontend dev sta lavorando sul progetto.",
  "agent_name": "frontend dev"
}
```

**Effetto CRM:** messaggio in chat (`crm_project_task_n8n_steps`), task → `in_progress`, `n8n_status` → `processing`.

### 2. Task completed — `POST /completed`

```json
{
  "task_id": 161,
  "status": "success",
  "summary": "stdout: ...\nstderr: ..."
}
```

**Effetto CRM (success):** summary in chat, task → `review` (in attesa approvazione umana), `n8n_status` → `completed`.

**Effetto CRM (failed/error):** summary in chat, `n8n_status` → `failed`, task resta `in_progress`.

### 3. Step generici — `POST /task-events`

```
Content-Type: application/json
```

### Body esempio (ogni step)

```json
{
  "task_id": 123,
  "step_key": "analisi_brief",
  "step_index": 2,
  "status": "running",
  "title": "Analisi brief",
  "message": "Sto leggendo i documenti del progetto...",
  "actor_name": "Agente Ricerca",
  "progress": 35,
  "is_final": false,
  "complete_task": false,
  "payload": { "files": 3 }
}
```

### Body esempio (step finale — modalità Agente)

```json
{
  "task_id": 123,
  "step_index": 99,
  "status": "completed",
  "message": "Workflow completato con successo.",
  "progress": 100,
  "is_final": true,
  "complete_task": true,
  "result": { "output": "..." }
}
```

### Body esempio (finale — Agente + Umano)

Usa `complete_task: false` oppure omettilo: la task resta da completare dall’umano, ma il JSON risultato viene salvato.

## Configurazione N8N

1. **Webhook in ingresso** (produzione):  
   `https://n8n.srv1691601.hstgr.cloud/webhook/5d30f479-b120-42ca-9460-e86a8fcbbe96`  
   Riceve il payload da CRM (`callback_url`, `task_id`, `github_url`, `website_url`, …). Il workflow deve essere **Active**.

### Campi progetto nel payload outbound

| Campo | Descrizione |
|-------|-------------|
| `github_url` | Repository GitHub del progetto CRM (opzionale) |
| `website_url` | Sito web del progetto CRM (opzionale) |

Impostabili dalla scheda **Panoramica → Collegamenti progetto** nel gestionale.
2. **Respond**: imposta **Immediately** (non "When Last Node Finishes") così l’avvio non blocca.
3. Dopo ogni nodo significativo: nodo **HTTP Request** → `POST` su `callback_url` con header `authbs`.
4. Non usare `/webhook-test/` in produzione: funziona solo in modalità test ed è monouso.

## SQL da eseguire

1. `database/sql/add_n8n_fields_to_crm_project_tasks.sql`
2. `database/sql/create_crm_project_task_n8n_steps.sql`
3. `database/sql/add_github_website_urls_to_crm_projects.sql`

## Variabili .env

```
N8N_ENABLED=true
N8N_WEBHOOK_URL=https://n8n.srv1691601.hstgr.cloud/webhook/5d30f479-b120-42ca-9460-e86a8fcbbe96
N8N_WEBHOOK_AUTH_HEADER=authbs
N8N_WEBHOOK_AUTH_VALUE=...
N8N_START_TIMEOUT_SECONDS=30
N8N_CALLBACK_AUTH_HEADER=authbs
N8N_CALLBACK_AUTH_VALUE=...
```
