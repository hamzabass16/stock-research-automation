# Stock Research Automation

**Ticker + thesis in → sourced equity-research report, statistical thesis test, PDF and investment-committee pitch deck out.**

A Next.js app that automates a complete sell-side-style stock research workflow end to end: an autonomous research agent on
the Claude API with web search, a real hypothesis test in Python on market data, a fixed report template rendered to PDF, a
`.pptx` pitch deck with speaker notes, and publishing of every artefact to a Google Drive folder. Runs execute in isolated
Vercel Sandboxes; state lives in Neon Postgres and artefacts in Vercel Blob.

<p align="center">
  <img src="docs/screenshots/run-in-progress.jpg" alt="A research run in progress" width="800">
</p>

## What a run produces

| Phase | What happens | Output |
|---|---|---|
| **1 · Deep research** | An agentic loop on `claude-opus-5-5` with `web_search`, `web_fetch` and a local `run_python` tool reads filings, investor-relations pages, earnings-call transcripts, Reddit and Glassdoor, and compiles a fully sourced dossier: business model, growth, profitability, segments, competition, moats, valuation, earnings record, capital allocation, three-case DCF, SWOT, categorisation. | `research.md` |
| **2 · Statistical validation** | A second agent designs and runs a hypothesis test on real price data (yfinance): market-model abnormal returns strip out market and sector effects, then a t-test / OLS / event study answers "has the thesis variable historically moved this stock?" with t-stat, p-value, R², n and a robustness check. Every script and its output is logged. | `stats.md`, `python_log.md` |
| **3 · Template fill** | The dossier is poured into a constant HTML report template (every table, class and section preserved) and rendered to PDF with Puppeteer. | `report.html`, `report.pdf` |
| **4 · Verdict & pitch** | A structured-output call extracts the recommendation, archetype, Business/Operations/Valuation verdict, kill signal and time horizon, and writes a six-part investment-committee pitch: slide content with stat tiles and speaker notes, a 5–7 minute talk track, and the eight hardest committee questions with answers. The deck is built with pptxgenjs. | `deck.pptx`, `pitch.md`, `meta.json` |
| **Publish** | All artefacts are uploaded to `Stock Theses & Research/<Company (TICKER)>/` on Google Drive with the publish date in every filename. | Drive |

The **investment methodology is pluggable**: upload any methodology (PDF, Markdown, text) once and it becomes the exclusive
judgment lens for every subjective call. The report template never changes.

## Example output

A real run is in [`examples/`](examples/): the full META research report (PDF) and the generated investment-committee deck (PPTX).

## Architecture

```
Browser ──> Next.js (Vercel) ──POST /api/runs──> lib/runner.js ──> Vercel Sandbox (Ubuntu microVM, 2 vCPU)
               │                                                     ├─ worker/bootstrap.sh  npm + uv/Python + Chromium
               │ reads                                               └─ worker/run.mjs       lib/pipeline.js (4 phases)
               ▼                                                               │ writes
         Neon Postgres  <──── runs · steps · live output · methodologies ──────┤
         Vercel Blob    <──── report.pdf/html · deck.pptx · md · json ─────────┤
         Google Drive   <──── dated copies in the company folder ──────────────┘
```

```
app/                 Next.js App Router: dashboard, run page, methodologies, API routes
lib/pipeline.js      The four phases: agentic loop with client + server tools, pause_turn resumption, time budget
lib/prompts.js       Every prompt and the JSON schema for the structured verdict/pitch
lib/claude.js        Anthropic SDK client: streaming, adaptive thinking + effort, prompt caching, refusal fallbacks
lib/db.js            Neon persistence          lib/storage.js   Vercel Blob artefacts
lib/runner.js        Sandbox / local launcher   lib/drive.js     Google Drive publishing (service account)
lib/python.js        Sandboxed local Python runner (venv, -I, timeouts, output caps)
lib/template.js      The constant report template (HTML + CSS)
lib/deck.js          pptxgenjs deck from the structured pitch
worker/              run.mjs (the worker), bootstrap.sh (sandbox setup), package.json (worker deps)
```

## Run it locally

```bash
git clone https://github.com/hamzabass16/stock-research-automation.git && cd stock-research-automation
npm install
cp .env.example .env            # add DATABASE_URL (Neon); leave ANTHROPIC_API_KEY empty for DEMO MODE
npm run setup:python            # .venv with numpy / pandas / scipy / statsmodels / yfinance (hypothesis test)
npm run dev                     # http://localhost:3000
```

Locally the worker runs as a detached Node process (`RUNNER=local`), artefacts fall back to temp files when there is no Blob
token, and publishing copies into the synced Google Drive folder. Demo mode (no API key) walks through the whole UI with mock
output.

## Deploy on Vercel

1. Create a Vercel project from this repository and a **Neon** database; add `DATABASE_URL`.
2. Create a **Blob** store and connect it to the project (adds `BLOB_READ_WRITE_TOKEN`).
3. Add `ANTHROPIC_API_KEY`, `PREPARED_BY`, and for Drive publishing `GOOGLE_SERVICE_ACCOUNT_JSON` + `DRIVE_PARENT_FOLDER_ID`
   (share the target folder with the service-account email as Editor).
4. Deploy. Each run creates a sandbox (`vercel/sandbox/universal`), installs its dependencies (~3 min) and runs the pipeline
   under a time budget (`RUN_BUDGET_MINUTES`). On the Hobby plan a sandbox session is capped at 45 minutes, so the defaults use
   `RESEARCH_EFFORT=medium`; on Pro the budget can be raised and effort set to `high`.

## Design choices worth noting

- **Research and judgement are separated.** Facts come from primary sources via web tools; every opinion is forced through the
  uploaded methodology. Swapping the methodology changes the verdict, not the data.
- **The thesis has to survive a test.** The statistical phase is a separate agent with its own prompt so it cannot be skipped,
  and it must report honestly when the data does not support the story.
- **Long outputs are streamed and resumable.** Server-tool `pause_turn`s are resumed, `max_tokens` cut-offs continue where they
  stopped, the growing conversation is prompt-cached turn after turn, and a wall-clock budget makes the agent finalise before
  the sandbox expires.
- **Everything is a file.** Each run is a folder of Markdown, HTML, PDF, PPTX and JSON that can be inspected, re-published or
  challenged (if a derivation looks weak, open the Python log and re-run it yourself).

## License

MIT
