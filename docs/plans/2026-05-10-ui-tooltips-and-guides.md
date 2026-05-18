# UI Tooltips & Section Guides Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add human-readable guide text above each UI section (paragraph-style) and hover tooltips on individual controls with descriptions and suggested usage.

**Architecture:** Gradio provides two native mechanisms — `gr.Markdown()`/`gr.HTML()` for block-level guide text, and the `info=` parameter on components (Slider, Dropdown, Number, Checkbox, Radio) for inline hover tooltips. We add section guides as `gr.Markdown()` elements above each accordion/section, and `info=` strings to every interactive control. No new dependencies, no layout changes — purely additive text.

**Tech Stack:** Gradio 6.3.0 (already installed), Python

---

## Approach

**Section guides** = `gr.Markdown()` blocks placed above or inside each section. These give users a 1-2 sentence overview of what the section does and a quick-start suggestion.

**Hover tooltips** = the `info=` parameter on Gradio components. Shows a small (i) icon next to the control with text on hover. Best for per-control "what is this / what should I set it to" hints.

**Rules:**
- Section guides: 1-3 sentences max, conversational, include a "start here" suggestion
- Hover tooltips: 1 sentence max, focus on "what happens when you change this"
- No technical jargon (no "classifier-free guidance", no "rectified flow")
- Reference musical analogies where possible

---

### Task 1: Add `info=` tooltips to Main Controls

**Files:**
- Modify: `stable_audio_3/interface/diffusion_cond.py:293-317`

**Step 1: Add info to prompt textboxes**

Change:
```python
prompt = gr.Textbox(show_label=False, placeholder="Prompt", value=default_prompt)
negative_prompt = gr.Textbox(show_label=False, placeholder="Negative prompt")
```

To:
```python
prompt = gr.Textbox(show_label=False, placeholder="Describe the audio you want: genre, instruments, tempo, mood, texture", value=default_prompt)
negative_prompt = gr.Textbox(show_label=False, placeholder="Describe what to avoid (e.g. distortion, vocals, silence)")
```

**Step 2: Add info to main sliders**

Change:
```python
seconds_total_slider = gr.Slider(minimum=0, maximum=512, step=1, value=sample_size//sample_rate, label="Seconds total", visible=has_seconds_total)
```

To:
```python
seconds_total_slider = gr.Slider(minimum=0, maximum=512, step=1, value=sample_size//sample_rate, label="Seconds total", visible=has_seconds_total, info="Length of audio to generate. Longer = more VRAM used.")
```

Change:
```python
steps_slider = gr.Slider(minimum=1, maximum=500, step=1, value=default_steps, label="Steps")
```

To:
```python
steps_slider = gr.Slider(minimum=1, maximum=500, step=1, value=default_steps, label="Steps", info="Refinement passes. ARC: leave at 8. RF: use ~50. More ≠ always better.")
```

Change:
```python
cfg_scale_slider = gr.Slider(minimum=0.0, maximum=25.0, step=0.1, value=default_cfg_scale, label="CFG scale")
```

To:
```python
cfg_scale_slider = gr.Slider(minimum=0.0, maximum=25.0, step=0.1, value=default_cfg_scale, label="CFG scale", info="How strictly the model follows your prompt. 1=freestyle, 7=strong adherence, 25+=artifacts likely.")
```

**Step 3: Commit**

```bash
git add stable_audio_3/interface/diffusion_cond.py
git commit -m "feat(ui): add tooltips to main generation controls"
```

---

### Task 2: Add `info=` tooltips to Sampler Params section

**Files:**
- Modify: `stable_audio_3/interface/diffusion_cond.py:332-367`

**Step 1: Add section guide markdown inside accordion**

After `with gr.Accordion("Sampler params", open=False):` add:
```python
gr.Markdown("*Fine-tune how the model builds audio from noise. Defaults work great — only tweak these if you're experimenting.*")
```

