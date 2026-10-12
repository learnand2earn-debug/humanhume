# HumanFlow AI — Automated Document Humanizer & Quality Control Platform

> **Autonomous Document Processing System:** Upload once. HumanFlow AI automatically extracts text, isolates critical factual entities (citations, numbers, formulas, tables, dates, and headings), refines sentence cadence with an AI Humanizer API adapter, verifies undetectable AI scores through probabilistic heuristic and external checkers, auto-remediates flagged sentences, preserves original document formatting (DOCX, PDF, TXT, MD, RTF, XLSX), and delivers the finalized document.

---

## Key Features

- **Claude-Style Intelligent Checklist Studio (`/intelligent`):** 12-stage iterative workflow (Stages A through L) executing universal multi-file intake, deep content extraction, dynamic requirements checklists, missing-information prompts, deliverable generation, and post-generation verification audits.
- **100% Autonomous Pipeline:** Single upload starts the entire workflow without manual intermediate button clicks.
- **Strict Factual Preservation Agent:** Verifies numbers, percentages, currencies, dates, formulas, URLs, citations (`[1]`, `(Author, 2024)`), references, and markdown headings; automatically restores any altered factual entities.
- **Provider-Independent Humanizer API Adapter:** Configurable REST adapter supporting OpenAI, Anthropic, Custom LLM APIs, and local Demo Mode.
- **Quality & AI Detection Checker:** Real-time AI detection probability scoring, perplexity and burstiness analysis, and automatic multi-cycle retry loop (up to `MAX_RETRIES`).
- **Side-by-Side Diff Engine:** Highlights polished phrasing, removed robotic padding, and protected tokens with Flesch-Kincaid readability scoring.
- **Document Format Preservation:** Recreates true styled `.docx` files, formatted `.pdf` documents, structured `.rtf`, spreadsheets (`.xlsx`), and markdown/plain text.
- **Free-First & Self-Hostable:** Built-in durable local storage and JSON database engine out of the box with zero external fees, plus full Supabase PostgreSQL integration when configured.
- **Discord Webhook Notifications:** Real-time event notifications (Upload, Started, Completed, Retries, Failures) without transmitting private document contents.
- **Animated Chatbot ("HumanFlow Assistant"):** Real-time AI assistant integrated with live document status and system telemetry.
- **Enterprise Admin Console:** Dark glassmorphic interface with 8 management sections, masked API keys, live test probes ("Test Humanizer API", "Test Checker API"), and job controls.

---

## 1. Supported Document Formats

| Format | Extension | Processing Support | Output Fidelity |
|---|---|---|---|
| Microsoft Word | `.docx` | Paragraphs, headings, bullet lists, tables, bold/italics | High-fidelity `.docx` via OpenXML |
| Portable Document | `.pdf` | Structured text extraction, layout parsing | Styled printable `.pdf` via PDFKit |
| Plain Text | `.txt` | UTF-8 text extraction and line reconciliation | Preserved `.txt` |
| Markdown | `.md` | Headings, code blocks, lists, equations | Formatted `.md` |
| Rich Text | `.rtf` | RTF control codes parsed and stripped cleanly | Standard RTF 1.5 document |
| Excel Spreadsheet | `.xlsx` | Multi-sheet tabular text extraction | Reconstructed `.xlsx` workbook |

*Note: The original uploaded file is permanently preserved untouched in `/storage/original/`. All processing operations occur on isolated working copies.*

---

## 2. Automatic Processing Pipeline

```
UPLOAD
  ↓
FILE VALIDATION (Format, Size <= 50MB, Malware check)
  ↓
TEXT EXTRACTION (Mammoth, PDF-Parse, SheetJS)
  ↓
DOCUMENT ANALYSIS (Structure, Sentence Cadence, Synthetic Markers)
  ↓
CONTENT PROTECTION (Isolates Citations, Numbers, Tables, Formulas)
  ↓
AI HUMANIZATION API (Adaptive Chunk Processing & Natural Phrasing)
  ↓
QUALITY CHECK & AI DETECTION (Heuristic Perplexity & Burstiness)
  ↓
FACTUAL PRESERVATION CHECK (Verifies Entities & Restores Deviations)
  ↓
AUTOMATIC FIX AGENT (Refines Flagged Phrasing if Threshold Exceeded)
  ↓
QUALITY LOOP (Re-check up to MAX_RETRIES, default: 3)
  ↓
GENERATE FINAL DOCUMENT (DOCX, PDF, RTF, TXT, MD, XLSX)
  ↓
ANTI-FAILSAFE VERIFICATION (Integrity Check)
  ↓
DISCORD NOTIFICATION & USER DOWNLOAD
```

---

## 3. Installation & Quick Start

### Prerequisites
- Node.js `v18.0.0` or higher (tested on Node v24)
- npm `v9.0.0` or higher

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### Step 3: Run the Test Suite
Verify that all 18 automated unit and integration tests pass:
```bash
npm test
```

### Step 4: Seed Demo Data (Optional)
Populate realistic sample documents and metrics:
```bash
npm run seed
```

