# BackClub — CRM

Monorepo del gestionale **backclub.it**: API Laravel + frontend React (Vite).

## Struttura

```
.
├── backend/          # Laravel 12 — API REST, job, webhook N8N
├── frontend/         # React + Vite — sorgenti e build (dist/)
├── index.php         # Entry point hosting (public_html)
├── .htaccess
└── api-public/       # Asset pubblici API
```

## Requisiti

- PHP 8.2+
- Composer
- Node.js 20+ e npm
- MySQL

## Setup locale

### Backend

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
```

Configura in `.env`: database, `APP_URL`, variabili `N8N_*` (vedi `backend/docs/N8N_INTEGRAZIONE_ASINCRONA.md`).

### Frontend

```bash
cd frontend
npm install
npm run dev    # sviluppo
npm run build  # produzione → frontend/dist/
```

## Deploy (produzione)

1. `git pull` sul server (cartella `public_html` o sottocartelle dedicate).
2. Backend: `composer install --no-dev`, `php artisan migrate`, `php artisan config:cache`.
3. Frontend: `npm ci && npm run build`, servire `frontend/dist/`.
4. Non committare mai `.env` — configurarlo solo sul server.

## Integrazione N8N

Documentazione: [`backend/docs/N8N_INTEGRAZIONE_ASINCRONA.md`](backend/docs/N8N_INTEGRAZIONE_ASINCRONA.md)

Webhook in uscita (CRM → N8N): configurato con `N8N_WEBHOOK_URL` in `.env`.

Callback (N8N → CRM):

- `POST /api/webhooks/n8n/status`
- `POST /api/webhooks/n8n/completed`
- `POST /api/webhooks/n8n/task-events`

## Repository

https://github.com/BackSoftwareJR/backclub
