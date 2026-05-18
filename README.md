# Stable Audio 3 — StableDAW fork

A state-of-the-art open platform for fast, high-quality generated audio and music — with a custom FastAPI backend and React UI layered on top of the upstream Stable Audio 3 Python pipeline.

> **This fork's deliverables (in addition to upstream):**
> - `backend/server.py` — a FastAPI wrapper exposing async generation jobs, studio effects, and library/training stubs.
> - `frontend/` — the StableDAW React 19 + Vite 6 + Tailwind 4 UI with CREATE / EDIT / TRAIN / LIBRARY tabs, persistent IndexedDB library, real Web Audio step sequencer, and a live processing log.
> - The complete in-app **[User Guide](docs/USER_GUIDE.md)** — the source of truth for every feature.

[Discord](https://discord.gg/cKpvjey8b) · [User Guide](docs/USER_GUIDE.md) · [Polish Plan](docs/plans/2026-05-18-stabledaw-ui-polish-and-functionality.md)

---

## Quick links

| If you want to… | Go to |
|---|---|
| **See every feature in detail** | [docs/USER_GUIDE.md](docs/USER_GUIDE.md) |
| Install and run | [§3–§4 of the User Guide](docs/USER_GUIDE.md#3-installation) |
| Read the backend API reference | [§13 of the User Guide](docs/USER_GUIDE.md#13-backend-api-reference) |
| Read the Python pipeline reference | [§14 of the User Guide](docs/USER_GUIDE.md#14-python-pipeline-reference) |
| Troubleshoot | [§16 of the User Guide](docs/USER_GUIDE.md#16-troubleshooting) |

The in-app **Docs** button (gear-adjacent in the top-right of the DAW header) opens the User Guide as an interactive modal with PDF export.

---

## What it does

Stable Audio 3 generates 44.1 kHz stereo audio from text prompts. Three modes:

- **Text-to-audio** — prompt in, audio out.
- **Audio-to-audio** — restyle a source clip with a prompt + `init_noise_level`.
- **Inpainting / continuation** — regenerate a time window inside a clip, or extend the tail past the source's end.

Plus:

- **LoRA fine-tuning** — adapt any model to a target style; stackable, adjustable at runtime.
- **Standalone SAME autoencoder** — encode audio to 256-dim latents at 1/4096 the original rate; decode them back.
- **Variable-length generation** — duration determines the latent sequence length directly, no wasted compute on padding.
- **FFmpeg-based studio chain** — 24 effects covering mastering, dynamics, EQ, pitch, fade, denoise, format conversion.
- **Persistent IndexedDB library** — every generation auto-saves with full metadata; survives reloads.
- **Web Audio step sequencer** — 16-step drum machine with hand-rolled kick/snare/hat/tone/noise voices.
- **Live processing log** — per-source, per-level, downloadable as text.

---

## Models

| Key | Type | Params | Hardware | Max length | Use case |
|---|---|---|---|---|---|
| `small` | ARC | 433M | CPU | 120 s | Lightweight inference, no GPU. |
| `medium` | ARC | 1.4B | CUDA | 380 s | Primary inference path. |
| `small-rf` | RF | 433M | CPU | 120 s | LoRA training base (small). |
| `medium-rf` | RF | 1.4B | CUDA | 380 s | LoRA training base (medium). |
| `same-s` | Autoencoder | 266M | CPU | — | Standalone SAME-Small. |
| `same-l` | Autoencoder | 1.7B | CUDA | — | Standalone SAME-Large. |
| Large | ARC | 2.7B | API only | 380 s | Not supported by this repo. |

ARC checkpoints are 8-step post-trained models. RF checkpoints are the base rectified-flow weights used for fine-tuning; inference with them needs ~50 steps and `cfg_scale=7`.

---

## Installation

### Base (CPU, Small model)

```bash
uv sync
```

### With CUDA (Medium model)

```bash
uv sync --extra cuda
```

### Frontend

```bash
cd frontend && npm install
```

### Windows-specific

PyTorch's CUDA index is Linux-only in `pyproject.toml`. On Windows, install torch + soundfile + flash-attention manually — see [User Guide §3](docs/USER_GUIDE.md#3-installation).

---

## Launching

### One-shot (Windows)

```powershell
.\start-dev.bat
```

Starts the backend on :8600, the Vite dev server on :5173, and opens the browser. Hot-reloads both sides.

### Manual

```bash
# Terminal 1
uv run uvicorn backend.server:app --host 0.0.0.0 --port 8600 --reload

# Terminal 2
cd frontend && npm run dev
```

Visit http://localhost:5173.

### Legacy Gradio UI

```bash
uv run python run_gradio.py --model medium
uv run python run_gradio.py --model medium --lora-ckpt-path path/to/lora.ckpt
```

---

## Quick examples (Python)

```python
from stable_audio_3 import StableAudioPipeline

pipe = StableAudioPipeline.from_pretrained("medium")

# Text-to-audio
audio = pipe.generate(prompt="Lo-fi boom bap, 84 BPM", duration=180)

# Audio-to-audio
import torchaudio
init_audio = torchaudio.load("/path/to/audio.wav")
audio = pipe.generate(init_audio=init_audio, init_noise_level=0.9,
                      prompt="bossa nova bassline", duration=30)

# Inpainting
inpaint_audio = torchaudio.load("/path/to/audio.wav")
audio = pipe.generate(inpaint_audio=inpaint_audio,
                      inpaint_mask_start_seconds=4.0,
                      inpaint_mask_end_seconds=8.0,
                      prompt="punchy kick drum fill", duration=30)
```

See the [User Guide §14](docs/USER_GUIDE.md#14-python-pipeline-reference) for advanced controls (samplers, distribution-shift schedules, APG, RF-Inversion, autoencoder workflows).

---

## UI feature surface

The StableDAW React UI is the daily-driver interface. Top-level tabs:

| Tab | What it does | Status |
|---|---|---|
| **CREATE** | Text-to-audio with init signal, inpainting, LoRA stack, generation parameters, sticky RUN button, output preview. | ✅ Full |
| **EDIT** | 24 FFmpeg-based studio effects driven by four macro sliders. Source upload, output format selector, process history. | ✅ Full |
| **TRAIN** | LoRA training, autoencoder round-trip, dataset pre-encode. UI scaffolded; backend endpoints stubbed in this fork (501). | 🟡 UI only |
| **LIBRARY** | Persistent IndexedDB-backed catalog of every generation. Search, filter, sort, favorite, play, download, delete, stats. | ✅ Full |

DAW workspace (center panel, persistent across tabs):

| Component | Status |
|---|---|
| Step Sequencer (Web Audio, 5 voices, BPM clock) | ✅ Full |
| Waveform Editor (multi-track scaffolding, transport, COMMIT EDIT) | 🟡 Scaffolding — clip drag/cut/save not wired yet |
| Spectral analyzer (collapsible, restorable) | ✅ UI live, real-audio FFT staged |
| Processing log (left-column footer, downloadable) | ✅ Full |
| Player footer (track info, transport, volume) | ✅ Volume routed via `usePlaybackStore` |

See [User Guide §5–§12](docs/USER_GUIDE.md#5-ui-walkthrough--shell) for every control on every screen.

---

## Backend API (summary)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness + model_loaded boolean. |
| `GET` | `/api/model-info` | Active model, sample rate, VRAM. |
| `POST` | `/api/generate-jobs` | Async generation submit (returns `{job:{id}}`). |
| `GET` | `/api/jobs/{id}` | Poll job status / result. |
| `GET` | `/api/jobs` | List all jobs. |
| `POST` | `/api/generate` | Sync generation (legacy, used by Gradio UI). |
| `POST` | `/api/studio/process` | FFmpeg effect pipeline. |
| `POST` | `/api/jobs/train-lora` | 501 in this fork. |
| `POST` | `/api/jobs/pre-encode` | 501 in this fork. |
| `POST` | `/api/autoencoder/encode` | 501 in this fork. |
| `POST` | `/api/autoencoder/decode` | 501 in this fork. |
| `GET` | `/api/autoencoder/info` | Stub (empty arrays). |
| `GET` | `/api/presets` | Empty list. |
| `POST` | `/api/presets` | Returns a fake id (no persistence). |

Full request/response shapes in [User Guide §13](docs/USER_GUIDE.md#13-backend-api-reference).

---

## Architecture

```
Browser  ─── /api/* ──▶  FastAPI backend  ──▶  StableAudioPipeline
                                                    ├── T5Gemma text encoder
                                                    ├── DiT diffusion transformer
                                                    └── SAME autoencoder
```

Same-origin in production (FastAPI mounts the built `frontend/dist`); split-dev in development (Vite on 5173 proxies `/api` to backend on 8600).

---

## Development

```bash
# Python lint
uv run ruff check
uv run ruff format --check

# Tests (medium tests skip on non-CUDA)
uv run pytest
uv run pytest --save-audio    # persist outputs to test_audio_outputs/

# Frontend build
cd frontend && npm run build

# Regenerate docs (runs on commit via pre-commit hook)
./scripts/regenerate-docs.sh        # macOS/Linux
.\scripts\regenerate-docs.ps1       # Windows
```

The pre-commit hook is installed by running `./scripts/install-hooks.sh` once. It re-validates the frontend build, refreshes the docs timestamp, takes Playwright screenshots if Playwright is available, and stages the updated docs.

---

## Docs

| File | What's in it |
|---|---|
| **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** | The full manual — every feature, every control, every endpoint. The in-app Docs button renders this. |
| [docs/plans/](docs/plans/) | Planning documents for ongoing work. |
| [docs/workflows/inference.md](docs/workflows/inference.md) | Inference-mode reference (upstream). |
| [docs/workflows/lora.md](docs/workflows/lora.md) | LoRA training walkthrough (upstream). |
| [docs/workflows/autoencoder.md](docs/workflows/autoencoder.md) | Autoencoder workflows (upstream). |
| [docs/guides/prompting.md](docs/guides/prompting.md) | Prompt and control-signal reference (upstream). |
| [docs/guides/model-overview.md](docs/guides/model-overview.md) | Architecture and design (upstream). |
| [docs/windows/setup-guide.md](docs/windows/setup-guide.md) | Full Windows setup walkthrough. |

---

## Community

Join the [Discord](https://discord.gg/cKpvjey8b) for updates, help, and discussions.

---

## License

To use these models commercially, refer to the [Stability AI Community License](https://stability.ai/license).