**Step 2: Add info to all sampler controls**

```python
seed_textbox = gr.Number(label="Seed", value=-1, precision=0, info="-1 = random every time. Set a number to reproduce the same result.")

cfg_interval_min_slider = gr.Slider(minimum=0.0, maximum=1, step=0.01, value=0.0, label="CFG interval min", info="Skip guidance at the noisiest stages. Try 0.2 to reduce artifacts.")
cfg_interval_max_slider = gr.Slider(minimum=0.0, maximum=1, step=0.01, value=1.0, label="CFG interval max", info="Skip guidance at the cleanest stages. Try 0.8 to reduce over-processing.")

cfg_rescale_slider = gr.Slider(minimum=0.0, maximum=1, step=0.01, value=0.0, label="CFG rescale amount", info="Tames volume/saturation boost from high CFG. Raise if output sounds overblown.")
cfg_norm_threshold = gr.Slider(minimum=0.0, maximum=100, step=0.1, value=0.0, label="CFG norm threshold", info="Caps guidance intensity. Raise if you hear random pops or distortion.")
apg_scale_slider = gr.Slider(minimum=0.0, maximum=1.0, step=0.1, value=1.0, label="APG scale", info="1.0=removes harshness from guidance (recommended). 0.0=raw guidance, may oversaturate.")

sampler_type_dropdown = gr.Dropdown(sampler_types, label="Sampler type", value=default_sampler_type, info="The algorithm that builds audio. Pingpong=fast+good for ARC. DPM++=quality for RF.")
sigma_max_slider = gr.Slider(minimum=0.0, maximum=sigma_max_max, step=0.1, value=sigma_max_default, label="Sigma max", info="Starting noise level. 1.0=full generation. Lower values with init audio=more original preserved.")

duration_padding_slider = gr.Slider(minimum=0.0, maximum=30.0, step=0.5, value=6.0, label="Duration padding (sec)", info="Extra room for reverb tails and decay. Without it, endings get cut off.")
```

**Step 3: Commit**

```bash
git add stable_audio_3/interface/diffusion_cond.py
git commit -m "feat(ui): add tooltips and guide text to sampler params"
```

---

### Task 3: Add `info=` tooltips to Distribution Shift controls

**Files:**
- Modify: `stable_audio_3/interface/diffusion_cond.py:381-402`

**Step 1: Add info to shift type dropdown (already has info, update it)**

Change:
```python
info="Distribution shift applied to sampling timesteps"
```

To:
```python
info="Where the model focuses effort. Leave at default unless output sounds mushy (try more) or over-processed (try less)."
```

**Step 2: Add info to LogSNR sliders**

```python
logsnr_anchor_length_slider = gr.Slider(..., info="Reference sequence length for the shift curve")
logsnr_anchor_logsnr_slider = gr.Slider(..., info="How much effort to concentrate on structure-forming stages")
logsnr_rate_slider = gr.Slider(..., info="How quickly the shift scales with duration")
logsnr_end_slider = gr.Slider(..., info="Where the shift tapers off at the clean end")
```

**Step 3: Add info to Flux sliders**

```python
flux_min_length_slider = gr.Slider(..., info="Shortest sequence the shift is calibrated for")
flux_max_length_slider = gr.Slider(..., info="Longest sequence the shift is calibrated for")
flux_alpha_min_slider = gr.Slider(..., info="Shift strength at short durations")
flux_alpha_max_slider = gr.Slider(..., info="Shift strength at long durations")
```

**Step 4: Add info to Full sliders**

```python
full_base_shift_slider = gr.Slider(..., info="Minimum shift applied at short sequences")
full_max_shift_slider = gr.Slider(..., info="Maximum shift applied at long sequences")
full_min_length_slider = gr.Slider(..., info="Sequence length where base_shift applies")
full_max_length_slider = gr.Slider(..., info="Sequence length where max_shift applies")
```

**Step 5: Commit**

