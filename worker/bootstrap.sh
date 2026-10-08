#!/usr/bin/env bash
# Runs inside the Vercel Sandbox: installs Node deps, a Python venv with the
# statistics stack, and Chromium for PDF rendering, then starts the worker.
set -uo pipefail
RUN_ID="${1:-$RUN_ID}"
cd "$(dirname "$0")/.."
LOG=bootstrap.log
exec > >(tee -a "$LOG") 2>&1
echo "== bootstrap $(date -u +%FT%TZ) run=$RUN_ID"

report() { # append a step to the run log without waiting for npm install
  node -e "
    import('@neondatabase/serverless').then(({neon})=>neon(process.env.DATABASE_URL)\`INSERT INTO run_steps (run_id, s) VALUES (\${process.env.RUN_ID}, \${process.argv[1]})\`).catch(()=>{})
  " "$1" 2>/dev/null || true
}

# --- Node dependencies (worker package.json was written to the sandbox root) ---
export PUPPETEER_SKIP_DOWNLOAD=1
npm install --omit=dev --no-audit --no-fund --loglevel=error
echo "== node deps ok"
report "Sandbox: Node dependencies installed."

# --- Python: uv-managed venv with the statistics stack ---
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
fi
uv venv --python 3.12 .venv --quiet && uv pip install --python .venv/bin/python --quiet numpy pandas scipy statsmodels yfinance matplotlib \
  && echo "== python ok" && report "Sandbox: Python statistics stack ready." \
  || { echo "== python setup FAILED"; report "Sandbox: Python setup failed — statistical validation will be limited."; }

# --- Chromium for Puppeteer (best effort; the run still completes with HTML if this fails) ---
CHROME=""
if command -v chromium >/dev/null 2>&1; then CHROME="$(command -v chromium)";
elif command -v chromium-browser >/dev/null 2>&1; then CHROME="$(command -v chromium-browser)";
elif command -v google-chrome >/dev/null 2>&1; then CHROME="$(command -v google-chrome)";
else
  if command -v apt-get >/dev/null 2>&1; then
    (sudo apt-get update -qq && sudo apt-get install -y -qq --no-install-recommends \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
      libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 libxshmfence1 fonts-liberation libx11-xcb1 >/dev/null 2>&1) || true
  elif command -v dnf >/dev/null 2>&1; then
    (sudo dnf install -y -q nss atk at-spi2-atk cups-libs libdrm libxkbcommon libXcomposite libXdamage libXfixes libXrandr mesa-libgbm alsa-lib pango cairo liberation-fonts >/dev/null 2>&1) || true
  fi
  unset PUPPETEER_SKIP_DOWNLOAD
  npx --yes puppeteer browsers install chrome@stable --path "$PWD/.chrome" >/dev/null 2>&1 \
    && CHROME="$(find "$PWD/.chrome" -type f \( -name chrome -o -name chrome.exe \) | head -1)"
fi
if [ -n "$CHROME" ]; then export PUPPETEER_EXECUTABLE_PATH="$CHROME"; echo "== chromium: $CHROME"; report "Sandbox: Chromium ready for PDF rendering.";
else echo "== chromium NOT available"; report "Sandbox: Chromium unavailable — the PDF will be skipped (HTML report still produced)."; fi

echo "== starting worker"
export WORK_DIR="$PWD/work"; mkdir -p "$WORK_DIR"
node worker/run.mjs "$RUN_ID"
echo "== worker exited $?"
