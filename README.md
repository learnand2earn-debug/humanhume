# HumanFlow AI — Automated Document Humanizer & Documentation Studio

HumanFlow AI is a complete, production-ready autonomous **AI Document Humanization, Quality Control, and Legal/Technical Documentation Drafting Platform**.

Users either upload an existing document (`DOCX`, `PDF`, `TXT`, `MD`, `RTF`, `XLSX`) for zero-touch humanization with 100% factual/entity preservation, or use the **Documentation Studio** to generate jurisdiction-aware legal and technical documents from an **Approved Legal Knowledge Base** that automatically flow through the humanization, AI quality checker, and legal preservation pipeline.

---

## 1. Installation

```bash
npm install
```

## 2. Environment Variables

Copy `.env.example` to `.env.local` (never commit `.env` or secret keys to Git):

```bash
cp .env.example .env.local
```

Supported server-side variables:

```env
# Humanizer API Adapter (Server-Side Only)
HUMANIZER_API_URL=https://your-humanizer-provider.example.com/v1/humanize
HUMANIZER_API_KEY=sk-your-secret-key
HUMANIZER_MODEL=humanflow-pro-v2
HUMANIZER_RESPONSE_PATH=data.text

# Quality & AI Detection Checker Adapter (Server-Side Only)
CHECKER_API_URL=https://your-checker-provider.example.com/v1/detect
CHECKER_API_KEY=sk-your-checker-key
CHECKER_RESPONSE_SCORE_PATH=data.ai_score

# Discord Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Database (Optional — self-contained persistent store works out of the box)
DATABASE_URL=postgresql://postgres:password@localhost:5432/humanflow
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Pipeline & Security Limits
MAX_RETRIES=3
MAX_FILE_SIZE_MB=50
DEFAULT_RETENTION_HOURS=24
PROCESSING_MODE=DEMO
```

## 3. Database Setup

HumanFlow AI runs out of the box using a self-contained persistent store (`/storage/humanflow_db.json`) so you can test the entire platform immediately without external cloud setup.

To deploy with **Supabase PostgreSQL** or self-hosted **PostgreSQL**:
1. Provision a PostgreSQL instance.
2. Execute the complete relational migration script in `/lib/db/schema.sql`:
   ```bash
   psql "$DATABASE_URL" -f lib/db/schema.sql
   ```
3. Set `DATABASE_URL` in your environment.

## 4. Humanizer API Setup

1. Open **Admin Console → API & Automation Settings** (or configure `.env.local`).
2. Enter your `Humanizer API URL`, `Humanizer API Key`, `Humanizer Model`, and configurable JSON response path (e.g., `data.text`, `choices.0.message.content`, or `output`).
3. Switch from `DEMO MODE` to `LIVE MODE`.
4. Click **Test Humanizer API** to verify credentials and inspect response latency. API keys are masked (`sk-***************92`) and never exposed to browser JavaScript.

## 5. Checker Setup

1. In **Admin Console → API & Automation Settings**, enter your external `Checker API URL` and `Checker API Key`.
2. Click **Test Checker API** to verify connectivity.
3. When running in `DEMO MODE` or without an external detector URL, HumanFlow AI uses its built-in deterministic stylometric and sentence-cadence analyzer.

## 6. Discord Webhook Setup

1. Create a webhook in your Discord Server (*Channel Settings → Integrations → Webhooks*).
2. Paste the URL into `DISCORD_WEBHOOK_URL` or the **Admin Console → API Settings** panel.
3. HumanFlow AI dispatches real-time notifications for uploads, completed humanizations, legal checks, and retry alerts without ever transmitting private document contents.

## 7. Local Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## 8. Production Deployment

Build and start the production server:

```bash
npm run build
npm start
```

For **Docker / VPS** self-hosted deployments with persistent `/storage/` volumes:
- Mount `/app/storage` as a persistent volume so `/storage/original/`, `/storage/processing/`, `/storage/final/`, and `/storage/temp/` persist across container restarts.

## 9. Worker Deployment

For dedicated background queue processing and automatic 24-hour temporary file cleanup on a VPS or container worker:
- The worker architecture resides in `/workers/worker.ts`, `/workers/queue.ts`, and `/workers/processor.ts`.
- Invoke `runWorkerTick()` on your cron schedule or worker process loop.

## 10. Troubleshooting

- **Unsupported File Error**: Only `DOCX`, `PDF`, `TXT`, `MD`, `RTF`, and `XLSX` up to 50 MB are accepted. Unsupported files are rejected safely without touching the original file.
- **Jurisdiction Required**: Legal documents in the Documentation Studio never assume jurisdiction. Select a governing jurisdiction (`United States`, `United Kingdom`, `European Union`, `UAE`, `Pakistan`, etc.) before clicking Generate.
- **Knowledge Conflict Detected**: If two Legal Knowledge Base entries target the same document type and jurisdiction, resolve the conflict in **Admin Console → Legal Knowledge Base** before production use.