```bash
git add stable_audio_3/interface/diffusion_cond.py
git commit -m "feat(ui): add tooltips to distribution shift controls"
```

---

### Task 4: Add section guide + tooltips to Init Audio accordion

**Files:**
- Modify: `stable_audio_3/interface/diffusion_cond.py:444-468`

**Step 1: Add section guide markdown**

After `with gr.Accordion("Init audio", open=False):` add:
```python
gr.Markdown("*Upload a recording to use as a starting point. The model transforms it based on your prompt. Lower noise = more of the original preserved.*")
```

**Step 2: Add info to init audio controls**

```python
init_noise_level_slider = gr.Slider(minimum=min_noise_level, maximum=max_noise_level, step=0.01, value=default_noise_level, label="Init noise level", info="0.1=subtle remix, 0.5=loose cover, 0.9=heavy transformation, 1.0=original ignored")
```

```python
inversion_steps_slider = gr.Slider(minimum=1, maximum=500, step=1, value=100, label="Inversion Steps", info="How carefully the model analyzes your input. More=faithful to source timing/structure.")
inversion_gamma_slider = gr.Slider(minimum=0, maximum=1, step=0.1, value=0, label="Gamma", info="Creative freedom. 0=faithful reconstruction, 0.3=slight liberty, 1.0=maximum reinterpretation.")
inversion_unconditional_checkbox = gr.Checkbox(label="Unconditional", value=False, info="Ignore prompt during analysis, use it only for re-generation. Cleaner structure/style separation.")
```

**Step 3: Commit**

```bash
git add stable_audio_3/interface/diffusion_cond.py
git commit -m "feat(ui): add guide text and tooltips to init audio section"
```

---

### Task 5: Add section guide + tooltips to Inpainting accordion

**Files:**
- Modify: `stable_audio_3/interface/diffusion_cond.py:470-484`

**Step 1: Add section guide markdown**

After `with gr.Accordion("Inpainting", open=False):` add:
```python
gr.Markdown("*Regenerate a specific time region while keeping everything else intact. Also use for continuation — set Mask Start to end of your audio and increase Seconds Total.*")
```

**Step 2: Add info to inpainting controls**

```python
mask_maskstart_slider = gr.Slider(minimum=0.0, maximum=sample_size//sample_rate, step=0.1, value=0, label="Mask Start (sec)", info="Where the region to regenerate begins. Everything before this is preserved.")
mask_maskend_slider = gr.Slider(minimum=0.0, maximum=sample_size//sample_rate, step=0.1, value=sample_size//sample_rate, label="Mask End (sec)", info="Where the region to regenerate ends. Everything after this is preserved.")
```

**Step 3: Commit**

```bash
git add stable_audio_3/interface/diffusion_cond.py
git commit -m "feat(ui): add guide text and tooltips to inpainting section"
```

---

### Task 6: Add section guide + tooltips to Output Params accordion

**Files:**
- Modify: `stable_audio_3/interface/diffusion_cond.py:431-441`

**Step 1: Add section guide markdown**

After `with gr.Accordion("Output params", open=False):` add:
```python
gr.Markdown("*Control file format, naming, and playback behavior.*")
```

**Step 2: Add info to output controls**

```python
file_format_dropdown = gr.Dropdown([...], label="File format", value="wav", info="WAV=lossless master, FLAC=lossless smaller, MP3 320k=near-perfect lossy")
file_naming_dropdown = gr.Dropdown([...], label="File naming", value="verbose", info="Verbose=prompt+settings+seed in filename. Best for tracking experiments.")
preview_every_slider = gr.Slider(minimum=0, maximum=100, step=1, value=0, label="Spec Preview Every", info="Show a visual snapshot every N steps. 0=disabled. Lets you watch the audio take shape.")
cut_to_seconds_total_checkbox = gr.Checkbox(label="Cut to seconds total", value=True, info="Trim output to exactly your requested duration, removing padding silence.")
autoplay_checkbox = gr.Checkbox(label="Autoplay", value=False, elem_id="autoplay", info="Play audio automatically when generation finishes.")
infinite_radio_checkbox = gr.Checkbox(label="Infinite Radio", value=False, elem_id="infinite-radio", info="Auto-generate a new track when the current one ends. Endless AI music stream.")
automatic_download_checkbox = gr.Checkbox(label="Auto Download", value=False, elem_id="automatic-download", info="Save each generation to your downloads folder automatically.")
```