### Step 5: Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `APP_MODE` | `demo` | `demo` (local simulation, no API keys needed) or `live` (external APIs) |
| `HUMANIZER_API_URL` | `https://api.openai.com/v1/chat/completions` | Endpoint for the humanizer LLM provider |
| `HUMANIZER_API_KEY` | *(empty)* | Secret API key (strictly server-side, masked in Admin UI) |
| `HUMANIZER_MODEL` | `gpt-4o-mini` | Model identifier sent in the JSON payload |
| `HUMANIZER_RESPONSE_PATH` | `choices[0].message.content` | JSON path to extract the humanized text |
| `CHECKER_API_URL` | *(empty)* | Optional external AI detector API endpoint |
| `CHECKER_API_KEY` | *(empty)* | Secret API key for the external detector |
| `CHECKER_PROVIDER_NAME` | `HumanFlowQualityGuard` | Display name of the detection provider |
| `AI_SCORE_PASS_THRESHOLD` | `20` | Maximum acceptable AI score percentage (<= 20% considered PASS) |
| `MAX_RETRIES` | `3` | Maximum automatic correction cycles before finalizing |
| `MAX_FILE_SIZE_MB` | `50` | Maximum file upload size limit |
| `DOCUMENT_RETENTION_HOURS` | `24` | Auto-cleanup threshold for temporary working files |
| `DISCORD_WEBHOOK_URL` | *(empty)* | Discord webhook URL for life-cycle notifications |
| `SUPABASE_URL` | *(empty)* | Optional Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY`| *(empty)* | Optional Supabase service role key |
| `ADMIN_PASSWORD` | `admin-humanflow-2026` | Admin authentication secret |

---

## 5. Humanizer API Adapter Configuration

The Humanizer adapter is provider-independent. You can connect OpenAI, Anthropic, OpenRouter, Mistral, or any custom API:

### Example 1: OpenAI or Compatible
- **URL:** `https://api.openai.com/v1/chat/completions`
- **Key:** `sk-proj-...`
- **Model:** `gpt-4o-mini`
- **Response Path:** `choices[0].message.content`

### Example 2: Custom In-House Endpoint
- **URL:** `https://api.yourcompany.com/v1/humanize`
- **Key:** `your_secret_key`
- **Response Path:** `data.humanized_text`

Test your credentials directly inside the Admin Console via the **"Test Humanizer API"** button. The console measures round-trip ping latency and validates authentication without exposing the key.

---

## 6. Database Setup

HumanFlow AI features a **Dual-Mode Database Architecture**:

### Option A: Local Zero-Setup Mode (Default)
By default, the platform uses an embedded, durable JSON repository (`/data/humanflow.json`). No external cloud database or Docker container is required.

### Option B: Supabase PostgreSQL (Production)
1. Create a project in [Supabase](https://supabase.com).
2. Open the SQL Editor and execute the schema script located at:
   ```
   scripts/supabase_schema.sql
   ```
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

---

## 7. Discord Webhook Setup

1. In your Discord server, go to **Server Settings → Integrations → Webhooks**.
2. Click **New Webhook**, select the target channel, and click **Copy Webhook URL**.
3. Paste the URL into `DISCORD_WEBHOOK_URL` in `.env.local` or directly into the **Automation & Webhooks** tab in the Admin Console.
4. Notifications include:
   - 📄 Document Uploaded
   - ⚡ Pipeline Started
   - ✨ Document Completed with Quality Score
   - 🚨 Processing Failure / Retries Reached

*Privacy Notice: Document text and private file contents are NEVER sent to Discord.*

---

## 8. Background Worker Deployment (VPS / Docker)

For long-running tasks or environments where serverless timeouts apply, run the dedicated persistent worker:

```bash
npm run worker
```

### Docker Deployment
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 9. Testing & Quality Assurance

Run the automated test suite covering all 14 pipeline components:
```bash
npm test
```

Tests verify:
- Supported format validation (`.docx`, `.pdf`, `.txt`, `.md`, `.rtf`, `.xlsx`) and rejection of invalid files.
- Mammoth DOCX, PDFKit, and Markdown text extraction.
- Factual entity detection (citations, currencies, dates, formulas, numbers, tables).
- Reversibility of protected token mapping.
- Flesch Reading Ease and Flesch-Kincaid Grade Level calculations.
- Semantic chunk splitting and reassembly.
- API response parsing across diverse formats.
- Error recovery with exponential backoff on HTTP 429/503.
- Key masking (`sk-***************92`) and repository persistence.

---

## 10. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **Humanizer API returned HTTP 401** | Invalid or expired API key | Check key in Admin Console or switch to `Demo Mode` |
| **Unsupported file type** | File extension not recognized | Ensure file is `.docx`, `.pdf`, `.txt`, `.md`, `.rtf`, or `.xlsx` |
| **Status: NEEDS_REVIEW** | Failsafe detected alteration of critical numbers/citations | Inspect side-by-side diff in UI; review restored version |
| **Worker not picking up jobs** | Background worker stopped | Run `npm run worker` or trigger processing from Admin Console |
| **Discord notifications not appearing** | Webhook URL invalid | Verify URL begins with `https://discord.com/api/webhooks/` |

---

## License

MIT License. Built with Next.js, React, TypeScript, and Tailwind CSS.