**Step 3: Commit**

```bash
git add stable_audio_3/interface/diffusion_cond.py
git commit -m "feat(ui): add guide text and tooltips to output params section"
```

---

### Task 7: Add tooltips to LoRA controls

**Files:**
- Modify: `stable_audio_3/interface/diffusion_cond.py:320-330`

**Step 1: Add info to LoRA controls**

```python
strength = gr.Slider(minimum=0.0, maximum=10.0, step=0.1, value=1.0, label="Strength", info="How much this style patch influences output. 0=off, 1=full, >1=exaggerated.")
int_min = gr.Slider(minimum=0.0, maximum=1.0, step=0.01, value=0.0, label="Interval min", info="Start applying at this generation stage. 0=from the beginning.")
int_max = gr.Slider(minimum=0.0, maximum=1.0, step=0.01, value=1.0, label="Interval max", info="Stop applying at this stage. 1=all the way to the end.")
lyr_filt = gr.Textbox(label="Layer filter", placeholder="", info="Target specific model layers. Leave empty for all. Advanced.")
```

**Step 2: Commit**

```bash
git add stable_audio_3/interface/diffusion_cond.py
git commit -m "feat(ui): add tooltips to LoRA controls"
```

---

### Task 8: Add top-level prompt guide

**Files:**
- Modify: `stable_audio_3/interface/diffusion_cond.py:293`

**Step 1: Add prompting guide above prompt area**

Before the first `with gr.Row():` containing the prompt textbox, add:
```python
gr.Markdown("**Prompt tips:** Be specific — include genre, instruments, tempo (BPM), mood, and texture. Example: *\"120 BPM house loop, deep sub bass, crispy hi-hats, vinyl crackle\"*")
```

**Step 2: Commit**

```bash
git add stable_audio_3/interface/diffusion_cond.py
git commit -m "feat(ui): add prompting guide text above prompt input"
```

---

### Task 9: Verify UI renders correctly

**Step 1: Launch the Gradio UI**

```bash
uv run python run_gradio.py --model medium
```

**Step 2: Check each section**
- Verify markdown paragraphs appear above each accordion's contents
- Verify (i) info icons appear next to controls
- Verify hovering shows the tooltip text
- Verify no layout breakage or overlapping elements
- Verify the Generate button still works

**Step 3: Final commit if any adjustments needed**

```bash
git add stable_audio_3/interface/diffusion_cond.py
git commit -m "fix(ui): adjust tooltip text after visual review"
```

---

## Summary of changes

| Section | Guide paragraph | Controls with tooltips |
|---------|----------------|----------------------|
| Prompt area | Prompting tips | 2 (placeholder text) |
| Main controls | — | 3 (seconds, steps, CFG) |
| Sampler params | "Fine-tune how..." | 9 (seed, intervals, rescale, threshold, APG, sampler, sigma, padding) |
| Distribution shift | — | 13 (type dropdown + 12 sub-params) |
| Init audio | "Upload a recording..." | 4 (noise level, inversion steps, gamma, unconditional) |
| Inpainting | "Regenerate a region..." | 2 (mask start, mask end) |
| Output params | "Control file format..." | 7 (format, naming, preview, cut, autoplay, radio, download) |
| LoRA | — | 4 per LoRA (strength, interval min/max, layer filter) |
| **Total** | 5 guide paragraphs | ~44 tooltips |
